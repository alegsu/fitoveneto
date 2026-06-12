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

  // Costruisce lo scadenziario dagli ultimi 3 bollettini di ogni categoria (totale 9 bollettini max)
  const buildCalendar = async (bulletinLinks: BulletinLink[]) => {
    setLoadingCalendar(true);
    const tasksAccumulator: CalendarTask[] = [];

    // Raggruppiamo i link per tipo e prendiamo gli ultimi 3 per tipo
    const types: ('frutta' | 'orto' | 'olivo')[] = ['frutta', 'orto', 'olivo'];
    
    for (const t of types) {
      const typeLinks = bulletinLinks.filter(l => l.type === t).slice(0, 3);
      
      for (const link of typeLinks) {
        const cacheKey = `bulletin_cache_${link.id}`;
        let parsedBulletin: BulletinContent | null = null;
        
        // Controlla se il bollettino è in cache
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          parsedBulletin = JSON.parse(cachedData);
        } else {
          // Se non è in cache ed è il più recente di questa categoria (indice 0), 
          // proviamo a scaricarlo in background per non avere il calendario vuoto all'avvio.
          // Altrimenti saltiamo per evitare 9 richieste HTTP sincrone bloccanti.
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
            // Controlla se è stato completato dall'utente
            task.completed = completedTaskIds.has(task.id);
            tasksAccumulator.push(task);
          });
        }
      }
    }

    setCalendarTasks(tasksAccumulator);
    setLoadingCalendar(false);
  };

  // Forza il download e aggiornamento di tutti i 9 bollettini per il calendario
  const forceUpdateCalendar = async () => {
    setLoadingCalendar(true);
    const tasksAccumulator: CalendarTask[] = [];
    const types: ('frutta' | 'orto' | 'olivo')[] = ['frutta', 'orto', 'olivo'];
    
    for (const t of types) {
      const typeLinks = links.filter(l => l.type === t).slice(0, 3);
      
      for (const link of typeLinks) {
        const cacheKey = `bulletin_cache_${link.id}`;
        let parsedBulletin: BulletinContent | null = null;
        
        try {
          // fetch e parse reale
          const rawText = await fetchBulletinText(link);
          parsedBulletin = parseBulletinText(rawText, link.type, link.id);
          localStorage.setItem(cacheKey, JSON.stringify(parsedBulletin));
        } catch (e) {
          console.warn(`Force fetch failed for ${link.id}, using cache if available:`, e);
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
      
      // Rigeneriamo il calendario per includere questo bollettino appena scaricato
      buildCalendar(links);
    } catch (err) {
      console.error(err);
      setError("Impossibile scaricare o elaborare il bollettino fitosanitario.");
    } finally {
      setLoading(false);
    }
  };

  // Segna come completato o da fare
  const toggleTaskCompleted = (taskId: string) => {
    const newSet = new Set(completedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setCompletedTaskIds(newSet);
    localStorage.setItem('completed_tasks', JSON.stringify(Array.from(newSet)));

    // Aggiorna lo stato dei compiti locali
    setCalendarTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, completed: newSet.has(taskId) } : task
      )
    );
  };

  // Filtra i link per tipologia
  const filteredLinks = links.filter(l => l.type === selectedType);

  // Filtra il contenuto del bollettino in base alla barra di ricerca (per nome pianta o malattia)
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

  // Filtra i compiti del calendario
  const getFilteredCalendarTasks = (): CalendarTask[] => {
    let filtered = calendarTasks;

    // 1. Filtra per tipologia
    if (calendarFilter !== 'tutte') {
      filtered = filtered.filter(t => t.categoryType === calendarFilter);
    }

    // 2. Filtra per stato (Completati vs Da Fare)
    if (calendarStatusFilter === 'da_fare') {
      filtered = filtered.filter(t => !t.completed);
    } else {
      filtered = filtered.filter(t => t.completed);
    }

    // Ordina per urgenza (danger prima, poi warning, poi info)
    const priority = { danger: 1, warning: 2, info: 3 };
    return filtered.sort((a, b) => priority[a.alertLevel] - priority[b.alertLevel]);
  };

  // Renderizza l'icona e colore dell'allarme
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
      {/* 1. BARRA DI ACCESSIBILITÀ (Persistente in alto) */}
      <header className="access-bar">
        <div className="zoom-controls">
          <span className="zoom-label">Caratteri:</span>
          <button 
            className={`btn-icon-only ${zoom === 1.0 ? 'active' : ''}`}
            onClick={() => setZoom(1.0)}
            title="Caratteri Normali"
          >
            A
          </button>
          <button 
            className={`btn-icon-only ${zoom === 1.25 ? 'active' : ''}`}
            onClick={() => setZoom(1.25)}
            title="Caratteri Grandi"
            style={{ fontSize: '1.25rem', fontWeight: 'bold' }}
          >
            A+
          </button>
          <button 
            className={`btn-icon-only ${zoom === 1.6 ? 'active' : ''}`}
            onClick={() => setZoom(1.6)}
            title="Caratteri Molto Grandi"
            style={{ fontSize: '1.5rem', fontWeight: 'bold' }}
          >
            A++
          </button>
          <button 
            className={`btn-icon-only ${zoom === 2.0 ? 'active' : ''}`}
            onClick={() => setZoom(2.0)}
            title="Caratteri Massimi"
            style={{ fontSize: '1.75rem', fontWeight: 'bold' }}
          >
            A+++
          </button>
        </div>
        
        <button 
          className="btn-icon-only" 
          onClick={() => setScreen('settings')}
          title="Impostazioni"
        >
          <Settings size={28} />
        </button>
      </header>

      {/* Banner modalità offline se non riusciamo a connetterci */}
      {offlineLinks && (
        <div className="offline-banner">
          ⚠️ Modalità Offline: Dati caricati dalla memoria del telefono
        </div>
      )}

      {/* Spazio flessibile per scorrere i contenuti lasciando spazio per la bottom bar */}
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
              <button className="btn-large btn-frutta" onClick={() => handleSelectType('frutta')}>
                <span style={{ fontSize: '2.5rem' }}>🍎</span>
                <div>
                  <h3 style={{ margin: 0 }}>FRUTTETO</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Melo, Pero, Pesco, Ciliegio, ecc.</small>
                </div>
              </button>

              <button className="btn-large btn-orto" onClick={() => handleSelectType('orto')}>
                <span style={{ fontSize: '2.5rem' }}>🥬</span>
                <div>
                  <h3 style={{ margin: 0 }}>ORTO</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Patate, Pomodoro, Cipolla, ecc.</small>
                </div>
              </button>

              <button className="btn-large btn-olivo" onClick={() => handleSelectType('olivo')}>
                <span style={{ fontSize: '2.5rem' }}>🫒</span>
                <div>
                  <h3 style={{ margin: 0 }}>OLIVETO</h3>
                  <small style={{ color: 'var(--text-secondary)' }}>Olivo e difesa delle olive</small>
                </div>
              </button>

              <button 
                className="btn-large btn-primary" 
                onClick={() => setScreen('calendar')}
                style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))' }}
              >
                <Calendar size={36} />
                <div>
                  <h3 style={{ margin: 0, color: '#fff' }}>COSE DA FARE</h3>
                  <small style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Scadenziario degli ultimi 3 bollettini</small>
                </div>
              </button>
            </div>

            <div className="card" style={{ marginTop: '30px', textAlign: 'center', backgroundColor: 'var(--brand-primary-light)', borderColor: 'var(--brand-accent)' }}>
              <Info size={36} style={{ color: 'var(--brand-accent)', marginBottom: '8px' }} />
              <h3 style={{ color: 'var(--brand-primary)' }}>Come usare questa app</h3>
              <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
                1. Scegli il tuo tipo di coltivazione.<br />
                2. Tocca l'ultimo bollettino per leggerlo.<br />
                3. Vai su **"Cose da Fare"** 📅 in basso per vedere l'agenda dei trattamenti estratti.
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
                {/* Intestazione Bollettino */}
                <div style={{ marginBottom: '20px', borderBottom: '2px solid var(--border-color)', paddingBottom: '16px' }}>
                  <span className="badge info" style={{ marginBottom: '8px' }}>
                    {selectedType === 'frutta' ? '🍎 Frutta' : selectedType === 'orto' ? '🥬 Orto' : '🫒 Olivo'}
                  </span>
                  <h1 style={{ fontSize: 'calc(1.8rem * var(--text-zoom))' }}>{bulletin.title}</h1>
                  <p style={{ color: 'var(--text-secondary)', fontWeight: 'bold' }}>Aggiornato al: {bulletin.date}</p>
                </div>

                {/* Barra di ricerca per filtrare le piante (es. "Pesco") */}
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

                {/* Nota Introduttiva */}
                {bulletin.intro && !searchQuery && (
                  <div className="card" style={{ backgroundColor: 'var(--brand-primary-light)', borderLeft: '6px solid var(--brand-accent)' }}>
                    <h3 style={{ color: 'var(--brand-primary)' }}>Previsioni Meteo / Nota Generale</h3>
                    <p style={{ fontSize: 'calc(1.1rem * var(--text-zoom))' }}>{bulletin.intro}</p>
                  </div>
                )}

                {/* Elenco schede per pianta/coltura */}
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

                        {/* Dettagli avversità per questa pianta */}
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
                
                {/* Pulsante PDF Originale */}
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
              Agenda delle attività e dei trattamenti estratti in tempo reale dagli <strong>ultimi 3 bollettini</strong> per ciascuna coltura.
            </p>

            {/* Filtro Tipologia Coltura */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
              <button 
                className={`btn-icon-only ${calendarFilter === 'tutte' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('tutte')}
                style={{ minWidth: '80px', fontSize: '1rem', fontWeight: 'bold' }}
              >
                Tutte
              </button>
              <button 
                className={`btn-icon-only ${calendarFilter === 'frutta' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('frutta')}
                style={{ minWidth: '100px', fontSize: '1rem', fontWeight: 'bold' }}
              >
                🍎 Frutta
              </button>
              <button 
                className={`btn-icon-only ${calendarFilter === 'orto' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('orto')}
                style={{ minWidth: '100px', fontSize: '1rem', fontWeight: 'bold' }}
              >
                🥬 Orto
              </button>
              <button 
                className={`btn-icon-only ${calendarFilter === 'olivo' ? 'active' : ''}`}
                onClick={() => setCalendarFilter('olivo')}
                style={{ minWidth: '100px', fontSize: '1rem', fontWeight: 'bold' }}
              >
                🫒 Olivo
              </button>
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
                Da Fare ({calendarTasks.filter(t => !t.completed).length})
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
                Fatte ({calendarTasks.filter(t => t.completed).length})
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
                    {/* Checkbox interattiva */}
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
                      {/* Badge pianta e Scadenza */}
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

                      {/* Testo dell'istruzione */}
                      <h3 style={{ margin: '8px 0', fontSize: 'calc(1.15rem * var(--text-zoom))', textAlign: 'left', fontWeight: 'bold' }}>
                        Avversità: {task.disease}
                      </h3>
                      <p style={{ fontSize: 'calc(1.05rem * var(--text-zoom))', color: 'var(--text-primary)', textAlign: 'left', marginBottom: '12px' }}>
                        {task.task}
                      </p>

                      {/* Fonte del bollettino */}
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

            {/* Sezione Dimensione Caratteri */}
            <div className="card">
              <h2>Dimensione dei testi</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Seleziona la grandezza del testo più leggibile per te:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className={`btn-large ${zoom === 1.0 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setZoom(1.0)}
                >
                  Caratteri Standard
                </button>
                <button 
                  className={`btn-large ${zoom === 1.25 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setZoom(1.25)}
                >
                  Caratteri Grandi (Molto leggibile)
                </button>
                <button 
                  className={`btn-large ${zoom === 1.6 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setZoom(1.6)}
                >
                  Caratteri Molto Grandi (Uso all'aperto)
                </button>
                <button 
                  className={`btn-large ${zoom === 2.0 ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setZoom(2.0)}
                >
                  Caratteri Giganti
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
                Versione 1.1.0 (Scadenzario attivo)
              </p>
            </div>
          </div>
        )}
      </main>

      {/* 7. BOTTOM NAVIGATION BAR (GIANT BUTTONS FOR SENIORS) */}
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
