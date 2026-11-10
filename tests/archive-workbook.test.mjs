import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {stripTypeScriptTypes} from 'node:module';
let xlsxUrl;try{xlsxUrl=import.meta.resolve('xlsx');}catch{}
const skip=!xlsxUrl?'xlsx is unavailable in this environment; npm ci is required':false;
const modelUrl='data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(fs.readFileSync(new URL('../src/archive/model.ts',import.meta.url),'utf8'))).toString('base64');
let w,m,XLSX;
if(xlsxUrl){m=await import(modelUrl);XLSX=await import(xlsxUrl);const code=fs.readFileSync(new URL('../src/archive/workbook.ts',import.meta.url),'utf8').replace("from 'xlsx'",'from '+JSON.stringify(xlsxUrl)).replace("from './model'",'from '+JSON.stringify(modelUrl));w=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(code)).toString('base64'));}
async function archive(){return (await m.mergeExport(m.emptyArchive(),{format:'RM_EXPORT',schema:1,sourceId:'TEST',exportedAt:'2026-11-10T10:00:00Z',publications:[],shifts:[],events:[{sourceId:'TEST',id:'e1',record:{id:'e1',date:'2026-11-09',resource:'TEST',timeSlot:'09:00 - 12:00',studentName:'TEST È 👩‍⚕️',matricola:'001',bookingCode:'B1',status:'present',delayMinutes:0,validationMode:'TUTOR_QR',validatedAt:'2026-11-09T10:00:00Z',note:'=1+1 '+('é👩'.repeat(8000))}}]})).archive;}
test('real XLSX round-trip preserves Unicode, chunking, IDs and events',{skip},async()=>{const a=await archive(),bytes=await w.archiveToBytes(a);assert.equal(bytes[0],80);assert.deepEqual(await w.archiveFromBytes(bytes),a);const wb=XLSX.read(bytes,{type:'array'});assert.equal(wb.Workbook.Sheets.find(s=>s.name==='_RM_Dati').Hidden,1);assert.ok(!wb.Sheets.Eventi.K2.f);});
test('damaged machine sheet is rejected instead of partially imported',{skip},async()=>{const wb=XLSX.read(await w.archiveToBytes(await archive()),{type:'array'});wb.Sheets._RM_Dati.B2.v+='tamper';const bad=XLSX.write(wb,{type:'array',bookType:'xlsx'});await assert.rejects(()=>w.archiveFromBytes(bad),/integrità/);});
test('arbitrary spreadsheets cannot be mistaken for archives',{skip},async()=>{const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([['Data','Studente'],['2026-11-09','TEST']]),'Presenze');await assert.rejects(()=>w.archiveFromBytes(XLSX.write(wb,{type:'array',bookType:'xlsx'})),/non è un archivio/);});
test('legacy v3.1 workbook is read and upgraded to schema 2 without changing its records',{skip},async()=>{
  const old=await archive();old.schema=1;delete old.bookings;delete old.periods;delete old.closures;
  const json=m.canonical(old),wb=XLSX.utils.book_new();
  // Match the v3.1 writer: XML cells must never contain half a surrogate pair.
  // Fixed 10,000-code-unit slices can corrupt the Unicode fixture before import.
  const chunks=[['RM_ARCHIVE',1,await m.sha256(json)]];let index=0;
  for(let offset=0;offset<json.length;){
    let end=Math.min(offset+28000,json.length);
    const last=json.charCodeAt(end-1);
    if(end<json.length&&last>=0xD800&&last<=0xDBFF)end--;
    chunks.push([index++,json.slice(offset,end)]);offset=end;
  }
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(chunks),'_RM_Dati');
  const upgraded=await w.archiveFromBytes(XLSX.write(wb,{type:'array',bookType:'xlsx'}));
  assert.deepEqual(upgraded,m.validateArchive(old));
  assert.equal(upgraded.events[0].record.studentName,old.events[0].record.studentName);
  assert.equal(upgraded.events[0].record.note,old.events[0].record.note);
});
