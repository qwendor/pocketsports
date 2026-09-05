/* ============================== MUSIC ENGINE (procedural beats, driven by the game clock) ============================== */
const MUSIC={bpm:120,style:'pop',lastSched:-1,on:false,seq:null,
  start(bpm,style){ this.bpm=bpm; this.style=style||'pop'; this.lastSched=-1; this.on=true; AUD.init(); },
  stop(){ this.on=false; },
  // schedule every 8th-note event whose game time falls in (lastSched, gameT + lookahead]
  tick(gameT){ if(!this.on||!AUD.ctx)return; const c=AUD.ctx; const step=60/this.bpm/2; const look=.3; const from=Math.floor(this.lastSched/step)+1, to=Math.floor((gameT+look)/step);
    for(let i=Math.max(0,from);i<=to;i++){ const et=i*step; if(et<=this.lastSched)continue; const at=c.currentTime+Math.max(0,et-gameT); this.play(i,at); } this.lastSched=to*step; },
  play(i,at){ const c=AUD.ctx, e=i%8, bar=Math.floor(i/8), st=this.style;
    const kick=(t,v=.5)=>{ const o=c.createOscillator(),g=c.createGain(); o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(42,t+.12); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.001,t+.22); o.connect(g).connect(c.destination); o.start(t); o.stop(t+.25); };
    const noiseAt=(t,d,v,hp)=>{ const n=c.sampleRate*d,b=c.createBuffer(1,n,c.sampleRate),x=b.getChannelData(0); for(let k=0;k<n;k++)x[k]=(Math.random()*2-1)*(1-k/n); const s=c.createBufferSource(); s.buffer=b; const f=c.createBiquadFilter(); f.type='highpass'; f.frequency.value=hp; const g=c.createGain(); g.gain.value=v; s.connect(f).connect(g).connect(c.destination); s.start(t); };
    const tone=(t,f,d,type,v)=>{ const o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.001,t+d); o.connect(g).connect(c.destination); o.start(t); o.stop(t+d); };
    noiseAt(at,.04,e%2?.06:.1,7000); // hats on every 8th
    if(e===0||e===4||(st==='dance'&&e===2)||(st==='dance'&&e===6))kick(at,.55);
    if(e===2||e===6)noiseAt(at,.14,.28,1500), tone(at,190,.1,'triangle',.18); // snare
    const prog=[[55,110,165,220],[41,82,123,165],[49,98,147,196],[36,73,110,147]]; const root=prog[bar%4]; const bassF=root[e%2?1:0]*(e%4===3?1.5:1);
    if(st==='dance'||e%2===0)tone(at,bassF,.18,'sawtooth',.13);
    if(st==='dance'&&(e===2||e===6)){ [root[2],root[3],root[3]*1.25].forEach(f=>tone(at,f,.25,'square',.05)); }
    if(st==='pop'&&e===0&&bar%2===1){ [root[2]*2,root[3]*2].forEach(f=>tone(at,f,.3,'triangle',.08)); }
  }
};
// a controller stand-in driven by target angles (for the dancer and for tests)
class FakeCtrl{ constructor(){ this.q=new THREE.Quaternion(); this.qLocal=new THREE.Quaternion(); this.pos=new THREE.Vector3(); this.v=new THREE.Vector3(); this.e=new THREE.Euler(0,0,0,'YXZ'); this.q1=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)); this.live=true; }
  set(pitchDeg,yawDeg,rollDeg){ this.e.set(pitchDeg*Math.PI/180,yawDeg*Math.PI/180,(rollDeg||0)*Math.PI/180); this.q.setFromEuler(this.e).multiply(this.q1); this.qLocal.copy(FLIP).multiply(this.q).multiply(FLIPI); return this; }
  lerpTo(a,b,k){ const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(a.p*Math.PI/180,a.y*Math.PI/180,(a.r||0)*Math.PI/180,'YXZ')).multiply(this.q1); const q2=new THREE.Quaternion().setFromEuler(new THREE.Euler(b.p*Math.PI/180,b.y*Math.PI/180,(b.r||0)*Math.PI/180,'YXZ')).multiply(this.q1); this.q.copy(q).slerp(q2,k); this.qLocal.copy(FLIP).multiply(this.q).multiply(FLIPI); return this; }
  axis(out){ return (out||new THREE.Vector3()).set(0,1,0).applyQuaternion(this.q); } normal(out){ return (out||new THREE.Vector3()).set(0,0,1).applyQuaternion(this.q); } }
function seeded(seed){ let s=seed; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
const _rh1=new THREE.Vector3(), _rh2=new THREE.Vector3();

/* ============================== BEAT SHAKE (rhythm) ============================== */
const RH_CFG={bpm:120,beats:128,approach:1.8,perfect:.07,good:.14,ok:.22,lane:2.3};
SPORTS.rhythm={
  name:'Beat Shake',icon:'🥁',players:'1-4 players',
  how:['Notes fly toward the ring in front of your player. Shake the phone the moment a note reaches the ring.','PERFECT, GOOD and OK depend on your timing. Keep a combo going for bonus points; stray shakes and misses break it.','Everybody plays at the same time, one lane each. About a minute long.','Highest score wins.'],
  who:n=>n<=1?'Solo, beat your best':n+' players, one lane each',
  build(players){
    const s=newScene({sky:0x1a1f33,fog:false,shadow:10,sunX:0,sunY:14,sunZ:6,hemi:.5,sun:.6,hemiSky:0x8fa3ff,hemiGround:0x201830});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.t=-3; this.stateT=0; this.state='count';
    const n=this.players.length; const W=RH_CFG.lane; backdrop(s,'bg_arena',{r:22,h:13,len:TAU,center:Math.PI,rep:3,y:5.5}); const floor=plane(60,60,0x2a2f4a,{}); s.add(floor);
    const stage=box(n*W+2,.3,5,0x3b3f66); stage.position.set(0,-.15,0); s.add(stage);
    this.lights=[]; for(let i=0;i<6;i++){ const l=new THREE.PointLight([0xff5a5f,0x2f80ff,0x37c95c,0xffc233,0xa55eea,0xff9f43][i],.5,18); l.position.set(-6+i*2.4,5,-2); s.add(l); this.lights.push(l); }
    const rng=seeded(7); this.notes=[]; for(let b=8;b<RH_CFG.beats;b++){ const bar=Math.floor(b/4), pos=b%4; const d=Math.min(1,bar/14); let add=pos===0||pos===2||(pos===1&&rng()<d*.6)||(pos===3&&rng()<d*.6); if(add)this.notes.push(b); if(d>.5&&rng()<.25&&pos===1)this.notes.push(b+.5); }
    const beat=60/RH_CFG.bpm; this.noteT=this.notes.map(b=>b*beat); this.endT=RH_CFG.beats*beat+1.5;
    this.lanes=this.players.map((p,i)=>{ const x=(i-(n-1)/2)*W; const mii=makeMii(p.color,p.name); mii.g.position.set(x,0,1.2); mii.g.rotation.y=0; mii.baseExpr='happy'; if(!p.cpu)mii.setTrackedTool('phone'); s.add(mii.g);
      const ring=mesh(new THREE.TorusGeometry(.42,.05,10,40),p.color,{m:{emissive:new THREE.Color(p.color).multiplyScalar(.5)},cast:false}); ring.position.set(x,1.35,-.4); s.add(ring);
      const rail=box(.06,.02,40,0x556088,{cast:false}); rail.position.set(x,1.34,-20); s.add(rail);
      const pool=[]; for(let k=0;k<14;k++){ const m=sph(.2,p.color,{m:{emissive:new THREE.Color(p.color).multiplyScalar(.35)},phong:true,cast:false},12); m.visible=false; s.add(m); pool.push(m); }
      const judge=textSprite('',p.color,2.2); judge.position.set(x,2.4,-.4); judge.visible=false; s.add(judge);
      return {p,mii,ring,pool,judge,judgeT:0,x,score:0,combo:0,maxCombo:0,next:0,hitAt:-1,counts:{perfect:0,good:0,ok:0,miss:0},cpuNext:0,fx:1}; });
    this.beatLine=box(n*W+1,.04,.04,0xffffff,{cast:false}); this.beatLine.position.set(0,.16,-.4); s.add(this.beatLine);
    camSet(V3(0,3.4,6.2),V3(0,1.3,-3)); MUSIC.start(RH_CFG.bpm,'pop'); this.hud(); this.phones();
  },
  phones(){ this.players.forEach(p=>{ if(!p.cpu)phoneUI(p,{mode:'rhythm',icon:'🥁',title:'Beat Shake',sub:'Shake the phone when a note reaches your ring. Any direction works.',btns:[],rate:3}); }); },
  hud(){ hud('TL',scoreboard(this.lanes.map(l=>({name:l.p.name,color:l.p.color,v:l.score+(l.combo>=4?' <small style="font-size:.55em;color:#ffc233">x'+l.combo+'</small>':'')})))); },
  onSwingStart(p){ const l=this.lanes.find(x=>x.p===p); if(l)this.shake(l); },
  shake(l){ if(this.state!=='play')return; const K=RH_CFG; const t=this.t; let best=-1, bd=9; for(let i=l.next;i<this.noteT.length;i++){ const d=this.noteT[i]-t; if(d>K.ok)break; const ad=Math.abs(d); if(ad<bd){ bd=ad; best=i; } }
    if(l.mii.tracked)l.mii.play('shake',.25,(m,k)=>{ m.body.position.y=Math.sin(k*Math.PI)*.12; }); else l.mii.play('shake',.25,(m,k)=>{ m.arm('R',-1.6-Math.sin(k*Math.PI)*.8,0,.4); m.body.position.y=Math.sin(k*Math.PI)*.12; });
    if(best<0||bd>K.ok){ this.judge(l,'miss','stray'); return; }
    for(let i=l.next;i<best;i++)this.judge(l,'miss'); l.next=best+1; this.judge(l,bd<=K.perfect?'perfect':bd<=K.good?'good':'ok'); },
  judge(l,kind,why){ const pts={perfect:100,good:60,ok:25,miss:0}[kind]; l.counts[kind]++; if(kind==='miss'){ l.combo=0; l.judge.material.map=textSprite(why==='stray'?'STRAY':'MISS','#ff5a5f',2.2).material.map; l.mii.face('sad',.6); }
    else { l.combo++; l.maxCombo=Math.max(l.maxCombo,l.combo); const mult=1+Math.min(3,Math.floor(l.combo/8))*.5; l.score+=Math.round(pts*mult); l.judge.material.map=textSprite(kind.toUpperCase()+(kind==='perfect'?'!':''),kind==='perfect'?'#ffc233':kind==='good'?'#37c95c':'#9fb3ff',2.2).material.map; l.mii.face(kind==='perfect'?'cheer':'happy',.5); if(kind==='perfect'){ AUD.tone(1320,.08,'square',.12); buzz(l.p,60); } else if(kind==='good')AUD.tone(990,.07,'square',.1); l.ring.scale.setScalar(1.35); }
    l.judge.visible=true; l.judgeT=.6; this.hud(); },
  update(dt){
    const K=RH_CFG; this.t+=dt; this.stateT+=dt; MUSIC.tick(Math.max(0,this.t));
    if(this.state==='count'){ const c=Math.ceil(-this.t); if(c>0&&c<=3&&this.lastCount!==c){ this.lastCount=c; banner(String(c),'get ready',.9); AUD.tick(); } if(this.t>=0){ this.state='play'; banner('GO!','',.8,'gold'); } }
    else if(this.state==='play'){ if(this.t>this.endT){ this.state='over'; this.stateT=0; MUSIC.stop(); banner('FINISH!','',2,'gold'); AUD.fanfare(); } }
    else if(this.state==='over'&&this.stateT>2.4){ this.finish(); return; }
    const beat=60/K.bpm; const bph=(this.t%beat)/beat; this.beatLine.scale.y=1+(1-bph)*3; this.lights.forEach((l,i)=>l.intensity=.35+(Math.floor(this.t/beat)%6===i?.9:0));
    this.lanes.forEach(l=>{ const p=l.p;
      if(!p.cpu&&tracked(p)){ rigHand(l.mii,p.ctrl,_rh1.set(.35,-.1,.4)); } l.mii.update(dt); l.mii.body.position.y=Math.abs(Math.sin(this.t*Math.PI/beat))*.05;
      if(p.cpu&&this.state==='play'){ while(l.cpuNext<this.noteT.length&&this.noteT[l.cpuNext]<this.t-.25)l.cpuNext++; if(l.cpuNext<this.noteT.length&&Math.abs(this.noteT[l.cpuNext]-this.t)<.03){ if(Math.random()<.85)this.shake(l); l.cpuNext++; } }
      // notes that scrolled past unhit are misses
      while(l.next<this.noteT.length&&this.noteT[l.next]<this.t-K.ok){ this.judge(l,'miss'); l.next++; }
      // draw upcoming notes flying in along the rail
      let k=0; for(let i=l.next;i<this.noteT.length&&k<l.pool.length;i++){ const d=this.noteT[i]-this.t; if(d>K.approach)break; const m=l.pool[k++]; m.visible=true; m.position.set(l.x,1.35,-.4-d/K.approach*22); m.scale.setScalar(.8+.2*(1-d/K.approach)); } for(;k<l.pool.length;k++)l.pool[k].visible=false;
      if(l.judgeT>0){ l.judgeT-=dt; l.judge.position.y=2.4+(0.6-l.judgeT)*.8; if(l.judgeT<=0)l.judge.visible=false; } l.ring.scale.lerp(_rh2.set(1,1,1),.15); });
  },
  finish(){ const rows=this.lanes.map(l=>({p:l.p.cpu?null:l.p,name:l.p.name,color:l.p.color,val:l.score,score:l.score+' pts · '+l.counts.perfect+' perfect · combo '+l.maxCombo})).sort((a,b)=>b.val-a.val); endSport(rows,'Beat Shake'); },
  onKey(k){ if(TEST&&k===' ')this.shake(this.lanes[0]); },
  dispose(){ MUSIC.stop(); }
};

/* ============================== DANCE OFF (follow the dancer) ============================== */
const DN_CFG={bpm:100,beats:96,window:.28,perfect:30,good:58,lead:1};
// each move = where the phone should point (pitch up/down, yaw left/right, roll) at that beat
const DN_MOVES=(()=>{ const A=[{p:0,y:0},{p:70,y:0},{p:0,y:-55},{p:70,y:-55},{p:0,y:55},{p:70,y:55},{p:85,y:0},{p:-30,y:0}];
  const B=[{p:30,y:-70},{p:30,y:70},{p:80,y:-30},{p:80,y:30},{p:-20,y:-40},{p:-20,y:40},{p:60,y:0,r:80},{p:60,y:0,r:-80}];
  const C=[{p:0,y:80},{p:45,y:45},{p:85,y:0},{p:45,y:-45},{p:0,y:-80},{p:45,y:-45},{p:85,y:0},{p:45,y:45}];
  const D=[{p:-35,y:0},{p:85,y:0},{p:-35,y:0},{p:85,y:0},{p:20,y:-70,r:60},{p:20,y:70,r:-60},{p:85,y:-40},{p:85,y:40}];
  return [...A,...A,...B,...B,...C,...C,...D,...D,...A,...C,...B,...D]; })();
SPORTS.dance={
  name:'Dance Off',icon:'💃',players:'1-4 players',
  how:['The dancer in the middle moves their hand on every beat. Copy the dancer with your phone hand, like a mirror.','The ghost hand shows where the dancer goes next, so you can move with the music.','You are scored on each beat by how closely your phone points where the dancer\'s hand points: PERFECT, GOOD or X.','Everybody dances at once. Highest score wins.'],
  who:n=>n<=1?'Solo, beat your best':n+' dancers at once',
  build(players){
    const s=newScene({sky:0x1a1330,fog:false,shadow:12,sunX:0,sunY:14,sunZ:8,hemi:.5,sun:.7,hemiSky:0xc8a3ff,hemiGround:0x201030});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.t=-3; this.stateT=0; this.state='count'; this.beat=60/DN_CFG.bpm;
    backdrop(s,'bg_arena',{r:22,h:13,len:TAU,center:Math.PI,rep:3,y:5.5}); const floor=plane(60,60,0x2a1f4a,{}); s.add(floor);
    this.tiles=[]; for(let x=-4;x<=4;x++)for(let z=-3;z<=2;z++){ const tl=box(1.9,.06,1.9,[0xff5a5f,0x2f80ff,0x37c95c,0xffc233,0xa55eea][(x+z+20)%5],{cast:false}); tl.position.set(x*2,.02,z*2); tl.userData.i=(x+z+20)%5; s.add(tl); this.tiles.push(tl); }
    this.lights=[]; for(let i=0;i<5;i++){ const l=new THREE.SpotLight([0xff5a5f,0x2f80ff,0x37c95c,0xffc233,0xa55eea][i],1.1,30,.5,.5); l.position.set(-6+i*3,8,-2); l.target.position.set(0,0,0); s.add(l); s.add(l.target); this.lights.push(l); }
    this.dancer=makeMii('#ffd700','',{skin:0xf6cfae,hair:0x111111}); this.dancer.g.position.set(0,.4,-2.2); this.dancer.g.scale.setScalar(1.25); this.dancer.setTrackedTool('glove'); this.dancer.baseExpr='cheer'; this.dancer.face('cheer'); s.add(this.dancer.g);
    const podium=cyl(1.3,1.5,.4,0xffc233,32); podium.position.set(0,.2,-2.2); s.add(podium);
    this.ghost=sph(.16,0xffffff,{m:{transparent:true,opacity:.45},cast:false},10); s.add(this.ghost);
    this.target=new FakeCtrl(); this.targetNext=new FakeCtrl(); this.targetBeat=new FakeCtrl();
    const n=this.players.length; this.dn=this.players.map((p,i)=>{ const x=(i-(n-1)/2)*2.2; const mii=makeMii(p.color,p.name); mii.g.position.set(x,0,1.6); mii.g.rotation.y=0; mii.baseExpr='happy'; if(!p.cpu)mii.setTrackedTool('glove'); s.add(mii.g); const judge=textSprite('',p.color,2); judge.position.set(x,2.5,1.6); judge.visible=false; s.add(judge); return {p,mii,x,judge,judgeT:0,score:0,bestErr:999,lastBeat:-1,counts:{perfect:0,good:0,miss:0},streak:0}; });
    camSet(V3(0,3.6,7.5),V3(0,1.5,-1)); MUSIC.start(DN_CFG.bpm,'dance'); this.hud(); this.phones();
  },
  phones(){ this.players.forEach(p=>{ if(!p.cpu)phoneUI(p,{mode:'dance',icon:'💃',title:'Dance Off',sub:'Copy the dancer\'s hand with your phone, like a mirror. Watch the ghost hand for the next move.',btns:[{id:'recenter',label:'RECENTER',sec:1}],rate:3}); }); },
  hud(){ hud('TL',scoreboard(this.dn.map(d=>({name:d.p.name,color:d.p.color,v:d.score})))); },
  moveAt(b){ return DN_MOVES[((b%DN_MOVES.length)+DN_MOVES.length)%DN_MOVES.length]; },
  update(dt){
    const K=DN_CFG; this.t+=dt; this.stateT+=dt; MUSIC.tick(Math.max(0,this.t)); const beat=this.beat; const bf=this.t/beat; const b=Math.floor(bf), frac=bf-b;
    if(this.state==='count'){ const c=Math.ceil(-this.t); if(c>0&&c<=3&&this.lastCount!==c){ this.lastCount=c; banner(String(c),'get ready',.9); AUD.tick(); } if(this.t>=0){ this.state='play'; banner('DANCE!','',.8,'gold'); } }
    else if(this.state==='play'){ if(b>=K.beats){ this.state='over'; this.stateT=0; MUSIC.stop(); banner('FINISH!','',2,'gold'); AUD.fanfare(); } }
    else if(this.state==='over'&&this.stateT>2.4){ this.finish(); return; }
    // dancer: ease from the previous move into this beat's move (mirrored arm)
    const prev=this.moveAt(b-1), cur=this.moveAt(b), nxt=this.moveAt(b+1); this.target.lerpTo(prev,cur,easeOut(Math.min(1,frac*1.6))); this.targetNext.set(nxt.p,nxt.y,nxt.r||0); this.targetBeat.set(cur.p,cur.y,cur.r||0);
    rigHand(this.dancer,this.mirror(this.target),_rh1.set(-.4,-.1,.4),0,1,.75,'L'); this.dancer.update(dt); this.dancer.body.position.y=Math.abs(Math.sin(bf*Math.PI))*.12; this.dancer.body.rotation.z=Math.sin(bf*Math.PI)*.08;
    // ghost = the next target hand position, in the dancer's mirrored frame
    { const m=this.mirror(this.targetNext); const hand=_rh2.set(-.4,-.1,.4).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),m.axis().clone().applyQuaternion(FLIP))); hand.add(new THREE.Vector3(-.34,1.27,0)); hand.multiplyScalar(1.25); this.ghost.position.copy(this.dancer.g.position).add(hand); this.ghost.material.opacity=.25+.3*(1-frac); }
    this.tiles.forEach(tl=>{ const on=(tl.userData.i===b%5); tl.position.y=on?.08:.02; }); this.lights.forEach((l,i)=>l.intensity=.6+(b%5===i?1.2:0));
    // players: rig from their controller, score the beat by the closest match inside the window
    this.dn.forEach(d=>{ const p=d.p; let ax=null;
      if(!p.cpu&&tracked(p)){ rigHand(d.mii,p.ctrl,_rh1.set(.35,-.1,.4)); ax=p.ctrl.axis(new THREE.Vector3()); }
      else if(p.cpu){ const fc=new FakeCtrl().lerpTo(prev,cur,easeOut(Math.min(1,(frac+.1)*1.6))); rigHand(d.mii,fc,_rh1.set(.35,-.1,.4)); ax=fc.axis(); if(Math.random()<.01)ax.applyAxisAngle(new THREE.Vector3(0,1,0),1); }
      d.mii.update(dt); d.mii.body.position.y=Math.abs(Math.sin(bf*Math.PI))*.06;
      // score against this beat's destination pose during the second half of the beat (lagging a beat behind does not count)
      if(this.state==='play'&&ax){ if(frac>=.5){ const tgt=this.targetBeat.axis(); const err=Math.acos(clamp(ax.dot(tgt),-1,1))*180/Math.PI; d.bestErr=Math.min(d.bestErr,err); }
        if(b!==d.lastBeat){ if(d.lastBeat>=1)this.judge(d,d.bestErr); d.lastBeat=b; d.bestErr=999; } }
      if(d.judgeT>0){ d.judgeT-=dt; d.judge.position.y=2.5+(0.6-d.judgeT)*.8; if(d.judgeT<=0)d.judge.visible=false; } });
  },
  mirror(fc){ const m=this._m||(this._m=new FakeCtrl()); m.q.set(fc.q.x,-fc.q.y,-fc.q.z,fc.q.w); m.qLocal.copy(FLIP).multiply(m.q).multiply(FLIPI); return m; },
  judge(d,err){ const K=DN_CFG; let kind='miss', pts=0; if(err<=K.perfect){ kind='perfect'; pts=100; } else if(err<=K.good){ kind='good'; pts=50; } d.counts[kind]++; if(kind==='miss')d.streak=0; else d.streak++; d.score+=Math.round(pts*(1+Math.min(2,Math.floor(d.streak/6))*.5));
    d.judge.material.map=textSprite(kind==='perfect'?'PERFECT!':kind==='good'?'GOOD':'X',kind==='perfect'?'#ffc233':kind==='good'?'#37c95c':'#ff5a5f',2).material.map; d.judge.visible=true; d.judgeT=.6; d.mii.face(kind==='perfect'?'cheer':kind==='good'?'happy':'sad',.5); if(kind==='perfect'){ AUD.tone(1320,.07,'square',.1); buzz(d.p,50); } this.hud(); },
  finish(){ const rows=this.dn.map(d=>({p:d.p.cpu?null:d.p,name:d.p.name,color:d.p.color,val:d.score,score:d.score+' pts · '+d.counts.perfect+' perfect'})).sort((a,b)=>b.val-a.val); endSport(rows,'Dance Off'); },
  onKey(k){},
  dispose(){ MUSIC.stop(); }
};
