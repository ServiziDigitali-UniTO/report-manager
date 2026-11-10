import React,{useMemo,useState} from 'react';
import type {BookingRecord} from '../types';
import {StudentHistory} from '../components/StudentHistory';
import {archiveRows,statusLabel,plannedMinutes,type ArchiveRow} from './model';
import {useArchive} from './store';
import './archive.css';
export function ArchiveReport({student=false,onOpenArchive}:{student?:boolean;onOpenArchive:()=>void}){
  const archive=useArchive(),rows=useMemo(()=>archiveRows(archive),[archive]),[search,setSearch]=useState(''),[resource,setResource]=useState(''),[status,setStatus]=useState(''),[from,setFrom]=useState(''),[to,setTo]=useState(''),[matricola,setMatricola]=useState('');
  const students=useMemo(()=>[...new Map(rows.filter(r=>r.matricola&&r.matricola!=='-').map(r=>[r.matricola,{matricola:r.matricola,name:r.studentName}])).values()].sort((a,b)=>a.name.localeCompare(b.name)),[rows]);
  const filtered=rows.filter(r=>(!student||!!matricola&&r.matricola===matricola)&&(!resource||r.resource===resource)&&(!status||r.status===status)&&(!from||r.date>=from)&&(!to||r.date<=to)&&(!search||[r.studentName,r.matricola,r.bookingCode].join(' ').toLowerCase().includes(search.toLowerCase())));
  const count=(s:ArchiveRow['status'])=>filtered.filter(r=>r.status===s).length;
  const receipts=[...archive.receipts].sort((a,b)=>a.exportedAt.localeCompare(b.exportedAt));
  return <section className="rm-archive space-y-4 max-w-7xl mx-auto p-5"><h2 className="text-xl font-bold">{student?'Storico incrociato delle prenotazioni e presenze':'Presenze Turni & Risorse — archivio Excel'}</h2>
    <div className="ar-card print:hidden"><p>Fonte: archivio cumulativo caricato in questa sessione. Ultima acquisizione Google: {receipts.at(-1)?.exportedAt||'nessuna'}. Nessuna lettura automatica dal Foglio Google.</p><button onClick={onOpenArchive}>Apri Archivio presenze</button></div>
    {!(archive.receipts.length||archive.bookings?.length)?<p>Carica un archivio Excel oppure acquisisci i dati dalla sezione Archivio presenze.</p>:<>
      <div className="ar-card ar-actions print:hidden">
        {student&&<label>Studente (matricola)<select value={matricola} onChange={e=>setMatricola(e.target.value)}><option value="">Seleziona uno studente</option>{students.map(s=><option key={s.matricola} value={s.matricola}>{s.name} — {s.matricola}</option>)}</select></label>}
        <label>Cerca nome, matricola o prenotazione<input value={search} onChange={e=>setSearch(e.target.value)}/></label>
        <label>Risorsa<select value={resource} onChange={e=>setResource(e.target.value)}><option value="">Tutte</option>{[...new Set(rows.map(r=>r.resource))].sort().map(r=><option key={r}>{r}</option>)}</select></label>
        <label>Esito<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tutti</option>{['present','late','absent','unverified'].map(s=><option key={s} value={s}>{statusLabel(s as any)}</option>)}</select></label>
        <label>Dal<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Al<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label>
        <button onClick={()=>window.print()}>Stampa riepilogo</button>
      </div>
      <p>{filtered.length} partecipazioni o giornate disponibili · {count('present')} presenti · {count('late')} ritardatari · {count('absent')} assenti · {count('unverified')} in attesa di registrazione.</p>
      {student&&rows.some(r=>r.matricola==='-')&&<p>Le partecipazioni senza matricola restano nel report generale e non sono abbinate automaticamente a uno studente.</p>}
      <p className="text-sm">Le giornate SIZOS disponibili non costituiscono obblighi di presenza quotidiana. Presente indica l’esito registrato: non certifica automaticamente ore svolte o crediti. Le prenotazioni e le giornate SIZOS senza convalida restano “In attesa di registrazione”.</p>
      <div className="overflow-x-auto ar-card"><table className="w-full text-sm"><thead><tr>{['Data / turno','Risorsa','Studente / matricola','Prenotazione','Esito','Durata prevista / ritardo','Registrazione / validatore','Note'].map(t=><th key={t}>{t}</th>)}</tr></thead><tbody>{filtered.map(r=><tr key={r.key}><td>{r.date}<br/>{r.timeSlot}</td><td>{r.resource}</td><td>{r.studentName}<br/>{r.matricola}</td><td>{r.bookingStatus==='active'?'Prenotata':r.bookingStatus==='cancelled'?'Cancellata':'Non trovata nei CSV acquisiti'}{r.bookingStatus==='cancelled'&&r.status!=='unverified'?' — discordanza':''}</td><td><span className={'ar-status ar-'+r.status}>{statusLabel(r.status)}</span></td><td>{r.periodId?'Giornata SIZOS — orario variabile':plannedMinutes(r)!==null?plannedMinutes(r)+' min previsti':r.timeSlot}<br/>{r.delayMinutes?r.delayMinutes+' min di ritardo':'Nessun ritardo registrato'}</td><td>{r.validatedAt?new Date(r.validatedAt).toLocaleString('it-IT'):'Non registrata'}<br/>{r.validatedBy}</td><td>{r.note}</td></tr>)}</tbody></table></div>
      {!filtered.length&&<p>Nessuna partecipazione per la selezione corrente.</p>}
    </>}
  </section>;
}
export function StudentHistoryWithArchive({records,onNavigateToUploader,onOpenArchive}:{records:BookingRecord[];onNavigateToUploader:()=>void;onOpenArchive:()=>void}){
  const [mode,setMode]=useState<'archive'|'bookings'>('archive');return <><div className="rm-archive ar-actions p-4 print:hidden"><button aria-pressed={mode==='archive'} onClick={()=>setMode('archive')}>Prenotazioni e presenze — archivio</button><button aria-pressed={mode==='bookings'} onClick={()=>setMode('bookings')}>Prenotazioni — CSV Affluences</button></div>{mode==='archive'?<ArchiveReport student onOpenArchive={onOpenArchive}/>:<><p className="rm-archive px-5">Questa vista di dettaglio usa soltanto il CSV corrente. Lo storico incrociato usa anche le prenotazioni conservate nell’archivio cumulativo.</p><StudentHistory records={records} onNavigateToUploader={onNavigateToUploader}/></>}</>;
}
