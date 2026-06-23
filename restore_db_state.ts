/**
 * Script to restore Firestore to a clean, correct state with current INITIAL_MATCHES.
 * Preserves any PREDEFINED_PARTICIPANTS that already exist in the DB.
 * Run with: npx tsx restore_db_state.ts
 */
import { loadAppState, saveAppState } from "./src/db/firebase";
import { INITIAL_MATCHES, INITIAL_RULES, PREDEFINED_PARTICIPANTS } from "./src/data";
import dotenv from "dotenv";
dotenv.config();

async function restore() {
  console.log("Loading current state from Firestore...");
  const current = await loadAppState();

  // Keep only predefined participants that already have data
  const existingParticipants = current
    ? (current.participants || []).filter(p =>
        PREDEFINED_PARTICIPANTS.some(pp => pp.toLowerCase() === p.name.toLowerCase())
      )
    : [];

  // Keep only guesses from predefined participants
  const existingGuesses = current
    ? (current.guesses || []).filter(g =>
        PREDEFINED_PARTICIPANTS.some(pp => pp.toLowerCase() === g.participantName.toLowerCase())
      )
    : [];

  // Build new state with INITIAL_MATCHES as canonical match list,
  // but preserve any existing scores/status from the DB for matches that exist in both
  const restoredMatches = INITIAL_MATCHES.map(im => {
    const existing = current ? (current.matches || []).find(m => m.id === im.id) : null;
    if (existing && (existing.homeScore !== null || existing.awayScore !== null || existing.status !== 'scheduled')) {
      // Preserve DB scores/status
      return { ...im, homeScore: existing.homeScore, awayScore: existing.awayScore, status: existing.status };
    }
    return im;
  });

  const newState = {
    matches: restoredMatches,
    participants: existingParticipants,
    guesses: existingGuesses.filter(g => restoredMatches.some(m => m.id === g.matchId)),
    rules: (current && current.rules) ? current.rules : { ...INITIAL_RULES },
    customLogoUrl: (current && current.customLogoUrl) || "",
    customLogoText: (current && current.customLogoText) || "REMIX TV",
    prizeName: (current && current.prizeName) || "SMART TV 55\" OLED 4K + COLO COLADO",
    prizeDescription: (current && current.prizeDescription) || "O melhor de todos os palpiteiros receberá um Smart TV de última geração com entrega garantida!",
    prizeImage: (current && current.prizeImage) || "",
    prize2Name: (current && current.prize2Name) || "CAMISA OFICIAL DA SELEÇÃO",
    prize2Description: (current && current.prize2Description) || "O segundo colocado ganhará uma camisa oficial da Seleção Brasileira autografada!",
    prize2Image: (current && current.prize2Image) || "",
    prize3Name: (current && current.prize3Name) || "KIT TORCEDOR EXCLUSIVO",
    prize3Description: (current && current.prize3Description) || "O terceiro colocado levará um kit torcedor com copo térmico e boné oficial!",
    prize3Image: (current && current.prize3Image) || "",
    participateTitle: (current && current.participateTitle) || "LEIA O QR CODE COM O CELULAR",
    participateInstruction: (current && current.participateInstruction) || "Aponte a câmera pro QR Code, insira seu nome, escolha sua cor e arrisque seus palpites. Salve para pontuar na TV na hora!",
    tvLiveLabel: (current && current.tvLiveLabel) || "TV LIVE",
    championshipName: (current && current.championshipName) || "COPA DO MUNDO DE 2026"
  };

  console.log(`Restoring DB with:`);
  console.log(`  Matches: ${newState.matches.length}`);
  console.log(`  Participants: ${newState.participants.length} (${newState.participants.map(p => p.name).join(', ')})`);
  console.log(`  Guesses: ${newState.guesses.length}`);

  const success = await saveAppState(newState as any);
  if (success) {
    console.log("✅ Firestore restored successfully!");
  } else {
    console.error("❌ Failed to restore Firestore.");
  }
}

restore().catch(console.error);
