import {LifecyclePanel} from './LifecyclePanel';
import {ArchiveCorrection} from './ArchiveCorrection';
import {driveSession,openLatestDrive,updateDriveSession} from './driveSession';
import React,{useEffect,useRef,useState} from 'react';
import {rpc,getAdminPassword,setAdminPassword} from '../services/bridge';
import {archiveRows,canonical,emptyArchive,mergeArchive,mergeExport,type PresenceArchive} from './model';
import {archiveFilename,archiveFromBytes,archiveToBytes,downloadArchive,fromBase64,toBase64} from './workbook';
import {isArchiveSaved,markArchiveSaved,setArchive,updateArchive,useArchive} from './store';
import './archive.css';
export function ArchivePanel(){
  const archive=useArchive(),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[dirty,setDirty]=useState(!isArchiveSaved()),[drive,setDrive]=useState<{loaded:boolean;fileId:string;url:string}>({loaded:driveSession.loaded,fileId:driveSession.fileId,url:driveSession.url}),[localName,setLocalName]=useState(''),[verified,setVerified]=useState('');
  useEffect(()=>{const sync=()=>{setDrive({loaded:driveSession.loaded,fileId:driveSession.fileId,url:driveSession.url});if(driveSession.error)setError(driveSession.error);};window.addEventListener('rm-drive-state',sync);return()=>window.removeEventListener('rm-drive-state',sync);},[]);
  useEffect(()=>{setDirty(!isArchiveSaved());},[archive]);
  const openRef=useRef<HTMLInputElement>(null),verifyRef=useRef<HTMLInputElement>(null);
  const api=(action:string,data:any={})=>rpc('archive.'+action,data,{password:getAdminPassword()});
  const act=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');setMessage('');try{await fn();}catch(e:any){setError(e.message||'Operazione non completata.');}finally{setBusy(false);}};
  function changed(value:PresenceArchive){setArchive(value);setDirty(true);setVerified('');}
  function summary(stats:any){return `${stats.newEvents} eventi nuovi · ${stats.duplicates} già presenti · ${stats.corrections} ulteriori eventi su partecipazioni già note · ${stats.newShifts} versioni turno nuove.`;}
  async function importFile(file:File){const incoming=await archiveFromBytes(await file.arrayBuffer());let stats:any;await updateArchive(async a=>{const result=await mergeArchive(a,incoming);stats=result.stats;return result.archive;});setDirty(true);setVerified('');setLocalName(file.name);setMessage('Excel acquisito. '+summary(stats));}
  async function acquire(){const response=await api('export');let stats:any;await updateArchive(async a=>{const result=await mergeExport(a,response.snapshot);stats=result.stats;return result.archive;});setDirty(true);setVerified('');setMessage('Dati del Foglio acquisiti. '+summary(stats)+' Il Foglio non è stato modificato.');}
  async function loadDrive(){await openLatestDrive();setDrive({loaded:driveSession.loaded,fileId:driveSession.fileId,url:driveSession.url});setMessage(driveSession.fileId?'Archivio Drive unito ai dati in memoria.':'Nessun archivio gestito nella cartella: acquisisci i dati e salva il primo Excel.');}
  async function saveDrive(){
    if(!drive.loaded)throw new Error('Prima premi “Apri ultimo archivio da Drive”, anche se la cartella è vuota.');
    const bytes=await archiveToBytes(archive);if(bytes.byteLength>6*1024*1024)throw new Error('Archivio oltre 6 MB per il trasferimento Drive: usa download e caricamento manuale, oppure archivi separati per anno.');
    const check=await archiveFromBytes(bytes);if(canonical(check)!==canonical(archive))throw new Error('Controllo del file generato non riuscito.');
    const byteDigest=await sha256Bytes(bytes),result=await api('driveSave',{expectedFileId:drive.fileId,base64:toBase64(bytes),sha256:byteDigest});
    updateDriveSession({loaded:true,fileId:result.fileId,url:result.url,fileName:result.fileName||'',fileHash:byteDigest});setDrive({loaded:true,fileId:result.fileId,url:result.url});markArchiveSaved(archive);setDirty(!isArchiveSaved());setVerified('Versione salvata in Drive; integrità dei byte riletta e verificata dal server.');setMessage('Excel salvato nella cartella Drive; le versioni precedenti sono conservate.');
  }
  async function download(){const bytes=await archiveToBytes(archive);const check=await archiveFromBytes(bytes);if(canonical(check)!==canonical(archive))throw new Error('Controllo del file generato non riuscito.');downloadArchive(bytes,archiveFilename());setMessage('Download avviato. Salva il file e usa “Verifica Excel salvato”: l’avvio del download non conferma il salvataggio sul computer.');}
  const rows=archiveRows(archive),dates=rows.map(r=>r.date).sort();
  return <section className="rm-archive space-y-5 max-w-6xl mx-auto p-5" aria-busy={busy}>
    <header><h1 className="text-2xl font-bold">Archivio cumulativo presenze</h1><p>Unisci gli esiti senza duplicati. Le schede 4 e 5 leggono questo archivio in memoria, senza aggiornamenti dal Foglio.</p></header>
    <div className="ar-card"><strong>Archivio e chiusura controllata</strong><p>L’acquisizione ordinaria legge tutti i dati operativi disponibili. Per alleggerire il Foglio usa la procedura di chiusura, esportazione, salvataggio e verifica qui sotto. La rimozione non è automatica.</p></div>
    <div className="ar-card"><h2 className="font-bold">1. Apri o unisci l’archivio conservato</h2>
      <div className="ar-actions"><button disabled={busy} onClick={()=>openRef.current?.click()}>Carica / unisci Excel</button><button disabled={busy} onClick={()=>void act(loadDrive)}>Apri ultimo archivio da Drive</button></div>
      <input ref={openRef} type="file" accept=".xlsx" hidden onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void act(()=>importFile(file));}}/>
      <p>Gli Excel vengono uniti ai dati già caricati. Non modificare manualmente le tabelle: sono viste del contenuto verificato. {localName&&`Ultimo file aperto: ${localName}.`}</p>
    </div>
    <div className="ar-card"><h2 className="font-bold">2. Acquisisci le registrazioni Google</h2>
      <label>Password amministrativa <input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)}/></label>
      <div className="ar-actions"><button disabled={busy} onClick={()=>void act(async()=>{setAdminPassword(password);setPassword('');await rpc('v4.admin',{}, {password:getAdminPassword()});await openLatestDrive();setMessage('Accesso verificato e ultimo archivio Drive aperto.');})}>Imposta accesso centrale</button><button disabled={busy} onClick={()=>void act(acquire)}>Acquisisci presenze dal Foglio</button></div>
      <p>Se hai già aperto la gestione centrale, puoi usare la credenziale della sessione senza reinserirla. Nessun collegamento Google è richiesto per leggere un Excel.</p>
    </div>
    <div className="ar-card"><h2 className="font-bold">3. Salva e verifica</h2><p>{rows.length} partecipazioni · {archive.events.length} eventi · {archive.shifts.length+(archive.periods?.length||0)} versioni turno o periodo. {dates.length?`Periodo ${dates[0]} — ${dates.at(-1)}.`:'Nessun dato caricato.'}</p>
      <div className="ar-actions"><button disabled={busy||!(archive.receipts.length||archive.bookings?.length)} onClick={()=>void act(download)}>Scarica Excel cumulativo</button><button disabled={busy||!(archive.receipts.length||archive.bookings?.length)||!drive.loaded} onClick={()=>void act(saveDrive)}>Salva nuova versione in Drive</button><button disabled={busy||!(archive.receipts.length||archive.bookings?.length)} onClick={()=>verifyRef.current?.click()}>Verifica Excel salvato</button></div>
      <input ref={verifyRef} hidden type="file" accept=".xlsx" onChange={e=>{const file=e.target.files?.[0];e.target.value='';if(file)void act(async()=>{const check=await archiveFromBytes(await file.arrayBuffer());if(canonical(check)!==canonical(archive))throw new Error('Il file è valido, ma non coincide con l’archivio attualmente caricato.');markArchiveSaved(archive);setDirty(!isArchiveSaved());setVerified('Excel ricaricato: tutti i dati coincidono con l’archivio in memoria.');setMessage('Verifica completata.');});}}/>
      <p>{dirty?'Dati caricati o modificati: salva e verifica prima di chiudere la pagina.':'Nessuna modifica da verificare.'} {verified}</p>
      {driveSession.fileName&&<p>File Drive: {driveSession.fileName}</p>}
      {drive.url&&<a href={drive.url} target="_blank" rel="noreferrer">Apri l’ultima versione Drive gestita in questa sessione</a>}
    </div>
    <div className="ar-card"><p>Alla chiusura della pagina l’archivio in memoria viene perso. Dopo l’accesso amministrativo viene aperta l’ultima versione Drive; resta possibile caricare un Excel manualmente. Il programma non conserva lo storico delle presenze nel browser.</p><button disabled={busy} onClick={()=>{if(window.confirm('Svuotare solo i dati caricati in memoria? I file salvati e il Foglio restano intatti.')){setArchive(emptyArchive());setDrive({loaded:driveSession.loaded,fileId:driveSession.fileId,url:driveSession.url});setDirty(false);setVerified('');setLocalName('');}}}>Svuota dati in memoria</button></div>
    <LifecyclePanel/>
    <ArchiveCorrection/>
    {busy&&<p role="status">Operazione in corso. Attendi la conferma prima di chiudere.</p>}{message&&<p className="ar-success" role="status">{message}</p>}{error&&<p className="ar-error" role="alert">{error}</p>}
  </section>;
}
async function sha256Bytes(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))].map(v=>v.toString(16).padStart(2,'0')).join('');}
