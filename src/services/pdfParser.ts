export interface DetailItem {
  title: string;
  content: string;
  alertLevel: 'info' | 'warning' | 'danger';
}

export interface CategorySection {
  name: string;
  details: DetailItem[];
}

export interface BulletinContent {
  bulletinId: string;
  title: string;
  date: string;
  intro: string;
  categories: CategorySection[];
}

// Determinazione del livello di allarme in base a parole chiave
function determineAlertLevel(title: string, text: string): 'info' | 'warning' | 'danger' {
  const t = (title + " " + text).toLowerCase();
  
  // Parole chiave ad alta gravità / interventi immediati
  const dangerKeywords = [
    'grave', 'gravi', 'danni diffusi', 'critici', 'urgente', 
    'emergenza', 'ingestibile', 'intervenire subito', 'trattare subito',
    'larve penetrazione', 'forte attacco', 'superata la soglia'
  ];
  
  // Parole chiave di media gravità / attenzione
  const warningKeywords = [
    'in aumento', 'attenzione', 'monitorare', 'necessario', 'intervenire',
    'soglia di intervento', 'rischio', 'schiuse', 'trattamenti', 'volo degli adulti',
    'melata', 'possibili attacchi', 'sintomi', 'infezione'
  ];
  
  // Parole di basso rischio / controllo
  const infoKeywords = [
    'sotto controllo', 'buon stato', 'assenti', 'bassa presenza', 
    'non necessari', 'riduce', 'regolare', 'linea con la media'
  ];

  for (const kw of dangerKeywords) {
    if (t.includes(kw)) return 'danger';
  }
  
  for (const kw of warningKeywords) {
    if (t.includes(kw)) {
      // Verifica se c'è un'esclusione di rischio
      for (const infoKw of infoKeywords) {
        if (t.includes(infoKw) && t.includes('rimane') || t.includes('rimangono')) {
          return 'info';
        }
      }
      return 'warning';
    }
  }
  
  return 'info';
}

export function parseBulletinText(text: string, type: 'frutta' | 'orto' | 'olivo', bulletinId: string): BulletinContent {
  // Pulizia del testo e rimozione di intestazioni di pagina ripetitive
  const cleanedText = text
    .replace(/--- Page \d+ ---/g, '')
    .replace(/Pag\.\s+\d+\s+di\s+\d+/gi, '')
    .replace(/SERVIZIO FITOSANITARIO REGIONE VENETO/g, '')
    .replace(/U\.O\. Fitosanitario/g, '')
    .replace(/BOLLETTINI FITOSANITARI DIFESA INTEGRATA/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n/g, '\n');

  // Estrazione Titolo e Data
  // Esempio: "Bollettino n. 15 del 11/06/2026" o "Bollettino n. 11 del 11/06/2026"
  let title = `Bollettino ${type.toUpperCase()}`;
  let date = new Date().toLocaleDateString('it-IT');
  
  const titleMatch = cleanedText.match(/Bollettino\s+n\.\s+(\d+)\s+del\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (titleMatch) {
    title = `Bollettino n. ${titleMatch[1]} del ${titleMatch[2]}`;
    date = titleMatch[2];
  }

  const result: BulletinContent = {
    bulletinId,
    title,
    date,
    intro: '',
    categories: []
  };

  try {
    if (type === 'olivo') {
      // Per l'olivo c'è un'unica coltura principale (Olivo)
      const olivoSection: CategorySection = {
        name: 'OLIVO',
        details: []
      };

      // Troviamo i blocchi principali
      // Fenologia, Situazione Fisiologica, Situazione Fitosanitaria
      const lines = cleanedText.split('\n');
      let currentSection = '';
      let currentContent = '';
      
      const detailsMap: { [key: string]: string } = {};

      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Se la linea è intestazione principale
        if (line === 'FENOLOGIA' || line === 'SITUAZIONE FISIOLOGICA DELLE PIANTE' || line === 'SITUAZIONE FITOSANITARIA') {
          if (currentSection) {
            detailsMap[currentSection] = currentContent.trim();
          }
          currentSection = line;
          currentContent = '';
          continue;
        }

        // Se siamo in SITUAZIONE FITOSANITARIA, proviamo a dividere per malattie specifiche
        if (currentSection === 'SITUAZIONE FITOSANITARIA') {
          // Es: "Tignola dell’olivo (Prays oleae): la generazione..."
          const diseaseMatch = line.match(/^([^:]+)\s*:\s*(.*)$/);
          if (diseaseMatch) {
            const diseaseName = diseaseMatch[1].trim();
            // Evitiamo che prenda intere frasi come titolo
            if (diseaseName.length < 50) {
              detailsMap[diseaseName] = diseaseMatch[2].trim();
              continue;
            }
          }
        }

        if (currentSection) {
          currentContent += ' ' + line;
        } else {
          // Introduzione iniziale prima di FENOLOGIA
          if (!line.toLowerCase().includes('in collaborazione') && !line.toLowerCase().includes('olivo')) {
            result.intro += (result.intro ? ' ' : '') + line;
          }
        }
      }
      
      // Salva l'ultimo blocco
      if (currentSection && currentContent) {
        detailsMap[currentSection] = currentContent.trim();
      }

      // Convertiamo i blocchi in DetailItem
      for (const [title, content] of Object.entries(detailsMap)) {
        if (title === 'SITUAZIONE FITOSANITARIA') continue; // Già diviso
        
        olivoSection.details.push({
          title,
          content,
          alertLevel: determineAlertLevel(title, content)
        });
      }

      if (olivoSection.details.length > 0) {
        result.categories.push(olivoSection);
      }

    } else {
      // Frutta o Orto
      // Identifichiamo le colture principali (righe interamente in MAIUSCOLO)
      const lines = cleanedText.split('\n');
      let currentCategory: CategorySection | null = null;
      let currentDetail: DetailItem | null = null;
      let introLines: string[] = [];

      // Lista di intestazioni da ignorare come piante
      const ignoreHeaders = [
        'COLTURE FRUTTICOLE', 'COLTURE ORTICOLE', 'ORTICOLE IN PIENO CAMPO', 
        'COLTURE ORTICOLE IN SERRA', 'SERVIZIO FITOSANITARIO', 'DIFESA INTEGRATA'
      ];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Verifica se la riga è un nome di coltura (tutta maiuscola, non troppo lunga e non da ignorare)
        const isUppercase = line === line.toUpperCase() && /[A-Z]/.test(line);
        const isPlantHeader = isUppercase && line.length > 2 && line.length < 35 && !ignoreHeaders.some(h => line.includes(h)) && !line.includes('BOLLETTINO');

        if (isPlantHeader) {
          // Salva la coltura precedente
          if (currentCategory) {
            if (currentDetail) {
              currentCategory.details.push(currentDetail);
              currentDetail = null;
            }
            result.categories.push(currentCategory);
          }
          currentCategory = {
            name: line,
            details: []
          };
          continue;
        }

        if (currentCategory) {
          // Siamo dentro una coltura. Cerchiamo pattern "Patogeno: testo"
          // Esempio: "Oidio: continuare la difesa..." o "Fase fenologica: ..."
          const detailMatch = line.match(/^([^:]+)\s*:\s*(.*)$/);
          
          if (detailMatch && detailMatch[1].trim().length < 40 && !detailMatch[1].includes('http') && !/^[0-9]/.test(detailMatch[1])) {
            if (currentDetail) {
              currentCategory.details.push(currentDetail);
            }
            currentDetail = {
              title: detailMatch[1].trim(),
              content: detailMatch[2].trim(),
              alertLevel: 'info' // Iniziale
            };
          } else {
            // Continua il testo del dettaglio corrente o aggiunge alla coltura se non c'è dettaglio
            if (currentDetail) {
              currentDetail.content += ' ' + line;
            } else {
              // Testo libero nella sezione coltura (es. Stadio fenologico senza due punti in riga successiva)
              currentDetail = {
                title: 'Info Generale',
                content: line,
                alertLevel: 'info'
              };
            }
          }
        } else {
          // Introduzione generale del bollettino
          if (!line.toLowerCase().includes('bollettino n.') && !line.toLowerCase().includes('colture')) {
            introLines.push(line);
          }
        }
      }

      // Salva l'ultimo dettaglio e categoria
      if (currentCategory) {
        if (currentDetail) {
          currentCategory.details.push(currentDetail);
        }
        result.categories.push(currentCategory);
      }

      result.intro = introLines.join(' ');
    }

    // Post-processing: pulizia, alert level finale
    result.categories.forEach(cat => {
      cat.details.forEach(det => {
        det.content = det.content.replace(/\s+/g, ' ').trim();
        det.alertLevel = determineAlertLevel(det.title, det.content);
      });
    });

  } catch (error) {
    console.error("Errore durante il parsing del bollettino:", error);
  }

  // Fallback: se il parser non ha estratto nulla, creiamo un'unica categoria con tutto il testo grezzo
  if (result.categories.length === 0) {
    result.intro = "Lettura del bollettino in modalità testo integrale.";
    result.categories.push({
      name: "TESTO INTEGRALE",
      details: [
        {
          title: "Contenuto del Bollettino",
          content: cleanedText,
          alertLevel: 'info'
        }
      ]
    });
  }

  return result;
}
