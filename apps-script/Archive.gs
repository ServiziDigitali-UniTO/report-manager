/** Phase 1: read-only presence export; versioned Excel storage. No cleanup/delete RPC exists. */
function archiveDispatch_(request){
  admin_(request.auth||{});
  const data=request.data||{};
  switch(request.action){
    case 'archive.export':return withLock_(()=>({status:'success',snapshot:archiveSnapshot_()}));
    case 'archive.driveRead':return withLock_(()=>archiveDriveRead_());
    case 'archive.driveSave':return withLock_(()=>archiveDriveSave_(data));
    default:throw new Error('Operazione archivio non prevista. La cancellazione non è abilitata.');
  }
}
function archiveSnapshot_(){
  const sourceId=config_().SPREADSHEET_ID,ss=SpreadsheetApp.openById(sourceId),t=weeklyTables_(ss);
  const publications=weeklyRows_(t.weeks,9).map(r=>({sourceId,start:String(r[0]),publicationId:String(r[2]),version:Number(r[3]),updatedAt:String(r[4])}));
  const shifts=weeklyRows_(t.shifts,6).map(row=>{
    const s=JSON.parse(row[5]);return {sourceId,id:s.id,snapshotId:digest_('weekly|'+row[0]+'|'+s.id),weekStart:s.weekStart,publicationId:String(row[0]),resourceId:s.resourceId,area:s.area,date:s.date,resource:s.resource,timeSlot:s.timeSlot,students:s.students.map(st=>({id:st.id,name:st.name,matricola:st.matricola,bookingCode:st.bookingCode||''}))};
  });
  const legacy=ss.getSheetByName('RM_Turni');
  if(legacy)weeklyRows_(legacy,3).forEach(row=>{const p=JSON.parse(row[1]).payload;shifts.push({sourceId,id:String(row[0]),snapshotId:digest_('legacy|'+row[0]),weekStart:'',publicationId:'legacy',resourceId:'',area:'',date:p.date,resource:p.resource,timeSlot:p.timeSlot,students:p.students.map((st,i)=>({id:st.id||'st-'+i,name:st.name,matricola:st.matricola,bookingCode:st.bookingCode||''}))});});
  const events=weeklyRows_(t.events,18).filter(r=>r[17]).map(row=>{
    const r=JSON.parse(row[17]);
    // Explicit allowlist: never export PINs, bearer links, tutor/admin passwords or signing secrets.
    const record={};['id','date','resource','timeSlot','studentName','matricola','bookingCode','status','delayMinutes','validationMode','validatedAt','validatedBy','note','tutorNotes','isManualIntegration','securityHash','requestId','presenceKey','weeklyShiftId','weeklyStudentId','weeklyArea','resourceId'].forEach(k=>{if(r[k]!==undefined)record[k]=r[k];});
    return {sourceId,id:r.id,record};
  });
  return {format:'RM_EXPORT',schema:1,sourceId,exportedAt:new Date().toISOString(),shifts,events,publications};
}
function archiveFolder_(){
  const id=props_().getProperty('ARCHIVE_FOLDER_ID')||'';
  if(!/^[\w-]{10,150}$/.test(id))throw new Error('Configurare ARCHIVE_FOLDER_ID nelle Proprietà script con l’ID della cartella Drive dell’archivio.');
  return DriveApp.getFolderById(id);
}
function archivePointerKey_(folder){return 'RM_ARCHIVE_LATEST_'+folder.getId();}
function archiveLatest_(folder){
  const id=props_().getProperty(archivePointerKey_(folder))||'';if(!id)return null;
  const files=folder.getFiles();while(files.hasNext()){const f=files.next();if(f.getId()===id&&!f.isTrashed())return f;}
  throw new Error('L’ultima versione gestita non è più nella cartella. Ripristinarla prima di salvare: il programma non sceglie automaticamente un file più vecchio.');
}
function archiveDriveRead_(){
  const folder=archiveFolder_(),file=archiveLatest_(folder);
  if(!file)return {status:'success',fileId:'',url:'',base64:''};
  if(file.getSize()>6*1024*1024)throw new Error('Archivio oltre 6 MB: scaricarlo da Drive e caricarlo manualmente in Report Manager.');
  return {status:'success',fileId:file.getId(),url:file.getUrl(),base64:Utilities.base64Encode(file.getBlob().getBytes())};
}
function archiveDriveSave_(data){
  const folder=archiveFolder_(),latest=archiveLatest_(folder),expected=text_(data.expectedFileId,150,false);
  if(expected!==(latest?latest.getId():'')){const err=new Error('Un altro operatore ha salvato una versione più recente. Apri l’ultimo archivio Drive per unirlo ai tuoi dati prima di salvare.');err.code='CONFLICT';throw err;}
  if(typeof data.base64!=='string'||data.base64.length>8500000||!/^[A-Za-z0-9+/]+={0,2}$/.test(data.base64))throw new Error('File Excel non valido o troppo grande.');
  const bytes=Utilities.base64Decode(data.base64);
  if(bytes.length>6*1024*1024||bytes.length<4||(bytes[0]&255)!==80||(bytes[1]&255)!==75)throw new Error('File non riconosciuto come Excel .xlsx o oltre 6 MB.');
  const hash=archiveByteDigest_(bytes);if(!/^[a-f0-9]{64}$/.test(data.sha256)||hash!==data.sha256)throw new Error('Trasferimento incompleto: impronta del file non coincidente.');
  // Lost response / repeated save after refresh: reuse an identical saved version.
  if(latest&&archiveByteDigest_(latest.getBlob().getBytes())===hash)return {status:'success',fileId:latest.getId(),url:latest.getUrl(),duplicate:true};
  const stamp=new Date().toISOString().replace(/[:.]/g,'-'),name='Report_Manager_Archivio_'+stamp+'_'+Utilities.getUuid().slice(0,8)+'.xlsx';
  const file=folder.createFile(Utilities.newBlob(bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',name));
  if(archiveByteDigest_(file.getBlob().getBytes())!==hash)throw new Error('Verifica Drive non riuscita. La versione precedente resta quella attiva.');
  props_().setProperty(archivePointerKey_(folder),file.getId());
  return {status:'success',fileId:file.getId(),url:file.getUrl(),duplicate:false};
}
function archiveByteDigest_(bytes){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(b=>('0'+(b&255).toString(16)).slice(-2)).join('');}
