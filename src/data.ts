import { Match, Participant, Guess, RulePointConfig } from './types';

export const INITIAL_RULES: RulePointConfig = {
  exactScore: 10,
  winnerAndDiff: 7,
  winnerOnly: 5,
  oneTeamScore: 2,
  completeWrong: 0,
};

export const INITIAL_MATCHES: Match[] = [
  // ====== 20 DE JUNHO (Sábado) ======
  {
    id: 'm_real_1',
    homeTeam: 'Turquia',
    awayTeam: 'Paraguai',
    homeFlag: '🇹🇷',
    awayFlag: '🇵🇾',
    homeScore: 0,
    awayScore: 1,
    status: 'finished',
    dateTime: '2026-06-20T03:00:00Z', // 00:00 BRT
  },
  {
    id: 'm_real_2',
    homeTeam: 'Holanda',
    awayTeam: 'Suécia',
    homeFlag: '🇳🇱',
    awayFlag: '🇸🇪',
    homeScore: 5,
    awayScore: 1,
    status: 'finished',
    dateTime: '2026-06-20T17:00:00Z', // 14:00 BRT
  },
  {
    id: 'm_real_3',
    homeTeam: 'Alemanha',
    awayTeam: 'Costa do Marfim',
    homeFlag: '🇩🇪',
    awayFlag: '🇨🇮',
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    dateTime: '2026-06-20T20:00:00Z', // 17:00 BRT
  },
  {
    id: 'm_real_4',
    homeTeam: 'Equador',
    awayTeam: 'Curaçau',
    homeFlag: '🇪🇨',
    awayFlag: '🇨🇼',
    homeScore: 0,
    awayScore: 0,
    status: 'finished',
    dateTime: '2026-06-21T00:00:00Z', // 21:00 BRT
  },
  // ====== 21 DE JUNHO (Domingo) ======
  {
    id: 'm_real_5',
    homeTeam: 'Tunísia',
    awayTeam: 'Japão',
    homeFlag: '🇹🇳',
    awayFlag: '🇯🇵',
    homeScore: 0,
    awayScore: 4,
    status: 'finished',
    dateTime: '2026-06-21T04:00:00Z', // 01:00 BRT
  },
  {
    id: 'm_real_6',
    homeTeam: 'Espanha',
    awayTeam: 'Arábia Saudita',
    homeFlag: '🇪🇸',
    awayFlag: '🇸🇦',
    homeScore: 4,
    awayScore: 0,
    status: 'finished',
    dateTime: '2026-06-21T16:00:00Z', // 13:00 BRT
  },
  {
    id: 'm_real_7',
    homeTeam: 'Bélgica',
    awayTeam: 'RI do Irã',
    homeFlag: '🇧🇪',
    awayFlag: '🇮🇷',
    homeScore: 0,
    awayScore: 0,
    status: 'finished',
    dateTime: '2026-06-21T19:00:00Z', // 16:00 BRT
  },
  {
    id: 'm_real_8',
    homeTeam: 'Uruguai',
    awayTeam: 'Cabo Verde',
    homeFlag: '🇺🇾',
    awayFlag: '🇨🇻',
    homeScore: 2,
    awayScore: 2,
    status: 'finished',
    dateTime: '2026-06-21T22:00:00Z', // 19:00 BRT
  },
  {
    id: 'm_real_9',
    homeTeam: 'Nova Zelândia',
    awayTeam: 'Egito',
    homeFlag: '🇳🇿',
    awayFlag: '🇪🇬',
    homeScore: 1,
    awayScore: 3,
    status: 'finished',
    dateTime: '2026-06-22T01:00:00Z', // 22:00 BRT
  },
  // ====== 22 DE JUNHO (Segunda-feira) ======
  {
    id: 'm_real_10',
    homeTeam: 'Argentina',
    awayTeam: 'Áustria',
    homeFlag: '🇦🇷',
    awayFlag: '🇦🇹',
    homeScore: 2,
    awayScore: 0,
    status: 'finished',
    dateTime: '2026-06-22T17:00:00Z', // 14:00 BRT
  },
  {
    id: 'm_real_11',
    homeTeam: 'França',
    awayTeam: 'Iraque',
    homeFlag: '🇫🇷',
    awayFlag: '🇮🇶',
    homeScore: 3,
    awayScore: 0,
    status: 'finished',
    dateTime: '2026-06-22T21:00:00Z', // 18:00 BRT
  },
  {
    id: 'm_real_12',
    homeTeam: 'Noruega',
    awayTeam: 'Senegal',
    homeFlag: '🇳🇴',
    awayFlag: '🇸🇳',
    homeScore: 3,
    awayScore: 2,
    status: 'finished',
    dateTime: '2026-06-23T00:00:00Z', // 21:00 BRT
  },
  // ====== 23 DE JUNHO (Terça-feira) ======
  {
    id: 'm_real_13',
    homeTeam: 'Jordânia',
    awayTeam: 'Argélia',
    homeFlag: '🇯🇴',
    awayFlag: '🇩🇿',
    homeScore: 1,
    awayScore: 2,
    status: 'finished',
    dateTime: '2026-06-23T03:00:00Z', // 00:00 BRT
  },
  {
    id: 'm_real_14',
    homeTeam: 'Portugal',
    awayTeam: 'Uzbequistão',
    homeFlag: '🇵🇹',
    awayFlag: '🇺🇿',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-23T17:00:00Z', // 14:00 BRT
  },
  {
    id: 'm_real_15',
    homeTeam: 'Inglaterra',
    awayTeam: 'Gana',
    homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    awayFlag: '🇬🇭',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-23T20:00:00Z', // 17:00 BRT
  },
  {
    id: 'm_real_16',
    homeTeam: 'Panamá',
    awayTeam: 'Croácia',
    homeFlag: '🇵🇦',
    awayFlag: '🇭🇷',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-23T23:00:00Z', // 20:00 BRT
  },
  {
    id: 'm_real_17',
    homeTeam: 'Colômbia',
    awayTeam: 'RD do Congo',
    homeFlag: '🇨🇴',
    awayFlag: '🇨🇩',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-24T02:00:00Z', // 23:00 BRT
  },
  // ====== 24 DE JUNHO (Quarta-feira) ======
  {
    id: 'm_real_18',
    homeTeam: 'Suíça',
    awayTeam: 'Canadá',
    homeFlag: '🇨🇭',
    awayFlag: '🇨🇦',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-24T19:00:00Z', // 16:00 BRT
  },
  {
    id: 'm_real_19',
    homeTeam: 'Bósnia e Herzegovina',
    awayTeam: 'Catar',
    homeFlag: '🇧🇦',
    awayFlag: '🇶🇦',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-24T19:00:00Z', // 16:00 BRT
  },
  {
    id: 'm_real_20',
    homeTeam: 'Escócia',
    awayTeam: 'Brasil',
    homeFlag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    awayFlag: '🇧🇷',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-24T22:00:00Z', // 19:00 BRT
  },
  {
    id: 'm_real_21',
    homeTeam: 'Marrocos',
    awayTeam: 'Haiti',
    homeFlag: '🇲🇦',
    awayFlag: '🇭🇹',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-24T22:00:00Z', // 19:00 BRT
  },
  {
    id: 'm_real_22',
    homeTeam: 'Tchéquia',
    awayTeam: 'México',
    homeFlag: '🇨🇿',
    awayFlag: '🇲🇽',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-25T01:00:00Z', // 22:00 BRT
  },
  {
    id: 'm_real_23',
    homeTeam: 'África do Sul',
    awayTeam: 'República da Coreia',
    homeFlag: '🇿🇦',
    awayFlag: '🇰🇷',
    homeScore: null,
    awayScore: null,
    status: 'scheduled',
    dateTime: '2026-06-25T01:00:00Z', // 22:00 BRT
  },
  // ====== 25 DE JUNHO (Quinta-feira) ======
  {
    id: "m_real_24",
    homeTeam: "Curaçau",
    awayTeam: "Costa do Marfim",
    homeFlag: "🇨🇼",
    awayFlag: "🇨🇮",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-25T19:00:00Z" // 16:00 BRT
  },
  {
    id: "m_real_25",
    homeTeam: "Tunísia",
    awayTeam: "Holanda",
    homeFlag: "🇹🇳",
    awayFlag: "🇳🇱",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-25T19:00:00Z" // 16:00 BRT
  },
  {
    id: "m_real_26",
    homeTeam: "Japão",
    awayTeam: "Suécia",
    homeFlag: "🇯🇵",
    awayFlag: "🇸🇪",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-25T22:00:00Z" // 19:00 BRT
  },
  {
    id: "m_real_27",
    homeTeam: "Turquia",
    awayTeam: "Estados Unidos",
    homeFlag: "🇹🇷",
    awayFlag: "🇺🇸",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-25T22:00:00Z" // 19:00 BRT
  },
  // ====== 26 DE JUNHO (Sexta-feira) ======
  {
    id: "m_real_28",
    homeTeam: "Noruega",
    awayTeam: "França",
    homeFlag: "🇳🇴",
    awayFlag: "🇫🇷",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-26T19:00:00Z" // 16:00 BRT
  },
  {
    id: "m_real_29",
    homeTeam: "Senegal",
    awayTeam: "Iraque",
    homeFlag: "🇸🇳",
    awayFlag: "🇮🇶",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-26T19:00:00Z" // 16:00 BRT
  },
  {
    id: "m_real_30",
    homeTeam: "Uruguai",
    awayTeam: "Espanha",
    homeFlag: "🇺🇾",
    awayFlag: "🇪🇸",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-26T22:00:00Z" // 19:00 BRT
  },
  {
    id: "m_real_31",
    homeTeam: "Cabo Verde",
    awayTeam: "Arábia Saudita",
    homeFlag: "🇨🇻",
    awayFlag: "🇸🇦",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-26T22:00:00Z" // 19:00 BRT
  },
  {
    id: "m_real_32",
    homeTeam: "Egito",
    awayTeam: "RI do Irã",
    homeFlag: "🇪🇬",
    awayFlag: "🇮🇷",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-27T01:00:00Z" // 22:00 BRT on June 26
  },
  {
    id: "m_real_33",
    homeTeam: "Nova Zelândia",
    awayTeam: "Bélgica",
    homeFlag: "🇳🇿",
    awayFlag: "🇧🇪",
    homeScore: null,
    awayScore: null,
    status: "scheduled",
    dateTime: "2026-06-27T01:00:00Z" // 22:00 BRT on June 26
  }
];

export const INITIAL_PARTICIPANTS: Participant[] = [];

export const INITIAL_GUESSES: Guess[] = [];

export const PREDEFINED_PARTICIPANTS: string[] = [
  "Aimee",
  "Angélica",
  "Carolina",
  "Eduardo (Boss)",
  "Eduardo (Log)",
  "Estevam",
  "Indianara",
  "Joelson",
  "João",
  "Lenon",
  "Olzênis",
  "Ricardo",
  "Robinson",
  "Rodrigo",
  "Rosinete",
  "Tais",
  "Taynara",
  "Uramar",
  "Valdir",
  "Yasmim"
];
