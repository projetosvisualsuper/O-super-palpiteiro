import { saveAppState } from "./src/db/firebase";
import dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
dotenv.config();

async function restore() {
  console.log("Iniciando restauração dos dados no Firestore...");

  let backupFile = process.argv[2];
  const backupDir = path.join(process.cwd(), "backups");

  if (!backupFile) {
    backupFile = "backup_latest.json";
    console.log("Nenhum arquivo especificado. Usando o backup mais recente: backups/backup_latest.json");
  }

  let backupPath = path.isAbsolute(backupFile) ? backupFile : path.join(backupDir, backupFile);
  if (!fs.existsSync(backupPath) && !path.isAbsolute(backupFile)) {
    // try direct path relative to Cwd
    backupPath = path.resolve(backupFile);
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Erro: Arquivo de backup não encontrado no caminho: ${backupPath}`);
    console.log("Verifique se o nome do arquivo está correto e se ele existe na pasta backups/.");
    return;
  }

  console.log(`Lendo dados do arquivo: ${backupPath}...`);
  const rawData = fs.readFileSync(backupPath, "utf8");
  const state = JSON.parse(rawData);

  if (!state || !state.matches || !state.participants || !state.guesses) {
    console.error("❌ Erro: O arquivo de backup selecionado não contém uma estrutura de estado válida.");
    return;
  }

  console.log(`Dados a serem restaurados:`);
  console.log(`   - Partidas: ${state.matches.length}`);
  console.log(`   - Participantes: ${state.participants.length}`);
  console.log(`   - Palpites: ${state.guesses.length}`);

  console.log("Enviando dados para o Firestore...");
  const success = await saveAppState(state);

  if (success) {
    console.log(`✅ Banco de dados restaurado com sucesso a partir de: ${path.basename(backupPath)}`);
  } else {
    console.error("❌ Erro: Falha ao salvar os dados no Firestore durante a restauração.");
  }
}

restore().catch(console.error);
