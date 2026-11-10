import {rpc,getAdminPassword} from '../services/bridge';
import {getArchive,setArchive,markArchiveSaved,updateArchive} from './store';
import {mergeArchive,canonical} from './model';
import {archiveFromBytes,fromBase64} from './workbook';
export const driveSession={loaded:false,fileId:'',url:'',fileName:'',fileHash:'',error:''};
export async function digestBytes(bytes:Uint8Array){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource))].map(v=>v.toString(16).padStart(2,'0')).join('');}
export function updateDriveSession(next:Partial<typeof driveSession>){Object.assign(driveSession,next);window.dispatchEvent(new Event('rm-drive-state'));}
let busy:Promise<void>|null=null;
export function openLatestDrive(){if(busy)return busy;busy=(async()=>{try{const r=await rpc('archive.driveRead',{}, {password:getAdminPassword()});if(r.fileId){const bytes=fromBase64(r.base64),incoming=await archiveFromBytes(bytes),merged=await updateArchive(async a=>(await mergeArchive(a,incoming)).archive);if(canonical(merged)===canonical(incoming))markArchiveSaved(merged);updateDriveSession({loaded:true,fileId:r.fileId,url:r.url,fileName:r.fileName||'',fileHash:await digestBytes(bytes),error:''});}else updateDriveSession({loaded:true,fileId:'',url:'',fileName:'',fileHash:'',error:''});}catch(e:any){updateDriveSession({loaded:false,error:e.message});throw e;}finally{busy=null;}})();return busy;}
export function installArchiveAutoOpen(){const onAuth=()=>{if(!driveSession.loaded)void openLatestDrive().catch(()=>{});};window.addEventListener('rm-admin-verified',onAuth);if(getAdminPassword()&&!driveSession.loaded)void rpc('v4.admin',{}, {password:getAdminPassword()}).then(onAuth).catch(()=>{});return()=>window.removeEventListener('rm-admin-verified',onAuth);}
