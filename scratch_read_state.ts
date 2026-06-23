import { loadAppState } from "./src/db/firebase";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const state = await loadAppState();
  if (state) {
    console.log("=== FIRESTORE APP STATE ===");
    console.log(`Participants (${state.participants?.length || 0}):`, state.participants?.map(p => p.name));
    console.log(`Guesses (${state.guesses?.length || 0}):`, state.guesses);
    console.log(`Matches (${state.matches?.length || 0}):`, state.matches?.filter(m => m.homeScore !== null || m.awayScore !== null));
  } else {
    console.log("No state loaded from Firestore");
  }
}
run();
