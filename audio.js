import {ISLAND_BY_ID,SPECIES_BY_ID} from './data.js';

const PATTERNS=[
  {steps:[0,8,16,24,32,40,48,56,64,72,80,88,96,104,112,120],vel:.95},
  {steps:[4,12,20,28,36,44,52,60,68,76,84,92,100,108,116,124],vel:.58},
  {steps:[0,8,16,24,32,40,48,56,64,72,80,88,96,104,112,120],notes:[0,0,5,5,3,3,4,4,0,0,5,5,3,3,4,4],vel:.74},
  {steps:[2,6,10,14,18,22,26,30,34,38,42,46,50,54,58,62,66,70,74,78,82,86,90,94,98,102,106,110,114,118,122,126],notes:[0,4,7,4],vel:.42},
  {steps:[0,3,6,11,16,19,23,27,32,35,38,43,48,51,54,59,64,67,70,75,80,83,86,91,96,99,102,107,112,115,118,123],notes:[0,2,4,7,5,4,2,0],vel:.62,from:16},
  {steps:[8,14,24,30,40,46,56,62,72,78,88,94,104,110,120,126],notes:[7,9,5,4],vel:.48,from:32},
  {steps:[0,16,32,48,64,80,96,112],notes:[0,5,3,4],vel:.36,from:48,duration:1.8},
  {steps:[64,68,72,76,80,84,88,92,96,100,104,108,112,116,120,124],notes:[12,9,7,5,7,9,12,14],vel:.67,from:64}
];
const CHORD_ROOTS=[0,5,3,4,0,5,3,4];

export class AudioEngine{
  constructor(onCue){this.ctx=null;this.master=null;this.music=null;this.sfx=null;this.wet=null;this.ir=null;this.buffers=new Map();this.manifest=null;this.timer=null;this.playing=false;this.currentIsland=null;this.startTime=0;this.nextStep=0;this.onCue=onCue;this.rr=0;this.settings={master:.9,music:.9};}
  async init(){
    if(this.ctx) return;
    this.ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});
    this.master=this.ctx.createGain(); this.music=this.ctx.createGain(); this.sfx=this.ctx.createGain(); this.wet=this.ctx.createGain();
    const comp=this.ctx.createDynamicsCompressor(); comp.threshold.value=-10;comp.knee.value=16;comp.ratio.value=5;comp.attack.value=.003;comp.release.value=.18;
    this.music.connect(comp);this.wet.connect(comp);this.sfx.connect(comp);comp.connect(this.master);const limiter=this.ctx.createDynamicsCompressor();limiter.threshold.value=-1;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.001;limiter.release.value=.08;this.master.connect(limiter);limiter.connect(this.ctx.destination);
    this.setVolumes(this.settings);
    this.manifest=await fetch('audio-manifest.json').then(r=>r.json());
    const ir=await this.loadBuffer('room_ir.wav'); const conv=this.ctx.createConvolver();conv.buffer=ir;this.reverb=conv;conv.connect(this.wet);this.wet.gain.value=.22;
  }
  setVolumes(s){this.settings={...this.settings,...s};if(this.master)this.master.gain.setTargetAtTime(this.settings.master??.9,this.ctx.currentTime,.02);if(this.music)this.music.gain.setTargetAtTime(this.settings.music??.9,this.ctx.currentTime,.02);if(this.sfx)this.sfx.gain.setTargetAtTime(this.settings.sfx??.85,this.ctx.currentTime,.02)}
  async loadBuffer(file){if(this.buffers.has(file))return this.buffers.get(file);const arr=await fetch(file).then(r=>r.arrayBuffer());const b=await this.ctx.decodeAudioData(arr);this.buffers.set(file,b);return b}
  async preloadForIsland(islandId){await this.init();const isl=ISLAND_BY_ID[islandId];const inst=[...new Set(isl.roster.map(id=>SPECIES_BY_ID[id].instrument))];await Promise.all(inst.flatMap(k=>this.manifest[k].files.map(f=>this.loadBuffer(f))))}
  stop(){if(this.timer)clearInterval(this.timer);this.timer=null;this.playing=false;this.currentIsland=null;}
  async play(islandId,getPerformers){await this.preloadForIsland(islandId); if(this.ctx.state==='suspended')await this.ctx.resume();this.stop();this.playing=true;this.currentIsland=islandId;this.getPerformers=getPerformers;this.startTime=this.ctx.currentTime+.12;this.nextStep=0;this.timer=setInterval(()=>this.scheduler(),25);this.scheduler();}
  scheduler(){if(!this.playing)return;const isl=ISLAND_BY_ID[this.currentIsland];const stepDur=60/isl.bpm/4;const horizon=this.ctx.currentTime+.12;while(this.startTime+this.nextStep*stepDur<horizon){const global=this.nextStep;const step=global%isl.songSteps;this.scheduleStep(step,this.startTime+global*stepDur,stepDur);this.nextStep++;}}
  scheduleStep(step,time,stepDur){
    const performers=this.getPerformers().filter(p=>!p.muted);
    for(const inst of performers){const sp=SPECIES_BY_ID[inst.speciesId];const p=PATTERNS[sp.patternId];if(p.from!=null&&step<p.from)continue;const ix=p.steps.indexOf(step);if(ix<0)continue;
      const bar=Math.floor(step/16);const chord=CHORD_ROOTS[bar%CHORD_ROOTS.length];const noteOffset=(p.notes?.[ix%p.notes.length]??0)+chord;const midi=sp.rootMidi+noteOffset;this.trigger(sp.instrument,midi,time,p.vel??.6,sp.role==='lead'?.18:(sp.role==='bass'?-0.12:0),p.duration??stepDur*1.4);
      this.onCue?.({instanceId:inst.id,rig:sp.rig,audioTime:time,duration:p.duration??stepDur*.9});
    }
  }

  playSfx(kind='woodblock'){if(!this.ctx||!this.manifest)return;const m=this.manifest[kind];if(!m)return;const file=m.files[(this.rr++)%m.files.length],buf=this.buffers.get(file);if(!buf)return;const src=this.ctx.createBufferSource();src.buffer=buf;const g=this.ctx.createGain();g.gain.value=.22;src.connect(g);g.connect(this.sfx);src.start();}
  trigger(kind,midi,time,velocity=.7,pan=0,duration=.4){const m=this.manifest[kind];if(!m)return;const file=m.files[(this.rr++)%m.files.length];const buf=this.buffers.get(file);if(!buf)return;const src=this.ctx.createBufferSource();src.buffer=buf;if(m.pitched)src.playbackRate.value=Math.max(.62,Math.min(1.7,Math.pow(2,(midi-m.rootMidi)/12)));
    const gain=this.ctx.createGain();gain.gain.setValueAtTime(Math.max(.0001,velocity*.48),time);gain.gain.exponentialRampToValueAtTime(.0001,time+Math.min(buf.duration,duration+1.2));const panner=this.ctx.createStereoPanner();panner.pan.value=pan;src.connect(gain);gain.connect(panner);panner.connect(this.music);panner.connect(this.reverb);src.start(time);src.stop(time+Math.min(buf.duration,duration+1.4));}
}
