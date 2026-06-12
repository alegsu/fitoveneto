import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Volume2, 
  Settings, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Play, 
  Pause, 
  Square, 
  Info, 
  Calendar,
  ChevronRight
} from 'lucide-react';
import { fetchBulletinLinks, fetchBulletinText } from './services/scraper';
import type { BulletinLink } from './services/scraper';
import { parseBulletinText } from './services/pdfParser';
import type { BulletinContent, CategorySection } from './services/pdfParser';

type Screen = 'home' | 'list' | 'detail' | 'settings';

export default function App() {
  // Accessibilità ed impostazioni
  const [zoom, setZoom] = useState<number>(() => {
    const cached = localStorage.getItem('app_zoom');
    return cached ? parseFloat(cached) : 1.25; // Default 125% per anziani
  });
  
  const [speechRate, setSpeechRate] = useState<number>(() => {
    const cached = localStorage.getItem('app_speech_rate');
    return cached ? parseFloat(cached) : 0.85; // Default più lento della norma
  });

  // Navigazione e Dati
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedType, setSelectedType] = useState<'frutta' | 'orto' | 'olivo' | null>(null);
  const [links, setLinks] = useState<BulletinLink[]>([]);
  const [selectedLink, setSelectedLink] = useState<BulletinLink | null>(null);
  const [bulletin, setBulletin] = useState<BulletinContent | null>(null);
  
  // Stati UI
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [offlineLinks, setOfflineLinks] = useState<boolean>(false);

  // Sintesi Vocale
  const [speechState, setSpeechState] = useState<'idle' | 'speaking' | 'paused'>('idle');
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Caricamento zoom su stile root
  useEffect(() => {
    document.documentElement.style.setProperty('--text-zoom', zoom.toString());
    localStorage.setItem('app_zoom', zoom.toString());
  }, [zoom]);

  // Salva velocità di lettura
  useEffect(() => {
    localStorage.setItem('app_speech_rate', speechRate.toString());
  }, [speechRate]);

  // Caricamento iniziale dei link dal sito o dalla cache
  useEffect(() => {
    loadLinks();
  }, []);

  // Interrompe la sintesi vocale al cambio di schermata
  useEffect(() => {
    stopSpeech();
  }, [screen]);

  const loadLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const fetchedLinks = await fetchBulletinLinks();
      setLinks(fetchedLinks);
      // Salva in cache i link
      localStorage.setItem('cached_bulletin_links', JSON.stringify(fetchedLinks));
      setOfflineLinks(false);
    } catch (err) {
      console.warn("Failed to fetch links, loading from cache...", err);
      const cached = localStorage.getItem('cached_bulletin_links');
      if (cached) {
        setLinks(JSON.parse(cached));
        setOfflineLinks(true);
      } else {
        setError("Impossibile caricare l'elenco dei bollettini. Controlla la connessione internet.");
      }
    } finally {
      setLoading(false);
    }
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

    // Prova a caricare dalla cache locale
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
      
      // Salva in cache
      localStorage.setItem(cacheKey, JSON.stringify(parsed));
    } catch (err) {
      console.error(err);
      setError("Impossibile scaricare o elaborare il bollettino fitosanitario.");
    } finally {
      setLoading(false);
    }
  };

  // Funzioni per la Sintesi Vocale (Text-To-Speech)
  const speakText = (text: string) => {
    if (!window.speechSynthesis) {
      alert("La sintesi vocale non è supportata su questo dispositivo.");
      return;
    }

    window.speechSynthesis.cancel(); // Ferma letture precedenti

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'it-IT';
    utterance.rate = speechRate;
    
    // Trova una voce italiana se disponibile
    const voices = window.speechSynthesis.getVoices();
    const italianVoice = voices.find(v => v.lang.startsWith('it'));
    if (italianVoice) {
      utterance.voice = italianVoice;
    }

    utterance.onend = () => {
      setSpeechState('idle');
      currentUtteranceRef.current = null;
    };

    utterance.onerror = (e) => {
      console.error("Speech synthesis error", e);
      setSpeechState('idle');
      currentUtteranceRef.current = null;
    };

    currentUtteranceRef.current = utterance;
    setSpeechState('speaking');
    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeech = () => {
    if (window.speechSynthesis && speechState === 'speaking') {
      window.speechSynthesis.pause();
      setSpeechState('paused');
    }
  };

  const resumeSpeech = () => {
    if (window.speechSynthesis && speechState === 'paused') {
      window.speechSynthesis.resume();
      setSpeechState('speaking');
    }
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeechState('idle');
      currentUtteranceRef.current = null;
    }
  };

  // Legge l'intero bollettino correntemente aperto
  const speakFullBulletin = () => {
    if (!bulletin) return;
    
    let textToSpeak = `${bulletin.title}. `;
    if (bulletin.intro) {
      textToSpeak += `${bulletin.intro}. `;
    }

    bulletin.categories.forEach(cat => {
      textToSpeak += `Sezione ${cat.name}. `;
      cat.details.forEach(det => {
        textToSpeak += `${det.title}: ${det.content}. `;
      });
    });

    speakText(textToSpeak);
  };

  // Legge solo una coltura specifica
  const speakCategory = (cat: CategorySection) => {
    let textToSpeak = `Coltura ${cat.name}. `;
    cat.details.forEach(det => {
      textToSpeak += `${det.title}: ${det.content}. `;
    });
    speakText(textToSpeak);
  };

  // Filtra i link per tipologia
  const filteredLinks = links.filter(l => l.type === selectedType);

  // Filtra il contenuto del bollettino in base alla barra di ricerca (per nome pianta o malattia)
  const getFilteredCategories = (): CategorySection[] => {
    if (!bulletin) return [];
    if (!searchQuery.trim()) return bulletin.categories;

    const query = searchQuery.toLowerCase();
    return bulletin.categories.filter(cat => {
      // Cerca nella pianta
      if (cat.name.toLowerCase().includes(query)) return true;
      // Cerca nelle avversità/dettagli
      return cat.details.some(det => 
        det.title.toLowerCase().includes(query) || 
        det.content.toLowerCase().includes(query)
      );
    });
  };

  // Renderizza l'icona e colore dell'allarme
  const renderAlertIcon = (level: 'info' | 'warning' | 'danger') => {
    switch(level) {
      case 'danger':
        return <AlertCircle className="danger-color" size={32} style={{ color: 'var(--danger-color)' }} />;
      case 'warning':
        return <AlertTriangle className="warning-color" size={32} style={{ color: 'var(--warning-color)' }} />;
      case 'info':
      default:
        return <CheckCircle className="success-color" size={32} style={{ color: 'var(--success-color)' }} />;
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
            style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
          >
            A+
          </button>
          <button 
            className={`btn-icon-only ${zoom === 1.6 ? 'active' : ''}`}
            onClick={() => setZoom(1.6)}
            title="Caratteri Molto Grandi"
            style={{ fontSize: '1.4rem', fontWeight: 'bold' }}
          >
            A++
          </button>
          <button 
            className={`btn-icon-only ${zoom === 2.0 ? 'active' : ''}`}
            onClick={() => setZoom(2.0)}
            title="Caratteri Massimi"
            style={{ fontSize: '1.6rem', fontWeight: 'bold' }}
          >
            A+++
          </button>
        </div>
        
        <button 
          className="btn-icon-only" 
          onClick={() => setScreen(screen === 'settings' ? 'home' : 'settings')}
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
          </div>

          <div className="card" style={{ marginTop: '40px', textAlign: 'center', backgroundColor: 'var(--brand-primary-light)', borderColor: 'var(--brand-accent)' }}>
            <Info size={36} style={{ color: 'var(--brand-accent)', marginBottom: '8px' }} />
            <h3 style={{ color: 'var(--brand-primary)' }}>Come usare questa app</h3>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
              1. Scegli il tuo tipo di coltivazione.<br />
              2. Tocca l'ultimo bollettino pubblicato.<br />
              3. Premi il pulsante 🔊 per ascoltare la lettura automatica a voce alta.
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
              <button className="btn-large btn-primary" onClick={loadLinks} style={{ marginTop: '20px' }}>
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
          <button className="btn-back" onClick={() => { setScreen('list'); stopSpeech(); }}>
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

              {/* BARRA VOCALE (TTS CONTROLLER) */}
              <div className="tts-panel">
                <div className="tts-info">
                  <Volume2 size={36} style={{ color: 'var(--brand-accent)' }} />
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--brand-primary)' }}>Lettura Vocale</h3>
                    <small style={{ color: 'var(--text-secondary)' }}>Ascolta l'intero bollettino</small>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '8px' }}>
                  {speechState === 'idle' && (
                    <button className="btn-icon-only active" onClick={speakFullBulletin} title="Riproduci tutto">
                      <Play size={24} />
                    </button>
                  )}
                  {speechState === 'speaking' && (
                    <button className="btn-icon-only" onClick={pauseSpeech} title="Pausa">
                      <Pause size={24} />
                    </button>
                  )}
                  {speechState === 'paused' && (
                    <button className="btn-icon-only active" onClick={resumeSpeech} title="Riprendi">
                      <Play size={24} />
                    </button>
                  )}
                  {speechState !== 'idle' && (
                    <button className="btn-icon-only" onClick={stopSpeech} title="Ferma" style={{ borderColor: 'var(--danger-color)' }}>
                      <Square size={24} style={{ color: 'var(--danger-color)' }} />
                    </button>
                  )}
                </div>
              </div>

              {/* Barra di ricerca per filtrare le piante (es. "Pesco") */}
              <div className="search-wrapper">
                <Search className="search-icon" size={24} />
                <input 
                  type="text" 
                  className="search-input"
                  placeholder="Cerca pianta (es: patata, ciliegio, oidio)..." 
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
                      {/* Intestazione della pianta con pulsante audio specifico */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px' }}>
                        <h2 style={{ margin: 0, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                          {selectedType === 'olivo' ? '🫒 OLIVO' : cat.name}
                        </h2>
                        
                        <button 
                          className="btn-icon-only"
                          onClick={() => speakCategory(cat)}
                          title={`Ascolta sezione ${cat.name}`}
                          style={{ borderColor: 'var(--brand-accent)', color: 'var(--brand-accent)' }}
                        >
                          <Volume2 size={24} />
                        </button>
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
                            <p style={{ marginTop: '8px', fontSize: 'calc(1.1rem * var(--text-zoom))', color: 'var(--text-primary)' }}>
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

      {/* 5. SCHERMATA: IMPOSTAZIONI */}
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
                Caratteri Standard (Consigliato per occhiali da lettura)
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
                Caratteri Molto Grandi (Ideale per uso all'aperto)
              </button>
              <button 
                className={`btn-large ${zoom === 2.0 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setZoom(2.0)}
              >
                Caratteri Giganti
              </button>
            </div>
          </div>

          {/* Sezione Sintesi Vocale */}
          <div className="card">
            <h2>Velocità di Lettura Vocale</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Scegli la velocità con cui l'app legge i bollettini fitosanitari:
            </p>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
              <button 
                className={`btn-large ${speechRate === 0.7 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpeechRate(0.7)}
                style={{ flex: '1 1 40%' }}
              >
                Molto Lenta
              </button>
              <button 
                className={`btn-large ${speechRate === 0.85 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpeechRate(0.85)}
                style={{ flex: '1 1 40%' }}
              >
                Lenta (Consigliata)
              </button>
              <button 
                className={`btn-large ${speechRate === 1.0 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSpeechRate(1.0)}
                style={{ flex: '1 1 40%' }}
              >
                Normale
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
              Versione 1.0.0
            </p>
          </div>
        </div>
      )}

      {/* Pie' di pagina */}
      <footer className="app-footer">
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          © 2026 FitoVeneto - Servizio Fitosanitario Regione Veneto
        </p>
      </footer>
    </>
  );
}
