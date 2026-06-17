import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function syncMinistero() {
  console.log("Iniziando il download dal Ministero tramite browser headless...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ignoreHTTPSErrors: true
  });
  const page = await context.newPage();
  
  try {
    console.log("Apertura pagina Open Data API...");
    await page.goto('https://dati.gov.it/api/3/action/package_show?id=fitosanitari', { waitUntil: 'domcontentloaded' });
    
    // Aspetta che il JS di Cloudflare (se presente) ci faccia passare
    await page.waitForTimeout(3000);
    
    const pageText = await page.evaluate(() => document.body.innerText);
    
    let ckanData;
    try {
        ckanData = JSON.parse(pageText);
    } catch(e) {
        console.log("Fallback su dati.salute.gov.it dataset");
        // Fallback: vai sulla pagina e cerca il link CSV
        await page.goto('https://www.dati.salute.gov.it/dataset/fitosanitari.jsp', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        
        // Estrai tutti i link
        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a')).map(a => a.href);
        });
        
        const csvUrl = links.find(l => l.toLowerCase().endsWith('.csv'));
        if (!csvUrl) throw new Error("Nessun link CSV trovato nella pagina.");
        
        console.log("Trovato URL CSV da fallback:", csvUrl);
        const csvRes = await page.evaluate(async (url) => {
            const r = await fetch(url);
            return r.text();
        }, csvUrl);
        
        processCSV(csvRes);
        return;
    }
    
    if (!ckanData.success) throw new Error("API success = false");
    
    const resources = ckanData.result.resources;
    const csvResource = resources.find(r => r.format.toLowerCase() === 'csv' || r.url.endsWith('.csv'));
    
    if (!csvResource) throw new Error("CSV non trovato nelle risorse");
    console.log("Trovato URL CSV:", csvResource.url);
    
    const csvText = await page.evaluate(async (url) => {
        const r = await fetch(url);
        return r.text();
    }, csvResource.url);
    
    processCSV(csvText);
    
  } catch (err) {
    console.error("Errore durante la sincronizzazione:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

function processCSV(csvText) {
    console.log(`Scaricati ${csvText.length} bytes di CSV`);
    
    let parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';'
    });
    
    let dataRows = parsed.data;
    // Se ha fallito col punto e virgola, prova la virgola
    if (dataRows.length > 0 && !dataRows[0]['Numero Registrazione'] && dataRows[0]['Numero Registrazione,Prodotto']) {
      parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true, delimiter: ',' });
      dataRows = parsed.data;
    }
    
    const db = dataRows.map(row => {
      const keys = Object.keys(row);
      const getVal = (possibleNames) => {
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
    }).filter(f => f.numero_registrazione && f.prodotto);
    
    console.log(`Processati ${db.length} fitofarmaci validi.`);
    
    const outputPath = path.resolve(__dirname, '../public/fitofarmaci_dataset.json');
    fs.writeFileSync(outputPath, JSON.stringify(db, null, 2));
    
    console.log("Database salvato con successo in", outputPath);
}

syncMinistero();
