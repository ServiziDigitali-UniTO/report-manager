import {useSyncExternalStore} from 'react';
import {emptyArchive,type PresenceArchive} from './model';
let archive:PresenceArchive=emptyArchive(),saved=true;const listeners=new Set<()=>void>();
export function setArchive(value:PresenceArchive){archive=value;saved=!value.receipts.length;listeners.forEach(fn=>fn());}
export function markArchiveSaved(){saved=true;}
export function isArchiveSaved(){return saved;}
window.addEventListener('beforeunload',event=>{if(!saved&&archive.receipts.length){event.preventDefault();event.returnValue='';}});
export function useArchive(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn);};},()=>archive);}
