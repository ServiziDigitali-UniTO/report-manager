# Pubblicazione su GitHub Pages e configurazione Google

Il repository ospita un sito statico. Nessuna configurazione Netlify è necessaria. I file `apps-script` vanno anche installati su Google: il caricamento su GitHub, da solo, non pubblica il ricevitore.

## 1. Scegliere l'indirizzo definitivo

Creare un repository, per esempio `report-manager`, nel proprio account o nell'organizzazione autorizzata. Con GitHub Pages l'indirizzo sarà normalmente:

```text
https://NOME-ACCOUNT.github.io/report-manager/
```

I nomi qui sono segnaposto, non riferimenti a un account già configurato. Per l'app in una sottocartella mantenere la barra finale. Gli asset compilati usano percorsi relativi; non occorre modificare `vite.config.ts` quando cambia il nome del repository.

## 2. Preparare il Foglio senza perdere le presenze precedenti

1. Conservare una copia del Foglio esistente come backup.
2. Se esiste già `Presenze_Tirocini` della vecchia versione, rinominarla, per esempio `Presenze_Tirocini_Archivio_v1`. **Non eliminarla.**
3. La versione 2 crea una nuova `Presenze_Tirocini` a 18 colonne e una `RM_Turni` a 3 colonne. Le vecchie righe non vengono importate automaticamente: mancano gli identificativi e le garanzie della nuova versione.
4. Il Foglio e il progetto Apps Script devono essere modificabili soltanto da persone autorizzate. Non rendere pubblico il Foglio. La distribuzione pubblica del ricevitore è distinta dalla condivisione del documento.

`RM_Turni` conserva gli snapshot dei turni, inclusi gli iscritti e il PIN. `Presenze_Tirocini` conserva lo storico delle registrazioni, inclusi gli esiti precedenti alle rettifiche. Non spostare le colonne e non modificare i campi tecnici O–R a mano. Per l'esito corrente usare Report Manager, dopo l'aggiornamento dal Foglio.

## 3. Installare Apps Script

Dal Foglio: **Estensioni → Apps Script**. Sostituire il vecchio ricevitore di questa app con `apps-script/Code.gs`. Se nel progetto ci sono altre automazioni del Foglio, conservarle e verificare che non esistano altri `doGet`, `doPost` o `dispatch` con lo stesso nome.

Aggiungere un file HTML denominato **Bridge**, incollando il contenuto di `apps-script/Bridge.html`.

In **Impostazioni progetto**, attivare la visualizzazione del manifest `appsscript.json`. Inserire il contenuto del manifest fornito. Se il progetto comprende altre automazioni con ulteriori permessi, integrare il manifest esistente anziché cancellarne le autorizzazioni necessarie.

Nelle **Proprietà script** aggiungere:

| Proprietà | Valore |
| --- | --- |
| `SPREADSHEET_ID` | ID del Foglio: la parte tra `/d/` e `/edit` nel suo indirizzo |
| `APP_ORIGINS` | `https://NOME-ACCOUNT.github.io` senza percorso del repository e senza barra finale |
| `ADMIN_PASSWORD` | Credenziale casuale della segreteria, almeno 20 caratteri |
| `TUTOR_PASSWORD` | Codice riservato ai tutor, almeno 12 caratteri, diverso da quello della segreteria |

Non inserire queste credenziali in GitHub, nel JSON pubblico, nei QR o nei file `.env` del frontend. Generarle con un gestore di password e conservarle nel canale istituzionale previsto. Il PIN studenti di sei cifre viene generato per ciascun turno e non va inserito nelle proprietà.

`APP_ORIGINS` può contenere più origini separate da virgole, per esempio un dominio istituzionale aggiuntivo. Un'origine comprende protocollo, dominio e porta, **non il percorso**. Per prove locali aggiungere esplicitamente `http://127.0.0.1:5173` o la porta effettivamente mostrata da Vite; rimuoverla quando non serve. Non usare `*`.

Nell'editor selezionare ed eseguire **`initialize_`**. Autorizzare l'accesso al Foglio con l'account che distribuirà lo script. La funzione crea le schede e la proprietà segreta `SIGNING_SECRET`. Non copiare questo segreto nel sito e non rigenerarlo se si vogliono conservare validi i QR già emessi.

Se compare «Intestazioni incompatibili», tornare al punto 2: una scheda preesistente non è compatibile con la versione 2. Non correggere cancellando dati.

## 4. Distribuire Apps Script

**Distribuisci → Nuova distribuzione → Applicazione web**:

- eseguire come account che pubblica e ha accesso al Foglio;
- accesso **Chiunque**, per consentire agli utenti di aprire la pagina di collegamento senza login Google;
- copiare l'indirizzo pubblico `https://script.google.com/macros/s/…/exec`.

Le operazioni restano protette da credenziale segreteria, codice tutor, token di turno e PIN, secondo il ruolo. L'URL non è una password. Se l'amministrazione Workspace non consente distribuzioni anonime, questa installazione richiede un accordo con l'amministratore o una revisione del flusso di accesso.

Aprire l'URL `/exec` da solo non è il test completo: senza origine e canale il ricevitore restituisce un errore intenzionale. Usare «Verifica collegamento» nell'app.

Quando si modifica il ricevitore: **Distribuisci → Gestisci distribuzioni → Modifica → Nuova versione → Distribuisci**. Aggiornare la distribuzione esistente mantiene lo stesso URL.

## 5. Compilare la configurazione pubblica

Nel repository modificare `public/report-manager.config.json`:

```json
{
  "webhookUrl": "https://script.google.com/macros/s/ID-DELLA-DISTRIBUZIONE/exec",
  "appUrl": "https://NOME-ACCOUNT.github.io/report-manager/"
}
```

Inserire indirizzi reali. Non inserire password. `appUrl` determina l'indirizzo inserito nei QR. Se lasciato vuoto viene usato l'indirizzo corrente: per produzione è consigliato impostarlo esplicitamente, per evitare QR che puntino a un ambiente di prova.

## 6. Caricare il progetto e attivare Pages

1. Estrarre lo ZIP.
2. Caricare **il contenuto di `report-manager-production` nella radice del repository**, non lo ZIP né una cartella aggiuntiva che contenga tutto il progetto.
3. Verificare che `package.json`, `package-lock.json`, `src`, `public` e **`.github/workflows/pages.yml`** siano presenti. Alcuni sistemi nascondono `.github`: va caricata comunque. Usare GitHub Desktop o Git per includerla facilmente.
4. Il ramo principale previsto dal workflow è `main`. Se il repository usa un altro ramo, aggiornare sia `push.branches` sia la condizione del job `deploy`.
5. Su GitHub aprire **Settings → Pages → Build and deployment → Source: GitHub Actions**.
6. Aprire **Actions**, verificare che installazione, TypeScript, test, build e pubblicazione terminino correttamente.
7. Aprire l'indirizzo Pages e seguire `COLLAUDO.md` prima di distribuire registri operativi.

Il workflow pubblica soltanto `dist`: i sorgenti Apps Script non vengono serviti come parte del sito compilato, ma sono comunque visibili nel repository se questo è pubblico. I file forniti non contengono credenziali reali.

## 7. Operatività quotidiana

**Segreteria:** aprire le impostazioni Foglio, inserire `ADMIN_PASSWORD`, premere «Verifica collegamento e abilita QR». Importare il CSV nel browser e controllare matricole, date e orari. Selezionare modalità digitale. Attendere che tutti i QR siano pronti prima di stampare; il pulsante stampa blocca i registri con QR incompleti. La preparazione dei QR invia a Google gli iscritti del relativo turno, non tutto il CSV. La credenziale resta soltanto nella sessione della scheda; «Termina accesso segreteria» la rimuove e cancella la cache delle presenze.

**Tutor:** aprire il QR tutor, inserire il codice riservato `TUTOR_PASSWORD` e il proprio nominativo. «Verifica accesso e mostra PIN studenti» permette di recuperare il PIN. Controllare e correggere l'elenco prima dell'invio: le righe dell'appello iniziano come presenti. Premere «Salva e Invia Presenze» e attendere la conferma. Il PIN stampato è destinato all'uso in reparto; il codice riservato tutor non va comunicato agli studenti.

**Studente:** aprire il QR studente, scegliere la propria iscrizione, inserire il PIN di sei cifre. Può convalidare da 30 minuti prima a 60 minuti dopo il turno, secondo l'ora del server in Europe/Rome. Per turni notturni viene considerato il giorno successivo. Per fuori elenco, anomalie o un'assenza già attestata rivolgersi al tutor. Il server non consente allo studente di rettificare un esito tutor.

**Report:** usare «Aggiorna dal Foglio Google» con la credenziale segreteria per vedere anche le presenze inviate dagli altri dispositivi. Le modifiche manuali sono positive solo dopo conferma di Google.

## 8. Altri hosting, trasloco e recupero

Eseguire `npm ci` e `npm run build`, caricare il contenuto di `dist` su un normale hosting statico HTTPS. Non copiare soltanto `src` su un hosting che non compila. Aggiornare `appUrl`, l'URL pubblico del sito ed eventualmente `APP_ORIGINS`; poi rigenerare i QR. Non occorre un server Netlify o un database.

Le impostazioni grafiche dei browser e la cache locale della vecchia versione non vengono migrate automaticamente. Gli archivi della versione 1 restano consultabili nel Foglio rinominato. I vecchi QR vengono rifiutati con un messaggio esplicito.

Non eliminare lo storico per liberare spazio senza un piano di backup e archiviazione. Non spostare file con nominativi nel repository. Per revocare tutti i QR dopo una compromissione cambiare `SIGNING_SECRET` e rigenerare i registri; cambiare anche le credenziali coinvolte. La rotazione invalida i vecchi codici di accesso ai turni.

## Riferimenti tecnici

- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://vite.dev/guide/static-deploy
- https://developers.google.com/apps-script/guides/html/communication
- https://developers.google.com/apps-script/guides/html/restrictions
- https://developers.google.com/apps-script/reference/html/x-frame-options-mode
- https://developers.google.com/apps-script/reference/lock/lock-service
