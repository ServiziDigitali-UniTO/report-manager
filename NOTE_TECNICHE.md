# Report Manager 4.0 — note tecniche

## Architettura e dati

Frontend statico React/Vite, bridge Apps Script con validazione dell'origine, credenziali server e collegamenti tutor limitati per area/risorsa/scadenza. Nessun servizio Netlify o database aggiuntivo. Il Foglio contiene eventi operativi e pubblicazioni; Drive conserva versioni Excel indipendenti. L'archivio centrale risiede in memoria nella pagina e viene salvato esplicitamente. Le schede 4/5 non leggono periodicamente il Foglio.

Le sei nuove schede RM4 contengono versioni periodi, stato unità, esportazioni congelate temporanee, indice degli esiti correnti, conclusioni appello e blocchi dei QR archiviati. Le letture tutor usano l'indice relativo all'unità; in caso di conteggio eventi incompatibile viene ricostruito dal registro. Le scritture e i cambi di stato sono serializzati con LockService. Gli eventi rimangono append-only fino alla pulizia esplicita delle unità verificate. Gli indici sono dati tecnici: non modificarli manualmente.

SIZOS: identità periodo da ID risorsa + data iniziale; identità giornaliera distinta. L'intervallo interno 00:00–23:59 rappresenta la giornata, non una durata riconosciuta di tirocinio. QR firmato per periodo, giorno studente deciso dal server Europe/Rome. Il tutor può correggere finché l'unità è aperta; la chiusura è controllata lato server anche per i percorsi legacy aggiornati alla 4.0.

## Archivio e integrità

Schema Excel 2; lettura compatibile con schema 1. `_RM_Dati` contiene i dati verificabili; i fogli visibili sono rappresentazioni. Deduplicazione per fonte/ID evento e versione, prenotazioni storiche per contenuto. CSV successivi vengono uniti, non usati per cancellare implicitamente la storia. I dati mancanti non diventano assenze.

La chiusura congela una fotografia e la sua impronta. Il client rilegge i byte dell'ultimo Excel Drive, ricostruisce il contenuto chiuso e lo confronta con il server. Il ticket firmato lega unità, esportazione, impronta e file. La pulizia ricontrolla file conservato nella cartella e contenuto operativo; una ripresa consente solo un sottoinsieme invariato della fotografia originale. Non è una firma dell'identità dell'operatore né un sistema di autenticazione individuale degli studenti.

RM4_CLEANUP_ENABLED=false è la configurazione iniziale. Le vecchie distribuzioni Apps Script, se ancora attive con codice precedente, non hanno questi vincoli: aggiornarle o disattivarle prima di abilitare la pulizia. Non eliminare manualmente ricevute o blocchi QR. Nessuna cancellazione automatica di Excel. Le correzioni successive aggiungono eventi locali motivati nell'archivio e richiedono nuovo salvataggio.

## Limiti e verifiche

Niente intervallo tutor ogni 30 secondi e niente coda offline. Non si garantisce una scrittura se la pagina chiude prima della conferma. Aggiornamenti su ingresso/rientro e comando manuale. Rete e sessioni Google vanno provate sui dispositivi effettivi.

Limiti applicativi: periodo SIZOS massimo 91 giorni inclusivi; trasferimento Drive diretto 6 MiB; importazione manuale 30 MiB. Il Foglio ha comunque limiti e quote Google; non sono stati misurati throughput, latenza o capienza nel vostro utilizzo reale. Indice e letture mirate riducono la quantità di dati degli esiti letta dai tutor; pubblicazioni, esportazioni e alcune operazioni amministrative continuano a leggere insiemi più ampi.

`npm run check` è la verifica richiesta prima della distribuzione. Il riepilogo delle sole verifiche effettivamente eseguite è VERIFICHE_V4.txt. Il collaudo reale è COLLAUDO_V4.md. Le vecchie guide sono conservate come riferimento storico e non descrivono il flusso operativo 4.0.
