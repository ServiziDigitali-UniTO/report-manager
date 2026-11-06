# Report Manager 3 — registri settimanali online

Evoluzione dello stesso progetto React/TypeScript, pubblicabile su GitHub Pages o altro hosting statico HTTPS. CSV elaborati nel browser, Foglio Google come archivio condiviso, nessun database esterno, nessuna funzione Netlify. Non è prevista una modalità offline.

**Aggiornamento dell'installazione esistente: iniziare da [AGGIORNAMENTO_V3.md](AGGIORNAMENTO_V3.md).** Il pacchetto contiene già gli URL pubblici configurati durante il lavoro. Non contiene password o dati personali reali del CSV esaminato.

## Nuovo percorso operativo

La segreteria carica il CSV Affluences, verifica e pubblica una settimana sabato–venerdì. La pubblicazione rende disponibili i turni nelle cinque aree tutor: Ospedale, Azienda Zootecnica, Skill Lab, Buiatri e IZS.

Ogni tutor apre un collegamento riservato, limitato alle risorse assegnate e valido per il numero di giorni stabilito dalla segreteria. Non deve inserire la password amministrativa o verificare manualmente il collegamento. I dati si aggiornano all'apertura, ogni 30 secondi mentre la pagina è visibile e al ritorno alla pagina. Ogni modifica richiede la conferma del server.

Il QR studente è comune al singolo turno, senza PIN: lo studente seleziona il proprio nome e conferma. Il codice QR non autentica l'identità o la presenza fisica. Il tutor può verificare/correggere gli esiti; le discrepanze rispetto all'autoconvalida sono evidenziate.

La stampa settimanale è nel menu **Emergenza e accesso**. Produce un registro per firme autografe con QR per turno e data/versione della pubblicazione. Deve essere preparata mentre la rete è disponibile. Gli esiti del cartaceo si trascrivono da **Note / rettifica → Trascrizione da registro cartaceo di emergenza**, indicando il riferimento nelle note.

## Compatibilità

Le funzioni precedenti rimangono in **Strumenti esistenti e report**. `RM_Turni` e `Presenze_Tirocini` mantengono intestazioni e dati. I vecchi QR continuano a usare il flusso v2 con PIN e codice tutor; i nuovi QR settimanali usano il flusso senza PIN. Non confondere i due tipi di QR.

Vengono aggiunte tre schede: `RM_Settimane`, `RM_Turni_Settimanali`, `RM_Accessi`. Nessun archivio viene cancellato. I nuovi turni sono pubblicati solo dal comando esplicito della segreteria; negli strumenti precedenti resta il comportamento di preparazione dei vecchi QR durante l'anteprima digitale.

## Accesso web e alternativa Google

- Sul sito statico: area tutor `#area/<area>?access=…`, studente `#presenza?shift=…&token=…`.
- Alternativa diretta: Apps Script serve `Portal.html`, che carica la stessa interfaccia compilata `tutor.js` da GitHub Pages e usa direttamente `google.script.run`.

L'alternativa riduce la dipendenza dal collegamento incorporato tra il sito e Google. **Non è una garanzia contro tutti i problemi di sessione Google**: va verificata sui dispositivi che hanno dato errore. Vedere [COLLAUDO.md](COLLAUDO.md).

## Sviluppo

Node 24 e npm:

```sh
npm ci
npm run dev
npm run check
```

`check` esegue TypeScript, test e build. Il workflow `.github/workflows/pages.yml` pubblica solo se queste verifiche riescono. Per altri hosting caricare il contenuto di `dist`, incluso `tutor.js` e i relativi asset.

Il runtime usato per preparare questo pacchetto non può scaricare tutte le dipendenze e non ha un browser installato: la build completa e il collaudo browser/Google reale restano da effettuare, come indicato in `COLLAUDO.md`. I test locali verificano le regole e i protocolli con servizi simulati.
