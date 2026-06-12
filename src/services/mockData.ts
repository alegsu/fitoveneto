export interface MockBulletin {
  id: string;
  type: 'frutta' | 'orto' | 'olivo';
  title: string;
  number: number;
  date: string;
  url: string;
  text: string;
}

export const MOCK_BULLETINS: MockBulletin[] = [
  {
    id: 'frutta_15',
    type: 'frutta',
    title: 'N°15 del 11/06/2026',
    number: 15,
    date: '11/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14333679/Frutticolo_2026_15.pdf/954675c9-5859-4641-98cc-11dbde9eb334',
    text: `SERVIZIO FITOSANITARIO REGIONE VENETO
U.O. Fitosanitario
BOLLETTINI FITOSANITARI DIFESA INTEGRATA
COLTURE FRUTTICOLE
Bollettino n. 15 del 11/06/2026
Per i prossimi giorni sono previste temperature più miti, in linea con la media del periodo, ed una sostanziale assenza di piogge.
PESCO
Fase fenologica: accrescimento dei frutti ed inizio raccolta per le varietà precoci.
Oidio: continuare la difesa antioidica, utilizzando zolfo o triazoli.
Monilia: nelle varietà a maturazione precoce effettuare un paio di interventi contro la monilia prima di iniziare la raccolta. Le sostanze efficaci disponibili sono diverse: importante alternare i meccanismi di azione e porre attenzione al tempo di carenza.
Cydia molesta: continua il secondo volo dell’anno, con relativa ovideposizione e nascita delle larve. Superata la soglia dei 10 adulti/settimana è opportuno intervenire con prodotti ad azione larvicida.
Forficula: presenza in aumento con danni sui frutti, soprattutto se vicini o raggruppati. Controllare le risalite e la presenza di forficula sulle piante con le trappole o il frappage. Quando necessario trattare, la sera o al mattino presto, con spinosad e lambdacialotrina.

ALBICOCCO
Fase fenologica: accrescimento dei frutti, iniziata la raccolta delle varietà precoci.
Forficula: stesse considerazioni fatte per il pesco. Mantenere monitorata la presenza per posizionare eventuali trattamenti per il contenimento. Le sostanze attive utilizzabili sono lambdacialotrina e spinosad.

CILIEGIO
Fase fenologica: fase fenologica da accrescimento frutto - raccolta.
Drosofila: l’abbassamento termico ha favorito lo sviluppo della specie ed in campo si osserva un veloce incremento delle popolazioni, con gravi e diffusi danni su frutto. In questa situazione l’efficacia dei prodotti è limitata e la situazione in molti casi è ormai ingestibile. Continuare con i trattamenti finché c’è la convenienza economica. In ogni caso porre sempre attenzione massima alle ciliegie non raccolte che rappresentano una importante fonte di inoculo e che vanno trattate comunque come le altre.

MELO
Fase fenologica: fase fenologica di accrescimento dei frutticini.
Ticchiolatura: continuare la difesa contro le infezioni secondarie, utilizzando i diversi prodotti di copertura disponibili, intervenendo sempre prima delle piogge. Nelle situazioni a rischio glomerella dare la preferenza a fluazinam, dithianon e captano. In altri casi la difesa può proseguire con bicarbonato di K o zolfo. Nelle situazioni a rischio prestare attenzione alla filloptosi causata da squilibri nutrizionali, intervenendo con gli opportuni interventi fogliari.
Oidio: ancora elevato il rischio di infezioni. Continuare con attenzione la difesa utilizzando le sostanze attive indicate nel Disciplinare di Produzione Integrata regionale.
Cydia pomonella: il volo degli adulti è praticamente al termine. In alcune situazioni nelle trappole si catturano ancora degli adulti, anche in numero consistente. Si tratta sempre di individui svernanti, ancora del primo volo dell’anno. Le ovideposizioni sono praticamente terminate, e prosegue la nascita delle larve. Nei frutteti dove prosegue la cattura di individui adulti e, in caso di sintomi sui frutti, intervenire con un prodotto ad azione larvicida.
Eulia: è iniziato il secondo volo dell’anno. Monitorare la presenza, anche visivamente, per individuare le eventuali ooplacche e se necessario programmare un intervento specifico.
Afide lanigero: rispetto al 2025 si nota una leggera diminuzione di presenza dell’afide. Dove necessario sono utili i lavaggi con olio essenziale di arancio e/o sapone molle. Un eventuale intervento chimico può essere necessario nei casi critici

PERO
Fase fenologica: accrescimento frutti.
Maculatura bruna: in qualche frutteto si osservano le prime tacche necrotiche su frutto, in particolare si riscontrano principalmente in terreni asfittici, con ristagni idrici e con il cotico erboso. La difesa deve proseguire, prima degli eventi piovosi, utilizzando le molecole previste nel Disciplinare di Produzione Integrata regionale.
Psilla: le piogge di questi giorni hanno depresso la popolazione, che rimane sotto controllo. Tuttavia esistono situazioni con una presenza significativa del fitofago. In questi casi intervenire con lavaggi mattutini a base di bicarbonato di K, sapone molle, sali potassici di acidi grassi.
Cimice asiatica: in aumento la presenza, da monitorare con attenzione. Se necessario intervenire con acetamiprid sulle file perimetrali o a file alterne.

ACTINIDIA
Fase fenologica: accrescimento sia per A. chinensis che per A. deliciosa.
PSA: il clima attuale riduce notevolmente la virulenza del batterio, al momento non sono necessari ulteriori trattamenti. Asportare dal frutteto tutti i rami o parti di cordone colpiti e disseccati da Psa. Porre attenzione ai temporali estivi, specie se accompagnati da grandine. In questi casi l’abbassamento termico e le ferite favoriscono le infezioni da PSA: intervenire subito con un prodotto a base di sali di rame.

NOCE
Fase fenologica: sviluppo germogli/ingrossamento frutto.
Antracnosi: presenza di sintomi su foglia.
Batteriosi: presenza di sintomi su frutto. le grandinate del 11/12 maggio e del primo giugno hanno creato lesioni importanti sia sui germogli che sui giovani frutti. Tale condizione è favorevole allo sviluppo della batteriosi, oltre che di funghi (Alternaria, Fusarium e Colletotrichum). In alcune situazioni, piuttosto circoscritte, si nota la presenza di sintomi di batteriosi in corrispondenza dell’apice fiorale.
Cydia pomonella: Raggiunta la sommatoria termica di 550° giorno per quanto riguarda lo sviluppo della carpocapsa, più bassa nelle zone verso il mare, più alta all’interno. Siamo nella fase di nascita delle larve e penetrazione nei frutti. Il volo continua sotto soglia (2 per trappola/giorno), tranne nelle aziende che hanno avuto danni l’anno scorso o che non si avvalgono della confusione sessuale: in questi casi le catture sono più abbondanti e arrivano sopra la soglia di intervento, giustificando dei trattamenti ovo-larvicidi.
Afidi: continua la presenza di afidi sia sulla pagina inferiore che superiore delle foglie che in alcuni casi stanno portando alla formazione di abbondante melata che, in previsione delle alte temperature previste per i prossimi giorni, può diventare causa di scottature sui frutti.
Cimice asiatica: in generale le catture di adulti sono in aumento su tutte le trappole. Sono presenti uova e individui giovani, oltre che adulti. Molte ovature risultano essere parassitizzate. Continuare con il monitoraggio periodico dei frutteti per verificar la necessità di eventuali trattamenti.`
  },
  {
    id: 'orto_11',
    type: 'orto',
    title: 'N°11 del 11/06/2026',
    number: 11,
    date: '11/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14337132/Orticolo_2026_11.pdf/202881b6-f506-42ab-810a-ea1c9dc58923',
    text: `SERVIZIO FITOSANITARIO REGIONE VENETO
U.O. Fitosanitario
BOLLETTINI FITOSANITARI DIFESA INTEGRATA
COLTURE ORTICOLE
Bollettino n. 11 del 11/06/2026
ORTICOLE IN PIENO CAMPO
PATATE
Stadio fenologico: PRECOCI: Codice BBCH da 91 - Inizio ingiallimento foglie a 93 – Maggior parte delle foglie giallastre. MEDIO TARDIVE: Codice BBCH: da 91 – Bacche di dimensione completa, verdi a 85 – Bacche della prima fruttificazione ocra brunastro.
Fisiopatie: Miglioramento delle deformazioni dei tuberi negli appezzamenti con trascorsi di sofferenza idrica a seguito di piogge e/o interventi irrigui. Ingiallimenti fogliari a seguito di ristagni idrici in zone colpite da forti piogge.
Peronospora: Infestazione generalizzata, con pressione più elevata in circa il 30/40% degli appezzamenti, rappresentati principalmente da quelli colpiti da grandine e/o vento forte.
Alternaria: pressione media, infestazione generalizzata e più evidenti in varietà precoci dove il difenoconazolo è stato applicato da circa 30/40gg. Necessari interventi con rame, viste le condizioni favorevoli allo sviluppo.
Dorifora: in generale bassa presenza, molto importante intervenire nel giusto momento di sviluppo del fitofago, ovvero giovani larve. Dove gli adulti riescono a riprodursi l’infestazione persiste e rendono necessari ulteriori interventi.
Tignola: fase delicata, in modo particolare su appezzamenti dove la pianta ha iniziato la fase di senescenza (spontanea o obbligata da grandine) ed il tubero sul terreno diventa più “sensibile” ed “a rischio”, vista la riduzione delle irrigazioni e l’apertura di crepe che permettono l’ingresso, in caso di presenza, del fitofago con conseguente ovodeposizione sui tuberi. Proseguire il monitoraggio con le trappole a feromoni.

POMODORO DA INDUSTRIA
Peronospora: le precipitazioni della settimana hanno creato le condizioni favorevoli all’infezione. Si raccomanda di monitorare attentamente nei prossimi giorni, con particolare attenzione la pagina inferiore delle foglie dove possono comparire i primi sporangi (organo della riproduzione contenente le spore e si presenta come una muffa bianca). Prediligere interventi con prodotti endoterapici e di copertura per arrestare eventuali infezioni in corso e rallentare la sporulazione. Rispettare la rotazione dei gruppi FRAC per prevenire l’insorgenza di resistenze. La classificazione FRAC è consultabile nelle Norme generali -allegato 3 - dei Disciplinari difesa integrata 2026.
Alternaria: le precipitazioni registrate nella settimana hanno determinato prolungati periodi di bagnatura fogliare con temperature favorevoli allo sviluppo del patogeno. Sono già visibili i primi sintomi in campo: si raccomanda di intervenire con una strategia combinata sistemico + copertura. Rispettare la rotazione dei gruppi FRAC per prevenire l’insorgenza di resistenze.
Batteriosi: nelle aree interessate dagli eventi grandinigeni si è registrata una forte diffusione. Applicare idonei criteri di difesa secondo le normative regionali intervenendo con prodotti a base di rame in addizione con veicolanti chelati per una migliore disinfezione.
Afidi: proseguire il monitoraggio settimanale. L’abbassamento delle temperature e le precipitazioni della settimana hanno contribuito a ridurre il numero di individui sulle piante. Si raccomanda di mantenere la soglia di intervento a 3-5 individui per pianta, valutando la presenza di nemici naturali prima di procedere con trattamenti insetticidi.
Heliotis armigera e Autographa gamma: si registra un incremento degli adulti presenti nel campo. Proseguire il monitoraggio settimanale per programmare un intervento con ovo-larvicida in concomitanza della schiusa delle uova.

CIPOLLA
Tripide: Nei trapianti effettuati nei mesi di marzo e aprile presenza di tripide (visibili nelle foglie soprattutto alla loro base) che provoca argentature fogliari con conseguenti ingiallimenti e disseccamenti vegetativi. Con reale presenza intervenire con i principi attivi indicati nel Disciplinare di Produzione Integrata della regione con l’aggiunta di un olio vegetale se la compatibilità dell’insetticida lo permette.

BATATA (PATATA DOLCE)
Consigli colturali: In questo periodo, viste le condizioni climatiche favorevoli, si consiglia di effettuare una zappatura o estirpatura superficiale per arieggiare il terreno ed eliminare l’eventuale presenza di erbe infestanti.

ZUCCA
Stato raccolta: Prosegue la raccolta delle varietà medie mentre siamo giunti quasi al termine in quella delle precoci. Discrete le qualità dei frutti come pezzatura e grado zuccherino; molto buona in quasi tutti gli impianti il controllo dei principali patogeni fungini nonché dei principali fitofagi.

ASPARAGO
Stemphylium: Su nuovi impianti specialmente al secondo anno con vegetazione superiore ad un metro di altezza, viste le condizioni atmosferiche, prestare molta attenzione a possibili attacchi di Stemphylium alla base dei turioni. Dove si riscontrassero le prime pustole intervenire con i principi attivi indicati nel Disciplinare di Produzione Integrata regionale.

COLTURE ORTICOLE IN SERRA
CETRIOLO
Pseudoperonospora e ragnetto: In questi giorni si nota presenza di Pseudoperonospora specialmente su colture con vegetazione molto lussureggiante. Per limitare le infezioni arieggiare il più possibile le serre, mantenere un solo stelo della pianta eliminando i germogli ascellari, limitare/eliminare le irrigazioni aeree, ridurre l’apparato fogliare eliminando anche alcune foglie specialmente nella parte bassa della pianta. Nel caso di forte presenza intervenire con i principi attivi indicati nel Disciplinare di Produzione Integrata regionale. Inoltre, si segnala presenza di ragnetto rosso sia su impianti in raccolta che su giovani impianti. Con inizio di infestazione intervenire con lanci di 10 individui/mq di Phytoseiulus persimilis con l’aggiunta di Amblyseius californicus (10 individui/mq).

PEPERONE
Ragnetto e tripide: Si nota presenza di ragnetto rosso e tripide; effettuare lanci di Phytoseiulus persimilis, Orius levigatus e successivamente lanciare Amblyseius swirskii e Neoseiulus californicus nel momento in cui le piante si toccano fra di loro in modo da avere la massima capacità di spostamento dell’insetto nella serra.

POMODORO
Ragnetto rosso: Con le alte temperature dell’ultimo periodo si è visto un incremento della presenza di focolai di ragnetto rosso che in tali condizioni sviluppa molto velocemente. Intervenire con lanci specifici di antagonisti o in alternativa con prodotti attivi contro questi fitofagi come indicato nelle nel Disciplinare di Produzione Integrata regionale, ponendo attenzione alla compatibilità di questi con gli insetti impollinatori presenti in quasi tutti gli impianti.

FRAGOLA
Malattie e fitofagi: Continua la raccolta solo negli impianti fuori suolo ed ormai esclusivamente su varietà rifiorenti. Lo stato fitosanitario è da considerarsi buono con ottimo controllo sia di tripide che di ragnetto rosso da parte dei relativi predatori. Grazie anche alle condizioni meteo favorevoli sono praticamente assenti sintomi da botrite mentre occorre tenere alta l’attenzione verso l’oidio sempre attivo e pericoloso in questo periodo. Eventualmente, ove necessario, intervenire con prodotti antioidici come indicato nel Disciplinare di Produzione Integrata.

MELANZANA
Ragnetto rosso: Come su pomodoro anche su questa solanacea si nota un forte aumento della presenza di ragnetto rosso. Dove in precedenza si sono effettuati lanci di predatori specifici valutarne un eventuale integrazione con ulteriori distribuzioni mirate. Attenzione sempre al monitoraggio della presenza del miride Lygus r. che in questa annata risulta particolarmente attivo.`
  },
  {
    id: 'olivo_17',
    type: 'olivo',
    title: 'N°17 del 11/06/2026',
    number: 17,
    date: '11/06/2026',
    url: 'https://www.regione.veneto.it/documents/11979050/14331610/Olivicolo_2026_17.pdf/2cfcd3f0-4973-4b4b-89bb-88955367bf04',
    text: `SERVIZIO FITOSANITARIO REGIONE VENETO
U.O. Fitosanitario
BOLLETTINI FITOSANITARI DIFESA INTEGRATA
In collaborazione con AIPO Reg. (UE) 2021/2116 P.O. OCM Olio anno 2026
OLIVO
Bollettino n. 17 del 11/06/2026
FENOLOGIA
Tra allegagione e primo ingrossamento del frutto, con nocciolo in fase iniziale di indurimento.

SITUAZIONE FISIOLOGICA DELLE PIANTE
Gli olivi presentano un buon stato vegetativo. L’allegagione rimane non uniforme tra areali, con differenze legate soprattutto alla variabilità termica di fine maggio, con qualche lieve ritardo nelle zone più fredde o soggette a temporali intensi.

SITUAZIONE FITOSANITARIA
Tignola dell’olivo (Prays oleae): la generazione carpofaga è attiva in tutti gli areali monitorati. Le catture risultano inferiori rispetto alle ultime annate, ma la presenza di ovideposizioni e prime penetrazioni larvali rende necessario un intervento entro i prossimi 7 giorni, in corrispondenza della fase di maggiore suscettibilità dell’oliva. Prodotti utilizzabili in questa fase: Bacillus thuringiensis, agisce sulle giovani larve, Azadiractina, agisce come regolatore di crescita e inibitore dell’alimentazione delle giovani larve, Silicato di alluminio (caolino calcinato) crea una barriera fisica.
Margaronia (Palpita unionalis): presenze del fitofago su germogli e foglie giovani. Gli interventi eseguiti contro la tignola risultano indirettamente efficaci anche su questo lepidottero.
Cotonello (Euphyllura olivina): dopo il calo dovuto ai temporali, si osserva una ripresa delle colonie sui germogli teneri, con possibile produzione di melata e rischio di fumaggini. I trattamenti eseguiti per altri parassiti contribuiscono a limitarne la diffusione.
Cimice asiatica (Halyomorpha halys): popolazione in moderato incremento, con presenza di adulti, ovature e primi stadi giovanili. Gli interventi contro la tignola a base di deltametrina esercitano un effetto collaterale utile, pur non sostituendo strategie dedicate.
Cocciniglia mezzo grano di pepe (Saissetia oleae): rilevate schiuse oltre il 65%. Si consiglia di attendere i prossimi bollettini per definire il momento ottimale di intervento. I trattamenti contro la tignola possono avere effetti positivi indiretti.
Mosca delle olive (Bactrocera oleae): dalla prossima settimana è consigliata l’installazione delle trappole a cattura massale, utile per ridurre la popolazione iniziale e monitorare l’andamento stagionale.
Fumaggini: segnalate in oliveti con presenza di cotonello e cocciniglie.
Malattie fungine: Occhio di pavone (Spilocaea oleagina); Lebbra (Colletotrichum spp.); Piombatura (Pseudocercospora cladosporioides), l’aumento delle temperature e la riduzione della bagnatura fogliare hanno abbassato il rischio infettivo. Solo se necessario, intervenire con Sali rameici, utili anche contro Pseudomonas savastanoi (Rogna dell’olivo); Dodina; Fosfonato di potassio; Bacillus subtilis ceppo OST 713.
Si raccomanda di verificare l’efficacia dopo il trattamento e valutare eventuali interventi successivi.`
  }
];
