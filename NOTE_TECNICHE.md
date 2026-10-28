# Architettura e modifiche della versione 2

## Comunicazione indipendente dall'hosting

`bridge.ts` carica un iframe dall'URL Apps Script `/exec`, passando l'origine del sito e un canale casuale a 256 bit. Apps Script verifica l'origine nella proprietà `APP_ORIGINS` e serve `Bridge.html`. La pagina usa `google.script.run` per chiamare `dispatch`; non legge risposte `no-cors` e non usa API Netlify.

Google annida HtmlService in un proprio frame. La prima risposta viene associata al canale casuale e a un'origine HTTPS Google ammessa; le successive richiedono esattamente la stessa finestra sorgente, origine, canale e identificativo della richiesta. Il frame verifica l'origine e la finestra dell'app prima di inoltrare la richiesta. Questo controllo protegge la comunicazione del browser; l'autorizzazione dei dati viene verificata separatamente dal server e non si basa sul solo campo origine.

Le operazioni sono serializzate nel browser e il server usa `getScriptLock()`. Ogni richiesta ha un timeout e le ricevute vengono prodotte soltanto quando il server conferma l'intero invio. L'eventuale errore dopo una scrittura ma prima della risposta non viene interpretato come certezza di mancata scrittura: il reinvio conserva l'ID della richiesta.

## Ruoli e dati

- La segreteria usa `ADMIN_PASSWORD` per registrare gli snapshot dei turni, consultare gli esiti correnti e rettificare.
- I token sono HMAC del ruolo e dell'identificativo dello snapshot, usando `SIGNING_SECRET` nelle proprietà Apps Script. Il token studente non consente operazioni tutor.
- Il tutor deve possedere il token del turno e conoscere `TUTOR_PASSWORD`. Il nome tutor è dichiarato e non viene equiparato a un'identità autenticata individualmente.
- Lo studente deve possedere il token studente e conoscere il PIN casuale del turno. Può registrare solo `present` per una matricola presente nell'elenco autorizzato. Il nome e il codice prenotazione vengono recuperati dall'elenco server.
- I token sono nel frammento del link QR, senza l'intero elenco nominativo. Gli elenchi risiedono nel Foglio e vengono caricati solo quando serve. Un QR è comunque un codice di accesso: non va pubblicato su pagine aperte estranee al flusso dei tirocini.
- Il PIN non viene riportato nelle presenze registrate o nelle ricevute; resta nello snapshot del turno. Dopo venti PIN errati il turno è temporaneamente bloccato tramite cache Apps Script. Questo è un contenimento degli errori/abusi, non una protezione illimitata contro attacchi o esaurimento delle quote Google.

Le credenziali segreteria sono conservate solo in `sessionStorage` della scheda. I codici tutor restano nello stato del modulo aperto. Gli stati confermati e le bozze dei reinvii sono in `localStorage` del dispositivo; le bozze persistenti escludono PIN e token. Le schermate richiedono di lasciare aperto il modulo se la conferma manca: non è implementata una sincronizzazione automatica in background di tutte le bozze archiviate.

## Integrità e rettifiche

La presenza è identificata da data, risorsa normalizzata, fascia normalizzata e matricola. Lo snapshot del turno ha invece un identificativo che include l'elenco degli iscritti: un elenco modificato genera nuovi QR, senza creare una seconda identità della stessa presenza.

Ogni evento conserva l'esito, i minuti, il metodo, il validatore dichiarato, le note individuali e generali, l'orario server, l'identificativo della richiesta e una ricevuta HMAC che copre questi dati. Non è un semplice conteggio di presenti e assenti.

Le rettifiche aggiungono eventi allo storico. `list` restituisce l'ultimo evento per presenza. Un invio studente successivo non può correggere un esito tutor o segreteria: se quell'esito è assente viene richiesto l'intervento del tutor; se è presente/ritardo viene restituito l'esito già accertato. Una richiesta con lo stesso ID e dati differenti viene rifiutata. Richieste semanticamente identiche all'esito corrente non generano un nuovo evento.

Tutte le righe di un invio vengono validate prima dell'operazione di scrittura. Il Foglio non è un database transazionale: il lock protegge le esecuzioni di questo progetto Apps Script, non modifiche manuali o scritture da altri progetti. Per questo le schede tecniche non vanno alterate durante l'operatività.

## Configurazione e portabilità

Vite usa `base: './'`; logo e favicon sono risolti rispetto al percorso dell'app. Nessun servizio server dell'hosting è necessario. La dipendenza per la raccolta centralizzata resta Google Apps Script e Google Sheets.

Il workflow GitHub compila e pubblica solo `dist`, dopo TypeScript e test. Non pubblica un database o una funzione server. Nel pacchetto non è incluso un `dist` precompilato non verificato: GitHub lo costruisce con le dipendenze bloccate nel lock npm. I limiti della verifica locale e il collaudo richiesto sono descritti in `COLLAUDO.md`.

La migrazione non converte automaticamente i registri della versione 1 e non rende validi i vecchi sigilli. La conservazione dei vecchi dati avviene tramite archivio separato.
