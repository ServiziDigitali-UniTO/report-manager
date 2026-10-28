# Report Manager — versione 2 per GitHub Pages

Web app statica React/TypeScript per elaborare report Affluences, produrre registri, consultare statistiche e raccogliere presenze. Nessun database e nessuna funzione Netlify. I CSV vengono elaborati nel browser; solo i turni digitali preparati e le presenze vengono inviati al Foglio Google configurato con Apps Script.

**Prima installazione: leggere [PUBBLICAZIONE.md](PUBBLICAZIONE.md).** Il pacchetto è predisposto per pubblicazione e collaudo: non contiene l'ID del tuo Foglio, l'URL della distribuzione o credenziali reali. Il collegamento reale a Google va collaudato prima dell'uso operativo; vedere [COLLAUDO.md](COLLAUDO.md).

## Avvio e verifica

Node 24 LTS, npm:

```sh
npm ci
npm run dev
```

```sh
npm run check
npm run preview
```

`check` esegue TypeScript, test automatici e compilazione. Il workflow GitHub blocca la pubblicazione se una di queste verifiche fallisce. La cartella `dist` è il sito statico, trasferibile su altri hosting HTTPS. Il repository contiene i sorgenti e un lock npm; `node_modules` non va caricato.

## Cartelle

- `src`: applicazione e componenti grafici.
- `public/report-manager.config.json`: URL pubblico Apps Script e URL definitivo dell'app.
- `apps-script`: `Code.gs`, `Bridge.html`, `appsscript.json`, da copiare nel progetto Apps Script.
- `.github/workflows/pages.yml`: compilazione e pubblicazione automatica su Pages.
- `tests`: prove sul ricevitore e sul servizio di invio, con Google e rete simulati.

## Presenze

La segreteria prepara i QR usando una credenziale riservata. Apps Script conserva lo snapshot del turno, genera il PIN di sei cifre e i codici distinti per i due ruoli. Gli studenti possono convalidare soltanto iscrizioni già in elenco. Il tutor usa un ulteriore codice riservato per sbloccare il PIN e inviare l'appello; può aggiungere fuori elenco, indicando la matricola. Le rettifiche della segreteria richiedono la credenziale amministrativa.

Il Foglio `Presenze_Tirocini` è uno **storico degli eventi**, non una tabella da contare direttamente come presenze uniche. Il comando «Aggiorna dal Foglio» restituisce l'ultimo esito per data, risorsa, fascia e matricola. Gli invii del tutor e della segreteria prevalgono sulle autoconvalide successive. Le righe non ancora convalidate sono indicate «Da verificare».

La cache locale non è un database condiviso e non sostituisce il Foglio. «Registrazione confermata» compare solo dopo la risposta del ricevitore. In caso di conferma non ricevuta si può riprovare con gli stessi dati, senza generare una seconda scrittura dello stesso invio.

## Limiti da conoscere

- La disponibilità delle presenze centralizzate richiede rete e Apps Script. Le funzioni locali sui CSV restano utilizzabili senza collegamento a Google dopo il caricamento dell'app; non è un'app offline installabile.
- Il PIN condiviso non autentica individualmente lo studente e non prova la posizione fisica. Il codice tutor è condiviso e il nome tutor resta dichiarato. Per un'identificazione personale servirebbe un diverso sistema di autenticazione.
- Le ricevute hanno un HMAC prodotto dal server e un orario server. Non sono una firma digitale personale.
- I vecchi QR della versione precedente vanno rigenerati. Anche i QR che puntano a Netlify vanno sostituiti quando si passa a GitHub.
- Ogni turno ammette al massimo 150 studenti e deve avere matricole e fascia `HH:mm - HH:mm`. Turni più grandi vanno suddivisi.
- Il Foglio cresce con le rettifiche. Le letture attuali percorrono lo storico: per volumi elevati occorre misurare le prestazioni e pianificare archiviazione e backup senza eliminare arbitrariamente le righe.

I dati dimostrativi inclusi sono fittizi. Non caricare sul repository pubblico CSV reali, PDF compilati, schermate con dati personali o credenziali.
