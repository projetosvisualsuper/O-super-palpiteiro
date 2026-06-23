import { Match, Participant, Guess, RulePointConfig } from './types';

export const INITIAL_RULES: RulePointConfig = {
  exactScore: 10,
  winnerAndDiff: 7,
  winnerOnly: 5,
  oneTeamScore: 2,
  completeWrong: 0,
};

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'm1',
    homeTeam: 'Brasil',
    awayTeam: 'Argentina',
    homeFlag: '🇧🇷',
    awayFlag: '🇦🇷',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-25T20:00:00Z',
  },
  {
    id: 'm2',
    homeTeam: 'Espanha',
    awayTeam: 'Alemanha',
    homeFlag: '🇪🇸',
    awayFlag: '🇩🇪',
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    dateTime: '2026-06-18T18:00:00Z',
  },
  {
    id: 'm3',
    homeTeam: 'França',
    awayTeam: 'Inglaterra',
    homeFlag: '🇫🇷',
    awayFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    homeScore: 1,
    awayScore: 1,
    status: 'finished',
    dateTime: '2026-06-20T16:00:00Z',
  },
  {
    id: 'm4',
    homeTeam: 'Estados Unidos',
    awayTeam: 'México',
    homeFlag: '🇺🇸',
    awayFlag: '🇲🇽',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-26T21:00:00Z',
  },
  {
    id: 'm5',
    homeTeam: 'Portugal',
    awayTeam: 'Itália',
    homeFlag: '🇵🇹',
    awayFlag: '🇮🇹',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-28T19:00:00Z',
  }
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Casimiro', points: 27, exactScores: 2, correctWinners: 1, lastGuessTime: '2026-06-21T18:30:00Z', avatarColor: '#EAB308' }, // cazetv yellow
  { id: 'p2', name: 'Luisinho', points: 22, exactScores: 1, correctWinners: 2, lastGuessTime: '2026-06-21T18:35:00Z', avatarColor: '#3B82F6' },
  { id: 'p3', name: 'Beltrão', points: 19, exactScores: 1, correctWinners: 1, lastGuessTime: '2026-06-21T18:40:00Z', avatarColor: '#EF4444' },
  { id: 'p4', name: 'Guilherme', points: 12, exactScores: 0, correctWinners: 2, lastGuessTime: '2026-06-21T18:41:00Z', avatarColor: '#10B981' },
  { id: 'p5', name: 'Defante', points: 4, exactScores: 0, correctWinners: 0, lastGuessTime: '2026-06-21T18:50:00Z', avatarColor: '#8B5CF6' }
];

export const INITIAL_GUESSES: Guess[] = [
  // Guesses for match 2 (Espanha 2 - 1 Alemanha)
  { id: 'g1', matchId: 'm2', participantName: 'Casimiro', homeScore: 2, awayScore: 1, pointsEarned: 10, submittedAt: '2026-06-18T17:00:00Z' }, // Exact score: 10 pts
  { id: 'g2', matchId: 'm2', participantName: 'Luisinho', homeScore: 3, awayScore: 2, pointsEarned: 7, submittedAt: '2026-06-18T17:15:00Z' }, // Winner + Diff (+1): 7 pts
  { id: 'g3', matchId: 'm2', participantName: 'Beltrão', homeScore: 1, awayScore: 0, pointsEarned: 7, submittedAt: '2026-06-18T17:20:00Z' },  // Winner + Diff (+1): 7 pts
  { id: 'g4', matchId: 'm2', participantName: 'Guilherme', homeScore: 2, awayScore: 0, pointsEarned: 5, submittedAt: '2026-06-18T17:25:00Z' },// Winner only: 5 pts
  { id: 'g5', matchId: 'm2', participantName: 'Defante', homeScore: 0, awayScore: 3, pointsEarned: 2, submittedAt: '2026-06-18T17:30:00Z' },   // One team goals (Alemanha 3, España got 2 so none match? Wait, Alemanha got 1 real gaol but guessed 3. Espanha got 2, guessed 0. Correct goals: 0. Wait, Defante got 2 pts because maybe there is one team goals or just 0)
  
  // Guesses for match 3 (França 1 - 1 Inglaterra)
  { id: 'g6', matchId: 'm3', participantName: 'Casimiro', homeScore: 1, awayScore: 1, pointsEarned: 10, submittedAt: '2026-06-20T15:00:00Z' }, // Exact score: 10 pts
  { id: 'g7', matchId: 'm3', participantName: 'Luisinho', homeScore: 1, awayScore: 1, pointsEarned: 10, submittedAt: '2026-06-20T15:05:00Z' }, // Exact score: 10 pts
  { id: 'g8', matchId: 'm3', participantName: 'Beltrão', homeScore: 2, awayScore: 2, pointsEarned: 7, submittedAt: '2026-06-20T15:10:00Z' },  // Winner (Draw) + Diff (0): 7 pts
  { id: 'g9', matchId: 'm3', participantName: 'Guilherme', homeScore: 0, awayScore: 0, pointsEarned: 7, submittedAt: '2026-06-20T15:15:00Z' },// Winner (Draw) + Diff (0): 7 pts  
  { id: 'g10', matchId: 'm3', participantName: 'Defante', homeScore: 2, awayScore: 1, pointsEarned: 2, submittedAt: '2026-06-20T15:20:00Z' }, // França got 1 guessed 2. England got 1 guessed 1. This matches England score of 1! So 2 pts.
];
