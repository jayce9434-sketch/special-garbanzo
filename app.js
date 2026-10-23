import {ISLANDS,ISLAND_BY_ID,SPECIES,SPECIES_BY_ID} from './data.js';
import {freshState,loadState,saveState,exportState,importState,addOwned,addXp,xpNeeded,islandInstances,placedInstances,bedsUsed,bedCap,canPlace,tickCoins,uniqueOwned} from './state.js';
import {AudioEngine} from './audio.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const fmt=n=>Math.floor(n).toLocaleString('en-US');
const q=new URLSearchParams(location.search);
const demo=q.get('demo')==='1';
let state=demo?freshState(true):loadState();
let audio=null, selectedId=null, moveMode=false, cueQueue=[], parentIds=[], timerHandle=null;
const now=()=>Date.now();

const ui={title:$('#titleScreen'),game:$('#gameScreen'),stage:$('#stage'),bg:$('#stageBg'),layer:$('#monsterLayer'),modal:$('#modalOverlay'),modalTitle:$('#modalTitle'),modalBody:$('#modalBody'),toast:$('#toast')};

function save(){if(!demo)saveState(state)}
function island(){return ISLAND_BY_ID[state.currentIsland]}
function stageList(){return placedInstances(state,state.currentIsland)}
function ownedList(){return islandInstances(state,state.currentIsland)}
function getInst(id){return state.owned.find(o=>o.id===id)}
const ATLAS_COLS=13, ATLAS_ROWS=4, ATLAS_PAGE_SIZE=52;
function spriteMeta(sp){
 const n=Math.max(0,(Number((sp.sprite.match(/\d+/)||['1'])[0])||1)-1), page=Math.floor(n/ATLAS_PAGE_SIZE), local=n%ATLAS_PAGE_SIZE;
 return {page,x:local%ATLAS_COLS,y:Math.floor(local/ATLAS_COLS)};
}
function escAttr(v=''){return String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function spriteView(sp,cls='',label='',extraStyle=''){const m=spriteMeta(sp),xp=m.x*100/(ATLAS_COLS-1),yp=m.y*100/(ATLAS_ROWS-1);return `<span class="sprite-view atlas-${m.page+1} ${cls}" style="--sprite-x:${xp}%;--sprite-y:${yp}%;${extraStyle}"${label?` role="img" aria-label="${escAttr(label)}"`:' aria-hidden="true"'}></span>`}
function rigPartView(sp,part,cls=''){const m=spriteMeta(sp),xp=m.x*100/(ATLAS_COLS-1),yp=m.y*100/(ATLAS_ROWS-1);return `<span class="rig-part rig-${part} rig-${part}-page-${m.page+1} ${cls}" style="--sprite-x:${xp}%;--sprite-y:${yp}%" aria-hidden="true"></span>`}
function bg(i){return i.background.replace('assets/islands/','island-')}
function showToast(text){ui.toast.textContent=text;ui.toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>ui.toast.classList.remove('show'),1900)}
function stopAudio(){audio?.stop();$('#playBtn').classList.remove('playing');$('#playBtn').textContent='Play song'}

function enter(){ui.title.classList.add('hidden');ui.game.classList.remove('hidden');render();const v=q.get('view');if(v&&v!=='island')setTimeout(()=>openPanel(v),120)}
$('#startBtn').onclick=enter;
if(demo)enter();

function render(){renderTop();renderStage();}
function renderTop(){
 $('#levelValue').textContent=state.level;$('#xpText').textContent=`${fmt(state.xp)} / ${fmt(xpNeeded(state.level))} XP`;$('#xpFill').style.width=Math.min(100,state.xp/xpNeeded(state.level)*100)+'%';
 $('#coinsValue').textContent=fmt(state.coins);$('#gemsValue').textContent=fmt(state.gems);$('#treatsValue').textContent=fmt(state.treats);
 document.body.classList.toggle('reduce-motion',!!state.settings.reduceMotion);document.body.classList.toggle('low-effects',!!state.settings.lowEffects);
}
function renderStage(){
 const i=island();ui.bg.style.backgroundImage=`url('${bg(i)}')`;$('#islandKind').textContent=i.kind.toUpperCase();$('#islandName').textContent=i.name;$('#islandDesc').textContent=i.description;
 const used=bedsUsed(state,i.id),cap=bedCap(state,i.id);$('#castleText').textContent=`${used} / ${cap} beds`;$('#castleFill').style.width=Math.min(100,used/cap*100)+'%';$('#castleBtn').textContent=state.castleLevels[i.id]<i.castleCaps.length-1?'Upgrade castle':'Castle maxed';
 ui.layer.innerHTML=''; stageList().forEach(inst=>ui.layer.append(makeMonster(inst)));
 $('#moveBtn').classList.toggle('active',moveMode);$('#moveBtn').textContent=moveMode?'Done moving':'Move mode';
}
function makeMonster(inst){
 const sp=SPECIES_BY_ID[inst.speciesId],el=document.createElement('div');el.className=`monster rig-${sp.rig}`;el.dataset.id=inst.id;el.style.left=inst.x+'%';el.style.top=inst.y+'%';el.style.zIndex=Math.round(inst.y*10);
 el.setAttribute('role','img');el.setAttribute('aria-label',sp.name);el.innerHTML=`<div class="monster-shadow"></div><div class="monster-rig">${rigPartView(sp,'core')}${rigPartView(sp,'leftleg')}${rigPartView(sp,'rightleg')}${rigPartView(sp,'head')}${rigPartView(sp,'leftarm')}${rigPartView(sp,'rightarm')}</div>${state.settings.showNames?`<div class="monster-name">${sp.name}<span>Level ${inst.level}</span></div>`:''}${inst.muted?'<div class="muted-badge">MUTED</div>':''}`;
 let moved=false,startX=0,startY=0;
 el.onpointerdown=e=>{if(!moveMode)return;startX=e.clientX;startY=e.clientY;moved=false;el.setPointerCapture(e.pointerId);el.classList.add('dragging')};
 el.onpointermove=e=>{if(!moveMode||!el.hasPointerCapture(e.pointerId))return;const r=ui.layer.getBoundingClientRect();if(Math.hypot(e.clientX-startX,e.clientY-startY)>5)moved=true;inst.x=Math.max(6,Math.min(94,(e.clientX-r.left)/r.width*100));inst.y=Math.max(32,Math.min(94,(e.clientY-r.top)/r.height*100));el.style.left=inst.x+'%';el.style.top=inst.y+'%';el.style.zIndex=Math.round(inst.y*10)};
 el.onpointerup=e=>{if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);el.classList.remove('dragging');if(moveMode){save();return}if(!moved){selectedId=inst.id;openPanel('monster')}};
 el.onclick=()=>{if(!moveMode){selectedId=inst.id;openPanel('monster')}};
 return el;
}

$('#moveBtn').onclick=()=>{moveMode=!moveMode;renderStage()};
$('#castleBtn').onclick=()=>openPanel('castle');
$('#collectBtn').onclick=collectAll;
$('#playBtn').onclick=toggleSong;
$$('[data-panel]').forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));
$('#closeModal').onclick=closePanel;
ui.modal.onclick=e=>{if(e.target===ui.modal)closePanel()};

function collectAll(){let n=0;for(const inst of ownedList()){n+=Math.floor(inst.storedCoins||0);inst.storedCoins=0}if(n<1)return showToast('No coins ready yet.');state.coins+=n;state.stats.collectedCoins+=n;save();renderTop();showToast(`Collected ${fmt(n)} coins.`)}
async function toggleSong(){if(audio?.playing){stopAudio();return}if(!audio)audio=new AudioEngine(c=>cueQueue.push(c));try{await audio.play(state.currentIsland,stageList);$('#playBtn').classList.add('playing');$('#playBtn').textContent='Stop song'}catch(e){console.error(e);showToast('Audio could not start. Tap Play again.')}}
const CUE_LEAD={strike:.145,shake:.045,pluck:.085,blow:.105,ring:.095,sing:.11};
const CUE_MS={strike:520,shake:380,pluck:440,blow:620,ring:500,sing:720};
function cueLoop(){
 if(audio?.ctx&&cueQueue.length){
  const t=audio.ctx.currentTime;
  while(cueQueue.length&&(cueQueue[0].audioTime-(CUE_LEAD[cueQueue[0].rig]||.06))<=t+.009){
   const c=cueQueue.shift(),el=document.querySelector(`.monster[data-id="${CSS.escape(c.instanceId)}"]`);
   if(el){
    const ms=CUE_MS[c.rig]||Math.max(260,c.duration*900);
    el.style.setProperty('--perf-ms',`${ms}ms`);
    el.classList.remove('performing');void el.offsetWidth;el.classList.add('performing');
    clearTimeout(el._perfTimer);el._perfTimer=setTimeout(()=>el.classList.remove('performing'),ms+30);
   }
  }
 }
 requestAnimationFrame(cueLoop)
}
requestAnimationFrame(cueLoop);

document.addEventListener('click',e=>{if(e.target.closest('button'))audio?.playSfx('woodblock')},{capture:true});

function openPanel(name){
 document.body.classList.add('modal-open');ui.modal.classList.remove('hidden');
 const table={map:['Island Map',panelMap],market:['Market',panelMarket],breed:['Breeding Grove',panelBreed],nursery:['Nursery',panelNursery],collection:['Collection',panelCollection],settings:['Settings',panelSettings],castle:['Castle and Beds',panelCastle],monster:['Monster Details',panelMonster],owner:['Owner Console',panelOwner]};
 const [title,fn]=table[name]||table.map;ui.modalTitle.textContent=title;ui.modalBody.innerHTML=fn();bindPanel(name);updateTimers();
}
function closePanel(){document.body.classList.remove('modal-open');ui.modal.classList.add('hidden');ui.modalBody.innerHTML='';parentIds=[]}

function panelMap(){return `<div class="map-grid">${ISLANDS.map(i=>{const unlocked=state.unlockedIslands.includes(i.id);return `<article class="island-card ${unlocked?'':'locked'}"><img src="${bg(i)}" alt="${i.name}"><div class="island-card-copy"><span class="eyebrow">${i.kind.toUpperCase()}</span><h3>${i.name}</h3><p>${i.description}</p><button data-world="${i.id}" class="${unlocked?'primary':''}">${unlocked?'Travel':`Unlock L${i.unlockLevel} - ${fmt(i.unlockCost)} coins`}</button></div></article>`}).join('')}</div>`}
function panelMarket(){const list=island().roster.map(id=>SPECIES_BY_ID[id]);return `<div class="shop-toolbar"><div><strong>${island().name} Market</strong><span>Four starters are purchasable. Hybrids come from breeding.</span></div><b>${fmt(state.coins)} coins</b></div><div class="species-grid">${list.map(sp=>`<article class="species-card ${uniqueOwned(state,sp.id)?'owned':''}"><div class="species-art">${spriteView(sp,"species-sprite",sp.name)}</div><h3>${sp.name}</h3><div class="tags"><span>${sp.tier}</span><span>${sp.instrument}</span><span>${sp.beds} bed${sp.beds===1?'':'s'}</span></div><p>${sp.elements.join(' + ')}</p>${sp.buyable?`<button data-buy="${sp.id}" ${state.coins<sp.price?'disabled':''}>Buy ${fmt(sp.price)}</button>`:'<span class="breed-only">Breed only</span>'}</article>`).join('')}</div>`}
function eligibleParents(){return ownedList().filter(o=>o.level>=4)}
function unionChild(a,b){if(!a||!b)return null;const e=[...new Set([...SPECIES_BY_ID[a.speciesId].elements,...SPECIES_BY_ID[b.speciesId].elements])].sort().join('|');return island().roster.map(x=>SPECIES_BY_ID[x]).find(sp=>sp.elements.slice().sort().join('|')===e)||null}
function panelBreed(){const job=state.breedJobs[state.currentIsland];if(job)return `<div class="job-card"><div class="egg-orb mystery ${job.ready?'ready':''}"></div><h3>${job.ready?'Breeding complete':'Breeding in progress'}</h3><p>The result stays hidden until the timer finishes.</p><p class="timer" data-timer="breed"></p><div class="action-row">${job.ready?'<button id="moveEgg" class="primary">Move egg to Nursery</button>':'<button data-rush="breed">Speed up</button>'}</div></div>`;const p=eligibleParents();return `<div class="breeding-layout"><div><p>Feed performers to level 4 to use them as parents.</p><div class="breed-picks">${p.map(o=>{const sp=SPECIES_BY_ID[o.speciesId];return `<button class="breed-pick" data-parent="${o.id}">${spriteView(sp,"breed-sprite",sp.name)}<span>${sp.name}</span><small>Level ${o.level}</small></button>`}).join('')||'<p class="notice">No eligible parents yet. Feed two monsters to level 4.</p>'}</div></div><aside id="breedPreview" class="preview-card"><h3>Choose two parents</h3><p>Element combinations determine the target hybrid.</p><button id="breedStart" class="primary" disabled>Breed</button></aside></div>`}
function panelNursery(){const job=state.nurseryJobs[state.currentIsland];if(!job)return `<div class="job-card"><div class="nest-art"></div><h3>The Nursery is empty</h3><p>Finish breeding, then move the egg here.</p></div>`;const sp=SPECIES_BY_ID[job.speciesId];return `<div class="job-card">${spriteView(sp,"hatch-preview",job.ready?sp.name:"Incubating egg",job.ready?"":"filter:brightness(0) opacity(.36);")}<h3>${job.ready?sp.name:'Incubating egg'}</h3><p class="timer" data-timer="nursery"></p><div class="action-row">${job.ready?'<button id="hatchBtn" class="primary">Hatch</button>':'<button data-rush="nursery">Speed up</button>'}</div></div>`}
function panelCollection(){return `<div class="collection-tools"><input id="collectionSearch" placeholder="Search 104 species"><select id="collectionIsland"><option value="all">All destinations</option>${ISLANDS.map(i=>`<option value="${i.id}">${i.name}</option>`).join('')}</select><span>${state.owned.length} owned instances / ${SPECIES.filter(s=>uniqueOwned(state,s.id)).length} discovered species</span></div><div id="collectionGrid" class="collection-grid">${collectionCards('', 'all')}</div>`}
function collectionCards(term,world){term=term.toLowerCase();return SPECIES.filter(sp=>(world==='all'||sp.island===world)&&(!term||sp.name.toLowerCase().includes(term)||sp.instrument.toLowerCase().includes(term)||ISLAND_BY_ID[sp.island].name.toLowerCase().includes(term))).map(sp=>`<article class="collection-card ${uniqueOwned(state,sp.id)?'':'undiscovered'}">${spriteView(sp,"collection-sprite",uniqueOwned(state,sp.id)?sp.name:"Undiscovered")}<div><strong>${uniqueOwned(state,sp.id)?sp.name:'Undiscovered'}</strong><span>${ISLAND_BY_ID[sp.island].name}</span><small>${sp.tier} | ${sp.instrument}</small></div></article>`).join('')}
function panelCastle(){const i=island(),lv=state.castleLevels[i.id],next=i.castleCaps[lv+1],cost=castleUpgradeCost(i,lv);return `<div class="preview-card"><h3>${i.name} Castle</h3><div class="stat-grid"><div><span>USED BEDS</span><strong>${bedsUsed(state,i.id)}</strong></div><div><span>CURRENT CAP</span><strong>${bedCap(state,i.id)}</strong></div><div><span>FULL ROSTER NEEDS</span><strong>${i.requiredCollectionBeds}</strong></div><div><span>FINAL CAP</span><strong>${i.maxCastleBeds}</strong></div></div><p>The final castle deliberately fits one of every native species with 25 percent headroom rounded up.</p>${next?`<button id="castleUpgrade" class="primary" ${state.coins<cost?'disabled':''}>Upgrade to ${next} beds - ${fmt(cost)} coins</button>`:'<p class="notice">Maximum castle reached.</p>'}</div>`}
function panelMonster(){let inst=getInst(selectedId);if(!inst){inst=stageList()[0]||ownedList()[0];if(inst)selectedId=inst.id}if(!inst)return '<p class="notice">No monster exists on this island yet.</p>';const sp=SPECIES_BY_ID[inst.speciesId],cost=feedCost(inst,sp);return `<div class="monster-info"><div class="monster-portrait">${spriteView(sp,"portrait-sprite",sp.name)}</div><div class="monster-details"><span class="eyebrow">${sp.tier.toUpperCase()}</span><h3>${sp.name}</h3><p>${sp.description}</p><div class="tags"><span>${sp.elements.join(' + ')}</span><span>${sp.role}</span><span>${sp.instrument}</span></div><div class="stat-grid"><div><span>LEVEL</span><strong>${inst.level}</strong></div><div><span>BEDS</span><strong>${sp.beds}</strong></div><div><span>COINS READY</span><strong>${fmt(inst.storedCoins)}</strong></div><div><span>FEED PROGRESS</span><strong>${inst.feedProgress}/4</strong></div></div><div class="action-row"><button id="feedMonster" class="primary" ${state.treats<cost||inst.level>=15?'disabled':''}>Feed ${fmt(cost)} treats</button><button id="collectMonster" ${inst.storedCoins<1?'disabled':''}>Collect ${fmt(inst.storedCoins)}</button><button id="placeMonster">${inst.placed?'Store':canPlace(state,inst)?'Place':'No beds'}</button><button id="muteMonster">${inst.muted?'Unmute':'Mute'}</button></div></div></div>`}
function slider(key,label){const v=Math.round((state.settings[key]??.9)*100);return `<div class="slider-row"><span>${label}</span><input data-volume="${key}" type="range" min="0" max="2000" value="${v}"><strong data-volout="${key}">${v}%</strong></div>`}
function panelSettings(){return `<div class="settings-grid"><div><h3>Audio</h3>${slider('master','Master')}${slider('music','Music')}${slider('sfx','SFX')}<label class="toggle"><input id="showNames" type="checkbox" ${state.settings.showNames?'checked':''}> Show monster names</label><label class="toggle"><input id="reduceMotion" type="checkbox" ${state.settings.reduceMotion?'checked':''}> Reduce motion</label><label class="toggle"><input id="lowEffects" type="checkbox" ${state.settings.lowEffects?'checked':''}> Low visual effects</label><button id="ownerOpen">Owner console</button><p class="notice">Volume controls support 0 to 2000 percent. Extreme settings pass through a final limiter.</p></div><div><h3>Save backup</h3><textarea id="saveText" spellcheck="false" placeholder="Exported save code appears here"></textarea><div class="action-row"><button id="saveExport">Export</button><button id="saveImport">Import</button></div><p>Progress saves locally. Export before clearing browser data or replacing a deployed build.</p></div></div>`}
function panelOwner(){return `<div class="preview-card"><h3>Owner Console</h3><p>This static GitHub Pages build cannot hide a client-side code with real server security. These controls are development conveniences.</p><input id="ownerCode" style="width:100%;padding:11px;border-radius:11px;border:1px solid rgba(255,255,255,.15);background:#0a1b2e;color:white" type="password" placeholder="Access code"><div class="action-row"><button id="ownerUnlock" class="primary">Unlock</button></div><div id="ownerTools"></div></div>`}

function bindPanel(name){
 if(name==='map')$$('[data-world]').forEach(b=>b.onclick=()=>worldAction(b.dataset.world));
 if(name==='market')$$('[data-buy]').forEach(b=>b.onclick=()=>buyMonster(b.dataset.buy));
 if(name==='breed')bindBreed();
 if(name==='nursery')bindNursery();
 if(name==='collection'){const s=$('#collectionSearch'),w=$('#collectionIsland');const refresh=()=>$('#collectionGrid').innerHTML=collectionCards(s.value,w.value);s.oninput=refresh;w.onchange=refresh}
 if(name==='castle'&&$('#castleUpgrade'))$('#castleUpgrade').onclick=upgradeCastle;
 if(name==='monster')bindMonster();
 if(name==='settings')bindSettings();
 if(name==='owner')bindOwner();
}
function worldAction(id){const i=ISLAND_BY_ID[id];if(state.unlockedIslands.includes(id)){stopAudio();state.currentIsland=id;save();closePanel();render();return}if(state.level<i.unlockLevel)return showToast(`Reach level ${i.unlockLevel} first.`);if(state.coins<i.unlockCost)return showToast('Not enough coins.');state.coins-=i.unlockCost;state.unlockedIslands.push(id);state.stats.islandsUnlocked=state.unlockedIslands.length;addXp(state,350+i.unlockLevel*25);save();closePanel();render();showToast(`${i.name} unlocked.`)}
function buyMonster(id){const sp=SPECIES_BY_ID[id];if(!sp?.buyable||state.coins<sp.price)return;state.coins-=sp.price;const inst=addOwned(state,id,{placed:false});if(canPlace(state,inst)){inst.placed=true;inst.x=18+Math.random()*64;inst.y=55+Math.random()*31}addXp(state,55);save();render();openPanel('market');showToast(`${sp.name} joined the island.`)}
function feedCost(inst,sp){return Math.round(75*Math.pow(1.25,inst.level)+sp.beds*40)}
function bindMonster(){const inst=getInst(selectedId);if(!inst)return;const sp=SPECIES_BY_ID[inst.speciesId],cost=feedCost(inst,sp);$('#feedMonster').onclick=()=>{if(state.treats<cost||inst.level>=15)return;state.treats-=cost;inst.feedProgress++;state.stats.feedings++;if(inst.feedProgress>=4){inst.feedProgress=0;inst.level++;addXp(state,22+inst.level*4);showToast(`${sp.name} reached level ${inst.level}.`)}save();render();openPanel('monster')};$('#collectMonster').onclick=()=>{const n=Math.floor(inst.storedCoins);if(n<1)return;inst.storedCoins=0;state.coins+=n;state.stats.collectedCoins+=n;save();render();openPanel('monster')};$('#placeMonster').onclick=()=>{if(inst.placed)inst.placed=false;else if(canPlace(state,inst)){inst.placed=true;inst.x=50;inst.y=72}else return;save();render();openPanel('monster')};$('#muteMonster').onclick=()=>{inst.muted=!inst.muted;save();render();openPanel('monster')}}
function bindBreed(){parentIds=[];$$('[data-parent]').forEach(b=>b.onclick=()=>{const id=b.dataset.parent;if(parentIds.includes(id))parentIds=parentIds.filter(x=>x!==id);else{if(parentIds.length>=2)parentIds.shift();parentIds.push(id)}$$('[data-parent]').forEach(x=>x.classList.toggle('selected',parentIds.includes(x.dataset.parent)));updateBreedPreview()});if($('#moveEgg'))$('#moveEgg').onclick=moveEgg;$$('[data-rush="breed"]').forEach(b=>b.onclick=()=>rushJob('breed'))}
function updateBreedPreview(){const box=$('#breedPreview');if(!box)return;const a=getInst(parentIds[0]),b=getInst(parentIds[1]),child=unionChild(a,b);if(parentIds.length<2){box.innerHTML='<h3>Choose two parents</h3><p>Element combinations determine the target hybrid.</p><button id="breedStart" class="primary" disabled>Breed</button>';return}const chance=child?Math.max(34,82-child.beds*10):0;box.innerHTML=`${child?`${spriteView(child,"preview-monster",child.name)}<h3>${child.name}</h3><p>${child.elements.join(' + ')}</p><div class="chance-row"><span>Success</span><strong>${chance}%</strong></div>`:'<h3>No direct hybrid</h3><p>This pairing will return one parent.</p>'}<button id="breedStart" class="primary">Breed</button>`;$('#breedStart').onclick=startBreed}
function startBreed(){const a=getInst(parentIds[0]),b=getInst(parentIds[1]);if(!a||!b||a.id===b.id)return;const target=unionChild(a,b),chance=target?Math.max(.34,.82-target.beds*.1):0;const result=target&&Math.random()<chance?target:SPECIES_BY_ID[(Math.random()<.5?a:b).speciesId];state.breedJobs[state.currentIsland]={speciesId:result.id,end:now()+Math.max(25,result.breedingSeconds)*1000,ready:false};state.stats.bred++;save();openPanel('breed')}
function bindNursery(){if($('#hatchBtn'))$('#hatchBtn').onclick=hatch;$$('[data-rush="nursery"]').forEach(b=>b.onclick=()=>rushJob('nursery'))}
function moveEgg(){const job=state.breedJobs[state.currentIsland];if(!job?.ready)return;if(state.nurseryJobs[state.currentIsland])return showToast('Nursery is occupied.');const sp=SPECIES_BY_ID[job.speciesId];state.nurseryJobs[state.currentIsland]={speciesId:sp.id,end:now()+Math.max(20,sp.incubationSeconds)*1000,ready:false};state.breedJobs[state.currentIsland]=null;save();openPanel('nursery')}
function hatch(){const job=state.nurseryJobs[state.currentIsland];if(!job?.ready)return;const inst=addOwned(state,job.speciesId,{placed:false});if(canPlace(state,inst)){inst.placed=true;inst.x=18+Math.random()*64;inst.y=56+Math.random()*30}state.nurseryJobs[state.currentIsland]=null;state.stats.hatched++;addXp(state,100+SPECIES_BY_ID[inst.speciesId].beds*40);save();closePanel();render();showToast(`${SPECIES_BY_ID[inst.speciesId].name} hatched.`)}
function rushJob(type){const job=type==='breed'?state.breedJobs[state.currentIsland]:state.nurseryJobs[state.currentIsland];if(!job)return;const cost=Math.max(1,Math.ceil(Math.max(0,job.end-now())/60000));if(state.gems<cost)return showToast('Not enough gems.');state.gems-=cost;job.end=now();job.ready=true;save();openPanel(type==='breed'?'breed':'nursery')}
function updateTimers(){clearInterval(timerHandle);const tick=()=>{$$('[data-timer]').forEach(el=>{const type=el.dataset.timer,job=type==='breed'?state.breedJobs[state.currentIsland]:state.nurseryJobs[state.currentIsland];if(!job)return;const ms=job.end-now();if(ms<=0&&!job.ready){job.ready=true;save();openPanel(type==='breed'?'breed':'nursery');return}el.textContent=job.ready?'Ready':clock(ms)})};tick();timerHandle=setInterval(tick,500)}
function clock(ms){const s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60),r=s%60;return `${m}m ${String(r).padStart(2,'0')}s`}
function castleUpgradeCost(i,lv){return Math.round(1800*Math.pow(2.15,lv)+i.unlockLevel*420)}
function upgradeCastle(){const i=island(),lv=state.castleLevels[i.id],cost=castleUpgradeCost(i,lv);if(lv>=i.castleCaps.length-1||state.coins<cost)return;state.coins-=cost;state.castleLevels[i.id]++;addXp(state,160);save();render();openPanel('castle')}
function bindSettings(){$$('[data-volume]').forEach(sl=>sl.oninput=()=>{const k=sl.dataset.volume,v=+sl.value;state.settings[k]=v/100;$(`[data-volout="${k}"]`).textContent=v+'%';audio?.setVolumes(state.settings);save()});$('#showNames').onchange=e=>{state.settings.showNames=e.target.checked;save();render()};$('#reduceMotion').onchange=e=>{state.settings.reduceMotion=e.target.checked;save();renderTop()};$('#lowEffects').onchange=e=>{state.settings.lowEffects=e.target.checked;save();renderTop()};$('#saveExport').onclick=()=>$('#saveText').value=exportState(state);$('#saveImport').onclick=()=>{try{state=importState($('#saveText').value);save();closePanel();render();showToast('Save imported.')}catch{showToast('Invalid save code.')}};$('#ownerOpen').onclick=()=>openPanel('owner')}
async function hashText(t){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function bindOwner(){$('#ownerUnlock').onclick=async()=>{if(await hashText($('#ownerCode').value.trim())!=='666e5384e8cdeba77d251198b58adf3e48fa957cd6ab402e093a286a37795aeb')return showToast('Wrong access code.');$('#ownerTools').innerHTML='<div class="action-row"><button id="ownCoins">Add 1M coins</button><button id="ownGems">Add 5000 gems</button><button id="ownTreats">Add 1M treats</button><button id="ownWorlds">Unlock all</button><button id="ownRoster">Grant current roster</button></div>';$('#ownCoins').onclick=()=>{state.coins+=1e6;save();renderTop()};$('#ownGems').onclick=()=>{state.gems+=5000;save();renderTop()};$('#ownTreats').onclick=()=>{state.treats+=1e6;save();renderTop()};$('#ownWorlds').onclick=()=>{state.unlockedIslands=ISLANDS.map(i=>i.id);state.level=Math.max(40,state.level);save();showToast('All destinations unlocked.')};$('#ownRoster').onclick=()=>{island().roster.forEach(id=>{if(!uniqueOwned(state,id))addOwned(state,id,{level:10,placed:false})});for(const o of ownedList())if(!o.placed&&canPlace(state,o)){o.placed=true;o.x=12+Math.random()*76;o.y=52+Math.random()*36}save();closePanel();render()}}}

setInterval(()=>{tickCoins(state,1);if(!demo)save()},1000);
window.addEventListener('visibilitychange',()=>{if(document.hidden)save()});window.addEventListener('beforeunload',save);
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
