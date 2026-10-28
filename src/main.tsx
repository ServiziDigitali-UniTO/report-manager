import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {loadPublicConfig} from './services/bridge';
import './index.css';
async function start(){
  try{await loadPublicConfig();createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);}
  catch{const root=document.getElementById('root')!;root.textContent='Impossibile caricare la configurazione di Report Manager. Ricaricare la pagina o contattare la segreteria.';}
}
void start();
