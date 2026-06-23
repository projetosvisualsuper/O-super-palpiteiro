import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { AppState } from "../types";

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;
let firebaseInitialized = false;

if (fs.existsSync(configPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
    
    // Choose custom databaseId if specified in config, otherwise default
    const databaseId = config.firestoreDatabaseId || "(default)";
    db = getFirestore(app, databaseId);
    firebaseInitialized = true;
    console.log(`[Firebase] Initialized with project: ${config.projectId}, db: ${databaseId}`);
  } catch (error) {
    console.error("[Firebase] Error during initialization:", error);
  }
} else {
  console.warn("[Firebase] Config file not found at " + configPath);
}

const COLLECTION_NAME = "football_bolao";
const DOCUMENT_ID = "app_state";

/**
 * Loads the application state from Firestore.
 * Returns null if the document does not exist, or if Firebase is not initialized.
 */
export async function loadAppState(): Promise<AppState | null> {
  if (!firebaseInitialized || !db) {
    console.log("[Firebase] Not initialized. Skipping database load.");
    return null;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      console.log("[Firebase] Successfully loaded state from Firestore.");
      return docSnap.data() as AppState;
    } else {
      console.log("[Firebase] No state found in Firestore. Will initialize standard state.");
      return null;
    }
  } catch (error) {
    console.error("[Firebase] Error loading state:", error);
    return null;
  }
}

/**
 * Saves the application state to Firestore.
 */
export async function saveAppState(state: AppState): Promise<boolean> {
  if (!firebaseInitialized || !db) {
    return false;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, DOCUMENT_ID);
    await setDoc(docRef, state);
    return true;
  } catch (error) {
    console.error("[Firebase] Error saving state:", error);
    return false;
  }
}

export function isFirebaseReady(): boolean {
  return firebaseInitialized;
}
