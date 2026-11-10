/** Portable archive: no browser storage and no network dependencies. */
export interface ArchiveStudent { id:string;name:string;matricola:string;bookingCode?:string }
export interface ArchiveShift { sourceId:string;id:string;snapshotId:string;weekStart:string;publicationId:string;resourceId:string;area:string;date:string;resource:string;timeSlot:string;students:ArchiveStudent[] }
export interface ArchiveEvent { sourceId:string;id:string;record:Record<string,any> }
export interface ArchivePublication { sourceId:string;start:string;publicationId:string;version:number;updatedAt:string }
export interface ArchiveReceipt { id:string;sourceId:string;exportedAt:string;eventIds:string[];shiftIds:string[] }
export interface PresenceArchive { format:'RM_ARCHIVE';schema:1;shifts:ArchiveShift[];events:ArchiveEvent[];publications:ArchivePublication[];receipts:ArchiveReceipt[] }
export interface ArchiveExport { format:'RM_EXPORT';schema:1;sourceId:string;exportedAt:string;shifts:ArchiveShift[];events:ArchiveEvent[];publications:ArchivePublication[] }
export interface ArchiveRow { key:string;sourceId:string;date:string;resource:string;area:string;timeSlot:string;studentName:string;matricola:string;bookingCode:string;status:'present'|'late'|'absent'|'unverified';delayMinutes:number;validatedAt:string;validatedBy:string;note:string;validationMode:string;manual:boolean }
export function emptyArchive():PresenceArchive {return {format:'RM_ARCHIVE',schema:1,shifts:[],events:[],publications:[],receipts:[]};}
export function canonical(value:any):string {
  if(value===null||typeof value!=='object')return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
}
export async function sha256(value:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');}
const assert=(ok:any,message:string)=>{if(!ok)throw new Error(message);};
const text=(v:any)=>typeof v==='string'&&v.length>0;
const date=(v:any)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const iso=(v:any)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(v)&&!isNaN(Date.parse(v));
const keyed=(source:string,id:string)=>JSON.stringify([source,id]);
export function rowIdentity(sourceId:string,r:{date:string;resource:string;timeSlot:string;matricola?:string;bookingCode?:string}){
  const norm=(v:string)=>v.trim().toLowerCase();
  // Mirrors the server's identity, including booking fallback for a missing matricola.
  const identity=r.matricola&&r.matricola!=='-'?norm(r.matricola):'booking:'+norm(r.bookingCode||'');
  return JSON.stringify([sourceId,r.date,norm(r.resource),r.timeSlot.replace(/\s*[–—-]\s*/g,' - ').trim(),identity]);
}
function validateItems(value:any){
  for(const name of ['shifts','events','publications'])assert(Array.isArray(value[name]),'Archivio incompleto: '+name);
  for(const s of value.shifts){
    assert(text(s.sourceId)&&text(s.id)&&text(s.snapshotId)&&text(s.publicationId)&&typeof s.weekStart==='string'&&date(s.date)&&text(s.resource)&&/^\d{2}:\d{2} - \d{2}:\d{2}$/.test(s.timeSlot)&&Array.isArray(s.students),'Turno non valido nell’archivio.');
    for(const st of s.students)assert(text(st.id)&&text(st.name)&&text(st.matricola)&&((st.matricola!=='-')||text(st.bookingCode)),'Identità studente incompleta nel turno.');
  }
  for(const e of value.events){const r=e.record;assert(text(e.sourceId)&&text(e.id)&&r&&r.id===e.id&&date(r.date)&&text(r.resource)&&typeof r.timeSlot==='string'&&/^\d{2}:\d{2} - \d{2}:\d{2}$/.test(r.timeSlot)&&text(r.studentName)&&text(r.matricola)&&(r.matricola!=='-'||text(r.bookingCode))&&['present','late','absent'].includes(r.status)&&Number.isFinite(r.delayMinutes)&&r.delayMinutes>=0&&iso(r.validatedAt),'Evento non valido: dati incompleti o data di registrazione non ISO.');}
  for(const p of value.publications)assert(text(p.sourceId)&&date(p.start)&&text(p.publicationId)&&Number.isInteger(p.version)&&p.version>0&&iso(p.updatedAt),'Pubblicazione non valida.');
}
function unique<T>(rows:T[],key:(r:T)=>string){const m=new Map<string,T>();for(const r of rows){const k=key(r);assert(!m.has(k)||canonical(m.get(k))===canonical(r),'Identificativo duplicato con contenuto diverso.');m.set(k,r);}return [...m.values()];}
export function validateArchive(input:any):PresenceArchive {
  assert(input?.format==='RM_ARCHIVE'&&input.schema===1,'Formato archivio non riconosciuto. Usare un Excel creato da Archivio presenze.');validateItems(input);assert(Array.isArray(input.receipts),'Ricevute di esportazione mancanti.');
  for(const r of input.receipts)assert(text(r.id)&&text(r.sourceId)&&iso(r.exportedAt)&&Array.isArray(r.eventIds)&&r.eventIds.every(text)&&Array.isArray(r.shiftIds)&&r.shiftIds.every(text),'Ricevuta non valida.');
  const a:PresenceArchive={format:'RM_ARCHIVE',schema:1,shifts:unique(input.shifts,(s:ArchiveShift)=>keyed(s.sourceId,s.snapshotId)),events:unique(input.events,(e:ArchiveEvent)=>keyed(e.sourceId,e.id)),publications:unique(input.publications,(p:ArchivePublication)=>keyed(p.sourceId,p.start)),receipts:unique(input.receipts,(r:ArchiveReceipt)=>r.id)};
  const ev=new Set(a.events.map(e=>keyed(e.sourceId,e.id))),sh=new Set(a.shifts.map(s=>keyed(s.sourceId,s.snapshotId)));
  for(const r of a.receipts){assert(r.eventIds.every(id=>ev.has(keyed(r.sourceId,id)))&&r.shiftIds.every(id=>sh.has(keyed(r.sourceId,id))),'Archivio incompleto: mancano dati dichiarati dalle ricevute.');}
  for(const p of a.publications)assert(a.receipts.some(r=>r.sourceId===p.sourceId),'Pubblicazione senza origine documentata.');
  return a;
}
export async function mergeExport(base:PresenceArchive,input:ArchiveExport){
  const valid=validateArchive(base);assert(input?.format==='RM_EXPORT'&&input.schema===1&&text(input.sourceId)&&iso(input.exportedAt),'Esportazione non valida.');validateItems(input);
  assert([...input.shifts,...input.events,...input.publications].every(v=>v.sourceId===input.sourceId),'Origine incoerente nell’esportazione.');
  const next=structuredClone(valid),stats={newEvents:0,duplicates:0,newShifts:0,corrections:0};
  const eventMap=new Map(next.events.map(e=>[keyed(e.sourceId,e.id),e]));const identities=new Set(next.events.map(e=>rowIdentity(e.sourceId,e.record as any)));
  for(const e of input.events){const k=keyed(e.sourceId,e.id),old=eventMap.get(k);if(old){assert(canonical(old)===canonical(e),'Conflitto sull’evento '+e.id+'. Nessun dato unito.');stats.duplicates++;}else{if(identities.has(rowIdentity(e.sourceId,e.record as any)))stats.corrections++;identities.add(rowIdentity(e.sourceId,e.record as any));next.events.push(e);eventMap.set(k,e);stats.newEvents++;}}
  const shiftMap=new Map(next.shifts.map(s=>[keyed(s.sourceId,s.snapshotId),s]));for(const s of input.shifts){const k=keyed(s.sourceId,s.snapshotId),old=shiftMap.get(k);if(old)assert(canonical(old)===canonical(s),'Conflitto sui prenotati di un turno.');else{next.shifts.push(s);shiftMap.set(k,s);stats.newShifts++;}}
  const pubs=new Map(next.publications.map(p=>[keyed(p.sourceId,p.start),p]));for(const p of input.publications){const k=keyed(p.sourceId,p.start),old=pubs.get(k);if(!old||p.version>old.version)pubs.set(k,p);else if(p.version===old.version)assert(canonical(p)===canonical(old),'Versioni settimanali in conflitto.');}
  next.publications=[...pubs.values()];
  const id=await sha256(canonical({sourceId:input.sourceId,shifts:input.shifts,events:input.events,publications:input.publications}));
  if(!next.receipts.some(r=>r.id===id))next.receipts.push({id,sourceId:input.sourceId,exportedAt:input.exportedAt,eventIds:[...new Set(input.events.map(e=>e.id))],shiftIds:[...new Set(input.shifts.map(s=>s.snapshotId))]});
  return {archive:validateArchive(next),stats};
}
export async function mergeArchive(base:PresenceArchive,other:PresenceArchive){
  const a=validateArchive(other);let current=validateArchive(base);let newEvents=0,duplicates=0,newShifts=0,corrections=0;
  for(const sourceId of new Set([...a.events,...a.shifts,...a.publications,...a.receipts].map(v=>v.sourceId))){
    const prior=current.receipts;const result=await mergeExport(current,{format:'RM_EXPORT',schema:1,sourceId,exportedAt:new Date().toISOString(),shifts:a.shifts.filter(s=>s.sourceId===sourceId),events:a.events.filter(e=>e.sourceId===sourceId),publications:a.publications.filter(p=>p.sourceId===sourceId)});current=result.archive;current.receipts=[...prior];
    for(const r of a.receipts.filter(r=>r.sourceId===sourceId)){const old=current.receipts.find(v=>v.id===r.id);if(old)assert(canonical({...old,exportedAt:''})===canonical({...r,exportedAt:''}),'Ricevute in conflitto.');else current.receipts.push(r);}
    newEvents+=result.stats.newEvents;duplicates+=result.stats.duplicates;newShifts+=result.stats.newShifts;corrections+=result.stats.corrections;
  }
  return {archive:validateArchive(current),stats:{newEvents,duplicates,newShifts,corrections}};
}
export function archiveRows(a:PresenceArchive):ArchiveRow[]{
  const rows=new Map<string,ArchiveRow>(),pubs=new Map(a.publications.map(p=>[keyed(p.sourceId,p.start),p.publicationId]));
  const shifts=a.shifts.filter(s=>!s.weekStart||pubs.get(keyed(s.sourceId,s.weekStart))===s.publicationId);
  const make=(sourceId:string,r:any):ArchiveRow=>({key:rowIdentity(sourceId,r),sourceId,date:r.date,resource:r.resource,area:r.area||r.weeklyArea||'',timeSlot:r.timeSlot,studentName:r.studentName,matricola:r.matricola,bookingCode:r.bookingCode||'',status:'unverified',delayMinutes:0,validatedAt:'',validatedBy:'',note:'',validationMode:'',manual:!!r.isManualIntegration});
  for(const s of shifts)for(const st of s.students){const row=make(s.sourceId,{...s,studentName:st.name,matricola:st.matricola,bookingCode:st.bookingCode});rows.set(row.key,row);}
  // Server policy: student self-check-in cannot supersede a tutor decision.
  for(const e of [...a.events].sort((x,y)=>x.record.validatedAt.localeCompare(y.record.validatedAt))){const r=e.record,key=rowIdentity(e.sourceId,r as any),old=rows.get(key);if(old?.validatedAt&&old.validationMode!=='STUDENTE_QR'&&r.validationMode==='STUDENTE_QR')continue;rows.set(key,{...(old||make(e.sourceId,r)),status:r.status,delayMinutes:r.delayMinutes,validatedAt:r.validatedAt,validatedBy:r.validatedBy||'',note:r.note||'',validationMode:r.validationMode||'',manual:!!r.isManualIntegration});}
  return [...rows.values()].sort((x,y)=>x.date.localeCompare(y.date)||x.resource.localeCompare(y.resource)||x.timeSlot.localeCompare(y.timeSlot)||x.studentName.localeCompare(y.studentName));
}
export const statusLabel=(s:ArchiveRow['status'])=>({present:'Presente',late:'Ritardatario',absent:'Assente',unverified:'Da verificare'})[s];
