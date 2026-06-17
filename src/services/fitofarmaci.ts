import { CapacitorHttp } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface Fitofarmaco {
  numero_registrazione: string;
  prodotto: string;
  sostanza_attiva: string;
  impresa: string;
  scadenza: string;
}

const DB_FILENAME = 'fitofarmaci_db.json';

// Fetch the dataset from GitHub (since Ministero actively blocks native app connections via WAF)
export async function syncFitofarmaci(): Promise<number> {
  try {
    const datasetUrl = 'https://raw.githubusercontent.com/alegsu/fitoveneto/main/public/fitofarmaci_dataset.json';
    
    const response = await CapacitorHttp.request({
      method: 'GET',
      url: datasetUrl,
      headers: { 'Accept': 'application/json' }
    });

    if (!response.data) {
      throw new Error("Impossibile scaricare il database remoto.");
    }

    let dataRows = response.data;
    if (typeof dataRows === 'string') {
      dataRows = JSON.parse(dataRows);
    }

    // 5. Map to our interface to save space
    const db: Fitofarmaco[] = dataRows.map((row: any) => {
      return {
        numero_registrazione: row.numero_registrazione || '',
        prodotto: row.prodotto || '',
        sostanza_attiva: row.sostanza_attiva || '',
        impresa: row.impresa || '',
        scadenza: row.scadenza || ''
      };
    }).filter((f: Fitofarmaco) => f.numero_registrazione && f.prodotto); // Keep only valid rows

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
