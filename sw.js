/* Cache only this game's fixed assets. Never cache sign-in pages or APIs. */
const CACHE='isla-3d-offline-v2-20261012-mobile';
const ASSETS=['./','world.js','world.css','three.module.js','three.core.js','style.css','adventure.css','content.js','app.js','adventure.js','offline.js','manifest.webmanifest','assets/icon.svg','assets/icon-192.png','assets/icon-512.png','assets/nunito.woff2','assets/dm-sans.woff2'];
const absolute=p=>new URL(p,self.registration.scope).href;
const allowed=new Set(ASSETS.map(absolute));
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 try{
  for(const path of ASSETS){
   const response=await fetch(absolute(path),{cache:'reload',credentials:'same-origin'});
   if(!response.ok||response.redirected)throw new Error('Game assets unavailable');
   const type=response.headers.get('content-type')||'';
   if((path==='./'||path==='index.html')&&!((await response.clone().text()).includes('src="adventure.js"')))throw new Error('Not the game document');
   if(path.endsWith('.js')&&!/javascript/.test(type))throw new Error('Not a game script');
   await cache.put(absolute(path),response);
  }
  await self.skipWaiting();
 }catch(e){await caches.delete(CACHE);throw e}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('isla-3d-offline-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('message',event=>{
 if(event.data?.type==='OFFLINE_STATUS')event.waitUntil((async()=>{const cache=await caches.open(CACHE);let ready=true;for(const path of ASSETS)if(!await cache.match(absolute(path))){ready=false;break}event.source?.postMessage({type:'OFFLINE_STATUS',ready})})());
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'&&(url.pathname===new URL(self.registration.scope).pathname||url.href===absolute('index.html'))){
  event.respondWith((async()=>{try{return await fetch(request)}catch{const cache=await caches.open(CACHE);return await cache.match(absolute('./'))||Response.error()}})());return;
 }
 if(!allowed.has(url.href))return;
 event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(request)||fetch(request)})());
});
