# Report Manager 3.1 — archivio cumulativo: prima fase

Questa versione parte dallo ZIP GitHub aggiornato fornito il 10 novembre 2026. Mantiene appelli, QR, pubblicazione settimanale e correzioni del tema scuro.

## Cosa cambia

- Nuovo comando in alto: **Archivio presenze Excel**.
- Unione di esportazioni Google ed Excel esistenti, senza duplicare gli ID evento.
- Scheda 5: consultazione dell'archivio caricato; non interroga il Foglio e non modifica gli esiti.
- Scheda 4: scelta tra **Presenze registrate — Excel** e la precedente vista **Prenotazioni — CSV Affluences**.
- Download Excel e salvataggio di versioni separate nella cartella Drive configurata.
- Nessuna cancellazione dei dati Google e nessuna chiusura delle settimane: queste funzioni appartengono alla fase successiva.

## 1. Conservare i backup

Hai già creato la copia del Foglio. Conserva anche lo ZIP GitHub precedente e la copia dei file Apps Script attualmente distribuiti. Non cancellare righe e non rinominare le schede esistenti.

## 2. Aggiornare Apps Script

Nel progetto collegato al Foglio operativo:

1. Sostituire il contenuto di **Code.gs** (o del file Codice.gs che lo contiene) con `apps-script/Code.gs` di questo pacchetto. Non creare una seconda copia delle stesse funzioni.
2. Aggiungere un file **Script** chiamato **Archive**, e incollare `apps-script/Archive.gs`. Apps Script visualizzerà Archive.gs.
3. In Impostazioni progetto abilitare la visualizzazione del manifest, se necessario. Sostituire `appsscript.json` con quello del pacchetto. Aggiunge l'ambito `https://www.googleapis.com/auth/drive` a quello Sheets esistente.
4. Lasciare invariati Weekly.gs, Bridge.html e Portal.html già aggiornati alla versione 3: il pacchetto li include per completezza.
5. Nelle **Proprietà script**, aggiungere:

   Proprietà: `ARCHIVE_FOLDER_ID`

   Valore: `1emkD1w9-2-H_8sivcSMVF519GR1lGX80`

   Inserire soltanto l'ID, non l'intero collegamento. Conservare APP_URL, APP_ORIGINS, SPREADSHEET_ID, password e SIGNING_SECRET esistenti. Non inserire questi segreti su GitHub.

### Autorizzazione Drive

La cartella online viene gestita dal proprietario della distribuzione tramite Apps Script: non è necessario indicarne il percorso a ogni browser.

Aggiungere temporaneamente questo wrapper nel progetto:

```javascript
function autorizzaArchivioDrive() {
  archiveFolder_().getName();
}
```

Salvare, selezionare **autorizzaArchivioDrive** dal menu delle funzioni ed eseguirla con l'account che distribuisce l'app. Autorizzare il nuovo accesso Google Drive. L'account deve poter creare file nella cartella. Dopo l'esecuzione completata, **rimuovere il wrapper** e salvare.

DriveApp richiede l'ambito Drive completo dell'account: l'autorizzazione Google non è limitata alla singola cartella, anche se il codice dell'archivio utilizza soltanto la cartella configurata. Non cambia le condivisioni; i nuovi file ereditano quelle della cartella. Mantenerla riservata agli operatori autorizzati.

Non serve rieseguire initialize_ e non vengono create nuove schede Google.

### Distribuire

Distribuisci → Gestisci distribuzioni → matita sulla distribuzione web attuale → Nuova versione → Distribuisci. Mantenere **Esegui come me** e l'accesso previsto per i QR. Aggiornare la distribuzione esistente per mantenere lo stesso URL /exec.

## 3. Aggiornare GitHub

Caricare i file del pacchetto nella radice del repository esistente, mantenendo la struttura delle cartelle. Non caricare lo ZIP come unico file e non inserire una cartella contenitore aggiuntiva nel repository.

I file modificati e nuovi sono elencati in FILE_MODIFICATI_3_1.txt. Il pacchetto contiene anche gli altri file del progetto. Non sono state aggiunte dipendenze npm. Il workflow esistente esegue installazione, TypeScript, test e build prima della pubblicazione.

Attendere Actions verde, poi ricaricare il sito con Ctrl+F5. Un errore nel workflow deve essere risolto prima del collaudo operativo.

## 4. Primo collaudo, senza cancellare dati

1. Aprire **Archivio presenze Excel** dal pulsante in alto.
2. Se non si è già autenticati nella gestione centrale, inserire ADMIN_PASSWORD e premere **Imposta accesso centrale**.
3. Premere **Apri ultimo archivio da Drive**. La prima volta il programma segnala che non esiste un archivio gestito: non seleziona automaticamente eventuali Excel già presenti nella cartella.
4. Premere **Acquisisci presenze dal Foglio**. In questa prima fase acquisisce l'intero insieme disponibile, non solo le settimane concluse. Mantiene i prenotati privi di esito come **Da verificare**.
5. Controllare i conteggi. Ripetere l'acquisizione senza fare nuovi appelli: gli eventi devono risultare già presenti.
6. Premere **Scarica Excel cumulativo**. Salvare il file e usare **Verifica Excel salvato** selezionando quello appena scaricato.
7. Premere **Salva nuova versione in Drive**. Attendere la conferma. Il server rilegge il file creato e ne verifica l'impronta prima di renderlo l'ultima versione gestita.
8. Aprire la scheda 5 e verificare un presente, un assente e un turno privo di esito; i risultati devono coincidere con il Foglio al momento dell'acquisizione.
9. Aprire la scheda 4, scegliere **Presenze registrate — Excel** e una matricola. Verificare separatamente la vista delle prenotazioni Affluences.
10. Chiudere e riaprire il sito. L'archivio non viene memorizzato nel browser: aprire Archivio presenze, autenticarsi e premere **Apri ultimo archivio da Drive**, oppure caricare il file Excel salvato.
11. Dopo una nuova registrazione tutor di prova, acquisire nuovamente e verificare che compaia solo il nuovo evento; una rettifica conserva l'evento precedente e cambia l'esito corrente.

Non usare dati di studenti reali per prove aggiuntive non necessarie. L'acquisizione del Foglio operativo esistente è comunque una lettura autorizzata della segreteria, non modifica gli appelli.

## 5. Utilizzo ordinario della fase 1

All'apertura della sessione: aprire l'ultima versione Drive (oppure l'Excel conservato). Quando si vuole aggiornare: acquisire dal Foglio, controllare il riepilogo e salvare una nuova versione.

Le schede 4 e 5 non seguono gli appelli in tempo reale: mostrano l'archivio attualmente in memoria. Per le nuove registrazioni serve una nuova acquisizione.

La navigazione interna conserva l'archivio in memoria. Ricaricare o chiudere la pagina lo perde: il file già salvato rimane su Drive o sul computer. Il browser tenta di avvisare prima della chiusura se l'archivio non è stato verificato/salvato; non affidarsi soltanto a questo avviso, soprattutto da mobile.

Ogni salvataggio Drive conserva il file precedente. Con due operatori, chi arriva dopo deve aprire e unire la versione più recente prima di salvare. Se la risposta si interrompe, aprire l'ultimo archivio Drive e controllare prima di riprovare.

Il percorso dell'ultima versione è conservato in una Proprietà script `RM_ARCHIVE_LATEST_...`, gestita dal programma. Non modificarla, spostare o eliminare l'ultima versione. Se manca, il programma si ferma anziché scegliere silenziosamente un file più vecchio. Le copie precedenti sono backup, non lo stato operativo corrente.

## Formato e controlli

L'Excel contiene Presenze, Turni e prenotati, Eventi e Archiviazioni. Una scheda tecnica nascosta `_RM_Dati` conserva i dati completi con controllo SHA-256. Le tabelle visibili sono viste generate, non un'interfaccia per rettificare gli esiti: modifiche manuali alle tabelle non vengono importate come rettifiche. Le firme server eventualmente presenti sono conservate, ma questa prima fase non ne effettua una nuova verifica crittografica offline. L'impronta del file serve a rilevare alterazioni accidentali, non equivale a una firma digitale.

Gli ID del Foglio di origine separano archivi di sistemi diversi: importare anche la copia di backup del Foglio come se fosse un secondo sistema può produrre partecipazioni distinte. Usare sempre il Foglio operativo come fonte delle acquisizioni.

Limite di trasferimento diretto Drive: 6 MiB per file; lettura manuale Excel: 30 MiB. Se si raggiunge il primo limite usare download/caricamento manuale e pianificare archivi per anno accademico. Il programma non divide automaticamente un archivio. Le versioni Drive, essendo file Excel, occupano spazio Drive.

## Verifiche svolte e da completare

- 61 test automatici locali passati: 43 regressioni precedenti e 18 nuovi test su archivio, conflitti, dati incompleti, autorizzazioni e salvataggio Drive simulato.
- 3 ulteriori test di lettura/scrittura reale XLSX sono inclusi e verranno eseguiti quando `xlsx` è installato; in questo ambiente sono saltati perché il download delle dipendenze npm è bloccato (HTTP 403).
- Analisi sintattica completata per tutti i 35 file TypeScript/TSX.
- Typecheck completo e build Vite non eseguibili localmente per la stessa limitazione: devono passare nel workflow GitHub.
- Nessuna scrittura eseguita nella tua cartella Drive, nessun deploy remoto effettuato e nessun dato Google cancellato.
- Da collaudare sull'ambiente reale: nuova autorizzazione Drive, creazione e riapertura Excel, confronto esiti, conflitto fra due operatori e resa su browser/mobile.

La fase 2 (chiusura, ricevute server di archiviazione, rimozione verificata e rettifiche dopo la rimozione) non è inclusa e non va sostituita con cancellazioni manuali.
