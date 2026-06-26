import { loadAppState } from "./src/db/firebase";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config();

async function backup() {
  console.log("Iniciando backup dos dados do Firestore...");
  const state = await loadAppState();

  if (!state) {
    console.error("❌ Erro: Não foi possível obter o estado do banco de dados.");
    return;
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

  const dataStr = JSON.stringify(state, null, 2);

  fs.writeFileSync(backupPath, dataStr, "utf8");
  fs.writeFileSync(latestPath, dataStr, "utf8");

  console.log(`✅ Backup realizado com sucesso!`);
  console.log(`📂 Arquivo criado: backups/${backupFileName}`);
  console.log(`📂 Arquivo atualizado: backups/backup_latest.json`);
  console.log(`📊 Estatísticas do backup:`);
  console.log(`   - Partidas: ${state.matches?.length || 0}`);
  console.log(`   - Participantes: ${state.participants?.length || 0}`);
  console.log(`   - Palpites: ${state.guesses?.length || 0}`);
}

backup().catch(console.error);
