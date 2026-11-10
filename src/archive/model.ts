/** Portable archive: no browser storage and no network dependencies. */
export interface ArchiveStudent { id:string;name:string;matricola:string;bookingCode?:string }
export interface ArchiveShift { sourceId:string;id:string;snapshotId:string;weekStart:string;publicationId:string;resourceId:string;area:string;date:string;resource:string;timeSlot:string;students:ArchiveStudent[] }
export interface ArchiveEvent { sourceId:string;id:string;record:Record<string,any> }
export interface ArchivePublication { sourceId:string;start:string;publicationId:string;version:number;updatedAt:string }
export interface ArchiveReceipt { id:string;sourceId:string;exportedAt:string;eventIds:string[];shiftIds:string[];periodIds?:string[] }
export interface ArchivePeriod {sourceId:string;id:string;snapshotId:string;version:number;resourceId:string;resource:string;area:string;start:string;end:string;excluded:string[];students:ArchiveStudent[];updatedAt:string}
export interface ArchiveClosure {sourceId:string;unitId:string;exportId:string;digest:string;exportedAt:string;eventIds:string[];shiftIds:string[];periodIds:string[];publications:ArchivePublication[]}
export interface ArchiveBooking {id:string;observedAt:string;record:Record<string,any>}
export interface PresenceArchive { format:'RM_ARCHIVE';schema:2;shifts:ArchiveShift[];events:ArchiveEvent[];publications:ArchivePublication[];receipts:ArchiveReceipt[];periods?:ArchivePeriod[];closures?:ArchiveClosure[];bookings?:ArchiveBooking[] }
export interface ArchiveExport { format:'RM_EXPORT';schema:1;sourceId:string;exportedAt:string;shifts:ArchiveShift[];events:ArchiveEvent[];publications:ArchivePublication[];periods?:ArchivePeriod[];closures?:ArchiveClosure[] }
export interface ArchiveRow { key:string;sourceId:string;date:string;resource:string;area:string;timeSlot:string;studentName:string;matricola:string;bookingCode:string;status:'present'|'late'|'absent'|'unverified';delayMinutes:number;validatedAt:string;validatedBy:string;note:string;validationMode:string;manual:boolean;periodId?:string;resourceId?:string;bookingStatus?:'active'|'cancelled'|'missing' }
export function emptyArchive():PresenceArchive {return {format:'RM_ARCHIVE',schema:2,shifts:[],events:[],publications:[],receipts:[],periods:[],closures:[],bookings:[]};}
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
  for(const p of value.periods||[])assert(text(p.sourceId)&&text(p.id)&&text(p.snapshotId)&&Number.isInteger(p.version)&&date(p.start)&&date(p.end)&&p.end>=p.start&&Array.isArray(p.excluded)&&Array.isArray(p.students)&&text(p.resource),'Periodo SIZOS non valido.');
}
function unique<T>(rows:T[],key:(r:T)=>string){const m=new Map<string,T>();for(const r of rows){const k=key(r);assert(!m.has(k)||canonical(m.get(k))===canonical(r),'Identificativo duplicato con contenuto diverso.');m.set(k,r);}return [...m.values()];}
export function validateArchive(input:any):PresenceArchive {
  assert(input?.format==='RM_ARCHIVE'&&[1,2].includes(input.schema),'Formato archivio non riconosciuto. Usare un Excel creato da Archivio presenze.');validateItems(input);assert(Array.isArray(input.receipts),'Ricevute di esportazione mancanti.');
  for(const r of input.receipts)assert(text(r.id)&&text(r.sourceId)&&iso(r.exportedAt)&&Array.isArray(r.eventIds)&&r.eventIds.every(text)&&Array.isArray(r.shiftIds)&&r.shiftIds.every(text),'Ricevuta non valida.');
  const a:PresenceArchive={format:'RM_ARCHIVE',schema:2,shifts:unique(input.shifts,(s:ArchiveShift)=>keyed(s.sourceId,s.snapshotId)),events:unique(input.events,(e:ArchiveEvent)=>keyed(e.sourceId,e.id)),publications:unique(input.publications,(p:ArchivePublication)=>keyed(p.sourceId,p.start)),receipts:unique(input.receipts,(r:ArchiveReceipt)=>r.id),periods:unique(input.periods||[],(p:ArchivePeriod)=>keyed(p.sourceId,p.snapshotId)),closures:unique(input.closures||[],(c:ArchiveClosure)=>keyed(c.sourceId,c.exportId)),bookings:mergeBookingVersions(input.bookings||[])};
  const ev=new Set(a.events.map(e=>keyed(e.sourceId,e.id))),sh=new Set(a.shifts.map(s=>keyed(s.sourceId,s.snapshotId)));
  for(const r of a.receipts){assert(r.eventIds.every(id=>ev.has(keyed(r.sourceId,id)))&&r.shiftIds.every(id=>sh.has(keyed(r.sourceId,id))),'Archivio incompleto: mancano dati dichiarati dalle ricevute.');}
  const periodSet=new Set(a.periods!.map(p=>keyed(p.sourceId,p.snapshotId)));for(const r of a.receipts)assert((r.periodIds||[]).every(id=>periodSet.has(keyed(r.sourceId,id))),'Archivio incompleto: periodo dichiarato nella ricevuta mancante.');
  for(const p of a.publications)assert(a.receipts.some(r=>r.sourceId===p.sourceId),'Pubblicazione senza origine documentata.');
  for(const b of a.bookings!)assert(text(b.id)&&iso(b.observedAt)&&b.record&&date(b.record.dateStr)&&text(b.record.resourceId)&&text(b.record.bookingCode),'Prenotazione storica non valida.');
  for(const c of a.closures!)assert(text(c.unitId)&&text(c.exportId)&&/^[a-f0-9]{64}$/.test(c.digest)&&Array.isArray(c.eventIds)&&Array.isArray(c.shiftIds)&&Array.isArray(c.periodIds)&&Array.isArray(c.publications),'Ricevuta di chiusura non valida.');
  return a;
}
export async function mergeExport(base:PresenceArchive,input:ArchiveExport){
  const valid=validateArchive(base);assert(input?.format==='RM_EXPORT'&&input.schema===1&&text(input.sourceId)&&iso(input.exportedAt),'Esportazione non valida.');validateItems(input);
  assert([...input.shifts,...input.events,...input.publications,...(input.periods||[]),...(input.closures||[])].every(v=>v.sourceId===input.sourceId),'Origine incoerente nell’esportazione.');
  const next=structuredClone(valid),stats={newEvents:0,duplicates:0,newShifts:0,corrections:0};
  const eventMap=new Map(next.events.map(e=>[keyed(e.sourceId,e.id),e]));const identities=new Set(next.events.map(e=>rowIdentity(e.sourceId,e.record as any)));
  for(const e of input.events){const k=keyed(e.sourceId,e.id),old=eventMap.get(k);if(old){assert(canonical(old)===canonical(e),'Conflitto sull’evento '+e.id+'. Nessun dato unito.');stats.duplicates++;}else{if(identities.has(rowIdentity(e.sourceId,e.record as any)))stats.corrections++;identities.add(rowIdentity(e.sourceId,e.record as any));next.events.push(e);eventMap.set(k,e);stats.newEvents++;}}
  const shiftMap=new Map(next.shifts.map(s=>[keyed(s.sourceId,s.snapshotId),s]));for(const s of input.shifts){const k=keyed(s.sourceId,s.snapshotId),old=shiftMap.get(k);if(old)assert(canonical(old)===canonical(s),'Conflitto sui prenotati di un turno.');else{next.shifts.push(s);shiftMap.set(k,s);stats.newShifts++;}}
  const pubs=new Map(next.publications.map(p=>[keyed(p.sourceId,p.start),p]));for(const p of input.publications){const k=keyed(p.sourceId,p.start),old=pubs.get(k);if(!old||p.version>old.version)pubs.set(k,p);else if(p.version===old.version)assert(canonical(p)===canonical(old),'Versioni settimanali in conflitto.');}
  next.publications=[...pubs.values()];
  const previousPeriods=new Set((next.periods||[]).map(p=>keyed(p.sourceId,p.snapshotId)));
  stats.newShifts+=(input.periods||[]).filter(p=>!previousPeriods.has(keyed(p.sourceId,p.snapshotId))).length;
  next.periods=unique([...(next.periods||[]),...(input.periods||[])],p=>keyed(p.sourceId,p.snapshotId));
  next.closures=unique([...(next.closures||[]),...(input.closures||[])],c=>keyed(c.sourceId,c.exportId));
  const id=await sha256(canonical({sourceId:input.sourceId,shifts:input.shifts,events:input.events,publications:input.publications,...((input.periods?.length||input.closures?.length)?{periods:input.periods||[],closures:input.closures||[]}: {})}));
  if(!next.receipts.some(r=>r.id===id))next.receipts.push({id,sourceId:input.sourceId,exportedAt:input.exportedAt,eventIds:[...new Set(input.events.map(e=>e.id))],shiftIds:[...new Set(input.shifts.map(s=>s.snapshotId))],...((input.periods||[]).length?{periodIds:[...new Set(input.periods!.map(p=>p.snapshotId))]}:{})});
  return {archive:validateArchive(next),stats};
}
export async function mergeArchive(base:PresenceArchive,other:PresenceArchive){
  const a=validateArchive(other);let current=validateArchive(base);let newEvents=0,duplicates=0,newShifts=0,corrections=0;
  for(const sourceId of new Set([...a.events,...a.shifts,...a.publications,...a.receipts,...a.periods!].map(v=>v.sourceId))){
    const prior=current.receipts;const result=await mergeExport(current,{format:'RM_EXPORT',schema:1,sourceId,exportedAt:new Date().toISOString(),shifts:a.shifts.filter(s=>s.sourceId===sourceId),events:a.events.filter(e=>e.sourceId===sourceId),publications:a.publications.filter(p=>p.sourceId===sourceId),periods:a.periods!.filter(p=>p.sourceId===sourceId),closures:a.closures!.filter(c=>c.sourceId===sourceId)});current=result.archive;current.receipts=[...prior];
    for(const r of a.receipts.filter(r=>r.sourceId===sourceId)){const old=current.receipts.find(v=>v.id===r.id);if(old)assert(canonical({...old,exportedAt:''})===canonical({...r,exportedAt:''}),'Ricevute in conflitto.');else current.receipts.push(r);}
    newEvents+=result.stats.newEvents;duplicates+=result.stats.duplicates;newShifts+=result.stats.newShifts;corrections+=result.stats.corrections;
  }
  current.bookings=mergeBookingVersions([...(current.bookings||[]),...a.bookings!]);
  return {archive:validateArchive(current),stats:{newEvents,duplicates,newShifts,corrections}};
}
export function archiveRows(a:PresenceArchive):ArchiveRow[]{
  const rows=new Map<string,ArchiveRow>(),pubs=new Map(a.publications.map(p=>[keyed(p.sourceId,p.start),p.publicationId]));
  const shifts=a.shifts.filter(s=>!s.weekStart||pubs.get(keyed(s.sourceId,s.weekStart))===s.publicationId);
  const make=(sourceId:string,r:any):ArchiveRow=>({key:rowIdentity(sourceId,r),sourceId,date:r.date,resource:r.resource,area:r.area||r.weeklyArea||'',timeSlot:r.timeSlot,studentName:r.studentName,matricola:r.matricola,bookingCode:r.bookingCode||'',status:'unverified',delayMinutes:0,validatedAt:'',validatedBy:'',note:'',validationMode:'',manual:!!r.isManualIntegration,periodId:r.periodId,resourceId:r.resourceId});
  for(const s of shifts)for(const st of s.students){const row=make(s.sourceId,{...s,studentName:st.name,matricola:st.matricola,bookingCode:st.bookingCode});rows.set(row.key,row);}
  const periods=new Map<string,ArchivePeriod>();for(const p of a.periods||[]){const k=keyed(p.sourceId,p.id);if(!periods.has(k)||periods.get(k)!.version<p.version)periods.set(k,p);}
  for(const p of periods.values())for(let day=p.start;day<=p.end;day=addDate(day,1))if(!p.excluded.includes(day))for(const st of p.students){const row=make(p.sourceId,{date:day,resource:p.resource,resourceId:p.resourceId,area:p.area,timeSlot:'00:00 - 23:59',studentName:st.name,matricola:st.matricola,bookingCode:st.bookingCode});row.periodId=p.id;rows.set(row.key,row);}
  // Server policy: student self-check-in cannot supersede a tutor decision.
  for(const e of [...a.events].sort((x,y)=>x.record.validatedAt.localeCompare(y.record.validatedAt))){const r=e.record,key=rowIdentity(e.sourceId,r as any),old=rows.get(key);if(old?.validatedAt&&old.validationMode!=='STUDENTE_QR'&&r.validationMode==='STUDENTE_QR')continue;rows.set(key,{...(old||make(e.sourceId,r)),status:r.status,delayMinutes:r.delayMinutes,validatedAt:r.validatedAt,validatedBy:r.validatedBy||'',note:[r.note,r.tutorNotes?'Note tutor: '+r.tutorNotes:''].filter(Boolean).join(' · '),validationMode:r.validationMode||'',manual:!!r.isManualIntegration,periodId:r.periodId,resourceId:r.resourceId});}
  const bookings=latestBookings(a);
  for(const b of bookings){const slot=`${b.startTimeStr.slice(0,5)} - ${b.endTimeStr.slice(0,5)}`;if(![...rows.values()].some(r=>r.date===b.dateStr&&(r.resourceId?r.resourceId===b.resourceId:r.resource.toLowerCase()===b.resourceName.toLowerCase())&&r.timeSlot===slot&&(r.bookingCode===b.bookingCode||(r.matricola!=='-'&&r.matricola===b.matricola)))){if(['133367','133368','133369','133370'].includes(b.resourceId)&&[...periods.values()].some(p=>p.resourceId===b.resourceId&&p.start===b.dateStr))continue;const row=make('AFFLUENCES',{date:b.dateStr,resource:b.resourceName,resourceId:b.resourceId,area:b.categoryKey,timeSlot:slot,studentName:b.fullName,matricola:b.matricola||'-',bookingCode:b.bookingCode});rows.set(row.key,row);}}
  for(const r of rows.values()){const p=r.periodId?[...periods.values()].find(p=>p.id===r.periodId&&p.sourceId===r.sourceId):null;const b=bookings.find(b=>b.dateStr===(p?.start||r.date)&&(r.resourceId?r.resourceId===b.resourceId:b.resourceName.toLowerCase()===r.resource.toLowerCase())&&(b.bookingCode===r.bookingCode||(r.matricola!=='-'&&b.matricola===r.matricola))&&(p||`${b.startTimeStr.slice(0,5)} - ${b.endTimeStr.slice(0,5)}`===r.timeSlot));r.bookingStatus=b?(b.isCancelled?'cancelled':'active'):'missing';if(p&&(r.date<p.start||r.date>p.end||p.excluded.includes(r.date)))r.note=[r.note,'Giornata non più ammessa nella configurazione corrente del periodo'].filter(Boolean).join(' · ');}
  return [...rows.values()].sort((x,y)=>x.date.localeCompare(y.date)||x.resource.localeCompare(y.resource)||x.timeSlot.localeCompare(y.timeSlot)||x.studentName.localeCompare(y.studentName));
}
export const statusLabel=(s:ArchiveRow['status'])=>({present:'Presente',late:'Ritardatario',absent:'Assente',unverified:'In attesa di registrazione'})[s];
export function addDate(date:string,n:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function latestBookings(a:PresenceArchive){const map=new Map<string,ArchiveBooking>();for(const b of a.bookings||[]){const r=b.record,k=JSON.stringify([r.resourceId,r.dateStr,r.startTimeStr,r.bookingCode]),old=map.get(k);if(!old||old.observedAt<=b.observedAt)map.set(k,b);}return [...map.values()].map(b=>b.record);}
export async function retainBookings(a:PresenceArchive,records:Record<string,any>[]){const next=structuredClone(validateArchive(a)),map=new Map(next.bookings!.map(b=>[b.id,b]));for(const item of records){const record={...item};delete record.id;const id=await sha256(canonical(record));if(!map.has(id))map.set(id,{id,observedAt:new Date().toISOString(),record});}next.bookings=[...map.values()];return validateArchive(next);}
export function closurePayload(a:PresenceArchive,c:ArchiveClosure){const events=c.eventIds.map(id=>{const e=a.events.find(e=>e.sourceId===c.sourceId&&e.id===id);assert(e,'Evento archiviato mancante.');return e!;}),shifts=c.shiftIds.map(id=>{const s=a.shifts.find(s=>s.sourceId===c.sourceId&&s.snapshotId===id);assert(s,'Versione turno mancante.');return s!;}),periods=c.periodIds.map(id=>{const p=a.periods?.find(p=>p.sourceId===c.sourceId&&p.snapshotId===id);assert(p,'Periodo mancante.');return p!;});return {format:'RM_EXPORT',schema:1,sourceId:c.sourceId,events,shifts,publications:c.publications,periods};}
export async function verifyClosure(a:PresenceArchive,c:ArchiveClosure){const payload=closurePayload(a,c);assert(await sha256(canonical(payload))===c.digest,'L’archivio non coincide con l’esportazione chiusa.');return payload;}

function mergeBookingVersions(rows:ArchiveBooking[]){const map=new Map<string,ArchiveBooking>();for(const b of rows){const old=map.get(b.id);if(old){assert(canonical(old.record)===canonical(b.record),'Contenuti prenotazione in conflitto.');if(b.observedAt<old.observedAt)map.set(b.id,b);}else map.set(b.id,b);}return [...map.values()];}

export function plannedMinutes(row:ArchiveRow){if(row.periodId)return null;const times=row.timeSlot.match(/\d{2}:\d{2}/g);if(!times||times.length!==2)return null;const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));const start=minutes(times[0]),end=minutes(times[1]);return (end<=start?end+1440:end)-start;}
