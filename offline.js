let installPrompt=null,offlineReady=false,offlineRemoved=false,offlineRegistration=null;
try{offlineRemoved=localStorage.getItem('isla-3d-offline-disabled')==='true'}catch{}
function offlineLabel(message,error=false){const el=document.querySelector('#offline-status');el.textContent=message;el.classList.toggle('offline-error',error);const description=document.querySelector('#install-description');if(description)description.textContent=message}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
window.addEventListener('appinstalled',()=>{installPrompt=null;toast('La isla ya está instalada en tu dispositivo.')});
if(!offlineRemoved&&'serviceWorker' in navigator&&['https:','http:'].includes(location.protocol)){
 offlineLabel('Preparando el juego sin conexión…');
 navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='OFFLINE_STATUS'){offlineReady=event.data.ready===true;offlineLabel(offlineReady?'Listo para jugar sin internet':'La descarga todavía no está completa',!offlineReady)}});
 const askStatus=()=>navigator.serviceWorker.controller?.postMessage({type:'OFFLINE_STATUS'});
 navigator.serviceWorker.addEventListener('controllerchange',askStatus);
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
  offlineRegistration=reg;askStatus();
  const watch=worker=>{if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='redundant')offlineLabel('No se pudo completar la descarga. Probá de nuevo con conexión.',true);if(worker.state==='activated')askStatus()})};
  watch(reg.installing);reg.addEventListener('updatefound',()=>watch(reg.installing));
  navigator.serviceWorker.ready.then(()=>{if(!offlineRemoved)askStatus()});
 }).catch(()=>offlineLabel('La descarga sin conexión no está disponible en este navegador.',true));
}else offlineLabel(offlineRemoved?'Descarga sin conexión desactivada':'');
function showInstall(){
 const d=document.querySelector('#settings-dialog');if(!d.open)d.showModal();
 const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 document.querySelector('#settings-content').innerHTML=`<div class="dialog-inner"><div class="dialog-head"><h2>Llevá la isla con vos</h2><button class="icon-button" data-action="close-settings" aria-label="Cerrar">${icon('close')}</button></div><p>${standalone?'La isla ya está abierta como una aplicación.':'Agregá la isla a la pantalla de inicio para abrirla como un juego.'}</p><div class="install-instructions">${standalone?'¡Tu acceso directo ya está listo!':installPrompt?'<button class="primary" data-action="confirm-install">Instalar la isla '+icon('home')+'</button>':ios?'<ol><li>Abrí este enlace en Safari.</li><li>Tocá Compartir.</li><li>Elegí “Agregar a pantalla de inicio”.</li></ol>':'<ol><li>Abrí el juego en Chrome o Edge.</li><li>Entrá al menú del navegador.</li><li>Elegí “Instalar aplicación” o “Agregar a pantalla de inicio”, si está disponible.</li></ol>'}</div><p class="install-note">${offlineReady?'La descarga está completa: las actividades, los cuentos, el mundo 3D y los dibujos ya están guardados en este dispositivo.':'Esperá a que aparezca “Listo para jugar sin internet” antes de desconectarte.'}<br><br>Para escuchar la narración sin internet, el dispositivo necesita una voz en español instalada. Si tu navegador limita las descargas o la instalación, seguí jugando desde el enlace.</p><div class="offline-confirm"><button class="small-button" data-action="install-back">Volver a opciones</button>${offlineRemoved?'<button class="small-button" data-action="download-again">Descargar de nuevo</button>':''}</div></div>`;
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
 const action=button.dataset.action;
 if(action==='install-game')showInstall();
 else if(action==='install-back')renderSettings();
 else if(action==='confirm-install'&&installPrompt){const pending=installPrompt;installPrompt=null;await pending.prompt();await pending.userChoice;showInstall()}
 else if(action==='remove-offline'){
  document.querySelector('#settings-content').innerHTML=`<div class="dialog-inner"><div class="dialog-head"><h2>¿Eliminar la descarga?</h2></div><p>Se quitarán los archivos para jugar sin internet. Tus aventuras y descubrimientos se conservan.</p><div class="offline-confirm"><button class="small-button" data-action="install-back">Conservar la descarga</button><button class="small-button" data-action="confirm-remove-offline">Eliminar descarga</button></div></div>`;
 }else if(action==='confirm-remove-offline'){
  offlineRemoved=true;offlineReady=false;
  try{localStorage.setItem('isla-3d-offline-disabled','true')}catch{}
  button.disabled=true;button.textContent='Quitando la descarga…';
  try{if(offlineRegistration)await offlineRegistration.unregister();for(const key of await caches.keys())if(key.startsWith('isla-3d-offline-'))await caches.delete(key);offlineLabel('Descarga sin conexión eliminada');renderSettings();toast('Quitamos la descarga. Tu progreso sigue guardado.')}catch{button.disabled=false;toast('No se pudo quitar la descarga en este navegador.')}
 }else if(action==='download-again'){try{localStorage.removeItem('isla-3d-offline-disabled')}catch{}location.reload()}
});
