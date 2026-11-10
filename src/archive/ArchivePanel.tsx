import React,{useRef,useState} from 'react';
import {rpc,getAdminPassword,setAdminPassword} from '../services/bridge';
import {archiveRows,canonical,emptyArchive,mergeArchive,mergeExport,type PresenceArchive} from './model';
import {archiveFilename,archiveFromBytes,archiveToBytes,downloadArchive,fromBase64,toBase64} from './workbook';
import {isArchiveSaved,markArchiveSaved,setArchive,useArchive} from './store';
import './archive.css';
export function ArchivePanel(){
  const archive=useArchive(),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[dirty,setDirty]=useState(!isArchiveSaved()),[drive,setDrive]=useState<{loaded:boolean;fileId:string;url:string}>({loaded:false,fileId:'',url:''}),[localName,setLocalName]=useState(''),[verified,setVerified]=useState('');
  const openRef=useRef<HTMLInputElement>(null),verifyRef=useRef<HTMLInputElement>(null);
  const api=(action:string,data:any={})=>rpc('archive.'+action,data,{password:getAdminPassword()});
  const act=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setMessage('');try{await fn();}catch(e:any){setError(e.message||'Operazione non completata.');}finally{setBusy(false);}};
  function changed(value:PresenceArchive){setArchive(value);setDirty(true);setVerified('');}
  function summary(stats:any){return `${stats.newEvents} eventi nuovi · ${stats.duplicates} già presenti · ${stats.corrections} ulteriori eventi su partecipazioni già note · ${stats.newShifts} versioni turno nuove.`;}
  async function importFile(file:File){const incoming=await archiveFromBytes(await file.arrayBuffer()),result=await mergeArchive(archive,incoming);changed(result.archive);setLocalName(file.name);setMessage('Excel acquisito. '+summary(result.stats));}
  async function acquire(){const response=await api('export');const result=await mergeExport(archive,response.snapshot);changed(result.archive);setMessage('Dati del Foglio acquisiti. '+summary(result.stats)+' Il Foglio non è stato modificato.');}
  async function loadDrive(){
    const response=await api('driveRead');
    let next=archive;if(response.fileId){const incoming=await archiveFromBytes(fromBase64(response.base64));next=(await mergeArchive(archive,incoming)).archive;}
    changed(next);setDrive({loaded:true,fileId:response.fileId||'',url:response.url||''});setMessage(response.fileId?'Versione Drive unita ai dati già caricati.':'Nessun archivio gestito dal programma nella cartella. Puoi acquisire il Foglio o importare un Excel e poi salvare.');
  }
  async function saveDrive(){
    if(!drive.loaded)throw new Error('Prima premi “Apri ultimo archivio da Drive”, anche se la cartella è vuota.');
    const bytes=await archiveToBytes(archive);if(bytes.byteLength>6*1024*1024)throw new Error('Archivio oltre 6 MB per il trasferimento Drive: usa download e caricamento manuale, oppure archivi separati per anno.');
    const check=await archiveFromBytes(bytes);if(canonical(check)!==canonical(archive))throw new Error('Controllo del file generato non riuscito.');
    const byteDigest=await sha256Bytes(bytes),result=await api('driveSave',{expectedFileId:drive.fileId,base64:toBase64(bytes),sha256:byteDigest});
    setDrive({loaded:true,fileId:result.fileId,url:result.url});markArchiveSaved();setDirty(false);setVerified('Versione salvata in Drive; integrità dei byte riletta e verificata dal server.');setMessage('Excel salvato nella cartella Drive; le versioni precedenti sono conservate.');
  }
  async function download(){const bytes=await archiveToBytes(archive);const check=await archiveFromBytes(bytes);if(canonical(check)!==canonical(archive))throw new Error('Controllo del file generato non riuscito.');downloadArchive(bytes,archiveFilename());setMessage('Download avviato. Salva il file e usa “Verifica Excel salvato”: l’avvio del download non conferma il salvataggio sul computer.');}
  const rows=archiveRows(archive),dates=rows.map(r=>r.date).sort();
  return <section className="rm-archive space-y-5 max-w-6xl mx-auto p-5" aria-busy={busy}>
    <header><h1 className="text-2xl font-bold">Archivio cumulativo presenze</h1><p>Unisci gli esiti senza duplicati. Le schede 4 e 5 leggono questo archivio in memoria, senza aggiornamenti dal Foglio.</p></header>
    <div className="ar-card"><strong>Fase 1 — nessuna cancellazione</strong><p>L’acquisizione legge l’intero archivio operativo disponibile, inclusi i turni delle versioni precedenti. Chiusura delle settimane e pulizia del Foglio non sono ancora abilitate.</p></div>
    <div className="ar-card"><h2 className="font-bold">1. Apri o unisci l’archivio conservato</h2>
      <div className="ar-actions"><button disabled={busy} onClick={()=>openRef.current?.click()}>Carica / unisci Excel</button><button disabled={busy} onClick={()=>void act(loadDrive)}>Apri ultimo archivio da Drive</button></div>
      <input ref={openRef} type="file" accept=".xlsx" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void act(()=>importFile(file));}}/>
      <p>Gli Excel vengono uniti ai dati già caricati. Non modificare manualmente le tabelle: sono viste del contenuto verificato. {localName&&`Ultimo file aperto: ${localName}.`}</p>
    </div>
    <div className="ar-card"><h2 className="font-bold">2. Acquisisci le registrazioni Google</h2>
      <label>Password amministrativa <input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <div className="ar-actions"><button disabled={busy} onClick={()=>{setAdminPassword(password);setPassword('');setMessage('Credenziale impostata per questa sessione.');}}>Imposta accesso centrale</button><button disabled={busy} onClick={()=>void act(acquire)}>Acquisisci presenze dal Foglio</button></div>
      <p>Se hai già aperto la gestione centrale, puoi usare la credenziale della sessione senza reinserirla. Nessun collegamento Google è richiesto per leggere un Excel.</p>
    </div>
    <div className="ar-card"><h2 className="font-bold">3. Salva e verifica</h2><p>{rows.length} partecipazioni · {archive.events.length} eventi · {archive.shifts.length} versioni turno. {dates.length?`Periodo ${dates[0]} — ${dates.at(-1)}.`:'Nessun dato caricato.'}</p>
      <div className="ar-actions"><button disabled={busy||!archive.receipts.length} onClick={()=>void act(download)}>Scarica Excel cumulativo</button><button disabled={busy||!archive.receipts.length||!drive.loaded} onClick={()=>void act(saveDrive)}>Salva nuova versione in Drive</button><button disabled={busy||!archive.receipts.length} onClick={()=>verifyRef.current?.click()}>Verifica Excel salvato</button></div>
      <input ref={verifyRef} hidden type="file" accept=".xlsx" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void act(async()=>{const check=await archiveFromBytes(await file.arrayBuffer());if(canonical(check)!==canonical(archive))throw new Error('Il file è valido, ma non coincide con l’archivio attualmente caricato.');markArchiveSaved();setDirty(false);setVerified('Excel ricaricato: tutti i dati coincidono con l’archivio in memoria.');setMessage('Verifica completata.');});}}/>
      <p>{dirty?'Dati caricati o modificati: salva e verifica prima di chiudere la pagina.':'Nessuna modifica da verificare.'} {verified}</p>
      {drive.url&&<a href={drive.url} target="_blank" rel="noreferrer">Apri l’ultima versione Drive gestita in questa sessione</a>}
    </div>
    <div className="ar-card"><p>Alla chiusura della pagina l’archivio in memoria viene perso: riapri l’Excel o la versione Drive nella sessione successiva. Il programma non conserva lo storico delle presenze nel browser.</p><button disabled={busy} onClick={()=>{if(window.confirm('Svuotare solo i dati caricati in memoria? I file salvati e il Foglio restano intatti.')){setArchive(emptyArchive());setDrive({loaded:false,fileId:'',url:''});setDirty(false);setVerified('');setLocalName('');}}}>Svuota dati in memoria</button></div>
    {busy&&<p role="status">Operazione in corso. Attendi la conferma prima di chiudere.</p>}{message&&<p className="ar-success" role="status">{message}</p>}{error&&<p className="ar-error" role="alert">{error}</p>}
  </section>;
}
async function sha256Bytes(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))].map(v=>v.toString(16).padStart(2,'0')).join('');}
