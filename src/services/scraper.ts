import { MOCK_BULLETINS } from './mockData';
import { Capacitor } from '@capacitor/core';

export interface BulletinLink {
  id: string;
  title: string;
  number: number;
  date: string;
  url: string;
  type: 'frutta' | 'orto' | 'olivo';
}

const BULLETINS_PAGE_URL = "https://www.regione.veneto.it/web/fitosanitario/bollettini-fitosanitari-2026";
const CORS_PROXIES = [
  "https://corsproxy.io/?url=",
  "https://api.allorigins.win/raw?url="
];

// Generazione di link di fallback completi basati sulle liste reali estratte
const FALLBACK_LINKS: BulletinLink[] = [
  // Frutta
  {
    id: 'frutta_15',
    title: 'N°15 del 11/06/2026',
    number: 15,
    date: '11/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14333679/Frutticolo_2026_15.pdf/954675c9-5859-4641-98cc-11dbde9eb334',
    type: 'frutta'
  },
  {
    id: 'frutta_14',
    title: 'N°14 del 03/06/2026',
    number: 14,
    date: '03/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14333679/Frutticolo_2026_14.pdf/59024021-44c7-4457-be76-beb2e563217a',
    type: 'frutta'
  },
  {
    id: 'frutta_13',
    title: 'N°13 del 28/05/2026',
    number: 13,
    date: '28/05/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14333679/Frutticolo_2026_13.pdf/0687a50d-655b-46e3-94c0-7a60ac455d1b',
    type: 'frutta'
  },
  // Orto
  {
    id: 'orto_11',
    title: 'N°11 del 11/06/2026',
    number: 11,
    date: '11/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14337132/Orticolo_2026_11.pdf/202881b6-f506-42ab-810a-ea1c9dc58923',
    type: 'orto'
  },
  {
    id: 'orto_10',
    title: 'N°10 del 05/06/2026',
    number: 10,
    date: '05/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14337132/Orticolo_2026_10.pdf/753d04fb-2072-4bd4-8200-70beafe764cf',
    type: 'orto'
  },
  {
    id: 'orto_09',
    title: 'N°09 del 28/05/2026',
    number: 9,
    date: '28/05/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14337132/Orticolo_2026_09.pdf/fc8048c6-5950-4d4b-b110-09a7bc07072c',
    type: 'orto'
  },
  // Olivo
  {
    id: 'olivo_17',
    title: 'N°17 del 11/06/2026',
    number: 17,
    date: '11/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14331610/Olivicolo_2026_17.pdf/2cfcd3f0-4973-4b4b-89bb-88955367bf04',
    type: 'olivo'
  },
  {
    id: 'olivo_16',
    title: 'N°16 del 03/06/2026',
    number: 16,
    date: '03/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14331610/Olivicolo_2026_16.pdf/888b2088-4427-4267-823c-f97e2d648971',
    type: 'olivo'
  },
  {
    id: 'olivo_15',
    title: 'N°15 del 27/05/2026',
    number: 15,
    date: '27/05/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14331610/Olivicolo_2026_15.pdf/f4812092-889b-47dc-ad45-49af111a0a9e',
    type: 'olivo'
  }
];

// Esegue il fetch bypassando CORS se possibile
async function fetchTextBypassingCors(url: string): Promise<string> {
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative) {
    // In Capacitor nativo, fetch() non risente dei vincoli CORS grazie a CapacitorHttp
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.text();
  }

  // Se siamo in un browser locale, proviamo la chiamata diretta (potrebbe fallire per CORS)
  try {
    const response = await fetch(url);
    if (response.ok) return await response.text();
  } catch (e) {
    console.warn("Direct fetch failed due to CORS, attempting proxies...", e);
  }

  // Proviamo i proxy CORS uno dopo l'altro
  for (const proxy of CORS_PROXIES) {
    try {
      const proxiedUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxiedUrl);
      if (response.ok) return await response.text();
    } catch (e) {
      console.warn(`Proxy ${proxy} failed:`, e);
    }
  }

  throw new Error("Unable to bypass CORS limitations in browser.");
}

// Estrae i link dei bollettini dall'HTML della pagina
export async function fetchBulletinLinks(): Promise<BulletinLink[]> {
  try {
    const htmlText = await fetchTextBypassingCors(BULLETINS_PAGE_URL);
    
    // Usiamo DOMParser per interpretare l'HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const links = doc.querySelectorAll('a');
    
    const extractedLinks: BulletinLink[] = [];
    
    links.forEach((link) => {
      const href = link.getAttribute('href') || '';
      const text = link.textContent || '';
      
      // I link dei bollettini sono del tipo: /documents/11979050/.../Frutticolo_2026_15.pdf/...
      // E il testo contiene ad esempio: N°15 del 11/06/2026
      if (href.includes('/documents/') && href.toLowerCase().includes('.pdf')) {
        let type: 'frutta' | 'orto' | 'olivo' | null = null;
        
        if (href.toLowerCase().includes('frutticolo')) {
          type = 'frutta';
        } else if (href.toLowerCase().includes('orticolo')) {
          type = 'orto';
        } else if (href.toLowerCase().includes('olivicolo')) {
          type = 'olivo';
        }
        
        if (type) {
          // Pulizia del testo per trovare il pattern "N°15 del 11/06/2026"
          const cleanText = text.replace(/\s+/g, ' ').trim();
          const match = cleanText.match(/N°\s*(\d+)\s+del\s+(\d{2}\/\d{2}\/\d{4})/i);
          
          if (match) {
            const num = parseInt(match[1]);
            const date = match[2];
            const fullUrl = href.startsWith('http') ? href : `https://www.regione.veneto.it${href}`;
            
            const id = `${type}_${num}`;
            
            // Evitiamo duplicati
            if (!extractedLinks.some(l => l.id === id)) {
              extractedLinks.push({
                id,
                title: cleanText,
                number: num,
                date,
                url: fullUrl,
                type
              });
            }
          }
        }
      }
    });

    if (extractedLinks.length > 0) {
      // Ordiniamo per numero decrescente (più recenti prima)
      return extractedLinks.sort((a, b) => b.number - a.number);
    }
    
    console.warn("No links extracted from page. Using fallback links.");
    return FALLBACK_LINKS;

  } catch (error) {
    console.error("Error fetching bulletin links from site, loading fallbacks:", error);
    return FALLBACK_LINKS;
  }
}

// Carica il PDF e restituisce l'ArrayBuffer
export async function fetchPdfBuffer(pdfUrl: string): Promise<ArrayBuffer> {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    return await response.arrayBuffer();
  }

  // Browser local development: proviamo diretta (se non c'è CORS)
  try {
    const response = await fetch(pdfUrl);
    if (response.ok) return await response.arrayBuffer();
  } catch (e) {
    console.warn("Direct PDF fetch failed, trying proxy...", e);
  }

  // Browser development: usiamo proxy per bypassare CORS
  for (const proxy of CORS_PROXIES) {
    try {
      const proxiedUrl = `${proxy}${encodeURIComponent(pdfUrl)}`;
      const response = await fetch(proxiedUrl);
      if (response.ok) return await response.arrayBuffer();
    } catch (e) {
      console.warn(`Proxy ${proxy} failed for PDF:`, e);
    }
  }

  throw new Error("Unable to fetch PDF array buffer.");
}

// Recupera il testo di un bollettino (usa il mock se offline/fallimento o se è uno dei mock reali)
export async function fetchBulletinText(bulletin: BulletinLink): Promise<string> {
  // Se il bollettino è presente nei mock ed è una richiesta locale o di sviluppo,
  // possiamo restituire immediatamente il testo pre-compilato per velocizzare ed evitare consumi di rete offline
  const mockMatch = MOCK_BULLETINS.find(m => m.id === bulletin.id);
  
  try {
    // Se non è nei mock o vogliamo forzare il download reale
    const buffer = await fetchPdfBuffer(bulletin.url);
    
    // Carichiamo dinamicamente PDFJS per estrarre il testo
    const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs';
    
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str)
        .join('\n');
      text += `--- Page ${i} ---\n${pageText}\n`;
    }
    
    return text;
  } catch (error) {
    console.error(`Error loading or parsing PDF for ${bulletin.id}, using mock fallback:`, error);
    if (mockMatch) {
      return mockMatch.text;
    }
    throw new Error("Non è stato possibile caricare il bollettino. Verifica la connessione ad internet.");
  }
}
