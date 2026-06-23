import { RulePointConfig } from './types';

export function calculateGuessPoints(
  gHome: number,
  gAway: number,
  aHome: number,
  aAway: number,
  rules: RulePointConfig
): { points: number; category: 'exact' | 'diff' | 'winner' | 'one_team' | 'none' } {
  // 1. Placar Exato (Exact Match)
  if (gHome === aHome && gAway === aAway) {
    return { points: rules.exactScore, category: 'exact' };
  }

  const gDiff = gHome - gAway;
  const aDiff = aHome - aAway;

  // Sign determines the winner (1 for Home, -1 for Away, 0 for Draw)
  const gSign = Math.sign(gDiff);
  const aSign = Math.sign(aDiff);

  const correctWinner = gSign === aSign;

  // 2. Acertou Vencedor e Saldo de gols (Winner + Goal Diff)
  if (correctWinner && gDiff === aDiff) {
    return { points: rules.winnerAndDiff, category: 'diff' };
  }

  // 3. Acertou apenas o Vencedor (Winner only)
  if (correctWinner) {
    return { points: rules.winnerOnly, category: 'winner' };
  }

  // 4. Errou o vencedor mas acertou o placar de gols de um dos times
  if (gHome === aHome || gAway === aAway) {
    return { points: rules.oneTeamScore, category: 'one_team' };
  }

  // 5. Erro completo
  return { points: rules.completeWrong, category: 'none' };
}
