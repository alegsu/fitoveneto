import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import Papa from 'papaparse';

export interface Fitofarmaco {
  numero_registrazione: string;
  prodotto: string;
  sostanza_attiva: string;
  impresa: string;
  scadenza: string;
}

const DB_FILENAME = 'fitofarmaci_db.json';

// Fetch the actual dataset from Ministero della Salute
export async function syncFitofarmaci(): Promise<number> {
  try {
    // 1. Get the dataset metadata from the Italian Open Data portal (CKAN API)
    // We try directly without proxy because Capacitor bypasses CORS natively and proxies get blocked by WAF
    const apiUrl = 'https://dati.gov.it/api/3/action/package_show?id=fitosanitari';
    
    let ckanData;
    try {
      const response = await CapacitorHttp.request({
        method: 'GET',
        url: apiUrl,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 Capacitor/FitoVeneto' }
      });
      ckanData = response.data;
      if (typeof ckanData === 'string') {
        ckanData = JSON.parse(ckanData);
      }
    } catch (e) {
      console.error("Direct API failed, trying salute.gov.it", e);
      const fallbackApiUrl = 'https://www.dati.salute.gov.it/dati/api/3/action/package_show?id=fitosanitari';
      const fbResponse = await CapacitorHttp.request({
        method: 'GET',
        url: fallbackApiUrl,
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0 Capacitor/FitoVeneto' }
      });
      ckanData = fbResponse.data;
      if (typeof ckanData === 'string') {
        ckanData = JSON.parse(ckanData);
      }
    }

    if (!ckanData || !ckanData.success) {
      throw new Error("Dataset Ministero non trovato o bloccato dal firewall.");
    }

    // 2. Find the CSV resource
    const resources = ckanData.result.resources;
    const csvResource = resources.find((r: any) => r.format.toLowerCase() === 'csv' || r.url.endsWith('.csv'));
    
    if (!csvResource) {
      throw new Error("Formato CSV non disponibile sul portale.");
    }

    // 3. Download the CSV content directly
    const csvResponse = await CapacitorHttp.request({
      method: 'GET',
      url: csvResource.url,
      headers: { 'User-Agent': 'Mozilla/5.0 Capacitor/FitoVeneto' }
    });

    const csvText = csvResponse.data;

    // 4. Parse CSV with PapaParse
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';' // Ministero usually uses semicolon
    });

    // Handle case where delimiter might be comma
    let dataRows = parsed.data as any[];
    if (dataRows.length > 0 && !dataRows[0]['Numero Registrazione'] && dataRows[0]['Numero Registrazione,Prodotto']) {
      // Re-parse with comma
      const parsedComma = Papa.parse(csvText, { header: true, skipEmptyLines: true, delimiter: ',' });
      dataRows = parsedComma.data as any[];
    }

    // 5. Map to our interface to save space
    const db: Fitofarmaco[] = dataRows.map(row => {
      // The exact column names depend on the Ministero's current CSV structure.
      // Usually they are: "Numero Registrazione", "Prodotto", "Sostanza Attiva", "Impresa", "Scadenza"
      // We will do a fuzzy match on the keys just in case they change slightly
      const keys = Object.keys(row);
      const getVal = (possibleNames: string[]) => {
        const key = keys.find(k => possibleNames.some(p => k.toLowerCase().includes(p)));
        return key ? row[key] : '';
      };

      return {
        numero_registrazione: getVal(['numero', 'registrazione', 'reg']),
        prodotto: getVal(['prodotto', 'denominazione', 'nome']),
        sostanza_attiva: getVal(['sostanza', 'attiva', 'principio']),
        impresa: getVal(['impresa', 'titolare', 'azienda']),
        scadenza: getVal(['scadenza', 'data', 'validita'])
      };
    }).filter(f => f.numero_registrazione && f.prodotto); // Keep only valid rows

    // 6. Save to local filesystem for offline use
    await Filesystem.writeFile({
      path: DB_FILENAME,
      data: JSON.stringify(db),
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });

    return db.length;

  } catch (error) {
    console.error("Errore durante la sincronizzazione fitofarmaci:", error);
    throw error;
  }
}

// Load from local filesystem, fallback to mock if empty
export async function fetchFitofarmaci(): Promise<Fitofarmaco[]> {
  try {
    const file = await Filesystem.readFile({
      path: DB_FILENAME,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
    return JSON.parse(file.data as string) as Fitofarmaco[];
  } catch (e) {
    // File doesn't exist yet, return empty or fallback mock
    return [];
  }
}

export async function searchFitofarmaco(query: string): Promise<Fitofarmaco[]> {
  const data = await fetchFitofarmaci();
  const q = query.toLowerCase().trim();
  
  if (!q) return [];
  if (data.length === 0) return []; // Require sync first
  
  return data.filter(f => 
    f.prodotto.toLowerCase().includes(q) || 
    f.sostanza_attiva.toLowerCase().includes(q) ||
    f.numero_registrazione.includes(q)
  ).slice(0, 50); // limit results for performance
}
