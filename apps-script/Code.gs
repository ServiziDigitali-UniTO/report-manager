/** Report Manager — receiver v2. No database: Sheets only.
 * Configure Script Properties before running initialize_():
 * SPREADSHEET_ID, APP_ORIGINS (comma-separated HTTPS origins), ADMIN_PASSWORD (>=20 chars).
 * No passwords or secrets belong in the GitHub repository.
 */
const EVENT_HEADERS_ = ['Data Turno','Reparto / Risorsa','Fascia Oraria','Cognome e Nome','Matricola','Codice Prenotazione','Esito Presenza','Minuti Ritardo','Metodo Validazione','Data e Ora Registrazione','Validato Da','PIN Utilizzato','Sigillo Sicurezza','Note','ID Evento','ID Presenza','ID Richiesta','Dati JSON'];
const SHIFT_HEADERS_ = ['ID Turno','Dati JSON','Creato il'];
function props_() { return PropertiesService.getScriptProperties(); }
function config_() {
  const p = props_().getProperties();
  if (!p.SPREADSHEET_ID || !p.APP_ORIGINS || !p.ADMIN_PASSWORD || p.ADMIN_PASSWORD.length < 20 || !p.TUTOR_PASSWORD || p.TUTOR_PASSWORD.length < 12 || !p.SIGNING_SECRET) throw new Error('Configurazione Apps Script incompleta. Eseguire initialize_.');
  return p;
}
function initialize_() {
  const p = props_();
  if (!p.getProperty('SIGNING_SECRET')) p.setProperty('SIGNING_SECRET', Utilities.getUuid() + Utilities.getUuid());
  const c = config_();
  withLock_(() => { const ss = SpreadsheetApp.openById(c.SPREADSHEET_ID); ss.setSpreadsheetTimeZone('Europe/Rome'); sheet_(ss,'Presenze_Tirocini',EVENT_HEADERS_); sheet_(ss,'RM_Turni',SHIFT_HEADERS_); });
}
function withLock_(fn) { const lock = LockService.getScriptLock(); lock.waitLock(25000); try { return fn(); } finally { SpreadsheetApp.flush(); lock.releaseLock(); } }
function sheet_(ss, name, headers) {
  let s = ss.getSheetByName(name);
  if (!s) s = ss.insertSheet(name);
  if (s.getMaxColumns() < headers.length) s.insertColumnsAfter(s.getMaxColumns(), headers.length-s.getMaxColumns());
  if (s.getLastRow() === 0) {
    s.getRange(1,1,1,headers.length).setValues([headers]).setBackground('#2C4437').setFontColor('#FFFFFF').setFontWeight('bold'); s.setFrozenRows(1);
  } else if (JSON.stringify(s.getRange(1,1,1,headers.length).getValues()[0]) !== JSON.stringify(headers)) {
    throw new Error('Intestazioni incompatibili in '+name+'. Conservare la vecchia scheda rinominandola prima di inizializzare la versione 2.');
  }
  return s;
}
function appendRows_(sheet,rows) {
  const start=sheet.getLastRow()+1;
  if(sheet.getMaxRows && start+rows.length-1>sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(),start+rows.length-1-sheet.getMaxRows());
  sheet.getRange(start,1,rows.length,rows[0].length).setNumberFormat('@').setValues(rows);
}
function text_(v, max, required) { if (typeof v !== 'string') { if (v == null && !required) return ''; throw new Error('Campo testuale non valido.'); } const s=v.trim(); if ((required && !s) || s.length>max) throw new Error('Campo mancante o troppo lungo.'); return s; }
function safeCell_(v) { return typeof v==='string' && /^[\s]*[=+@-]/.test(v) ? "'"+v : v; }
function digest_(v) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, v, Utilities.Charset.UTF_8).map(b => ('0'+((b+256)%256).toString(16)).slice(-2)).join(''); }
function sign_(v) { return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(v,config_().SIGNING_SECRET)).replace(/=+$/,''); }
function equal_(a,b) { a=String(a||''); b=String(b||''); let diff=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++) diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return diff===0; }
function admin_(a) { if(!a || !equal_(a.password,config_().ADMIN_PASSWORD)) throw new Error('Credenziale della segreteria non valida.'); }
function authorizedOrigin_(origin) { return config_().APP_ORIGINS.split(',').map(s=>s.trim()).includes(origin); }
function doGet(e) {
  try {
    const origin = text_(e && e.parameter && e.parameter.origin,200,true);
    const channel = text_(e.parameter.channel,100,true);
    if (!authorizedOrigin_(origin) || !/^[a-f0-9]{64}$/.test(channel)) throw new Error('Origine non autorizzata.');
    const t = HtmlService.createTemplateFromFile('Bridge');
    t.bridgeConfig = JSON.stringify({origin,channel}).replace(/</g,'\\u003c');
    return t.evaluate().setTitle('Collegamento Report Manager').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (_) { return ContentService.createTextOutput(JSON.stringify({status:'error',message:'Collegamento non configurato o origine non autorizzata.'})).setMimeType(ContentService.MimeType.JSON); }
}
function doPost() { return ContentService.createTextOutput(JSON.stringify({status:'error',message:'Usare il collegamento Report Manager v2.'})).setMimeType(ContentService.MimeType.JSON); }
/** Sole public RPC; every privileged operation checks credentials server-side. */
function dispatch(request) {
  try {
    if (!request || JSON.stringify(request).length > 350000) throw new Error('Richiesta non valida o troppo grande.');
    const origin = text_(request.origin,200,true);
    if (!authorizedOrigin_(origin)) throw new Error('Origine non autorizzata.');
    const a=request.auth || {}, data=request.data || {};
    return withLock_(() => {
      const ss=SpreadsheetApp.openById(config_().SPREADSHEET_ID);
      const shifts=sheet_(ss,'RM_Turni',SHIFT_HEADERS_), events=sheet_(ss,'Presenze_Tirocini',EVENT_HEADERS_);
      switch(request.action) {
        case 'health': admin_(a); return {status:'success',message:'Accesso al Foglio e struttura delle schede verificati.',version:2};
        case 'registerShift': admin_(a); return {status:'success',...registerShift_(shifts,data)};
        case 'getShift': return {status:'success',...getShift_(shifts,a)};
        case 'submit': return {status:'success',...submit_(shifts,events,a,data)};
        case 'list': admin_(a); return {status:'success',records:current_(events)};
        default: throw new Error('Operazione non prevista.');
      }
    });
  } catch (err) { return {status:'error',message:err.message || 'Operazione non completata.'}; }
}
function validDate_(date) { return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date+'T12:00:00Z').getTime()) && new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date; }
function slot_(value) { const s=text_(value,40,true).replace(/\s*[–—-]\s*/g,' - '); if(!/^([01]\d|2[0-3]):[0-5]\d - ([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new Error('La fascia deve avere formato HH:mm - HH:mm.'); return s; }
function normalizeShift_(p) {
  const date=text_(p.date,10,true); if(!validDate_(date)) throw new Error('Data del turno non valida.');
  if(!Array.isArray(p.students) || p.students.length<1 || p.students.length>150) throw new Error('Un turno deve contenere da 1 a 150 studenti.');
  const identities=new Set();
  return {date,resource:text_(p.resource,250,true),timeSlot:slot_(p.timeSlot),recipientEmail:text_(p.recipientEmail,200,false),academicYear:text_(p.academicYear,30,false),students:p.students.map((s,i)=>{
    const matricola=text_(s.matricola,50,true); if(matricola==='-') throw new Error('Completare le matricole prima di creare i QR.');
    if(identities.has(matricola.toLowerCase())) throw new Error('Matricola ripetuta nello stesso turno.'); identities.add(matricola.toLowerCase());
    return {id:'st-'+i,name:text_(s.name,150,true).toUpperCase(),matricola,bookingCode:text_(s.bookingCode,100,false),email:text_(s.email,200,false)};
  })};
}
function findShift_(sheet,id) { if(sheet.getLastRow()<2) return null; const rows=sheet.getRange(2,1,sheet.getLastRow()-1,2).getValues(); const row=rows.find(r=>r[0]===id); return row ? JSON.parse(row[1]) : null; }
function token_(id,role) { return sign_('shift|'+id+'|'+role); }
function registerShift_(sheet,p) {
  const payload=normalizeShift_(p);
  // Roster snapshot is immutable: a changed roster creates new tokens. Same presence key across snapshots.
  const id=digest_(JSON.stringify(payload)).slice(0,32);
  let stored=findShift_(sheet,id);
  if(!stored) {
    const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,Utilities.getUuid());
    const n=bytes.slice(0,3).reduce((v,b)=>v*256+((b+256)%256),0);
    stored={payload,pin:String(100000+n%900000),createdAt:new Date().toISOString()};
    if(JSON.stringify(stored).length>45000)throw new Error('Turno troppo grande. Suddividere il registro.');
    appendRows_(sheet,[[id,JSON.stringify(stored),stored.createdAt]]);
  }
  return {shiftId:id,pin:stored.pin,tutorToken:token_(id,'tutor'),studentToken:token_(id,'student'),payload:stored.payload};
}
function resolveShift_(sheet,a) {
  const id=text_(a.shiftId,32,true), t=text_(a.token,100,true);
  const role=equal_(t,token_(id,'tutor'))?'tutor':equal_(t,token_(id,'student'))?'student':'';
  const shift=role && findShift_(sheet,id); if(!shift) throw new Error('QR non valido. Richiedere il registro aggiornato.');
  return {...shift,role,shiftId:id};
}
function getShift_(sheet,a) {
  const s=resolveShift_(sheet,a);
  if(s.role==='tutor' && a.tutorPassword && !equal_(a.tutorPassword,config_().TUTOR_PASSWORD)) throw new Error('Codice riservato tutor non valido.');
  // Do not disclose the PIN or the tutor token to the student role.
  return {payload:{...s.payload,shiftId:s.shiftId,token:a.token,role:s.role,...(s.role==='tutor' && equal_(a.tutorPassword,config_().TUTOR_PASSWORD)?{serverPin:s.pin}:{})}};
}
function presenceKey_(r) { return digest_(JSON.stringify([r.date,r.resource.toLowerCase(),r.timeSlot,r.matricola.toLowerCase()])); }
function current_(sheet) {
  if(sheet.getLastRow()<2) return [];
  const rows=sheet.getRange(2,18,sheet.getLastRow()-1,1).getValues(), map=new Map();
  rows.forEach(row=>{if(!row[0]) return; const r=JSON.parse(row[0]); map.set(r.presenceKey,r);});
  return Array.from(map.values());
}
function studentWindow_(p) {
  const now=new Date(), date=Utilities.formatDate(now,'Europe/Rome','yyyy-MM-dd');
  const minute=Number(Utilities.formatDate(now,'Europe/Rome','HH'))*60+Number(Utilities.formatDate(now,'Europe/Rome','mm'));
  const times=p.timeSlot.match(/\d{2}:\d{2}/g).map(t=>Number(t.slice(0,2))*60+Number(t.slice(3)));
  const prev=new Date(now.getTime()-86400000), prevDate=Utilities.formatDate(prev,'Europe/Rome','yyyy-MM-dd');
  const end=times[1]<=times[0]?times[1]+1440:times[1];
  const position=date===p.date?minute:(prevDate===p.date?minute+1440:-99999);
  if(position<times[0]-30 || position>end+60) throw new Error('Auto-convalida consentita da 30 minuti prima a 60 minuti dopo il turno. Rivolgersi al tutor.');
}
function normalizeRecord_(r) {
  const date=text_(r.date,10,true); if(!validDate_(date)) throw new Error('Data non valida.');
  const status=text_(r.status,10,true); if(!['present','late','absent'].includes(status)) throw new Error('Esito non valido.');
  const delay=Number(r.delayMinutes); if(!Number.isInteger(delay)||delay<0||delay>1440||(status!=='late' && delay!==0)||(status==='late'&&delay<1)) throw new Error('Minuti di ritardo non coerenti.');
  const matricola=text_(r.matricola,50,true); if(matricola==='-') throw new Error('Matricola obbligatoria.');
  return {date,resource:text_(r.resource,250,true),timeSlot:slot_(r.timeSlot),studentName:text_(r.studentName,150,true).toUpperCase(),matricola,bookingCode:text_(r.bookingCode,100,false),email:text_(r.email,200,false),status,delayMinutes:delay,note:text_(r.note,2000,false),isManualIntegration:!!r.isManualIntegration};
}
function submit_(shifts,events,a,data) {
  const requestId=text_(data.requestId,80,true); if(!/^[a-zA-Z0-9_-]{10,80}$/.test(requestId)) throw new Error('Identificativo richiesta non valido.');
  if(!Array.isArray(data.records)||data.records.length<1||data.records.length>150) throw new Error('Numero presenze non valido.');
  const isAdmin=!!a.password; let shift=null;
  if(isAdmin) admin_(a); else shift=resolveShift_(shifts,a);
  if(shift && shift.role==='tutor' && !equal_(a.tutorPassword,config_().TUTOR_PASSWORD)) throw new Error('Codice riservato tutor non valido.');
  if(shift && shift.role==='student') {
    if(!equal_(a.pin,shift.pin)) { pinAttempt_(shift.shiftId,false); throw new Error('PIN non valido.'); }
    pinAttempt_(shift.shiftId,true); studentWindow_(shift.payload);
    if(data.records.length!==1) throw new Error('Inviare una sola presenza studente.');
  }
  const summary=data.summary || {};
  const tutorNotes=text_(summary.tutorNotes,2000,false);
  const validatedBy=isAdmin?'Segreteria — rettifica manuale':shift.role==='tutor'?text_(summary.tutorName,150,true):'Auto-convalida studente';
  const inputKeys=new Set();
  const prepared=data.records.map(rec=>{
    const r=normalizeRecord_(rec);
    if(shift) {
      const p=shift.payload;
      if(r.date!==p.date || r.resource!==p.resource || r.timeSlot!==p.timeSlot) throw new Error('La presenza non corrisponde al turno del QR.');
      const roster=p.students.find(s=>s.matricola.toLowerCase()===r.matricola.toLowerCase());
      if(shift.role==='student' && (!roster || r.status!=='present' || r.isManualIntegration)) throw new Error('Auto-convalida riservata agli iscritti. Per integrazioni rivolgersi al tutor.');
      if(roster) {r.studentName=roster.name;r.matricola=roster.matricola;r.bookingCode=roster.bookingCode;r.email=roster.email;r.isManualIntegration=false;}
      else r.isManualIntegration=true;
    }
    r.validationMode=isAdmin?'MANUALE':shift.role==='tutor'?'TUTOR_QR':'STUDENTE_QR';
    r.validatedBy=validatedBy;r.tutorNotes=tutorNotes;r.presenceKey=presenceKey_(r);
    if(inputKeys.has(r.presenceKey)) throw new Error('Presenza ripetuta nella richiesta.'); inputKeys.add(r.presenceKey);
    r.fingerprint=digest_(JSON.stringify(r));
    return r;
  });
  const current=current_(events), byKey=new Map(current.map(r=>[r.presenceKey,r]));
  // Retry after a lost response: return precisely the previously committed batch.
  const previous=events.getLastRow()>1?events.getRange(2,17,events.getLastRow()-1,2).getValues().filter(r=>r[0]===requestId).map(r=>JSON.parse(r[1])):[];
  if(previous.length) {
    const fingerprint=digest_(JSON.stringify(prepared.map(r=>r.fingerprint)));
    if(previous.some(r=>r.batchFingerprint!==fingerprint)) throw new Error('ID richiesta già usato con dati differenti.');
    const replay=prepared.map(r=>previous.find(p=>p.presenceKey===r.presenceKey)||byKey.get(r.presenceKey));
    if(replay.some((r,i)=>!r || r.fingerprint!==prepared[i].fingerprint)) throw new Error('Stato aggiornato dopo la richiesta: consultare il report centrale.');
    return {confirmed:true,records:replay,count:replay.length,duplicate:true};
  }
  const batchFingerprint=digest_(JSON.stringify(prepared.map(r=>r.fingerprint))), stamp=new Date().toISOString();
  const toWrite=[], confirmed=[];
  prepared.forEach(r=>{
    const old=byKey.get(r.presenceKey);
    if(shift && shift.role==='student' && old && old.validationMode!=='STUDENTE_QR') {
      if(old.status==='absent') throw new Error('Presenza già verificata come assente dal tutor. Richiedere una rettifica.');
      confirmed.push(old);return;
    }
    if(old && old.fingerprint===r.fingerprint){confirmed.push(old);return;}
    const record={...r,id:digest_(requestId+'|'+r.presenceKey).slice(0,32),requestId,batchFingerprint,validatedAt:stamp,securityHash:'RM2-'+sign_(JSON.stringify({...r,validatedAt:stamp,requestId})),syncState:'confirmed'};
    toWrite.push(record);confirmed.push(record);
  });
  if(toWrite.length) {
    const rows=toWrite.map(r=>[r.date,r.resource,r.timeSlot,r.studentName,r.matricola,r.bookingCode,({present:'PRESENTE',late:'RITARDO',absent:'ASSENTE'})[r.status],r.delayMinutes,r.validationMode,r.validatedAt,r.validatedBy,'NON CONSERVATO',r.securityHash,[r.note,r.tutorNotes?'Note tutor: '+r.tutorNotes:''].filter(Boolean).join('\n'),r.id,r.presenceKey,requestId,JSON.stringify(r)].map(safeCell_));
    appendRows_(events,rows);
  }
  return {confirmed:true,records:confirmed,count:confirmed.length,inserted:toWrite.length};
}
function pinAttempt_(id,success) {
  const cache=CacheService.getScriptCache(),key='pin-'+id;
  const n=Number(cache.get(key)||0); if(n>=20) throw new Error('Troppi tentativi PIN per questo turno. Attendere 10 minuti o rivolgersi al tutor.');
  if(!success) cache.put(key,String(n+1),600);
}
