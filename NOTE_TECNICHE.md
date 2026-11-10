## Archivio 3.1 (prima fase)

Vedere AGGIORNAMENTO_ARCHIVIO_3_1.md per nuovi endpoint archive.*, ambito Drive, versioni, formato Excel e limiti. La scheda 5 usa ArchiveReport e non il componente ShiftResourceReport precedente, mantenuto nei sorgenti per compatibilità. Lo Storico Studente contiene due viste distinte. La lettura periodica delle aree tutor è invariata. Nessuna API di cancellazione è stata aggiunta.

# Note tecniche versione 3

## Un solo progetto, due accessi alla stessa UI

`src/weekly/WeeklyRouter.tsx` contiene registro tutor e autoconvalida. L'app principale li apre tramite hash routing. Vite compila anche `src/tutor-entry.tsx` come `tutor.js`: `Portal.html` può caricare questa stessa UI direttamente dalla distribuzione Apps Script, senza il ponte iframe fra il sito statico e Google.

Nel portale nativo il trasporto è `google.script.run`; sul sito rimane il ponte con verifica di origine, sorgente, canale casuale e ID richiesta. Il trasporto nativo usa l'origine del sito configurato e verifica i risultati con gli stessi criteri del trasporto normale. Il controllo dell'origine non sostituisce l'autorizzazione server. Il portale Google è un'alternativa da collaudare, non una promessa di soluzione universale al problema multi-account.

## Dati e pubblicazioni

Il parser `parseAffluencesCsv` è riutilizzato. `buildWeek` seleziona la settimana e scarta le cancellazioni riconosciute dal parser; non riscrive la logica del CSV. Il server assegna le aree per ID risorsa e costruisce uno snapshot normalizzato.

Il turno settimanale è identificato da ID risorsa, data e fascia. La prenotazione all'interno del turno usa il codice prenotazione. I codici ripetuti in turni diversi sono quindi distinti. Matricole mancanti sono ammesse con identificazione tramite codice prenotazione e avviso alla segreteria; gli studenti fuori elenco inseriti dal tutor devono avere matricola.

`RM_Turni_Settimanali` contiene le versioni degli snapshot. Solo il puntatore in `RM_Settimane` determina quale pubblicazione è visibile. Gli snapshot vengono scritti e confermati prima di aggiornare quel puntatore. Una scrittura incompleta non rende visibile una settimana a metà. Non è una transazione generale di database: eventuali snapshot orfani dopo un errore restano non visibili.

La pubblicazione è completa per l'intera settimana. Si confronta l'ID della pubblicazione attesa per evitare modifiche simultanee fra segreterie. Le rimozioni con esiti già registrati richiedono una conferma esplicita; lo storico non viene eliminato e gli iscritti rimossi non sono reinseriti silenziosamente come fuori elenco.

## Esiti e concorrenza

Lo storico mantiene le 18 colonne di `Presenze_Tirocini`; vengono aggiunti attributi nel JSON della colonna R. La chiave delle presenze resta compatibile con la versione 2: data, nome risorsa normalizzato, fascia e matricola; in mancanza di matricola si usa il codice prenotazione. I nomi canonici delle risorse sono definiti dal server. Una rinomina del nome canonico può richiedere riconciliazione delle presenze esistenti e non va effettuata come modifica cosmetica durante una settimana.

Il motore `commitEvents_` applica identificativi richiesta, ricevute HMAC, priorità tutor rispetto allo studente e controllo dell'ID evento atteso per le rettifiche settimanali. Lo script lock protegge pubblicazioni e scritture concorrenti di questo progetto; non protegge modifiche manuali alle celle o scritture di altri progetti.

Gli esiti tutor usano `TUTOR_QR`; le trascrizioni da cartaceo usano `CARTACEA` con nota obbligatoria; le rettifiche della segreteria negli strumenti precedenti usano `MANUALE`. L'autoconvalida usa `STUDENTE_QR`, sempre presente con zero minuti. Non può sovrascrivere un esito già verificato da tutor/segreteria. Le discrepanze fra una precedente autoconvalida e un esito tutor diverso da presente sono segnalate.

## Accessi e QR

I collegamenti tutor contengono un ID e un segreto casuale. Nel Foglio è salvata l'impronta del segreto, insieme a risorse autorizzate, scadenza e revoca. Ogni lettura, incluso il polling che non restituisce dati modificati, verifica l'accesso. Il segreto è mostrato alla segreteria una sola volta al momento dell'emissione. Nel browser può essere memorizzato per evitare richieste ripetute; non è un login personale e può essere trasferito.

Il QR studente usa un HMAC distinto e legato al turno, senza privilegi tutor e senza PIN. Il server rilegge l'elenco attualmente pubblicato e controlla la finestra da 30 minuti prima a 60 minuti dopo il turno secondo Europe/Rome. La selezione del nominativo non prova l'identità; il tutor verifica gli esiti. La rotazione di `SIGNING_SECRET` invalida i QR firmati, inclusi quelli v2; non effettuarla durante la migrazione ordinaria.

## Sincronizzazione online

La UI legge all'apertura, ogni 30 secondi se visibile e al ritorno nella pagina. Confronta una revisione prima di riscaricare gli elenchi. La revisione è aggiornata anche dalle scritture v2: i due percorsi vedono lo stesso storico.

Nelle nuove aree non sono memorizzati roster o esiti per l'uso offline e non è presente una coda di invio automatico dopo la chiusura della pagina. Un comando non confermato conserva l'ID solo in memoria per il reinvio dallo stesso modulo. Un ricaricamento richiede di rileggere lo stato dal server. Gli strumenti precedenti mantengono la loro cache locale, che non è una sincronizzazione offline del nuovo sistema.

Non tutti i caricamenti sono incrementali: il primo caricamento e i cambiamenti di revisione leggono ancora lo storico server. I poll senza modifiche sono più leggeri. Per volumi elevati occorre misurare le prestazioni e valutare ulteriori indici/archiviazione.

## Limiti del pacchetto

Il sito rimane statico; Apps Script è il servizio Google già previsto. Non sono introdotti database esterni, servizi Netlify o dipendenze npm aggiuntive. Vite resta alla versione 6 bloccata nel lock. Il pacchetto richiede build GitHub e collaudo Google/browser reale prima della sostituzione operativa. I risultati locali sono in `COLLAUDO.md`.
