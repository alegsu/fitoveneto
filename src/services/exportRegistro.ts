import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface Trattamento {
  id: string;
  data: string;
  cuaa: string; // Codice Fiscale Azienda
  id_parcella: string; // Riferimento Piano Colturale Grafico
  coltura: string;
  fase_fenologica: string;
  avversita: string;
  prodotto: string; // Nome del prodotto
  sostanza_attiva?: string;
  numero_registrazione?: string;
  dose: string;
  unita_misura: string;
  operatore: string;
  macchinario: string;
}

export async function exportTrattamentiToCSV(trattamenti: Trattamento[]): Promise<void> {
  try {
    // 1. Generate CSV content formatted for SIAN / CAA standard
    const header = [
      'CUAA Azienda', 
      'ID Parcella (PCG)', 
      'Data Operazione', 
      'Coltura', 
      'Fase Fenologica', 
      'Avversità', 
      'Prodotto', 
      'Numero Registrazione', 
      'Sostanza Attiva', 
      'Dose', 
      'Unità di Misura', 
      'Operatore', 
      'Macchinario'
    ].join(';');
    
    const rows = trattamenti.map(t => {
      return [
        t.cuaa || '',
        t.id_parcella || '',
        t.data || '',
        t.coltura || '',
        t.fase_fenologica || '',
        t.avversita || '',
        t.prodotto || '',
        t.numero_registrazione || '',
        t.sostanza_attiva || '',
        t.dose || '',
        t.unita_misura || 'kg/ha',
        t.operatore || '',
        t.macchinario || ''
      ].map(val => `"${val.replace(/"/g, '""')}"`).join(';');
    });

    const csvContent = [header, ...rows].join('\n');
    const fileName = `export_sian_trattamenti_${new Date().toISOString().split('T')[0]}.csv`;

    // 2. Write file to device
    const result = await Filesystem.writeFile({
      path: fileName,
      data: csvContent,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    // 3. Share or prompt user to save
    await Share.share({
      title: 'Esporta Registro Trattamenti',
      text: 'Ecco il registro dei trattamenti fitosanitari generato.',
      url: result.uri,
      dialogTitle: 'Condividi o Salva il Registro'
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}
