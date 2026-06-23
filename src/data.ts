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
    id: 'm_real_1',
    homeTeam: 'México',
    awayTeam: 'África do Sul',
    homeFlag: '🇲🇽',
    awayFlag: '🇿🇦',
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    dateTime: '2026-06-11T16:00:00Z',
  },
  {
    id: 'm_real_2',
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
    id: 'm_real_3',
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
    id: 'm_real_4',
    homeTeam: 'Alemanha',
    awayTeam: 'Japão',
    homeFlag: '🇩🇪',
    awayFlag: '🇯🇵',
    homeScore: 2,
    awayScore: 0,
    status: 'finished',
    dateTime: '2026-06-15T15:00:00Z',
  },
  {
    id: 'm_real_5',
    homeTeam: 'Argentina',
    awayTeam: 'Polônia',
    homeFlag: '🇦🇷',
    awayFlag: '🇵🇱',
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    dateTime: '2026-06-18T19:00:00Z',
  },
  {
    id: 'm_real_6',
    homeTeam: 'França',
    awayTeam: 'Coreia do Sul',
    homeFlag: '🇫🇷',
    awayFlag: '🇰🇷',
    homeScore: 2,
    awayScore: 2,
    status: 'finished',
    dateTime: '2026-06-20T17:00:00Z',
  },
  {
    id: 'm_real_7',
    homeTeam: 'Espanha',
    awayTeam: 'Camarões',
    homeFlag: '🇪🇸',
    awayFlag: '🇨🇲',
    homeScore: 1,
    awayScore: 0,
    status: 'finished',
    dateTime: '2026-06-22T19:00:00Z',
  },
  {
    id: 'm_real_8',
    homeTeam: 'Brasil',
    awayTeam: 'Croácia',
    homeFlag: '🇧🇷',
    awayFlag: '🇭🇷',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-24T20:00:00Z',
  },
  {
    id: 'm_real_9',
    homeTeam: 'México',
    awayTeam: 'Alemanha',
    homeFlag: '🇲🇽',
    awayFlag: '🇩🇪',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-25T18:00:00Z',
  },
  {
    id: 'm_real_10',
    homeTeam: 'Argentina',
    awayTeam: 'Suécia',
    homeFlag: '🇦🇷',
    awayFlag: '🇸🇪',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-26T19:00:00Z',
  },
  {
    id: 'm_real_11',
    homeTeam: 'Estados Unidos',
    awayTeam: 'Uruguai',
    homeFlag: '🇺🇸',
    awayFlag: '🇺🇾',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-27T21:00:00Z',
  },
  {
    id: 'm_real_12',
    homeTeam: 'Portugal',
    awayTeam: 'Holanda',
    homeFlag: '🇵🇹',
    awayFlag: '🇳🇱',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-28T19:00:00Z',
  },
  {
    id: 'm_real_13',
    homeTeam: 'Itália',
    awayTeam: 'Espanha',
    homeFlag: '🇮🇹',
    awayFlag: '🇪🇸',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-29T18:00:00Z',
  }
];

export const INITIAL_PARTICIPANTS: Participant[] = [
  { id: 'p1', name: 'Casimiro', points: 30, exactScores: 3, correctWinners: 0, lastGuessTime: '2026-06-22T18:30:00Z', avatarColor: '#EAB308' },
  { id: 'p2', name: 'Luisinho', points: 24, exactScores: 0, correctWinners: 4, lastGuessTime: '2026-06-22T18:35:00Z', avatarColor: '#3B82F6' },
  { id: 'p3', name: 'Beltrão', points: 17, exactScores: 0, correctWinners: 3, lastGuessTime: '2026-06-22T18:40:00Z', avatarColor: '#EF4444' },
  { id: 'p4', name: 'Guilherme', points: 15, exactScores: 1, correctWinners: 1, lastGuessTime: '2026-06-22T18:41:00Z', avatarColor: '#10B981' },
  { id: 'p5', name: 'Defante', points: 10, exactScores: 1, correctWinners: 0, lastGuessTime: '2026-06-22T18:50:00Z', avatarColor: '#8B5CF6' }
];

export const INITIAL_GUESSES: Guess[] = [
  // México 2 - 1 África do Sul (m_real_1)
  { id: 'g1', matchId: 'm_real_1', participantName: 'Casimiro', homeScore: 2, awayScore: 1, pointsEarned: 10, submittedAt: '2026-06-11T15:00:00Z' },
  { id: 'g2', matchId: 'm_real_1', participantName: 'Luisinho', homeScore: 3, awayScore: 2, pointsEarned: 7, submittedAt: '2026-06-11T15:15:00Z' },
  { id: 'g3', matchId: 'm_real_1', participantName: 'Beltrão', homeScore: 1, awayScore: 0, pointsEarned: 7, submittedAt: '2026-06-11T15:20:00Z' },
  { id: 'g4', matchId: 'm_real_1', participantName: 'Guilherme', homeScore: 2, awayScore: 0, pointsEarned: 5, submittedAt: '2026-06-11T15:25:00Z' },
  { id: 'g5', matchId: 'm_real_1', participantName: 'Defante', homeScore: 0, awayScore: 2, pointsEarned: 0, submittedAt: '2026-06-11T15:30:00Z' },

  // Estados Unidos 3 - 1 Nova Zelândia (m_real_2)
  { id: 'g6', matchId: 'm_real_2', participantName: 'Casimiro', homeScore: 3, awayScore: 1, pointsEarned: 10, submittedAt: '2026-06-11T19:00:00Z' },
  { id: 'g7', matchId: 'm_real_2', participantName: 'Luisinho', homeScore: 2, awayScore: 1, pointsEarned: 5, submittedAt: '2026-06-11T19:05:00Z' },
  { id: 'g8', matchId: 'm_real_2', participantName: 'Beltrão', homeScore: 2, awayScore: 0, pointsEarned: 5, submittedAt: '2026-06-11T19:10:00Z' },
  { id: 'g9', matchId: 'm_real_2', participantName: 'Guilherme', homeScore: 3, awayScore: 1, pointsEarned: 10, submittedAt: '2026-06-11T19:15:00Z' },
  { id: 'g10', matchId: 'm_real_2', participantName: 'Defante', homeScore: 1, awayScore: 1, pointsEarned: 0, submittedAt: '2026-06-11T19:20:00Z' },

  // Alemanha 2 - 0 Japão (m_real_4)
  { id: 'g11', matchId: 'm_real_4', participantName: 'Luisinho', homeScore: 2, awayScore: 1, pointsEarned: 5, submittedAt: '2026-06-15T14:15:00Z' },

  // França 2 - 2 Coreia do Sul (m_real_6)
  { id: 'g12', matchId: 'm_real_6', participantName: 'Casimiro', homeScore: 2, awayScore: 2, pointsEarned: 10, submittedAt: '2026-06-20T16:00:00Z' },
  { id: 'g13', matchId: 'm_real_6', participantName: 'Luisinho', homeScore: 1, awayScore: 1, pointsEarned: 7, submittedAt: '2026-06-20T16:05:00Z' },
  { id: 'g14', matchId: 'm_real_6', participantName: 'Defante', homeScore: 2, awayScore: 2, pointsEarned: 10, submittedAt: '2026-06-20T16:10:00Z' },

  // Espanha 1 - 0 Camarões (m_real_7)
  { id: 'g15', matchId: 'm_real_7', participantName: 'Beltrão', homeScore: 2, awayScore: 1, pointsEarned: 5, submittedAt: '2026-06-22T18:10:00Z' },

  // Guesses for the upcoming Brasil vs Croácia match (m_real_8)
  { id: 'g16', matchId: 'm_real_8', participantName: 'Casimiro', homeScore: 3, awayScore: 1, pointsEarned: 0, submittedAt: '2026-06-23T15:00:00Z' },
  { id: 'g17', matchId: 'm_real_8', participantName: 'Luisinho', homeScore: 2, awayScore: 1, pointsEarned: 0, submittedAt: '2026-06-23T15:05:00Z' },
  { id: 'g18', matchId: 'm_real_8', participantName: 'Beltrão', homeScore: 3, awayScore: 0, pointsEarned: 0, submittedAt: '2026-06-23T15:10:00Z' },
  { id: 'g19', matchId: 'm_real_8', participantName: 'Guilherme', homeScore: 1, awayScore: 2, pointsEarned: 0, submittedAt: '2026-06-23T15:15:00Z' },
  { id: 'g20', matchId: 'm_real_8', participantName: 'Defante', homeScore: 3, awayScore: 1, pointsEarned: 0, submittedAt: '2026-06-23T15:20:00Z' }
];
