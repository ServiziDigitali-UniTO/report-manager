# Collaudo prima dell'uso operativo

## Verifiche già eseguite sul pacchetto

- 20 test automatici locali, con Foglio Google e rete simulati: controlli di accesso, separazione dei ruoli, PIN errato, alterazione del turno, dati incompleti, scritture senza inserimenti parziali per errori di validazione, nominativo verificato sull'elenco del turno, orario server, ricevuta HMAC, note generali, reinvii e rettifiche, fasce distinte, assenza tutor non sovrascrivibile dallo studente, formule nei testi, finestra temporale, conferme mancanti, memoria locale non disponibile e scambio dei messaggi con controllo della finestra e dell’origine in un ambiente simulato.
- Analisi sintattica e trasposizione TypeScript dei 25 file sorgente: nessun errore sintattico.
- Controllo locale aggiuntivo TypeScript con dipendenze disponibili e dichiarazioni temporanee per quattro librerie non disponibili: nessun errore rilevato nel codice applicativo. Queste dichiarazioni temporanee **non sono incluse nel progetto** e non sostituiscono il controllo sulle librerie effettive.
- Coerenza di `package.json` e `package-lock.json` verificata da npm in modalità offline; simulazione di `npm ci` riuscita.
- Asset predisposti per sottocartelle GitHub Pages; eliminati CSV/PDF di esempio reali e riferimenti a Netlify. Le dipendenze e le integrità nel lock derivano dal progetto fornito, con aggiunta dei tipi React.

## Verifiche non eseguite in questo ambiente

Il runtime non può scaricare tutte le dipendenze npm e non dispone di un browser di test installato. Non sono quindi stati eseguiti la **compilazione completa con le dipendenze effettive**, il collaudo grafico nel browser né il collegamento a una distribuzione Google reale. Non è stato letto o modificato il tuo Foglio.

Il workflow GitHub esegue `npm ci` e `npm run check` e pubblica soltanto dopo esito positivo. Il completamento del workflow **non sostituisce il collaudo Google e smartphone** descritto sotto. Non distribuire registri operativi prima di questo passaggio.

## Procedura con dati fittizi

Usare un Foglio di prova separato, stesse proprietà script e un'origine Pages autorizzata.

1. **Build:** verificare il verde del workflow GitHub. Aprire il sito, controllare logo, favicon, pannelli, CSV, filtri, statistiche ed esportazione Excel. L'indirizzo deve comprendere la sottocartella del repository se prevista.
2. **Configurazione mancante:** lasciare temporaneamente il webhook vuoto in un ambiente di prova: i QR devono mostrare l'errore, la stampa digitale deve essere bloccata e nessuna presenza deve risultare registrata.
3. **Segreteria:** credenziale errata deve dare errore; credenziale corretta deve confermare accesso al Foglio. Verificare la creazione delle due schede. Controllare che la vecchia scheda sia stata conservata separatamente.
4. **Turni distinti:** importare iscrizioni fittizie della stessa risorsa su due fasce della giornata. Verificare gruppi separati, due coppie di QR e PIN per turno. Ogni studente deve avere una matricola.
5. **Stampa:** attendere tutti i QR pronti, salvare un PDF, verificare impaginazione e scansione. Controllare che i QR puntino a GitHub, non all'ambiente locale o a Netlify.
6. **Altro telefono:** da un telefono senza configurazioni pregresse aprire il QR studente. Il turno deve caricarsi dal Foglio senza chiedere l'URL del webhook. Un vecchio QR deve essere rifiutato esplicitamente.
7. **PIN:** il PIN errato non deve registrare righe. Il PIN corretto, entro la finestra temporale del turno, deve restituire una ricevuta e produrre l'evento nel Foglio. Il tentativo fuori finestra deve essere rifiutato. Verificare almeno un turno a cavallo di mezzanotte se usato realmente.
8. **Tutor:** aprire il QR tutor, provare il codice riservato errato e poi quello corretto. Inserire il nome tutor, un presente, un ritardo con minuti positivi, un assente, una nota individuale e una nota generale. Verificare esiti e note nel Foglio. Aggiungere un fuori elenco con matricola.
9. **Rettifica:** la segreteria aggiorna dal Foglio e modifica un esito. La nuova riga va nello storico; nel report corrente deve comparire soltanto l'ultimo esito. Un'autoconvalida successiva non deve annullare l'assenza attestata dal tutor.
10. **Rete interrotta:** interrompere la rete durante l'invio; non deve comparire una ricevuta positiva senza conferma. Ripristinare e riprovare con gli stessi dati. Verificare che non compaiano due eventi identici. Se l'esito resta dubbio consultare il Foglio e il report aggiornato.
11. **Invii contemporanei:** due telefoni inviano presenze diverse nello stesso momento. Entrambe devono risultare presenti nello storico, senza sovrascritture.
12. **Riepilogo centrale:** su un terzo dispositivo della segreteria inserire la credenziale e usare «Aggiorna dal Foglio». Devono apparire le presenze dei telefoni precedenti e le righe CSV ancora prive di convalida devono dire «Da verificare».
13. **Browser:** eseguire almeno una prova con Safari su iPhone e una con Chrome su Android. Il collegamento usa una pagina Apps Script incorporata; verificare eventuali limitazioni del browser o del dominio Workspace sui contenuti incorporati e sull'accesso anonimo. Un blocco deve produrre un errore, mai una falsa conferma.
14. **Uscita:** terminare l'accesso segreteria e riaprire la scheda. Consultazione centrale e preparazione di nuovi QR devono richiedere la credenziale. Il codice tutor non deve comparire nella configurazione pubblica o nei QR.

Registrare data, browser, esito e eventuali anomalie di questa prova. Solo dopo il collaudo sostituire il Foglio di prova con quello operativo, aggiornando proprietà e distribuzione, e ripetere una registrazione fittizia concordata prima dell'avvio.
