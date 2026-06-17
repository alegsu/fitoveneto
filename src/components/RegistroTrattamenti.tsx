import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Save, Download, Search, Trash2, RefreshCw } from 'lucide-react';
import { exportTrattamentiToCSV } from '../services/exportRegistro';
import type { Trattamento } from '../services/exportRegistro';
import { searchFitofarmaco, syncFitofarmaci, fetchFitofarmaci } from '../services/fitofarmaci';
import type { Fitofarmaco } from '../services/fitofarmaci';

interface Props {
  onBack: () => void;
  followedCrops: { frutta: boolean; orto: boolean; olivo: boolean };
}

export default function RegistroTrattamenti({ onBack, followedCrops }: Props) {
  const [trattamenti, setTrattamenti] = useState<Trattamento[]>(() => {
    const cached = localStorage.getItem('registro_trattamenti');
    return cached ? JSON.parse(cached) : [];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Partial<Trattamento>>({
    data: new Date().toISOString().split('T')[0],
    cuaa: localStorage.getItem('sian_cuaa') || '',
    id_parcella: '',
    coltura: '',
    fase_fenologica: '',
    avversita: '',
    prodotto: '',
    numero_registrazione: '',
    sostanza_attiva: '',
    dose: '',
    unita_misura: 'kg/ha',
    operatore: localStorage.getItem('sian_operatore') || '',
    macchinario: ''
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Fitofarmaco[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dbCount, setDbCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    localStorage.setItem('registro_trattamenti', JSON.stringify(trattamenti));
  }, [trattamenti]);

  useEffect(() => {
    // Carica conteggio db fitofarmaci
    fetchFitofarmaci().then(data => setDbCount(data.length));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setIsSearching(true);
        const results = await searchFitofarmaco(searchQuery);
        setSearchResults(results);
        setIsSearching(false);
      } else {
        setSearchResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSyncDB = async () => {
    setIsSyncing(true);
    try {
      const count = await syncFitofarmaci();
      setDbCount(count);
      alert(`Sincronizzazione completata! ${count} prodotti caricati dal Ministero.`);
    } catch (e) {
      alert("Errore durante il download dal Ministero. Riprova più tardi.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = () => {
    if (!formData.data || !formData.coltura || !formData.prodotto || !formData.dose || !formData.cuaa || !formData.id_parcella) {
      alert("Compila tutti i campi obbligatori (Data, CUAA, Id Parcella, Coltura, Prodotto, Dose)");
      return;
    }

    // Salva preferenze utente per i prossimi inserimenti
    if (formData.cuaa) localStorage.setItem('sian_cuaa', formData.cuaa);
    if (formData.operatore) localStorage.setItem('sian_operatore', formData.operatore);

    const newTrattamento: Trattamento = {
      id: Date.now().toString(),
      data: formData.data as string,
      cuaa: formData.cuaa as string,
      id_parcella: formData.id_parcella as string,
      coltura: formData.coltura as string,
      fase_fenologica: formData.fase_fenologica || '',
      avversita: formData.avversita || '',
      prodotto: formData.prodotto as string,
      numero_registrazione: formData.numero_registrazione || '',
      sostanza_attiva: formData.sostanza_attiva,
      dose: formData.dose as string,
      unita_misura: formData.unita_misura as string,
      operatore: formData.operatore || 'Proprietario',
      macchinario: formData.macchinario || ''
    };

    setTrattamenti([newTrattamento, ...trattamenti]);
    setIsAdding(false);
    setFormData({
      ...formData, // maintain CUAA and Operator
      data: new Date().toISOString().split('T')[0],
      id_parcella: '',
      coltura: '',
      fase_fenologica: '',
      avversita: '',
      prodotto: '',
      numero_registrazione: '',
      sostanza_attiva: '',
      dose: '',
      macchinario: ''
    });
    setSearchQuery('');
  };

  const handleExport = async () => {
    if (trattamenti.length === 0) {
      alert("Nessun trattamento da esportare.");
      return;
    }
    try {
      await exportTrattamentiToCSV(trattamenti);
    } catch (e) {
      alert("Errore durante l'esportazione");
    }
  };

  const deleteTrattamento = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questo trattamento?")) {
      setTrattamenti(trattamenti.filter(t => t.id !== id));
    }
  };

  const selectProdotto = (fito: Fitofarmaco) => {
    setFormData({
      ...formData,
      prodotto: fito.prodotto,
      sostanza_attiva: fito.sostanza_attiva,
      numero_registrazione: fito.numero_registrazione
    });
    setSearchQuery(fito.prodotto);
    setSearchResults([]);
  };

  if (isAdding) {
    return (
      <div className="app-content">
        <button className="btn-back" onClick={() => setIsAdding(false)}>
          <ArrowLeft size={28} /> Annulla
        </button>

        <h1 style={{ marginBottom: '20px' }}>Nuovo Trattamento</h1>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Data Operazione *</label>
            <input 
              type="date" 
              className="search-input" 
              value={formData.data}
              onChange={e => setFormData({...formData, data: e.target.value})}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>CUAA (Codice Fiscale Azienda) *</label>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Inserisci il tuo CUAA"
              value={formData.cuaa}
              onChange={e => setFormData({...formData, cuaa: e.target.value.toUpperCase()})}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>ID Parcella (PCG) *</label>
            <input 
              type="text" 
              className="search-input" 
              placeholder="es. 001, 10A, ecc."
              value={formData.id_parcella}
              onChange={e => setFormData({...formData, id_parcella: e.target.value})}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Coltura *</label>
            <select 
              className="search-input"
              value={formData.coltura}
              onChange={e => setFormData({...formData, coltura: e.target.value})}
              style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              <option value="">Seleziona...</option>
              {followedCrops.frutta && <option value="Frutteto">Frutteto</option>}
              {followedCrops.orto && <option value="Orto">Orto</option>}
              {followedCrops.olivo && <option value="Oliveto">Oliveto</option>}
              <option value="Altro">Altro</option>
            </select>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Fase Fenologica</label>
            <input 
              type="text" 
              className="search-input" 
              placeholder="es. Fioritura, Accrescimento frutto..."
              value={formData.fase_fenologica}
              onChange={e => setFormData({...formData, fase_fenologica: e.target.value})}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Avversità (Malattia/Insetto)</label>
            <input 
              type="text" 
              className="search-input" 
              placeholder="es. Peronospora, Afidi..."
              value={formData.avversita}
              onChange={e => setFormData({...formData, avversita: e.target.value})}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
              <label style={{ fontWeight: 'bold', display: 'block', margin: 0 }}>Prodotto Fitosanitario *</label>
              <span style={{ fontSize: '0.8rem', color: dbCount > 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {dbCount > 0 ? `${dbCount} prodotti in memoria` : 'Database vuoto'}
              </span>
            </div>
            <div className="search-wrapper" style={{ margin: 0 }}>
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                className="search-input"
                placeholder="Cerca nel database Ministero..." 
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  setFormData({...formData, prodotto: e.target.value});
                }}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            {isSearching && <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Ricerca in corso...</div>}
            
            {searchResults.length > 0 && (
              <div style={{ 
                position: 'absolute', 
                top: '100%', 
                left: 0, 
                right: 0, 
                backgroundColor: 'var(--bg-card)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                zIndex: 10,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}>
                {searchResults.map(res => (
                  <div 
                    key={res.numero_registrazione}
                    onClick={() => selectProdotto(res)}
                    style={{ padding: '12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                  >
                    <div style={{ fontWeight: 'bold' }}>{res.prodotto}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SA: {res.sostanza_attiva} | Reg: {res.numero_registrazione}</div>
                  </div>
                ))}
              </div>
            )}
            
            {dbCount === 0 && !isSyncing && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--danger-color)', color: 'white', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>Database Vuoto!</strong><br />
                  <small>Devi sincronizzare i dati del Ministero per cercare i prodotti.</small>
                </div>
                <button 
                  onClick={handleSyncDB}
                  className="btn-icon-only"
                  style={{ backgroundColor: 'white', color: 'var(--danger-color)', padding: '8px 16px', borderRadius: '24px', fontWeight: 'bold' }}
                >
                  Sincronizza Ora
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Dose *</label>
              <input 
                type="number" 
                step="0.01"
                className="search-input" 
                placeholder="Quantità"
                value={formData.dose}
                onChange={e => setFormData({...formData, dose: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Unità</label>
              <select 
                className="search-input"
                value={formData.unita_misura}
                onChange={e => setFormData({...formData, unita_misura: e.target.value})}
                style={{ width: '100%', boxSizing: 'border-box', backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}
              >
                <option value="kg/ha">kg/ha</option>
                <option value="l/ha">l/ha</option>
                <option value="g/hl">g/hl</option>
                <option value="ml/hl">ml/hl</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Macchinario Usato</label>
            <input 
              type="text" 
              className="search-input" 
              placeholder="es. Atomizzatore ABC..."
              value={formData.macchinario}
              onChange={e => setFormData({...formData, macchinario: e.target.value})}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Operatore</label>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Nome chi ha fatto il trattamento"
              value={formData.operatore}
              onChange={e => setFormData({...formData, operatore: e.target.value})}
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>

          <button 
            className="btn-large btn-primary" 
            onClick={handleSave}
            style={{ marginTop: '20px' }}
          >
            <Save size={24} /> Salva Trattamento
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn-back" onClick={onBack} style={{ margin: 0 }}>
          <ArrowLeft size={28} /> Home
        </button>
        <button 
          className="btn-icon-only" 
          onClick={handleExport}
          title="Esporta CSV"
          style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
        >
          <Download size={24} />
        </button>
      </div>

      <h1 style={{ marginBottom: '8px' }}>Quaderno di Campagna</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Registra i trattamenti fitosanitari per il rispetto degli obblighi di legge.
      </p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button 
          className="btn-large btn-primary" 
          onClick={() => setIsAdding(true)}
          style={{ flex: 2, padding: '12px' }}
        >
          <Plus size={24} /> Aggiungi Trattamento
        </button>

        <button 
          className="btn-large btn-secondary" 
          onClick={handleSyncDB}
          disabled={isSyncing}
          style={{ flex: 1, padding: '12px', flexDirection: 'column', gap: '4px', height: 'auto' }}
        >
          <RefreshCw size={24} className={isSyncing ? 'pulse-recording' : ''} />
          <span style={{ fontSize: '0.8rem' }}>Sync DB Ministero</span>
        </button>
      </div>

      {trattamenti.length === 0 ? (
        <div className="empty-state">
          <h3>Nessun trattamento registrato</h3>
          <p>Il tuo registro è vuoto. Inizia ad aggiungere i trattamenti per tenere traccia delle operazioni.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {trattamenti.map(t => (
            <div key={t.id} className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="badge info" style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                  {t.coltura} (Parc. {t.id_parcella})
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t.data}</span>
              </div>
              
              <h3 style={{ margin: '8px 0', color: 'var(--brand-primary)' }}>{t.prodotto}</h3>
              {t.sostanza_attiva && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>S.A.: {t.sostanza_attiva} | Reg. {t.numero_registrazione}</div>}
              
              <div style={{ fontSize: '0.95rem', marginBottom: '4px' }}><strong>Dose:</strong> {t.dose} {t.unita_misura}</div>
              {t.avversita && <div style={{ fontSize: '0.95rem', marginBottom: '4px' }}><strong>Contro:</strong> {t.avversita}</div>}
              <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}><strong>Operatore:</strong> {t.operatore} {t.macchinario && `(${t.macchinario})`}</div>

              <button 
                onClick={() => deleteTrattamento(t.id)}
                style={{ 
                  position: 'absolute', 
                  bottom: '16px', 
                  right: '16px', 
                  background: 'none', 
                  border: 'none', 
                  color: 'var(--danger-color)',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
