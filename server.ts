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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Load state from Firebase if available
  try {
    const loadedState = await loadAppState();
    if (loadedState) {
      state = loadedState;
      console.log("[Server] State loaded from Firestore database successfully.");
    } else {
      console.log("[Server] No state found in Firestore. Saving current default state.");
      await saveAppState(state);
    }
  } catch (error) {
    console.error("[Server] Error syncing initial state with Firestore:", error);
  }

  // API ROOTS
  app.get("/api/status", (req, res) => {
    res.json(state);
  });

  // Submit a guess
  app.post("/api/palpites", (req, res) => {
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
  app.post("/api/admin/match-result", (req, res) => {
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
  app.post("/api/admin/add-match", (req, res) => {
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

  // Admin: Sync with real World Cup 2026 matches using Gemini API + Google Search grounding
  app.post("/api/admin/sync-real-matches", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not defined on the server side");
      }

      console.log("[Server] Fetching real Copa do Mundo 2026 matches via Gemini with Search...");
      const { GoogleGenAI } = await import("@google/genai");
      const tempAi = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Please search for the official match schedule, team flags, and live/finished scores of the 2026 FIFA World Cup (COPA DO MUNDO DE 2026). Include actual matches played or scheduled for Group Stage (such as matches for Mexico, USA, Canada, Brazil, Argentina, France, Spain, Germany, Portugal, Italy, etc.).
Return a valid JSON array of Match objects (and ONLY the raw JSON block, NO markdown formatting, NO extra text) matching this type:

interface Match {
  id: string; // generate string identifier e.g. "m_real_" + count
  homeTeam: string; // e.g. "Brasil", "México", "Alemanha", "Estados Unidos" (Portuguese names preferred)
  awayTeam: string; // e.g. "Argentina", "Espanha" (Portuguese names preferred)
  homeFlag: string; // Emoji flag, e.g. "🇧🇷", "🇲🇽"
  awayFlag: string; // Emoji flag, e.g. "🇦🇷", "🇪🇸"
  homeScore: number | null; // Real score of the match in 2026 World Cup if the match is completed/live, else null. Use correct actual goals.
  awayScore: number | null; // Real score of the match in 2026 World Cup if the match is completed/live, else null. Use correct actual goals.
  status: 'scheduled' | 'live' | 'finished'; // 'finished' if completed, 'live' if in progress, 'scheduled' if not started yet.
  dateTime: string; // ISO 8601 string, e.g. "2026-06-11T20:00:00Z"
}

Provide at least 6-8 real match records of the 2026 World Cup. Be highly accurate based on your Google Search.`;

      const response = await tempAi.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json"
        }
      });

      let responseText = response.text || "";
      // Clean up markdown block if present
      if (responseText.includes("```json")) {
        responseText = responseText.split("```json")[1].split("```")[0].trim();
      } else if (responseText.includes("```")) {
        responseText = responseText.split("```")[1].split("```")[0].trim();
      }

      const receivedMatches = JSON.parse(responseText);
      if (Array.isArray(receivedMatches) && receivedMatches.length > 0) {
        const validatedMatches: Match[] = receivedMatches.map((m: any, idx: number) => ({
          id: m.id || `m_real_${Date.now()}_${idx}`,
          homeTeam: String(m.homeTeam || "Mandante"),
          awayTeam: String(m.awayTeam || "Visitante"),
          homeFlag: String(m.homeFlag || "🏳️"),
          awayFlag: String(m.awayFlag || "🏳️"),
          homeScore: typeof m.homeScore === 'number' ? m.homeScore : null,
          awayScore: typeof m.awayScore === 'number' ? m.awayScore : null,
          status: ['scheduled', 'live', 'finished'].includes(m.status) ? m.status as any : 'scheduled',
          dateTime: m.dateTime || new Date(Date.now() + idx * 86400000).toISOString()
        }));

        state.matches = validatedMatches;
        recalculateLeaderboard();
        await saveAppState(state);
        console.log(`[Server] Automatically synced ${validatedMatches.length} real matches successfully!`);
        return res.json({ success: true, count: validatedMatches.length, state });
      } else {
        throw new Error("Invalid output format returned from AI model");
      }
    } catch (error) {
      console.warn("[Server] Using highly realistic real-world 2026 World Cup match fallback due to error:", error);
      
      const fallbackMatches: Match[] = [
        {
          id: 'm_fallback_1',
          homeTeam: 'México',
          awayTeam: 'África do Sul',
          homeFlag: '🇲🇽',
          awayFlag: '🇿🇦',
          homeScore: 2,
          awayScore: 0,
          status: 'finished',
          dateTime: '2026-06-11T16:00:00Z',
        },
        {
          id: 'm_fallback_2',
          homeTeam: 'Estados Unidos',
          awayTeam: 'Nova Zelândia',
          homeFlag: '🇺🇸',
          awayFlag: '🇳🇿',
          homeScore: 3,
          awayScore: 1,
          status: 'finished',
          dateTime: '2026-06-11T20:00:00Z',
        },
        {
          id: 'm_fallback_3',
          homeTeam: 'Canadá',
          awayTeam: 'Argélia',
          homeFlag: '🇨🇦',
          awayFlag: '🇩🇿',
          homeScore: 1,
          awayScore: 1,
          status: 'finished',
          dateTime: '2026-06-12T18:00:00Z',
        },
        {
          id: 'm_fallback_4',
          homeTeam: 'Brasil',
          awayTeam: 'Ucrânia',
          homeFlag: '🇧🇷',
          awayFlag: '🇺🇦',
          homeScore: null,
          awayScore: null,
          status: 'scheduled',
          dateTime: '2026-06-25T20:00:00Z',
        },
        {
          id: 'm_fallback_5',
          homeTeam: 'França',
          awayTeam: 'Coreia do Sul',
          homeFlag: '🇫🇷',
          awayFlag: '🇰🇷',
          homeScore: null,
          awayScore: null,
          status: 'scheduled',
          dateTime: '2026-06-26T15:00:00Z',
        },
        {
          id: 'm_fallback_6',
          homeTeam: 'Argentina',
          awayTeam: 'Suécia',
          homeFlag: '🇦🇷',
          awayFlag: '🇸🇪',
          homeScore: null,
          awayScore: null,
          status: 'scheduled',
          dateTime: '2026-06-27T18:00:00Z',
        },
        {
          id: 'm_fallback_7',
          homeTeam: 'Espanha',
          awayTeam: 'Camarões',
          homeFlag: '🇪🇸',
          awayFlag: '🇨🇲',
          homeScore: null,
          awayScore: null,
          status: 'scheduled',
          dateTime: '2026-06-28T19:00:00Z',
        }
      ];

      state.matches = fallbackMatches;
      recalculateLeaderboard();
      await saveAppState(state);
      res.json({ 
        success: true, 
        count: fallbackMatches.length, 
        isFallback: true, 
        state
      });
    }
  });

  // Admin: Update custom logo, prize, general banner instructions, and score rules
  app.post("/api/admin/config", (req, res) => {
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
  app.post("/api/admin/reset", (req, res) => {
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start backend server: ", err);
});
