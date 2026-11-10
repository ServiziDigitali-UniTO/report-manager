let pending=0;
export function beginSaving(){pending++;}
export function endSaving(){pending=Math.max(0,pending-1);}
window.addEventListener('beforeunload',event=>{if(pending){event.preventDefault();event.returnValue='';}});
