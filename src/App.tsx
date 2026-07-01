import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { 
  Tv, 
  Smartphone, 
  Settings, 
  Trophy, 
  Compass, 
  HelpCircle, 
  Calendar, 
  Plus, 
  RotateCcw, 
  Check, 
  X, 
  Flame, 
  Volume2, 
  Sparkles, 
  Gift,
  Send,
  Users,
  RefreshCw,
  Globe,
  Maximize,
  Minimize
} from 'lucide-react';
import { Match, Participant, Guess, AppState } from './types';
import { PREDEFINED_PARTICIPANTS } from './data';

function getFlagImgUrl(emoji: string, countryName?: string): string {
  if (!emoji) return '';
  
  const lowerName = (countryName || '').toLowerCase().trim();
  if (emoji.includes('🏴󠁧󠁢󠁥󠁮󠁧󠁿') || lowerName.includes('inglaterra') || lowerName.includes('england')) {
    return 'https://flagcdn.com/w40/gb-eng.png';
  }
  if (emoji.includes('🏴󠁧󠁢󠁳󠁣󠁴󠁿') || lowerName.includes('escócia') || lowerName.includes('scotland')) {
    return 'https://flagcdn.com/w40/gb-sct.png';
  }
  if (emoji.includes('🏴󠁧󠁢󠁷󠁬󠁳󠁿') || lowerName.includes('galas') || lowerName.includes('wales')) {
    return 'https://flagcdn.com/w40/gb-wls.png';
  }

  const codePoints = Array.from(emoji).map(char => char.codePointAt(0));
  const cc = codePoints
    .map(cp => {
      if (cp && cp >= 0x1F1E6 && cp <= 0x1F1FF) {
        return String.fromCharCode(cp - 0x1F1E6 + 97);
      }
      return '';
    })
    .join('');
    
  if (cc.length === 2) {
    return `https://flagcdn.com/w40/${cc}.png`;
  }
  
  return '';
}

function renderFlag(flagEmoji: string, teamName: string) {
  const url = getFlagImgUrl(flagEmoji, teamName);
  if (url) {
    return (
      <img 
        src={url} 
        alt={teamName} 
        className="w-6 h-4 object-cover rounded shadow-sm border border-slate-800 shrink-0" 
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return <span className="text-xl shrink-0 filter drop-shadow-md select-none">{flagEmoji}</span>;
}

export default function App() {
  const [view, setView] = useState<'tv' | 'mobile'>('tv');
  const [appState, setAppState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [selectedMatchForGuess, setSelectedMatchForGuess] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Erro ao ativar tela cheia: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };
  
  // Custom admin authentication states
  const [isAdmin, setIsAdmin] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  // Mobile states
  const [mobileName, setMobileName] = useState('');
  const [mobilePin, setMobilePin] = useState('');
  const [mobileConfirmPin, setMobileConfirmPin] = useState('');
  const [mobileStep, setMobileStep] = useState<'select_name' | 'pin_input'>('select_name');
  const [isMobileLoggedIn, setIsMobileLoggedIn] = useState(false);
  const [mobileGuesses, setMobileGuesses] = useState<Record<string, { home: string; away: string }>>({});
  const [mobileMessage, setMobileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [guessConfirmation, setGuessConfirmation] = useState<{
    matchHome: string; matchAway: string; homeFlag: string; awayFlag: string;
    homeScore: number; awayScore: number;
  } | null>(null);
  const [mobileTab, setMobileTab] = useState<'submit_guess' | 'my_guesses' | 'rules'>('submit_guess');
  const [selectedCorrectGuess, setSelectedCorrectGuess] = useState<Guess | null>(null);
  const [rankingPage, setRankingPage] = useState(0);

  useEffect(() => {
    const savedName = localStorage.getItem('mobile_user_name');
    const savedPin = localStorage.getItem('mobile_user_pin');
    if (savedName && savedPin) {
      setMobileName(savedName);
      setMobilePin(savedPin);
      setIsMobileLoggedIn(true);
    }
  }, []);
  
  // Admin states
  const [adminSelectedMatch, setAdminSelectedMatch] = useState<string | null>(null);
  const [adminHomeScore, setAdminHomeScore] = useState('');
  const [adminAwayScore, setAdminAwayScore] = useState('');
  const [adminMatchStatus, setAdminMatchStatus] = useState<'scheduled' | 'live' | 'finished'>('finished');
  const [adminTab, setAdminTab] = useState<'config' | 'history'>('config');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newHomeFlag, setNewHomeFlag] = useState('🇧🇷');
  const [newAwayFlag, setNewAwayFlag] = useState('🇦🇷');
  const [isSyncingMatches, setIsSyncingMatches] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; isError?: boolean } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupFeedback, setBackupFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Match tab rotation state: 'results' (últimos jogos), 'upcoming' (próximos jogos), 'brazil' (jogos do Brasil)
  const [matchTab, setMatchTab] = useState<'results' | 'upcoming' | 'brazil'>('upcoming');
  const [rotationProgress, setRotationProgress] = useState(0);

  // Filter matches based on the selected tab
  const filteredMatches = useMemo(() => {
    if (!appState?.matches) return [];
    const allMatches = [...appState.matches];

    // Get YYYY-MM-DD in Brasília timezone (BRT = America/Sao_Paulo)
    // This correctly handles matches that cross midnight UTC (e.g., 23:00 BRT = 02:00Z+1d)
    const getBRTDateString = (isoString: string): string => {
      return new Date(isoString).toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).split('/').reverse().join('-'); // DD/MM/YYYY → YYYY-MM-DD
    };

    // Get today's BRT date string
    const todayStr = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).split('/').reverse().join('-');

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).split('/').reverse().join('-');

    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = tomorrowObj.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).split('/').reverse().join('-');
    
    switch (matchTab) {
      case 'results':
        // Show matches of yesterday (ontem) in BRT
        return allMatches
          .filter(m => getBRTDateString(m.dateTime) === yesterdayStr)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      
      case 'upcoming':
        // Show matches of today (hoje) in BRT
        return allMatches
          .filter(m => getBRTDateString(m.dateTime) === todayStr)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
          
      case 'brazil':
        // Show matches of tomorrow (amanhã) in BRT
        return allMatches
          .filter(m => getBRTDateString(m.dateTime) === tomorrowStr)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
          
      default:
        return allMatches;
    }
  }, [appState?.matches, matchTab]);



  // Handle automatic rotation on TV screen (25 seconds per tab)
  useEffect(() => {
    if (view !== 'tv') return;

    const tabs: ('results' | 'upcoming' | 'brazil')[] = ['results', 'upcoming', 'brazil'];
    
    const interval = setInterval(() => {
      setMatchTab((current) => {
        const nextIndex = (tabs.indexOf(current) + 1) % tabs.length;
        return tabs[nextIndex];
      });
      setRotationProgress(0);
    }, 25000); // 25 seconds per tab

    const progressInterval = setInterval(() => {
      setRotationProgress((prev) => {
        if (prev >= 100) return 0;
        return prev + 1;
      });
    }, 250); // 250ms * 100 steps = 25000ms (25 seconds)

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, [view]);

  // Handle automatic ranking rotation on TV screen (8 seconds per page of 4 participants)
  useEffect(() => {
    if (view !== 'tv') return;
    const totalParticipants = appState?.participants.length || 0;
    const totalPages = Math.ceil(totalParticipants / 4);
    if (totalPages <= 1) {
      setRankingPage(0);
      return;
    }
    const interval = setInterval(() => {
      setRankingPage(prev => (prev + 1) % totalPages);
    }, 8000);
    return () => clearInterval(interval);
  }, [view, appState?.participants.length]);

  // Config states
  const [configLogoUrl, setConfigLogoUrl] = useState('');
  const [configLogoText, setConfigLogoText] = useState('');
  const [configPrizeName, setConfigPrizeName] = useState('');
  const [configPrizeImage, setConfigPrizeImage] = useState('');
  const [configPrizeDescription, setConfigPrizeDescription] = useState('');
  const [configPrize2Name, setConfigPrize2Name] = useState('');
  const [configPrize2Image, setConfigPrize2Image] = useState('');
  const [configPrize2Description, setConfigPrize2Description] = useState('');
  const [configPrize3Name, setConfigPrize3Name] = useState('');
  const [configPrize3Image, setConfigPrize3Image] = useState('');
  const [configPrize3Description, setConfigPrize3Description] = useState('');
  const [configTvLiveLabel, setConfigTvLiveLabel] = useState('');
  const [configChampionshipName, setConfigChampionshipName] = useState('');
  const [configShow18Banner, setConfigShow18Banner] = useState(false);
  
  // New instructions & score customizability states
  const [configParticipateTitle, setConfigParticipateTitle] = useState('');
  const [configParticipateInstruction, setConfigParticipateInstruction] = useState('');
  const [ruleExactScore, setRuleExactScore] = useState(10);
  const [ruleWinnerAndDiff, setRuleWinnerAndDiff] = useState(7);
  const [ruleWinnerOnly, setRuleWinnerOnly] = useState(5);
  const [ruleOneTeamScore, setRuleOneTeamScore] = useState(2);
  
  const [hasLoadedConfigs, setHasLoadedConfigs] = useState(false);
  const [activePrizeTab, setActivePrizeTab] = useState<'1st' | '2nd' | '3rd'>('1st');

  // Auto rotate active prize tab
  useEffect(() => {
    if (view !== 'tv') return;
    const interval = setInterval(() => {
      setActivePrizeTab((current) => {
        if (current === '1st') return '2nd';
        if (current === '2nd') return '3rd';
        return '1st';
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [view]);

  // Sync inputs with appState details once upon first server response load
  useEffect(() => {
    if (appState && !hasLoadedConfigs) {
      setConfigLogoUrl(appState.customLogoUrl || '');
      setConfigLogoText(appState.customLogoText || 'O SUPER PALPITEIRO');
      setConfigPrizeName(appState.prizeName || 'SMART TV 55" OLED 4K + COLO COLADO');
      setConfigPrizeImage(appState.prizeImage || '');
      setConfigPrizeDescription(appState.prizeDescription || 'O melhor de todos os palpiteiros receberá um Smart TV de última geração com entrega garantida!');
      setConfigPrize2Name(appState.prize2Name || 'CAMISA OFICIAL DA SELEÇÃO');
      setConfigPrize2Image(appState.prize2Image || '');
      setConfigPrize2Description(appState.prize2Description || 'O segundo colocado ganhará uma camisa oficial da Seleção Brasileira autografada!');
      setConfigPrize3Name(appState.prize3Name || 'KIT TORCEDOR EXCLUSIVO');
      setConfigPrize3Image(appState.prize3Image || '');
      setConfigPrize3Description(appState.prize3Description || 'O terceiro colocado levará um kit torcedor com copo térmico e boné oficial!');
      setConfigParticipateTitle(appState.participateTitle || 'LEIA O QR CODE COM O CELULAR');
      setConfigParticipateInstruction(appState.participateInstruction || 'Preencha seu nome, selecione seu time e envie seu palpite para pontuar. O ranking atualiza na TV na hora!');
      setConfigTvLiveLabel(appState.tvLiveLabel || 'TV LIVE');
      setConfigChampionshipName(appState.championshipName || 'COPA DO MUNDO DE 2026');
      setConfigShow18Banner(appState.show18Banner || false);
      setRuleExactScore(appState.rules?.exactScore ?? 10);
      setRuleWinnerAndDiff(appState.rules?.winnerAndDiff ?? 7);
      setRuleWinnerOnly(appState.rules?.winnerOnly ?? 5);
      setRuleOneTeamScore(appState.rules?.oneTeamScore ?? 2);
      setHasLoadedConfigs(true);
    }
  }, [appState, hasLoadedConfigs]);

  // Load view based on URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'palpitar') {
      setView('mobile');
    } else {
      setView('tv');
    }

    // Check if '?admin=true' or '?admin=1' is in the URL to activate admin state
    if (params.get('admin') === 'true' || params.get('admin') === '1') {
      setIsAdmin(true);
      localStorage.setItem('is_admin', 'true');
    } else {
      const storedAdmin = localStorage.getItem('is_admin');
      if (storedAdmin === 'true') {
        setIsAdmin(true);
      }
    }
  }, []);

  // Sync state with server via polling
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const data = await res.json();
          setAppState(data);
          
          // Preselect the first scheduled match on mobile if not set
          if (data.matches && data.matches.length > 0) {
            const firstScheduled = data.matches.find((m: Match) => m.status !== 'finished');
            if (firstScheduled && !selectedMatchForGuess) {
              setSelectedMatchForGuess(firstScheduled.id);
            }
          }
        }
      } catch (err) {
        console.error('Erro de conexão ao carregar estado do servidor: ', err);
      } finally {
        setLoading(false);
      }
    };

    fetchState();
    
    // Poll every 30 seconds to fetch state from Express server cache
    const interval = setInterval(fetchState, 30000);
    return () => clearInterval(interval);
  }, [selectedMatchForGuess]);

  // Generate QR code pointing to mobile prediction page
  useEffect(() => {
    // Get full absolute path of the current site, with '?view=palpitar'
    const mobileUrl = `${window.location.origin}?view=palpitar`;
    
    QRCode.toDataURL(mobileUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#0f172a', // deep indigo/slate
        light: '#ffffff',
      }
    })
    .then(url => {
      setQrCodeDataUrl(url);
    })
    .catch(err => {
      console.error('Erro ao gerar QR Code: ', err);
    });
  }, []);

  const submitGuess = async (mId: string, name: string, hScore: number, aScore: number) => {
    if (!name.trim()) {
      setMobileMessage({ text: 'Por favor, selecione seu nome!', type: 'error' });
      return;
    }
    if (!mobilePin.trim()) {
      setMobileMessage({ text: 'Por favor, insira o seu PIN de acesso!', type: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/palpites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: mId,
          participantName: name.trim(),
          homeScore: hScore,
          awayScore: aScore,
          pin: mobilePin.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        // Find the match to show in confirmation
        const confirmedMatch = (data.state?.matches || appState?.matches || []).find((m: Match) => m.id === mId);
        if (confirmedMatch) {
          setGuessConfirmation({
            matchHome: confirmedMatch.homeTeam,
            matchAway: confirmedMatch.awayTeam,
            homeFlag: confirmedMatch.homeFlag,
            awayFlag: confirmedMatch.awayFlag,
            homeScore: hScore,
            awayScore: aScore,
          });
          // Auto-dismiss after 6s
          setTimeout(() => setGuessConfirmation(null), 6000);
        } else {
          setMobileMessage({ text: 'Palpite enviado com sucesso! Veja na TV!', type: 'success' });
          setTimeout(() => setMobileMessage(null), 4000);
        }
      } else {
        const errData = await res.json();
        setMobileMessage({ text: `Erro: ${errData.error || 'Falha ao enviar'}`, type: 'error' });
      }
    } catch (err) {
      setMobileMessage({ text: 'Erro de rede ao enviar palpite.', type: 'error' });
    }
  };

  const handleMobileLogin = async () => {
    if (!mobileName.trim()) {
      setMobileMessage({ text: 'Por favor, selecione seu nome!', type: 'error' });
      return;
    }
    if (!mobilePin.trim()) {
      setMobileMessage({ text: 'Por favor, insira o seu PIN de acesso!', type: 'error' });
      return;
    }

    const selectedParticipant = appState?.participants.find(p => p.name.toLowerCase() === mobileName.toLowerCase());
    const isRegistered = !!selectedParticipant && selectedParticipant.hasPin;

    if (!isRegistered) {
      if (mobilePin.length < 4 || mobilePin.length > 6) {
        setMobileMessage({ text: 'O PIN deve conter de 4 a 6 dígitos!', type: 'error' });
        return;
      }
      if (mobilePin !== mobileConfirmPin) {
        setMobileMessage({ text: 'As senhas/PINs digitados não coincidem!', type: 'error' });
        return;
      }
    }

    try {
      const endpoint = isRegistered ? '/api/login-participant' : '/api/register-participant';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantName: mobileName.trim(), pin: mobilePin.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setAppState(data.state);
        }
        localStorage.setItem('mobile_user_name', mobileName.trim());
        localStorage.setItem('mobile_user_pin', mobilePin.trim());
        setIsMobileLoggedIn(true);
        setMobileMessage({ text: isRegistered ? 'Acesso liberado!' : 'Cadastro realizado com sucesso!', type: 'success' });
        setTimeout(() => setMobileMessage(null), 3000);
      } else {
        const errData = await res.json();
        setMobileMessage({ text: errData.error || 'Erro ao entrar.', type: 'error' });
      }
    } catch (err) {
      console.error('Erro de conexão ao autenticar:', err);
      setMobileMessage({ text: 'Erro de conexão com o servidor.', type: 'error' });
    }
  };

  const handleMobileLogout = () => {
    localStorage.removeItem('mobile_user_name');
    localStorage.removeItem('mobile_user_pin');
    setMobileName('');
    setMobilePin('');
    setMobileConfirmPin('');
    setMobileStep('select_name');
    setIsMobileLoggedIn(false);
  };

  // Admin: Set match score / Resolve Match (Grades guesses automatically)
  const resolveMatch = async () => {
    if (!adminSelectedMatch) return;
    try {
      const hScore = adminHomeScore !== '' ? parseInt(adminHomeScore) : null;
      const aScore = adminAwayScore !== '' ? parseInt(adminAwayScore) : null;
      
      const res = await fetch('/api/admin/match-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: adminSelectedMatch,
          homeScore: hScore,
          awayScore: aScore,
          status: adminMatchStatus
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        setAdminSelectedMatch(null);
        setAdminHomeScore('');
        setAdminAwayScore('');
      }
    } catch (err) {
      console.error('Erro ao resolver partida: ', err);
    }
  };

  // Admin: Add a custom match
  const addMatch = async () => {
    if (!newHomeTeam || !newAwayTeam) return;
    try {
      const res = await fetch('/api/admin/add-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeam: newHomeTeam,
          awayTeam: newAwayTeam,
          homeFlag: newHomeFlag,
          awayFlag: newAwayFlag
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        setNewHomeTeam('');
        setNewAwayTeam('');
      }
    } catch (err) {
      console.error('Erro ao adicionar partida: ', err);
    }
  };

  // Admin: Sync with real copa matches
  const syncRealMatches = async () => {
    setIsSyncingMatches(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/admin/sync-real-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        setSyncFeedback({
          text: data.isFallback 
            ? `Sincronizado via calendário oficial (7 partidas carregadas!)`
            : `Sincronizado em tempo real com a Copa do Mundo 2026 (${data.count} partidas!)`
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setSyncFeedback({
          text: errData.error || 'Erro na resposta do servidor ao sincronizar',
          isError: true
        });
      }
    } catch (err) {
      console.error('Erro de conexão ao sincronizar jogos: ', err);
      setSyncFeedback({
        text: 'Erro de conexão/rede com o servidor',
        isError: true
      });
    } finally {
      setIsSyncingMatches(false);
      // Auto clear feedback after 8 seconds
      setTimeout(() => setSyncFeedback(null), 8000);
    }
  };

  // Admin: Trigger manual database backup
  const triggerBackup = async () => {
    if (!appState) return;
    setIsBackingUp(true);
    setBackupFeedback(null);
    try {
      // 1. Call server to save server-side backup
      const res = await fetch('/api/admin/backup-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      let serverFileName = 'backup.json';
      if (res.ok) {
        const data = await res.json();
        serverFileName = data.filename;
      }

      // 2. Trigger browser download of the current state
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
      const downloadFileName = `backup_bolao_${timestamp}.json`;

      const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = downloadFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupFeedback({
        text: `Backup criado e baixado com sucesso: ${downloadFileName} (Jogos: ${appState.matches?.length || 0}, Palpites: ${appState.guesses?.length || 0})`
      });
    } catch (err) {
      console.error('Erro de conexão ao realizar backup: ', err);
      setBackupFeedback({
        text: 'Erro de conexão com o servidor ao realizar backup',
        isError: true
      });
    } finally {
      setIsBackingUp(false);
      setTimeout(() => setBackupFeedback(null), 10000);
    }
  };

  // Admin: Trigger database restore from the latest backup
  const triggerRestore = async () => {
    const confirmRestore = window.confirm(
      "ATENÇÃO: Você tem certeza que deseja restaurar o banco de dados para a última cópia de segurança (backup_latest.json)? " +
      "Isso irá sobrescrever todas as modificações, palpites e pontos atuais no banco de dados com a versão salva!"
    );
    if (!confirmRestore) return;

    setIsRestoring(true);
    setBackupFeedback(null);
    try {
      const res = await fetch('/api/admin/restore-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: 'backup_latest.json' })
      });
      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        setBackupFeedback({
          text: `Banco de dados restaurado com sucesso a partir de ${data.filename}!`
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        setBackupFeedback({
          text: errData.error || 'Erro ao restaurar o banco de dados no servidor',
          isError: true
        });
      }
    } catch (err) {
      console.error('Erro de conexão ao restaurar banco de dados: ', err);
      setBackupFeedback({
        text: 'Erro de conexão com o servidor ao restaurar banco de dados',
        isError: true
      });
    } finally {
      setIsRestoring(false);
      setTimeout(() => setBackupFeedback(null), 10000);
    }
  };

  // Admin: Handle backup file upload and restore
  const handleBackupUpload = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const rawContent = event.target?.result as string;
        const json = JSON.parse(rawContent);

        if (!json.matches || !json.participants || !json.guesses) {
          alert("Erro: O arquivo de backup selecionado não contém uma estrutura de estado válida.");
          return;
        }

        const confirmRestore = window.confirm(
          `ATENÇÃO: Você tem certeza de que deseja restaurar o banco de dados usando o arquivo "${file.name}"? ` +
          "Esta ação irá sobrescrever o banco de dados atual com a versão do arquivo!"
        );
        if (!confirmRestore) return;

        setIsRestoring(true);
        setBackupFeedback(null);

        const res = await fetch('/api/admin/restore-db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: json })
        });

        if (res.ok) {
          const data = await res.json();
          setAppState(data.state);
          setBackupFeedback({
            text: `Banco de dados restaurado com sucesso a partir de seu arquivo local: ${file.name}!`
          });
        } else {
          const errData = await res.json().catch(() => ({}));
          setBackupFeedback({
            text: errData.error || 'Erro ao restaurar o banco de dados via arquivo',
            isError: true
          });
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao decodificar arquivo de backup JSON: " + err);
      } finally {
        setIsRestoring(false);
        // Clear input value so same file can be selected again
        e.target.value = '';
        setTimeout(() => setBackupFeedback(null), 10000);
      }
    };
    reader.readAsText(file);
  };

  // Admin: Save custom config (logo, prize, instruction text, and point weights)
  const saveConfig = async () => {
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customLogoUrl: configLogoUrl,
          customLogoText: configLogoText,
          prizeName: configPrizeName,
          prizeImage: configPrizeImage,
          prizeDescription: configPrizeDescription,
          prize2Name: configPrize2Name,
          prize2Image: configPrize2Image,
          prize2Description: configPrize2Description,
          prize3Name: configPrize3Name,
          prize3Image: configPrize3Image,
          prize3Description: configPrize3Description,
          participateTitle: configParticipateTitle,
          participateInstruction: configParticipateInstruction,
          tvLiveLabel: configTvLiveLabel,
          championshipName: configChampionshipName,
          show18Banner: configShow18Banner,
          rules: {
            exactScore: ruleExactScore,
            winnerAndDiff: ruleWinnerAndDiff,
            winnerOnly: ruleWinnerOnly,
            oneTeamScore: ruleOneTeamScore,
            completeWrong: 0
          }
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        alert('Configurações de Layout, Prêmio e Regras salvas com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar configurações do painel:', err);
    }
  };

  // Admin: Force reload state from Firestore database
  const reloadDatabase = async () => {
    try {
      const res = await fetch('/api/admin/reload-db', {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        alert('Dados atualizados com sucesso do banco de dados (Firebase)!');
      } else {
        alert('Falha ao recarregar dados do banco de dados.');
      }
    } catch (err) {
      console.error('Erro ao recarregar banco de dados:', err);
      alert('Erro de rede ao conectar com o banco de dados.');
    }
  };

  // Admin: Reset State
  const resetDemoState = async () => {
    if (!window.confirm('Tem certeza que deseja redefinir o estado para o padrão? Isso limpará palpites customizados.')) return;
    try {
      const res = await fetch('/api/admin/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
      }
    } catch (err) {
      console.error('Erro ao resetar: ', err);
    }
  };

  // Admin: Clear all guesses and participants
  const clearAllGuesses = async () => {
    if (!window.confirm('Tem certeza que deseja excluir TODOS os participantes e palpites do banco de dados? Isso é definitivo!')) return;
    try {
      const res = await fetch('/api/admin/clear-guesses', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAppState(data.state);
        alert('Todos os palpites e participantes foram excluídos com sucesso!');
      } else {
        alert('Falha ao excluir palpites.');
      }
    } catch (err) {
      console.error('Erro ao excluir palpites: ', err);
      alert('Erro de conexão ao excluir palpites.');
    }
  };

  const handleAdminLogin = (password: string) => {
    const cleanPass = password.trim();
    if (cleanPass === 'visualcopa2026') {
      setIsAdmin(true);
      localStorage.setItem('is_admin', 'true');
      setPasswordModalOpen(false);
      setAdminPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('Senha incorreta! Digite a senha administrativa correta.');
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('is_admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100">
        <div className="absolute inset-0 bg-radial from-emerald-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="relative text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-display text-xl text-emerald-400 font-bold tracking-widest uppercase">
            AQUECENDO OS PALPITES...
          </p>
          <p className="text-slate-400 text-sm mt-1">Carregando painel visual da Copa 2026</p>
        </div>
      </div>
    );
  }

  // Show all scheduled matches in mobile. The backend enforces the timing cutoff
  // and will reject palpites submitted after match start time.
  // This avoids matches disappearing from the list due to minor clock differences.
  const nextMatches = appState?.matches.filter(m => m.status === 'scheduled') || [];
  const finishedMatches = appState?.matches.filter(m => m.status === 'finished') || [];
  const currentNextMatch = nextMatches[0] || appState?.matches[0];

  // ==================== TV DISPLAY VIEW ====================
  if (view === 'tv') {
    return (
      <div className="h-screen max-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden select-none">
        
        {/* Dynamic Stadium & Spotlight Background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#0f5a34_0%,#020617_70%)] pointer-events-none" />
        
        {/* Looping Light Rays */}
        <div className="absolute top-0 inset-x-0 h-96 flex justify-around opacity-20 pointer-events-none">
          <motion.div 
            animate={{ rotate: [30, -30, 30] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 hover:w-2 h-full bg-linear-to-b from-emerald-400 to-transparent origin-top blur-sm"
          />
          <motion.div 
            animate={{ rotate: [-20, 20, -20] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-full bg-linear-to-b from-yellow-400 to-transparent origin-top blur-sm"
          />
          <motion.div 
            animate={{ rotate: [45, -45, 45] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="w-1 h-full bg-linear-to-b from-green-300 to-transparent origin-top blur-sm"
          />
        </div>

        {/* HEADER BAR */}
        <header className="relative z-10 border-b border-emerald-800/40 bg-slate-900/60 backdrop-blur-md px-8 py-3 flex items-center justify-between min-h-[75px]">
          {/* Left indicator */}
          <div className="flex items-center gap-4 z-10">
            <div className="relative">
              <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
              <div className="bg-emerald-600 px-3.5 py-1.5 rounded-lg text-xs font-black font-mono tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                {appState?.tvLiveLabel || "TV LIVE"}
              </div>
            </div>
            <p className="text-xs text-slate-400 font-extrabold tracking-widest uppercase">
              {appState?.championshipName || "COPA DO MUNDO DE 2026"}
            </p>
          </div>
          
          {/* ABSOLUTE CENTERED MULTI-SCREEN CHAMPIONSHIP LOGO BLOCK */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 z-20">
            {appState?.customLogoUrl ? (
              <img 
                src={appState.customLogoUrl} 
                alt="Logo" 
                className="h-10 md:h-12 w-auto max-w-[200px] rounded-lg object-contain border border-emerald-500/20 shadow-2xl transition duration-300 hover:scale-[1.03]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
            )}
            <div className="flex flex-col justify-center">
              <h1 className="font-display font-black text-xl md:text-2xl tracking-tighter text-linear-to-r from-emerald-400 via-yellow-400 to-green-400 bg-clip-text text-transparent uppercase leading-none pb-0.5">
                {appState?.customLogoText || "O SUPER PALPITEIRO"}
              </h1>
            </div>
          </div>

          {/* Quick view selectors & admin controls */}
          <div className="flex items-center gap-4 z-10">
            <div className="bg-slate-800/80 px-4 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-300 font-mono font-bold">
                {appState?.participants.length || 0} PARTICIPANTES
              </span>
            </div>

            <button 
              onClick={toggleFullscreen}
              className="bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider cursor-pointer"
              title="Alternar Tela Cheia"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              {isFullscreen ? "Sair" : "Tela Cheia"}
            </button>

            <button 
              onClick={() => {
                if (isAdmin) {
                  setAdminOpen(!adminOpen);
                } else {
                  setPasswordModalOpen(true);
                }
              }}
              className="bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
            >
              <Settings className="w-4 h-4 animate-spin-slow" />
              {isAdmin ? "CONGRESSO DO PALPITE" : "ADMIN"}
            </button>
          </div>
        </header>

        {/* MAIN TV SCREEN GRID */}
        <main className="relative z-10 flex-1 grid grid-cols-12 gap-4 px-6 py-4 overflow-hidden min-h-0">
          
          {/* COLUMN 1: RANKS & CLASSIFICAÇÃO (4 cols) */}
          <div className="col-span-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-emerald-950/40 p-4 flex flex-col h-full overflow-hidden shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-yellow-500 to-green-500" />
            
            <div className="flex items-center justify-between mb-3 mt-1">
              <h2 className="font-display text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-yellow-400" />
                RANKING ATUALIZADO
                {appState && appState.participants.length > 4 && (
                  <span className="text-xs text-slate-400 font-mono lowercase font-normal ml-1">
                    (pág. {Math.min(rankingPage + 1, Math.ceil(appState.participants.length / 4))}/{Math.ceil(appState.participants.length / 4)})
                  </span>
                )}
              </h2>
              <span className="text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded bg-emerald-950/20 uppercase tracking-wider">
                PONTUAÇÃO
              </span>
            </div>

            {/* Rank Items list scrolling */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
              {appState?.participants.length === 0 ? (
                <div className="text-center py-10">
                  <Smartphone className="w-12 h-12 text-slate-600 mx-auto mb-2 animate-bounce" />
                  <p className="text-slate-400 font-semibold">Sem participantes ainda!</p>
                  <p className="text-xs text-slate-500 mt-1">Escaneie o QR Code central para entrar na lista!</p>
                </div>
              ) : (
                (() => {
                  const itemsPerPage = 4;
                  const totalParticipants = appState?.participants || [];
                  const totalPages = Math.ceil(totalParticipants.length / itemsPerPage);
                  const currentPage = rankingPage >= totalPages ? 0 : rankingPage;
                  const startIndex = currentPage * itemsPerPage;
                  const slice = totalParticipants.slice(startIndex, startIndex + itemsPerPage);
                  
                  return slice.map((p, sliceIndex) => {
                    const globalIndex = startIndex + sliceIndex;
                    const placeColors = [
                      'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/20', // gold
                      'bg-slate-300 text-slate-950 shadow-lg shadow-slate-300/20', // silver
                      'bg-amber-600 text-white shadow-lg shadow-amber-600/20', // bronze
                    ];
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: sliceIndex * 0.08 }}
                        className="bg-slate-950/50 hover:bg-slate-900/80 px-3 py-2.5 rounded-lg border border-slate-900 flex items-center justify-between transition-colors duration-150"
                      >
                        <div className="flex items-center gap-3">
                          {/* Rank Badge */}
                          <div className={`w-9 h-9 rounded-md font-display font-black text-base flex items-center justify-center shrink-0 ${globalIndex < 3 ? placeColors[globalIndex] : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                            {globalIndex + 1}º
                          </div>
                          {/* Name & Stats */}
                          <div>
                            <div className="font-extrabold text-slate-100 flex items-center gap-1.5 text-base">
                              <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: p.avatarColor }} />
                              {p.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400 font-mono mt-0.5">
                              {(() => {
                                const details = [];
                                if (p.exactScores > 0) {
                                  details.push(`${p.exactScores} Placar Cheio (${appState?.rules?.exactScore ?? 10} pts)`);
                                }
                                if (p.winnerAndDiff !== undefined || p.winnerOnly !== undefined) {
                                  if (p.winnerAndDiff && p.winnerAndDiff > 0) {
                                    details.push(`${p.winnerAndDiff} Vencedor + Saldo (${appState?.rules?.winnerAndDiff ?? 7} pts)`);
                                  }
                                  if (p.winnerOnly && p.winnerOnly > 0) {
                                    details.push(`${p.winnerOnly} Vencedor apenas (${appState?.rules?.winnerOnly ?? 5} pts)`);
                                  }
                                } else if (p.correctWinners > 0) {
                                  details.push(`${p.correctWinners} Vencedores (${appState?.rules?.winnerOnly ?? 5} pts)`);
                                }
                                if (p.oneTeamScore && p.oneTeamScore > 0) {
                                  details.push(`${p.oneTeamScore} Gol de 1 time (${appState?.rules?.oneTeamScore ?? 2} pts)`);
                                }
                                if (details.length === 0) {
                                  return <span>Nenhum acerto</span>;
                                }
                                return details.map((detail, idx) => (
                                  <span key={idx} className="flex items-center">
                                    {idx > 0 && <span className="text-slate-650 mr-1.5">•</span>}
                                    {detail}
                                  </span>
                                ));
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Points Glow representation */}
                        <div className="text-right pl-2 shrink-0">
                          <div className="font-display font-black text-xl text-emerald-400 tracking-tight">
                            {p.points} <span className="text-xs text-slate-450 font-normal">pts</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  });
                })()
              )}
            </div>

          </div>

          {/* COLUMN 2: THE GRAND QR CODE CENTERPIECE (4 cols) */}
          <div className="col-span-4 flex flex-col justify-between items-center h-full gap-3 py-1 relative">
            
            {/* Top info tag */}
            <div className="bg-slate-900/80 border border-emerald-500/30 px-6 py-2.5 rounded-2xl backdrop-blur-md text-center max-w-md w-full animate-pulse flex justify-center items-center">
              <p className="text-lg font-display font-black tracking-widest uppercase text-yellow-400 whitespace-nowrap">
                ⭐ ENVIE SEU PALPITE AGORA! ⭐
              </p>
            </div>

            {/* EXPANDABLE/DYNAMIC PRIZE BANNER FOR WINNERS (1st, 2nd, 3rd) */}
            <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden shadow-2xl transition duration-300 hover:scale-102">
              {/* Prize Rank tabs selector */}
              <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-850 z-10">
                <button
                  onClick={() => setActivePrizeTab('1st')}
                  className={`text-[8.5px] font-black uppercase py-0.5 px-1 rounded transition cursor-pointer ${activePrizeTab === '1st' ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  🥇 1º Lugar
                </button>
                <button
                  onClick={() => setActivePrizeTab('2nd')}
                  className={`text-[8.5px] font-black uppercase py-0.5 px-1 rounded transition cursor-pointer ${activePrizeTab === '2nd' ? 'bg-slate-300 text-slate-950 font-black' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  🥈 2º Lugar
                </button>
                <button
                  onClick={() => setActivePrizeTab('3rd')}
                  className={`text-[8.5px] font-black uppercase py-0.5 px-1 rounded transition cursor-pointer ${activePrizeTab === '3rd' ? 'bg-amber-700 text-white font-black' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  🥉 3º Lugar
                </button>
              </div>

              {/* Dynamic decorative neon edge lights / backgrounds depending on rank */}
              {activePrizeTab === '1st' ? (
                <>
                  <div className="absolute top-0 left-0 w-12 h-0.5 bg-yellow-400 animate-pulse" />
                  <div className="absolute top-0 left-0 w-0.5 h-12 bg-yellow-400 animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-12 h-0.5 bg-emerald-400 animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-0.5 h-12 bg-emerald-400 animate-pulse" />
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-yellow-400/10 rounded-full blur-xl animate-pulse" />
                </>
              ) : activePrizeTab === '2nd' ? (
                <>
                  <div className="absolute top-0 left-0 w-12 h-0.5 bg-slate-300 animate-pulse" />
                  <div className="absolute top-0 left-0 w-0.5 h-12 bg-slate-300 animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-12 h-0.5 bg-slate-400 animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-0.5 h-12 bg-slate-400 animate-pulse" />
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-slate-300/10 rounded-full blur-xl animate-pulse" />
                </>
              ) : (
                <>
                  <div className="absolute top-0 left-0 w-12 h-0.5 bg-amber-650 animate-pulse" />
                  <div className="absolute top-0 left-0 w-0.5 h-12 bg-amber-650 animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-12 h-0.5 bg-amber-700 animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-0.5 h-12 bg-amber-700 animate-pulse" />
                  <div className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-600/15 rounded-full blur-xl animate-pulse" />
                </>
              )}

              {/* Main Content Area */}
              <div className="flex items-center gap-3 z-10">
                {/* Prize Icon/Image block */}
                <div className={`p-2 rounded-xl shadow-xl relative shrink-0 flex items-center justify-center border ${
                  activePrizeTab === '1st' ? 'bg-gradient-to-br from-yellow-450 via-amber-500 to-yellow-600 border-yellow-300/40' :
                  activePrizeTab === '2nd' ? 'bg-gradient-to-br from-slate-400 via-slate-500 to-slate-650 border-slate-300/40' :
                  'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 border-amber-500/40'
                }`}>
                  {(() => {
                    const imgUrl = activePrizeTab === '1st' ? appState?.prizeImage : activePrizeTab === '2nd' ? appState?.prize2Image : appState?.prize3Image;
                    if (imgUrl) {
                      return (
                        <img 
                          src={imgUrl} 
                          alt="Prêmio" 
                          className="w-8 h-8 object-contain rounded"
                          referrerPolicy="no-referrer"
                        />
                      );
                    }
                    return <Gift className={`w-5.5 h-5.5 text-slate-950 ${activePrizeTab === '1st' ? 'animate-bounce' : ''}`} />;
                  })()}
                  <div className="absolute -top-1.5 -right-1.5 bg-slate-950 border border-slate-800 rounded-full p-0.5 shadow-md">
                    <Sparkles className={`w-2.5 h-2.5 ${
                      activePrizeTab === '1st' ? 'text-yellow-400' :
                      activePrizeTab === '2nd' ? 'text-slate-350' :
                      'text-amber-500'
                    } animate-pulse`} />
                  </div>
                </div>

                {/* Prize text content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className={`text-[8px] font-mono font-black tracking-widest uppercase px-1.5 py-0.5 rounded border ${
                      activePrizeTab === '1st' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
                      activePrizeTab === '2nd' ? 'text-slate-300 bg-slate-300/10 border-slate-300/30' :
                      'text-amber-500 bg-amber-500/10 border-amber-500/30'
                    }`}>
                      {activePrizeTab === '1st' ? '🏆 PRÊMIO DO CAMPEÃO 🏆' :
                       activePrizeTab === '2nd' ? '🥈 PRÊMIO DO 2º LUGAR 🥈' :
                       '🥉 PRÊMIO DO 3º LUGAR 🥉'}
                    </span>
                  </div>
                  <h3 className={`font-display font-black text-[13px] uppercase tracking-tight mt-1 transition duration-150 leading-tight ${
                    activePrizeTab === '1st' ? 'text-yellow-400' :
                    activePrizeTab === '2nd' ? 'text-slate-100' :
                    'text-amber-500'
                  }`}>
                    {activePrizeTab === '1st' ? (appState?.prizeName || "SMART TV 55\" OLED 4K + COLO COLADO") :
                     activePrizeTab === '2nd' ? (appState?.prize2Name || "CAMISA OFICIAL DA SELEÇÃO") :
                     (appState?.prize3Name || "KIT TORCEDOR EXCLUSIVO")}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-semibold leading-snug mt-0.5 line-clamp-2">
                    {activePrizeTab === '1st' ? (appState?.prizeDescription || "O melhor de todos os palpiteiros receberá um Smart TV de última geração com entrega garantida!") :
                     activePrizeTab === '2nd' ? (appState?.prize2Description || "O segundo colocado ganhará uma camisa oficial da Seleção Brasileira autografada!") :
                     (appState?.prize3Description || "O terceiro colocado levará um kit torcedor com copo térmico e boné oficial!")}
                  </p>
                </div>
              </div>
            </div>

            {/* THE GIANT QR CODE WITH NEON SPORTS BORDER */}
            <div className="relative group flex items-center justify-center p-3.5 bg-slate-900/40 backdrop-blur-md rounded-2xl border border-emerald-900/30 shadow-2xl">
              
              {/* Spinning/Animating Laser Scan Glow Behind Code */}
              <div className="absolute inset-0 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.12),transparent_60%)]" />
                <motion.div
                  animate={{ y: ['-10%', '110%', '-10%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="w-full h-0.5 bg-linear-to-r from-transparent via-emerald-400 to-transparent absolute shadow-sm"
                />
              </div>

              {/* Glowing outer physical lines/anchors */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400 rounded-tl-sm" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400 rounded-tr-sm" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400 rounded-bl-sm" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400 rounded-br-sm" />

              <div className="bg-white p-3 rounded-xl relative shadow-lg">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Scan to submit guess" 
                    className="w-44 h-44 relative z-10"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-slate-900 font-bold text-xs bg-slate-100">
                    Gerando QR...
                  </div>
                )}
                <div className="absolute inset-0 bg-emerald-500/10 rounded-xl scale-102 blur-sm pointer-events-none" />
              </div>
            </div>

            {/* Scan prompt instructions text */}
            <div className="text-center max-w-sm">
              <div className="inline-flex items-center gap-1 bg-emerald-500/20 border border-emerald-400/20 text-emerald-300 font-display font-black text-xs px-3.5 py-1 rounded-full uppercase tracking-wider mb-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                {appState?.participateTitle || "LEIA O QR CODE COM O CELULAR"}
              </div>
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                {appState?.participateInstruction || "Preencha seu nome, selecione seu time e envie seu palpite para pontuar. O ranking atualiza na TV na hora!"}
              </p>
            </div>
          </div>

          {/* COLUMN 3: NEXT MATCHES / LIVE MATCH SIMULATOR (4 cols) */}
          <div className="col-span-4 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-emerald-950/40 p-4 flex flex-col h-full overflow-hidden shadow-2xl relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-yellow-500 to-green-500" />
            
            <div className="flex items-center justify-between mb-3 mt-1">
              <h2 className="font-display text-base font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400 animate-pulse" />
                CONJUNTURA DE JOGOS
              </h2>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                COPA 2026
              </span>
            </div>

            {/* Sub-tabs bar matching user intent */}
            <div className="grid grid-cols-3 gap-1 mb-2 bg-slate-950 p-1 rounded-xl border border-slate-850">
              <button 
                onClick={() => { setMatchTab('results'); setRotationProgress(0); }}
                className={`text-[9.5px] font-black uppercase tracking-wider py-1.5 px-1 rounded-lg text-center transition-all duration-150 cursor-pointer ${matchTab === 'results' ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                ⏪ Anteriores
              </button>
              <button 
                onClick={() => { setMatchTab('upcoming'); setRotationProgress(0); }}
                className={`text-[9.5px] font-black uppercase tracking-wider py-1.5 px-1 rounded-lg text-center transition-all duration-150 cursor-pointer ${matchTab === 'upcoming' ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                ⚽ Atuais
              </button>
              <button 
                onClick={() => { setMatchTab('brazil'); setRotationProgress(0); }}
                className={`text-[9.5px] font-black uppercase tracking-wider py-1.5 px-1 rounded-lg text-center transition-all duration-150 cursor-pointer ${matchTab === 'brazil' ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400' : 'text-slate-400 hover:text-slate-200 border border-transparent'}`}
              >
                ⏩ Próximos
              </button>
            </div>

            {/* Rotation Progress Bar Indicator */}
            <div className="w-full h-1 bg-slate-950 rounded-full mb-3 overflow-hidden relative">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-500 via-yellow-500 to-green-500"
                style={{ width: `${rotationProgress}%` }}
                animate={{ width: `${rotationProgress}%` }}
                transition={{ duration: 0.1, ease: 'linear' }}
              />
            </div>

            {/* List of matches */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-800 font-bold">
              {filteredMatches.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                  <div className="text-xl mb-1.5 select-none opacity-40">🏟️</div>
                  <h4 className="text-xs text-slate-350 uppercase tracking-wider">Sem Partidas Encontradas</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mt-1 max-w-[200px]">
                    {matchTab === 'results' 
                      ? 'Nenhuma partida agendada ou realizada no dia de ontem.'
                      : matchTab === 'upcoming'
                      ? 'Nenhuma partida agendada ou realizada no dia de hoje.'
                      : 'Nenhuma partida agendada para o dia de amanhã.'}
                  </p>
                </div>
              ) : (
                filteredMatches.map((match) => {
                  const isFinished = match.status === 'finished';
                  const isLive = match.status === 'live';
                  const totalGuessesForMatch = appState?.guesses.filter(g => g.matchId === match.id).length || 0;
                  
                  return (
                    <div
                      key={match.id}
                      className={`p-3 rounded-lg border relative transition-all duration-150 ${isLive ? 'bg-gradient-to-r from-slate-900 to-red-950/40 border-red-500/55 shadow-md shadow-red-500/5' : isFinished ? 'bg-slate-950/30 border-slate-900' : 'bg-slate-950/60 border-slate-900/60'}`}
                    >
                    {/* Badge top status */}
                    <div className="flex items-center justify-between text-[10px] mb-1.5 font-mono font-bold">
                      <span className="text-slate-400">
                        {new Date(match.dateTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })} às {new Date(match.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} • 2026
                      </span>
                      {isLive ? (
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-extrabold uppercase animate-pulse flex items-center gap-1 text-[9px]">
                          <span className="w-1 h-1 bg-white rounded-full animate-ping" /> EM ANDAMENTO
                        </span>
                      ) : isFinished ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-[9px]">
                          FINALIZADO
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30 font-extrabold uppercase tracking-wider text-[9px]">
                          AGUARDANDO
                        </span>
                      )}
                    </div>

                    {/* Match Scoreboard display */}
                    <div className="flex items-center justify-between py-1 bg-slate-950/50 px-2 rounded-md gap-1 border border-slate-900/50">
                      {/* Home */}
                      <div className="flex items-center gap-1.5 w-5/12">
                        {renderFlag(match.homeFlag, match.homeTeam)}
                        <span className="font-extrabold text-slate-100 text-sm md:text-base truncate tracking-tight">{match.homeTeam}</span>
                      </div>

                      {/* Actual Score or Versus Text */}
                      <div className="w-2/12 flex justify-center shrink-0">
                        {isFinished ? (
                          <div className="bg-emerald-950 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-black text-xs text-yellow-400 shadow-sm">
                            {match.homeScore}x{match.awayScore}
                          </div>
                        ) : isLive ? (
                          <div className="bg-red-950 border border-red-500/30 px-1.5 py-0.5 rounded font-mono font-black text-xs text-red-400 flex items-center gap-0.5 animate-pulse shadow-sm">
                            {match.homeScore ?? 0}x{match.awayScore ?? 0}
                          </div>
                        ) : (
                          <div className="bg-slate-900 border border-slate-850 text-[9px] px-1.5 py-0.5 rounded text-slate-400 uppercase font-bold tracking-widest">
                            VS
                          </div>
                        )}
                      </div>

                      {/* Away */}
                      <div className="flex items-center justify-end gap-1.5 w-5/12 text-right">
                        <span className="font-extrabold text-slate-100 text-sm md:text-base truncate tracking-tight">{match.awayTeam}</span>
                        {renderFlag(match.awayFlag, match.awayTeam)}
                      </div>
                    </div>

                    {/* Bottom guess counter / stats preview */}
                    <div className="mt-2 pt-1.5 border-t border-slate-900/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        <span><strong>{totalGuessesForMatch}</strong> palpites</span>
                      </span>

                      {!isFinished && (
                        <span className="text-emerald-400 font-extrabold tracking-wider bg-emerald-950/60 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[9px]">
                          Palpite Aberto
                        </span>
                      )}
                    </div>
                  </div>
                );
              }))}
            </div>

            {appState?.show18Banner ? (
              <div className="mt-2.5 p-2 bg-red-950/20 border border-red-500/20 rounded-lg flex items-center gap-3 px-3 py-2.5">
                <div className="bg-red-600 text-white font-mono font-extrabold text-[10px] w-6 h-6 rounded-full flex items-center justify-center shrink-0 select-none shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                  +18
                </div>
                <div className="flex-1">
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">
                    PROIBIDO PARA MENORES DE 18 ANOS
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                    Os palpites e apostas deste evento são destinados apenas para maiores de 18 anos. Jogue com responsabilidade.
                  </p>
                </div>
              </div>
            ) : (
              /* Quick TV controller trigger block */
              <div className="mt-2.5 p-2 bg-emerald-950/20 border border-emerald-500/10 rounded-lg flex items-center justify-between gap-1.5 px-3 py-2.5">
                <div className="flex-1">
                  <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                    ESTÁ TESTANDO O FLUXO?
                  </h4>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                    Temos um simulador de resultados no painel de controle para liquidar as partidas instantaneamente!
                  </p>
                </div>
                <button 
                  onClick={() => {
                    if (isAdmin) {
                      setAdminOpen(true);
                    } else {
                      setPasswordModalOpen(true);
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-[9px] px-2 py-1 rounded uppercase cursor-pointer shrink-0"
                >
                  ABRIR
                </button>
              </div>
            )}
          </div>
        </main>

        {/* BOTTOM SCROLLING TICKER LOOP (100% Cazé TV style) */}
        <footer className="relative mt-auto bg-yellow-400 text-slate-950 font-display py-2.5 border-t-2 border-yellow-250 z-10 flex items-center overflow-hidden">
          <div className="flex select-none w-full overflow-hidden pl-4">
            <div className="flex shrink-0 animate-marquee text-sm font-black uppercase tracking-wider items-center gap-16 pr-16">
              <span className="text-slate-900 font-black">🏆 {appState?.customLogoText || "O SUPER PALPITEIRO"} • {appState?.prizeName || "SMART TV OLED"} PRÊMIO PARA O PARCEIRO CAMPEÃO! </span>
              <span className="text-emerald-950 font-black">• ⚽ REGULAMENTO DE PONTOS: PLACAR EXATO = {appState?.rules.exactScore || 10} PTS </span>
              <span className="text-emerald-950 font-black">• VENCEDOR + SALDO DE GOL = {appState?.rules.winnerAndDiff || 7} PTS </span>
              <span className="text-emerald-950 font-black">• VENCEDOR APENAS = {appState?.rules.winnerOnly || 5} PTS </span>
              <span className="text-emerald-950 font-black">• ACERTO DE UM DOS GOLS = {appState?.rules.oneTeamScore || 2} PTS </span>
              <span className="text-red-950 font-black">• ESCANEIE O QR CODE CENTRAL COM SEU CELULAR E ENVIE SEUS PALPITES AGORA! </span>
              <span className="text-slate-900 font-extrabold">• ÚLTIMO PALPITE: {appState?.guesses[appState.guesses.length - 1]?.participantName || "NENHUM"} ACABA DE PALPITAR! DETONE NO RANKING! </span>
            </div>
            <div className="flex shrink-0 animate-marquee text-sm font-black uppercase tracking-wider items-center gap-16 pr-16" aria-hidden="true">
              <span className="text-slate-900 font-black">🏆 {appState?.customLogoText || "O SUPER PALPITEIRO"} • {appState?.prizeName || "SMART TV OLED"} PRÊMIO PARA O PARCEIRO CAMPEÃO! </span>
              <span className="text-emerald-950 font-black">• ⚽ REGULAMENTO DE PONTOS: PLACAR EXATO = {appState?.rules.exactScore || 10} PTS </span>
              <span className="text-emerald-950 font-black">• VENCEDOR + SALDO DE GOL = {appState?.rules.winnerAndDiff || 7} PTS </span>
              <span className="text-emerald-950 font-black">• VENCEDOR APENAS = {appState?.rules.winnerOnly || 5} PTS </span>
              <span className="text-emerald-950 font-black">• ACERTO DE UM DOS GOLS = {appState?.rules.oneTeamScore || 2} PTS </span>
              <span className="text-red-950 font-black">• ESCANEIE O QR CODE CENTRAL COM SEU CELULAR E ENVIE SEUS PALPITES AGORA! </span>
              <span className="text-slate-900 font-extrabold">• ÚLTIMO PALPITE: {appState?.guesses[appState.guesses.length - 1]?.participantName || "NENHUM"} ACABA DE PALPITAR! DETONE NO RANKING! </span>
            </div>
          </div>
        </footer>

        {/* CSS marquee helper rules in style block because HMR/Vite is offline */}
        <style>{`
          @keyframes marquee {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(-100%, 0, 0); }
          }
          .animate-marquee {
            display: flex;
            white-space: nowrap;
            animation: marquee 45s linear infinite;
          }
        `}</style>

        {/* ADMIN WORKSPACE DIALOG (CONGRESSO DO PALPITE) */}
        <AnimatePresence>
          {adminOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
            >
              <motion.div 
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-5xl shadow-3xl text-slate-100 relative max-h-[90vh] overflow-y-auto"
              >
                {/* Header close button */}
                <button 
                  onClick={() => setAdminOpen(false)}
                  className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 p-2 rounded-full cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </button>

                <div className="flex items-center gap-2 mb-6">
                  <Settings className="text-emerald-400 w-6 h-6 animate-spin" />
                  <h3 className="font-display font-black text-xl uppercase tracking-wider text-slate-100">
                    CONGRESSO DO PALPITE: PAINEL DE CONTROLE
                  </h3>
                </div>

                {/* TABS SELECTOR */}
                <div className="flex gap-2 border-b border-slate-800 pb-3 mb-5">
                  <button
                    onClick={() => setAdminTab('config')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                      adminTab === 'config'
                        ? 'bg-emerald-650 text-white shadow-md'
                        : 'bg-slate-950 text-slate-455 hover:bg-slate-900'
                    }`}
                  >
                    🛠️ Configurações Gerais
                  </button>
                  <button
                    onClick={() => {
                      setAdminTab('history');
                      setAdminSearchQuery('');
                    }}
                    className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition ${
                      adminTab === 'history'
                        ? 'bg-emerald-650 text-white shadow-md'
                        : 'bg-slate-950 text-slate-455 hover:bg-slate-900'
                    }`}
                  >
                    📊 Relatório de Palpites
                  </button>
                </div>

                {adminTab === 'history' ? (
                  <div className="space-y-4">
                    {/* Participant filter dropdown */}
                    <div className="flex items-center gap-2 bg-slate-950 p-3.5 rounded-2xl border border-slate-850">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-slate-450 uppercase mb-1.5">Filtrar por Participante</label>
                        <select
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 font-semibold cursor-pointer"
                        >
                          <option value="">👥 Todos os participantes</option>
                          {(() => {
                            // Build unique participant list from guesses + registered participants
                            const namesFromGuesses = [...new Set((appState?.guesses || []).map(g => g.participantName))].sort();
                            const namesFromParticipants = (appState?.participants || []).map(p => p.name);
                            const allNames = [...new Set([...namesFromGuesses, ...namesFromParticipants])].sort();
                            return allNames.map(name => (
                              <option key={name} value={name} className="bg-slate-950 text-slate-100">
                                {name}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>
                      {adminSearchQuery && (
                        <button
                          onClick={() => setAdminSearchQuery('')}
                          className="mt-5 p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                          title="Limpar filtro"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Guesses list/table */}
                    <div className="bg-slate-950 rounded-2xl border border-slate-850 p-4 overflow-hidden">
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-emerald-450 mb-4 flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-emerald-400" />
                        Histórico Geral de Palpites
                      </h4>

                      <div className="overflow-x-auto max-h-[50vh] scrollbar-thin scrollbar-thumb-slate-800">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-450 uppercase text-[10px] tracking-wider font-bold">
                              <th className="py-2.5 px-3">Usuário</th>
                              <th className="py-2.5 px-3">Partida</th>
                              <th className="py-2.5 px-3 text-center">Palpite</th>
                              <th className="py-2.5 px-3 text-center">Resultado</th>
                              <th className="py-2.5 px-3 text-center">Pontos</th>
                              <th className="py-2.5 px-3 text-right">Data/Hora</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const allGuesses = appState?.guesses || [];
                              const filteredGuesses = allGuesses.filter(g => 
                                !adminSearchQuery.trim() || 
                                g.participantName.toLowerCase().includes(adminSearchQuery.toLowerCase().trim())
                              );

                              if (filteredGuesses.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={6} className="py-10 text-center text-slate-500 font-mono">
                                      Nenhum palpite encontrado.
                                    </td>
                                  </tr>
                                );
                              }

                              const sortedGuesses = [...filteredGuesses].sort((a, b) => 
                                new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                              );

                              return sortedGuesses.map(g => {
                                const match = appState?.matches.find(m => m.id === g.matchId);
                                const isMatchFinished = match?.status === 'finished';
                                return (
                                  <tr key={g.id} className="border-b border-slate-900/60 hover:bg-slate-900/40 transition">
                                    <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: appState?.participants.find(p => p.name.toLowerCase() === g.participantName.toLowerCase())?.avatarColor || '#fff' }} />
                                      {g.participantName}
                                    </td>
                                    <td className="py-3 px-3 text-slate-350">
                                      <div className="flex items-center gap-1.5">
                                        {match ? (
                                          <>
                                            {renderFlag(match.homeFlag, match.homeTeam)}
                                            <span>{match.homeTeam}</span>
                                            <span className="text-slate-600 font-normal">vs</span>
                                            <span>{match.awayTeam}</span>
                                            {renderFlag(match.awayFlag, match.awayTeam)}
                                          </>
                                        ) : (
                                          <span className="text-red-400">Partida não encontrada ({g.matchId})</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono font-black text-slate-100">
                                      {g.homeScore} x {g.awayScore}
                                    </td>
                                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                                      {match && match.homeScore !== null && match.awayScore !== null ? (
                                        <span className="font-bold text-emerald-450">
                                          {match.homeScore} x {match.awayScore}
                                        </span>
                                      ) : (
                                        <span className="text-slate-600">Não iniciado</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                      {isMatchFinished && g.pointsEarned !== undefined && g.pointsEarned !== null ? (
                                        <span className="bg-emerald-950/60 border border-emerald-800/45 px-2 py-0.5 rounded text-emerald-400 font-mono font-black text-[10px]">
                                          +{g.pointsEarned} pts
                                        </span>
                                      ) : (
                                        <span className="text-slate-600 font-mono">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3 text-right text-slate-500 font-mono text-[10px]">
                                      {new Date(g.submittedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left inner Col: Grading / Resolving matches + Instructions */}
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 shadow-inner">
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" />
                        Simular Resultado (Dar Notas)
                      </h4>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">PARTIDA</label>
                          <select 
                            value={adminSelectedMatch || ''} 
                            onChange={(e) => {
                              const matchId = e.target.value;
                              setAdminSelectedMatch(matchId);
                              const match = appState?.matches.find(m => m.id === matchId);
                              if (match) {
                                setAdminHomeScore(match.homeScore !== null ? String(match.homeScore) : '');
                                setAdminAwayScore(match.awayScore !== null ? String(match.awayScore) : '');
                                setAdminMatchStatus(match.status);
                              }
                            }}
                            className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 font-semibold"
                          >
                            <option value="">Selecione uma partida...</option>
                            {appState?.matches.map(m => (
                              <option key={m.id} value={m.id}>
                                {m.homeFlag} {m.homeTeam} x {m.awayTeam} {m.awayFlag} [{m.status === 'finished' ? 'Finalizado' : 'Aberto'}]
                              </option>
                            ))}
                          </select>
                        </div>

                        {adminSelectedMatch && (
                          <div className="space-y-4 pt-2 border-t border-slate-900/60">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Gols {appState?.matches.find(m => m.id === adminSelectedMatch)?.homeTeam}</label>
                                <input 
                                  type="number" 
                                  value={adminHomeScore}
                                  onChange={(e) => setAdminHomeScore(e.target.value)}
                                  placeholder="0"
                                  className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-center font-black text-base focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Gols {appState?.matches.find(m => m.id === adminSelectedMatch)?.awayTeam}</label>
                                <input 
                                  type="number" 
                                  value={adminAwayScore}
                                  onChange={(e) => setAdminAwayScore(e.target.value)}
                                  placeholder="0"
                                  className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-center font-black text-base focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Status da Partida</label>
                              <div className="grid grid-cols-3 gap-2">
                                {(['scheduled', 'live', 'finished'] as const).map(stat => (
                                  <button
                                    key={stat}
                                    type="button"
                                    onClick={() => setAdminMatchStatus(stat)}
                                    className={`py-2 px-1 rounded-lg font-mono text-[9px] font-bold uppercase transition cursor-pointer ${adminMatchStatus === stat ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                                  >
                                    {stat === 'scheduled' ? 'Agendado' : stat === 'live' ? 'Ao Vivo' : 'Terminado'}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={resolveMatch}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer shadow-emerald-700/10"
                            >
                              <Check className="w-4 h-4" />
                              Salvar e Atualizar Ranking!
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Instruções de Participação Card */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 shadow-inner">
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-450" />
                        Instruções de Participação
                      </h4>
                      <p className="text-[10px] text-slate-450 font-medium mb-3 leading-relaxed">
                        Estas instruções aparecem ao lado do QR Code central para ajudar os participantes.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Título do Alerta (QR Code)</label>
                          <input 
                            type="text" 
                            value={configParticipateTitle}
                            onChange={(e) => setConfigParticipateTitle(e.target.value)}
                            placeholder="ex: ESCANEIE E PARTICIPE"
                            className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Texto do Alerta (QR Code)</label>
                          <textarea 
                            value={configParticipateInstruction}
                            rows={4}
                            onChange={(e) => setConfigParticipateInstruction(e.target.value)}
                            placeholder="ex: Abra a câmera..."
                            className="w-full bg-slate-900 text-slate-150 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 resize-none font-medium leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Add CUSTOM Match + Point Weights */}
                  <div className="space-y-4">
                    {/* Sincronização Automática Copa 2026 */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-emerald-950 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Globe className="w-16 h-16 text-emerald-400" />
                      </div>
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-emerald-405 animate-pulse" />
                        Jogos Reais da Copa do Mundo
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4">
                        Atualize a coluna de conjuntura de jogos de forma 100% automática com as partidas, resultados e bandeiras reais da Copa 2026 diretamente via busca inteligente Gemini.
                      </p>

                      <button
                        onClick={syncRealMatches}
                        disabled={isSyncingMatches}
                        type="button"
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border transition ${isSyncingMatches ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-950 hover:bg-emerald-900 border-emerald-500/20 text-emerald-400 cursor-pointer hover:border-emerald-500/40 shadow-md'}`}
                      >
                        <RefreshCw className={`w-4 h-4 ${isSyncingMatches ? 'animate-spin text-slate-500' : 'text-emerald-400'}`} />
                        {isSyncingMatches ? 'Sincronizando via IA...' : 'Sincronizar Jogos Reais Agora'}
                      </button>

                      {syncFeedback && (
                        <div className={`mt-3 p-3 rounded-lg text-[10px] font-bold leading-relaxed border flex items-start gap-1.5 ${syncFeedback.isError ? 'bg-red-950/40 border-red-900/30 text-red-300' : 'bg-emerald-950/40 border-emerald-900/30 text-emerald-300'}`}>
                          <span>{syncFeedback.isError ? '❌' : '✨'}</span>
                          <span className="flex-1">{syncFeedback.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Cópia de Segurança (Backup) Card */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 shadow-inner relative overflow-hidden">
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-emerald-450 mb-1.5 flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-emerald-450" />
                        Cópia de Segurança (Backup)
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4">
                        Salve o estado do sistema baixando um arquivo JSON ou envie um arquivo de backup do seu computador para restaurar o bolão.
                      </p>

                      {/* Hidden File Input for uploading backup */}
                      <input
                        type="file"
                        id="backup-file-upload"
                        accept=".json"
                        onChange={handleBackupUpload}
                        className="hidden"
                      />

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={triggerBackup}
                          disabled={isBackingUp || isRestoring}
                          type="button"
                          className={`py-3 px-2 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border transition ${
                            isBackingUp ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200 cursor-pointer shadow-md'
                          }`}
                          title="Gera um backup no servidor e baixa o arquivo JSON no seu computador"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
                          Criar Backup
                        </button>

                        <button
                          onClick={() => document.getElementById('backup-file-upload')?.click()}
                          disabled={isBackingUp || isRestoring}
                          type="button"
                          className={`py-3 px-2 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 border transition ${
                            isRestoring ? 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-850 border-slate-800 text-slate-200 cursor-pointer shadow-md'
                          }`}
                          title="Escolhe um arquivo JSON do seu computador para restaurar"
                        >
                          <Plus className="w-3.5 h-3.5 animate-pulse" />
                          Subir Backup
                        </button>
                      </div>

                      <div className="mt-3 text-center">
                        <button
                          onClick={triggerRestore}
                          disabled={isBackingUp || isRestoring}
                          type="button"
                          className="text-[9px] font-bold text-slate-500 hover:text-slate-300 underline uppercase tracking-wider transition cursor-pointer"
                          title="Restaura os dados a partir da cópia mais recente salva no servidor (backup_latest.json)"
                        >
                          Restaurar cópia rápida do servidor
                        </button>
                      </div>

                      {backupFeedback && (
                        <div className={`mt-3 p-3 rounded-lg text-[10px] font-bold leading-relaxed border flex items-start gap-1.5 ${backupFeedback.isError ? 'bg-red-950/40 border-red-900/30 text-red-300' : 'bg-emerald-950/40 border-emerald-900/30 text-emerald-300'}`}>
                          <span>{backupFeedback.isError ? '❌' : '✨'}</span>
                          <span className="flex-1">{backupFeedback.text}</span>
                        </div>
                      )}
                    </div>

                    {/* Criar Nova Partida Card */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 shadow-inner">
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                        <Plus className="w-4 h-4 text-emerald-400" />
                        Criar Nova Partida Customizada
                      </h4>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Time Mandante</label>
                            <input 
                              type="text" 
                              value={newHomeTeam}
                              onChange={(e) => setNewHomeTeam(e.target.value)}
                              placeholder="ex: Brasil"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Bandeira</label>
                            <input 
                              type="text" 
                              value={newHomeFlag}
                              onChange={(e) => setNewHomeFlag(e.target.value)}
                              placeholder="🇧🇷"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm text-center focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Time Visitante</label>
                            <input 
                              type="text" 
                              value={newAwayTeam}
                              onChange={(e) => setNewAwayTeam(e.target.value)}
                              placeholder="ex: Colômbia"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-emerald-500 font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Bandeira</label>
                            <input 
                              type="text" 
                              value={newAwayFlag}
                              onChange={(e) => setNewAwayFlag(e.target.value)}
                              placeholder="🇨🇴"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm text-center focus:outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>

                        <button
                          onClick={addMatch}
                          type="button"
                          className="w-full bg-slate-850 hover:bg-slate-800 text-slate-100 font-black text-xs uppercase py-3 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-emerald-400" /> Adicionar Jogo
                        </button>
                      </div>
                    </div>

                    {/* Pesos das Pontuações Card */}
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 shadow-inner">
                      <h4 className="font-display font-black text-xs uppercase tracking-wider text-amber-500 mb-3 flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-amber-400" />
                        Pesos das Pontuações
                      </h4>
                      <p className="text-[10px] text-slate-450 font-medium mb-3 leading-relaxed">
                        Ajuste as pontuações distribuídas automaticamente no cálculo do ranking de palpites.
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Placar Exato</label>
                          <input 
                            type="number" 
                            value={ruleExactScore}
                            onChange={(e) => setRuleExactScore(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 text-amber-400 p-3 rounded-xl border border-slate-800 text-sm font-mono font-black text-center focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Venc. + Saldo</label>
                          <input 
                            type="number" 
                            value={ruleWinnerAndDiff}
                            onChange={(e) => setRuleWinnerAndDiff(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm font-mono font-black text-center focus:outline-none focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Só Vencedor</label>
                          <input 
                            type="number" 
                            value={ruleWinnerOnly}
                            onChange={(e) => setRuleWinnerOnly(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 text-slate-105 p-3 rounded-xl border border-slate-800 text-sm font-mono font-black text-center focus:outline-none focus:border-yellow-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Acerto 1 dos Gols</label>
                          <input 
                            type="number" 
                            value={ruleOneTeamScore}
                            onChange={(e) => setRuleOneTeamScore(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 text-slate-105 p-3 rounded-xl border border-slate-800 text-sm font-mono font-black text-center focus:outline-none focus:border-yellow-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Visual Identity, Custom Logo (Branding) and Prizes */}
                  <div className="space-y-4">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850 flex flex-col justify-between h-full shadow-inner">
                      <div>
                        <h4 className="font-display font-bold text-xs uppercase tracking-wider text-yellow-500 mb-3 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                          Visual e Premiação
                        </h4>

                        <div className="space-y-4">
                          {/* Logo Text Config */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Nome/Branding da Copa (Texto)</label>
                            <input 
                              type="text" 
                              value={configLogoText}
                              onChange={(e) => setConfigLogoText(e.target.value)}
                              placeholder="ex: COPA DO REMIX TV"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500 font-bold"
                            />
                          </div>

                          {/* Logo URL Config */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">URL do Logo (Imagem)</label>
                            <input 
                              type="text" 
                              value={configLogoUrl}
                              onChange={(e) => setConfigLogoUrl(e.target.value)}
                              placeholder="ex: https://site.com/logo.png"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500"
                            />
                            <p className="text-[9px] text-slate-500 font-mono mt-1">
                              *Se deixado vazio, mostra o ícone de Troféu dourado.
                            </p>
                          </div>

                          {/* Transmission Badge Config (TV LIVE) */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Texto do Badge de Transmissão (Seta Vermelha)</label>
                            <input 
                              type="text" 
                              value={configTvLiveLabel}
                              onChange={(e) => setConfigTvLiveLabel(e.target.value)}
                              placeholder="ex: TV LIVE"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500 font-semibold"
                            />
                          </div>

                          {/* Subtitle/Championship Config (Copa do Mundo) */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Subtítulo da Copa (Ao lado do Badge)</label>
                            <input 
                              type="text" 
                              value={configChampionshipName}
                              onChange={(e) => setConfigChampionshipName(e.target.value)}
                              placeholder="ex: COPA DO MUNDO DE 2026"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500 font-semibold"
                            />
                          </div>

                          {/* Banner de restrição de idade (+18) */}
                          <div className="flex items-center gap-2.5 mt-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
                            <input
                              id="show18BannerCheck"
                              type="checkbox"
                              checked={configShow18Banner}
                              onChange={(e) => setConfigShow18Banner(e.target.checked)}
                              className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-500 bg-slate-950 border-slate-800 cursor-pointer"
                            />
                            <label htmlFor="show18BannerCheck" className="text-[11px] font-bold text-slate-300 uppercase select-none cursor-pointer">
                              Exibir banner proibido menores (+18)
                            </label>
                          </div>

                          <div className="border-t border-slate-900/60 my-2 pt-2" />

                          {/* Prize Name Config */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Nome do Prêmio do Campeão</label>
                            <input 
                              type="text" 
                              value={configPrizeName}
                              onChange={(e) => setConfigPrizeName(e.target.value)}
                              placeholder="ex: SMART TV 55\"
                              className="w-full bg-slate-900 text-yellow-400 p-3 rounded-xl border border-slate-800 text-sm font-black focus:outline-none focus:border-yellow-500"
                            />
                          </div>

                          {/* Prize Description Config */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Detalhes do prêmio</label>
                            <textarea 
                              value={configPrizeDescription}
                              rows={3}
                              onChange={(e) => setConfigPrizeDescription(e.target.value)}
                              placeholder="ex: O vencedor do ranking final levará..."
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500 resize-none font-medium leading-relaxed"
                            />
                          </div>

                          {/* Prize Image Config */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">URL de Imagem do Prêmio (Opcional)</label>
                            <input 
                              type="text" 
                              value={configPrizeImage}
                              onChange={(e) => setConfigPrizeImage(e.target.value)}
                              placeholder="ex: https://site.com/prize.png"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500"
                            />
                            <p className="text-[9px] text-slate-500 font-mono mt-1">
                              *Se deixado vazio, mostra o ícone animado de caixa de presente.
                            </p>
                          </div>

                          <div className="border-t border-slate-900/60 my-2 pt-2" />

                          {/* Prize 2 Config */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Nome do Prêmio do 2º Lugar</label>
                            <input 
                              type="text" 
                              value={configPrize2Name}
                              onChange={(e) => setConfigPrize2Name(e.target.value)}
                              placeholder="ex: CAMISA OFICIAL"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm font-bold focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Detalhes do prêmio do 2º Lugar</label>
                            <textarea 
                              value={configPrize2Description}
                              rows={2}
                              onChange={(e) => setConfigPrize2Description(e.target.value)}
                              placeholder="ex: O segundo colocado levará..."
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500 resize-none font-medium leading-relaxed"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">URL de Imagem do Prêmio 2º Lugar (Opcional)</label>
                            <input 
                              type="text" 
                              value={configPrize2Image}
                              onChange={(e) => setConfigPrize2Image(e.target.value)}
                              placeholder="ex: https://site.com/prize2.png"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500"
                            />
                          </div>

                          <div className="border-t border-slate-900/60 my-2 pt-2" />

                          {/* Prize 3 Config */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Nome do Prêmio do 3º Lugar</label>
                            <input 
                              type="text" 
                              value={configPrize3Name}
                              onChange={(e) => setConfigPrize3Name(e.target.value)}
                              placeholder="ex: KIT TORCEDOR"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm font-bold focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Detalhes do prêmio do 3º Lugar</label>
                            <textarea 
                              value={configPrize3Description}
                              rows={2}
                              onChange={(e) => setConfigPrize3Description(e.target.value)}
                              placeholder="ex: O terceiro colocado levará..."
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500 resize-none font-medium leading-relaxed"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">URL de Imagem do Prêmio 3º Lugar (Opcional)</label>
                            <input 
                              type="text" 
                              value={configPrize3Image}
                              onChange={(e) => setConfigPrize3Image(e.target.value)}
                              placeholder="ex: https://site.com/prize3.png"
                              className="w-full bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 text-sm focus:outline-none focus:border-yellow-500"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={saveConfig}
                        type="button"
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs uppercase py-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-yellow-500/20 cursor-pointer mt-4"
                      >
                        <Check className="w-4 h-4" /> Salvar Layout e Prêmios!
                      </button>
                    </div>
                  </div>
                </div>
              )}

                {/* Bottom global actions */}
                <div className="border-t border-slate-805/60 mt-6 pt-5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Simulated view switcher */}
                    <button 
                      onClick={() => setView(view === 'tv' ? 'mobile' : 'tv')}
                      className="bg-emerald-900/40 text-emerald-300 font-bold border border-emerald-500/20 px-3 py-1.5 rounded-lg text-xs hover:bg-emerald-900/60 transition flex items-center gap-1 cursor-pointer"
                    >
                      {view === 'tv' ? <Smartphone className="w-3.5 h-3.5" /> : <Tv className="w-3.5 h-3.5" />}
                      Ver Versão {view === 'tv' ? 'Celular' : 'TV'} no Computador
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={reloadDatabase}
                      className="bg-emerald-950/70 hover:bg-emerald-900/60 text-emerald-400 font-bold border border-emerald-950 px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar do Banco de Dados
                    </button>

                     <button
                      onClick={clearAllGuesses}
                      className="bg-red-650/80 hover:bg-red-600 text-white font-bold border border-red-500/20 px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Excluir Todos os Palpites (Zerar Bolão)
                    </button>

                    <button
                      onClick={resetDemoState}
                      className="bg-red-950/50 hover:bg-red-900/50 text-red-400 font-bold border border-red-950/80 px-3.5 py-1.5 rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Resetar Servidor para o Padrão
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PASSWORD MODAL */}
        <AnimatePresence>
          {passwordModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
              >
                <button
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setAdminPasswordInput('');
                    setPasswordError('');
                  }}
                  className="absolute top-3 right-3 text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="bg-emerald-950/60 p-3 rounded-full border border-emerald-500/20 mb-4 text-emerald-400">
                    <Settings className="w-6 h-6 animate-spin-slow" />
                  </div>
                  <h3 className="font-display font-black text-lg text-slate-100 uppercase tracking-wide">
                    ÁREA DO ADMINISTRADOR
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                    Digite a senha administrativa para acessar o painel de controle e as configurações da TV.
                  </p>
                </div>

                <div className="space-y-3 mt-1">
                  <input
                    type="password"
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAdminLogin(adminPasswordInput);
                    }}
                    placeholder="Senha administrativa"
                    className="w-full bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 text-center font-bold font-mono focus:outline-none focus:border-emerald-550"
                    autoFocus
                  />

                  {passwordError && (
                    <p className="text-red-400 text-xs font-semibold text-center font-mono">
                      {passwordError}
                    </p>
                  )}

                  <button
                    onClick={() => handleAdminLogin(adminPasswordInput)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase py-3 rounded-xl transition cursor-pointer mt-1 tracking-wider"
                  >
                    Acessar Controle
                  </button>
                  
                  <p className="text-[10px] text-slate-500 text-center font-mono mt-1">
                    *Senha: "visualcopa2026"
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    );
  }

  // ==================== MOBILE PALPITES VIEW (FOR PHONES OR PREVIEW) ====================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 relative overflow-x-hidden flex flex-col justify-between">
      
      {/* Glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#093319_0%,#020617_80%)] pointer-events-none" />

      {/* Main card/header */}
      <div className="relative z-10">
        
        {/* Mobile Header */}
        <header className="flex items-center justify-between pb-4 mb-4 border-b border-slate-900">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h1 className="font-display font-extrabold text-base tracking-tight text-white uppercase">
              O Super Palpiteiro
            </h1>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest">
            Mobile 📲
          </span>
        </header>

        {/* FEEDBACK MASSAGE ALERT */}
        <AnimatePresence>
          {mobileMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-3.5 rounded-xl border text-xs font-bold mb-4 flex items-center gap-2 ${mobileMessage.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60' : 'bg-red-950/60 text-red-300 border-red-800/60'}`}
            >
              {mobileMessage.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-red-400" />}
              {mobileMessage.text}
            </motion.div>
          )}
        </AnimatePresence>

        {isMobileLoggedIn ? (
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-emerald-950/40 p-4 mb-5 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-yellow-500" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-emerald-950 text-emerald-400 font-black border border-emerald-500/25">
                {mobileName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[10px] text-slate-450 uppercase font-mono tracking-wider font-bold">Identificado como</p>
                <h2 className="text-sm font-black text-slate-100 uppercase tracking-tight">{mobileName}</h2>
              </div>
            </div>
            <button
              onClick={handleMobileLogout}
              className="bg-slate-800 hover:bg-red-950/30 border border-slate-700 hover:border-red-900/40 text-slate-350 hover:text-red-300 font-mono font-bold text-[9px] px-3 py-1.5 rounded-lg transition uppercase cursor-pointer"
            >
              Sair / Trocar
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-emerald-950/40 p-5 mb-5 shadow-xl relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-yellow-500 rounded-t-2xl" />
            
            {mobileStep === 'select_name' ? (
              <>
                <h2 className="text-xs font-bold tracking-widest text-slate-300 uppercase mb-3.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-400" />
                  Passo 1: Selecione seu Nome
                </h2>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Seu Nome na Lista</label>
                    <select
                      value={mobileName}
                      onChange={(e) => {
                        setMobileName(e.target.value);
                      }}
                      className="w-full bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 font-bold text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="" className="text-slate-500">Selecione seu nome...</option>
                      {PREDEFINED_PARTICIPANTS.map((name) => (
                        <option key={name} value={name} className="bg-slate-950 text-slate-100">
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={!mobileName}
                    onClick={() => {
                      if (mobileName) {
                        setMobilePin('');
                        setMobileConfirmPin('');
                        setMobileStep('pin_input');
                      }
                    }}
                    className={`w-full font-extrabold text-xs uppercase py-3.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer ${
                      mobileName 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                        : 'bg-slate-800 text-slate-550 border border-slate-850 cursor-not-allowed'
                    }`}
                  >
                    Avançar
                  </button>
                </div>
              </>
            ) : (
              <>
                {(() => {
                  const selectedParticipant = appState?.participants.find(p => p.name.toLowerCase() === mobileName.toLowerCase());
                  const needsPinCreation = !selectedParticipant || !selectedParticipant.hasPin;

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                        <h2 className="text-xs font-bold tracking-widest text-slate-300 uppercase flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-400" />
                          {needsPinCreation ? 'Passo 2: Cadastrar Senha' : 'Passo 2: Digitar PIN'}
                        </h2>
                        <span className="text-[10px] font-bold text-emerald-400 font-mono">
                          {mobileName}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {needsPinCreation ? "Crie seu PIN de Acesso" : "Digite seu PIN de Acesso"}
                          </label>
                          <input
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={mobilePin}
                            onChange={(e) => setMobilePin(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder={needsPinCreation ? "Escolha de 4 a 6 dígitos" : "Digite seu PIN de acesso"}
                            className="w-full bg-slate-950 text-slate-100 p-3.5 rounded-xl border border-slate-800 font-bold text-sm focus:outline-none focus:border-emerald-500 font-mono text-center tracking-widest"
                          />
                        </div>

                        {needsPinCreation && (
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                              Confirme seu PIN de Acesso
                            </label>
                            <input
                              type="password"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              maxLength={6}
                              value={mobileConfirmPin}
                              onChange={(e) => setMobileConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                              placeholder="Digite novamente o mesmo PIN"
                              className="w-full bg-slate-950 text-slate-100 p-3.5 rounded-xl border border-slate-800 font-bold text-sm focus:outline-none focus:border-emerald-500 font-mono text-center tracking-widest"
                            />
                          </div>
                        )}

                        <p className="text-[9px] text-slate-500 font-mono leading-relaxed">
                          {needsPinCreation 
                            ? "*Importante: Escolha uma senha numérica simples (PIN) de 4 a 6 dígitos para proteger seus palpites."
                            : "*Aviso: Se você esqueceu seu PIN, digite a senha cadastrada anteriormente ou contate o administrador."}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          onClick={handleMobileLogin}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase py-3.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                        >
                          {needsPinCreation ? "Cadastrar e Entrar!" : "Entrar no Sistema!"}
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setMobilePin('');
                            setMobileConfirmPin('');
                            setMobileStep('select_name');
                          }}
                          className="w-full bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 font-bold text-xs py-2.5 rounded-xl transition uppercase cursor-pointer text-center"
                        >
                          Voltar
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        {/* STEP 2: SELECT MATCH AND GUESS (ONLY SHOW ONCE LOGGED IN) */}
        {isMobileLoggedIn && (
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-emerald-950/40 p-4.5 shadow-xl relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-yellow-500 to-green-500 rounded-t-2xl" />
            
            {/* NEW MOBILE TAB SELECTOR */}
            <div className="grid grid-cols-3 gap-1 mb-4 p-1 bg-slate-950 rounded-xl border border-slate-850">
              <button
                type="button"
                onClick={() => setMobileTab('submit_guess')}
                className={`py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  mobileTab === 'submit_guess'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚽ Palpitar
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('my_guesses')}
                className={`py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  mobileTab === 'my_guesses'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 Palpites
              </button>
              <button
                type="button"
                onClick={() => setMobileTab('rules')}
                className={`py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  mobileTab === 'rules'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                📜 Regras
              </button>
            </div>

            {mobileTab === 'submit_guess' ? (
              <>
                <h2 className="text-xs font-bold tracking-widest text-slate-300 uppercase mb-3.5 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-yellow-500" />
                  2. Selecione e Dê seu Palpite!
                </h2>

            {/* Matches Horizontal Scroll Selection Carousel */}
            <div className="flex gap-2 overflow-x-auto pb-3.5 mb-4 scrollbar-none">
              {nextMatches.length === 0 ? (
                <p className="text-xs text-slate-500 text-center w-full py-4 font-mono font-bold">
                  Sem partidas com palpites abertos no momento!
                </p>
              ) : (
                nextMatches.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMatchForGuess(m.id)}
                    type="button"
                    className={`px-3 py-2.5 rounded-xl border font-bold text-xs shrink-0 flex flex-col items-center gap-1.5 transition min-w-[120px] ${selectedMatchForGuess === m.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-700/20' : 'bg-slate-950/60 text-slate-300 border-slate-900 hover:bg-slate-900'}`}
                  >
                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderFlag(m.homeFlag, m.homeTeam)}
                      <span className="font-bold text-[10px] leading-none">{m.homeTeam}</span>
                      <span className={`text-[10px] font-normal mx-0.5 ${selectedMatchForGuess === m.id ? 'text-emerald-100' : 'text-slate-500'}`}>vs</span>
                      <span className="font-bold text-[10px] leading-none">{m.awayTeam}</span>
                      {renderFlag(m.awayFlag, m.awayTeam)}
                    </div>
                    {(() => {
                      const matchTime = new Date(m.dateTime);
                      const isPast = matchTime.getTime() <= Date.now();
                      if (isPast) {
                        return <span className="text-[9px] font-mono font-bold bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded border border-red-800/40">PALPITES ENCERRADOS</span>;
                      }
                      return (
                        <span className={`text-[9px] font-mono ${selectedMatchForGuess === m.id ? 'text-emerald-100' : 'text-slate-500'}`}>
                          {matchTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} • {matchTime.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).toUpperCase()}
                        </span>
                      );
                    })()}
                  </button>
                ))
              )}
            </div>

            {/* Active selected prediction form details */}
            {selectedMatchForGuess && (
              (() => {
                const activeMatch = appState?.matches.find(m => m.id === selectedMatchForGuess);
                if (!activeMatch) return null;
                
                const currentGHome = mobileGuesses[selectedMatchForGuess]?.home ?? '';
                const currentGAway = mobileGuesses[selectedMatchForGuess]?.away ?? '';

                return (
                  <motion.div 
                    key={selectedMatchForGuess}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex flex-col items-center">
                      
                      {/* Match header details */}
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-3 text-center">
                        {new Date(activeMatch.dateTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })} às {new Date(activeMatch.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })} • 2026
                      </div>

                      {/* Numeric Input scoreboard score selection row */}
                      <div className="flex items-center justify-between w-full gap-2">
                        {/* Home team title */}
                        <div className="flex flex-col items-center w-5/12 text-center text-slate-300 gap-1.5">
                          <div className="w-10 h-7 flex items-center justify-center shrink-0">
                            {renderFlag(activeMatch.homeFlag, activeMatch.homeTeam)}
                          </div>
                          <span className="font-bold text-xs truncate max-w-[80px]">{activeMatch.homeTeam}</span>
                        </div>

                        {/* Numeric inputs row */}
                        <div className="flex items-center w-4/12 gap-1 px-1 justify-center">
                          <input
                            type="number"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            value={currentGHome}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setMobileGuesses(prev => ({
                                ...prev,
                                [selectedMatchForGuess]: {
                                  ...prev[selectedMatchForGuess],
                                  home: val,
                                  away: currentGAway
                                }
                              }));
                            }}
                            placeholder="0"
                            className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-800 text-center font-display font-black text-xl text-emerald-400 focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-slate-600 font-bold">x</span>
                          <input
                            type="number"
                            pattern="[0-9]*"
                            inputMode="numeric"
                            value={currentGAway}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setMobileGuesses(prev => ({
                                ...prev,
                                [selectedMatchForGuess]: {
                                  ...prev[selectedMatchForGuess],
                                  home: currentGHome,
                                  away: val
                                }
                              }));
                            }}
                            placeholder="0"
                            className="w-12 h-12 bg-slate-900 rounded-xl border border-slate-800 text-center font-display font-black text-xl text-emerald-400 focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        {/* Away team title */}
                        <div className="flex flex-col items-center w-5/12 text-center text-slate-300 gap-1.5">
                          <div className="w-10 h-7 flex items-center justify-center shrink-0">
                            {renderFlag(activeMatch.awayFlag, activeMatch.awayTeam)}
                          </div>
                          <span className="font-bold text-xs truncate max-w-[80px]">{activeMatch.awayTeam}</span>
                        </div>
                      </div>
                    </div>

                    {/* Submission triggers */}
                    <button
                      onClick={() => {
                        const hInt = parseInt(currentGHome);
                        const aInt = parseInt(currentGAway);
                        if (isNaN(hInt) || isNaN(aInt)) {
                          setMobileMessage({ text: 'Insira placares válidos para os dois times!', type: 'error' });
                          return;
                        }
                        submitGuess(selectedMatchForGuess, mobileName, hInt, aInt);
                      }}
                      type="button"
                      className="w-full bg-linear-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold text-sm uppercase py-3.5 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20 cursor-pointer"
                    >
                      <Send className="w-4.5 h-4.5 text-white" />
                      Enviar Meu Palpite Magnífico!
                    </button>
                  </motion.div>
                );
              })()
            )}
          </>
        ) : mobileTab === 'my_guesses' ? (
          // Tab My Guesses & Ranking List
          <div className="space-y-4">
            {/* Ranking status summary card */}
            {(() => {
              const userRankIndex = appState?.participants.findIndex(p => p.name.toLowerCase() === mobileName.toLowerCase()) ?? -1;
              const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;
              const userPoints = userRankIndex !== -1 ? appState?.participants[userRankIndex].points : 0;
              
              return (
                <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900 flex justify-between items-center text-left">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Minha Classificação</p>
                    <h3 className="text-base font-black text-white mt-0.5">
                      {userRank ? `${userRank}º Lugar` : 'Sem classificação'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">Pontos Acumulados</p>
                    <h3 className="text-base font-black text-emerald-400 mt-0.5">
                      {userPoints} <span className="text-xs font-normal text-slate-400">pts</span>
                    </h3>
                  </div>
                </div>
              );
            })()}

            <h3 className="text-xs font-bold tracking-wider text-slate-350 uppercase mb-1 flex items-center gap-1.5 text-left">
              <Trophy className="w-4 h-4 text-emerald-450" />
              Grade de Palpites Realizados
            </h3>

            {/* Guesses list */}
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {(() => {
                const myGuesses = (appState?.guesses || []).filter(g => g.participantName.toLowerCase() === mobileName.toLowerCase());
                if (myGuesses.length === 0) {
                  return (
                    <div className="py-8 text-center text-slate-500 text-xs font-medium">
                      Nenhum palpite enviado ainda! Vá na aba "Palpitar" para começar.
                    </div>
                  );
                }

                return myGuesses.map(g => {
                  const match = appState?.matches.find(m => m.id === g.matchId);
                  if (!match) return null;

                  const isFinished = match.status === 'finished';
                  const isCorrect = isFinished && g.pointsEarned !== null && g.pointsEarned > 0;

                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        if (isCorrect) {
                          setSelectedCorrectGuess(g);
                        }
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all duration-150 ${
                        isCorrect 
                          ? 'bg-slate-900/80 border-emerald-500/40 hover:border-emerald-500 cursor-pointer shadow-md shadow-emerald-950/10' 
                          : isFinished
                          ? 'bg-slate-900/40 border-slate-850 opacity-80'
                          : 'bg-slate-900/60 border-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono mb-2">
                        <span>
                          {new Date(match.dateTime).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' })} às {new Date(match.dateTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                        </span>
                        {isFinished ? (
                          isCorrect ? (
                            <span className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 text-[9px]">
                              🔥 ACERTO (+{g.pointsEarned} pts)
                            </span>
                          ) : (
                            <span className="bg-red-950/60 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 text-[9px]">
                              😢 ERRO (0 pts)
                            </span>
                          )
                        ) : (
                          <span className="bg-slate-950 text-slate-400 border border-slate-850 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 text-[9px]">
                            ⏳ PENDENTE
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        {/* Home Team */}
                        <div className="flex items-center gap-2 w-5/12">
                          {renderFlag(match.homeFlag, match.homeTeam)}
                          <span className="font-bold text-xs text-slate-200 truncate">{match.homeTeam}</span>
                        </div>

                        {/* Versus / Score */}
                        <div className="w-2/12 text-center">
                          {isFinished ? (
                            <div className="text-[10px] font-black font-mono text-emerald-400">
                              {match.homeScore} - {match.awayScore}
                            </div>
                          ) : (
                            <span className="text-[9px] font-mono text-slate-655 uppercase font-bold">vs</span>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center justify-end gap-2 w-5/12 text-right">
                          <span className="font-bold text-xs text-slate-200 truncate">{match.awayTeam}</span>
                          {renderFlag(match.awayFlag, match.awayTeam)}
                        </div>
                      </div>

                      {/* Guess details row */}
                      <div className="mt-3 pt-2.5 border-t border-slate-950 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-medium">
                          Seu Palpite: <strong className="text-white font-black font-mono">{g.homeScore} x {g.awayScore}</strong>
                        </span>
                        {isCorrect && (
                          <span className="text-emerald-400 font-extrabold text-[9px] flex items-center gap-0.5 hover:underline uppercase tracking-wide">
                            Compartilhar vitória ✨
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        ) : (
          // Regulamento (Regras) Tab View
          <div className="space-y-4 text-left">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-900">
              <h3 className="text-sm font-black text-yellow-450 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                📜 Regulamento de Pontuação
              </h3>
              <p className="text-[11px] text-slate-350 leading-relaxed font-medium">
                O bolão pontua automaticamente a cada partida encerrada seguindo uma escala de precisão do palpite. O sistema calcula sua pontuação baseado no resultado final:
              </p>
            </div>

            <div className="space-y-3">
              {/* Placar Exato */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="text-white">🥇 Placar Exato</span>
                  <span className="text-yellow-400 font-black">+{appState?.rules?.exactScore ?? 10} pts</span>
                </div>
                <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                  Você acertou exatamente o placar do jogo.
                </p>
                <div className="mt-1.5 p-1 px-2 bg-slate-950/40 rounded text-[9px] font-mono text-slate-550">
                  Ex: Palpite 2x1 • Placar real 2x1
                </div>
              </div>

              {/* Vencedor + Saldo */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="text-white">🥈 Vencedor + Saldo</span>
                  <span className="text-yellow-500 font-black">+{appState?.rules?.winnerAndDiff ?? 7} pts</span>
                </div>
                <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                  Você acertou o vencedor e a diferença de gols (saldo), mas errou os números exatos.
                </p>
                <div className="mt-1.5 p-1 px-2 bg-slate-950/40 rounded text-[9px] font-mono text-slate-550">
                  Ex: Palpite 3x1 (saldo +2) • Placar real 2x0 (saldo +2)
                </div>
              </div>

              {/* Apenas Vencedor */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="text-white">🥉 Apenas Vencedor</span>
                  <span className="text-emerald-450 font-black">+{appState?.rules?.winnerOnly ?? 5} pts</span>
                </div>
                <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                  Você acertou quem venceu (ou empate), mas errou o saldo de gols e o placar exato.
                </p>
                <div className="mt-1.5 p-1 px-2 bg-slate-950/40 rounded text-[9px] font-mono text-slate-550">
                  Ex: Palpite 2x1 (vitória) • Placar real 3x0 (vitória)
                </div>
              </div>

              {/* Gol de 1 Time */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between font-bold text-xs">
                  <span className="text-white">⚽ Gol de 1 Time</span>
                  <span className="text-slate-350 font-black">+{appState?.rules?.oneTeamScore ?? 2} pts</span>
                </div>
                <p className="text-[10px] text-slate-450 mt-1 leading-snug">
                  Você errou o vencedor, mas acertou os gols de pelo menos um dos times.
                </p>
                <div className="mt-1.5 p-1 px-2 bg-slate-950/40 rounded text-[9px] font-mono text-slate-550">
                  Ex: Palpite 1x2 • Placar real 1x0 (acertou o gol de 1 do mandante)
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-950/30 border border-emerald-500/10 rounded-xl text-[10px] text-emerald-450 font-medium leading-relaxed">
              💡 Os palpites podem ser enviados ou alterados até o horário de início oficial de cada partida na TV.
            </div>
          </div>
        )}
      </div>
        )}
      </div>

      {/* FOOTER MOBILE */}
      <footer className="relative z-10 text-center text-[10px] text-slate-600 mt-8 mb-4 border-t border-slate-900 pt-4 font-mono leading-relaxed">
        <p>O SUPER PALPITEIRO • COPA DO MUNDO 2026</p>
        <p className="mt-1">Dê seu palpite no celular e pontue automaticamente na tela principal da TV.</p>
        
        {isAdmin ? (
          <div className="mt-4 p-3 bg-slate-900 border border-slate-800/80 rounded-xl max-w-sm mx-auto flex flex-col gap-2">
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Modo Administrador Ativo 🔑
            </span>
            <div className="flex gap-2 justify-center mt-1">
              <button 
                onClick={() => {
                  // Remove view query param to see TV layout
                  window.location.search = '';
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <Tv className="w-3.5 h-3.5" /> Ver Painel da TV
              </button>
              <button 
                onClick={handleAdminLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold px-3 py-1.5 rounded-lg text-xs transition flex items-center gap-1 cursor-pointer"
              >
                Sair
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setPasswordModalOpen(true)}
            className="text-[9px] text-slate-800 hover:text-slate-600 transition block mx-auto mt-4 cursor-pointer font-semibold underline"
          >
            Acesso do Administrador 🔐
          </button>
        )}
      </footer>

      {/* PASSWORD MODAL (MOBILE) */}
      <AnimatePresence>
        {passwordModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 z-50 text-left"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative text-slate-200"
            >
              <button
                onClick={() => {
                  setPasswordModalOpen(false);
                  setAdminPasswordInput('');
                  setPasswordError('');
                }}
                className="absolute top-3 right-3 text-slate-400 hover:text-white bg-slate-800/50 p-1.5 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="bg-emerald-950/60 p-3 rounded-full border border-emerald-500/20 mb-4 text-emerald-400">
                  <Settings className="w-6 h-6 animate-spin-slow" />
                </div>
                <h3 className="font-display font-black text-lg text-slate-100 uppercase tracking-wide">
                  ÁREA DO ADMINISTRADOR
                </h3>
                <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">
                  Digite a senha de administrador para acessar as estatísticas do painel, gerenciar partidas e editar prêmios.
                </p>
              </div>

              <div className="space-y-3 mt-1">
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdminLogin(adminPasswordInput);
                  }}
                  placeholder="Senha administrativa"
                  className="w-full bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 text-center font-bold font-mono focus:outline-none focus:border-emerald-500 animate-none"
                  autoFocus
                />

                {passwordError && (
                  <p className="text-red-400 text-xs font-semibold text-center font-mono">
                    {passwordError}
                  </p>
                )}

                <button
                  onClick={() => handleAdminLogin(adminPasswordInput)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase py-3 rounded-xl transition cursor-pointer mt-1 tracking-wider"
                >
                  Acessar Controle
                </button>
                
                <p className="text-[10px] text-slate-500 text-center font-mono mt-1">
                  *Dica: use "admin" ou "1234" para testar
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GUESS CONFIRMATION CELEBRATION MODAL */}
      <AnimatePresence>
        {guessConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'radial-gradient(circle at 50% 50%, rgba(5,46,22,0.98) 0%, rgba(2,6,23,0.98) 100%)' }}
            onClick={() => setGuessConfirmation(null)}
          >
            {/* Animated background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {['🏆','⚽','🎉','🌟','✨','🎊','🥅','🔥'].map((emoji, i) => (
                <motion.div
                  key={i}
                  initial={{ y: '110%', x: `${10 + i * 11}%`, opacity: 0, scale: 0 }}
                  animate={{ y: '-20%', opacity: [0, 1, 1, 0], scale: [0, 1.5, 1, 0.5] }}
                  transition={{ duration: 2.5, delay: i * 0.12, ease: 'easeOut' }}
                  className="absolute text-3xl"
                >
                  {emoji}
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ scale: 0.5, y: 60, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: -40, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 200 }}
              className="relative w-full max-w-sm text-center"
              onClick={e => e.stopPropagation()}
            >
              {/* Big checkmark badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.1, duration: 0.6, times: [0, 0.6, 1] }}
                className="w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-emerald-500/50"
              >
                <Check className="w-12 h-12 text-white stroke-[3]" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-1">
                  Palpite Confirmado!
                </h2>
                <p className="text-emerald-400 text-xs font-bold tracking-widest uppercase mb-6">
                  🎯 Seu palpite foi registrado com sucesso
                </p>
              </motion.div>

              {/* Match card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-5 mb-5 shadow-2xl"
              >
                {/* Match teams */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="flex flex-col items-center gap-1.5">
                    {renderFlag(guessConfirmation.homeFlag, guessConfirmation.matchHome)}
                    <span className="text-xs font-bold text-slate-200">{guessConfirmation.matchHome}</span>
                  </div>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">vs</span>
                  <div className="flex flex-col items-center gap-1.5">
                    {renderFlag(guessConfirmation.awayFlag, guessConfirmation.matchAway)}
                    <span className="text-xs font-bold text-slate-200">{guessConfirmation.matchAway}</span>
                  </div>
                </div>

                {/* Score badge */}
                <div className="flex items-center justify-center gap-3">
                  <div className="bg-emerald-600 text-white font-black text-4xl w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-700/40">
                    {guessConfirmation.homeScore}
                  </div>
                  <span className="text-slate-400 text-xl font-black">x</span>
                  <div className="bg-emerald-600 text-white font-black text-4xl w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-700/40">
                    {guessConfirmation.awayScore}
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 font-mono mt-2 uppercase tracking-widest">Seu palpite de placar</p>
              </motion.div>

              {/* User name */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mb-5"
              >
                <p className="text-slate-400 text-xs">Registrado como</p>
                <p className="text-white font-black text-lg uppercase tracking-wide">{mobileName}</p>
              </motion.div>

              {/* TV message */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
                className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-5 flex items-center gap-2"
              >
                <Tv className="w-4 h-4 text-yellow-400 shrink-0" />
                <p className="text-yellow-300 text-xs font-semibold text-left">
                  Olhe para a TV! Seu palpite já aparece no ranking ao vivo! 🏆
                </p>
              </motion.div>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={() => setGuessConfirmation(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm py-3 rounded-xl transition cursor-pointer border border-slate-700"
              >
                Fechar e fazer mais palpites
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CORRECT GUESS VICTORY SHARE MODAL */}
      <AnimatePresence>
        {selectedCorrectGuess && (() => {
          const match = appState?.matches.find(m => m.id === selectedCorrectGuess.matchId);
          if (!match) return null;

          const userRankIndex = appState?.participants.findIndex(p => p.name.toLowerCase() === mobileName.toLowerCase()) ?? -1;
          const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;
          const userPoints = userRankIndex !== -1 ? appState?.participants[userRankIndex].points : 0;

          // Helper to download the canvas PNG
          const handleDownloadCard = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1920;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Gradient background
            const grad = ctx.createLinearGradient(0, 0, 0, 1920);
            grad.addColorStop(0, '#022c16'); // Emerald 950
            grad.addColorStop(0.5, '#020617'); // Slate 950
            grad.addColorStop(1, '#022c16');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1080, 1920);

            // Glowing circles
            ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
            ctx.beginPath();
            ctx.arc(540, 400, 350, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(234, 179, 8, 0.04)';
            ctx.beginPath();
            ctx.arc(540, 1500, 450, 0, Math.PI * 2);
            ctx.fill();

            // Card borders
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
            ctx.lineWidth = 14;
            ctx.strokeRect(40, 40, 1000, 1840);
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
            ctx.lineWidth = 4;
            ctx.strokeRect(60, 60, 960, 1800);

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText((appState?.championshipName || 'COPA DO MUNDO DE 2026').toUpperCase(), 540, 220);

            // Accent Victory Header
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 90px sans-serif';
            ctx.fillText('FUI CERTEIRO! 🎯🔥', 540, 340);

            ctx.fillStyle = '#ffffff';
            ctx.font = '50px sans-serif';
            ctx.fillText('Acertei em cheio o placar do jogo!', 540, 420);

            // Scoreboard Box background
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
            ctx.lineWidth = 3;
            // Draw round rectangle for Scoreboard
            const rX = 140, rY = 500, rW = 800, rH = 430, rRadius = 24;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(rX, rY, rW, rH, rRadius) : ctx.rect(rX, rY, rW, rH);
            ctx.fill();
            ctx.stroke();

            // Guessed placar banner
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
            ctx.lineWidth = 2;
            const bX = 140, bY = 970, bW = 800, bH = 200, bRadius = 16;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(bX, bY, bW, bH, bRadius) : ctx.rect(bX, bY, bW, bH);
            ctx.fill();
            ctx.stroke();

            // Draw GUESS texts
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 38px sans-serif';
            ctx.fillText('MEU PALPITE DE PLACAR', 540, 1025);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 75px sans-serif';
            ctx.fillText(`${selectedCorrectGuess.homeScore} x ${selectedCorrectGuess.awayScore}`, 540, 1120);

            // Points gained
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 52px sans-serif';
            ctx.fillText(`+${selectedCorrectGuess.pointsEarned} pontos conquistados! 🏆`, 540, 1250);

            // Ranking details box
            ctx.fillStyle = 'rgba(30, 41, 59, 0.85)';
            ctx.strokeStyle = 'rgba(234, 179, 8, 0.2)';
            ctx.lineWidth = 2;
            const kX = 140, kY = 1330, kW = 800, kH = 250, kRadius = 20;
            ctx.beginPath();
            ctx.roundRect ? ctx.roundRect(kX, kY, kW, kH, kRadius) : ctx.rect(kX, kY, kW, kH);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 34px sans-serif';
            ctx.fillText('MINHA CLASSIFICAÇÃO ATUAL NO GRUPO', 540, 1385);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 64px sans-serif';
            const rStr = userRank ? `${userRank}º Lugar` : 'Classificado';
            ctx.fillText(`${rStr} | ${userPoints} pts`, 540, 1475);
            
            ctx.fillStyle = '#a8a29e';
            ctx.font = '34px sans-serif';
            ctx.fillText(`Participante: ${selectedCorrectGuess.participantName.toUpperCase()}`, 540, 1540);

            // Brand Footer
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 32px sans-serif';
            ctx.fillText('Palpite feito através de O SUPER PALPITEIRO 🏆', 540, 1690);
            ctx.font = '28px sans-serif';
            ctx.fillText('Junte-se a nós escaneando a tela na TV!', 540, 1735);

            // Load country flags asynchronously
            const flagHomeUrl = getFlagImgUrl(match.homeFlag, match.homeTeam).replace('/w40/', '/w160/');
            const flagAwayUrl = getFlagImgUrl(match.awayFlag, match.awayTeam).replace('/w40/', '/w160/');

            const drawMatchDetails = () => {
              // Write Team names
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 44px sans-serif';
              ctx.fillText(match.homeTeam.toUpperCase(), 290, 780);
              ctx.fillText(match.awayTeam.toUpperCase(), 790, 780);

              // Write Match Score
              ctx.fillStyle = '#ea580c';
              ctx.font = 'bold 125px sans-serif';
              ctx.fillText(`${match.homeScore} x ${match.awayScore}`, 540, 725);
              ctx.fillStyle = '#475569';
              ctx.font = 'bold 28px sans-serif';
              ctx.fillText('PLACAR DO JOGO', 540, 800);

              // Save PNG and download
              const dataUrl = canvas.toDataURL('image/png');
              const a = document.createElement('a');
              a.download = `Vitoria_${selectedCorrectGuess.participantName}_${match.homeTeam}_vs_${match.awayTeam}.png`;
              a.href = dataUrl;
              a.click();
            };

            // Load flag images and draw them, then proceed to scoreboard rendering
            const loadFlag = (url: string, fx: number, fy: number, fw: number, fh: number) => {
              return new Promise<void>((res) => {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = url;
                img.onload = () => {
                  ctx.save();
                  // Rounded clip path for flag
                  ctx.beginPath();
                  ctx.roundRect ? ctx.roundRect(fx, fy, fw, fh, 12) : ctx.rect(fx, fy, fw, fh);
                  ctx.closePath();
                  ctx.clip();
                  ctx.drawImage(img, fx, fy, fw, fh);
                  ctx.restore();
                  res();
                };
                img.onerror = () => {
                  // Fallback: draw emoji if image fails
                  ctx.font = '100px sans-serif';
                  ctx.fillText(fx < 540 ? match.homeFlag : match.awayFlag, fx + fw/2, fy + fh/2 + 25);
                  res();
                };
              });
            };

            Promise.all([
              loadFlag(flagHomeUrl, 210, 560, 160, 110),
              loadFlag(flagAwayUrl, 710, 560, 160, 110)
            ]).then(() => {
              drawMatchDetails();
            });
          };

          const handleCopyText = () => {
            const shareText = `🔥 ACERTEI EM CHEIO! 🎯\nFui certeiro no palpite do jogo ${match.homeTeam} ${match.homeScore} x ${match.awayScore} ${match.awayTeam}!\n\n🏆 Minha Classificação: ${userRank ? `${userRank}º Lugar` : 'Classificado'} com ${userPoints} pontos!\n\nParticipe você também do bolão de O Super Palpiteiro! ⚽🏆`;
            navigator.clipboard.writeText(shareText).then(() => {
              alert('Texto de vitória copiado com sucesso! Compartilhe no seu WhatsApp Status.');
            });
          };

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 text-slate-100"
              style={{ background: 'radial-gradient(circle at 50% 50%, rgba(2,44,22,0.99) 0%, rgba(2,6,23,0.99) 100%)' }}
              onClick={() => setSelectedCorrectGuess(null)}
            >
              {/* Confetti particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {['🏆','🔥','✨','🎉','🌟','⚽','🚀'].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: '110%', x: `${15 + i * 11}%`, opacity: 0 }}
                    animate={{ y: '-10%', opacity: [0, 1, 1, 0], rotate: [0, 360] }}
                    transition={{ duration: 3, delay: i * 0.15, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute text-2xl"
                  >
                    {item}
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ scale: 0.8, y: 50, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.8, y: 50, opacity: 0 }}
                className="relative w-full max-w-sm bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 shadow-3xl text-center max-h-[92vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedCorrectGuess(null)}
                  className="absolute top-3.5 right-3.5 bg-slate-800 hover:bg-slate-700 p-1.5 rounded-full text-slate-400 hover:text-white cursor-pointer transition"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="bg-emerald-950/60 p-3 rounded-full border border-emerald-500/20 w-16 h-16 flex items-center justify-center mx-auto mb-4 text-emerald-400">
                  <Flame className="w-8 h-8 text-yellow-500 animate-bounce" />
                </div>

                <h3 className="font-display font-black text-lg uppercase text-yellow-400 tracking-tight">
                  Palpite Certeiro! 🔥
                </h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mb-4">
                  Garantido +{selectedCorrectGuess.pointsEarned} pontos
                </p>

                {/* Scoreboard visual */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 mb-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex flex-col items-center w-5/12">
                      {renderFlag(match.homeFlag, match.homeTeam)}
                      <span className="text-[11px] font-bold text-slate-300 mt-1 truncate max-w-[80px]">{match.homeTeam}</span>
                    </div>
                    <div className="w-2/12 font-black text-lg text-emerald-450 font-mono text-center">
                      {match.homeScore}x{match.awayScore}
                    </div>
                    <div className="flex flex-col items-center w-5/12">
                      {renderFlag(match.awayFlag, match.awayTeam)}
                      <span className="text-[11px] font-bold text-slate-300 mt-1 truncate max-w-[80px]">{match.awayTeam}</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 border-t border-slate-900 pt-2 font-semibold">
                    Seu palpite: <span className="text-white font-mono font-black">{selectedCorrectGuess.homeScore} x {selectedCorrectGuess.awayScore}</span>
                  </div>
                </div>

                {/* Creative layout preview */}
                <div className="border border-slate-800 rounded-2xl p-4 bg-radial from-emerald-950/40 via-slate-950 to-slate-950 text-left mb-5 relative overflow-hidden">
                  <div className="absolute top-2 right-2 text-[9px] font-bold text-yellow-500 font-mono uppercase bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded">
                    Stories 9:16
                  </div>
                  <h4 className="text-[11px] font-bold text-slate-200 uppercase mb-2">Card de Vitória</h4>
                  <div className="border border-emerald-900/60 p-3.5 rounded-xl bg-slate-900/50 flex flex-col justify-between aspect-[9/16] max-h-[140px] text-[8px] font-semibold text-slate-450 uppercase tracking-tight">
                    <div className="flex items-center justify-between border-b border-slate-800/80 pb-1">
                      <span>COPA 2026</span>
                      <span className="text-yellow-400 font-black">🎯 CERTEIRO!</span>
                    </div>
                    <div className="flex items-center justify-around my-1 font-mono text-white text-[11px] font-bold">
                      <span>{match.homeTeam}</span>
                      <span className="text-yellow-500 font-black">{match.homeScore}x{match.awayScore}</span>
                      <span>{match.awayTeam}</span>
                    </div>
                    <div className="text-center bg-emerald-900/20 py-1 rounded text-emerald-450 font-bold border border-emerald-500/10">
                      RANKING: {userRank ? `${userRank}º LUGAR` : 'CLASS.'} ({userPoints} PTS)
                    </div>
                  </div>
                </div>

                {/* Share/Actions block */}
                <div className="space-y-2.5">
                  <button
                    onClick={handleDownloadCard}
                    className="w-full bg-linear-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold text-xs uppercase py-3.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
                  >
                    💾 Baixar Imagem para Stories / Status
                  </button>

                  <button
                    onClick={handleCopyText}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-slate-250 font-bold text-xs uppercase py-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                  >
                    📋 Copiar Texto de Vitória
                  </button>
                  
                  <button
                    onClick={() => setSelectedCorrectGuess(null)}
                    className="w-full bg-slate-950 hover:bg-slate-900 text-slate-400 font-bold text-xs uppercase py-3 rounded-xl transition cursor-pointer border border-slate-900"
                  >
                    Voltar
                  </button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
