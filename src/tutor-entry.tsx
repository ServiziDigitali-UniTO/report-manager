import React from 'react';
import {createRoot} from 'react-dom/client';
import {loadPublicConfig} from './services/bridge';
import {WeeklyRouter} from './weekly/WeeklyRouter';
async function start(){try{await loadPublicConfig();createRoot(document.getElementById('root')!).render(<React.StrictMode><WeeklyRouter initialHash={window.__RM_BOOTSTRAP__?.initialHash}/></React.StrictMode>);}catch{document.getElementById('root')!.textContent='Impossibile caricare il registro. Riaprire il collegamento.';}}
void start();
