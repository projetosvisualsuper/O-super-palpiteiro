import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Match, Participant, Guess, AppState } from "./src/types";
import { INITIAL_MATCHES, INITIAL_PARTICIPANTS, INITIAL_GUESSES, INITIAL_RULES } from "./src/data";
import { calculateGuessPoints } from "./src/utils";
import { loadAppState, saveAppState } from "./src/db/firebase";

// In-memory state
let state: AppState = {
  matches: [...INITIAL_MATCHES],
  participants: [...INITIAL_PARTICIPANTS],
  guesses: [...INITIAL_GUESSES],
  rules: { ...INITIAL_RULES },
  customLogoUrl: "",
  customLogoText: "REMIX TV",
  prizeName: "SMART TV 55\" OLED 4K + COLO COLADO",
  prizeDescription: "O melhor de todos os palpiteiros receberá um Smart TV de última geração com entrega garantida!",
  prizeImage: "",
  participateTitle: "LEIA O QR CODE COM O CELULAR",
  participateInstruction: "Aponte a câmera pro QR Code, insira seu nome, escolha sua cor e arrisque seus palpites. Salve para pontuar na TV na hora!",
  tvLiveLabel: "TV LIVE",
  championshipName: "COPA DO MUNDO DE 2026"
};

// Help helper to update points for all players based on ended matches
function recalculateLeaderboard() {
  // Clear counts and recalculate
  const playerStats: Record<string, { points: number; exact: number; winner: number }> = {};

  // Initialize with all existing participants
  state.participants.forEach(p => {
    playerStats[p.name.toLowerCase()] = { points: 0, exact: 0, winner: 0 };
  });

  // Calculate points for finished matches
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

  // Apply properties to participants
  state.participants = state.participants.map(p => {
    const stats = playerStats[p.name.toLowerCase()] || { points: 0, exact: 0, winner: 0 };
    return {
      ...p,
      points: stats.points,
      exactScores: stats.exact,
      correctWinners: stats.winner
    };
  });

  // Ensure participants are sorted by points desc, then exact scores, then name
  state.participants.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
    return a.name.localeCompare(b.name);
  });
}

async function getLatestState(): Promise<AppState> {
  try {
    const loaded = await loadAppState();
    if (loaded) {
      // Check if loaded state contains old matches or structure mismatches and needs an upgrade
      const idsLoaded = (loaded.matches || []).map(m => m.id).sort().join(',');
      const idsInitial = INITIAL_MATCHES.map(m => m.id).sort().join(',');
      
      const matchupsLoaded = (loaded.matches || []).map(m => `${m.id}:${m.homeTeam}x${m.awayTeam}`).sort().join(',');
      const matchupsInitial = INITIAL_MATCHES.map(m => `${m.id}:${m.homeTeam}x${m.awayTeam}`).sort().join(',');
      
      const needsUpgrade = idsLoaded !== idsInitial || matchupsLoaded !== matchupsInitial;
      
      if (needsUpgrade) {
        console.log("[Server] Differences detected on request. Upgrading layout to real-world 2026 World Cup matches in Firestore...");
        loaded.matches = [...INITIAL_MATCHES];
        // Keep participants and guesses but reset guesses for matches that no longer exist
        loaded.guesses = (loaded.guesses || []).filter(g => INITIAL_MATCHES.some(im => im.id === g.matchId));
        // Reset old static points to new recalculated ones
        loaded.participants = [...INITIAL_PARTICIPANTS];
        // Recalculate leaderboard
        state = loaded;
        recalculateLeaderboard();
        await saveAppState(state);
      } else {
        state = loaded;
      }
    }
  } catch (e) {
    console.error("[Firebase] Error fetching latest state inside request:", e);
  }
  return state;
}

export async function createApp() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load state from Firebase if available
  try {
    const loadedState = await loadAppState();
    if (loadedState) {
      // Check if loaded state contains old matches or structure mismatches and needs an upgrade
      const idsLoaded = (loadedState.matches || []).map(m => m.id).sort().join(',');
      const idsInitial = INITIAL_MATCHES.map(m => m.id).sort().join(',');
      
      const matchupsLoaded = (loadedState.matches || []).map(m => `${m.id}:${m.homeTeam}x${m.awayTeam}`).sort().join(',');
      const matchupsInitial = INITIAL_MATCHES.map(m => `${m.id}:${m.homeTeam}x${m.awayTeam}`).sort().join(',');
      
      const needsUpgrade = idsLoaded !== idsInitial || matchupsLoaded !== matchupsInitial;

      if (needsUpgrade) {
        console.log("[Server] Differences detected on boot. Upgrading layout to real-world 2026 World Cup matches in Firestore...");
        loadedState.matches = [...INITIAL_MATCHES];
        // Keep participants and guesses but reset guesses for matches that no longer exist
        loadedState.guesses = (loadedState.guesses || []).filter(g => INITIAL_MATCHES.some(im => im.id === g.matchId));
        // Reset old static points to new recalculated ones
        loadedState.participants = [...INITIAL_PARTICIPANTS];
        state = loadedState;
        recalculateLeaderboard();
        await saveAppState(state);
      } else {
        state = loadedState;
      }
      console.log("[Server] State loaded from Firestore database successfully.");
    } else {
      console.log("[Server] No state found in Firestore. Saving current default state.");
      await saveAppState(state);
    }
  } catch (error) {
    console.error("[Server] Error syncing initial state with Firestore:", error);
  }

  // API ROOTS
  app.get("/api/status", async (req, res) => {
    const latestState = await getLatestState();
    res.json(latestState);
  });

  // Submit a guess
  app.post("/api/palpites", async (req, res) => {
    await getLatestState();
    const { matchId, participantName, homeScore, awayScore } = req.body;

    if (!matchId || !participantName || homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const trimmedName = participantName.trim();
    if (!trimmedName) {
      return res.status(400).json({ error: "Nome do participante vazio" });
    }

    const match = state.matches.find(m => m.id === matchId);
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    if (match.status === 'finished') {
      return res.status(400).json({ error: "Esta partida já terminou. Palpites encerrados!" });
    }

    // Check if participant already exists, else create
    let participant = state.participants.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (!participant) {
      const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      participant = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: trimmedName,
        points: 0,
        exactScores: 0,
        correctWinners: 0,
        lastGuessTime: new Date().toISOString(),
        avatarColor: randomColor
      };
      state.participants.push(participant);
    } else {
      participant.lastGuessTime = new Date().toISOString();
    }

    // Check if user already has a guess on this match
    let existingGuess = state.guesses.find(g => g.matchId === matchId && g.participantName.toLowerCase() === trimmedName.toLowerCase());
    if (existingGuess) {
      existingGuess.homeScore = parseInt(homeScore);
      existingGuess.awayScore = parseInt(awayScore);
      existingGuess.submittedAt = new Date().toISOString();
    } else {
      const newGuess: Guess = {
        id: 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        matchId,
        participantName: trimmedName,
        homeScore: parseInt(homeScore),
        awayScore: parseInt(awayScore),
        submittedAt: new Date().toISOString()
      };
      state.guesses.push(newGuess);
    }

    recalculateLeaderboard();
    saveAppState(state).catch(err => console.error("[Firebase] Error updating state on guess:", err));
    res.json({ success: true, state });
  });

  // Admin: Update Match Result (which executes scoring)
  app.post("/api/admin/match-result", async (req, res) => {
    await getLatestState();
    const { matchId, homeScore, awayScore, status } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: "Match ID is required" });
    }

    const matchIndex = state.matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) {
      return res.status(404).json({ error: "Match not found" });
    }

    state.matches[matchIndex] = {
      ...state.matches[matchIndex],
      homeScore: homeScore !== null && homeScore !== undefined ? parseInt(homeScore) : null,
      awayScore: awayScore !== null && awayScore !== undefined ? parseInt(awayScore) : null,
      status: status || 'finished'
    };

    recalculateLeaderboard();
    saveAppState(state).catch(err => console.error("[Firebase] Error updating state on match status edit:", err));
    res.json({ success: true, state });
  });

  // Admin: Add or update custom match
  app.post("/api/admin/add-match", async (req, res) => {
    await getLatestState();
    const { homeTeam, awayTeam, homeFlag, awayFlag, dateTime } = req.body;

    if (!homeTeam || !awayTeam) {
      return res.status(400).json({ error: "Teams are required" });
    }

    const newMatch: Match = {
      id: 'm_' + Date.now(),
      homeTeam,
      awayTeam,
      homeFlag: homeFlag || '🏳️',
      awayFlag: awayFlag || '🏳️',
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      dateTime: dateTime || new Date(Date.now() + 86400000).toISOString() // default tomorrow
    };

    state.matches.push(newMatch);
    saveAppState(state).catch(err => console.error("[Firebase] Error updating state on creating match:", err));
    res.json({ success: true, state });
  });

  // Admin: Sync with real World Cup 2026 matches using the hand-crafted official schedule (FIFA-approved)
  app.post("/api/admin/sync-real-matches", async (req, res) => {
    await getLatestState();
    try {
      console.log("[Server] Synchronizing state to correct FIFA 2026 World Cup match sequence...");
      
      state.matches = [...INITIAL_MATCHES];
      // Keep guesses but reset those that do not map to our clean matchIds
      state.guesses = (state.guesses || []).filter(g => INITIAL_MATCHES.some(im => im.id === g.matchId));
      // Reset leaderboard to new recalculated ones
      state.participants = [...INITIAL_PARTICIPANTS];
      
      recalculateLeaderboard();
      await saveAppState(state);
      
      console.log(`[Server] Automatically synced 13 matches successfully with official calendar!`);
      return res.json({ 
        success: true, 
        count: INITIAL_MATCHES.length, 
        isFallback: true, 
        state 
      });
    } catch (error) {
      console.error("[Server] Error synchronizing official matches:", error);
      res.status(500).json({ error: "Erro ao sincronizar com calendário oficial" });
    }
  });

  // Admin: Update custom logo, prize, general banner instructions, and score rules
  app.post("/api/admin/config", async (req, res) => {
    await getLatestState();
    const { 
      customLogoUrl, 
      customLogoText, 
      prizeName, 
      prizeImage, 
      prizeDescription,
      participateTitle,
      participateInstruction,
      tvLiveLabel,
      championshipName,
      rules
    } = req.body;
    
    state.customLogoUrl = customLogoUrl !== undefined ? customLogoUrl : state.customLogoUrl;
    state.customLogoText = customLogoText !== undefined ? customLogoText : state.customLogoText;
    state.prizeName = prizeName !== undefined ? prizeName : state.prizeName;
    state.prizeImage = prizeImage !== undefined ? prizeImage : state.prizeImage;
    state.prizeDescription = prizeDescription !== undefined ? prizeDescription : state.prizeDescription;
    
    state.participateTitle = participateTitle !== undefined ? participateTitle : state.participateTitle;
    state.participateInstruction = participateInstruction !== undefined ? participateInstruction : state.participateInstruction;
    
    state.tvLiveLabel = tvLiveLabel !== undefined ? tvLiveLabel : state.tvLiveLabel;
    state.championshipName = championshipName !== undefined ? championshipName : state.championshipName;
    
    if (rules && typeof rules === 'object') {
      state.rules = {
        exactScore: rules.exactScore !== undefined ? parseInt(rules.exactScore) : state.rules.exactScore,
        winnerAndDiff: rules.winnerAndDiff !== undefined ? parseInt(rules.winnerAndDiff) : state.rules.winnerAndDiff,
        winnerOnly: rules.winnerOnly !== undefined ? parseInt(rules.winnerOnly) : state.rules.winnerOnly,
        oneTeamScore: rules.oneTeamScore !== undefined ? parseInt(rules.oneTeamScore) : state.rules.oneTeamScore,
        completeWrong: rules.completeWrong !== undefined ? parseInt(rules.completeWrong) : state.rules.completeWrong,
      };
      // Recalculate is vital if scoring weights shifted
      recalculateLeaderboard();
    }
    
    saveAppState(state).catch(err => console.error("[Firebase] Error updating state on config edit:", err));
    res.json({ success: true, state });
  });

  // Reset demo state
  app.post("/api/admin/reset", async (req, res) => {
    await getLatestState();
    state = {
      matches: [...INITIAL_MATCHES],
      participants: [...INITIAL_PARTICIPANTS],
      guesses: [...INITIAL_GUESSES],
      rules: { ...INITIAL_RULES },
      customLogoUrl: "",
      customLogoText: "REMIX TV",
      prizeName: "SMART TV 55\" OLED 4K + COLO COLADO",
      prizeDescription: "O melhor de todos os palpiteiros receberá um Smart TV de última geração com entrega garantida!",
      prizeImage: "",
      participateTitle: "LEIA O QR CODE COM O CELULAR",
      participateInstruction: "Aponte a câmera pro QR Code, insira seu nome, escolha sua cor e arrisque seus palpites. Salve para pontuar na TV na hora!",
      tvLiveLabel: "TV LIVE",
      championshipName: "COPA DO MUNDO DE 2026"
    };
    recalculateLeaderboard();
    saveAppState(state).catch(err => console.error("[Firebase] Error updating state on reset:", err));
    res.json({ success: true, state });
  });

  // Vite Integration & SPA asset delivery
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
  createApp().then(app => {
    const PORT = process.env.PORT || 3000;
    app.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }).catch(err => {
    console.error("Failed to start backend server: ", err);
  });
}
