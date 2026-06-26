import { loadAppState, saveAppState } from "./src/db/firebase";
import { calculateGuessPoints } from "./src/utils";
import dotenv from "dotenv";
dotenv.config();

const resultsToUpdate = {
  m_real_14: { homeScore: 2, awayScore: 1, status: "finished" as const }, // Equador vs Alemanha (25/06)
  m_real_15: { homeScore: 0, awayScore: 2, status: "finished" as const }, // Curaçau vs Costa do Marfim (25/06)
  m_real_16: { homeScore: 1, awayScore: 1, status: "finished" as const }, // Japão vs Suécia (25/06)
  m_real_17: { homeScore: 1, awayScore: 3, status: "finished" as const }, // Tunísia vs Países Baixos (25/06)
  m_real_26: { homeScore: 3, awayScore: 2, status: "finished" as const }, // Turquia vs Estados Unidos (26/06)
  m_real_27: { homeScore: 0, awayScore: 0, status: "finished" as const }, // Paraguai vs Austrália (26/06)
};

async function run() {
  const state = await loadAppState();
  if (!state) {
    console.error("Erro ao carregar o estado do Firestore");
    return;
  }

  console.log("Total de partidas original:", state.matches.length);
  console.log("Total de palpites original:", state.guesses.length);
  console.log("Total de participantes original:", state.participants.length);

  // 1. Atualizar placares e status dos jogos finalizados
  state.matches = state.matches.map(m => {
    if (m.id in resultsToUpdate) {
      const update = resultsToUpdate[m.id as keyof typeof resultsToUpdate];
      console.log(`Atualizando partida ${m.id} (${m.homeTeam} vs ${m.awayTeam}) para o placar ${update.homeScore}-${update.awayScore}`);
      return {
        ...m,
        homeScore: update.homeScore,
        awayScore: update.awayScore,
        status: update.status
      };
    }
    return m;
  });

  // 2. Recalcular os pontos do ranking
  const playerStats: Record<string, { points: number; exact: number; winner: number }> = {};
  state.participants.forEach(p => {
    playerStats[p.name.toLowerCase()] = { points: 0, exact: 0, winner: 0 };
  });

  state.guesses.forEach(guess => {
    const match = state.matches.find(m => m.id === guess.matchId);
    if (match && match.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
      const calculation = calculateGuessPoints(
        guess.homeScore,
        guess.awayScore,
        match.homeScore,
        match.awayScore,
        state.rules
      );
      
      guess.pointsEarned = calculation.points;

      const pKey = guess.participantName.toLowerCase();
      if (!playerStats[pKey]) {
        playerStats[pKey] = { points: 0, exact: 0, winner: 0 };
      }

      playerStats[pKey].points += calculation.points;
      if (calculation.category === 'exact') {
        playerStats[pKey].exact += 1;
      } else if (calculation.category === 'diff' || calculation.category === 'winner') {
        playerStats[pKey].winner += 1;
      }
    }
  });

  state.participants = state.participants.map(p => {
    const stats = playerStats[p.name.toLowerCase()] || { points: 0, exact: 0, winner: 0 };
    return {
      ...p,
      points: stats.points,
      exactScores: stats.exact,
      correctWinners: stats.winner
    };
  });

  // Ordenar ranking
  state.participants.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return a.name.localeCompare(b.name);
  });

  console.log("=== NOVO RANKING DE PARTICIPANTES ===");
  state.participants.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.name}: ${p.points} pts (Exatos: ${p.exactScores}, Vencedor: ${p.correctWinners})`);
  });

  // 3. Salvar o novo estado no Firestore
  console.log("Salvando estado atualizado no Firestore...");
  const success = await saveAppState(state);
  if (success) {
    console.log("✅ Banco de dados atualizado com sucesso!");
  } else {
    console.error("❌ Falha ao salvar os dados no Firestore.");
  }
}
run();
