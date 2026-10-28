import type { ValidationRecord, GoogleSheetsWebhookConfig, ValidationShiftPayload } from '../types';
import {rpc,getAdminPassword,getPublicConfig} from './bridge';
export const VALIDATION_CACHE_STORAGE_KEY='rm2_presences';
const PENDING_KEY='rm2_pending';
export const GOOGLE_APPS_SCRIPT_TEMPLATE='I file aggiornati sono nella cartella apps-script del progetto: Code.gs, Bridge.html e appsscript.json. Seguire la guida PUBBLICAZIONE.md.';
export const DEFAULT_WEBHOOK_CONFIG:GoogleSheetsWebhookConfig={webhookUrl:'',isEnabled:true,syncCount:0,lastStatus:'idle'};
export function getGoogleSheetsWebhookConfig():GoogleSheetsWebhookConfig {
  try{return {...DEFAULT_WEBHOOK_CONFIG,...JSON.parse(localStorage.getItem('rm2_sync')||'{}'),webhookUrl:getPublicConfig().webhookUrl,isEnabled:true};}catch{return {...DEFAULT_WEBHOOK_CONFIG,webhookUrl:getPublicConfig().webhookUrl};}
}
export function saveGoogleSheetsWebhookConfig(config:GoogleSheetsWebhookConfig){ localStorage.setItem('rm2_sync',JSON.stringify({...config,webhookUrl:undefined})); }
export function getStoredValidationRecords():ValidationRecord[]{try{const r=JSON.parse(localStorage.getItem(VALIDATION_CACHE_STORAGE_KEY)||'[]');return Array.isArray(r)?r:[];}catch{return [];}}
export function presenceKey(r:Pick<ValidationRecord,'date'|'resource'|'timeSlot'|'matricola'|'studentName'>){return JSON.stringify([r.date,r.resource.trim().toLowerCase(),r.timeSlot.replace(/\s*[–—-]\s*/g,' - ').trim(),(r.matricola&&r.matricola!=='-'?r.matricola:r.studentName).trim().toLowerCase()]);}
export function saveValidationRecords(records:ValidationRecord[]){
  const map=new Map(getStoredValidationRecords().map(r=>[presenceKey(r),r]));records.forEach(r=>map.set(presenceKey(r),{...r,pinUsed:undefined}));
  localStorage.setItem(VALIDATION_CACHE_STORAGE_KEY,JSON.stringify([...map.values()]));window.dispatchEvent(new Event('rm-presences-changed'));
}
export function clearStoredValidationRecords(){localStorage.removeItem(VALIDATION_CACHE_STORAGE_KEY);localStorage.removeItem(PENDING_KEY);window.dispatchEvent(new Event('rm-presences-changed'));}
export async function refreshCentralRecords(){const r=await rpc('list',{}, {password:getAdminPassword()});localStorage.setItem(VALIDATION_CACHE_STORAGE_KEY,JSON.stringify(r.records));window.dispatchEvent(new Event('rm-presences-changed'));return r.records as ValidationRecord[];}
export async function testWebhookConnection(url:string){try{const r=await rpc('health',{}, {password:getAdminPassword()},url);return {success:true,message:r.message};}catch(e:any){return {success:false,message:e.message};}}
export async function sendAttendanceToGoogleSheets(records:ValidationRecord[],summary:any={},authorization?:ValidationShiftPayload&{pin?:string}):Promise<{success:boolean;count:number;error?:string;records?:ValidationRecord[]}> {
  if(!records.length)return {success:false,count:0,error:'Nessuna presenza da inviare.'};
  const config=getGoogleSheetsWebhookConfig();
  // Keep the same request ID after an ambiguous network failure, without persisting PINs/tokens.
  const draft=JSON.stringify({records:records.map(({id,validatedAt,pinUsed,securityHash,...r})=>r),summary});
  let pending:{draft:string;requestId:string}[]=[];try{pending=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');}catch{}
  const requestId=pending.find(r=>r.draft===draft)?.requestId||crypto.randomUUID();
  const auth=authorization?.shiftId&&authorization.token?{shiftId:authorization.shiftId,token:authorization.token,pin:authorization.pin}:{password:getAdminPassword()};
  try{
    localStorage.setItem(PENDING_KEY,JSON.stringify([...pending.filter(r=>r.draft!==draft),{draft,requestId}]));
    const result=await rpc('submit',{requestId,records,summary},auth);
    if(result.confirmed!==true||!Array.isArray(result.records)||result.count!==records.length)throw new Error('Risposta non valida: registrazione non confermata.');
    saveValidationRecords(result.records);
    const remaining=JSON.parse(localStorage.getItem(PENDING_KEY)||'[]');
    localStorage.setItem(PENDING_KEY,JSON.stringify(remaining.filter((r:{draft:string})=>r.draft!==draft)));
    saveGoogleSheetsWebhookConfig({...config,lastSyncAt:new Date().toLocaleString('it-IT'),lastStatus:'success',syncCount:(config.syncCount||0)+result.count,lastErrorMessage:undefined});
    return {success:true,count:result.count,records:result.records};
  }catch(e:any){
    // A quota error may occur after server commit: never say data was not registered.
    const message=e.message||'Conferma non ricevuta. Riprovare.';
    try{saveGoogleSheetsWebhookConfig({...config,lastStatus:'error',lastErrorMessage:message});}catch{}
    return {success:false,count:0,error:message+' Non chiudere la schermata prima di riprovare o consultare la segreteria.'};
  }
}
