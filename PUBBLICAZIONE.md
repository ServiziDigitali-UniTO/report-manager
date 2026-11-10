# Pubblicazione Report Manager 4.0

Per aggiornare l'installazione esistente seguire AGGIORNAMENTO_V4.md, che comprende inizializzazione, proprietà, distribuzioni Apps Script, GitHub Desktop e primo collaudo.

Il progetto resta distribuibile su qualunque hosting statico HTTPS. Con Node 24 eseguire `npm ci` e `npm run check`, poi pubblicare tutto `dist`, compresi tutor.js, tutor.css e gli asset. Il sito deve conservare percorsi coerenti con il base path Vite; per un sito diverso impostare public/report-manager.config.json, APP_URL e APP_ORIGINS. Non caricare segreti nei file pubblici.

Su GitHub Pages il workflow incluso esegue le verifiche e pubblica il risultato; nelle impostazioni Pages usare GitHub Actions. Per la prima distribuzione nuova configurare anche le proprietà Apps Script come descritto nella guida, poi eseguire l'inizializzazione. Il Foglio rimane riservato; l'accesso pubblico alla web app non deve trasformarsi in condivisione pubblica del Foglio o della cartella archivio.

Le guide precedenti sono storiche. Non abilitare la rimozione operativa prima del collaudo 4.0 sulla copia e del controllo di tutte le distribuzioni attive.
