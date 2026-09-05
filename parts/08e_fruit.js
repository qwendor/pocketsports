/* ============================== FRUIT SLICE (point the phone, sweep through fruit) ============================== */
const FR_CFG={time:60,aimYawDeg:26,aimPitchDeg:18,sliceSpeed:5,trailN:14,bombPenalty:8,gravity:11,spawnMin:.7,spawnMax:1.3,heatMax:.45,coolSpeed:2.5,coolTime:.3};
const FR_TYPES=[{n:'apple',c:0xe0313f,r:.42,pts:1,w:.34},{n:'orange',c:0xff9f1c,r:.45,pts:1,w:.3},{n:'lime',c:0x7ed957,r:.36,pts:1,w:.2},{n:'melon',c:0x2e8b3d,r:.62,pts:2,w:.1,inner:0xff5a7a},{n:'peach',c:0xffb37a,r:.44,pts:1,w:.2},{n:'bomb',c:0x1c2430,r:.42,pts:0,w:.24,bomb:true}];
SPORTS.fruit={
  name:'Fruit Slice',icon:'🍉',players:'1-4 players',
  how:['Point your phone at the screen: your blade follows it, like a laser pointer.','Fruit flies up from the bottom. Sweep the blade through it fast to slice it. Slow pokes do nothing.','Real slashes, not waving: the blade goes dull (grey) after half a second of constant motion and needs a short pause to sharpen again.','Slice several in one sweep for a combo bonus. Slicing a <b>bomb</b> costs points. 60 seconds, most points wins.'],
  who:n=>n<=1?'Solo, 60 seconds':n+' blades at once, 60 seconds',
  build(players){
    const s=newScene({sky:0x1b2233,fog:false,shadow:0,sunX:2,sunY:10,sunZ:14,hemi:.45,sun:1.0,hemiSky:0xb0c8ff,hemiGround:0x2a2040});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.t=-3; this.stateT=0; this.state='count'; this.timer=FR_CFG.time; this.nextSpawn=0; this.fruit=[]; this.bits=[]; this.pops=[];
    const wall=flatBackdrop(s,'bg_arena',44,16,0,6,-6); if(!wall){ const b=box(44,16,.2,0x2a3550,{cast:false}); b.position.set(0,6,-6); s.add(b); } const dim=box(44,16,.05,0x000000,{m:{transparent:true,opacity:.45},cast:false}); dim.position.set(0,6,-5.9); s.add(dim);
    const board=box(20,.4,2,0x5a3a1a,{cast:false}); board.position.set(0,-1.2,0); s.add(board);
    this.blades=this.players.map(p=>{ const col=new THREE.Color(p.color); const trail=[]; for(let i=0;i<FR_CFG.trailN;i++){ const m=sph(.12*(1-i/FR_CFG.trailN)+.03,p.color,{m:{emissive:col.clone().multiplyScalar(.6),transparent:true,opacity:1-i/FR_CFG.trailN},cast:false,recv:false},8); m.visible=false; s.add(m); trail.push(m); }
      const tip=mesh(new THREE.RingGeometry(.16,.24,24),p.color,{m:{emissive:col.clone().multiplyScalar(.7),side:THREE.DoubleSide},cast:false,recv:false}); s.add(tip);
      return {p,trail,tip,pos:new THREE.Vector3(0,4,0),prev:new THREE.Vector3(0,4,0),hist:[],score:0,combo:0,comboT:0,stun:0,sliced:0,bombs:0,cpuT:new THREE.Vector3(0,4,0),heat:0,dull:false,coolT:0,col}; });
    camSet(V3(0,4,13),V3(0,4,0)); this.hud(); this.phones(); AUD.init();
  },
  phones(){ this.players.forEach(p=>{ if(!p.cpu)phoneUI(p,{mode:'fruit',icon:'🍉',title:'Slice!',sub:'Point at the screen and sweep the blade through the fruit. Avoid the bombs.',btns:[{id:'recenter',label:'RECENTER',sec:1}],rate:3}); }); },
  hud(){ hud('TL',scoreboard(this.blades.map(b=>({name:b.p.name,color:b.p.color,v:b.score})))); hud('TC',`<b>${Math.ceil(Math.max(0,this.timer))}s</b>`); },
  spawn(){ const K=FR_CFG; const n=1+(Math.random()<.35+this.stateT/120?1:0)+(Math.random()<this.stateT/90?1:0); for(let i=0;i<n;i++){ let r=Math.random(), tp=FR_TYPES[0]; for(const ty of FR_TYPES){ r-=ty.w; if(r<=0){ tp=ty; break; } }
      const x=rnd(-6,6); const f={tp,pos:new THREE.Vector3(x,-1.4,rnd(-.4,.4)),vel:new THREE.Vector3(-x*rnd(.1,.35)+rnd(-1,1),rnd(12,15.5),0),spin:new THREE.Vector3(rnd(-3,3),rnd(-3,3),rnd(-3,3)),alive:true};
      f.m=tp.bomb?this.bombMesh():this.fruitMesh(tp); f.m.position.copy(f.pos); R.scene.add(f.m); this.fruit.push(f); } },
  fruitMesh(tp){ const g=new THREE.Group(); const body=sph(tp.r,tp.c,{phong:true},18); g.add(body); if(tp.n==='melon'){ body.scale.set(1.15,.9,1); const stripes=mesh(new THREE.TorusGeometry(tp.r*1.05,.03,6,32),0x1f6b2a); stripes.rotation.y=Math.PI/2; g.add(stripes); } if(tp.n==='apple'||tp.n==='peach'){ const stem=cyl(.03,.03,.22,0x5a3a1a,6); stem.position.y=tp.r+.06; g.add(stem); const leaf=box(.18,.02,.1,0x37c95c,{cast:false}); leaf.position.set(.1,tp.r+.1,0); g.add(leaf); } if(tp.n==='orange'||tp.n==='lime'){ const dot=sph(.05,0x333333,{},6); dot.position.y=tp.r; g.add(dot); } const shine=sph(tp.r*.28,0xffffff,{m:{transparent:true,opacity:.35},cast:false},8); shine.position.set(-tp.r*.4,tp.r*.45,tp.r*.6); g.add(shine); return g; },
  bombMesh(){ const g=new THREE.Group(); const b=sph(.42,0x1c2430,{phong:true},16); g.add(b); const cap=cyl(.1,.1,.14,0x555555,10); cap.position.y=.46; g.add(cap); const fuse=cyl(.025,.025,.3,0xd9b27a,6); fuse.position.set(.06,.65,0); fuse.rotation.z=.4; g.add(fuse); const spark=sph(.07,0xffc233,{m:{emissive:0xffc233}},8); spark.position.set(.16,.78,0); g.add(spark); g.userData.spark=spark; const skull=box(.16,.16,.02,0xffffff,{cast:false}); skull.position.set(0,.05,.42); g.add(skull); return g; },
  update(dt){
    const K=FR_CFG; this.t+=dt; this.stateT+=dt;
    if(this.state==='count'){ const c=Math.ceil(-this.t); if(c>0&&c<=3&&this.lastCount!==c){ this.lastCount=c; banner(String(c),'get ready',.9); AUD.tick(); } if(this.t>=0){ this.state='play'; this.stateT=0; banner('SLICE!','',.8,'gold'); } }
    else if(this.state==='play'){ this.timer-=dt; if(this.timer<=0){ this.timer=0; this.state='over'; this.stateT=0; banner('TIME!','',2,'gold'); AUD.fanfare(); } if(this.t>=this.nextSpawn){ this.spawn(); this.nextSpawn=this.t+rnd(K.spawnMin,K.spawnMax)*Math.max(.55,1-this.stateT/150); } }
    else if(this.state==='over'&&this.stateT>2.4){ this.finish(); return; }
    // blades
    this.blades.forEach(b=>{ const p=b.p; b.prev.copy(b.pos); b.stun=Math.max(0,b.stun-dt); b.comboT-=dt; if(b.comboT<=0&&b.combo>=3){ this.comboBonus(b); } if(b.comboT<=0)b.combo=0;
      if(!p.cpu&&tracked(p)){ const c=p.ctrl; const sx=clamp(-c.yaw*180/Math.PI/K.aimYawDeg,-1,1), sy=clamp(c.pitch*180/Math.PI/K.aimPitchDeg,-1,1); const tf=Math.tan(R.cam.fov*Math.PI/360); const dir=_fr1.set(sx*tf*R.cam.aspect,sy*tf,-1).applyQuaternion(R.cam.quaternion).normalize(); const k=-R.cam.position.z/dir.z; if(k>0&&isFinite(k)){ b.pos.copy(R.cam.position).addScaledVector(dir,k); } }
      else if(p.cpu){ const f=this.fruit.filter(f=>f.alive&&!f.tp.bomb&&f.vel.y<4).sort((a,c)=>a.pos.y-c.pos.y).pop(); if(f&&this.state==='play'&&!b.dull){ b.cpuT.copy(f.pos); } const to=_fr1.copy(b.cpuT).sub(b.pos); const d=to.length(); if(d>.1&&!b.dull)b.pos.addScaledVector(to.normalize(),Math.min(d,7*dt)); }
      b.vel=b.pos.distanceTo(b.prev)/Math.max(dt,1e-3);
      // heat: continuous fast waving dulls the blade; stopping briefly sharpens it
      if(b.vel>K.coolSpeed){ b.heat+=dt; b.coolT=0; } else { b.coolT+=dt; if(b.coolT>K.coolTime){ b.heat=0; b.dull=false; } } if(b.heat>K.heatMax)b.dull=true;
      const dullCol=0x777788; b.tip.material.color.setHex(b.dull?dullCol:b.col.getHex()); b.tip.material.emissive.setHex(b.dull?0x222233:b.col.clone().multiplyScalar(.7).getHex()); b.trail.forEach(m=>{ m.material.color.setHex(b.dull?dullCol:b.col.getHex()); });
      b.hist.unshift(b.pos.clone()); if(b.hist.length>K.trailN)b.hist.pop(); b.trail.forEach((m,i)=>{ const h=b.hist[i]; m.visible=!!h&&b.vel>1.5; if(h)m.position.copy(h); }); b.tip.position.copy(b.pos); b.tip.rotation.y=this.t*4; b.tip.visible=b.stun<=0||Math.floor(this.t*12)%2===0;
      // slicing: the blade segment for this frame against every fruit
      if(this.state==='play'&&b.vel>=K.sliceSpeed&&b.stun<=0&&!b.dull){ this.fruit.forEach(f=>{ if(!f.alive)return; const d=this.segDist(b.prev,b.pos,f.pos); if(d<f.tp.r+.12){ this.slice(f,b); } }); } });
    // fruit physics
    this.fruit=this.fruit.filter(f=>{ if(!f.alive){ return false; } f.vel.y-=K.gravity*dt; f.pos.addScaledVector(f.vel,dt); f.m.position.copy(f.pos); f.m.rotation.x+=f.spin.x*dt; f.m.rotation.y+=f.spin.y*dt; f.m.rotation.z+=f.spin.z*dt; if(f.m.userData.spark)f.m.userData.spark.visible=Math.floor(this.t*10)%2===0; if(f.pos.y<-2.5){ R.scene.remove(f.m); return false; } return true; });
    this.bits=this.bits.filter(m=>{ m.userData.t+=dt; m.userData.v.y-=K.gravity*dt; m.position.addScaledVector(m.userData.v,dt); m.rotation.x+=m.userData.s.x*dt; m.rotation.z+=m.userData.s.z*dt; if(m.material&&m.material.transparent)m.material.opacity=Math.max(0,1-m.userData.t*1.5); if(m.position.y<-3||m.userData.t>2){ R.scene.remove(m); return false; } return true; });
    this.pops=this.pops.filter(sp=>{ sp.userData.t+=dt; sp.position.y+=dt*1.2; sp.material.opacity=Math.max(0,1-sp.userData.t); if(sp.userData.t>1){ R.scene.remove(sp); return false; } return true; });
    this.hud();
  },
  segDist(a,b,p){ const ab=_fr2.copy(b).sub(a); const L2=ab.lengthSq(); const t=L2<1e-6?0:clamp(_fr3.copy(p).sub(a).dot(ab)/L2,0,1); return _fr3.copy(a).addScaledVector(ab,t).distanceTo(p); },
  slice(f,b){ f.alive=false; R.scene.remove(f.m); const dir=_fr2.copy(b.pos).sub(b.prev); dir.z=0; if(dir.length()<1e-3)dir.set(1,0,0); dir.normalize(); const nrm=_fr3.set(-dir.y,dir.x,0);
    if(f.tp.bomb){ b.score=Math.max(0,b.score-FR_CFG.bombPenalty); b.bombs++; b.stun=1.0; b.combo=0; AUD.crash(); buzz(b.p,400); this.shake=.4; this.pop(f.pos,'-'+FR_CFG.bombPenalty,'#ff5a5f'); for(let i=0;i<14;i++)this.bit(f.pos,0x444444,.12,V3(rnd(-6,6),rnd(1,9),rnd(-2,2)),true); banner('BOMB!',b.p.name,.8,'red'); this.hud(); return; }
    // two halves fly apart along the cut normal, juice sprays along the blade
    for(const sgn of[-1,1]){ const half=mesh(new THREE.SphereGeometry(f.tp.r,14,10,0,Math.PI),f.tp.c,{phong:true}); const cap=mesh(new THREE.CircleGeometry(f.tp.r,14),f.tp.inner||0xfff2c2,{m:{side:THREE.DoubleSide}}); cap.rotation.y=-Math.PI/2; half.add(cap); const g=new THREE.Group(); g.add(half); g.position.copy(f.pos); g.lookAt(f.pos.clone().add(nrm)); g.rotateY(sgn>0?0:Math.PI); g.userData={t:0,v:new THREE.Vector3(nrm.x*sgn*2.2+f.vel.x*.5+dir.x*1.5,Math.max(1,f.vel.y*.4)+2,rnd(-1,1)),s:new THREE.Vector3(rnd(-4,4),0,rnd(-4,4))}; R.scene.add(g); this.bits.push(g); }
    for(let i=0;i<10;i++)this.bit(f.pos,f.tp.inner||f.tp.c,.08,V3(dir.x*rnd(2,7)+rnd(-2,2),rnd(2,7),rnd(-2,2)),true);
    b.score+=f.tp.pts; b.sliced++; b.combo++; b.comboT=.3; AUD.swish(); AUD.tone(660+b.combo*80,.06,'square',.08); buzz(b.p,25); this.pop(f.pos,'+'+f.tp.pts,'#ffffff'); this.hud(); },
  comboBonus(b){ const bonus=b.combo*2; b.score+=bonus; this.pop(b.pos,b.combo+' COMBO +'+bonus,'#ffc233'); AUD.ding(); buzz(b.p,80); b.combo=0; },
  bit(pos,color,r,v,fade){ const m=sph(r,color,{m:{transparent:!!fade},cast:false,recv:false},6); m.position.copy(pos); m.userData={t:0,v,s:new THREE.Vector3(rnd(-6,6),0,rnd(-6,6))}; R.scene.add(m); this.bits.push(m); },
  pop(pos,txt,color){ const sp=textSprite(txt,color,1.8); sp.position.copy(pos); sp.userData.t=0; sp.material.transparent=true; R.scene.add(sp); this.pops.push(sp); },
  finish(){ this.fruit.forEach(f=>R.scene.remove(f.m)); const rows=this.blades.map(b=>({p:b.p.cpu?null:b.p,name:b.p.name,color:b.p.color,val:b.score,score:b.score+' pts · '+b.sliced+' fruit · '+b.bombs+' bombs'})).sort((a,b)=>b.val-a.val); endSport(rows,'Fruit Slice'); },
  onKey(k){},
  dispose(){}
};
const _fr1=new THREE.Vector3(), _fr2=new THREE.Vector3(), _fr3=new THREE.Vector3();
