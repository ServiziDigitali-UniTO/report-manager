import type { ValidationShiftPayload } from '../types';
import {rpc,getAdminPassword,appUrl} from './bridge';
export interface RegisteredShift {shiftId:string;pin:string;tutorToken:string;studentToken:string;payload:ValidationShiftPayload}
const registered=new Map<string,Promise<RegisteredShift>>();
window.addEventListener('rm-config-changed',()=>registered.clear());
export function registerShift(payload:ValidationShiftPayload):Promise<RegisteredShift>{
  const password=getAdminPassword();
  if(!password)return Promise.reject(new Error('Abilitare i QR nelle impostazioni Foglio con la credenziale della segreteria.'));
  const key=JSON.stringify(payload);
  if(!registered.has(key))registered.set(key,rpc('registerShift',payload,{password:getAdminPassword()}).catch(e=>{registered.delete(key);throw e;}));
  return registered.get(key)!;
}
export function shiftLink(s:RegisteredShift,role:'tutor'|'student'){
  const url=new URL(appUrl());url.hash=(role==='tutor'?'appello':'valida-studente')+'?'+new URLSearchParams({shift:s.shiftId,token:role==='tutor'?s.tutorToken:s.studentToken}).toString();return url.href;
}
export async function resolveShift(shiftId:string,token:string){return (await rpc('getShift',{}, {shiftId,token})).payload as ValidationShiftPayload;}
