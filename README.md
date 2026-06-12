# FitoVeneto 🌾 - Bollettini Fitosanitari per Anziani

**FitoVeneto** è un'applicazione Android ibrida (sviluppata con React, TypeScript, Vite e Capacitor) progettata specificamente per gli agricoltori anziani o pensionati della Regione Veneto. L'app raccoglie in tempo reale i dati dei bollettini fitosanitari emessi dalla regione per le colture di **Frutteto, Orto e Oliveto**, rendendoli leggibili direttamente nell'app senza dover consultare o scaricare manualmente i PDF.

---

## 🌟 Funzionalità Principali

1. **Lettura Diretta in App**: Nessun link esterno o visualizzatore PDF scomodo. Il testo viene estratto ed organizzato in schede chiare suddivise per pianta (es: Pesco, Ciliegio, Patate, Olivo).
2. **Grafica Semplificata e ad Alto Contrasto**: Ideale per l'utilizzo all'aperto nei campi. Pulsanti giganti (minimo 72px di altezza) facili da toccare.
3. **Caratteri Scalabili Dinamicamente**: Barra di controllo persistente in alto per ingrandire il testo con un tocco dal 100% fino al 200% (`A`, `A+`, `A++`, `A+++`).
4. **Sintesi Vocale in Italiano (TTS)**: Un pulsante 🔊 ad alta visibilità consente di ascoltare la lettura vocale automatica dei bollettini in italiano, sia per l'intero documento che per singole colture specifiche.
5. **Livelli di Allarme Intuitivi**: Analisi automatica delle parole chiave nel bollettino per evidenziare le minacce con codici colore ed icone chiare:
   - 🚨 **Rosso (Pericolo)**: Trattamenti immediati o soglie superate (es: Drosofila, Batteriosi).
   - ⚠️ **Giallo (Attenzione)**: Popolazioni in aumento, monitoraggio consigliato o schiuse in corso.
   - ✅ **Verde (OK)**: Situazione sotto controllo o trattamenti non necessari.
6. **Ricerca Rapida**: Barra di ricerca per isolare immediatamente la coltura di interesse (es: digita "pesco" per vedere solo le notizie sulle pesche).
7. **Cache per Uso Offline**: I bollettini letti vengono memorizzati sul telefono, permettendoti di consultarli nei campi anche dove non c'è internet.

---

## 🛠️ Tecnologie Utilizzate

- **Framework**: React 19 + TypeScript + Vite 8
- **Stile**: Vanilla CSS responsive ad alto contrasto
- **Runtime Nativo**: Capacitor 8 (con plugin `CapacitorHttp` per bypassare i blocchi CORS del sito regionale)
- **Estrattore PDF**: `pdfjs-dist` (client-side)
- **CI/CD**: GitHub Actions (per compilare l'APK automaticamente sul cloud)

---

## 📲 Come Scaricare e Installare l'APK

Grazie al flusso di lavoro automatizzato di GitHub Actions, non hai bisogno di installare Android Studio sul tuo computer per compilare l'app. 

Ad ogni modifica o caricamento del codice (push):
1. Vai sulla pagina del tuo repository GitHub.
2. Clicca sulla sezione **Releases** (a destra nella pagina iniziale) o su **Actions**.
3. Troverai l'ultima versione rilasciata (es. `v1`, `v2`).
4. Scarica il file **`app-debug.apk`** direttamente sul tuo telefono Android.
5. Apri il file scaricato sul telefono e acconsenti all'installazione da "sorgenti sconosciute" (richiesto per installare app al di fuori del Google Play Store).

---

## 👨‍💻 Sviluppo Locale

Se desideri modificare l'applicazione sul tuo computer:

1. **Installa le dipendenze**:
   ```bash
   npm install
   ```

2. **Avvia il server di sviluppo**:
   ```bash
   npm run dev
   ```
   *Nota: In modalità browser locale, l'applicazione utilizzerà dei proxy CORS pubblici e dei dati di fallback pre-caricati se la connessione fallisce.*

3. **Genera i file compilati**:
   ```bash
   npm run build
   ```

4. **Sincronizza con la cartella Android**:
   ```bash
   npx cap sync
   ```
