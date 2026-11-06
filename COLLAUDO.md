# Collaudo della versione settimanale 3

## Verifiche effettuate durante la preparazione

- 43 test automatici locali, con Google Sheets e rete simulati. Comprendono regressioni del ricevitore v2, invio della credenziale tutor, trasporto diretto senza iframe del sito, pubblicazioni identiche, mancata attivazione dopo errore di staging, accessi limitati alle risorse, revoca e scadenza, QR senza PIN, finestra temporale server, ritardi, precedenza tutor, discrepanze, rimozione di prenotazioni già convalidate, ritiro di una settimana, concorrenza, idempotenza e trascrizione da cartaceo.
- Controllo sintattico dei sorgenti TypeScript/TSX e controllo aggiuntivo con TypeScript disponibile localmente. Quattro dipendenze non disponibili sono state sostituite SOLO per questo controllo da dichiarazioni temporanee esterne al pacchetto: non è equivalente al controllo completo con le librerie effettive.
- Coerenza del lock npm e simulazione offline di `npm ci` riuscite.
- Prova della normalizzazione del CSV reale fornito: lette 3.941 righe, 31 settimane; 2.724 prenotazioni attive e 1.384 turni accettati dai validatori settimanali, senza errori. L'estrazione CSV è stata effettuata localmente; il normalizzatore esistente e i validatori server sono stati eseguiti con il risultato dell'estrazione. Nessuna riga reale è inclusa nei file consegnati o inviata a Google.

## Limiti della verifica locale

Il runtime di preparazione non può scaricare tutte le dipendenze npm e non dispone di browser installato. Non è stata eseguita una build completa con tutte le librerie effettive, né un collaudo grafico/browser o con una distribuzione Google reale. Non sono stati modificati il repository remoto o il Foglio dell'utente.

GitHub Actions deve completare `npm ci` e `npm run check` prima della pubblicazione. Il workflow verde non sostituisce le prove browser/Google seguenti. In particolare il modulo compilato `tutor.js` caricato da HtmlService va provato realmente.

## Prove da completare con dati fittizi

1. Conservare il backup e installare la versione 3 su un Foglio di prova. Verificare che le due schede v2 siano preservate e che siano create le tre nuove schede.
2. Attendere il workflow GitHub verde; controllare che `tutor.js` e `tutor.css` siano disponibili nella radice del sito.
3. Aprire la gestione centrale, caricare il CSV fittizio e pubblicare una settimana. Controllare giorni, risorse e nominativi. Ripetere la pubblicazione senza cambiamenti: non devono apparire duplicati.
4. Aggiungere e rimuovere prenotazioni, ricaricare il CSV completo e verificare il confronto. Una rimozione con esito già registrato deve richiedere conferma; lo storico deve rimanere e il tutor deve ricevere una segnalazione.
5. Creare due link riservati a risorse diverse. Ogni link deve leggere e modificare soltanto le risorse autorizzate. Provare un accesso revocato e uno scaduto: devono essere rifiutati anche durante il polling.
6. Su telefono aprire l'area tutor, verificare giorno corrente, selettore risorsa, stati e leggibilità in verticale. Controllare almeno Chrome Android e Safari iPhone.
7. Aprire anche l'alternativa diretta Google: deve usare la stessa interfaccia con sincronizzazione e comandi. Ripetere il test con account Google attivi, in particolare sul dispositivo che aveva dato errore. Non considerare risolta questa incompatibilità sulla sola base dei test simulati.
8. Da due dispositivi dello stesso tutor aprire un turno. Il primo aggiorna una presenza; il secondo prova a modificarla prima del proprio aggiornamento. Deve comparire un conflitto che richiede verifica, senza sovrascrittura silenziosa.
9. Confermare presente, assente e ritardo con minuti effettivi; modificare note; aggiungere un fuori elenco con matricola e motivazione. Verificare righe, orario server e profilo nel Foglio.
10. Dal QR studente di un turno non già convalidato effettuare un'autoconvalida nella finestra temporale ammessa. Deve essere richiesta soltanto la selezione del nominativo, nessun PIN. Verificare ricevuta server e successiva comparsa nella schermata tutor.
11. Correggere dal tutor un presente autoconvalidato in assente o ritardatario. Verificare la segnalazione di discrepanza e la conservazione dello storico. Lo studente non deve annullare l'assenza o eliminare i minuti di ritardo.
12. Interrompere la rete durante caricamento e salvataggio. Non deve apparire una conferma positiva senza risposta. Non è prevista una coda offline. Al ritorno della rete verificare l'esito dal server e usare il reinvio idempotente se necessario.
13. Lasciare due aree aperte per alcuni minuti: gli aggiornamenti devono arrivare entro il ciclo di polling, salvo errori/limiti di Google. Passare ad altra scheda e tornare: deve avvenire un aggiornamento.
14. Da Emergenza preparare la stampa settimanale. Verificare che includa tutti i nominativi delle risorse selezionate, anche chi è già convalidato; i fuori elenco devono essere indicati. Verificare firme, impaginazione su più pagine, QR leggibili, data/versione e link al registro tutor. Il link stampato non contiene la credenziale riservata del tutor.
15. Dal PDF salvato con Chrome/Edge provare QR e collegamenti. Registrare gli esiti da cartaceo con il relativo comando e un riferimento nelle note: il metodo deve essere `CARTACEA`.
16. Verificare un vecchio QR v2 e un vecchio report prima di passare ai dati operativi. Il vecchio flusso mantiene PIN e codice tutor.

## Condizioni operative

- Il QR condiviso non prova chi lo sta usando o la presenza fisica; lo studente deve selezionare il proprio nominativo. Il tutor resta il verificatore dell'esito.
- Il link tutor è trasferibile. Il nome del profilo non equivale ad autenticazione personale di chi lo usa.
- La stampa richiede dati disponibili online al momento della preparazione. Un PDF preventivo può essere conservato secondo le prassi del reparto.
- Polling e chiamate Google sono soggetti a quote e disponibilità. Prima di un uso su molte risorse contemporanee misurare tempi e carico.
