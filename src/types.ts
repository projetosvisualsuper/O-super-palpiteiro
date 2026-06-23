export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  homeScore: number | null;
  awayScore: number | null;
  status: 'scheduled' | 'live' | 'finished';
  dateTime: string;
}

export interface Participant {
  id: string;
  name: string;
  points: number;
  exactScores: number; // exact placar: 10 pts
  correctWinners: number; // correct winner: 5 pts / 7 pts
  lastGuessTime: string;
  avatarColor: string;
}

export interface Guess {
  id: string;
  matchId: string;
  participantName: string;
  homeScore: number;
  awayScore: number;
  pointsEarned?: number | null;
  submittedAt: string;
}

export interface RulePointConfig {
  exactScore: number;       // Exact score (e.g., predicted 2-1 and ended 2-1) -> 10 pts
  winnerAndDiff: number;    // Correct winner and goal difference (e.g., predicted 3-1 and ended 2-0) -> 7 pts
  winnerOnly: number;       // Correct winner but wrong goals/difference (e.g., predicted 1-0 and ended 3-1) -> 5 pts
  oneTeamScore: number;     // Wrong winner but guessed accurate goals for at least one team -> 2 pts
  completeWrong: number;    // Guessed completely wrong -> 0 pts
}

export interface AppState {
  matches: Match[];
  participants: Participant[];
  guesses: Guess[];
  rules: RulePointConfig;
  customLogoUrl?: string;
  customLogoText?: string;
  prizeName?: string;
  prizeImage?: string;
  prizeDescription?: string;
  participateTitle?: string;
  participateInstruction?: string;
  tvLiveLabel?: string;
  championshipName?: string;
}
