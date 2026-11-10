# Report Manager 4.0

Registri e presenze Medicina Veterinaria UniTO: applicazione React/TypeScript su hosting statico HTTPS, Apps Script e Google Sheets per i tutor, Excel cumulativo versionato in Drive per la consultazione centrale. Nessun database esterno; connessione richiesta per le operazioni Google.



**Applicazione sviluppata da Massimiliano Parisi (Massimiliano.parisi@unito.it)**



## Sviluppo e pubblicazione

Node 24:

```sh
npm ci
npm run check
npm run dev
```

`check` esegue TypeScript, test e build. `.github/workflows/pages.yml` pubblica su Pages solo dopo questi controlli; per altri hosting usare l'intero contenuto di `dist`. Configurazione pubblica in `public/report-manager.config.json`, segreti soltanto nelle Proprietà script. Non cambiare SIGNING\_SECRET durante l'aggiornamento.

Leggere [COLLAUDO\_V4.md](COLLAUDO_V4.md), [NOTE\_TECNICHE.md](NOTE_TECNICHE.md) e VERIFICHE\_V4.txt. Le guide 3/3.1 incluse sono storiche: in caso di differenze prevalgono le istruzioni 4.0.

