import {PeriodBoard,PeriodStudent} from '../periods/PeriodViews';
import {beginSaving,endSaving} from '../periods/saveStatus';
import React,{useEffect,useRef,useState} from 'react';
import QRCode from 'qrcode';
import {rpc} from '../services/bridge';
import {publicAsset} from '../utils/assets';
import {AREAS,addDays,boardRpc,clearAreaAccess,directPortal,getAreaAccess,italianDate,publicAreaUrl,retryableCommand,weekStart,WeeklyBoard,WeeklyShift,WeeklyStudent,WeeklyState} from '../services/weekly';
import type {AttendanceStatus} from '../types';
export function ensureWeeklyStyle(){if(document.querySelector('link[data-rm-weekly-style]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href=publicAsset('tutor.css?v=4.0.0');link.dataset.rmWeeklyStyle='true';document.head.appendChild(link);}
export function WeeklyRouter({initialHash}:{initialHash?:string}){
  const [hash,setHash]=useState(initialHash||location.hash);
  useEffect(()=>{ensureWeeklyStyle();if(initialHash)return;const update=()=>setHash(location.hash);window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[initialHash]);
  const params=new URLSearchParams(hash.split('?')[1]||'');
  if(hash.startsWith('#area/')){const area=hash.split('?')[0].slice(6);return <TutorBoard key={area+'|'+(params.get('access')||'')} area={area} suppliedAccess={params.get('access')} suppliedWeek={params.get('week')}/>;}
  if(hash.startsWith('#presenza-periodo'))return <PeriodStudent periodId={params.get('period')||''} token={params.get('token')||''}/>;
  if(hash.startsWith('#presenza'))return <StudentCheckIn key={hash} shiftId={params.get('shift')||''} token={params.get('token')||''}/>;
  return <main className="rm-page"><div className="rm-wrap rm-panel">Collegamento non valido. Aprire il link fornito dalla segreteria.</div></main>;
}
const statusLabel=(status?:string)=>({present:'Presente',absent:'Assente',late:'Ritardo'}[status||'']||'In attesa di registrazione');
function timeLabel(value:string){return new Date(value).toLocaleString('it-IT',{timeZone:'Europe/Rome'});}
function ErrorBox({error,direct}:{error:string;direct?:string}){return <div role="alert" className="rm-alert rm-error"><p>{error}</p>{direct&&!window.__RM_NATIVE_RPC__&&<p><a href={direct} target="_blank" rel="noopener noreferrer">Apri direttamente il modulo Google</a></p>}</div>;}
function TutorBoard({area,suppliedAccess,suppliedWeek}:{area:string;suppliedAccess:string|null;suppliedWeek:string|null}){
  const [access,setAccess]=useState(()=>getAreaAccess(area,suppliedAccess));
  const [accessDraft,setAccessDraft]=useState('');const [week,setWeek]=useState(suppliedWeek||'');
  const [board,setBoard]=useState<WeeklyBoard|null>(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [connected,setConnected]=useState(false);const [loading,setLoading]=useState(false);const [lastChecked,setLastChecked]=useState('');
  const [day,setDay]=useState('');const [resource,setResource]=useState('');const [qr,setQr]=useState<WeeklyShift|null>(null);const [manual,setManual]=useState<WeeklyShift|null>(null);
  const [printImages,setPrintImages]=useState<Record<string,string>>({});const [printing,setPrinting]=useState(false);
  const loadRef=useRef<(force?:boolean)=>Promise<void>>(async()=>{});
  const direct=directPortal('area',{area,access,week});
  useEffect(()=>{
    let stopped=false,busy=false,revision='';setBoard(null);setError('');setConnected(false);setDay('');setResource('');setNotice('');
    const update=async(force=false)=>{
      if(!access||busy)return;busy=true;setLoading(true);
      try{const result=await boardRpc(area,access,week||undefined,force?undefined:revision);if(stopped)return;
        if(!result.notModified){revision=result.revision;setBoard(result);setDay(previous=>previous&&previous>=result.weekStart&&previous<=result.weekEnd?previous:(result.serverDate>=result.weekStart&&result.serverDate<=result.weekEnd?result.serverDate:result.weekStart));}
        setLastChecked(new Date().toLocaleTimeString('it-IT'));setConnected(true);setError('');
      }catch(e:any){if(!stopped){setError(e.message||'Collegamento non disponibile.');setConnected(false);if(e.code==='ACCESS')setBoard(null);}}
      finally{busy=false;if(!stopped)setLoading(false);}
    };
    loadRef.current=update;void update(true);
    // Refresh on entry, resume, selection or explicit request; no periodic polling.
    const resume=()=>{if(!document.hidden)void update();};const disconnect=()=>{setConnected(false);setError('Connessione assente. Le modifiche richiedono una conferma dal Foglio Google.');};window.addEventListener('offline',disconnect);window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
    return()=>{stopped=true;window.removeEventListener('offline',disconnect);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);};
  },[area,access,week]);
  async function saved(record:any){setNotice('Esito confermato sul Foglio Google.');if(record)setBoard(previous=>previous?{...previous,shifts:previous.shifts.map(s=>s.id!==record.weeklyShiftId?s:{...s,students:s.students.map(st=>st.id!==record.weeklyStudentId?st:{...st,state:record})})}:previous);await loadRef.current(true);}
  const visibleShifts=board?.shifts.filter(s=>!resource||s.resourceId===resource)||[];
  async function printWeek(){
    if(!board||!connected||!visibleShifts.length)return;
    if(!window.confirm('Usare il registro cartaceo solo in caso di necessità. Stampare la settimana per le risorse selezionate?'))return;
    setPrinting(true);setError('');
    try{const entries=await Promise.all(visibleShifts.map(async s=>[s.id,await QRCode.toDataURL(s.studentUrl,{width:260,margin:4,errorCorrectionLevel:'M'})] as const));setPrintImages(Object.fromEntries(entries));
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.rm-print-only img')).map(img=>img.decode().catch(()=>{})));
      document.title='Registro emergenza '+(AREAS[area]||area)+' '+board.weekStart;window.print();
    }catch(e:any){setError(e.message||'Impossibile preparare la stampa.');}finally{setPrinting(false);}
  }
  if(!AREAS[area])return <main className="rm-page"><div className="rm-panel">Area non riconosciuta.</div></main>;
  if(!access)return <main className="rm-page"><div className="rm-wrap rm-panel"><div className="rm-brand">DSV UniTO · Report Manager</div><h1>{AREAS[area]}</h1><p>Aprire il collegamento riservato fornito dalla segreteria. Se già disponibile, inserire il codice di accesso del collegamento.</p><form onSubmit={e=>{e.preventDefault();setAccess(getAreaAccess(area,accessDraft.trim()));}}><label>Codice di accesso<input type="password" value={accessDraft} onChange={e=>setAccessDraft(e.target.value)} autoComplete="off" required/></label><button className="rm-primary">Apri registro</button></form></div></main>;
  return <main className="rm-page"><div className="rm-wrap">
    <div className="rm-online-only">
      <div className="rm-top"><div><div className="rm-brand">DSV UniTO · Registro digitale</div><h1>{AREAS[area]}</h1><div className="rm-small">{board?.accessLabel||'Accesso riservato'} · {connected?'Verificato alle '+lastChecked:loading?'Collegamento…':'Non sincronizzato'}</div></div><button onClick={()=>void loadRef.current(true)} disabled={loading}>{loading?'Aggiornamento…':'Aggiorna'}</button></div>
      {error&&<ErrorBox error={error} direct={direct}/>}
      {notice&&<div role="status" className="rm-alert rm-ok">{notice}</div>}
      {area==='azienda_zootecnica'&&<PeriodBoard access={access}/>}
      {board&&<>
        <h2>Turni ordinari settimanali</h2>
        {board.unitState&&board.unitState!=='OPEN'&&<p className="rm-alert">Settimana chiusa. Le rettifiche sono gestite dalla segreteria.</p>}
        <div className="rm-controls"><label>Settimana<select value={board.weekStart} onChange={e=>setWeek(e.target.value)}>{!board.weeks.some(w=>w.start===board.weekStart)&&<option value={board.weekStart}>{italianDate(board.weekStart)} – {italianDate(board.weekEnd)}</option>}{board.weeks.map(w=><option key={w.start} value={w.start}>{italianDate(w.start)} – {italianDate(w.end)}</option>)}</select></label>
        <label>Risorsa<select value={resource} onChange={e=>{setResource(e.target.value);void loadRef.current(true);}}><option value="">Tutte le risorse autorizzate</option>{Array.from(new Map(board.shifts.map(s=>[s.resourceId,s.resource])).entries()).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
        {board.publication?<p className="rm-small">Pubblicazione v{board.publication.version} · aggiornata {timeLabel(board.publication.updatedAt)}</p>:<div className="rm-alert">La segreteria non ha ancora pubblicato questa settimana.</div>}
        {!!board.removedWithPresence&&<div className="rm-alert">{board.removedWithPresence} registrazioni riguardano prenotazioni non più presenti nell’elenco pubblicato. La segreteria deve verificarle; lo storico è conservato.</div>}
        <div className="rm-days" aria-label="Giorni della settimana">{Array.from({length:7},(_,i)=>addDays(board.weekStart,i)).map(date=><button key={date} aria-pressed={day===date} onClick={()=>{setDay(date);void loadRef.current(true);}}><span>{new Date(date+'T12:00:00Z').toLocaleDateString('it-IT',{weekday:'short'})}</span><strong>{date.slice(8)}</strong><span>{visibleShifts.filter(s=>s.date===date).reduce((v,s)=>v+s.students.length,0)} iscritti</span></button>)}</div>
        {visibleShifts.filter(s=>s.date===day).sort((a,b)=>a.timeSlot.localeCompare(b.timeSlot)||a.resource.localeCompare(b.resource)).map(s=><section className="rm-panel" key={s.id}><div className="rm-shift-head"><div><h2>{s.resource}</h2><p><strong>{s.timeSlot}</strong> · {s.students.length} nominativi</p>{s.concludedAt&&<p className="rm-small">Appello concluso il {timeLabel(s.concludedAt)}</p>}</div><button onClick={()=>setQr(s)} disabled={!connected}>Mostra QR studenti</button></div>
          <p className="rm-small">{s.students.filter(st=>st.state?.status==='present').length} presenti · {s.students.filter(st=>st.state?.status==='late').length} ritardi · {s.students.filter(st=>st.state?.status==='absent').length} assenti · {s.students.filter(st=>!st.state).length} da verificare</p>
          {s.students.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(st=><StudentRow key={st.id} shift={s} student={st} access={access} disabled={!connected||!!board.unitState&&board.unitState!=='OPEN'} onSaved={saved} onConflict={()=>void loadRef.current(true)}/>)}
          <details><summary>Operazioni del turno</summary><button disabled={!connected||board.unitState!=='OPEN'} onClick={()=>setManual(s)}>Aggiungi fuori elenco</button><button onClick={async()=>{try{await rpc('v4.finishRoll',{shiftId:s.id},{access});setNotice('Appello contrassegnato come concluso. Gli studenti senza esito restano in attesa.');await loadRef.current(true);}catch(e:any){setError(e.message);}}}>Concludi appello</button></details>
        </section>)}
        {!visibleShifts.some(s=>s.date===day)&&<div className="rm-panel rm-empty">Nessun turno pubblicato per questo giorno e questa selezione.</div>}
        <details className="rm-panel"><summary>Emergenza e accesso</summary><p className="rm-small">Il registro digitale è la modalità ordinaria. Il PDF cartaceo richiede una connessione per essere preparato: se necessario conservarlo prima di un’interruzione prevista.</p><button onClick={printWeek} disabled={!connected||printing||!visibleShifts.length}>{printing?'Preparazione PDF…':'Stampa settimana per emergenza'}</button><p><a href={direct} target="_blank" rel="noopener noreferrer">Apri questo registro direttamente su Google</a></p><button onClick={()=>{clearAreaAccess(area);if(!window.__RM_NATIVE_RPC__)history.replaceState(null,'',location.pathname+location.search+'#area/'+area);setAccess('');}}>Dimentica accesso memorizzato</button></details>
      </>}
    </div>
    <div className="rm-print-only"><div className="rm-print-header"><h1>Registro presenze — {AREAS[area]}</h1><p>Uso cartaceo di emergenza · settimana {board&&italianDate(board.weekStart)} – {board&&italianDate(board.weekEnd)}</p><p>Pubblicazione v{board?.publication?.version} · stampato {new Date().toLocaleString('it-IT')} · risorse {resource?'selezionate':'autorizzate'}</p><p>Motivo del ricorso alla carta: ____________________________________________________</p></div>
      {visibleShifts.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.timeSlot.localeCompare(b.timeSlot)||a.resource.localeCompare(b.resource)).map(s=><section key={s.id} className="rm-print-turn">{printImages[s.id]&&<img className="rm-print-qr" src={printImages[s.id]} alt="QR autoconvalida studenti"/>}<h2>{italianDate(s.date)} · {s.resource}</h2><p>Fascia oraria: {s.timeSlot} · {s.students.length} nominativi</p><p>QR: seleziona il tuo nominativo e conferma, senza PIN. La firma cartacea richiede successiva trascrizione degli esiti.</p><p><a href={publicAreaUrl(area)}>Apri registro tutor (richiede accesso riservato)</a></p><div className="rm-clear"/><table><thead><tr><th style={{width:'6%'}}>N.</th><th>Nome e cognome</th><th style={{width:'17%'}}>Matricola</th><th className="rm-signature">Firma autografa</th></tr></thead><tbody>{s.students.slice().sort((a,b)=>a.name.localeCompare(b.name)).map((st,i)=><tr key={st.id}><td>{i+1}</td><td>{st.name}{st.manual?' (fuori elenco)':''}</td><td>{st.matricola}</td><td className="rm-signature"/></tr>)}</tbody></table><p>Note / integrazioni: ______________________________________________________________</p><p>Nome e firma tutor: ______________________________________________________________</p></section>)}
    </div>
    {qr&&<QrDialog shift={qr} onClose={()=>setQr(null)}/>}
    {manual&&<ManualDialog shift={manual} access={access} onClose={()=>setManual(null)} onSaved={r=>{setManual(null);void saved(r);}}/>}
  </div></main>;
}
function StudentRow({shift,student,access,disabled,onSaved,onConflict}:{shift:WeeklyShift;student:WeeklyStudent;access:string;disabled:boolean;onSaved:(record:any)=>Promise<void>;onConflict:()=>void}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [editor,setEditor]=useState<{status:AttendanceStatus;delay:number;note:string;base:string|null;paper:boolean}|null>(null);
  const command=useRef(retryableCommand());
  async function save(status:AttendanceStatus,delay:number,note:string,base:string|null,paper=false){
    beginSaving();setBusy(true);setError('');try{const result=await command.current('tutorSubmit',{shiftId:shift.id,studentId:student.id,status,delayMinutes:status==='late'?delay:0,note,expectedEventId:base,source:paper?'paper':'digital'},{access});if(!result.confirmed)throw new Error('Salvataggio non confermato.');setEditor(null);await onSaved(result.records[0]);}catch(e:any){setError(e.message);if(e.code==='CONFLICT')onConflict();}finally{endSaving();setBusy(false);}
  }
  function choose(status:AttendanceStatus){if(status==='late'){setEditor({status,delay:student.state?.delayMinutes||15,note:student.state?.note||'',base:student.state?.id||null,paper:student.state?.validationMode==='CARTACEA'});}else void save(status,0,student.state?.note||'',student.state?.id||null);}
  return <div className="rm-student"><div><strong>{student.name}</strong><div className="rm-small">{student.matricola==='-'?'Matricola da verificare':student.matricola}{student.manual?' · Fuori elenco':''}</div><span className={'rm-state rm-'+(student.state?.status||'unknown')}>{statusLabel(student.state?.status)}{student.state?.status==='late'?' · '+student.state.delayMinutes+' min':''}</span>{student.state&&<div className="rm-small">{student.state.validationMode==='STUDENTE_QR'?'Autoconvalida studente':(student.state.validationMode==='CARTACEA'?'Registro cartaceo · ':'')+student.state.validatedBy} · {timeLabel(student.state.validatedAt)}</div>}{student.discrepant&&<p className="rm-small">⚠ Esito tutor diverso da una precedente autoconvalida studente.</p>}</div>
    <div><select aria-label={'Stato di '+student.name} disabled={disabled||busy} value={student.state?.status||''} onChange={e=>e.target.value&&choose(e.target.value as AttendanceStatus)}><option value="" disabled>In attesa di registrazione</option><option value="present">Presente</option><option value="absent">Assente</option><option value="late">Ritardo…</option></select><p className="rm-small">{busy?'Salvataggio in corso — attendere prima di chiudere':student.state?'Salvato sul Foglio Google':''}</p><button disabled={disabled||busy} onClick={()=>setEditor({status:student.state?.status||'present',delay:student.state?.delayMinutes||15,note:student.state?.note||'',base:student.state?.id||null,paper:student.state?.validationMode==='CARTACEA'})}>Note / rettifica</button></div>
    {student.state?.note&&<p className="rm-extra rm-small">{student.state.note}</p>}{error&&<div className="rm-extra"><ErrorBox error={error}/></div>}
    {editor&&<div className="rm-modal" role="dialog" aria-modal="true" aria-label={'Rettifica '+student.name}><form className="rm-dialog" onSubmit={e=>{e.preventDefault();void save(editor.status,editor.delay,editor.note,editor.base,editor.paper);}}><h2>{student.name}</h2><label>Esito<select value={editor.status} onChange={e=>setEditor({...editor,status:e.target.value as AttendanceStatus})}><option value="present">Presente</option><option value="absent">Assente</option><option value="late">Ritardo</option></select></label>{editor.status==='late'&&<label>Minuti di ritardo<input type="number" min="1" max="1440" required value={editor.delay} onChange={e=>setEditor({...editor,delay:Number(e.target.value)})}/></label>}<label className="rm-inline-label"><input type="checkbox" checked={editor.paper} onChange={e=>setEditor({...editor,paper:e.target.checked})}/>Trascrizione da registro cartaceo di emergenza</label><label>Nota / motivo della rettifica{editor.paper?' e riferimento al registro cartaceo':''}<textarea required={editor.paper} maxLength={2000} value={editor.note} onChange={e=>setEditor({...editor,note:e.target.value})}/></label>{error&&<ErrorBox error={error}/>}<div className="rm-controls"><button type="button" disabled={busy} onClick={()=>setEditor(null)}>Chiudi</button><button className="rm-primary" disabled={busy||disabled}>{busy?'Salvataggio…':'Salva sul Foglio'}</button></div></form></div>}
  </div>;
}
function QrDialog({shift,onClose}:{shift:WeeklyShift;onClose:()=>void}){
  const [image,setImage]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let active=true;QRCode.toDataURL(shift.studentUrl,{width:600,margin:4,errorCorrectionLevel:'M'}).then(url=>{if(active)setImage(url);}).catch(()=>setError('Impossibile generare il QR.'));return()=>{active=false;};},[shift.studentUrl]);
  return <div className="rm-modal rm-online-only" role="dialog" aria-modal="true" aria-label="QR studenti"><div className="rm-dialog"><h2>{shift.resource}</h2><p>{italianDate(shift.date)} · {shift.timeSlot}</p>{image?<img className="rm-qr" src={image} alt="QR studenti del turno"/>:<p>{error||'Preparazione QR…'}</p>}<p>Scansiona, seleziona il tuo nominativo e conferma la presenza. Nessun PIN.</p><p><a href={shift.studentUrl} target="_blank" rel="noopener noreferrer">Apri modulo studente</a></p><button className="rm-full" onClick={onClose}>Chiudi</button></div></div>;
}
function ManualDialog({shift,access,onClose,onSaved}:{shift:WeeklyShift;access:string;onClose:()=>void;onSaved:(r:any)=>void}){
  const [name,setName]=useState(''),[matricola,setMatricola]=useState(''),[note,setNote]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const command=useRef(retryableCommand());
  return <div className="rm-modal rm-online-only" role="dialog" aria-modal="true" aria-label="Integrazione fuori elenco"><form className="rm-dialog" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await command.current('tutorSubmit',{shiftId:shift.id,manual:{name,matricola},status:'present',delayMinutes:0,note,expectedEventId:null},{access});onSaved(r.records[0]);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><h2>Aggiungi fuori elenco</h2><label>Nome e cognome<input required maxLength={150} value={name} onChange={e=>setName(e.target.value)}/></label><label>Matricola<input required maxLength={50} value={matricola} onChange={e=>setMatricola(e.target.value)}/></label><label>Motivazione<textarea required maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>{error&&<ErrorBox error={error}/>}<div className="rm-controls"><button type="button" disabled={busy} onClick={onClose}>Annulla</button><button className="rm-primary" disabled={busy}>{busy?'Salvataggio…':'Aggiungi e segna presente'}</button></div></form></div>;
}
function StudentCheckIn({shiftId,token}:{shiftId:string;token:string}){
  const [shift,setShift]=useState<{id:string;date:string;resource:string;timeSlot:string;students:{id:string;name:string;matricola:string}[]}|null>(null);
  const [selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[receipt,setReceipt]=useState<any>(null),[attempt,setAttempt]=useState(0);
  const command=useRef(retryableCommand()),direct=directPortal('student',{shift:shiftId,token});
  useEffect(()=>{let active=true;setError('');setShift(null);setSelected('');rpc('weekly.student',{}, {shiftId,token}).then(r=>{if(active)setShift(r.shift);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[shiftId,token,attempt]);
  return <main className="rm-page"><div className="rm-wrap" style={{maxWidth:520}}><section className="rm-panel"><div className="rm-brand">DSV UniTO · Presenze</div><h1>Autoconvalida studente</h1>{!shift&&!error&&<p>Caricamento del turno…</p>}{shift&&<><h2>{shift.resource}</h2><p>{italianDate(shift.date)} · {shift.timeSlot}</p></>}
    {error&&<ErrorBox error={error} direct={direct}/>}
    {!shift&&error&&<button onClick={()=>setAttempt(n=>n+1)}>Riprova caricamento</button>}
    {shift&&!receipt&&<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await command.current('studentSubmit',{studentId:selected},{shiftId,token});if(!r.confirmed||!r.records?.[0])throw new Error('Conferma non ricevuta. Verificare prima di riprovare.');setReceipt(r.records[0]);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><label>Seleziona il tuo nominativo<select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="" disabled>Scegli il tuo nominativo</option>{shift.students.map(st=><option key={st.id} value={st.id}>{st.name}{st.matricola!=='-'?' — '+st.matricola:''}</option>)}</select></label><p className="rm-small">Conferma soltanto la tua presenza. Il QR non identifica automaticamente la persona. Autoconvalida consentita da 30 minuti prima a 60 minuti dopo il turno, ora italiana.</p><button className="rm-primary rm-full" disabled={busy||!selected}>{busy?'Registrazione…':'Confermo la mia presenza'}</button><p className="rm-small">Fuori elenco o dati errati? Rivolgiti al tutor.</p></form>}
    {receipt&&<div className="rm-alert rm-ok" role="status"><h2>Registrazione confermata</h2><p><strong>{receipt.studentName}</strong></p><p>Esito: {statusLabel(receipt.status)}{receipt.status==='late'?' · '+receipt.delayMinutes+' minuti':''}</p><p>Metodo: {receipt.validationMode==='STUDENTE_QR'?'Autoconvalida studente':'Esito già verificato dal tutor o dalla segreteria'}</p><p>{timeLabel(receipt.validatedAt)}</p><p className="rm-small rm-access">Ricevuta: {receipt.securityHash}</p><button onClick={()=>navigator.clipboard?.writeText(JSON.stringify({studentName:receipt.studentName,resource:receipt.resource,date:receipt.date,timeSlot:receipt.timeSlot,status:receipt.status,validatedAt:receipt.validatedAt,securityHash:receipt.securityHash},null,2))}>Copia ricevuta</button></div>}
  </section></div></main>;
}
