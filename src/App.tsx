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
  
  const [newHomeTeam, setNewHomeTeam] = useState('');
  const [newAwayTeam, setNewAwayTeam] = useState('');
  const [newHomeFlag, setNewHomeFlag] = useState('🇧🇷');
  const [newAwayFlag, setNewAwayFlag] = useState('🇦🇷');
  const [isSyncingMatches, setIsSyncingMatches] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; isError?: boolean } | null>(null);

  // Match tab rotation state: 'results' (últimos jogos), 'upcoming' (próximos jogos), 'brazil' (jogos do Brasil)
  const [matchTab, setMatchTab] = useState<'results' | 'upcoming' | 'brazil'>('upcoming');
  const [rotationProgress, setRotationProgress] = useState(0);

  // Filter matches based on the selected tab
  const filteredMatches = useMemo(() => {
    if (!appState?.matches) return [];
    const allMatches = [...appState.matches];

    // Helper to get YYYY-MM-DD local format to avoid timezone offsets and regional formatting discrepancies
    const getLocalDateString = (isoString: string) => {
      const d = new Date(isoString.replace('Z', ''));
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const getLocalDateStringFromDate = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayObj = new Date();
    const todayStr = getLocalDateStringFromDate(todayObj);

    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayStr = getLocalDateStringFromDate(yesterdayObj);

    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrowStr = getLocalDateStringFromDate(tomorrowObj);
    
    switch (matchTab) {
      case 'results':
        // Show ONLY matches of the previous day (yesterday)
        return allMatches
          .filter(m => getLocalDateString(m.dateTime) === yesterdayStr)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
      
      case 'upcoming':
        // Show ONLY matches of the current day (today)
        return allMatches
          .filter(m => getLocalDateString(m.dateTime) === todayStr)
          .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
          
      case 'brazil':
        // Show ONLY matches of the following day (tomorrow)
        return allMatches
          .filter(m => getLocalDateString(m.dateTime) === tomorrowStr)
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
        setMobileMessage({ text: 'Palpite enviado com sucesso! Veja na TV!', type: 'success' });
        
        // Auto clear message after 4s
        setTimeout(() => setMobileMessage(null), 4000);
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

  const nextMatches = appState?.matches.filter(m => m.status !== 'finished') || [];
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
                appState?.participants.slice(0, 8).map((p, index) => {
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
                      transition={{ delay: index * 0.08 }}
                      className="bg-slate-950/50 hover:bg-slate-900/80 px-3 py-2.5 rounded-lg border border-slate-900 flex items-center justify-between transition-colors duration-150"
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`w-9 h-9 rounded-md font-display font-black text-base flex items-center justify-center shrink-0 ${index < 3 ? placeColors[index] : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                          {index + 1}º
                        </div>
                        {/* Name & Stats */}
                        <div>
                          <div className="font-extrabold text-slate-100 flex items-center gap-1.5 text-base">
                            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: p.avatarColor }} />
                            {p.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-400 font-mono mt-0.5">
                            <span>{p.exactScores} Placar Cheio ({appState?.rules?.exactScore ?? 10} pts)</span>
                            <span className="text-slate-650">•</span>
                            <span>{p.correctWinners} Vencedores ({appState?.rules?.winnerOnly ?? 5} pts)</span>
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
                })
              )}
            </div>

            {/* Rules explanation card footer */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 bg-slate-950/40 -mx-4 -mb-4 px-4 py-2.5">
              <h3 className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
                COMO PONTUAR (REGULAMENTO ADAPTADO)
              </h3>
              <div className="grid grid-cols-2 gap-1.5 text-[9px] text-slate-400 font-mono">
                <div className="bg-slate-900/50 p-1 rounded border border-slate-800/80">
                  <span className="text-emerald-400 font-bold">{appState?.rules?.exactScore ?? 10} pts:</span> Placar Cheio
                </div>
                <div className="bg-slate-900/50 p-1 rounded border border-slate-800/80">
                  <span className="text-yellow-400 font-bold">{appState?.rules?.winnerAndDiff ?? 7} pts:</span> Vencedor + Saldo
                </div>
                <div className="bg-slate-900/50 p-1 rounded border border-slate-800/80">
                  <span className="text-emerald-300 font-bold">{appState?.rules?.winnerOnly ?? 5} pts:</span> Vencedor apenas
                </div>
                <div className="bg-slate-900/50 p-1 rounded border border-slate-800/80">
                  <span className="text-slate-400 font-bold">{appState?.rules?.oneTeamScore ?? 2} pts:</span> Gol de 1 time
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: THE GRAND QR CODE CENTERPIECE (4 cols) */}
          <div className="col-span-4 flex flex-col justify-between items-center h-full gap-3 py-1 relative">
            
            {/* Top info tag */}
            <div className="bg-slate-900/80 border border-emerald-500/30 px-4 py-1.5 rounded-xl backdrop-blur-md text-center max-w-xs animate-pulse">
              <p className="text-[11px] font-display font-black tracking-widest uppercase text-yellow-400">
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
                      ? 'Nenhuma partida realizada no dia de ontem.'
                      : matchTab === 'upcoming'
                      ? 'Nenhuma partida agendada para o dia de hoje.'
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
                        {new Date(match.dateTime.replace('Z', '')).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} às {new Date(match.dateTime.replace('Z', '')).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • 2026
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

            {/* Quick TV controller trigger block */}
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
                    className={`px-3 py-2.5 rounded-xl border font-bold text-xs shrink-0 flex items-center gap-2 transition ${selectedMatchForGuess === m.id ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-700/20' : 'bg-slate-950/60 text-slate-400 border-slate-900 hover:bg-slate-900'}`}
                  >
                    <div className="flex items-center gap-1 shrink-0">
                      {renderFlag(m.homeFlag, m.homeTeam)}
                      <span className="text-[10px] text-slate-500 font-normal mx-0.5">vs</span>
                      {renderFlag(m.awayFlag, m.awayTeam)}
                    </div>
                    <span className="text-[9px] font-mono bg-slate-900/60 px-1.5 py-0.5 rounded text-slate-300">
                      {m.homeTeam}
                    </span>
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
                        {new Date(activeMatch.dateTime.replace('Z', '')).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} às {new Date(activeMatch.dateTime.replace('Z', '')).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • 2026
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

    </div>
  );
}
