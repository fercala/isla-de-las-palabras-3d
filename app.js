const STORAGE_KEY='isla-palabras-3d-v1';
const defaults={age:4,avatar:'lila',sound:true,reduced:window.matchMedia('(prefers-reduced-motion: reduce)').matches,completed:{},stats:{},started:false};
let save={...defaults,completed:{},stats:{}};
try {
 const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
 if(raw&&typeof raw==='object') {
  save.age=[3,4,5].includes(raw.age)?raw.age:4;
  save.avatar=['lila','tito','sol'].includes(raw.avatar)?raw.avatar:'lila';
  save.sound=raw.sound!==false;save.reduced=raw.reduced===true||window.matchMedia('(prefers-reduced-motion: reduce)').matches;save.started=raw.started===true;
  for(const z of ZONES) {
   for(let i=0;i<6;i++)if(raw.completed?.[`${z.id}-${i}`]===true)save.completed[`${z.id}-${i}`]=true;
   const s=raw.stats?.[z.id];save.stats[z.id]={independent:Math.max(0,Math.min(99999,Number(s?.independent)||0)),helped:Math.max(0,Math.min(99999,Number(s?.helped)||0))};
  }
 }
}catch{}
const app=document.querySelector('#app');
let view='welcome',zone=null,mission=0,round=0,tasks=[],task=null,errors=0,helped=false,answered=false,syllableIndex=0,storyStep=0,story=null,timer=null,toastTimer=null,audioContext=null,voiceWarning=false,sessionIndependent=0;
let storageAvailable=true;
const names={lila:'Lila',tito:'Tito',sol:'Sol'};
const ageNames={3:'Exploradores',4:'Descubridores',5:'Constructores'};
function persist(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(save))}catch{storageAvailable=false;toast('Este navegador no permite guardar el progreso. Podés seguir jugando.')}}
function count(){return Object.keys(save.completed).length}
function zoneCount(id){return Array.from({length:6},(_,i)=>save.completed[`${id}-${i}`]).filter(Boolean).length}
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function word(id){return VOCAB.find(w=>w.id===id)}
function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),5000)}
function getVoice(){const voices=window.speechSynthesis?.getVoices()||[];return voices.find(v=>/^es[-_]AR/i.test(v.lang))||voices.find(v=>/^es/i.test(v.lang))}
function speak(text){
 if(!save.sound||document.hidden)return;
 if(!('speechSynthesis' in window)){if(!voiceWarning){toast('La voz no está disponible. Jugá con ayuda de un adulto.');voiceWarning=true}return}
 window.speechSynthesis.cancel();
 const available=window.speechSynthesis.getVoices();const voice=getVoice();
 if(available.length&&!voice){if(!voiceWarning){toast('No hay una voz en español instalada. Jugá con un adulto o activala en tu dispositivo.');voiceWarning=true}return}
 const u=new SpeechSynthesisUtterance(text);u.lang=voice?.lang||'es-AR';if(voice)u.voice=voice;u.rate=.84;u.pitch=1.05;u.volume=1;
 u.onstart=()=>{if(typeof setCharacterMood==='function')setCharacterMood('speaking')};
 u.onend=()=>{if(typeof setCharacterMood==='function')setCharacterMood('idle')};
 u.onerror=e=>{if(e.error!=='interrupted'&&e.error!=='canceled'&&!voiceWarning){voiceWarning=true;toast('No se pudo reproducir la voz. Podés repetir o jugar con un adulto.')}};
 window.speechSynthesis.speak(u);
}
function narrate(text){clearTimeout(timer);timer=setTimeout(()=>speak(text),160)}
function cancelAudio(){clearTimeout(timer);window.speechSynthesis?.cancel()}
function chime(){if(!save.sound)return;try{audioContext ||= new (window.AudioContext||window.webkitAudioContext)();audioContext.resume();[523.25,659.25,783.99].forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,audioContext.currentTime+i*.1);g.gain.linearRampToValueAtTime(.055,audioContext.currentTime+i*.1+.025);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+i*.1+.35);o.connect(g);g.connect(audioContext.destination);o.start(audioContext.currentTime+i*.1);o.stop(audioContext.currentTime+i*.1+.4)})}catch{}}
function updateHeader(){document.querySelector('#sound-icon').innerHTML=icon(save.sound?'sound':'muted');document.querySelector('#sound').setAttribute('aria-label',save.sound?'Desactivar voz':'Activar voz');document.querySelector('#sound').setAttribute('aria-pressed',String(save.sound));document.querySelector('#book-icon').innerHTML=icon('book');document.querySelector('#settings-icon').innerHTML=icon('settings');document.querySelector('#seed-count').textContent=count();document.body.classList.toggle('reduce-motion',save.reduced)}
function imageMarkup(){return ''}
function avatars(){return ['lila','tito','sol'].map(n=>`<button class="avatar-button ${save.avatar===n?'selected':''}" data-action="avatar" data-value="${n}" aria-label="Elegir a ${names[n]}" aria-pressed="${save.avatar===n}">${character(n)}</button>`).join('')}
function ages(long=false){return [3,4,5].map(n=>`<button class="age-button ${save.age===n?'selected':''}" data-action="age" data-value="${n}" aria-pressed="${save.age===n}">${long?`${ageNames[n]}<br><small>${n} años aprox.</small>`:`${n} años`}</button>`).join('')}
function welcome(){
 cancelAudio();view='welcome';updateHeader();
 app.innerHTML=`<section class="welcome"><div class="welcome-top"><div><div class="pill"><span class="dot"></span> PARA PEQUEÑOS GRANDES EXPLORADORES</div><h1>Una isla en 3D.<br><em>Crece con vos.</em></h1><p class="intro">Sonidos, letras y cuentos para crecer jugando.<br>Una aventura para chicos de 3 a 5 años.</p></div><div class="welcome-note">${icon('sprout')}<span>El aprendizaje florece<br><strong>cuando nos divertimos.</strong></span></div></div><div class="welcome-grid"><div class="island-preview">${imageMarkup()}<div class="tiny-star">${icon('star')}</div><div class="map-sticker">${icon('book')}<div><strong>Un mundo por descubrir</strong><span>5 lugares · 30 pequeñas aventuras</span></div></div></div><section class="start-card">${character(save.avatar)}<h2>¡Hola! Soy ${names[save.avatar]}.</h2><p>¿Me acompañás a llenar nuestra isla de palabras?</p><div class="avatar-picker" aria-label="Elegí un personaje">${avatars()}</div><div class="age-picker" aria-label="Recorrido inicial">${ages()}</div><span class="picker-label">Elegí un amigo y un recorrido para empezar</span><button class="primary" data-action="start">${save.started?'¡Seguir explorando!':'¡Vamos a jugar!'} ${icon('arrow')}</button><small class="micro">Tocá y descubrí. Cada chico, a su ritmo.</small></section></div><div class="feature-row"><div class="feature"><span class="feature-icon sage">${icon('note')}</span><div><strong>Escuchar y descubrir</strong><p>Palabras que despiertan curiosidad.</p></div></div><div class="feature"><span class="feature-icon peach">${icon('flower')}</span><div><strong>Aprender jugando</strong><p>Letras y sílabas, paso a paso.</p></div></div><div class="feature"><span class="feature-icon honey">${icon('book')}</span><div><strong>Imaginar juntos</strong><p>Cuentos para compartir y disfrutar.</p></div></div></div></section>`;
}
function map(){
 cancelAudio();view='map';updateHeader();app.innerHTML=`<section><div class="page-heading"><div><div class="eyebrow">TU PEQUEÑA GRAN AVENTURA</div><h1>¿Adónde vamos hoy?</h1><p>Tocá un lugar de la isla para descubrir algo nuevo.</p></div><div class="heading-side"><span class="pill">${ageNames[save.age]}</span>${character(save.avatar)}</div></div><div class="map-layout"><div class="island-map">${imageMarkup()}${ZONES.map(z=>`<button class="map-stop" style="left:${z.x}%;top:${z.y}%" data-action="zone" data-value="${z.id}" aria-label="${z.title}. ${zoneCount(z.id)} de 6 misiones completadas"><span class="stop-icon ${z.color}">${icon(z.icon)}${zoneCount(z.id)?`<b class="stop-count">${zoneCount(z.id)}/6</b>`:''}</span><span class="stop-caption">${z.short}</span></button>`).join('')}<div class="map-caption">${icon('sprout')} Cada aventura hace crecer tu isla.</div></div><aside class="island-sidebar"><div class="goal-card"><div class="eyebrow">NUESTRO GRAN OBJETIVO</div><h2>La fiesta de los cuentos</h2><p>Ayudemos a nuestros amigos y llenemos el libro de descubrimientos.</p><div class="progress-track" role="progressbar" aria-label="Aventuras completadas" aria-valuemin="0" aria-valuemax="30" aria-valuenow="${count()}"><span style="width:${count()/30*100}%"></span></div><div class="goal-stat"><span>${count()} aventuras completadas</span><strong>${count()}/30</strong></div><button class="small-button" data-action="album">${icon('book')} Ver mi libro</button></div><div class="zone-links">${ZONES.map(z=>`<button class="zone-link" data-action="zone" data-value="${z.id}"><span class="feature-icon ${z.color}">${icon(z.icon)}</span><span><strong>${z.title}</strong><small>${zoneCount(z.id)}/6 aventuras</small></span>${icon('arrow')}</button>`).join('')}</div></aside></div></section>`;
}
function showZone(id){
 cancelAudio();zone=ZONES.find(z=>z.id===id)||ZONES[0];view='zone';updateHeader();app.innerHTML=`<section><button class="back-button" data-action="map">${icon('back')} Volver a la isla</button><div class="zone-hero ${zone.color}"><div><div class="eyebrow">${zone.short} · ${zoneCount(zone.id)}/6 AVENTURAS</div><h1>${zone.title}</h1><p>${zone.subtitle}</p></div>${character(zone.character)}</div><div class="mission-grid">${zone.missions.map((m,i)=>`<button class="mission-card ${save.completed[`${zone.id}-${i}`]?'completed':''}" data-action="mission" data-value="${i}"><div class="mission-top"><span class="mission-number">0${i+1}</span><span class="mission-status">${save.completed[`${zone.id}-${i}`]?`${icon('check')} Descubierta`:`${icon(zone.icon)} Para explorar`}</span></div><h2>${m}</h2><p>${zone.id==='cuentos'?'Un cuento y una pequeña pregunta':'Tres desafíos, una nueva sorpresa'}</p></button>`).join('')}</div><p class="zone-bottom">${icon('sprout')} Podés volver a tus aventuras todas las veces que quieras.</p></section>`;narrate(`${zone.title}. Elegí una aventura.`);window.scrollTo({top:0,behavior:'instant'});
}
function choicesFor(target,source,size=save.age===3?2:save.age===4?3:4){return shuffle([target,...shuffle(source.filter(x=>x.id!==target.id)).slice(0,size-1)])}
function buildTasks(){
 const offset=mission*3;const simple=VOCAB.filter(w=>SIMPLE_WORDS.includes(w.id));
 return Array.from({length:3},(_,r)=>{
  if(zone.id==='sonidos'){
   if(save.age===3||mission<2){const target=VOCAB[(offset+r)%VOCAB.length];return {type:'picture',target,options:choicesFor(target,VOCAB),prompt:`Buscá ${target.word.toLowerCase()}.`,spoken:`Escuchá. ${target.word.toLowerCase()}. Tocá su dibujo.`,feedback:`¡Sí! Encontraste ${target.word.toLowerCase()}.`,hint:`Escuchá una vez más: ${target.word.toLowerCase()}.`}}
   const initials=['s','m','p','l'];const initial=initials[(mission+r)%initials.length],group=VOCAB.filter(w=>w.initial===initial),reference=group[0],target=group[1+(r%(group.length-1))];
   return {type:'picture',target,reference,options:choicesFor(target,VOCAB.filter(w=>w.initial!==initial)),prompt:`¿Cuál empieza como ${reference.word.toLowerCase()}?`,spoken:`Escuchá el comienzo de ${reference.word.toLowerCase()}. ¿Qué palabra empieza igual?`,feedback:`¡Sí! ${reference.word.toLowerCase()} y ${target.word.toLowerCase()} empiezan igual.`,hint:`Escuchá las palabras: ${reference.word.toLowerCase()}... ${target.word.toLowerCase()}. Empiezan igual.`};
  }
  if(zone.id==='letras'){
   const letters=save.age===3?'AEIOU':mission<2?'AEIOU':'AEIOUMPLS';const letter=letters[(offset+r)%letters.length];const lower=save.age>=4&&mission>=3;
   const target={id:lower?letter.toLowerCase():letter,letter:lower?letter.toLowerCase():letter};const others=[...letters].map(l=>({id:lower?l.toLowerCase():l,letter:lower?l.toLowerCase():l}));
   return {type:'letter',target,model:save.age===3||lower?letter:null,options:choicesFor(target,others),prompt:lower?`Buscá la ${letter} minúscula.`:`Encontrá la letra ${letter}.`,spoken:lower?`Esta es la letra ${letter}. Buscá su forma minúscula.`:`Tocá la letra ${letter}.`,feedback:`¡Encontraste la ${letter}! Una nueva flor.`,hint:`Buscamos la letra ${letter}. Mirá su forma.`};
  }
  if(zone.id==='silabas'){
   const list=save.age===5&&mission>=3?[...simple,word('pelota'),word('pato')]:simple;const target=list[(offset+r)%list.length];
   return {type:'syllable',target,parts:target.syllables,options:shuffle(target.syllables.map((s,i)=>({id:String(i),letter:s}))),prompt:`Armemos ${target.word.toLowerCase()}.`,spoken:`Armemos ${target.word.toLowerCase()}. Escuchá sus partes: ${target.syllables.join('... ')}. Tocá las sílabas en orden.`,feedback:`¡Los vagones dicen ${target.word.toLowerCase()}!`,hint:`La palabra es ${target.word.toLowerCase()}. Primero va ${target.syllables[0]}. Después ${target.syllables.slice(1).join('... ')}.`,guided:save.age===3};
  }
  if(zone.id==='palabras'){
   const target=simple[(offset+r)%simple.length];
   if(save.age===3)return {type:'picture',target,focus:target.word,options:choicesFor(target,VOCAB),guided:true,prompt:`Encontrá ${target.word.toLowerCase()}.`,spoken:`Esta palabra dice ${target.word.toLowerCase()}. Tocá su dibujo.`,feedback:`¡Sí! Esta palabra dice ${target.word.toLowerCase()}.`,hint:`Buscamos ${target.word.toLowerCase()}.`};
   if(save.age===4){const letter=target.word[0],targetOption={id:letter,letter};return {type:'letter',target:targetOption,picture:target,focus:['_',...target.word.slice(1)].join(' '),options:choicesFor(targetOption,[...'AEIOUMPLS'].map(l=>({id:l,letter:l}))),prompt:`Completá ${target.word.toLowerCase()}.`,spoken:`La palabra es ${target.word.toLowerCase()}. ¿Qué letra falta al principio?`,feedback:`¡Sí! ${letter} completa ${target.word.toLowerCase()}.`,hint:`${target.word.toLowerCase()} empieza con la letra ${letter}.`};}
   return {type:'picture',target,focus:target.word,options:choicesFor(target,simple),independentReading:true,prompt:'Leé y elegí el dibujo.',spoken:'Mirá las letras. Leé la palabra y elegí su dibujo.',feedback:`¡Sí! La palabra dice ${target.word.toLowerCase()}.`,hint:`Vamos a leer juntos: ${target.syllables.join('... ')}. ${target.word.toLowerCase()}.`};
  }
 });
}
function startMission(index){cancelAudio();mission=Math.min(5,Math.max(0,Number(index)||0));round=0;sessionIndependent=0;storyStep=0;view='game';if(zone.id==='cuentos'){story=STORIES[mission];renderStory()}else{tasks=buildTasks();renderTask()}window.scrollTo({top:0,behavior:'instant'})}
function gameFrame(body){return `<section class="game-shell"><div class="game-top"><button class="back-button" data-action="back-zone">${icon('back')} ${zone.short}</button><span class="game-title">${zone.missions[mission]}</span><div class="game-rounds" aria-label="Paso ${zone.id==='cuentos'?storyStep+1:round+1} de ${zone.id==='cuentos'?4:3}">${Array.from({length:zone.id==='cuentos'?4:3},(_,i)=>`<span class="round-dot ${i<(zone.id==='cuentos'?storyStep:round)?'done':i===(zone.id==='cuentos'?storyStep:round)?'current':''}"></span>`).join('')}</div></div><div class="game-board">${body}</div></section>`}
function instruction(prompt,subtitle='Tocá una opción. Podés escuchar otra vez.'){return `<div class="instruction-row">${character(zone.character,'guide')}<div class="speech-bubble"><h1>${prompt}</h1><p>${subtitle}</p></div><button class="repeat-button" data-action="repeat" aria-label="Escuchar otra vez">${icon('sound')}</button></div>`}
function answers(options,syllables=false){return `<div class="answer-grid ${syllables?'syllable-options':''}" data-count="${options.length}" style="--cols:${options.length}">${options.map(o=>`<button class="answer-card" data-action="answer" data-value="${escapeText(o.id)}" aria-label="${escapeText(o.letter||o.word||o.id)}">${o.letter?`<span class="answer-letter">${escapeText(o.letter)}</span>`:art(o.id)}</button>`).join('')}</div>`}
function renderTask(){
 task=tasks[round];errors=0;helped=!!task.guided;answered=false;syllableIndex=0;
 let focus='';
 if(task.type==='syllable')focus=`<div class="task-focus">${art(task.target.id)}</div><div class="syllable-train"><div class="engine">${icon('train')}</div>${task.parts.map((s,i)=>`<div class="wagon" id="wagon-${i}" aria-label="Vagón ${i+1}">${task.guided?s:'?'}</div>`).join('')}</div>`;
 else if(task.model)focus=`<div class="task-focus"><div class="big-letter">${task.model}</div></div>`;
 else if(task.focus||task.picture)focus=`<div class="task-focus">${task.picture?art(task.picture.id):''}${task.focus?`<div class="focus-word">${task.focus}</div>`:''}</div>`;
 else if(task.reference)focus=`<div class="task-focus">${art(task.reference.id)}</div>`;
 app.innerHTML=gameFrame(`${instruction(task.prompt,task.type==='syllable'?'Cada vagón lleva una parte de la palabra.':'Tocá una opción. Podés escuchar otra vez.')}${focus}${answers(task.options,task.type==='syllable')}${task.guided?'<p class="practice-note">Jugamos juntos, con ayuda.</p>':''}<div class="game-feedback" id="feedback" role="status" aria-live="polite"></div><div class="game-actions"><button class="help-button" data-action="help">${icon('help')} Una ayudita</button><button class="primary hidden" id="continue" data-action="next">Seguir ${icon('arrow')}</button></div>`);narrate(task.spoken);
}
function answer(value,button){
 if(answered||!task)return;
 if(task.type==='syllable'){
  const option=task.options.find(o=>o.id===value);if(!option||button.disabled)return;
  if(option.letter!==task.parts[syllableIndex]){wrong();return}
  const wagon=document.querySelector(`#wagon-${syllableIndex}`);wagon.textContent=option.letter;wagon.classList.add('filled');button.disabled=true;button.classList.add('correct');syllableIndex++;speak(option.letter);
  if(syllableIndex===task.parts.length)correct(button);return;
 }
 if(value===task.target.id)correct(button);else wrong();
}
function correct(button){
 answered=true;button.classList.add('correct','pop');document.querySelectorAll('.answer-card').forEach(b=>b.disabled=true);document.querySelector('#feedback').textContent=task.feedback;document.querySelector('#feedback').classList.remove('try');document.querySelector('#continue').classList.remove('hidden');document.querySelector('.help-button')?.classList.add('hidden');
 save.stats[zone.id]||={independent:0,helped:0};save.stats[zone.id][helped?'helped':'independent']++;if(!helped)sessionIndependent++;persist();chime();narrate(task.feedback);
}
function wrong(){errors++;helped=true;const f=document.querySelector('#feedback');f.classList.add('try');f.textContent=errors===1?'Probemos otra vez. Escuchá con atención.':'Vamos a descubrirlo juntos.';if(errors>=2)helpTask();else speak(task.type==='syllable'?`Escuchá: ${task.parts[syllableIndex]}. Buscá ese vagón.`:task.spoken)}
function helpTask(){
 if(answered)return;helped=true;const expected=task.type==='syllable'?task.options.find(o=>o.letter===task.parts[syllableIndex]&&!document.querySelector(`.answer-card[data-value="${o.id}"]`).disabled)?.id:task.target.id;
 const cards=[...document.querySelectorAll('.answer-card')];const distractors=cards.filter(b=>b.dataset.value!==expected&&!b.disabled&&!b.classList.contains('removed'));
 if(errors>=2&&distractors.length>1){const removed=distractors[0];removed.classList.add('removed');removed.disabled=true;removed.setAttribute('aria-hidden','true')}
 if(errors>=3||task.type==='syllable'){const correctCard=cards.find(b=>b.dataset.value===expected);correctCard?.classList.add('hint')}
 const message=task.type==='syllable'?`Ahora va ${task.parts[syllableIndex]}. Tocá esa sílaba.`:task.hint;
 document.querySelector('#feedback').textContent=message;document.querySelector('#feedback').classList.add('try');speak(message);
 if(task.type==='letter'&&!task.model&&!task.focus){const focus=document.createElement('div');focus.className='task-focus';focus.innerHTML=`<div class="big-letter">${task.target.letter}</div>`;document.querySelector('.answer-grid').before(focus);task.model=task.target.letter}
}
function renderStory(){
 answered=false;errors=0;helped=false;view='game';
 if(storyStep<3){const scene=story.scenes[storyStep];task=null;app.innerHTML=gameFrame(`${instruction(story.title,'Escuchá el cuento y mirá los dibujos.')}<div class="story-scene">${art(scene.objects[0])}${character(scene.char)}${art(scene.objects[1])}</div><p class="story-text">${scene.text}</p><div class="game-actions"><button class="primary" data-action="story-next">${storyStep===2?'Una pregunta':'Siguiente'} ${icon('arrow')}</button></div>`);narrate(scene.text)}
 else{const target={id:story.answer};task={type:'picture',target,prompt:story.question,spoken:story.question,options:shuffle(story.options.map(id=>({id}))),feedback:'¡Sí! Escuchaste muy bien el cuento.',hint:`Recordemos el cuento. La respuesta es ${story.answer}.`};app.innerHTML=gameFrame(`${instruction(story.question)}${answers(task.options)}<div class="game-feedback" id="feedback" role="status" aria-live="polite"></div><div class="game-actions"><button class="help-button" data-action="help">${icon('help')} Una ayudita</button><button class="primary hidden" id="continue" data-action="next">Seguir ${icon('arrow')}</button></div>`);narrate(story.question)}
}
function next(){if(!answered)return;if(zone.id==='cuentos'){finish();return}round++;if(round>=3)finish();else renderTask()}
function finish(){
 cancelAudio();view='reward';const key=`${zone.id}-${mission}`,isNew=!save.completed[key];save.completed[key]=true;persist();updateHeader();const all=count()===30;
 const outside=zone.id==='cuentos'?story.outside:zone.id==='silabas'?'Prueben dar palmadas con las partes de una palabra.':zone.id==='letras'?'Busquen la letra que practicaron en un libro o un cartel.':zone.id==='sonidos'?'Nombren dos objetos que empiecen parecido.':'Busquen una de las palabras de hoy en un cuento.';
 app.innerHTML=gameFrame(`<div class="celebration"><div class="celebration-stars">${icon('star')}${icon('star')}${icon('star')}</div>${character(save.avatar)}<h1>${all?'¡La fiesta está lista!':'¡Una nueva aventura!'}</h1><p>${all?'Llenaste nuestro libro de descubrimientos. ¡Todos los amigos celebran con vos!':isNew?'Tu ayuda hace crecer la isla. Guardamos un nuevo descubrimiento en tu libro.':'¡Qué lindo volver a practicar! Tu descubrimiento ya está en el libro.'}</p><div class="reward-sticker ${zone.color}">${icon(zone.icon)}</div><strong>${zone.reward}</strong><div class="celebration-buttons"><button class="primary" data-action="map">Volver a la isla ${icon('home')}</button><button class="small-button" data-action="album">${icon('book')} Mi libro</button></div><button class="help-button" style="margin:auto" data-action="finish-session">Terminamos por hoy</button><div class="outside-tip"><strong>La aventura sigue fuera de la pantalla</strong>${outside}</div></div>${save.reduced?'':`<div class="confetti" aria-hidden="true">${Array.from({length:20},(_,i)=>`<i style="left:${(i*19)%100}%;animation-delay:${i*.07}s"></i>`).join('')}</div>`}`);
 chime();narrate(all?'¡La fiesta de los cuentos está lista! Gracias por ayudar a todos tus amigos.':'¡Muy bien! Completamos la aventura. Nuestra isla sigue creciendo.');window.scrollTo({top:0,behavior:'instant'});
}
function goodbye(){cancelAudio();view='goodbye';app.innerHTML=`<section class="goodbye">${character(save.avatar)}<h1>¡Hasta la próxima aventura!</h1><p>Tu libro queda guardado en este dispositivo.<br>Ahora podemos seguir descubriendo juntos fuera de la pantalla.</p><button class="primary" data-action="map">Volver a la isla ${icon('home')}</button></section>`;speak('¡Hasta la próxima aventura! Gracias por jugar conmigo.')}
function openAlbum(){
 cancelAudio();const dialog=document.querySelector('#album-dialog');document.querySelector('#album-content').innerHTML=`<div class="dialog-inner"><div class="dialog-head"><h2>Mi libro de descubrimientos</h2><button class="icon-button" data-action="close-album" aria-label="Cerrar libro">${icon('close')}</button></div><p>Cada aventura deja una pequeña huella. ¡Ya descubriste ${count()} de 30!</p><div class="album-grid">${ZONES.flatMap(z=>z.missions.map((m,i)=>`<div class="album-sticker ${save.completed[`${z.id}-${i}`]?'earned':''}" title="${m}" aria-label="${m}: ${save.completed[`${z.id}-${i}`]?'completada':'por descubrir'}">${icon(z.icon)}<small>${i+1}</small></div>`)).join('')}</div><div class="setting-group"><h3>Cuentos para volver a escuchar</h3><div class="album-story-list">${STORIES.map((s,i)=>`<button class="small-button" data-action="read-story" data-value="${i}"><span>${s.title}</span>${icon('arrow')}</button>`).join('')}</div></div></div>`;if(!dialog.open)dialog.showModal();
}
function openSettings(){cancelAudio();renderSettings();const d=document.querySelector('#settings-dialog');if(!d.open)d.showModal()}
function renderSettings(){
 const independent=Object.values(save.stats).reduce((a,s)=>a+s.independent,0),assisted=Object.values(save.stats).reduce((a,s)=>a+s.helped,0);
 document.querySelector('#settings-content').innerHTML=`<div class="dialog-inner"><div class="dialog-head"><h2>Un juego a su ritmo</h2><button class="icon-button" data-action="close-settings" aria-label="Cerrar opciones">${icon('close')}</button></div><p>Espacio para acompañantes. La edad orienta el recorrido; cada chico puede explorar a su ritmo.</p><div class="setting-group"><h3>Recorrido inicial</h3><div class="age-picker">${ages(true)}</div></div><div class="setting-group"><h3>Un amigo para la aventura</h3><div class="avatar-picker">${avatars()}</div></div><div class="toggle-row"><span>Voz y sonidos</span><button class="toggle ${save.sound?'on':''}" data-action="toggle-sound" role="switch" aria-checked="${save.sound}" aria-label="Voz y sonidos"></button></div><div class="toggle-row"><span>Reducir animaciones</span><button class="toggle ${save.reduced?'on':''}" data-action="toggle-motion" role="switch" aria-checked="${save.reduced}" aria-label="Reducir animaciones"></button></div><div class="stats"><div class="stat"><strong>${count()}</strong><span>Aventuras</span></div><div class="stat"><strong>${independent}</strong><span>Sin ayuda</span></div><div class="stat"><strong>${assisted}</strong><span>Con ayuda</span></div></div><ul class="progress-list">${ZONES.map(z=>`<li><span>${z.title}</span><strong>${zoneCount(z.id)}/6 exploradas</strong></li>`).join('')}</ul><div class="settings-note">El progreso se guarda solo en este navegador. Las respuestas con pistas se registran aparte. Estos datos describen la práctica; no son una evaluación educativa.<br><br>La narración depende de las voces disponibles en el dispositivo. Las actividades auditivas se disfrutan mejor con el sonido activado y un adulto cerca.${storageAvailable?'':'<br><strong>El guardado no está disponible en este navegador.</strong>'}</div><button class="danger-button" data-action="reset-confirm">Empezar un libro nuevo</button></div>`;
}
function settingsChanged(){persist();updateHeader();if(document.querySelector('#settings-dialog').open)renderSettings();if(view==='welcome')welcome();else if(view==='map')map()}
function handleAction(event){
 const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;const action=b.dataset.action,value=b.dataset.value;
 if(action==='start'){save.started=true;persist();map();narrate('¡Bienvenido a la isla de las palabras! Tocá un lugar para comenzar.')}
 else if(action==='avatar'){save.avatar=value;settingsChanged()}
 else if(action==='age'){save.age=Number(value);settingsChanged();if(view==='game'||view==='reward')toast('El nuevo recorrido se aplicará en la próxima aventura.')}
 else if(action==='map')map();
 else if(action==='zone')showZone(value);
 else if(action==='mission')startMission(value);
 else if(action==='back-zone')showZone(zone.id);
 else if(action==='repeat')speak(zone.id==='cuentos'&&storyStep<3?story.scenes[storyStep].text:task?.spoken||'Elegí una aventura.');
 else if(action==='answer')answer(value,b);
 else if(action==='help')helpTask();
 else if(action==='next')next();
 else if(action==='story-next'){cancelAudio();storyStep++;renderStory()}
 else if(action==='album')openAlbum();
 else if(action==='close-album')document.querySelector('#album-dialog').close();
 else if(action==='read-story'){document.querySelector('#album-dialog').close();zone=ZONES.find(z=>z.id==='cuentos');startMission(value)}
 else if(action==='finish-session')goodbye();
 else if(action==='close-settings')document.querySelector('#settings-dialog').close();
 else if(action==='toggle-sound'){save.sound=!save.sound;cancelAudio();settingsChanged()}
 else if(action==='toggle-motion'){save.reduced=!save.reduced;settingsChanged()}
 else if(action==='reset-confirm'){document.querySelector('#settings-content').innerHTML=`<div class="dialog-inner"><div class="dialog-head"><h2>¿Un libro nuevo?</h2></div><p>Se borrarán las aventuras y los descubrimientos guardados en este navegador.</p><div class="celebration-buttons"><button class="small-button" data-action="reset-cancel">Conservar mi libro</button><button class="primary" data-action="reset">Sí, empezar de nuevo</button></div></div>`}
 else if(action==='reset-cancel')renderSettings();
 else if(action==='reset'){save.completed={};save.stats={};save.started=false;persist();document.querySelector('#settings-dialog').close();welcome();toast('Tu nueva aventura está lista.')}
}
document.addEventListener('click',handleAction);
document.querySelector('#sound').addEventListener('click',()=>{save.sound=!save.sound;cancelAudio();persist();updateHeader();if(save.sound)speak('¡Listos para escuchar!')});
document.querySelector('#brand').addEventListener('click',welcome);
document.querySelector('#settings-button').addEventListener('click',openSettings);
document.querySelector('#album-button').addEventListener('click',openAlbum);
document.querySelectorAll('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}})});
document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelAudio()});
window.addEventListener('pagehide',cancelAudio);
welcome();
