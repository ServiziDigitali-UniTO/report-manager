import type {BookingRecord,AttendanceStatus} from '../types';
import {rpc,getAdminPassword,getPublicConfig,appUrl} from './bridge';
export const AREAS:Record<string,string>={ospedale:'Ospedale Veterinario Universitario',azienda_zootecnica:'Azienda Zootecnica',skill_lab:'Skill Lab',buiatri:'Buiatri',izs:'IZS'};
export interface WeeklyState {id:string;status:AttendanceStatus;delayMinutes:number;note:string;validatedAt:string;validatedBy:string;validationMode:string}
export interface WeeklyStudent {id:string;name:string;matricola:string;bookingCode?:string;state:WeeklyState|null;discrepant?:boolean;manual?:boolean}
export interface WeeklyShift {id:string;weekStart:string;resourceId:string;area:string;resource:string;date:string;timeSlot:string;students:WeeklyStudent[];concludedAt?:string;studentUrl:string;directStudentUrl:string}
export interface WeeklyBoard {unitState?:string;revision:string;serverDate:string;serverTime:string;area:string;areaLabel:string;accessLabel:string;weekStart:string;weekEnd:string;weeks:{start:string;end:string}[];publication:{version:number;updatedAt:string}|null;shifts:WeeklyShift[];removedWithPresence:number}
export interface WeeklyPreview {weekStart:string;weekEnd:string;turns:number;bookings:number;unchanged:boolean;expectedPublicationId:string|null;added:number;removed:number;removedValidated:number;areas:{id:string;label:string;turns:number;bookings:number}[]}
export interface ResourceDefinition {name:string;area:string;archived?:boolean}
export function weekStart(date:string){const d=new Date(date+'T12:00:00Z');const day=d.getUTCDay();d.setUTCDate(d.getUTCDate()-(day===6?0:day+1));return d.toISOString().slice(0,10);}
export function addDays(date:string,n:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function italianDate(date:string){return new Date(date+'T12:00:00Z').toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});}
export function todayRome(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function buildWeek(records:BookingRecord[],start:string){
  const selected=records.filter(r=>weekStart(r.dateStr)===start&&!['133367','133368','133369','133370'].includes(r.resourceId)),active=selected.filter(r=>!r.isCancelled),map=new Map<string,any>();
  let missingMatricola=0;
  active.forEach(r=>{
    const timeSlot=`${r.startTimeStr.slice(0,5)} - ${r.endTimeStr.slice(0,5)}`,key=JSON.stringify([r.resourceId,r.dateStr,timeSlot]);
    if(!map.has(key))map.set(key,{date:r.dateStr,resourceId:r.resourceId,timeSlot,students:[]});
    let matricola=r.matricola?.trim()||'-';if(matricola.length>50)matricola='-';if(matricola==='-')missingMatricola++;
    map.get(key).students.push({name:r.fullName,matricola,bookingCode:r.bookingCode,email:''});
  });
  return {weekStart:start,shifts:[...map.values()],cancelled:selected.length-active.length,missingMatricola};
}
export function adminRpc(action:string,data:any={}){return rpc('weekly.'+action,data,{password:getAdminPassword()});}
export function boardRpc(area:string,access:string,week:string|undefined,since?:string){return rpc('weekly.board',{area,weekStart:week,since},{access});}
export function directPortal(view:'area'|'student',params:Record<string,string>){const base=getPublicConfig().webhookUrl;if(!base)return '';const url=new URL(base);url.searchParams.set('view',view);Object.entries(params).forEach(([k,v])=>{if(v)url.searchParams.set(k,v);});return url.href;}
export function publicAreaUrl(area:string){return appUrl()+'#area/'+area;}
export function getAreaAccess(area:string,supplied?:string|null){
  if(supplied){try{localStorage.setItem('rm3_access_'+area,supplied);}catch{}return supplied;}
  try{return localStorage.getItem('rm3_access_'+area)||'';}catch{return '';}
}
export function clearAreaAccess(area:string){try{localStorage.removeItem('rm3_access_'+area);}catch{}}
/** A failed request keeps its ID in memory; nothing is queued for offline sync. */
export function retryableCommand(){let draft='',id='';return async(action:string,data:any,auth:any)=>{const next=JSON.stringify(data);if(next!==draft){draft=next;id=crypto.randomUUID();}return rpc('weekly.'+action,{...data,requestId:id},auth);};}
