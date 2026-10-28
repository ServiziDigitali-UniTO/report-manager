/** Portable HTTPS bridge. No hosting-provider API, no no-cors requests. */
export interface PublicConfig { webhookUrl: string; appUrl: string }
let publicConfig: PublicConfig = {webhookUrl:'',appUrl:''};
export async function loadPublicConfig() {
  const response=await fetch(new URL('report-manager.config.json',document.baseURI),{cache:'no-store'});
  if(!response.ok) throw new Error('Configurazione pubblica non disponibile.');
  const data=await response.json();
  publicConfig={webhookUrl:typeof data.webhookUrl==='string'?data.webhookUrl.trim():'',appUrl:typeof data.appUrl==='string'?data.appUrl.trim():''};
}
export function getPublicConfig() { return publicConfig; }
export function appUrl() { return publicConfig.appUrl || new URL('.',document.baseURI).href; }
export function getAdminPassword() { try{return sessionStorage.getItem('rm2_admin') || '';}catch{return '';} }
export function setAdminPassword(value:string) { if(value) sessionStorage.setItem('rm2_admin',value);else sessionStorage.removeItem('rm2_admin'); window.dispatchEvent(new Event('rm-config-changed')); }
function randomHex() { return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join(''); }
function validUrl(value:string) { const u=new URL(value); if(u.origin!=='https://script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(u.pathname)) throw new Error('Inserire l’URL pubblico /exec di Apps Script (https://script.google.com/macros/s/…/exec).'); return u; }
let active: {url:string;channel:string;frame:HTMLIFrameElement;source:MessageEventSource;origin:string}|null=null;
let connecting:Promise<void>|null=null;
const pending=new Map<string,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
function googleOrigin(origin:string) { try { const u=new URL(origin);return u.protocol==='https:'&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||/^[a-z0-9-]+-script\.googleusercontent\.com$/.test(u.hostname)); } catch { return false; } }
window.addEventListener('message',event=>{
  const m=event.data;
  if(!active || event.source!==active.source || event.origin!==active.origin || !m || m.protocol!=='RM2'||m.channel!==active.channel||m.type!=='response') return;
  const item=pending.get(m.id);if(!item)return;
  clearTimeout(item.timer);pending.delete(m.id);
  if(m.result?.status==='success') item.resolve(m.result); else item.reject(new Error(m.result?.message||'Registrazione non confermata.'));
});
async function connect(url:string) {
  if(active?.url===url) return;
  if(connecting) {await connecting;if(active?.url===url)return;}
  connecting=new Promise<void>((resolve,reject)=>{
    active?.frame.remove();active=null;
    const target=validUrl(url),channel=randomHex();
    target.searchParams.set('origin',location.origin);target.searchParams.set('channel',channel);
    const frame=document.createElement('iframe');frame.src=target.href;frame.title='Collegamento al registro presenze';frame.setAttribute('aria-hidden','true');frame.style.cssText='position:fixed;width:1px;height:1px;left:-100px;top:-100px;border:0;';frame.referrerPolicy='no-referrer';
    const timeout=setTimeout(()=>{cleanup();frame.remove();reject(new Error('Nessuna risposta da Apps Script. Controllare URL, distribuzione pubblica e APP_ORIGINS. Nessuna presenza confermata.'));},25000);
    function cleanup(){clearTimeout(timeout);window.removeEventListener('message',onReady);}
    function onReady(event:MessageEvent){
      const m=event.data;
      // Google nests HtmlService inside its own iframe. The unpredictable channel binds
      // the first ready message; all subsequent messages require that exact source+origin.
      if(!googleOrigin(event.origin)||!m||m.protocol!=='RM2'||m.channel!==channel||m.type!=='ready'||!event.source||event.source===window)return;
      active={url,channel,frame,source:event.source,origin:event.origin};cleanup();resolve();
    }
    window.addEventListener('message',onReady);document.body.appendChild(frame);
  });
  try{await connecting;}finally{connecting=null;}
}
let queue=Promise.resolve();
export function rpc(action:string,data:any={},auth:any={},overrideUrl?:string):Promise<any> {
  const run=async()=>{
    const url=overrideUrl||publicConfig.webhookUrl;
    if(!url) throw new Error('Collegamento non configurato. Compilare report-manager.config.json prima della pubblicazione.');
    await connect(url);const bridge=active!;
    return new Promise((resolve,reject)=>{
      const id=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);active?.frame.remove();active=null;reject(new Error('Conferma non ricevuta. La richiesta potrebbe essere stata registrata: riprovare senza cambiare i dati.'));},45000);
      pending.set(id,{resolve,reject,timer});
      (bridge.source as Window).postMessage({protocol:'RM2',channel:bridge.channel,type:'request',id,request:{action,data,auth}},bridge.origin);
    });
  };
  const result=queue.then(run,run);queue=result.then(()=>undefined,()=>undefined);return result;
}
