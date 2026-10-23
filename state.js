import {ISLANDS, ISLAND_BY_ID, SPECIES_BY_ID} from './data.js';

const SAVE_KEY='bugsong-islands-save-v1';
export const SAVE_VERSION=1;
const now=()=>Date.now();
let idCounter=0;
const uid=()=>`m_${Date.now().toString(36)}_${(++idCounter).toString(36)}`;

export function freshState(demo=false){
  const castleLevels=Object.fromEntries(ISLANDS.map(i=>[i.id,0]));
  const breedJobs=Object.fromEntries(ISLANDS.map(i=>[i.id,null]));
  const nurseryJobs=Object.fromEntries(ISLANDS.map(i=>[i.id,null]));
  const state={
    version:SAVE_VERSION, level:1, xp:0, coins:12000, gems:25, treats:1200, essence:0,
    currentIsland:'meadow', unlockedIslands:['meadow'], castleLevels, breedJobs, nurseryJobs,
    owned:[], settings:{master:0.9,music:0.9,sfx:0.85,showNames:true,reduceMotion:false,lowEffects:false},
    stats:{hatched:0,bred:0,collectedCoins:0,feedings:0,islandsUnlocked:1},
    lastSeen:now(), createdAt:now()
  };
  addOwned(state,'meadow_1',{level:2,placed:true,x:38,y:70});
  if(demo){
    state.level=40; state.xp=0; state.coins=9_999_999; state.gems=9999; state.treats=999999;
    state.unlockedIslands=ISLANDS.map(i=>i.id);
    for(const isl of ISLANDS) state.castleLevels[isl.id]=isl.castleCaps.length-1;
    for(const isl of ISLANDS){
      isl.roster.forEach((sid,j)=>{if(!state.owned.some(o=>o.speciesId===sid))addOwned(state,sid,{level:10,placed:true,x:15+(j%4)*23,y:54+Math.floor(j/4)*25})});
    }
  }
  return state;
}

export function addOwned(state,speciesId,opts={}){
  const sp=SPECIES_BY_ID[speciesId]; if(!sp) return null;
  const inst={id:uid(),speciesId,level:opts.level??1,feedProgress:0,placed:opts.placed??false,
    x:opts.x??50,y:opts.y??72,muted:false,storedCoins:0,lastCoinAt:now()};
  state.owned.push(inst); return inst;
}

function sanitizeNumber(v,min,max,fallback){return Number.isFinite(+v)?Math.min(max,Math.max(min,+v)):fallback}
export function validateState(raw){
  const base=freshState(false);
  if(!raw||typeof raw!=='object') return base;
  const s={...base,...raw};
  s.version=SAVE_VERSION;
  s.level=Math.floor(sanitizeNumber(s.level,1,200,1)); s.xp=sanitizeNumber(s.xp,0,1e12,0);
  s.coins=sanitizeNumber(s.coins,0,1e15,0); s.gems=sanitizeNumber(s.gems,0,1e9,0); s.treats=sanitizeNumber(s.treats,0,1e15,0); s.essence=sanitizeNumber(s.essence,0,1e15,0);
  s.unlockedIslands=[...new Set((Array.isArray(s.unlockedIslands)?s.unlockedIslands:['meadow']).filter(id=>ISLAND_BY_ID[id]))];
  if(!s.unlockedIslands.includes('meadow')) s.unlockedIslands.unshift('meadow');
  s.currentIsland=ISLAND_BY_ID[s.currentIsland]&&s.unlockedIslands.includes(s.currentIsland)?s.currentIsland:'meadow';
  s.castleLevels={...base.castleLevels,...(s.castleLevels||{})};
  for(const isl of ISLANDS) s.castleLevels[isl.id]=Math.max(0,Math.min(isl.castleCaps.length-1,Math.floor(+s.castleLevels[isl.id]||0)));
  s.breedJobs={...base.breedJobs,...(s.breedJobs||{})}; s.nurseryJobs={...base.nurseryJobs,...(s.nurseryJobs||{})};
  s.settings={...base.settings,...(s.settings||{})}; s.stats={...base.stats,...(s.stats||{})};
  s.owned=(Array.isArray(s.owned)?s.owned:[]).filter(o=>o&&SPECIES_BY_ID[o.speciesId]).slice(0,1000).map(o=>({
    id:String(o.id||uid()),speciesId:o.speciesId,level:Math.floor(sanitizeNumber(o.level,1,15,1)),feedProgress:Math.floor(sanitizeNumber(o.feedProgress,0,3,0)),
    placed:!!o.placed,x:sanitizeNumber(o.x,5,95,50),y:sanitizeNumber(o.y,32,92,70),muted:!!o.muted,
    storedCoins:sanitizeNumber(o.storedCoins,0,1e12,0),lastCoinAt:sanitizeNumber(o.lastCoinAt,0,now(),now())
  }));
  if(!s.owned.length) addOwned(s,'meadow_1',{level:2,placed:true,x:38,y:70});
  s.lastSeen=sanitizeNumber(s.lastSeen,0,now(),now());
  accrueOffline(s);
  return s;
}

export function accrueOffline(state){
  const t=now(); const capSeconds=12*3600;
  for(const inst of state.owned){
    const sp=SPECIES_BY_ID[inst.speciesId]; if(!sp) continue;
    const elapsed=Math.min(capSeconds,Math.max(0,(t-(inst.lastCoinAt||t))/1000));
    const cap=sp.maxCoins*(1+0.16*(inst.level-1));
    const rate=sp.coinPerMinute*(1+0.12*(inst.level-1))/60;
    inst.storedCoins=Math.min(cap,(inst.storedCoins||0)+elapsed*rate); inst.lastCoinAt=t;
  }
  state.lastSeen=t;
}

export function tickCoins(state,dtSeconds){
  for(const inst of state.owned){
    const sp=SPECIES_BY_ID[inst.speciesId]; if(!sp) continue;
    const cap=sp.maxCoins*(1+0.16*(inst.level-1));
    const rate=sp.coinPerMinute*(1+0.12*(inst.level-1))/60;
    inst.storedCoins=Math.min(cap,inst.storedCoins+rate*dtSeconds); inst.lastCoinAt=now();
  }
}

export function loadState(){
  const demo=new URLSearchParams(location.search).get('demo')==='1';
  if(demo) return freshState(true);
  try{return validateState(JSON.parse(localStorage.getItem(SAVE_KEY)||'null'))}catch{return freshState(false)}
}
export function saveState(state){try{state.lastSeen=now();localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(e){console.warn('Save failed',e)}}
export function exportState(state){return btoa(unescape(encodeURIComponent(JSON.stringify({...state,lastSeen:now()}))))}
export function importState(code){const raw=JSON.parse(decodeURIComponent(escape(atob(code.trim()))));return validateState(raw)}

export function xpNeeded(level){return Math.round(100+level*65+Math.pow(level,1.35)*18)}
export function addXp(state,amount){state.xp+=amount;let up=false;while(state.xp>=xpNeeded(state.level)&&state.level<200){state.xp-=xpNeeded(state.level);state.level++;state.gems+=2;up=true;}return up}
export function islandOwned(state,id){return state.unlockedIslands.includes(id)}
export function uniqueOwned(state,speciesId){return state.owned.some(o=>o.speciesId===speciesId)}
export function firstOwned(state,speciesId){return state.owned.find(o=>o.speciesId===speciesId)}
export function islandInstances(state,islandId){return state.owned.filter(o=>SPECIES_BY_ID[o.speciesId]?.island===islandId)}
export function placedInstances(state,islandId){return islandInstances(state,islandId).filter(o=>o.placed)}
export function bedsUsed(state,islandId){return placedInstances(state,islandId).reduce((a,o)=>a+(SPECIES_BY_ID[o.speciesId]?.beds||0),0)}
export function bedCap(state,islandId){const isl=ISLAND_BY_ID[islandId];return isl.castleCaps[state.castleLevels[islandId]||0]}
export function canPlace(state,inst){const sp=SPECIES_BY_ID[inst.speciesId];return !inst.placed && bedsUsed(state,sp.island)+sp.beds<=bedCap(state,sp.island)}
