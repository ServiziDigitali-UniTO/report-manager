# Collaudo Report Manager 4.0

Eseguire prima sulla copia del Foglio, con cartella Drive di prova separata e distribuzione di prova. Non modificare la configurazione operativa per effettuare prove distruttive. Conservare il backup. Questo è un elenco di verifiche da svolgere, non un verbale di prove già superate su Google.

## Verifiche tecniche

- `npm ci` e `npm run check` con Node 24; Actions deve risultare verde.
- Inizializzazione: tutte le vecchie righe restano; vengono aggiunte sei schede RM4. Ripetere l'inizializzazione non le duplica.
- Con RM4_CLEANUP_ENABLED=false il server rifiuta una rimozione anche se chiamata direttamente.
- Tutte le distribuzioni ancora utilizzabili sul Foglio devono eseguire la 4.0 prima dell'abilitazione della pulizia.

## Pubblicazione e dispositivi

- Pubblicare una settimana ordinaria; i quattro ID SIZOS non devono entrare nella pubblicazione settimanale.
- Creare un periodo SIZOS da una prenotazione CSV: fine predefinita inizio+14; modificare fine ed escludere una data. Provare una seconda edizione della stessa risorsa.
- Collegamento tutor Azienda: elenco periodo, tutte le date ammesse, nominativi corretti; un accesso limitato ad altre risorse non deve leggere il periodo.
- QR del periodo da schermo e stampa, su due telefoni: senza PIN, una sola registrazione per giorno e studente. Giorno italiano corrente imposto dal server; data esclusa o esterna rifiutata.
- Ordinari: controllare i bordi della finestra -30 minuti / +60 minuti dopo la fine. Nessun ritardo automatico.
- Presente, assente, ritardo e rettifica con note; due tutor contemporanei devono ricevere un conflitto se modificano una versione superata.
- Inviare e interrompere la rete: non deve apparire una conferma falsa. Riprovare e riaprire verificando l'assenza di duplicati.
- Verificare aggiornamento all'apertura/rientro e comando manuale; nessun intervallo di 30 secondi. Verificare telefoni con account Google multipli e alternativa diretta.
- Concludere un appello ordinario e modificarlo successivamente: la conclusione deve essere invalidata.

## Stampa e storico

- Le due firme nuove sono inizialmente disattivate. Firma unica e firme entrata/uscita si escludono. Provare orari e ore svolte, orientamento e PDF.
- Stampare periodo con QR leggibile e tutte le giornate incluse; verificare che non compaiano colonne di ore certificate automaticamente.
- Importare Excel 3.1, acquisire, salvare nuovo schema 2, riaprire dopo ricaricamento e confrontare dati e file indicato.
- Importare due CSV consecutivi, anche con sovrapposizione o cancellazioni. Storico Studente deve mantenere il confronto storico, senza generare assenze dai dati mancanti.
- Nuova acquisizione identica: nessun evento duplicato. Una rettifica deve restare distinguibile dall'evento precedente.

## Chiusura, rimozione e recupero — solo su copia

- Preparare una settimana e un periodo conclusi, alcuni esiti e almeno un nominativo senza esito.
- Chiudere con operatore/motivo: nuove scritture e vecchi QR devono essere bloccati; nessuna assenza automatica.
- Esportare chiusi, salvare Drive, rileggere/verificare; provare a rimuovere senza verifica, con file diverso o modificato: rifiuto.
- Riaprire prima della rimozione: il vecchio ticket di verifica non deve più funzionare; riesportare e salvare.
- Solo nell'ambiente di prova abilitare RM4_CLEANUP_ENABLED=true. Confermare RIMUOVI e controllare le sole unità selezionate; gli altri turni e accessi devono restare.
- Verificare ricevuta, vecchi QR bloccati e ripubblicazione della stessa unità impedita. Eventuale errore intermedio: usare Riprendi rimozioni interrotte.
- Aggiungere una rettifica cartacea tardiva su un'unità rimossa, salvare e riaprire l'Excel: esito nuovo e precedente conservati, nessuna riscrittura del Foglio.

## Stato delle verifiche alla consegna

I test automatizzati verificano regole di dominio, migrazione, deduplicazione, chiusura, integrità, concorrenza e recupero con servizi simulati. Il riepilogo effettivo è in VERIFICHE_V4.txt. La verifica sintattica TS/TSX non equivale a TypeScript/build. L'ambiente di preparazione riceve HTTP 403 dal registro npm; non è stato possibile completare l'installazione, quindi typecheck, build e quattro test che richiedono XLSX rimangono da eseguire con le dipendenze installate. Non è stato eseguito il collaudo su Google reale o browser/dispositivi.
