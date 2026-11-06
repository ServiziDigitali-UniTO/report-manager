# Aggiornamento da Report Manager 2 alla versione settimanale 3

## Prima di iniziare

Conservare una copia del Foglio Google e una copia del progetto Apps Script attuale. Conservare anche il codice GitHub precedente, ad esempio tramite un tag o uno ZIP del commit in uso. Effettuare il collaudo con un Foglio separato prima di usare i dati operativi.

**Non rinominare né cancellare `RM_Turni` o `Presenze_Tirocini`.** La migrazione 2→3 è aggiuntiva. Non ripetere l'archiviazione/rinomina che era servita nel passaggio dalla prima versione alla versione 2.

La copia del codice del repository qui fornita deriva dai file esaminati nella conversazione; comprende la correzione dell'invio della credenziale tutor e il link tutor visibile nei PDF. Non è stato possibile rileggere il repository remoto: eventuali altre modifiche indipendenti apportate dopo lo ZIP devono essere confrontate prima della sostituzione.

## 1. Aggiornare Apps Script nello stesso progetto

Nell'editor Apps Script del Foglio:

1. Sostituire il contenuto del file `Codice.gs` / `Code.gs` con `apps-script/Code.gs`.
2. Aggiungere un file di script denominato **Weekly** e incollare `apps-script/Weekly.gs`.
3. Sostituire il contenuto del file HTML **Bridge** con `apps-script/Bridge.html`.
4. Aggiungere un file HTML denominato **Portal** e incollare `apps-script/Portal.html`.
5. Il manifest `appsscript.json` fornito mantiene fuso Europe/Rome, runtime V8 e accesso alle API Sheets. Se nel progetto esistono altre automazioni, conservarne i permessi necessari.

Non duplicare le funzioni inserendo un secondo vecchio `Code.gs`: deve esistere una sola definizione di `doGet`, `doPost` e `dispatch`. Il codice settimanale è nel file separato `Weekly.gs`.

## 2. Proprietà script

Conservare le proprietà esistenti:

- `SPREADSHEET_ID`: `1y6bfCXzVxrih-h7oFJxkrZXKt5J_u9U6Np4RKhDFHHM`
- `APP_ORIGINS`: `https://servizidigitali-unito.github.io`
- `ADMIN_PASSWORD`: invariata, almeno 20 caratteri
- `TUTOR_PASSWORD`: invariata, almeno 12 caratteri, ancora necessaria per i vecchi QR
- `SIGNING_SECRET`: **conservare il valore attuale**, senza rigenerarlo

Aggiungere:

```text
APP_URL
https://servizidigitali-unito.github.io/report-manager/
```

La barra finale è necessaria. `APP_URL` è pubblico; le password e `SIGNING_SECRET` non vanno inseriti nel repository.

Facoltativamente `RESOURCE_OVERRIDES` può contenere una mappa JSON di risorse aggiunte o riclassificate. Esempio:

```json
{
  "131134": {
    "name": "Tirocinio C.A.N.C.",
    "area": "ospedale",
    "archived": false
  }
}
```

Le aree ammesse sono `ospedale`, `azienda_zootecnica`, `skill_lab`, `buiatri`, `izs`. La configurazione predefinita include i 14 ID attuali dell'elenco fornito; C.A.N.C. è nell'Ospedale. `131126` è conservato come risorsa storica archiviata. Le risorse nuove non vengono assegnate automaticamente per somiglianza del nome: vanno configurate prima di pubblicare prenotazioni attive.

## 3. Creare le nuove schede

Per eseguire l'inizializzazione dall'editor, aggiungere TEMPORANEAMENTE in fondo a `Code.gs`:

```javascript
function avviaInizializzazioneV3() {
  initialize_();
}
```

Salvare, selezionare `avviaInizializzazioneV3` dal menu funzioni ed eseguirla. La funzione originale `initialize_` termina con underscore e non compare nel menu dell'editor.

Al termine devono esserci, oltre alle due schede esistenti:

| Nuova scheda | Scopo |
| --- | --- |
| `RM_Settimane` | Pubblicazione attiva e versione di ogni settimana |
| `RM_Turni_Settimanali` | Snapshot dei turni per ciascuna pubblicazione |
| `RM_Accessi` | Profili tutor/sede, risorse, scadenza, revoca e impronta dei segreti |

Eliminare soltanto la funzione temporanea appena aggiunta e salvare. `initialize_` e tutte le funzioni originali rimangono.

## 4. Aggiornare la distribuzione Google esistente

**Distribuisci → Gestisci distribuzioni → Modifica → Nuova versione → Distribuisci.** Conservare l'esecuzione come account che pubblica e l'accesso Chiunque. Il Foglio rimane con condivisione limitata.

Aggiornando la stessa distribuzione si conserva l'URL `/exec` già configurato. Non creare un nuovo URL a meno di volerlo poi aggiornare anche in `public/report-manager.config.json`.

## 5. Caricare la versione GitHub

Caricare nella radice del repository il contenuto della cartella `report-manager-v3`, sostituendo i file omonimi e includendo i nuovi file e `.github/workflows/pages.yml`. Non caricare la cartella contenitore come sottocartella aggiuntiva.

Il file `public/report-manager.config.json` contiene già:

```json
{
  "webhookUrl": "https://script.google.com/macros/s/AKfycbwY-Fha82Nwwk9GKRGC8xzbHzPtNiluwCJkZZsKu6101lF8iHfdGCgDNTu6oPVdVezloQ/exec",
  "appUrl": "https://servizidigitali-unito.github.io/report-manager/"
}
```

Attendere l'esito verde di Actions. La build produce anche `tutor.js` nella radice di `dist`: è l'entry point caricato dal portale Google. Non spostarlo o rinominarlo.

## 6. Prima pubblicazione di prova

1. Aprire Report Manager e ricaricare la pagina dopo il deploy.
2. La schermata iniziale è **Pubblicazione settimanale**.
3. Inserire `ADMIN_PASSWORD` e premere **Apri gestione centrale**.
4. Per la prima prova usare i dati fittizi. Le date dimostrative seguono il giorno corrente in Italia; restano previsti un turno mattutino e uno pomeridiano.
5. Scegliere la settimana sabato–venerdì e premere **Verifica aggiornamenti prima della pubblicazione**.
6. Controllare il riepilogo per le cinque aree e premere **Pubblica settimana per i tutor**.
7. Creare un collegamento riservato indicando nome tutor/sede, area, risorse autorizzate e validità.
8. Conservare il collegamento appena generato: il segreto viene mostrato solo in questo momento. Se il link viene perso, revocare l'accesso e crearne uno nuovo.
9. Provare il link sul sito e l'alternativa diretta Google. Completare `COLLAUDO.md`.

## Pubblicazione del venerdì

Il CSV deve contenere tutte le risorse da mantenere pubblicate per la settimana scelta. L'operazione sostituisce l'elenco pubblicato di quella settimana, non aggiunge soltanto le righe del nuovo file. Una pubblicazione identica viene riutilizzata; gli esiti già registrati non vengono cancellati. Le rimozioni con presenze già registrate richiedono una conferma esplicita e restano segnalate nel registro.

Non pubblicare un CSV parziale di una sola risorsa pensando che le altre rimangano invariate. Se serve questa funzione va progettata separatamente; qui il comando rappresenta una pubblicazione completa della settimana.

## Accesso tutor

Il link riservato sostituisce password e verifica manuale per le nuove aree. È utilizzabile fino a scadenza o revoca, anche se la segreteria chiude il browser. È una credenziale trasferibile: chi la riceve può operare con quel profilo e il nome associato; non equivale a un'autenticazione personale.

Sui dispositivi condivisi usare prudenza e revocare i link quando necessario. **Dimentica accesso memorizzato** rimuove la copia locale; non revoca il link già ricevuto. La revoca si fa dalla segreteria.

## Carta e vecchie funzioni

Le nuove aree sono digitali per impostazione predefinita. La stampa è in **Emergenza e accesso → Stampa settimana per emergenza**. La firma rimane autografa e il recupero si registra da **Note / rettifica**, selezionando la trascrizione da cartaceo e indicando un riferimento.

Il QR stampato permette l'autoconvalida solo quando lo studente ha rete e il turno è nella finestra consentita. La carta non rende il QR utilizzabile offline. In assenza di rete il docente usa la firma autografa e trascrive quando può riconnettersi.

I vecchi strumenti sono disponibili dal pulsante **Strumenti esistenti e report**. I vecchi QR non diventano automaticamente QR senza PIN: generare i nuovi dalla settimana pubblicata.

## Portabilità

Per un altro hosting statico HTTPS aggiornare il JSON pubblico e le proprietà Google `APP_URL`/`APP_ORIGINS`. Compilare e caricare tutto `dist`. Nessuna funzione Netlify o database esterno è richiesta. Per sviluppo locale, il portale nativo richiede la build pubblicata: `tutor.js` è un file di produzione. La normale area del sito può essere provata con Vite e un'origine locale autorizzata.
