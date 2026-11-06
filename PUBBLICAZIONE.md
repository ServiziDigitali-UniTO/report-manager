# Pubblicazione versione 3

Per l'installazione già esistente seguire **AGGIORNAMENTO_V3.md**. Non seguire le vecchie istruzioni di rinomina delle schede della versione 1.

Per una nuova installazione:

1. Creare un Foglio Google con condivisione limitata.
2. Creare il progetto Apps Script e aggiungere `Code.gs`, `Weekly.gs`, `Bridge.html`, `Portal.html` e il manifest della cartella `apps-script`.
3. Configurare `SPREADSHEET_ID`, `APP_ORIGINS`, `APP_URL`, `ADMIN_PASSWORD` (almeno 20 caratteri) e `TUTOR_PASSWORD` (almeno 12). Le password non vanno nel repository.
4. Eseguire `initialize_` attraverso il wrapper temporaneo descritto in `AGGIORNAMENTO_V3.md`; rimuovere il wrapper dopo l'esecuzione. Il segreto di firma viene creato automaticamente.
5. Distribuire la web app eseguendola come l'account che ha accesso al Foglio, accesso Chiunque. Verificare che l'organizzazione Workspace consenta questa distribuzione.
6. Impostare gli URL pubblici in `public/report-manager.config.json`.
7. Caricare i file del progetto nella radice del repository, includendo `.github/workflows/pages.yml`.
8. In GitHub Settings → Pages selezionare GitHub Actions. Il workflow si aspetta il ramo `main`.
9. Attendere la build verde ed effettuare `COLLAUDO.md` prima dell'uso operativo.

Il Foglio deve rimanere limitato. I tutor ricevono link riservati, gli studenti QR di turno senza PIN. Una distribuzione pubblica non rende pubbliche le tabelle: ogni operazione verifica il proprio livello di autorizzazione nel codice server.

Il sito GitHub contiene solo codice, configurazione pubblica e dati fittizi. Non caricare CSV reali o registri compilati nel repository. I collegamenti riservati dei tutor non devono essere inseriti in README, codice, screenshot pubblici o QR studenti.

Riferimenti:

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://developers.google.com/apps-script/guides/html/communication
- https://developers.google.com/apps-script/guides/html/restrictions
- https://developers.google.com/apps-script/guides/support/troubleshooting
