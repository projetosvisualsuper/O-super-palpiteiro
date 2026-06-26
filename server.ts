import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Match, Participant, Guess, AppState } from "./src/types";
import { INITIAL_MATCHES, INITIAL_PARTICIPANTS, INITIAL_GUESSES, INITIAL_RULES, PREDEFINED_PARTICIPANTS } from "./src/data";
import { calculateGuessPoints } from "./src/utils";
import { loadAppState, saveAppState, isFirebaseReady } from "./src/db/firebase";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

// Test deploy comment: Verification round 3 - persistence check
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
  prize2Name: "CAMISA OFICIAL DA SELEÇÃO",
  prize2Description: "O segundo colocado ganhará uma camisa oficial da Seleção Brasileira autografada!",
  prize2Image: "",
  prize3Name: "KIT TORCEDOR EXCLUSIVO",
  prize3Description: "O terceiro colocado levará um kit torcedor com copo térmico e boné oficial!",
  prize3Image: "",
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

function getCleanState(rawState: AppState): AppState {
  const cleanParticipants = (rawState.participants || []).map(p => {
    const { pin, ...rest } = p as any;
    return { ...rest, hasPin: !!pin };
  }) as Participant[];
  return {
    ...rawState,
    participants: cleanParticipants
  };
}

let lastAutoSyncTime = 0;
const AUTO_SYNC_INTERVAL = 60 * 60 * 1000; // 1 hour in ms
let isAutoSyncRunning = false;

async function performAutoSyncMatches(): Promise<boolean> {
  const now = Date.now();
  if (isAutoSyncRunning) {
    return false;
  }
  if (now - lastAutoSyncTime < AUTO_SYNC_INTERVAL && lastAutoSyncTime !== 0) {
    return false;
  }

  isAutoSyncRunning = true;
  console.log("[Auto-Sync] Iniciando sincronização automática dos jogos e resultados com a FIFA...");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "Sua_Chave_Gemini_Aqui" || apiKey.trim() === "") {
    console.warn("[Auto-Sync] GEMINI_API_KEY não configurada. Ignorando sincronização automática.");
    isAutoSyncRunning = false;
    return false;
  }

  try {
    const loaded = await loadAppState();
    if (!loaded) {
      isAutoSyncRunning = false;
      return false;
    }
    state = loaded;

    const ai = new GoogleGenAI({ apiKey });
    const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    let responseText = "";

    try {
      console.log("[Auto-Sync] Buscando partidas reais da Copa 2026 via Gemini com Search Grounding...");
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Today's date is ${todayStr}. Search for real-world 2026 FIFA World Cup matches, scores, and fixtures.
        Use Google Search to find matches that have been played since the start of the tournament (June 11, 2026) up to today, and scheduled matches for the next few days.
        Return the list of matches as a JSON array of objects fitting this structure:
        {
          "id": string, // format like "m_real_1", "m_real_2", etc.
          "homeTeam": string, // Name in Portuguese (e.g. Brasil, Alemanha, etc.)
          "awayTeam": string, // Name in Portuguese
          "homeFlag": string, // Emoji flag
          "awayFlag": string, // Emoji flag
          "homeScore": number | null,
          "awayScore": number | null,
          "status": "scheduled" | "live" | "finished",
          "dateTime": string
        }
        Include at least 15-20 matches showing the progression of the tournament starting from June 20, 2026 up to today and upcoming matches in the next few days. Team names must be in Portuguese.
        Respond ONLY with the JSON array inside a \`\`\`json \`\`\` block.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      responseText = response.text || "";
    } catch (searchError) {
      console.warn("[Auto-Sync] Gemini Search Grounding falhou. Tentando sem a ferramenta de busca...", searchError);
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Today's date is ${todayStr}. Return the list of 2026 FIFA World Cup matches, scores, and fixtures based on your knowledge.
        Provide the matches played since June 20, 2026 to June 25, 2026, and their scores.
        Return the list of matches as a JSON array of objects fitting this structure:
        {
          "id": string,
          "homeTeam": string,
          "awayTeam": string,
          "homeFlag": string,
          "awayFlag": string,
          "homeScore": number | null,
          "awayScore": number | null,
          "status": "scheduled" | "live" | "finished",
          "dateTime": string
        }
        Respond ONLY with the JSON array inside a \`\`\`json \`\`\` block.`
      });
      responseText = response.text || "";
    }

    if (!responseText) throw new Error("Resposta vazia da API do Gemini.");

    let text = responseText;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      text = jsonMatch[1];
    }
    const parsedMatches: Match[] = JSON.parse(text.trim());

    if (!parsedMatches || !Array.isArray(parsedMatches) || parsedMatches.length === 0) {
      throw new Error("Resposta do Gemini não é um array válido.");
    }

    for (const m of parsedMatches) {
      if (!m.id || !m.homeTeam || !m.awayTeam || !m.dateTime || !m.status) {
        throw new Error("Objetos de partida retornados do Gemini possuem campos ausentes.");
      }
    }

    state.matches = parsedMatches;
    state.guesses = (state.guesses || []).filter(g => state.matches.some(sm => sm.id === g.matchId));
    recalculateLeaderboard();
    await saveAppState(state);

    lastAutoSyncTime = now;
    lastDbLoadTime = now;
    console.log(`[Auto-Sync] Sucesso: ${state.matches.length} partidas sincronizadas e pontos recalculados.`);
    isAutoSyncRunning = false;
    return true;
  } catch (error) {
    console.error("[Auto-Sync] Erro durante a atualização automática:", error);
    isAutoSyncRunning = false;
    return false;
  }
}

let lastDbLoadTime = 0;
const DB_CACHE_TTL = 5 * 1000; // 5 seconds in ms

async function getLatestState(forceRefresh = false): Promise<AppState> {
  const now = Date.now();
  if (forceRefresh || (now - lastDbLoadTime > DB_CACHE_TTL) || lastDbLoadTime === 0) {
    try {
      console.log(`[Server] ${forceRefresh ? 'Forced' : 'Cache expired'}. Loading state from Firestore...`);
      const loaded = await loadAppState();
      if (loaded) {
        // Enforce that only predefined participants and their guesses exist
        const initialCount = (loaded.participants || []).length;
        loaded.participants = (loaded.participants || []).filter(p =>
          PREDEFINED_PARTICIPANTS.some(pp => pp.toLowerCase() === p.name.toLowerCase())
        );
        loaded.guesses = (loaded.guesses || []).filter(g =>
          PREDEFINED_PARTICIPANTS.some(pp => pp.toLowerCase() === g.participantName.toLowerCase())
        );
        const cleanedParticipants = (loaded.participants || []).length !== initialCount;

        // SAFE upgrade: only ADD new match IDs not yet in the DB.
        // NEVER overwrite existing match data (teams, times, scores) from local code.
        const loadedMatchIds = new Set((loaded.matches || []).map(m => m.id));
        const newMatches = INITIAL_MATCHES.filter(im => !loadedMatchIds.has(im.id));
        const needsUpgrade = newMatches.length > 0 || cleanedParticipants;

        if (needsUpgrade) {
          if (newMatches.length > 0) {
            console.log(`[Server] Adding ${newMatches.length} new match(es) not yet in Firestore.`);
            loaded.matches = [...(loaded.matches || []), ...newMatches];
          }
          if (cleanedParticipants) {
            console.log("[Server] Removed test/unregistered participants and their guesses from state.");
          }
          // Always keep participants and guesses
          loaded.participants = loaded.participants || [];
          loaded.guesses = (loaded.guesses || []).filter(g =>
            (loaded.matches || []).some(m => m.id === g.matchId)
          );
          state = loaded;
          recalculateLeaderboard();
          await saveAppState(state);
        } else {
          state = loaded;
        }
        lastDbLoadTime = now;
      }
    } catch (e) {
      console.error("[Firebase] Error fetching latest state inside request:", e);
    }
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
      // Enforce that only predefined participants and their guesses exist
      const initialCount = (loadedState.participants || []).length;
      loadedState.participants = (loadedState.participants || []).filter(p =>
        PREDEFINED_PARTICIPANTS.some(pp => pp.toLowerCase() === p.name.toLowerCase())
      );
      loadedState.guesses = (loadedState.guesses || []).filter(g =>
        PREDEFINED_PARTICIPANTS.some(pp => pp.toLowerCase() === g.participantName.toLowerCase())
      );
      const cleanedParticipants = (loadedState.participants || []).length !== initialCount;

      // SAFE upgrade: only ADD new match IDs not yet in the DB.
      // NEVER overwrite existing match data (teams, times, scores) from local code.
      const loadedMatchIds = new Set((loadedState.matches || []).map(m => m.id));
      const newMatches = INITIAL_MATCHES.filter(im => !loadedMatchIds.has(im.id));
      const needsUpgrade = newMatches.length > 0 || cleanedParticipants;

      if (needsUpgrade) {
        if (newMatches.length > 0) {
          console.log(`[Server] Adding ${newMatches.length} new match(es) not yet in Firestore.`);
          loadedState.matches = [...(loadedState.matches || []), ...newMatches];
        }
        if (cleanedParticipants) {
          console.log("[Server] Removed test/unregistered participants and their guesses from boot state.");
        }
        // Always keep participants and guesses
        loadedState.participants = loadedState.participants || [];
        loadedState.guesses = (loadedState.guesses || []).filter(g =>
          (loadedState.matches || []).some(m => m.id === g.matchId)
        );
        state = loadedState;
        recalculateLeaderboard();
        await saveAppState(state);
      } else {
        state = loadedState;
      }
       console.log("[Server] State loaded from Firestore database successfully.");
       lastDbLoadTime = Date.now();
     } else {
       console.log("[Server] No state found in Firestore. Saving current default state.");
       await saveAppState(state);
       lastDbLoadTime = Date.now();
     }
  } catch (error) {
    console.error("[Server] Error syncing initial state with Firestore:", error);
  }

  // API ROOTS
  app.get("/api/status", async (req, res) => {
    // Trigger background auto-sync if due (non-blocking)
    performAutoSyncMatches().catch(err => console.error("[Auto-Sync] Erro no background job:", err));

    const latestState = await getLatestState();
    res.json(getCleanState(latestState));
  });

  // Submit a guess
  app.post("/api/palpites", async (req, res) => {
    await getLatestState();
    const { matchId, participantName, homeScore, awayScore, pin } = req.body;

    if (!matchId || !participantName || homeScore === undefined || awayScore === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const trimmedName = participantName.trim();
    if (!trimmedName) {
      return res.status(400).json({ error: "Nome do participante vazio" });
    }

    const isPredefined = PREDEFINED_PARTICIPANTS.some(pp => pp.toLowerCase() === trimmedName.toLowerCase());
    if (!isPredefined) {
      return res.status(400).json({ error: "Nome de participante não cadastrado no sistema!" });
    }

    const match = state.matches.find(m => m.id === matchId);
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada" });
    }

    const matchTime = new Date(match.dateTime).getTime();
    const nowTime = Date.now();
    if (nowTime >= matchTime || match.status === 'live' || match.status === 'finished') {
      return res.status(400).json({ error: "Esta partida já começou ou terminou. Palpites encerrados!" });
    }

    // Check if participant already exists, else create
    let participant = state.participants.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (!participant) {
      if (!pin || pin.trim().length === 0) {
        return res.status(400).json({ error: "Crie um PIN de acesso para o seu usuário!" });
      }

      const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      participant = {
        id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        name: trimmedName,
        points: 0,
        exactScores: 0,
        correctWinners: 0,
        lastGuessTime: new Date().toISOString(),
        avatarColor: randomColor,
        pin: pin.trim()
      };
      state.participants.push(participant);
    } else {
      // Participant exists, verify PIN
      if (participant.pin && participant.pin !== (pin || '').trim()) {
        return res.status(401).json({ error: "PIN de acesso incorreto!" });
      }
      if (!participant.pin) {
        if (!pin || pin.trim().length === 0) {
          return res.status(400).json({ error: "Crie um PIN de acesso para o seu usuário!" });
        }
        participant.pin = pin.trim();
      }
      participant.lastGuessTime = new Date().toISOString();
    }

    // Check if user already has a guess on this match
    let existingGuess = state.guesses.find(g => g.matchId === matchId && g.participantName.toLowerCase() === trimmedName.toLowerCase());
    if (existingGuess) {
      return res.status(400).json({ error: "Você já enviou um palpite para esta partida!" });
    }

    const newGuess: Guess = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      matchId,
      participantName: trimmedName,
      homeScore: parseInt(homeScore),
      awayScore: parseInt(awayScore),
      submittedAt: new Date().toISOString()
    };
    state.guesses.push(newGuess);

    recalculateLeaderboard();
    try {
      await saveAppState(state);
      res.json({ success: true, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error updating state on guess:", err);
      res.status(500).json({ error: "Erro ao salvar palpite no banco de dados." });
    }
  });

  // Login a participant (validates existing PIN)
  app.post("/api/login-participant", async (req, res) => {
    await getLatestState();
    const { participantName, pin } = req.body;
    const trimmedName = (participantName || '').trim();
    const trimmedPin = (pin || '').trim();

    if (!trimmedName || !trimmedPin) {
      return res.status(400).json({ error: "Nome e PIN são obrigatórios!" });
    }

    const participant = state.participants.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (!participant) {
      return res.status(404).json({ error: "Usuário não encontrado no sistema!" });
    }

    if (participant.pin && participant.pin !== trimmedPin) {
      return res.status(401).json({ error: "PIN de acesso incorreto!" });
    }

    res.json({ success: true });
  });

  // Register a participant (saves their PIN initially)
  app.post("/api/register-participant", async (req, res) => {
    await getLatestState();
    const { participantName, pin } = req.body;
    const trimmedName = (participantName || '').trim();
    const trimmedPin = (pin || '').trim();

    if (!trimmedName || !trimmedPin) {
      return res.status(400).json({ error: "Nome e PIN são obrigatórios!" });
    }

    const participantExists = state.participants.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
    if (participantExists) {
      return res.status(400).json({ error: "Usuário já possui cadastro com este nome!" });
    }

    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newParticipant: Participant = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: trimmedName,
      points: 0,
      exactScores: 0,
      correctWinners: 0,
      lastGuessTime: new Date().toISOString(),
      avatarColor: randomColor,
      pin: trimmedPin
    };

    state.participants.push(newParticipant);
    recalculateLeaderboard();
    
    try {
      await saveAppState(state);
      res.json({ success: true, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error saving registered participant:", err);
      res.status(500).json({ error: "Erro ao salvar cadastro no banco de dados." });
    }
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
    try {
      await saveAppState(state);
      res.json({ success: true, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error updating state on match status edit:", err);
      res.status(500).json({ error: "Erro ao salvar resultado da partida no banco de dados." });
    }
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
    try {
      await saveAppState(state);
      res.json({ success: true, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error updating state on creating match:", err);
      res.status(500).json({ error: "Erro ao salvar nova partida no banco de dados." });
    }
  });

  // Admin: Sync with real World Cup 2026 matches using Gemini API (Google Search Grounding)
  app.post("/api/admin/sync-real-matches", async (req, res) => {
    await getLatestState();
    try {
      console.log("[Server] Synchronizing state with real-world 2026 World Cup matches using Gemini...");
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "Sua_Chave_Gemini_Aqui" || apiKey.trim() === "") {
        console.warn("[Server] GEMINI_API_KEY is not configured or is placeholder. Using fallback INITIAL_MATCHES.");
        state.matches = [...INITIAL_MATCHES];
        // Keep guesses but reset those that do not map to our clean matchIds
        state.guesses = (state.guesses || []).filter(g => INITIAL_MATCHES.some(im => im.id === g.matchId));
        recalculateLeaderboard();
        await saveAppState(state);
        return res.json({ 
          success: true, 
          count: INITIAL_MATCHES.length, 
          isFallback: true, 
          state 
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      const todayStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      let responseText = "";

      try {
        console.log("[Server] Attempting Gemini content generation with Google Search Grounding...");
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Today's date is ${todayStr}. Search for real-world 2026 FIFA World Cup matches, scores, and fixtures.
          Use Google Search to find matches that have been played since the start of the tournament (June 11, 2026) up to today, and scheduled matches for the next few days.
          Return the list of matches as a JSON array of objects fitting this structure:
          {
            "id": string, // format like "m_real_1", "m_real_2", etc.
            "homeTeam": string, // Name in Portuguese (e.g., "Brasil", "Alemanha", "Estados Unidos")
            "awayTeam": string, // Name in Portuguese
            "homeFlag": string, // Emoji flag
            "awayFlag": string, // Emoji flag
            "homeScore": number | null, // score if finished/live, null if scheduled
            "awayScore": number | null, // score if finished/live, null if scheduled
            "status": "scheduled" | "live" | "finished",
            "dateTime": string // ISO 8601 string, e.g. "2026-06-11T16:00:00Z"
          }
          Include at least 15-20 matches showing the progression of the tournament starting from June 20, 2026 up to today and upcoming matches in the next few days. Team names must be in Portuguese (e.g. Alemanha, Holanda, etc.).
          Respond ONLY with the JSON array inside a \`\`\`json \`\`\` block.`,
          config: {
            tools: [{ googleSearch: {} }]
          }
        });
        responseText = response.text || "";
      } catch (searchError) {
        console.warn("[Server] Gemini Search Grounding failed, retrying without Search Tool...", searchError);
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Today's date is ${todayStr}. Return the list of 2026 FIFA World Cup matches, scores, and fixtures based on your knowledge.
          Provide the matches played since June 20, 2026 to June 25, 2026, and their scores.
          Return the list of matches as a JSON array of objects fitting this structure:
          {
            "id": string, // format like "m_real_1", "m_real_2", etc.
            "homeTeam": string, // Name in Portuguese
            "awayTeam": string, // Name in Portuguese
            "homeFlag": string, // Emoji flag
            "awayFlag": string, // Emoji flag
            "homeScore": number | null,
            "awayScore": number | null,
            "status": "scheduled" | "live" | "finished",
            "dateTime": string
          }
          Respond ONLY with the JSON array inside a \`\`\`json \`\`\` block.`
        });
        responseText = response.text || "";
      }

      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      console.log("[Server] Gemini raw response:", responseText);
      let text = responseText;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        text = jsonMatch[1];
      }
      const parsedMatches: Match[] = JSON.parse(text.trim());

      if (!parsedMatches || !Array.isArray(parsedMatches) || parsedMatches.length === 0) {
        throw new Error("Gemini response is not a valid non-empty array");
      }

      // Basic validation of fields
      for (const m of parsedMatches) {
        if (!m.id || !m.homeTeam || !m.awayTeam || !m.dateTime || !m.status) {
          throw new Error("Match objects returned from Gemini are missing mandatory fields");
        }
      }

      state.matches = parsedMatches;
      // Keep guesses but reset those that do not map to the synced matchIds
      state.guesses = (state.guesses || []).filter(g => state.matches.some(sm => sm.id === g.matchId));
      
      recalculateLeaderboard();
      await saveAppState(state);

      console.log(`[Server] Successfully synced ${state.matches.length} matches using Gemini.`);
      return res.json({ 
        success: true, 
        count: state.matches.length, 
        isFallback: false, 
        state: getCleanState(state) 
      });

    } catch (error) {
      console.error("[Server] Error synchronizing with Gemini search:", error);
      // DO NOT overwrite Firestore database state on sync failure!
      // Simply return the current state with a warning.
      return res.status(500).json({
        error: "Falha na sincronização: o serviço da API do Gemini está temporariamente indisponível. Tente novamente mais tarde.",
        state: getCleanState(state)
      });
    }
  });

  app.post("/api/admin/config", async (req, res) => {
    await getLatestState();
    const { 
      customLogoUrl, 
      customLogoText, 
      prizeName, 
      prizeImage, 
      prizeDescription,
      prize2Name,
      prize2Image,
      prize2Description,
      prize3Name,
      prize3Image,
      prize3Description,
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
    state.prize2Name = prize2Name !== undefined ? prize2Name : state.prize2Name;
    state.prize2Image = prize2Image !== undefined ? prize2Image : state.prize2Image;
    state.prize2Description = prize2Description !== undefined ? prize2Description : state.prize2Description;
    state.prize3Name = prize3Name !== undefined ? prize3Name : state.prize3Name;
    state.prize3Image = prize3Image !== undefined ? prize3Image : state.prize3Image;
    state.prize3Description = prize3Description !== undefined ? prize3Description : state.prize3Description;
    
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
    
    try {
      await saveAppState(state);
      res.json({ success: true, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error updating state on config edit:", err);
      res.status(500).json({ error: "Erro ao salvar configurações no banco de dados." });
    }
  });

  // Admin: Backup Database to a local JSON file
  app.post("/api/admin/backup-db", async (req, res) => {
    try {
      console.log("[Server] Admin backup request received.");
      const fs = await import("fs");
      const path = await import("path");
      
      const latestState = await getLatestState(true);
      if (!latestState) {
        return res.status(500).json({ error: "Não foi possível carregar o estado do banco de dados." });
      }

      const backupDir = path.join(process.cwd(), "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");

      const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
      const backupFileName = `backup_${timestamp}.json`;
      const backupPath = path.join(backupDir, backupFileName);
      const latestPath = path.join(backupDir, "backup_latest.json");

      const dataStr = JSON.stringify(latestState, null, 2);
      fs.writeFileSync(backupPath, dataStr, "utf8");
      fs.writeFileSync(latestPath, dataStr, "utf8");

      console.log(`[Server] Backup success: backups/${backupFileName}`);
      res.json({ 
        success: true, 
        filename: backupFileName, 
        timestamp,
        stats: {
          matches: latestState.matches?.length || 0,
          participants: latestState.participants?.length || 0,
          guesses: latestState.guesses?.length || 0
        }
      });
    } catch (error) {
      console.error("[Server] Error during manual database backup:", error);
      res.status(500).json({ error: "Erro ao realizar o backup do banco de dados" });
    }
  });

  // Admin: Restore Database from a local JSON file or sent state object
  app.post("/api/admin/restore-db", async (req, res) => {
    try {
      console.log("[Server] Admin restore request received.");
      const fs = await import("fs");
      const path = await import("path");
      
      let restoredState = req.body.state;
      let filename = req.body.filename;

      if (!restoredState) {
        if (!filename) {
          filename = "backup_latest.json";
        }

        const backupDir = path.join(process.cwd(), "backups");
        let backupPath = path.isAbsolute(filename) ? filename : path.join(backupDir, filename);
        if (!fs.existsSync(backupPath) && !path.isAbsolute(filename)) {
          backupPath = path.resolve(filename);
        }

        if (!fs.existsSync(backupPath)) {
          return res.status(404).json({ error: `Arquivo de backup não encontrado: ${filename}` });
        }

        const rawData = fs.readFileSync(backupPath, "utf8");
        restoredState = JSON.parse(rawData);
      } else {
        filename = "uploaded_file.json";
      }

      if (!restoredState || !restoredState.matches || !restoredState.participants || !restoredState.guesses) {
        return res.status(400).json({ error: "O arquivo de backup selecionado não contém uma estrutura de estado válida." });
      }

      console.log("[Server] Restoring state in Firestore...");
      const success = await saveAppState(restoredState);

      if (success) {
        state = restoredState;
        recalculateLeaderboard();
        lastDbLoadTime = Date.now();
        console.log(`[Server] Database restored successfully from: ${filename}`);
        res.json({ success: true, filename, state: getCleanState(state) });
      } else {
        res.status(500).json({ error: "Falha ao salvar os dados restaurados no Firestore." });
      }
    } catch (error) {
      console.error("[Server] Error during database restore:", error);
      res.status(500).json({ error: "Erro ao restaurar o banco de dados" });
    }
  });

  // Admin: Reload State from Firestore manually (clears cache)
  app.post("/api/admin/reload-db", async (req, res) => {
    try {
      console.log("[Server] Admin forced reload from Firestore database.");
      const latestState = await getLatestState(true);
      res.json({ success: true, state: getCleanState(latestState) });
    } catch (error) {
      console.error("[Server] Error during manual database reload:", error);
      res.status(500).json({ error: "Erro ao recarregar do banco de dados" });
    }
  });

  // Admin: Clear all guesses and participants
  app.post("/api/admin/clear-guesses", async (req, res) => {
    await getLatestState();
    state.participants = [];
    state.guesses = [];
    recalculateLeaderboard();
    try {
      await saveAppState(state);
      res.json({ success: true, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error updating state on clear guesses:", err);
      res.status(500).json({ error: "Erro ao salvar alteração no banco de dados" });
    }
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
      prize2Name: "CAMISA OFICIAL DA SELEÇÃO",
      prize2Description: "O segundo colocado ganhará uma camisa oficial da Seleção Brasileira autografada!",
      prize2Image: "",
      prize3Name: "KIT TORCEDOR EXCLUSIVO",
      prize3Description: "O terceiro colocado levará um kit torcedor com copo térmico e boné oficial!",
      prize3Image: "",
      participateTitle: "LEIA O QR CODE COM O CELULAR",
      participateInstruction: "Aponte a câmera pro QR Code, insira seu nome, escolha sua cor e arrisque seus palpites. Salve para pontuar na TV na hora!",
      tvLiveLabel: "TV LIVE",
      championshipName: "COPA DO MUNDO DE 2026"
    };
    recalculateLeaderboard();
    try {
      await saveAppState(state);
      res.json({ success: true, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error updating state on reset:", err);
      res.status(500).json({ error: "Erro ao resetar estado no banco de dados." });
    }
  });

  // Fix match times: shift all match dateTimes by +3h (Brasília offset)
  // Used when times were entered in local BRT time but stored without UTC offset correction
  app.post("/api/admin/fix-match-times", async (req, res) => {
    await getLatestState();
    const { offsetHours = 3 } = req.body; // default +3h for Brasília (BRT = UTC-3)
    const offsetMs = offsetHours * 60 * 60 * 1000;
    state.matches = state.matches.map(m => ({
      ...m,
      dateTime: new Date(new Date(m.dateTime).getTime() + offsetMs).toISOString()
    }));
    try {
      await saveAppState(state);
      console.log(`[Admin] Fixed match times: shifted all by +${offsetHours}h`);
      res.json({ success: true, shifted: offsetHours, state: getCleanState(state) });
    } catch (err) {
      console.error("[Firebase] Error saving fixed match times:", err);
      res.status(500).json({ error: "Erro ao salvar horários corrigidos no banco de dados" });
    }
  });

  // Diagnostics endpoint
  app.get("/api/diagnostics", async (req, res) => {
    const fs = await import("fs");
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const hasConfigFile = fs.existsSync(configPath);
    let configContentKeys: string[] = [];
    if (hasConfigFile) {
      try {
        const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        configContentKeys = Object.keys(parsed);
      } catch (e) {}
    }
    
    res.json({
      firebaseReady: isFirebaseReady(),
      cwd: process.cwd(),
      hasConfigFile,
      configContentKeys,
      envKeys: Object.keys(process.env).filter(k => !k.includes("KEY") && !k.includes("SECRET") && !k.includes("PASSWORD")),
      firebaseEnv: {
        hasApiKey: !!process.env.FIREBASE_API_KEY,
        hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
        projectId: process.env.FIREBASE_PROJECT_ID,
        databaseId: process.env.FIREBASE_DATABASE_ID
      },
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      stateParticipantsCount: state.participants.length,
      stateGuessesCount: state.guesses.length
    });
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

      // Start background auto-sync timer (every 10 minutes checks if 1 hour has elapsed)
      console.log("[Auto-Sync] Inicializando temporizador periódico para atualização automática dos jogos...");
      setInterval(() => {
        performAutoSyncMatches().catch(err => console.error("[Auto-Sync] Erro no timer periódico:", err));
      }, 10 * 60 * 1000); // 10 minutes
    });
  }).catch(err => {
    console.error("Failed to start backend server: ", err);
  });
}
