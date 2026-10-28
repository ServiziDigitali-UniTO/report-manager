import React,{useState} from 'react';
import {GoogleSheetsWebhookConfig} from '../types';
import {getAdminPassword,setAdminPassword,getPublicConfig} from '../services/bridge';
import {testWebhookConnection,refreshCentralRecords,clearStoredValidationRecords} from '../services/googleSheetsWebhook';
interface Props {isOpen:boolean;onClose:()=>void;onConfigSaved?:(config:GoogleSheetsWebhookConfig)=>void}
export const GoogleSheetsSettingsModal:React.FC<Props>=({isOpen,onClose})=>{
  const [password,setPassword]=useState(getAdminPassword());const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  if(!isOpen)return null;
  const test=async()=>{setBusy(true);setAdminPassword(password);const r=await testWebhookConnection(getPublicConfig().webhookUrl);setMessage(r.message);setBusy(false);};
  const refresh=async()=>{setBusy(true);try{setAdminPassword(password);const records=await refreshCentralRecords();setMessage(`Scaricate ${records.length} presenze correnti dal Foglio.`);}catch(e:any){setMessage(e.message);}finally{setBusy(false);}};
  return <div role="dialog" aria-modal="true" aria-label="Collegamento al Foglio" className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="bg-white dark:bg-stone-900 rounded-2xl p-6 max-w-xl w-full space-y-4 text-sm max-h-[90vh] overflow-auto">
    <h2 className="font-bold text-lg">Collegamento al Foglio Google</h2>
    <p>Il collegamento è comune a tutti i dispositivi e si configura nel file <code>public/report-manager.config.json</code> prima della pubblicazione.</p>
    <p className="break-all text-xs">{getPublicConfig().webhookUrl||'URL Apps Script non ancora configurato'}</p>
    <label className="block">Credenziale riservata alla segreteria<input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} className="block border rounded p-2 w-full mt-1"/></label>
    <p className="text-xs">La credenziale resta nella sessione di questa scheda. Non viene pubblicata su GitHub. Serve per preparare i QR, consultare il Foglio e registrare rettifiche.</p>
    <div className="flex flex-wrap gap-2">
      <button disabled={busy} onClick={test} className="p-2 rounded bg-[#2C4437] text-white">{busy?'Attendere…':'Verifica collegamento e abilita QR'}</button>
      <button disabled={busy} onClick={refresh} className="p-2 border rounded">Aggiorna presenze dal Foglio</button>
      <button disabled={busy} onClick={()=>{setAdminPassword('');setPassword('');clearStoredValidationRecords();setMessage('Sessione segreteria e cache delle presenze cancellate.');}} className="p-2 border rounded">Termina accesso segreteria</button>
    </div>
    <p role="status" className="text-xs whitespace-pre-wrap">{message}</p>
    <p className="text-xs">Installazione iniziale: seguire PUBBLICAZIONE.md. Apps Script richiede Code.gs, Bridge.html e appsscript.json, tutti inclusi nel progetto.</p>
    <button onClick={onClose} className="p-2 border rounded w-full">Chiudi</button>
  </div></div>;
};
