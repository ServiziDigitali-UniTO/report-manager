import * as XLSX from 'xlsx';
import {archiveRows,canonical,sha256,statusLabel,plannedMinutes,validateArchive,type PresenceArchive} from './model';
const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
export const workbookMime=MIME;
/** Human-readable sheets are views; the integrity-checked machine sheet owns the data. */
export async function archiveToBytes(archive:PresenceArchive):Promise<Uint8Array>{
  const a=validateArchive(archive),json=canonical(a),digest=await sha256(json),wb=XLSX.utils.book_new();
  const add=(name:string,rows:any[][])=>{const sheet=XLSX.utils.aoa_to_sheet(rows);sheet['!cols']=rows[0].map((_,i)=>({wch:i===0?14:23}));XLSX.utils.book_append_sheet(wb,sheet,name);};
  add('Presenze',[['Data','Risorsa','Orario','Studente','Matricola','Prenotazione','Stato prenotazione Affluences','Esito','Durata prevista minuti','Minuti ritardo','Registrato il','Validato da','Metodo','Note','Origine'],...archiveRows(a).map(r=>[r.date,r.resource,r.timeSlot,r.studentName,r.matricola,r.bookingCode,r.bookingStatus==='active'?'Attiva':r.bookingStatus==='cancelled'?'Cancellata':'Non trovata nei CSV acquisiti',statusLabel(r.status),plannedMinutes(r)??'',r.delayMinutes,r.validatedAt,r.validatedBy,r.validationMode,r.note,r.sourceId])]);
  add('Turni e prenotati',[['Data','Risorsa','Orario','Studente','Matricola','Prenotazione','ID turno','ID versione','Origine'],...a.shifts.flatMap(s=>s.students.map(st=>[s.date,s.resource,s.timeSlot,st.name,st.matricola,st.bookingCode||'',s.id,s.publicationId,s.sourceId]))]);
  add('Eventi',[['ID evento','Data turno','Risorsa','Orario','Studente','Matricola','Esito','Minuti ritardo','Registrato il','Validato da','Note','Origine'],...a.events.map(e=>[e.id,e.record.date,e.record.resource,e.record.timeSlot,e.record.studentName,e.record.matricola,statusLabel(e.record.status),e.record.delayMinutes,e.record.validatedAt,e.record.validatedBy,e.record.note||'',e.sourceId])]);
  add('Archiviazioni',[['ID acquisizione','Acquisito il','Origine','Eventi inclusi','Versioni turno incluse'],...a.receipts.map(r=>[r.id,r.exportedAt,r.sourceId,r.eventIds.length,r.shiftIds.length])]);
  add('Prenotazioni Affluences',[['Osservata il','Data','Risorsa','Studente','Matricola','Prenotazione','Cancellata'],...(a.bookings||[]).map(b=>[b.observedAt,b.record.dateStr,b.record.resourceName,b.record.fullName,b.record.matricola,b.record.bookingCode,b.record.isCancelled?'SI':'NO'])]);
  add('Periodi SIZOS',[['Risorsa','Inizio','Fine','Versione','Giornate escluse','ID periodo'],...(a.periods||[]).map(p=>[p.resource,p.start,p.end,p.version,p.excluded.join(', '),p.id])]);
  add('Unita archiviate',[['ID unità','ID esportazione','Impronta','Data'],...(a.closures||[]).map(c=>[c.unitId,c.exportId,c.digest,c.exportedAt])]);
  // Never split a surrogate pair between XML cells.
  const chunks:any[][]=[['RM_ARCHIVE',2,digest]];let index=0;
  for(let offset=0;offset<json.length;){let end=Math.min(offset+28000,json.length);const last=json.charCodeAt(end-1);if(end<json.length&&last>=0xD800&&last<=0xDBFF)end--;chunks.push([index++,json.slice(offset,end)]);offset=end;}add('_RM_Dati',chunks);
  wb.Workbook={Sheets:wb.SheetNames.map(name=>({name,Hidden:name==='_RM_Dati'?1:0}))};
  return new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx',compression:true}));
}
export async function archiveFromBytes(bytes:ArrayBuffer|Uint8Array):Promise<PresenceArchive>{
  if(bytes.byteLength>30*1024*1024)throw new Error('Archivio oltre 30 MB: suddividerlo per anno accademico.');
  const wb=XLSX.read(bytes,{type:'array',cellFormula:false,cellHTML:false}),sheet=wb.Sheets['_RM_Dati'];if(!sheet)throw new Error('Questo Excel non è un archivio cumulativo Report Manager.');
  const data=XLSX.utils.sheet_to_json<any[]>(sheet,{header:1,raw:true});
  if(data[0]?.[0]!=='RM_ARCHIVE'||![1,2].includes(data[0]?.[1]))throw new Error('Versione archivio non supportata.');
  const chunks=data.slice(1);if(chunks.some((r,i)=>r[0]!==i||typeof r[1]!=='string'))throw new Error('Blocchi archivio incompleti o fuori ordine.');
  const json=chunks.map(r=>r[1]).join('');if(await sha256(json)!==data[0][2])throw new Error('Controllo integrità fallito. Il file è incompleto o è stato modificato.');
  return validateArchive(JSON.parse(json));
}
export function downloadArchive(bytes:Uint8Array,name:string){const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:MIME})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export const archiveFilename=()=> 'Report_Manager_Archivio_'+new Date().toISOString().replace(/[:.]/g,'-')+'.xlsx';
export function toBase64(bytes:Uint8Array){let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);}
export function fromBase64(value:string){return Uint8Array.from(atob(value),c=>c.charCodeAt(0));}
