# Report Manager 4.0 — aggiornamento dalla 3.1

Questa guida sostituisce le istruzioni di aggiornamento delle versioni 3 e 3.1. Il pacchetto contiene il progetto completo. Non è stato distribuito automaticamente: aggiornare prima Apps Script e poi GitHub. La prima prova va svolta sulla copia del Foglio, con una cartella Drive di prova separata.

## 1. Prima di cambiare il codice

1. Conservare ZIP del codice attuale, copia del Foglio operativo e ultima versione Excel Drive. Non cancellare o rinominare le schede.
2. Conservare in modo riservato le Proprietà script, in particolare SIGNING_SECRET, password e URL. Non inserirle nei file GitHub.
3. Per il collaudo usare un progetto Apps Script di prova che punti alla copia del Foglio e a una cartella Drive separata: cambiare SPREADSHEET_ID e ARCHIVE_FOLDER_ID solo in quel progetto. Copiare le altre proprietà necessarie. Non usare la cartella degli archivi operativi per dati dimostrativi.
4. Annotare tutte le distribuzioni web attive, comprese quelle precedenti. Una vecchia distribuzione esegue ancora il vecchio codice e può scrivere senza i controlli di chiusura della 4.0.

## 2. Aggiornare Apps Script

Nel progetto prescelto, sostituire il contenuto dei file con quelli della cartella `apps-script`:

| File nel progetto | File del pacchetto | Operazione |
| --- | --- | --- |
| Code.gs oppure Codice.gs | Code.gs | Sostituire, senza duplicare le funzioni |
| Weekly.gs | Weekly.gs | Sostituire |
| Archive.gs | Archive.gs | Sostituire |
| V4.gs | V4.gs | Aggiungere se assente |
| Bridge.html | Bridge.html | Sostituire |
| Portal.html | Portal.html | Sostituire |
| appsscript.json | appsscript.json | Sostituire; rendere visibile dalle impostazioni progetto |

Conservare SPREADSHEET_ID, APP_URL, APP_ORIGINS, ADMIN_PASSWORD, TUTOR_PASSWORD, SIGNING_SECRET e ARCHIVE_FOLDER_ID già configurati per l'ambiente scelto. APP_URL deve terminare con `/`; APP_ORIGINS contiene l'origine HTTPS senza percorso. Il manifesto richiede accesso a Sheets e Drive.

Aggiungere temporaneamente questa funzione pubblica, salvarla, selezionarla dal menu ed eseguirla una volta:

```javascript
function avviaInizializzazioneV4() {
  initialize_();
}
```

Autorizzare l'accesso quando richiesto. L'inizializzazione conserva le schede precedenti e aggiunge RM4_Periodi, RM4_Unita, RM4_Manifesti, RM4_Stato, RM4_Appelli e RM4_QR. Crea `RM4_CLEANUP_ENABLED` con valore `false` se manca. Rimuovere il wrapper dopo l'esecuzione. Non modificare manualmente queste schede di servizio.

Distribuisci → Gestisci distribuzioni → matita sulla distribuzione esistente → Nuova versione → Distribuisci. Conservare Esegui come me e l'accesso necessario ai QR. Aggiornando la stessa distribuzione si mantiene il suo URL `/exec`. Un semplice salvataggio del codice non aggiorna la distribuzione web.

Prima di abilitare qualsiasi rimozione, aggiornare alla 4.0 **tutte le distribuzioni attive** che puntano allo stesso Foglio, oppure archiviare quelle inutilizzate. Non basta aggiornare solo l'ultimo URL.

## 3. Aggiornare GitHub

1. GitHub Desktop: Fetch/Pull prima di copiare i nuovi file; conservare altrove eventuali modifiche locali da recuperare.
2. Copiare il contenuto della cartella del progetto estratto nella radice del repository, mantenendo le sottocartelle. Non creare una cartella annidata con l'intera applicazione.
3. Includere `.github/workflows/pages.yml` e `public/.nojekyll`. Non copiare node_modules o dati personali.
4. Verificare `public/report-manager.config.json`: l'URL deve essere quello della distribuzione che si sta usando. Il pacchetto contiene l'ultimo URL operativo fornito durante il lavoro; per la prova va cambiato con l'URL di prova.
5. Commit, Push; attendere l'esito verde di Actions. Il workflow esegue TypeScript, test e build prima della pubblicazione. Con esito rosso non procedere al collaudo come se il nuovo sito fosse pubblicato.
6. Ricaricare il sito. Verificare anche un dispositivo mobile e l'alternativa diretta Apps Script.

## 4. SIZOS dentro Azienda Zootecnica

In Pubblicazione settimanale aprire la gestione centrale e selezionare **Configura periodi tirocinio SIZOS**. Compaiono quattro righe impilate:

| ID Affluences | Risorsa | Area |
| --- | --- | --- |
| 133367 | SIZOS: Turno 1 | Azienda Zootecnica |
| 133368 | SIZOS: Turno 2 | Azienda Zootecnica |
| 133369 | SIZOS: Turno 3 | Azienda Zootecnica |
| 133370 | SIZOS: Turno 4 | Azienda Zootecnica |

Caricare il CSV con le prenotazioni. Per ogni risorsa scegliere la data iniziale presente nel CSV; la fine proposta è inizio +14 giorni, dunque 15 giorni inclusivi. È modificabile; il limite applicativo è 91 giorni inclusivi per periodo. Si possono escludere singole date. Esempio: 21 dicembre–4 gennaio sono 15 giorni; 21 dicembre–5 gennaio sono 16, consentiti impostando la fine esplicitamente.

Pubblicare ogni periodo con il suo pulsante. SIZOS è escluso dalla normale pubblicazione sabato–venerdì. Date iniziali diverse creano periodi distinti; la stessa risorsa può conservare più edizioni. La data iniziale deriva dalla prenotazione: non viene spostata silenziosamente.

Per modificare un periodo con esiti già registrati serve la conferma esplicita; gli eventi precedenti restano conservati. Se tutte le prenotazioni vengono cancellate, il ritiro dell'elenco richiede la conferma dedicata. Non si può creare un nuovo periodo vuoto.

I collegamenti tutor devono autorizzare l'area Azienda Zootecnica e i nuovi ID; un vecchio collegamento limitato ad altre risorse non acquista automaticamente queste autorizzazioni. Controllare che la sua scadenza copra tutto il periodo e gli eventuali giorni di rettifica.

Nell'area tutor si sceglie il periodo e poi il giorno; il QR è unico per quel periodo. Lo studente seleziona il proprio nome e conferma il giorno corrente, calcolato dal server nel fuso italiano. Non serve PIN. È consentito a ogni ora nelle date incluse; giorni esclusi e date esterne sono bloccati. Non si certificano identità, presenza fisica, ore minime o completamento. Il tutor può rettificare gli esiti delle giornate del periodo finché è aperto.

## 5. Registri e salvataggio tutor

Personalizza Registro & Logo offre firma unica oppure firme entrata/uscita. Le due nuove firme sono deselezionate inizialmente e incompatibili con la firma unica. Sono opzionali anche ora entrata, ora uscita e ore svolte: spazi da compilare sul cartaceo, senza calcolo automatico di ore riconosciute. La stampa periodo SIZOS è nelle opzioni del periodo tutor e comprende le giornate ammesse e lo stesso QR del periodo. La stampa è una soluzione di emergenza, da preparare con rete disponibile.

Le schermate tutor si aggiornano all'apertura, al ritorno in primo piano, al cambio selezione e con il comando manuale. Non interrogano Google ogni 30 secondi. Dopo aver scelto un esito attendere **la conferma del salvataggio** prima di chiudere. L'avviso del browser durante una scrittura è un aiuto: nessuna applicazione web può garantire l'esito se il dispositivo chiude la pagina prima della risposta. In caso di dubbio riaprire e rileggere lo stato; non presumere il successo.

Per i turni ordinari rimane la finestra studente da 30 minuti prima dell'inizio a 60 minuti dopo la fine. Non viene assegnato automaticamente il ritardo. Il tutor può concludere l'appello; una modifica successiva ne invalida la conclusione.

## 6. Excel cumulativo e Storico Studente

Dopo un accesso amministrativo verificato viene aperto e unito l'ultimo archivio gestito nella cartella Drive; il nome del file è visibile. Se non esiste, acquisire il Foglio e salvare il primo file. L'acquisizione delle nuove registrazioni dal Foglio rimane manuale. Gli Excel precedenti si possono ancora importare e unire. Le nuove versioni non eliminano quelle vecchie.

Anche le prenotazioni dei CSV caricati vengono conservate nell'archivio in memoria: ricaricare una volta i CSV storici che si vogliono includere, perché non è possibile ricostruire file mai acquisiti. Salvare dopo gli aggiornamenti. Le schede 4 e 5 consultano l'archivio in memoria: può contenere dati appena acquisiti e non ancora salvati nell'Excel. Non eseguono una lettura continua del Foglio.

Storico Studente propone il confronto tra prenotazioni acquisite e presenze; mantiene anche la vista del CSV corrente. Le prenotazioni senza esito sono **In attesa di registrazione**, mai assenze automatiche. Una cancellazione con presenza è segnalata. Per SIZOS l'elenco delle giornate disponibili non indica un obbligo di frequentarle tutte. Si mostrano durata prevista e ritardo; non si calcolano ore riconosciute.

L'Excel 4.0 usa schema 2, legge e converte lo schema 1 della 3.1. La 3.1 non può rileggere i nuovi file schema 2: conservare la versione precedente per un eventuale ripristino. Le tabelle leggibili non vanno modificate a mano; il contenuto verificato è conservato nel file. Nessuna divisione obbligatoria per anno accademico. Limiti applicativi: 6 MiB per scambio diretto Drive, 30 MiB per importazione manuale. Non è una previsione di capienza o prestazioni: i volumi reali vanno collaudati.

## 7. Chiudere e alleggerire il Foglio

Scadenze indicative: conclusione tutor entro 7 giorni e verifica segreteria entro 14 giorni dalla fine della settimana o del periodo SIZOS. Il programma segnala la scadenza; non chiude né cancella automaticamente. La segreteria può chiudere soltanto dopo la data finale, anche con presenze ancora in attesa, indicando operatore e motivo. I cartacei tardivi saranno aggiunti come rettifiche.

In Archivio presenze Excel → **Chiusura e archiviazione verificata**:

1. Carica settimane e periodi. Seleziona singole unità oppure quelle concluse prima di una data.
2. Indica operatore e motivo; premi **Chiudi selezionate**. Da questo momento sono bloccate nuove registrazioni nell'unità.
3. Premi **Acquisisci esportazione chiusa**: include gli eventi e tutte le versioni dei prenotati congelate alla chiusura.
4. Nella sezione 3 premi **Salva nuova versione in Drive** e attendi la conferma.
5. Torna alla chiusura e premi **Verifica Excel Drive per la rimozione**. Il programma rilegge il file effettivamente salvato e controlla la corrispondenza con i dati chiusi. Il normale pulsante di verifica di un file locale non sostituisce questa verifica per la rimozione.
6. Solo dopo il collaudo su copia e il controllo delle distribuzioni attive, impostare la Proprietà script `RM4_CLEANUP_ENABLED` a `true` nell'ambiente in cui si vuole usare la rimozione. Non serve una nuova versione per cambiare questa proprietà. Ricaricare l'elenco delle unità.
7. **Rimuovi dati Google verificati**, poi digitare `RIMUOVI`. È un'operazione esplicita di cancellazione dei soli dati operativi verificati. Gli Excel e gli accessi tutor restano; gli altri periodi rimangono utilizzabili.

Prima della rimozione si può riaprire un'unità chiusa, con motivo. La riapertura invalida le precedenti verifiche e richiede una nuova esportazione. Dopo la rimozione restano ricevuta e blocchi dei vecchi QR; non si ripubblica la stessa unità. Un'interruzione durante la rimozione lascia lo stato dedicato e il comando **Riprendi rimozioni interrotte**, che ricontrolla il file originale. Non riparare eliminando righe a mano. Conservare i file Drive verificati: non spostarli, modificarli o cestinarli durante queste operazioni.

La pulizia ordinaria rimane disabilitata con `RM4_CLEANUP_ENABLED=false`. Non basta questo interruttore per rendere utilizzabili vecchie distribuzioni: quelle vanno aggiornate o disattivate prima del primo uso della pulizia.

## 8. Cartacei tardivi e rettifiche

Per unità già rimosse usare **Rettifica di uno storico già archiviato**. Caricare l'archivio completo, cercare la partecipazione, scegliere esito, operatore e motivazione; selezionare la provenienza cartacea quando pertinente. La rettifica aggiunge un evento, conserva il precedente e non riscrive il Foglio. Salvare una nuova versione Drive. Per unità aperte usare l'appello; per unità chiuse e ancora presenti riaprire prima.

## 9. Verifiche prima dell'uso operativo

Seguire COLLAUDO_V4.md. I test locali con servizi simulati non dimostrano il funzionamento dei permessi Google, delle sessioni dei telefoni, della stampa o dei limiti Apps Script con i vostri dati. La build completa e i test XLSX reali devono passare su GitHub Actions prima di considerare la versione pronta per la produzione.
