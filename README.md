# Report Manager 4.0

Registri e presenze Medicina Veterinaria UniTO: applicazione React/TypeScript su hosting statico HTTPS, Apps Script e Google Sheets per i tutor, Excel cumulativo versionato in Drive per la consultazione centrale. Nessun database esterno; connessione richiesta per le operazioni Google.

**Per aggiornare dalla 3.1 iniziare da [AGGIORNAMENTO_V4.md](AGGIORNAMENTO_V4.md)** e collaudare sulla copia del Foglio. Il codice non è stato distribuito automaticamente. La rimozione è inizialmente disabilitata.

## Funzioni 4.0

- Quattro risorse SIZOS dentro Azienda Zootecnica, con periodi indipendenti di 15 giorni predefiniti, fine modificabile e date escluse; QR unico per periodo e presenza distinta per giorno.
- Firme entrata/uscita alternative alla firma unica; colonne opzionali per orari e ore sul cartaceo.
- Prenotazioni Affluences storiche nel cumulativo; confronto con esiti in Storico Studente e consultazione nella scheda 5.
- Apertura dell'ultimo Excel Drive dopo accesso amministrativo verificato; nuove acquisizioni dal Foglio manuali.
- Chiusura esplicita di settimane/periodi, esportazione congelata, verifica del file Drive effettivo e rimozione separata; ricevute e blocco vecchi QR.
- Rettifiche motivate dopo l'archiviazione con conservazione degli eventi precedenti.
- Schermate tutor aggiornate all'apertura/rientro e su comando, salvataggi immediati con conferma.

I nominativi senza esito restano in attesa; nessun calcolo automatico di completamento o ore riconosciute. La stampa serve per le emergenze. Non è prevista la modalità offline.

## Sviluppo e pubblicazione

Node 24:

```sh
npm ci
npm run check
npm run dev
```

`check` esegue TypeScript, test e build. `.github/workflows/pages.yml` pubblica su Pages solo dopo questi controlli; per altri hosting usare l'intero contenuto di `dist`. Configurazione pubblica in `public/report-manager.config.json`, segreti soltanto nelle Proprietà script. Non cambiare SIGNING_SECRET durante l'aggiornamento.

Leggere [COLLAUDO_V4.md](COLLAUDO_V4.md), [NOTE_TECNICHE.md](NOTE_TECNICHE.md) e VERIFICHE_V4.txt. Le guide 3/3.1 incluse sono storiche: in caso di differenze prevalgono le istruzioni 4.0.
