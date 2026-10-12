/* Learning, new activities, a growing island, and branching stories. */
const original={buildTasks,renderTask,answer,helpTask,wrong,correct,startMission,finish,map,renderSettings,character,renderStory,getVoice,speak};
let learningRaw={};
try{learningRaw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}catch{}
save.adaptive=learningRaw.adaptive!==false;save.learning={};save.storyChoices={};
for(const z of ZONES){
 const entry=learningRaw.learning?.[z.id];
 if(entry&&[1,2,3].includes(entry.level))save.learning[z.id]={level:entry.level,history:Array.isArray(entry.history)?entry.history.slice(-12).filter(h=>h&&typeof h.ok==='boolean'&&Number.isInteger(h.mission)&&h.mission>=0&&h.mission<6&&typeof h.token==='string'&&h.token.length<100):[]};
}
let pairSelection=null,pairMatches=new Set(),classifyIndex=0,branchPending=false,currentBranch=null,moodTimer=null,usedHint=false;
function learningFor(id){return save.learning[id]||{level:save.age-2,history:[]}}
function adaptiveLevel(id){return save.adaptive?learningFor(id).level+2:save.age}
function recordPractice(){
 const entry=save.learning[zone.id]||={level:save.age-2,history:[]};
 const token=task.type==='pairs'?task.keys.join(''):task.type==='classify'?task.items.map(w=>w.id).join(','):task.target.id;
 entry.history.push({ok:!helped||(task.guided&&errors===0&&!usedHint),mission,token});entry.history=entry.history.slice(-12);persist();
}
function adaptAfterMission(){
 if(!save.adaptive)return;
 const entry=save.learning[zone.id];if(!entry)return;
 const recent=entry.history.slice(-6),support=entry.history.slice(-4);
 if(recent.length===6&&recent.every(h=>h.ok)&&new Set(recent.map(h=>h.mission)).size>=2&&new Set(recent.map(h=>h.token)).size>=3&&entry.level<3){entry.level++;entry.history=[];persist();}
 else if(support.length===4&&support.filter(h=>!h.ok).length>=3&&entry.level>1){entry.level--;entry.history=[];persist();}
}
function pairTask(level,offset){
 const pool=level===1?'AEIOU':'AEIOUMPLS',number=level===1?2:3,keys=Array.from({length:number},(_,i)=>pool[(offset+i)%pool.length]);
 const options=shuffle(keys.flatMap((key,i)=>[{id:`${i}-a`,letter:key,pairKey:key},{id:`${i}-b`,letter:level>=2?key.toLowerCase():key,pairKey:key}]));
 return {type:'pairs',target:{id:'pairs'},keys,options,prompt:'Encontrá las letras amigas.',spoken:level===1?'Tocá dos letras iguales. Busquemos todas las parejas.':'Tocá una letra mayúscula y su minúscula. Busquemos todas las parejas.',feedback:'¡Todas las letras encontraron a su amiga!',hint:'Elegí una letra y buscá otra con la misma forma o su minúscula.'};
}
function searchTask(source,level){
 const size=level===1?3:level===2?4:6;const options=choicesFor(source.target,VOCAB,size);
 const article=['luna','sopa','mesa','pala','pelota','uva','isla','manzana','flor','lima','taza'].includes(source.target.id)?'la':'el';
 return {...source,type:'search',options,prompt:source.independentReading?'Leé y buscá en el jardín.':`Buscá ${article} ${source.target.word.toLowerCase()} en el jardín.`,spoken:source.independentReading?'Leé la palabra y encontrá su dibujo en el jardín.':`Buscá ${article} ${source.target.word.toLowerCase()} entre los dibujos del jardín.`,feedback:`¡Encontraste ${article} ${source.target.word.toLowerCase()} en el jardín!`};
}
function classifyTask(level,offset){
 const refs=level===3?[word('sapo'),word('mapa'),word('lima')]:[word('sapo'),word('mapa')];
 const items=Array.from({length:3},(_,i)=>{const ref=refs[(offset+i)%refs.length];return VOCAB.filter(w=>w.initial===ref.initial&&w.id!==ref.id)[i%VOCAB.filter(w=>w.initial===ref.initial&&w.id!==ref.id).length]});
 return {type:'classify',target:{id:'classify'},items,options:shuffle(refs),prompt:'Cada palabra, con sus amigas.',spoken:'Escuchá cómo empieza cada palabra. Tocá la canasta de las palabras que empiezan igual.',feedback:'¡Todas las palabras encontraron su canasta!',hint:'Escuchemos el comienzo de las palabras.'};
}
buildTasks=function(){
 const initial=save.age,level=adaptiveLevel(zone.id)-2;let result;
 try{save.age=level+2;result=original.buildTasks()}finally{save.age=initial}
 if(zone.id==='letras'&&[1,3,5].includes(mission))result[1]=pairTask(level,mission);
 if(zone.id==='sonidos'){
  if(mission>=1){const t=result[2];result[2]=searchTask({...t,reference:null,prompt:`Buscá ${t.target.word.toLowerCase()}.`,spoken:`Buscá ${t.target.word.toLowerCase()}.`,hint:`Buscamos ${t.target.word.toLowerCase()}.`},level)}
  if([2,5].includes(mission)&&level>=2)result[1]=classifyTask(level,mission);
 }
 if(zone.id==='palabras'&&[2,4].includes(mission)&&level!==2)result[1]=searchTask(result[1],level);
 return result;
};
character=function(name='lila',cls=''){
 let svg=original.character(name,cls+' expressive mood-idle');
 svg=svg.replace(/(<circle cx="(?:66|99|64|103)" cy="(?:78|77)" r="5")/g,'$1 class="character-eye"');
 svg=svg.replace('<path d="m47 122-21-18m88 18 22-20"','<path class="character-arms" d="m47 122-21-18m88 18 22-20"');
 svg=svg.replace('<path d="M39 91q23-5 25 27-22 8-25-27"','<path class="character-wing" d="M39 91q23-5 25 27-22 8-25-27"');
 return svg;
};
function setCharacterMood(mood,duration=0){
 clearTimeout(moodTimer);document.querySelectorAll('.expressive').forEach(el=>{el.classList.remove('mood-idle','mood-speaking','mood-listening','mood-thinking','mood-happy','mood-wave');el.classList.add('mood-'+mood)});
 if(duration)moodTimer=setTimeout(()=>setCharacterMood('idle'),duration);
}
getVoice=function(){const all=window.speechSynthesis?.getVoices()||[];if(navigator.onLine)return original.getVoice();return all.find(v=>v.localService&&/^es[-_]AR/i.test(v.lang))||all.find(v=>v.localService&&/^es/i.test(v.lang))};
speak=function(text){
 if(save.sound&&!navigator.onLine&&!getVoice()){if(!voiceWarning){voiceWarning=true;toast('Sin internet, la voz necesita una voz española instalada. Podés jugar con un adulto.')}return}
 return original.speak(text);
};
function activityActions(){return '<div class="game-feedback" id="feedback" role="status" aria-live="polite"></div><div class="game-actions"><button class="help-button" data-action="help">'+icon('help')+' Una ayudita</button><button class="primary hidden" id="continue" data-action="next">Seguir '+icon('arrow')+'</button></div>'}
function customStart(){task=tasks[round];errors=0;helped=!!task.guided;answered=false;syllableIndex=0;pairSelection=null;pairMatches=new Set();classifyIndex=0;usedHint=false}
function paintClassification(){
 const item=task.items[classifyIndex];
 app.innerHTML=gameFrame(`${instruction(`¿Dónde va ${item.word.toLowerCase()}?`,'Escuchá cómo empieza cada palabra.')}<div class="sort-current">${art(item.id)}<div class="sort-dots">${task.items.map((w,i)=>`<span class="${i<classifyIndex?'sorted':''}">${i<classifyIndex?'✓':'•'}</span>`).join('')}</div></div><div class="answer-grid baskets" data-count="${task.options.length}" style="--cols:${task.options.length}">${task.options.map(o=>`<button class="answer-card basket" data-action="answer" data-value="${o.id}" aria-label="Canasta de ${o.word.toLowerCase()}">${art(o.id)}<span class="basket-name">${o.word}</span></button>`).join('')}</div>${activityActions()}`);
 narrate(`${item.word.toLowerCase()}. ¿Empieza como ${task.options.map(o=>o.word.toLowerCase()).join(' o como ')}?`);setCharacterMood('listening');
}
renderTask=function(){
 const nextTask=tasks[round];usedHint=false;if(!['pairs','search','classify'].includes(nextTask.type)){original.renderTask();setCharacterMood('listening');return}
 customStart();
 if(task.type==='classify'){paintClassification();return}
 let body;
 if(task.type==='pairs')body=`${instruction(task.prompt,'Tocá una letra y después su amiga.')}<div class="pair-grid">${task.options.map(o=>`<button class="answer-card pair-card" data-action="answer" data-value="${o.id}" aria-label="Letra ${o.letter}"><span class="answer-letter">${o.letter}</span></button>`).join('')}</div><p class="practice-note" id="pair-progress">0 de ${task.keys.length} parejas</p>`;
 else{const positions=task.options.length===3?[[22,40],[70,31],[48,73]]:task.options.length===4?[[24,32],[73,31],[27,77],[76,77]]:[[19,30],[50,25],[82,31],[20,76],[50,72],[82,75]];body=`${instruction(task.prompt,'Tocá el dibujo que estás buscando.')}${task.independentReading?`<div class="task-focus"><div class="focus-word">${task.focus}</div></div>`:''}<div class="search-scene">${task.options.map((o,i)=>`<button class="answer-card scene-object" data-action="answer" data-value="${o.id}" style="left:${positions[i][0]}%;top:${positions[i][1]}%" aria-label="${o.word.toLowerCase()}">${art(o.id)}</button>`).join('')}</div>`}
 app.innerHTML=gameFrame(body+activityActions());narrate(task.spoken);setCharacterMood('listening');
};
answer=function(value,button){
 if(answered||!task)return;
 if(task.type==='pairs'){
  const chosen=task.options.find(o=>o.id===value);if(!chosen||pairMatches.has(chosen.pairKey))return;
  if(pairSelection===value){button.classList.remove('selected');pairSelection=null;return}
  if(pairSelection===null){pairSelection=value;button.classList.add('selected');speak(`Letra ${chosen.letter.toUpperCase()}. Buscá su amiga.`);return}
  const first=task.options.find(o=>o.id===pairSelection);const firstButton=document.querySelector(`.pair-card[data-value="${pairSelection}"]`);
  if(first.pairKey!==chosen.pairKey){wrong();firstButton.classList.remove('selected');pairSelection=null;return}
  pairMatches.add(first.pairKey);firstButton.classList.remove('selected');firstButton.classList.add('matched');button.classList.add('matched');firstButton.disabled=true;button.disabled=true;pairSelection=null;document.querySelector('#pair-progress').textContent=`${pairMatches.size} de ${task.keys.length} parejas`;
  if(pairMatches.size===task.keys.length)correct(button);else{document.querySelector('#feedback').textContent='¡Estas letras son amigas!';chime();setCharacterMood('happy',1200);speak(`¡Sí! Las dos son la letra ${first.pairKey}.`)}return;
 }
 if(task.type==='classify'){
  const ref=task.options.find(o=>o.id===value),item=task.items[classifyIndex];if(!ref)return;
  if(ref.initial!==item.initial){wrong();return}
  classifyIndex++;if(classifyIndex===task.items.length){correct(button);return}
  chime();paintClassification();return;
 }
 original.answer(value,button);
};
helpTask=function(){
 if(answered)return;
 usedHint=true;
 if(task.type==='pairs'){
  helped=true;const key=pairSelection?task.options.find(o=>o.id===pairSelection).pairKey:task.keys.find(k=>!pairMatches.has(k));
  document.querySelectorAll('.pair-card').forEach(b=>b.classList.remove('hint'));
  for(const o of task.options.filter(o=>o.pairKey===key))document.querySelector(`.pair-card[data-value="${o.id}"]`).classList.add('hint');
  document.querySelector('#feedback').textContent=`Busquemos las dos letras ${key}.`;speak(`Busquemos las dos letras ${key}. Tocá las tarjetas que brillan.`);setCharacterMood('thinking');return;
 }
 if(task.type==='classify'){
  helped=true;const item=task.items[classifyIndex],ref=task.options.find(o=>o.initial===item.initial);document.querySelector(`.basket[data-value="${ref.id}"]`).classList.add('hint');document.querySelector('#feedback').textContent=`${item.word.toLowerCase()} empieza como ${ref.word.toLowerCase()}.`;speak(`${item.word.toLowerCase()} empieza como ${ref.word.toLowerCase()}. Van en la misma canasta.`);return;
 }
 original.helpTask();setCharacterMood('thinking');
};
wrong=function(){
 if(['pairs','classify'].includes(task.type)){errors++;helped=true;document.querySelector('#feedback').textContent=task.type==='pairs'?'Miremos otra pareja. Podemos probar otra vez.':'Escuchemos el comienzo otra vez.';document.querySelector('#feedback').classList.add('try');setCharacterMood('thinking');if(errors>=2)helpTask();else speak(task.type==='pairs'?'Estas letras son diferentes. Busquemos dos letras amigas.':task.items[classifyIndex].word.toLowerCase());return}
 original.wrong();setCharacterMood('thinking');
};
correct=function(button){
 if(answered)return;original.correct(button);recordPractice();setCharacterMood('happy',2500);
};
function worldArt(id,index){
 if(id==='letras')return art('flor');if(id==='sonidos')return art('arbol');if(id==='cuentos')return art('libro');
 if(id==='silabas')return `<svg viewBox="0 0 100 90" aria-hidden="true"><rect x="8" y="25" width="82" height="49" rx="12" fill="${['#edb868','#9ac5bb','#b6a2ce','#e69f89','#a1bc7e','#95b6d1'][index]}"/><rect x="21" y="34" width="23" height="22" rx="4" fill="#fff4d3"/><rect x="55" y="34" width="23" height="22" rx="4" fill="#fff4d3"/><circle cx="29" cy="77" r="11" fill="#536854"/><circle cx="70" cy="77" r="11" fill="#536854"/><path d="M10 66h78" stroke="#fff4d3" stroke-width="4"/></svg>`;
 return `<svg viewBox="0 0 100 105" aria-hidden="true"><rect x="18" y="41" width="65" height="57" rx="9" fill="#f7e4be"/><path d="m8 47 42-37 44 37Z" fill="${['#e59c82','#e7bd70','#9cba8b','#b2a2c6','#87b9bd','#d49f82'][index]}"/><rect x="43" y="67" width="19" height="31" rx="8" fill="#ae8c64"/><rect x="26" y="55" width="14" height="17" rx="4" fill="#96c2c6"/><rect x="65" y="55" width="12" height="17" rx="4" fill="#96c2c6"/></svg>`;
}
function islandGrowth(){
 const locations={sonidos:[[12,29],[17,35],[26,35],[31,27],[15,43],[28,44]],letras:[[67,32],[84,29],[72,43],[84,43],[64,40],[79,48]],silabas:[[14,56],[19,61],[28,62],[34,55],[12,63],[35,63]],palabras:[[67,57],[82,52],[68,66],[84,64],[76,70],[90,60]],cuentos:[[43,20],[58,20],[45,30],[59,30],[48,13],[55,13]]};
 return ZONES.flatMap(z=>z.missions.map((_,i)=>save.completed[`${z.id}-${i}`]?`<div class="world-build ${z.id==='letras'?'bloom':''}" style="left:${locations[z.id][i][0]}%;top:${locations[z.id][i][1]}%;--hue:${z.id==='letras'?i*28:0}deg" aria-hidden="true">${worldArt(z.id,i)}</div>`:'')).join('');
}
map=function(){original.map();const scene=document.querySelector('.island-map');scene.setAttribute('aria-label',`Isla 3D con ${count()} descubrimientos`);if(count()){const caption=scene.querySelector('.map-caption');caption.innerHTML=icon('sprout')+`${count()} descubrimientos hacen crecer tu isla.`}setCharacterMood('wave',1800);};
finish=function(){adaptAfterMission();original.finish();const sticker=document.querySelector('.reward-sticker');if(sticker){sticker.innerHTML=worldArt(zone.id,mission);sticker.classList.add('built-reward')}setCharacterMood('happy',3500)};
const BRANCHES=[
 {intro:{text:'Lila encontró dos semillas para su jardín. ¿Qué le gustaría plantar con vos?',objects:['flor','arbol'],char:'lila'},prompt:'¿Qué plantamos en el jardín?',choices:[
  {id:'flor',label:'Una flor',scenes:[{text:'Elegiste una flor. Lila plantó la semilla y Tito la regó con cuidado.',objects:['flor','taza'],char:'tito'},{text:'La flor creció con pétalos de colores. Sol la llevó a la mesa de la fiesta.',objects:['flor','mesa'],char:'sol'}],question:'¿Qué creció de la semilla que elegiste?',answer:'flor',options:['flor','arbol','pelota']},
  {id:'arbol',label:'Un árbol',scenes:[{text:'Elegiste un árbol. Lila plantó la semilla y Tito la regó con cuidado.',objects:['arbol','taza'],char:'tito'},{text:'El árbol creció y dio sombra. Los amigos eligieron ese lugar para escuchar cuentos.',objects:['arbol','libro'],char:'lila'}],question:'¿Qué creció de la semilla que elegiste?',answer:'arbol',options:['arbol','flor','pelota']}]},
 {intro:{text:'Tito tiene su mapa y quiere dar un paseo. Puede ir a la laguna o descansar junto al árbol.',objects:['mapa','arbol'],char:'tito'},prompt:'¿Adónde llevamos a Tito?',choices:[
  {id:'pato',label:'A la laguna',scenes:[{text:'Elegiste la laguna. Tito siguió el mapa y encontró a un pato junto al agua.',objects:['mapa','pato'],char:'tito'},{text:'El pato le mostró el camino de regreso. Tito volvió contento de tener un nuevo amigo.',objects:['pato','isla'],char:'tito'}],question:'¿A quién encontró Tito en la laguna?',answer:'pato',options:['pato','oso','gato']},
  {id:'arbol',label:'Al árbol',scenes:[{text:'Elegiste el árbol. Tito caminó hasta su sombra y encontró a un oso descansando.',objects:['arbol','oso'],char:'tito'},{text:'El oso compartió una manzana con Tito. Después volvieron juntos a la aldea.',objects:['oso','manzana'],char:'tito'}],question:'¿Quién compartió una manzana con Tito?',answer:'oso',options:['oso','pato','gato']}]},
 {intro:{text:'Tito preparó una sopa para sus amigos. Lila quiere llevar algo para acompañarla.',objects:['sopa','mesa'],char:'tito'},prompt:'¿Qué llevamos para compartir?',choices:[
  {id:'pan',label:'Un pan',scenes:[{text:'Elegiste pan. Lila lo llevó a la mesa y lo compartió con Tito y Sol.',objects:['pan','mesa'],char:'lila'},{text:'Los amigos disfrutaron la sopa con pan. Todos ayudaron a ordenar la mesa.',objects:['sopa','pan'],char:'sol'}],question:'¿Qué elegiste para acompañar la sopa?',answer:'pan',options:['pan','manzana','mapa']},
  {id:'manzana',label:'Una manzana',scenes:[{text:'Elegiste una manzana. Lila la llevó a la mesa y la compartió con Tito y Sol.',objects:['manzana','mesa'],char:'lila'},{text:'Después de la sopa comieron manzana. ¡Qué rica merienda compartida!',objects:['sopa','manzana'],char:'sol'}],question:'¿Qué elegiste para compartir después de la sopa?',answer:'manzana',options:['manzana','pan','mapa']}]},
 {intro:{text:'Sol quiere inventar una canción. Puede escuchar al pato o al sapo del bosque.',objects:['pato','sapo'],char:'sol'},prompt:'¿Quién será parte de la canción?',choices:[
  {id:'pato',label:'El pato',scenes:[{text:'Elegiste al pato. Sol escuchó cómo cantaba junto a la laguna.',objects:['pato','arbol'],char:'sol'},{text:'Sol inventó una canción sobre un pato que paseaba. Lila y Tito la cantaron con él.',objects:['pato','libro'],char:'lila'}],question:'¿Sobre qué animal fue tu canción?',answer:'pato',options:['pato','sapo','oso']},
  {id:'sapo',label:'El sapo',scenes:[{text:'Elegiste al sapo. Sol lo vio saltar y escuchó su voz en el bosque.',objects:['sapo','arbol'],char:'sol'},{text:'Sol inventó una canción sobre un sapo que saltaba. Lila y Tito la cantaron con él.',objects:['sapo','libro'],char:'tito'}],question:'¿Sobre qué animal fue tu canción?',answer:'sapo',options:['sapo','pato','oso']}]},
 {intro:{text:'Lila y sus amigos encontraron un lugar para la fiesta. Ahora necesitan decorarlo.',objects:['mapa','mesa'],char:'lila'},prompt:'¿Cómo decoramos nuestra fiesta?',choices:[
  {id:'flor',label:'Con flores',scenes:[{text:'Elegiste flores. Tito puso una en cada mesa y Sol las miró feliz.',objects:['flor','mesa'],char:'tito'},{text:'El lugar se llenó de colores. Lila preparó su libro junto a las flores.',objects:['flor','libro'],char:'lila'}],question:'¿Con qué decoraste la fiesta?',answer:'flor',options:['flor','libro','pala']},
  {id:'libro',label:'Con libros',scenes:[{text:'Elegiste libros. Tito y Sol armaron un rincón lleno de historias.',objects:['libro','mesa'],char:'tito'},{text:'Los amigos eligieron sus cuentos favoritos. ¡La fiesta tendría muchas historias!',objects:['libro','arbol'],char:'sol'}],question:'¿Qué llenó el rincón de historias?',answer:'libro',options:['libro','flor','pala']}]},
 {intro:{text:'Todos llegaron a la fiesta. Lila abrió su libro y preguntó qué cuento querían escuchar.',objects:['libro','mesa'],char:'lila'},prompt:'¿Quién protagoniza nuestro cuento?',choices:[
  {id:'oso',label:'El oso',scenes:[{text:'Elegiste al oso. Lila contó que el oso buscaba una manzana por toda la isla.',objects:['oso','manzana'],char:'lila'},{text:'Al final, el oso encontró su manzana junto al árbol. Los amigos aplaudieron felices.',objects:['oso','arbol'],char:'sol'}],question:'¿Quién buscaba una manzana en tu cuento?',answer:'oso',options:['oso','gato','pato']},
  {id:'gato',label:'El gato',scenes:[{text:'Elegiste al gato. Lila contó que el gato buscaba su pelota por toda la isla.',objects:['gato','pelota'],char:'lila'},{text:'Al final, el gato encontró su pelota junto al árbol. Los amigos aplaudieron felices.',objects:['gato','arbol'],char:'tito'}],question:'¿Quién buscaba su pelota en tu cuento?',answer:'gato',options:['gato','oso','pato']}]}
];
for(let i=0;i<BRANCHES.length;i++){const prior=learningRaw.storyChoices?.[i];if(BRANCHES[i].choices.some(c=>c.id===prior))save.storyChoices[i]=prior}
startMission=function(index){
 branchPending=false;currentBranch=null;original.startMission(index);
 if(zone.id==='cuentos'){const content=BRANCHES[mission];story={...STORIES[mission],scenes:[content.intro,...content.choices[0].scenes]};renderStory()}
};
function showStoryChoice(){
 branchPending=true;task=null;const content=BRANCHES[mission];
 app.innerHTML=gameFrame(`${instruction(content.prompt,'Tu elección cambia nuestra historia.')}<div class="answer-grid story-choices" data-count="2" style="--cols:2">${content.choices.map(c=>`<button class="answer-card story-choice" data-action="story-choice" data-value="${c.id}" aria-label="${c.label}">${art(c.id)}<span>${c.label}</span></button>`).join('')}</div><p class="choice-note">Las dos opciones tienen una historia para descubrir.</p>`);narrate(content.prompt);setCharacterMood('listening');
}
function chooseStory(id){
 if(!branchPending)return;const branch=BRANCHES[mission].choices.find(c=>c.id===id);if(!branch)return;
 currentBranch=branch;branchPending=false;save.storyChoices[mission]=id;persist();story={...STORIES[mission],scenes:[BRANCHES[mission].intro,...branch.scenes],question:branch.question,answer:branch.answer,options:branch.options};storyStep=1;renderStory();
}
renderStory=function(){usedHint=false;original.renderStory();setCharacterMood('listening');if(storyStep<3&&currentBranch)document.querySelector('.story-text').insertAdjacentHTML('afterend',`<div class="story-path">${icon('star')} Tu historia: ${currentBranch.label.toLowerCase()}</div>`)};
renderSettings=function(){
 original.renderSettings();const group=document.querySelector('#settings-content .setting-group');group.insertAdjacentHTML('afterend',`<div class="toggle-row"><span>Ajustar dificultad al jugar</span><button class="toggle ${save.adaptive?'on':''}" data-action="toggle-adaptive" role="switch" aria-checked="${save.adaptive}" aria-label="Ajustar dificultad al jugar"></button></div><div class="learning-summary">${ZONES.map(z=>`<span>${z.short}<strong>${['Explorar','Practicar','Descubrir más'][adaptiveLevel(z.id)-3]}</strong></span>`).join('')}</div>`);
 const note=document.querySelector('#settings-content .settings-note');note.insertAdjacentHTML('beforebegin','<div class="setting-group"><h3>La isla en tu dispositivo</h3><p class="install-description" id="install-description">Podés guardar el juego para usarlo sin internet después de la primera descarga.</p><button class="small-button" data-action="install-game">'+icon('home')+' Instalar o agregar al inicio</button><button class="help-button" data-action="remove-offline">Eliminar descarga sin conexión</button></div>');
};
document.addEventListener('click',event=>{
 const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;const action=button.dataset.action;
 if(action==='story-choice'){event.stopImmediatePropagation();chooseStory(button.dataset.value)}
 else if(action==='story-next'&&zone?.id==='cuentos'&&storyStep===0){event.stopImmediatePropagation();cancelAudio();storyStep=1;showStoryChoice()}
 else if(action==='repeat'&&branchPending){event.stopImmediatePropagation();speak(BRANCHES[mission].prompt)}
 else if(action==='toggle-adaptive'){event.stopImmediatePropagation();save.adaptive=!save.adaptive;persist();renderSettings()}
 else if(action==='age'){save.learning={}}
 else if(action==='reset'){save.learning={};save.storyChoices={}}
},true);
window.addEventListener('online',()=>{voiceWarning=false});
window.addEventListener('offline',()=>{voiceWarning=false});
welcome();
