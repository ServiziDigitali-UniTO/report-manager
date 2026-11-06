/** Weekly registers v3. New sheets are additive; v2 snapshots/events stay readable. */
const RM3_AREAS_ = {
  ospedale:'Ospedale Veterinario Universitario',azienda_zootecnica:'Azienda Zootecnica',skill_lab:'Skill Lab',buiatri:'Buiatri',izs:'IZS'
};
const RM3_RESOURCES_ = {
  '131031':{name:'Tirocinio Piccoli Animali',area:'ospedale'},
  '131123':{name:'Tirocinio Grandi Animali',area:'ospedale'},
  '131134':{name:'Tirocinio C.A.N.C.',area:'ospedale'},
  '131135':{name:'Tirocinio Azienda Zootecnica (lun-ven)',area:'azienda_zootecnica'},
  '131136':{name:'Tirocinio Azienda Zootecnica (sab-dom)',area:'azienda_zootecnica'},
  '131124':{name:'Skill Lab 1 (Aula Ghisleni)',area:'skill_lab'},
  '131125':{name:'Skill Lab 2 (Palazzina blu)',area:'skill_lab'},
  '131128':{name:'Training VirtualVet',area:'skill_lab'},
  '131838':{name:'OSCE VIRTUALVET',area:'skill_lab'},
  '131129':{name:'Turno A - dott. Geninatti',area:'buiatri'},
  '131130':{name:'Turno B - dott. Casalone',area:'buiatri'},
  '131131':{name:'Turno C - dott. Ruta',area:'buiatri'},
  '131132':{name:'Mungitura - dott. Casalone',area:'buiatri'},
  '131133':{name:'Tirocinio IZS',area:'izs'},
  '131126':{name:'TAVET Skill Lab 2 (Palazzina Blu)',area:'skill_lab',archived:true}
};
const RM3_WEEK_HEADERS_=['Settimana ID','Data fine','ID pubblicazione attiva','Versione','Aggiornato il','Fonte CSV','Impronta','Numero turni','Numero prenotazioni'];
const RM3_SHIFT_HEADERS_=['ID pubblicazione','ID turno','Settimana ID','ID risorsa','Area','Dati JSON'];
const RM3_ACCESS_HEADERS_=['ID accesso','Descrizione','Area','Risorse JSON','Impronta segreto','Scadenza','Attivo','Creato il'];
function weeklyError_(message,code){const e=new Error(message);e.code=code||'VALIDATION';throw e;}
function weeklyInit_(ss){sheet_(ss,'RM_Settimane',RM3_WEEK_HEADERS_);sheet_(ss,'RM_Turni_Settimanali',RM3_SHIFT_HEADERS_);sheet_(ss,'RM_Accessi',RM3_ACCESS_HEADERS_);}
function weeklyTables_(ss){
  const t={weeks:ss.getSheetByName('RM_Settimane'),shifts:ss.getSheetByName('RM_Turni_Settimanali'),access:ss.getSheetByName('RM_Accessi'),events:ss.getSheetByName('Presenze_Tirocini')};
  if(Object.values(t).some(s=>!s))weeklyError_('Aggiornare Apps Script alla versione 3 ed eseguire l’inizializzazione.','SETUP');return t;
}
function weeklyRows_(s,n){return s.getLastRow()>1?s.getRange(2,1,s.getLastRow()-1,n).getValues():[];}
function weeklyToday_(){return Utilities.formatDate(new Date(),'Europe/Rome','yyyy-MM-dd');}
function weeklyStart_(date){if(!validDate_(date))weeklyError_('Data settimana non valida.');const d=new Date(date+'T12:00:00Z'),day=d.getUTCDay();d.setUTCDate(d.getUTCDate()-(day===6?0:day+1));return d.toISOString().slice(0,10);}
function weeklyEnd_(start){const d=new Date(start+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+6);return d.toISOString().slice(0,10);}
function weeklyMeta_(t,start){const rows=weeklyRows_(t.weeks,9),i=rows.findIndex(r=>r[0]===start);return i<0?null:{row:i+2,start:rows[i][0],end:rows[i][1],publicationId:rows[i][2],version:Number(rows[i][3]),updatedAt:rows[i][4],source:rows[i][5],fingerprint:rows[i][6],turns:Number(rows[i][7]),bookings:Number(rows[i][8])};}
function weeklyResources_(){
  const map=JSON.parse(JSON.stringify(RM3_RESOURCES_));
  const raw=props_().getProperty('RESOURCE_OVERRIDES');
  if(raw){const overrides=JSON.parse(raw);Object.keys(overrides).forEach(id=>{const v=overrides[id];if(!/^\d+$/.test(id)||!RM3_AREAS_[v.area])weeklyError_('RESOURCE_OVERRIDES non valido.','SETUP');map[id]={name:text_(v.name,250,true),area:v.area,archived:!!v.archived};});}
  return map;
}
function weeklyAppUrl_(){const value=props_().getProperty('APP_URL')||'';if(!/^https:\/\/[^/?#]+\/[^?#]*\/$/.test(value))weeklyError_('Configurare APP_URL nelle Proprietà script con l’indirizzo HTTPS dell’app e la barra finale.','SETUP');const origin=value.match(/^https:\/\/[^/]+/)[0];if(!authorizedOrigin_(origin))weeklyError_('L’origine di APP_URL deve essere presente in APP_ORIGINS.','SETUP');return value;}
function weeklyNativeUrl_(view,params){const base=ScriptApp.getService().getUrl();if(!base)return '';return base+'?view='+view+'&'+Object.keys(params).map(k=>encodeURIComponent(k)+'='+encodeURIComponent(params[k])).join('&');}
function weeklyStudentLinks_(shiftId){const token=sign_('weekly-student|'+shiftId);return {studentUrl:weeklyAppUrl_()+'#presenza?'+['shift='+shiftId,'token='+encodeURIComponent(token)].join('&'),directStudentUrl:weeklyNativeUrl_('student',{shift:shiftId,token})};}
function weeklyRevision_(){return props_().getProperty('RM_DATA_REVISION')||'0';}
function weeklyBump_(){props_().setProperty('RM_DATA_REVISION',Utilities.getUuid());}
function weeklyDispatch_(request){
  const ss=SpreadsheetApp.openById(config_().SPREADSHEET_ID),t=weeklyTables_(ss),a=request.auth||{},d=request.data||{};
  switch(request.action){
    case 'weekly.admin':admin_(a);return {status:'success',areas:RM3_AREAS_,resources:weeklyResources_(),weeks:weeklyRows_(t.weeks,9).map(r=>({start:r[0],end:r[1],version:Number(r[3]),publicationId:r[2],updatedAt:r[4],turns:Number(r[7]),bookings:Number(r[8])})),accesses:weeklyRows_(t.access,8).map(r=>({id:r[0],label:r[1],area:r[2],resourceIds:JSON.parse(r[3]),expiresAt:r[5],enabled:String(r[6])==='true'}))};
    case 'weekly.preview':admin_(a);return {status:'success',...weeklyPreview_(t,d)};
    case 'weekly.publish':admin_(a);return withLock_(()=>({status:'success',...weeklyPublish_(t,d)}));
    case 'weekly.createAccess':admin_(a);return withLock_(()=>({status:'success',...weeklyCreateAccess_(t,d)}));
    case 'weekly.revokeAccess':admin_(a);return withLock_(()=>{const rows=weeklyRows_(t.access,8),i=rows.findIndex(r=>r[0]===d.id);if(i<0)weeklyError_('Accesso non trovato.');t.access.getRange(i+2,7,1,1).setValues([['false']]);return {status:'success'};});
    case 'weekly.board':return {status:'success',...weeklyBoard_(t,a,d)};
    case 'weekly.tutorSubmit':return withLock_(()=>({status:'success',...weeklyTutorSubmit_(t,a,d)}));
    case 'weekly.student':return {status:'success',...weeklyStudent_(t,a)};
    case 'weekly.studentSubmit':return withLock_(()=>({status:'success',...weeklyStudentSubmit_(t,a,d)}));
    default:weeklyError_('Operazione settimanale non prevista.');
  }
}
function weeklyNormalize_(d){
  const start=text_(d.weekStart,10,true);if(weeklyStart_(start)!==start)weeklyError_('La settimana deve iniziare di sabato.');
  if(!Array.isArray(d.shifts)||d.shifts.length>500)weeklyError_('Numero turni non valido (massimo 500 per pubblicazione).');
  const resourceMap=weeklyResources_(),keys=new Set();let bookings=0;
  const shifts=d.shifts.map(p=>{
    const resourceId=text_(p.resourceId,30,true),resource=resourceMap[resourceId];if(!resource||resource.archived)weeklyError_('Risorsa non configurata o archiviata: '+resourceId+'.');
    const date=text_(p.date,10,true);if(!validDate_(date)||weeklyStart_(date)!==start)weeklyError_('Turno fuori dalla settimana selezionata.');
    const timeSlot=slot_(p.timeSlot),id=digest_('weekly|'+resourceId+'|'+date+'|'+timeSlot).slice(0,32);if(keys.has(id))weeklyError_('Turno ripetuto nella pubblicazione.');keys.add(id);
    if(!Array.isArray(p.students)||!p.students.length||p.students.length>150)weeklyError_('Ogni turno deve avere da 1 a 150 prenotati.');
    const bookingKeys=new Set(),identities=new Set();
    const students=p.students.map(s=>{
      const bookingCode=text_(s.bookingCode,100,true),matricola=text_(s.matricola,50,false)||'-';
      const key=digest_(id+'|'+bookingCode).slice(0,32);if(bookingKeys.has(key))weeklyError_('Codice prenotazione ripetuto nello stesso turno.');bookingKeys.add(key);
      const identity=matricola==='-'?'booking:'+bookingCode:matricola.toLowerCase();if(identities.has(identity))weeklyError_('Studente ripetuto nello stesso turno: controllare le prenotazioni.');identities.add(identity);
      return {id:key,name:text_(s.name,150,true).toUpperCase(),matricola,bookingCode,email:text_(s.email,200,false)};
    }).sort((a,b)=>a.id.localeCompare(b.id));bookings+=students.length;
    const result={id,weekStart:start,resourceId,area:resource.area,resource:resource.name,date,timeSlot,students};if(JSON.stringify(result).length>45000)weeklyError_('Turno troppo grande per una cella Google.');return result;
  }).sort((a,b)=>a.id.localeCompare(b.id));
  return {start,end:weeklyEnd_(start),shifts,bookings,fingerprint:digest_(JSON.stringify(shifts))};
}
function weeklyPublished_(t,meta){if(!meta)return [];return weeklyRows_(t.shifts,6).filter(r=>r[0]===meta.publicationId).map(r=>JSON.parse(r[5]));}
function weeklyPreview_(t,d){
  const n=weeklyNormalize_(d),old=weeklyMeta_(t,n.start),oldShifts=weeklyPublished_(t,old);
  const oldKeys=new Set(oldShifts.flatMap(s=>s.students.map(st=>s.id+'|'+st.id))),newKeys=new Set(n.shifts.flatMap(s=>s.students.map(st=>s.id+'|'+st.id)));
  const active=current_(t.events);let removedValidated=0;
  oldShifts.forEach(s=>s.students.forEach(st=>{if(!newKeys.has(s.id+'|'+st.id)&&active.some(r=>r.presenceKey===presenceKey_({date:s.date,resource:s.resource,timeSlot:s.timeSlot,matricola:st.matricola,bookingCode:st.bookingCode})))removedValidated++;}));
  return {weekStart:n.start,weekEnd:n.end,turns:n.shifts.length,bookings:n.bookings,unchanged:old?.fingerprint===n.fingerprint,expectedPublicationId:old?.publicationId||null,added:[...newKeys].filter(k=>!oldKeys.has(k)).length,removed:[...oldKeys].filter(k=>!newKeys.has(k)).length,removedValidated,areas:Object.keys(RM3_AREAS_).map(id=>({id,label:RM3_AREAS_[id],turns:n.shifts.filter(s=>s.area===id).length,bookings:n.shifts.filter(s=>s.area===id).reduce((v,s)=>v+s.students.length,0)}))};
}
function weeklyPublish_(t,d){
  const n=weeklyNormalize_(d),old=weeklyMeta_(t,n.start);
  if(old?.fingerprint===n.fingerprint)return {publicationId:old.publicationId,version:old.version,reused:true};
  if((d.expectedPublicationId||null)!==(old?.publicationId||null))weeklyError_('La settimana è stata aggiornata da un altro operatore. Ricalcolare l’anteprima.','CONFLICT');
  if(!n.shifts.length&&!d.allowEmpty)weeklyError_('Confermare esplicitamente la pubblicazione di una settimana vuota.');
  const preview=weeklyPreview_(t,d);if(preview.removedValidated&&!d.confirmRemovedValidated)weeklyError_('Sono state rimosse prenotazioni con presenze registrate. Confermare dopo la verifica.','REVIEW');
  const publicationId=Utilities.getUuid(),stamp=new Date().toISOString();
  if(n.shifts.length)appendRows_(t.shifts,n.shifts.map(s=>[publicationId,s.id,n.start,s.resourceId,s.area,JSON.stringify(s)]));
  SpreadsheetApp.flush(); // Stage all snapshots before switching the visible publication pointer.
  const row=[n.start,n.end,publicationId,(old?.version||0)+1,stamp,text_(d.sourceName,200,false),n.fingerprint,n.shifts.length,n.bookings];
  if(old)t.weeks.getRange(old.row,1,1,9).setNumberFormat('@').setValues([row.map(safeCell_)]);else appendRows_(t.weeks,[row]);weeklyBump_();
  return {publicationId,version:row[3],reused:false};
}
function weeklyCreateAccess_(t,d){
  const area=text_(d.area,40,true);if(!RM3_AREAS_[area])weeklyError_('Area non valida.');
  const label=text_(d.label,150,true),map=weeklyResources_(),ids=Array.isArray(d.resourceIds)?d.resourceIds.map(String):[];
  if(ids.some(id=>!map[id]||map[id].area!==area||map[id].archived))weeklyError_('Le risorse devono appartenere all’area selezionata.');
  const days=Number(d.days);if(!Number.isInteger(days)||days<1||days>365)weeklyError_('La durata deve essere tra 1 e 365 giorni.');
  const id=Utilities.getUuid(),secret=(Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,''),access=id+'.'+secret;
  const stamp=new Date(),expiresAt=new Date(stamp.getTime()+days*86400000).toISOString();
  appendRows_(t.access,[[id,label,area,JSON.stringify(ids),digest_(secret),expiresAt,'true',stamp.toISOString()]]);
  return {id,label,expiresAt,url:weeklyAppUrl_()+'#area/'+area+'?access='+encodeURIComponent(access),directUrl:weeklyNativeUrl_('area',{area,access})};
}
function weeklyAccess_(t,a,area){
  const access=text_(a.access,150,true),parts=access.split('.');if(parts.length!==2)weeklyError_('Aprire il collegamento riservato fornito dalla segreteria.','ACCESS');
  const row=weeklyRows_(t.access,8).find(r=>r[0]===parts[0]);
  if(!row||!equal_(digest_(parts[1]),row[4])||String(row[6])!=='true'||row[5]<=new Date().toISOString()||(area&&row[2]!==area))weeklyError_('Collegamento scaduto, revocato o non autorizzato. Richiederne uno alla segreteria.','ACCESS');
  return {id:row[0],label:row[1],area:row[2],resourceIds:JSON.parse(row[3])};
}
function weeklyBoard_(t,a,d){
  const grant=weeklyAccess_(t,a,d.area),start=d.weekStart?text_(d.weekStart,10,true):weeklyStart_(weeklyToday_());
  if(weeklyStart_(start)!==start)weeklyError_('Settimana non valida.');
  const meta=weeklyMeta_(t,start),revision=(meta?.publicationId||'none')+'|'+weeklyRevision_(),today=weeklyToday_();
  if(d.since===revision)return {notModified:true,revision,serverDate:today,serverTime:new Date().toISOString()};
  const current=current_(t.events),byKey=new Map(current.map(r=>[r.presenceKey,r]));
  const events=weeklyRows_(t.events,18).map(r=>r[17]?JSON.parse(r[17]):null).filter(Boolean);
  const shifts=weeklyPublished_(t,meta).filter(s=>s.area===grant.area&&(!grant.resourceIds.length||grant.resourceIds.includes(s.resourceId))).map(s=>{
    const students=s.students.map(st=>{
      const key=presenceKey_({date:s.date,resource:s.resource,timeSlot:s.timeSlot,matricola:st.matricola,bookingCode:st.bookingCode}),state=byKey.get(key)||null;
      const discrepant=!!state&&state.validationMode!=='STUDENTE_QR'&&state.status!=='present'&&events.some(r=>r.presenceKey===key&&r.validationMode==='STUDENTE_QR'&&r.status==='present');
      return {...st,email:undefined,state:state?{id:state.id,status:state.status,delayMinutes:state.delayMinutes,note:state.note,validatedAt:state.validatedAt,validatedBy:state.validatedBy,validationMode:state.validationMode}:null,discrepant};
    });
    current.filter(r=>r.weeklyShiftId===s.id&&r.isManualIntegration&&!students.some(st=>st.id===r.weeklyStudentId)).forEach(r=>students.push({id:r.weeklyStudentId,name:r.studentName,matricola:r.matricola,bookingCode:r.bookingCode||'',email:undefined,state:{id:r.id,status:r.status,delayMinutes:r.delayMinutes,note:r.note,validatedAt:r.validatedAt,validatedBy:r.validatedBy,validationMode:r.validationMode},discrepant:false,manual:true}));
    return {...s,students,...weeklyStudentLinks_(s.id)};
  });
  const removedWithPresence=current.filter(r=>r.date>=start&&r.date<=weeklyEnd_(start)&&r.weeklyArea===grant.area&&(!grant.resourceIds.length||grant.resourceIds.includes(r.resourceId))&&!shifts.some(s=>s.id===r.weeklyShiftId&&s.students.some(st=>st.id===r.weeklyStudentId))).length;
  return {notModified:false,revision,serverDate:today,serverTime:new Date().toISOString(),area:grant.area,areaLabel:RM3_AREAS_[grant.area],accessLabel:grant.label,weekStart:start,weekEnd:weeklyEnd_(start),weeks:weeklyRows_(t.weeks,9).map(r=>({start:r[0],end:r[1]})).sort((x,y)=>x.start.localeCompare(y.start)),publication:meta?{version:meta.version,updatedAt:meta.updatedAt}:null,shifts,removedWithPresence};
}
function weeklyFindShift_(t,id){
  const candidates=weeklyRows_(t.shifts,6).filter(r=>r[1]===id);
  for(let i=candidates.length-1;i>=0;i--){const row=candidates[i],meta=weeklyMeta_(t,row[2]);if(meta&&meta.publicationId===row[0])return JSON.parse(row[5]);}
  weeklyError_('Turno non più pubblicato. Richiedere il registro aggiornato.','RETRACTED');
}
function weeklyStudentShift_(t,a){const id=text_(a.shiftId,32,true);if(!equal_(a.token,sign_('weekly-student|'+id)))weeklyError_('QR studente non valido.','ACCESS');return weeklyFindShift_(t,id);}
function weeklyStudent_(t,a){const s=weeklyStudentShift_(t,a);return {shift:{id:s.id,date:s.date,resource:s.resource,timeSlot:s.timeSlot,students:s.students.map(st=>({id:st.id,name:st.name,matricola:st.matricola}))},serverTime:new Date().toISOString(),...weeklyStudentLinks_(s.id)};}
function weeklyRecord_(shift,student,status,delay,note,mode,by){
  const r=normalizeRecord_({date:shift.date,resource:shift.resource,timeSlot:shift.timeSlot,studentName:student.name,matricola:student.matricola,bookingCode:student.bookingCode,email:'',status,delayMinutes:delay,note,isManualIntegration:!!student.manual},true);
  return {...r,resourceId:shift.resourceId,weeklyShiftId:shift.id,weeklyStudentId:student.id,weeklyArea:shift.area,validationMode:mode,validatedBy:by,tutorNotes:''};
}
function weeklyTutorSubmit_(t,a,d){
  const grant=weeklyAccess_(t,a),s=weeklyFindShift_(t,text_(d.shiftId,32,true));if(s.area!==grant.area||(grant.resourceIds.length&&!grant.resourceIds.includes(s.resourceId)))weeklyError_('Risorsa non autorizzata.','ACCESS');
  let st=s.students.find(st=>st.id===d.studentId);
  if(!st&&d.manual){const matricola=text_(d.manual.matricola,50,true);if(matricola==='-')weeklyError_('Matricola obbligatoria per un fuori elenco.');st={id:'manual-'+digest_(matricola.toLowerCase()).slice(0,24),name:text_(d.manual.name,150,true),matricola,bookingCode:'',manual:true};if(s.students.some(v=>v.matricola.toLowerCase()===matricola.toLowerCase()))weeklyError_('Studente già in elenco.');}
  if(!st&&String(d.studentId||'').startsWith('manual-')){const old=current_(t.events).find(r=>r.weeklyShiftId===s.id&&r.weeklyStudentId===d.studentId);if(old)st={id:old.weeklyStudentId,name:old.studentName,matricola:old.matricola,bookingCode:old.bookingCode,manual:true};}
  if(!st)weeklyError_('Studente non presente nel turno.');
  if(d.source==='paper'&&!String(d.note||'').trim())weeklyError_('Indicare il riferimento al registro cartaceo nelle note.');
  const r=weeklyRecord_(s,st,d.status,d.delayMinutes,d.note||'',d.source==='paper'?'CARTACEA':'TUTOR_QR',grant.label);
  return commitEvents_(t.events,[r],text_(d.requestId,80,true),{expected:{[presenceKey_(r)]:d.expectedEventId??null}});
}
function weeklyStudentSubmit_(t,a,d){
  const s=weeklyStudentShift_(t,a);try{studentWindow_(s);}catch(e){weeklyError_(e.message,'WINDOW');}
  const st=s.students.find(st=>st.id===d.studentId);if(!st)weeklyError_('Prenotazione non presente nell’elenco attuale.','ROSTER');
  const r=weeklyRecord_(s,st,'present',0,'Autoconvalida tramite QR senza PIN','STUDENTE_QR','Autoconvalida studente');
  return commitEvents_(t.events,[r],text_(d.requestId,80,true),{student:true});
}
function weeklyPortal_(e){
  const p=e.parameter||{},view=p.view;let hash;
  if(view==='area'){const area=text_(p.area,40,true);if(!RM3_AREAS_[area])weeklyError_('Area non valida.');hash='#area/'+area+'?'+(p.access?'access='+encodeURIComponent(text_(p.access,150,true)):'');if(p.week)hash+=(p.access?'&':'')+'week='+encodeURIComponent(p.week);}
  else if(view==='student')hash='#presenza?shift='+encodeURIComponent(text_(p.shift,32,true))+'&token='+encodeURIComponent(text_(p.token,100,true));else weeklyError_('Pagina non valida.');
  const appUrl=weeklyAppUrl_(),t=HtmlService.createTemplateFromFile('Portal');t.portalConfig=JSON.stringify({appUrl,webhookUrl:ScriptApp.getService().getUrl(),initialHash:hash}).replace(/</g,'\\u003c');
  return t.evaluate().setTitle('Report Manager — Registro settimanale');
}
