import React,{useEffect,useState} from 'react';
import {ValidationShiftPayload} from '../types';
import {registerShift} from '../services/shifts';
export function ServerPin({payload}:{payload:ValidationShiftPayload}){
  const [pin,setPin]=useState('…');
  useEffect(()=>{let live=true;const refresh=()=>{setPin('…');registerShift(payload).then(s=>{if(live)setPin(s.pin);}).catch(()=>{if(live)setPin('Non disponibile');});};refresh();window.addEventListener('rm-config-changed',refresh);return()=>{live=false;window.removeEventListener('rm-config-changed',refresh);};},[JSON.stringify(payload)]);
  return <span>{pin}</span>;
}
