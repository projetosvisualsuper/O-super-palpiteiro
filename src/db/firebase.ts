import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { AppState } from "../types";

const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;
let firebaseInitialized = false;

let config: any = null;
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (error) {
    console.error("[Firebase] Error reading firebase-applet-config.json:", error);
  }
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || config?.apiKey,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || config?.authDomain,
  projectId: process.env.FIREBASE_PROJECT_ID || config?.projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || config?.storageBucket,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || config?.messagingSenderId,
  appId: process.env.FIREBASE_APP_ID || config?.appId,
  firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || config?.firestoreDatabaseId,
};

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    const app = initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    });
    
    const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
    db = getFirestore(app, databaseId);
    firebaseInitialized = true;
    console.log(`[Firebase] Initialized with project: ${firebaseConfig.projectId}, db: ${databaseId}`);
  } catch (error) {
    console.error("[Firebase] Error during initialization:", error);
  }
} else {
  console.warn("[Firebase] Config credentials not found in env or file.");
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
