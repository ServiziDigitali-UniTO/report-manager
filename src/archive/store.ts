import {useSyncExternalStore} from 'react';
import {emptyArchive,type PresenceArchive} from './model';
let archive:PresenceArchive=emptyArchive(),saved=true;const listeners=new Set<()=>void>();
export function setArchive(value:PresenceArchive){archive=value;saved=!(value.receipts.length||value.bookings?.length);listeners.forEach(fn=>fn());}
export function markArchiveSaved(expected?:PresenceArchive){if(!expected||archive===expected)saved=true;}
export function getArchive(){return archive;}
export function isArchiveSaved(){return saved;}
window.addEventListener('beforeunload',event=>{if(!saved&&(archive.receipts.length||archive.bookings?.length)){event.preventDefault();event.returnValue='';}});
export function useArchive(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>archive);}

let mutationQueue:Promise<unknown>=Promise.resolve();
export function updateArchive(fn:(value:PresenceArchive)=>PresenceArchive|Promise<PresenceArchive>){const task=mutationQueue.then(()=>fn(archive)).then(value=>{setArchive(value);return value;});mutationQueue=task.catch(()=>{});return task;}
