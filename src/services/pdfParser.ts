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

export interface CalendarTask {
  id: string;
  bulletinId: string;
  bulletinTitle: string;
  bulletinDate: string;
  plant: string;
  categoryType: 'frutta' | 'orto' | 'olivo';
  disease: string;
  task: string;
  alertLevel: 'info' | 'warning' | 'danger';
  deadline: string;
  completed: boolean;
}

// Elenco delle colture/piante conosciute per guidare il sezionamento
const KNOWN_PLANTS = [
  // Frutta
  "PESCO", "ALBICOCCO", "CILIEGIO", "MELO", "PERO", "ACTINIDIA", "NOCE",
  // Orto
  "PATATE", "POMODORO DA INDUSTRIA", "CIPOLLA", "BATATA (PATATA DOLCE)", "BATATA", "ZUCCA", "ASPARAGO", 
  "CETRIOLO", "PEPERONE", "POMODORO", "FRAGOLA", "MELANZANA",
  // Olivo
  "OLIVO"
];

// Elenco delle avversità e sezioni note per evitare falsi positivi nei colons
const KNOWN_HEADINGS = [
  // Olivo
  "FENOLOGIA",
  "SITUAZIONE FISIOLOGICA DELLE PIANTE",
  "SITUAZIONE FISIOLOGICA",
  "SITUAZIONE FITOSANITARIA",
  "Tignola dell’olivo (Prays oleae)",
  "Tignola dell'olivo (Prays oleae)",
  "Tignola dell'olivo",
  "Tignola dell’olivo",
  "Margaronia (Palpita unionalis)",
  "Cotonello (Euphyllura olivina)",
  "Cimice asiatica (Halyomorpha halys)",
  "Cocciniglia mezzo grano di pepe (Saissetia oleae)",
  "Mosca delle olive (Bactrocera oleae)",
  "Mosca delle olive",
  "Fumaggini",
  "Malattie fungine",
  
  // Orto
  "Stadio fenologico",
  "Fase fenologica",
  "Fisiopatie",
  "Situazione malattie",
  "Situazione fitofagi",
  "Heliotis armigera e Autographa gamma",
  "Tripide",
  "Consigli colturali",
  "Stato raccolta",
  "Stemphylium",
  "Pseudoperonospora e ragnetto",
  "Ragnetto e tripide",
  "Ragnetto rosso",
  "Malattie e fitofagi",
  
  // Frutta
  "Oidio",
  "Monilia",
  "Cydia molesta",
  "Cydia pomonella",
  "Maculatura bruna",
  "Afide lanigero",
  "Ticchiolatura",
  "Eulia",
  "PSA",
  "Antracnosi",
  "Batteriosi",
  "Afidi"
];

// Determinazione del livello di allarme in base a parole chiave
function determineAlertLevel(title: string, text: string): 'info' | 'warning' | 'danger' {
  const t = (title + " " + text).toLowerCase();
  
  const dangerKeywords = [
    'grave', 'gravi', 'danni diffusi', 'critici', 'urgente', 
    'emergenza', 'ingestibile', 'intervenire subito', 'trattare subito',
    'larve penetrazione', 'forte attacco', 'superata la soglia'
  ];
  
  const warningKeywords = [
    'in aumento', 'attenzione', 'monitorare', 'necessario', 'intervenire',
    'soglia di intervento', 'rischio', 'schiuse', 'trattamenti', 'volo degli adulti',
    'melata', 'possibili attacchi', 'sintomi', 'infezione'
  ];
  
  const infoKeywords = [
    'sotto controllo', 'buon stato', 'assenti', 'bassa presenza', 
    'non necessari', 'riduce', 'regolare', 'linea con la media'
  ];

  for (const kw of dangerKeywords) {
    if (t.includes(kw)) return 'danger';
  }
  
  for (const kw of warningKeywords) {
    if (t.includes(kw)) {
      for (const infoKw of infoKeywords) {
        if (t.includes(infoKw) && (t.includes('rimane') || t.includes('rimangono') || t.includes('sotto'))) {
          return 'info';
        }
      }
      return 'warning';
    }
  }
  
  return 'info';
}

export function parseBulletinText(text: string, type: 'frutta' | 'orto' | 'olivo', bulletinId: string): BulletinContent {
  // 1. Pulizia intestazioni di pagina
  const cleanedText = text
    .replace(/--- Page \d+ ---/g, '')
    .replace(/Pag\.\s+\d+\s+di\s+\d+/gi, '')
    .replace(/SERVIZIO FITOSANITARIO REGIONE VENETO/g, '')
    .replace(/U\.O\. Fitosanitario/g, '')
    .replace(/BOLLETTINI FITOSANITARI DIFESA INTEGRATA/g, '');

  // 2. Estrazione Titolo e Data
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
    const lines = cleanedText.split('\n');
    let currentPlantName = "";
    const plantTexts: { [key: string]: string } = {};
    let introText = "";

    // A. Identifichiamo le sezioni delle piante e accumuliamo le loro linee
    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const upperLine = line.toUpperCase();
      // Cerchiamo se la linea corrisponde a una coltura nota
      const matchedPlant = KNOWN_PLANTS.find(p => 
        upperLine === p || 
        upperLine === `COLTURE ${p}` || 
        upperLine === `${p} IN PIENO CAMPO` || 
        upperLine === `COLTURE ${p} IN SERRA`
      );

      if (matchedPlant) {
        currentPlantName = matchedPlant;
        if (!plantTexts[currentPlantName]) {
          plantTexts[currentPlantName] = "";
        }
      } else {
        if (currentPlantName) {
          plantTexts[currentPlantName] += " " + line;
        } else {
          // Se non è iniziata alcuna pianta, accumuliamo nell'introduzione
          if (!line.toLowerCase().includes('in collaborazione') && !line.toLowerCase().includes('bollettino n.')) {
            introText += " " + line;
          }
        }
      }
    }

    result.intro = introText.replace(/\s+/g, ' ').trim();

    // Se per l'olivo non abbiamo trovato un'intestazione esplicita, mettiamo tutto il testo
    if (type === 'olivo' && !plantTexts["OLIVO"]) {
      plantTexts["OLIVO"] = lines.join(" ");
    }

    // B. Parserizziamo ciascuna pianta unendo le righe per evitare spezzate
    for (const [plantName, sectionText] of Object.entries(plantTexts)) {
      const cleanSectionText = sectionText.replace(/\s+/g, ' ').trim();
      if (!cleanSectionText) continue;

      const category: CategorySection = {
        name: plantName,
        details: []
      };

      const headingPositions: { start: number; end: number; title: string }[] = [];

      // Cerchiamo le intestazioni note (es. "Tignola dell'olivo (Prays oleae):")
      for (const heading of KNOWN_HEADINGS) {
        const regex = new RegExp(`\\b${escapeRegExp(heading)}\\s*:`, 'gi');
        let match;
        while ((match = regex.exec(cleanSectionText)) !== null) {
          headingPositions.push({
            start: match.index,
            end: regex.lastIndex,
            title: heading
          });
        }
      }

      // Cerchiamo intestazioni generiche corte (es: "Oidio: " o "Dorifora: ")
      const fallbackRegex = /(?:^|\s)([A-Z][a-zA-Z0-9’'.-]{2,25})\s*:/g;
      let fbMatch;
      while ((fbMatch = fallbackRegex.exec(cleanSectionText)) !== null) {
        const title = fbMatch[1].trim();
        const matchStart = fbMatch.index + fbMatch[0].indexOf(title);
        const matchEnd = fbMatch.index + fbMatch[0].length;
        
        // Evitiamo sovrapposizioni
        const isOverlapping = headingPositions.some(pos => 
          (matchStart >= pos.start && matchStart < pos.end) ||
          (matchEnd > pos.start && matchEnd <= pos.end)
        );

        if (!isOverlapping) {
          headingPositions.push({
            start: matchStart,
            end: matchEnd,
            title: title
          });
        }
      }

      // Ordiniamo le posizioni trovate
      headingPositions.sort((a, b) => a.start - b.start);

      // Estraiamo il contenuto per ogni intestazione
      if (headingPositions.length === 0) {
        category.details.push({
          title: "Info Generale",
          content: cleanSectionText,
          alertLevel: 'info'
        });
      } else {
        for (let i = 0; i < headingPositions.length; i++) {
          const current = headingPositions[i];
          const next = headingPositions[i + 1];
          const contentStart = current.end;
          const contentEnd = next ? next.start : cleanSectionText.length;
          
          let content = cleanSectionText.substring(contentStart, contentEnd).trim();
          content = content.replace(/\s+/g, ' ').trim();

          // Ignora elementi senza reale contenuto o ripetitivi
          if (content.length > 3) {
            category.details.push({
              title: current.title,
              content: content,
              alertLevel: determineAlertLevel(current.title, content)
            });
          }
        }
      }

      if (category.details.length > 0) {
        result.categories.push(category);
      }
    }

  } catch (error) {
    console.error("Errore durante il parsing del bollettino:", error);
  }

  // Fallback
  if (result.categories.length === 0) {
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

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Estrazione compiti per il Calendario Cose da Fare
export function extractCalendarTasks(bulletin: BulletinContent, categoryType: 'frutta' | 'orto' | 'olivo'): CalendarTask[] {
  const tasks: CalendarTask[] = [];
  
  // Parole chiave che indicano azioni da compiere
  const actionKeywords = [
    'intervenire', 'trattare', 'trattamento', 'trattamenti', 'effettuare', 
    'eseguire', 'applicare', 'eliminare', 'monitorare', 'asportare', 
    'arieggiare', 'ridurre', 'consiglia', 'raccomanda', 'posizionare',
    'lanci', 'lavaggi', 'zappatura', 'estirpatura', 'controllo', 'verificare'
  ];

  bulletin.categories.forEach(cat => {
    cat.details.forEach(det => {
      // Evita compiti per le sezioni puramente descrittive come la fenologia se non contengono azioni
      if (det.title.toLowerCase().includes('fenologia') || det.title.toLowerCase().includes('fase fenologica')) {
        return;
      }

      // Dividiamo in frasi
      const sentences = det.content.split(/(?<=[.!?])\s+/);
      
      sentences.forEach((sentence, idx) => {
        const cleanSentence = sentence.trim();
        if (!cleanSentence || cleanSentence.length < 15) return;

        const containsAction = actionKeywords.some(kw => 
          cleanSentence.toLowerCase().includes(kw)
        );

        if (containsAction) {
          // Ricerca scadenza
          let deadline = "In questo periodo";
          const lowerText = cleanSentence.toLowerCase();
          
          const daysMatch = cleanSentence.match(/entro\s+(?:i\s+prossimi\s+)?(\d+\s+giorni)/i);
          if (daysMatch) {
            deadline = `Entro ${daysMatch[1]}`;
          } else if (lowerText.includes('prima di iniziare la raccolta') || lowerText.includes('prima della raccolta')) {
            deadline = "Prima della raccolta";
          } else if (lowerText.includes('dalla prossima settimana')) {
            deadline = "Dalla prossima settimana";
          } else if (lowerText.includes('subito') || lowerText.includes('immediato') || lowerText.includes('urgente')) {
            deadline = "Immediato";
          } else if (lowerText.includes('sera') || lowerText.includes('mattino')) {
            deadline = "La sera o mattino presto";
          } else if (lowerText.includes('prima delle piogge') || lowerText.includes('prima degli eventi piovosi')) {
            deadline = "Prima delle piogge";
          }

          tasks.push({
            id: `${bulletin.bulletinId}_${cat.name}_${det.title.replace(/\s+/g, '')}_${idx}`,
            bulletinId: bulletin.bulletinId,
            bulletinTitle: bulletin.title,
            bulletinDate: bulletin.date,
            plant: cat.name,
            categoryType: categoryType,
            disease: det.title,
            task: cleanSentence,
            alertLevel: det.alertLevel,
            deadline: deadline,
            completed: false
          });
        }
      });
    });
  });

  return tasks;
}
