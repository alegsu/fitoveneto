import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Settings, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Calendar,
  ChevronRight,
  Home,
  CheckSquare,
  Square,
  Info,
  RefreshCw
} from 'lucide-react';
import { fetchBulletinLinks, fetchBulletinText } from './services/scraper';
import type { BulletinLink } from './services/scraper';
import { parseBulletinText, extractCalendarTasks } from './services/pdfParser';
import type { BulletinContent, CategorySection, CalendarTask } from './services/pdfParser';

type Screen = 'home' | 'list' | 'detail' | 'calendar' | 'settings';

export default function App() {
  // Accessibilità ed impostazioni
  const [zoom, setZoom] = useState<number>(() => {
    const cached = localStorage.getItem('app_zoom');
    return cached ? parseFloat(cached) : 1.25; // Default 125% per anziani
  });

  // Coltivazioni seguite (Personalizzazione)
  const [followedCrops, setFollowedCrops] = useState<{ frutta: boolean; orto: boolean; olivo: boolean }>(() => {
    const cached = localStorage.getItem('followed_crops');
    return cached ? JSON.parse(cached) : { frutta: true, orto: true, olivo: true };
  });

  // Navigazione e Dati
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedType, setSelectedType] = useState<'frutta' | 'orto' | 'olivo' | null>(null);
  const [links, setLinks] = useState<BulletinLink[]>([]);
  const [selectedLink, setSelectedLink] = useState<BulletinLink | null>(null);
  const [bulletin, setBulletin] = useState<BulletinContent | null>(null);
  
  // Calendario "Cose da Fare"
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState<boolean>(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => {
    const cached = localStorage.getItem('completed_tasks');
    return cached ? new Set(JSON.parse(cached)) : new Set();
  });
  
  // Stati UI
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [calendarFilter, setCalendarFilter] = useState<'tutte' | 'frutta' | 'orto' | 'olivo'>('tutte');
  const [calendarStatusFilter, setCalendarStatusFilter] = useState<'da_fare' | 'completate'>('da_fare');
  const [offlineLinks, setOfflineLinks] = useState<boolean>(false);

  // Caricamento zoom su stile root
  useEffect(() => {
    document.documentElement.style.setProperty('--text-zoom', zoom.toString());
    localStorage.setItem('app_zoom', zoom.toString());
  }, [zoom]);

  // Salva preferenze coltivazioni seguite e rigenera scadenziario
  useEffect(() => {
    localStorage.setItem('followed_crops', JSON.stringify(followedCrops));
    if (links.length > 0) {
      buildCalendar(links);
    }
  }, [followedCrops]);

  // Caricamento iniziale dei link dal sito o dalla cache
  useEffect(() => {
    loadLinksAndSetupTasks();
  }, []);

  const loadLinksAndSetupTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedLinks = await fetchBulletinLinks();
      setLinks(fetchedLinks);
      localStorage.setItem('cached_bulletin_links', JSON.stringify(fetchedLinks));
      setOfflineLinks(false);
      
      // Carica i compiti del calendario dopo che i link sono disponibili
      await buildCalendar(fetchedLinks);
    } catch (err) {
      console.warn("Failed to fetch links, loading from cache...", err);
      const cached = localStorage.getItem('cached_bulletin_links');
      if (cached) {
        const parsedLinks = JSON.parse(cached);
        setLinks(parsedLinks);
        setOfflineLinks(true);
        await buildCalendar(parsedLinks);
      } else {
        setError("Impossibile caricare l'elenco dei bollettini. Controlla la connessione internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Costruisce lo scadenziario dagli ultimi 3 bollettini per ciascuna categoria seguita
  const buildCalendar = async (bulletinLinks: BulletinLink[]) => {
    setLoadingCalendar(true);
    const tasksAccumulator: CalendarTask[] = [];

    const types: ('frutta' | 'orto' | 'olivo')[] = ['frutta', 'orto', 'olivo'];
    
    for (const t of types) {
      // Se non seguiamo questa coltura, saltiamo l'estrazione per questa categoria
      if (!followedCrops[t]) continue;

      const typeLinks = bulletinLinks.filter(l => l.type === t).slice(0, 3);
      
      for (const link of typeLinks) {
        const cacheKey = `bulletin_cache_${link.id}`;
        let parsedBulletin: BulletinContent | null = null;
        
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          parsedBulletin = JSON.parse(cachedData);
        } else {
          // Scarica l'ultimo se manca
          if (typeLinks.indexOf(link) === 0) {
            try {
              const rawText = await fetchBulletinText(link);
              parsedBulletin = parseBulletinText(rawText, link.type, link.id);
              localStorage.setItem(cacheKey, JSON.stringify(parsedBulletin));
            } catch (e) {
              console.warn(`Background fetch failed for ${link.id}:`, e);
            }
          }
        }

        if (parsedBulletin) {
          const extracted = extractCalendarTasks(parsedBulletin, link.type);
          extracted.forEach(task => {
            task.completed = completedTaskIds.has(task.id);
            tasksAccumulator.push(task);
          });
        }
      }
    }

    setCalendarTasks(tasksAccumulator);
    setLoadingCalendar(false);
  };

  // Aggiornamento forzato
  const forceUpdateCalendar = async () => {
    setLoadingCalendar(true);
    const tasksAccumulator: CalendarTask[] = [];
    const types: ('frutta' | 'orto' | 'olivo')[] = ['frutta', 'orto', 'olivo'];
    
    for (const t of types) {
      if (!followedCrops[t]) continue;

      const typeLinks = links.filter(l => l.type === t).slice(0, 3);
      
      for (const link of typeLinks) {
        const cacheKey = `bulletin_cache_${link.id}`;
        let parsedBulletin: BulletinContent | null = null;
        
        try {
          const rawText = await fetchBulletinText(link);
          parsedBulletin = parseBulletinText(rawText, link.type, link.id);
          localStorage.setItem(cacheKey, JSON.stringify(parsedBulletin));
        } catch (e) {
          console.warn(`Force fetch failed for ${link.id}:`, e);
          const cachedData = localStorage.getItem(cacheKey);
          if (cachedData) {
            parsedBulletin = JSON.parse(cachedData);
          }
        }

        if (parsedBulletin) {
          const extracted = extractCalendarTasks(parsedBulletin, link.type);
          extracted.forEach(task => {
            task.completed = completedTaskIds.has(task.id);
            tasksAccumulator.push(task);
          });
        }
      }
    }

    setCalendarTasks(tasksAccumulator);
    setLoadingCalendar(false);
  };

  const handleSelectType = (type: 'frutta' | 'orto' | 'olivo') => {
    setSelectedType(type);
    setScreen('list');
    setSearchQuery('');
  };

  const handleSelectBulletin = async (link: BulletinLink) => {
    setSelectedLink(link);
    setLoading(true);
    setError(null);
    setScreen('detail');
    setSearchQuery('');

    const cacheKey = `bulletin_cache_${link.id}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      setBulletin(JSON.parse(cachedData));
      setLoading(false);
      return;
    }

    try {
      const rawText = await fetchBulletinText(link);
      const parsed = parseBulletinText(rawText, link.type, link.id);
      setBulletin(parsed);
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
      buildCalendar(links);
    } catch (err) {
      console.error(err);
      setError("Impossibile scaricare o elaborare il bollettino fitosanitario.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskCompleted = (taskId: string) => {
    const newSet = new Set(completedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setCompletedTaskIds(newSet);
    localStorage.setItem('completed_tasks', JSON.stringify(Array.from(newSet)));

    setCalendarTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: newSet.has(taskId) } : task
      )
    );
  };

  // Modifica le preferenze per le colture seguite (minimo 1 attiva)
  const toggleCropFollowed = (crop: 'frutta' | 'orto' | 'olivo') => {
    const activeCount = Object.values(followedCrops).filter(Boolean).length;
    if (activeCount === 1 && followedCrops[crop]) {
      alert("Devi seguire almeno un tipo di coltivazione!");
      return;
    }
    setFollowedCrops(prev => ({
      ...prev,
      [crop]: !prev[crop]
    }));
  };

  // Filtra i link per tipologia
  const filteredLinks = links.filter(l => l.type === selectedType);

  // Filtra il contenuto del bollettino
  const getFilteredCategories = (): CategorySection[] => {
    if (!bulletin) return [];
    if (!searchQuery.trim()) return bulletin.categories;

    const query = searchQuery.toLowerCase();
    return bulletin.categories.filter(cat => {
      if (cat.name.toLowerCase().includes(query)) return true;
      return cat.details.some(det => 
        det.title.toLowerCase().includes(query) || 
        det.content.toLowerCase().includes(query)
      );
    });
  };

  // Filtra i compiti del calendario (solo se seguiamo quella coltura)
  const getFilteredCalendarTasks = (): CalendarTask[] => {
    let filtered = calendarTasks;

    // Filtra per colture seguite
    filtered = filtered.filter(t => followedCrops[t.categoryType]);

    // Filtra per tipologia attiva nel filtro calendario
    if (calendarFilter !== 'tutte') {
      filtered = filtered.filter(t => t.categoryType === calendarFilter);
    }

    // Filtra per stato (Completati vs Da Fare)
    if (calendarStatusFilter === 'da_fare') {
      filtered = filtered.filter(t => !t.completed);
    } else {
      filtered = filtered.filter(t => t.completed);
    }

    const priority = { danger: 1, warning: 2, info: 3 };
    return filtered.sort((a, b) => priority[a.alertLevel] - priority[b.alertLevel]);
  };

  // Renderizza allarmi ed icone
  const renderAlertIcon = (level: 'info' | 'warning' | 'danger') => {
    switch(level) {
      case 'danger':
        return <AlertCircle size={32} style={{ color: 'var(--danger-color)' }} />;
      case 'warning':
        return <AlertTriangle size={32} style={{ color: 'var(--warning-color)' }} />;
      case 'info':
      default:
        return <CheckCircle size={32} style={{ color: 'var(--success-color)' }} />;
    }
  };

  const getAlertBadge = (level: 'info' | 'warning' | 'danger') => {
    switch(level) {
      case 'danger':
        return <span className="badge danger">🚨 Pericolo</span>;
      case 'warning':
        return <span className="badge warning">⚠️ Attenzione</span>;
      case 'info':
      default:
        return <span className="badge info">✅ OK</span>;
    }
  };

  return (
    <>
      {/* 1. BARRA DI INTESTAZIONE (Semplificata, senza icone di ridimensionamento) */}
      <header className="access-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem', color: 'var(--brand-primary)', fontWeight: 'bold' }}>FitoVeneto 🌾</h2>
        <button 
          className="btn-icon-only" 
          onClick={() => setScreen('settings')}
          title="Opzioni"
          style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
        >
          <Settings size={24} />
        </button>
      </header>

      {/* Banner offline */}
      {offlineLinks && (
        <div className="offline-banner">
          ⚠️ Modalità Offline: Dati caricati dalla memoria del telefono
        </div>
      )}

      {/* Area Contenuti */}
      <main style={{ flex: 1, paddingBottom: '90px', display: 'flex', flexDirection: 'column' }}>

        {/* 2. SCHERMATA: HOME */}
        {screen === 'home' && (
          <div className="app-content">
            <div className="app-header" style={{ borderRadius: '24px', marginBottom: '24px' }}>
              <h1>FitoVeneto 🌾</h1>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                Bollettini fitosanitari della Regione Veneto. Semplice e chiaro, per coltivare in sicurezza.
              </p>
            </div>

            <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Cosa vuoi controllare oggi?</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Mostra solo i pulsanti per le colture seguite */}
              {followedCrops.frutta && (
                <button className="btn-large btn-frutta" onClick={() => handleSelectType('frutta')}>
                  <span style={{ fontSize: '2.5rem' }}>🍎</span>
                  <div>
                    <h3 style={{ margin: 0 }}>FRUTTETO</h3>
                    <small style={{ color: 'var(--text-secondary)' }}>Melo, Pero, Pesco, Ciliegio, ecc.</small>
                  </div>
                </button>
              )}

              {followedCrops.orto && (
                <button className="btn-large btn-orto" onClick={() => handleSelectType('orto')}>
                  <span style={{ fontSize: '2.5rem' }}>🥬</span>
                  <div>
                    <h3 style={{ margin: 0 }}>ORTO</h3>
                    <small style={{ color: 'var(--text-secondary)' }}>Patate, Pomodoro, Cipolla, ecc.</small>
                  </div>
                </button>
              )}

              {followedCrops.olivo && (
                <button className="btn-large btn-olivo" onClick={() => handleSelectType('olivo')}>
                  <span style={{ fontSize: '2.5rem' }}>🫒</span>
                  <div>
                    <h3 style={{ margin: 0 }}>OLIVETO</h3>
                    <small style={{ color: 'var(--text-secondary)' }}>Olivo e difesa delle olive</small>
                  </div>
                </button>
              )}

              <button 
                className="btn-large btn-primary" 
                onClick={() => setScreen('calendar')}
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))' }}
              >
                <Calendar size={36} />
                <div>
                  <h3 style={{ margin: 0, color: '#fff' }}>COSE DA FARE</h3>
                  <small style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Scadenziario compiti da fare</small>
                </div>
              </button>
            </div>

            <div className="card" style={{ marginTop: '30px', textAlign: 'center', backgroundColor: 'var(--brand-primary-light)', borderColor: 'var(--brand-accent)' }}>
              <Info size={36} style={{ color: 'var(--brand-accent)', marginBottom: '8px' }} />
              <h3 style={{ color: 'var(--brand-primary)' }}>Come usare questa app</h3>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                1. Scegli il tuo tipo di coltivazione.<br />
                2. Tocca l'ultimo bollettino per leggerlo.<br />
                3. Vai su **"Cose da Fare"** 📅 per vedere la tua agenda di compiti ed interventi.
              </p>
            </div>
          </div>
        )}

        {/* 3. SCHERMATA: LISTA BOLLETTINI */}
        {screen === 'list' && (
          <div className="app-content">
            <button className="btn-back" onClick={() => setScreen('home')}>
              <ArrowLeft size={28} /> Torna alla Home
            </button>

            <h1 style={{ textTransform: 'capitalize', marginBottom: '20px' }}>
              Bollettini {selectedType === 'frutta' ? 'Frutteto 🍎' : selectedType === 'orto' ? 'Orto 🥬' : 'Olivo 🫒'}
            </h1>

            {loading ? (
              <div className="empty-state">
                <h2>Caricamento in corso...</h2>
                <p>Sto scaricando gli ultimi aggiornamenti della Regione Veneto.</p>
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="empty-state">
                <h2>Nessun bollettino trovato</h2>
                <p>Non siamo riusciti a trovare bollettini per questa categoria.</p>
                <button className="btn-large btn-primary" onClick={loadLinksAndSetupTasks} style={{ marginTop: '20px' }}>
                  Riprova a caricare
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {filteredLinks.map((link) => (
                  <button 
                    key={link.id} 
                    className="btn-large btn-secondary"
                    onClick={() => handleSelectBulletin(link)}
                    style={{ justifyContent: 'space-between', paddingRight: '16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Calendar size={32} style={{ color: 'var(--brand-accent)' }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{link.title}</h3>
                        <small style={{ color: 'var(--text-secondary)' }}>Tocca per leggere</small>
                      </div>
                    </div>
                    <ChevronRight size={32} style={{ color: 'var(--border-color)' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. SCHERMATA: DETTAGLIO BOLLETTINO */}
        {screen === 'detail' && (
          <div className="app-content">
            <button className="btn-back" onClick={() => setScreen('list')}>
              <ArrowLeft size={28} /> Elenco Bollettini
            </button>

            {loading ? (
              <div className="empty-state">
                <h2>Apertura Bollettino...</h2>
                <p>Sto scaricando ed estraendo il testo dal documento PDF ufficiale.</p>
              </div>
            ) : error ? (
              <div className="card" style={{ borderColor: 'var(--danger-color)', textAlign: 'center' }}>
                <AlertCircle size={48} style={{ color: 'var(--danger-color)', marginBottom: '12px' }} />
                <h2>Si è verificato un errore</h2>
                <p>{error}</p>
                <button 
                  className="btn-large btn-primary" 
                  onClick={() => selectedLink && handleSelectBulletin(selectedLink)}
                  style={{ marginTop: '16px' }}
                >
                  Riprova a scaricare
                </button>
              </div>
            ) : bulletin ? (
              <div>
                <div style={{ marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="badge info" style={{ marginBottom: '8px' }}>
                    {selectedType === 'frutta' ? '🍎 Frutta' : selectedType === 'orto' ? '🥬 Orto' : '🫒 Olivo'}
                  </span>
                  <h1 style={{ fontSize: 'calc(1.8rem * var(--text-zoom))' }}>{bulletin.title}</h1>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Aggiornato al: {bulletin.date}</p>
                </div>

                <div className="search-wrapper">
                  <Search className="search-icon" size={24} />
                  <input 
                    type="text" 
                    className="search-input"
                    placeholder="Cerca pianta o malattia (es: patata, peronospora)..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {bulletin.intro && !searchQuery && (
                  <div className="card" style={{ backgroundColor: 'var(--brand-primary-light)', borderLeft: '6px solid var(--brand-accent)' }}>
                    <h3 style={{ color: 'var(--brand-primary)' }}>Previsioni Meteo / Nota Generale</h3>
                    <p style={{ fontSize: 'calc(1.1rem * var(--text-zoom))' }}>{bulletin.intro}</p>
                  </div>
                )}

                <div style={{ marginTop: '20px' }}>
                  {getFilteredCategories().length === 0 ? (
                    <div className="empty-state">
                      <h3>Nessun risultato per "{searchQuery}"</h3>
                      <p>Controlla l'ortografia o prova un'altra parola.</p>
                    </div>
                  ) : (
                    getFilteredCategories().map((cat, catIdx) => (
                      <div key={catIdx} className="card" style={{ padding: '20px' }}>
                        <div style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                          <h2 style={{ margin: 0, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                            {selectedType === 'olivo' ? '🫒 OLIVO' : cat.name}
                          </h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {cat.details.map((det, detIdx) => (
                            <div key={detIdx} className={`threat-card ${det.alertLevel}`}>
                              <div className="threat-header">
                                {renderAlertIcon(det.alertLevel)}
                                <h3 style={{ margin: 0, flex: 1, fontSize: 'calc(1.2rem * var(--text-zoom))' }}>
                                  {det.title}
                                </h3>
                                {getAlertBadge(det.alertLevel)}
                              </div>
                              <p style={{ marginTop: '8px', fontSize: 'calc(1.1rem * var(--text-zoom))', color: 'var(--text-primary)', textAlign: 'left' }}>
                                {det.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div style={{ marginTop: '30px', textAlign: 'center' }}>
                  <a 
                    href={selectedLink?.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn-large btn-secondary"
                    style={{ display: 'inline-flex', width: 'auto', textDecoration: 'none', justifyContent: 'center' }}
                  >
                    📄 Apri PDF Originale Veneto
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* 5. SCHERMATA: CALENDARIO / SCADENZIARIO COSE DA FARE */}
        {screen === 'calendar' && (
          <div className="app-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h1>Cose da Fare 📅</h1>
              <button 
                className="btn-icon-only" 
                onClick={forceUpdateCalendar} 
                title="Aggiorna Scadenzario"
                disabled={loadingCalendar}
                style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)' }}
              >
                <RefreshCw size={24} className={loadingCalendar ? 'pulse-recording' : ''} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Agenda delle attività e dei trattamenti estratti in tempo reale dagli <strong>ultimi 3 bollettini</strong> per ciascuna coltura seguita.
            </p>

            {/* Filtro Tipologia Coltura (Mostra solo le colture seguite) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
              <button 
                className={`btn-icon-only ${calendarFilter === 'tutte' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('tutte')}
                style={{ minWidth: '80px', fontSize: '1rem', fontWeight: 'bold' }}
              >
                Tutte
              </button>
              
              {followedCrops.frutta && (
                <button 
                  className={`btn-icon-only ${calendarFilter === 'frutta' ? 'active' : ''}`}
                  onClick={() => setCalendarFilter('frutta')}
                  style={{ minWidth: '100px', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  🍎 Frutta
                </button>
              )}

              {followedCrops.orto && (
                <button 
                  className={`btn-icon-only ${calendarFilter === 'orto' ? 'active' : ''}`}
                  onClick={() => setCalendarFilter('orto')}
                  style={{ minWidth: '100px', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  🥬 Orto
                </button>
              )}

              {followedCrops.olivo && (
                <button 
                  className={`btn-icon-only ${calendarFilter === 'olivo' ? 'active' : ''}`}
                  onClick={() => setCalendarFilter('olivo')}
                  style={{ minWidth: '100px', fontSize: '1rem', fontWeight: 'bold' }}
                >
                  🫒 Olivo
                </button>
              )}
            </div>

            {/* Filtro Stato (Da fare vs Completate) */}
            <div style={{ display: 'flex', border: '2px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              <button 
                style={{ 
                  flex: 1, 
                  height: '50px', 
                  border: 'none', 
                  fontWeight: 'bold',
                  backgroundColor: calendarStatusFilter === 'da_fare' ? 'var(--brand-primary)' : 'var(--bg-card)',
                  color: calendarStatusFilter === 'da_fare' ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                onClick={() => setCalendarStatusFilter('da_fare')}
              >
                Da Fare ({getFilteredCalendarTasks().filter(t => !t.completed).length})
              </button>
              <button 
                style={{ 
                  flex: 1, 
                  height: '50px', 
                  border: 'none', 
                  fontWeight: 'bold',
                  backgroundColor: calendarStatusFilter === 'completate' ? 'var(--brand-primary)' : 'var(--bg-card)',
                  color: calendarStatusFilter === 'completate' ? '#ffffff' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
                onClick={() => setCalendarStatusFilter('completate')}
              >
                Fatte ({getFilteredCalendarTasks().filter(t => t.completed).length})
              </button>
            </div>

            {loadingCalendar ? (
              <div className="empty-state">
                <h2>Elaborazione attività...</h2>
                <p>Sto analizzando il testo degli ultimi bollettini della Regione per estrarre le istruzioni.</p>
              </div>
            ) : getFilteredCalendarTasks().length === 0 ? (
              <div className="empty-state">
                <h3>Nessuna attività in questo elenco</h3>
                <p>
                  {calendarStatusFilter === 'da_fare' 
                    ? "Tutte le attività risultano completate! Ottimo lavoro." 
                    : "Non hai ancora segnato nessuna attività come completata."}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {getFilteredCalendarTasks().map((task) => (
                  <div 
                    key={task.id} 
                    className={`card ${task.alertLevel}`} 
                    style={{ 
                      borderLeft: `10px solid var(--${task.alertLevel === 'danger' ? 'danger' : task.alertLevel === 'warning' ? 'warning' : 'success'}-color)`,
                      padding: '20px',
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start'
                    }}
                  >
                    <button 
                      onClick={() => toggleTaskCompleted(task.id)}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: 0,
                        marginTop: '4px',
                        color: task.completed ? 'var(--success-color)' : 'var(--text-secondary)'
                      }}
                      title={task.completed ? "Segna come da fare" : "Segna come completato"}
                    >
                      {task.completed 
                        ? <CheckSquare size={36} style={{ color: 'var(--success-color)' }} />
                        : <Square size={36} />
                      }
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                        <span className="badge info" style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {task.categoryType === 'frutta' ? '🍎' : task.categoryType === 'orto' ? '🥬' : '🫒'} {task.plant}
                        </span>
                        
                        <span 
                          className={`badge ${task.alertLevel}`} 
                          style={{ 
                            backgroundColor: 'transparent', 
                            border: `2px solid var(--${task.alertLevel === 'danger' ? 'danger' : task.alertLevel === 'warning' ? 'warning' : 'success'}-color)`,
                            color: `var(--${task.alertLevel === 'danger' ? 'danger' : task.alertLevel === 'warning' ? 'warning' : 'success'}-color)`
                          }}
                        >
                          🕒 {task.deadline}
                        </span>
                      </div>

                      <h3 style={{ margin: '8px 0', fontSize: 'calc(1.15rem * var(--text-zoom))', textAlign: 'left', fontWeight: 'bold' }}>
                        Avversità: {task.disease}
                      </h3>
                      <p style={{ fontSize: 'calc(1.05rem * var(--text-zoom))', color: 'var(--text-primary)', textAlign: 'left', marginBottom: '12px' }}>
                        {task.task}
                      </p>

                      <small style={{ color: 'var(--text-secondary)', display: 'block', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                        Fonte: <strong>{task.bulletinTitle}</strong> del {task.bulletinDate}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 6. SCHERMATA: IMPOSTAZIONI */}
        {screen === 'settings' && (
          <div className="app-content">
            <button className="btn-back" onClick={() => setScreen('home')}>
              <ArrowLeft size={28} /> Torna alla Home
            </button>

            <h1>Impostazioni ⚙️</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Personalizza l'applicazione per renderla più comoda da usare.
            </p>

            {/* Sezione Dimensione Caratteri (Dropdown / Tendina di scelta) */}
            <div className="card">
              <h2>Dimensione dei testi</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Scegli la grandezza del testo dal menu a tendina:
              </p>
              
              <div style={{ position: 'relative' }}>
                <select 
                  id="zoom-select"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  style={{ 
                    width: '100%', 
                    height: '64px', 
                    fontSize: '1.25rem', 
                    borderRadius: '16px', 
                    border: '3px solid var(--border-color)',
                    padding: '0 16px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'3\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'/%3e%3c/svg%3e")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    backgroundSize: '24px'
                  }}
                >
                  <option value="1.0">Testo Standard (100%)</option>
                  <option value="1.25">Testo Grande (125%)</option>
                  <option value="1.6">Testo Molto Grande (160%)</option>
                  <option value="2.0">Testo Gigante (200%)</option>
                </select>
              </div>
            </div>

            {/* Sezione Coltivazioni Seguite (Scelta colture da seguire) */}
            <div className="card">
              <h2>Coltivazioni Seguite</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Seleziona quali tipi di coltivazione ti interessano. Disattivando una voce, non la vedrai nella Home o nelle Cose da Fare:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="btn-large" 
                  onClick={() => toggleCropFollowed('frutta')}
                  style={{
                    backgroundColor: followedCrops.frutta ? 'var(--color-frutta-bg)' : 'var(--bg-card)',
                    color: followedCrops.frutta ? 'var(--color-frutta)' : 'var(--text-secondary)',
                    borderColor: followedCrops.frutta ? 'var(--color-frutta)' : 'var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🍎</span> Frutteto (Mele, Pere, Pesco...)
                  </span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>
                    {followedCrops.frutta ? '☑️' : '⬛'}
                  </span>
                </button>

                <button 
                  className="btn-large" 
                  onClick={() => toggleCropFollowed('orto')}
                  style={{
                    backgroundColor: followedCrops.orto ? 'var(--color-orto-bg)' : 'var(--bg-card)',
                    color: followedCrops.orto ? 'var(--color-orto)' : 'var(--text-secondary)',
                    borderColor: followedCrops.orto ? 'var(--color-orto)' : 'var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🥬</span> Orto (Patate, Pomodoro...)
                  </span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>
                    {followedCrops.orto ? '☑️' : '⬛'}
                  </span>
                </button>

                <button 
                  className="btn-large" 
                  onClick={() => toggleCropFollowed('olivo')}
                  style={{
                    backgroundColor: followedCrops.olivo ? 'var(--color-olivo-bg)' : 'var(--bg-card)',
                    color: followedCrops.olivo ? 'var(--color-olivo)' : 'var(--text-secondary)',
                    borderColor: followedCrops.olivo ? 'var(--color-olivo)' : 'var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>🫒</span> Oliveto (Olivi e difesa olive)
                  </span>
                  <span style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>
                    {followedCrops.olivo ? '☑️' : '⬛'}
                  </span>
                </button>
              </div>
            </div>

            {/* Sezione Informazioni */}
            <div className="card" style={{ backgroundColor: 'var(--brand-primary-light)', borderColor: 'var(--brand-accent)' }}>
              <h2 style={{ color: 'var(--brand-primary)' }}>Informazioni sull'applicazione</h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Questa app raccoglie i bollettini ufficiali pubblicati sul portale della **Regione Veneto**. L'estrazione e il riassunto sono eseguiti in locale sul dispositivo.
              </p>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Sviluppato per supportare i piccoli produttori agricoli e i pensionati del territorio veneto nella difesa integrata delle colture.
              </p>
              <p style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--brand-primary)', marginTop: '12px' }}>
                Versione 1.2.0 (Play Store AAB ready)
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 7. BOTTOM NAVIGATION BAR */}
      <nav 
        style={{ 
          position: 'fixed', 
          bottom: 0, 
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '600px',
          height: '80px', 
          backgroundColor: 'var(--bg-card)', 
          borderTop: '3px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          zIndex: 1000,
          boxShadow: '0 -4px 10px rgba(0,0,0,0.06)'
        }}
      >
        <button 
          onClick={() => setScreen('home')}
          style={{ 
            background: 'none', 
            border: 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: screen === 'home' || screen === 'list' || screen === 'detail' ? 'var(--brand-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            flex: 1,
            height: '100%'
          }}
        >
          <Home size={28} />
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '4px' }}>Home</span>
        </button>

        <button 
          onClick={() => setScreen('calendar')}
          style={{ 
            background: 'none', 
            border: 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: screen === 'calendar' ? 'var(--brand-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            flex: 1,
            height: '100%'
          }}
        >
          <Calendar size={28} />
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '4px' }}>Cose da Fare</span>
        </button>

        <button 
          onClick={() => setScreen('settings')}
          style={{ 
            background: 'none', 
            border: 'none', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: screen === 'settings' ? 'var(--brand-accent)' : 'var(--text-secondary)',
            cursor: 'pointer',
            flex: 1,
            height: '100%'
          }}
        >
          <Settings size={28} />
          <span style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '4px' }}>Opzioni</span>
        </button>
      </nav>
    </>
  );
}
