/* ============================== TANKS (co-op, Wii Play style) ============================== */
const TK_CFG={arenaW:18,arenaH:12,speed:3.2,turn:6,shellSpeed:9,shellMax:3,enemyShellSpeed:7,aimYawDeg:24,aimPitchDeg:16,lives:3,respawn:2.2,mineless:true};
const TK_LEVELS=[{n:2,speed:1.2,fire:[2.5,4.5]},{n:3,speed:1.6,fire:[2.2,4]},{n:4,speed:1.8,fire:[2,3.6]},{n:5,speed:2.2,fire:[1.8,3.2]},{n:6,speed:2.4,fire:[1.6,3]}];
const TK_WALLS=[[-3,-2,2,.7],[3,1.5,2,.7],[0,0,.7,2.4],[-6.5,1.5,.7,1.8],[6.5,-1.5,.7,1.8],[-4.5,-4.6,1.8,.6],[4.5,3.6,1.6,.6]]; // x, z, half w, half d
SPORTS.tanks={
  name:'Tanks',icon:'🚜',players:'1-4 players co-op',
  how:['Drive your tank with the joystick on your phone. Point the phone at the TV to move your crosshair, your turret follows it.','Tap FIRE to shoot. Shells bounce off walls once, so bank shots work (and so do the enemy\'s).','Destroy every enemy tank to clear the mission. Five missions, each with more and faster enemies.','Everybody shares the fight: 3 lives each. Lose them all and the mission is over.'],
  who:n=>n<=1?'Solo: 5 missions, 3 lives':n+' players co-op, 3 lives each',
  build(players){
    const s=newScene({sky:0x2b3448,fog:false,shadow:18,sunX:6,sunY:24,sunZ:8,hemi:.6,sun:.8,hemiSky:0xc8d8f0,hemiGround:0x3a3a30});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.t=0; this.stateT=0; this.level=0; this.lives=this.players.map(()=>TK_CFG.lives); this.kills=this.players.map(()=>0);
    const W=TK_CFG.arenaW,H=TK_CFG.arenaH; const floor=tplane(W,H,'tex_dirt',0xc9b48a,3); floor.position.y=0; s.add(floor);
    const outer=plane(80,80,0x1e2536,{cast:false}); outer.position.y=-.02; s.add(outer);
    this.walls=[]; const addWall=(x,z,hw,hd,h=1)=>{ const b=box(hw*2,h,hd*2,0x7a6a55); b.position.set(x,h/2,z); s.add(b); this.walls.push({x,z,hw,hd}); };
    addWall(0,-H/2-.4,W/2+.8,.4); addWall(0,H/2+.4,W/2+.8,.4); addWall(-W/2-.4,0,.4,H/2); addWall(W/2+.4,0,.4,H/2);
    TK_WALLS.forEach(([x,z,hw,hd])=>addWall(x,z,hw,hd,.9));
    this.tanks=[]; this.shells=[]; this.fx=[];
    this.pt=this.players.map((p,i)=>{ const t=this.mkTank(p.color,false); t.p=p; t.spawn=V3(-2.4+i*1.6,0,H/2-1.3); t.pos.copy(t.spawn); t.cross=mesh(new THREE.TorusGeometry(.35,.05,8,24),p.color,{cast:false}); t.cross.rotation.x=Math.PI/2; t.cross.position.y=.06; s.add(t.cross); const dot=disc(.08,p.color,{}); dot.position.y=.01; t.cross.add(dot); t.aim=V3(0,0,-3); t.shells=0; t.dead=false; t.deadT=0; t.lastFire=0; return t; });
    this.enemies=[]; camSet(V3(0,17,9.5),V3(0,0,-.5)); this.startLevel(); this.hudScore();
  },
  mkTank(color,enemy){ const g=new THREE.Group(); const body=box(.9,.45,1.2,color); body.position.y=.35; g.add(body); for(const sx of[-1,1]){ const tr=box(.22,.36,1.3,0x333333); tr.position.set(sx*.5,.25,0); g.add(tr); } const tur=new THREE.Group(); tur.position.y=.68; g.add(tur); const dome=sph(.3,color,{},14); dome.scale.y=.6; tur.add(dome); const bar=cyl(.06,.06,.9,0x333333,10); bar.rotation.x=Math.PI/2; bar.position.z=.55; tur.add(bar); R.scene.add(g); return {g,tur,pos:g.position,yaw:0,tyaw:0,enemy,alive:true,color}; },
  startLevel(){ const L=TK_LEVELS[this.level]; this.enemies.forEach(e=>R.scene.remove(e.g)); this.enemies=[]; this.shells.forEach(sh=>R.scene.remove(sh.m)); this.shells=[];
    for(let i=0;i<L.n;i++){ const e=this.mkTank(i%2?0x6b5a3a:0x9a8a6a,true); e.pos.set(-TK_CFG.arenaW/2+3+i*(TK_CFG.arenaW-6)/Math.max(1,L.n-1),0,-TK_CFG.arenaH/2+2); e.yaw=Math.PI; e.speed=L.speed; e.fire=L.fire; e.nextFire=this.t+rnd(2,4); e.wp=this.randomPoint(); e.hp=1; this.enemies.push(e); }
    this.pt.forEach(t=>{ t.pos.copy(t.spawn); t.dead=false; t.g.visible=true; t.yaw=0; }); this.state='intro'; this.stateT=0; banner('MISSION '+(this.level+1),L.n+' enemy tank'+(L.n>1?'s':''),2,''); this.phones(); },
  randomPoint(){ for(let k=0;k<20;k++){ const x=rnd(-TK_CFG.arenaW/2+1,TK_CFG.arenaW/2-1), z=rnd(-TK_CFG.arenaH/2+1,TK_CFG.arenaH/2-1); if(!this.hitWall(x,z,.6))return V3(x,0,z); } return V3(0,0,0); },
  hitWall(x,z,r){ return this.walls.some(w=>Math.abs(x-w.x)<w.hw+r&&Math.abs(z-w.z)<w.hd+r); },
  phones(){ this.players.forEach(p=>{ if(p.cpu)return; phoneUI(p,{mode:'tank',icon:'🚜',title:'Tanks',sub:'Joystick drives. Point the phone at the TV to aim, FIRE to shoot.',joy:1,btns:[{id:'fire',label:'FIRE',on:1}],rate:20}); }); },
  hudScore(){ hud('TL',scoreboard(this.players.map((p,i)=>({name:p.name,color:p.color,v:'❤'.repeat(Math.max(0,this.lives[i]))+' <small style="font-size:.6em;color:#6b7c93">'+this.kills[i]+' kills</small>'})))); hud('TC',`<b>MISSION ${this.level+1}</b> · ${this.enemies.filter(e=>e.alive).length} left`); },
  onBtn(p,id,down){ if(id!=='fire'||!down)return; const t=this.pt.find(x=>x.p===p); if(t)this.fire(t); },
  onSwing(p,sw){ const t=this.pt.find(x=>x.p===p); if(t&&!tracked(p))this.fire(t); },
  fire(t){ if(this.state!=='fight'||t.dead||t.shells>=TK_CFG.shellMax||this.t-t.lastFire<.25)return; t.lastFire=this.t; t.shells++; const dir=V3(Math.sin(t.tyaw),0,Math.cos(t.tyaw)); this.shell(t.pos.clone().add(V3(dir.x*.9,.68,dir.z*.9)),dir.multiplyScalar(TK_CFG.shellSpeed),t,false); AUD.pop(); buzz(t.p,40); },
  shell(pos,vel,owner,enemy){ const m=sph(.12,enemy?0xffc233:0xffffff,{phong:true},8); m.position.copy(pos); R.scene.add(m); this.shells.push({m,pos:m.position,vel,owner,enemy,bounces:0,t:0}); },
  update(dt){
    this.t+=dt; this.stateT+=dt; const K=TK_CFG;
    if(this.state==='intro'&&this.stateT>2.2){ this.state='fight'; this.stateT=0; }
    // players
    this.pt.forEach((t,i)=>{ const p=t.p;
      if(t.dead){ t.deadT+=dt; if(t.deadT>K.respawn&&this.lives[i]>0){ t.dead=false; t.g.visible=true; t.pos.copy(t.spawn); } return; }
      let jx=0,jy=0; if(p.cpu){ jx=Math.sin(this.t*.7); jy=Math.cos(this.t*.5); } else if(p.joy){ jx=p.joy.x; jy=p.joy.y; }
      const mag=Math.hypot(jx,jy); if(mag>.15&&this.state==='fight'){ const want=Math.atan2(jx,-jy); let d=want-t.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); t.yaw+=clamp(d,-K.turn*dt,K.turn*dt); const sp=K.speed*Math.min(1,mag); const nx=t.pos.x+Math.sin(t.yaw)*sp*dt, nz=t.pos.z+Math.cos(t.yaw)*sp*dt; if(!this.hitWall(nx,t.pos.z,.55))t.pos.x=nx; if(!this.hitWall(t.pos.x,nz,.55))t.pos.z=nz; }
      // crosshair from the phone pointing (like a pointer on the screen), else in front of the tank
      if(!p.cpu&&tracked(p)){ const c=p.ctrl; const sx=clamp(-c.yaw*180/Math.PI/K.aimYawDeg,-1,1), sy=clamp(c.pitch*180/Math.PI/K.aimPitchDeg,-1,1); const tf=Math.tan(R.cam.fov*Math.PI/360); const dir=_tk1.set(sx*tf*R.cam.aspect,sy*tf,-1).applyQuaternion(R.cam.quaternion).normalize(); const k=-R.cam.position.y/dir.y; if(k>0&&isFinite(k)){ t.aim.copy(R.cam.position).addScaledVector(dir,k); t.aim.x=clamp(t.aim.x,-K.arenaW/2,K.arenaW/2); t.aim.z=clamp(t.aim.z,-K.arenaH/2,K.arenaH/2); } }
      else { t.aim.set(t.pos.x+Math.sin(t.yaw)*4,0,t.pos.z+Math.cos(t.yaw)*4); if(p.cpu&&this.enemies.length){ const e=this.enemies.find(e=>e.alive); if(e)t.aim.copy(e.pos); if(this.t>t.lastFire+2)this.fire(t); } }
      t.tyaw=Math.atan2(t.aim.x-t.pos.x,t.aim.z-t.pos.z); t.g.rotation.y=t.yaw; t.tur.rotation.y=t.tyaw-t.yaw; t.cross.position.set(t.aim.x,.06,t.aim.z); t.cross.visible=!t.dead;
    });
    // enemies
    if(this.state==='fight')this.enemies.forEach(e=>{ if(!e.alive)return; const to=_tk1.copy(e.wp).sub(e.pos); if(to.length()<.6||e.stuck>1){ e.wp=this.randomPoint(); e.stuck=0; } const want=Math.atan2(to.x,to.z); let d=want-e.yaw; d=Math.atan2(Math.sin(d),Math.cos(d)); e.yaw+=clamp(d,-3*dt,3*dt); const nx=e.pos.x+Math.sin(e.yaw)*e.speed*dt, nz=e.pos.z+Math.cos(e.yaw)*e.speed*dt; let moved=false; if(!this.hitWall(nx,e.pos.z,.55)){ e.pos.x=nx; moved=true; } if(!this.hitWall(e.pos.x,nz,.55)){ e.pos.z=nz; moved=true; } e.stuck=(e.stuck||0)+(moved?0:dt); e.g.rotation.y=e.yaw;
      const target=this.pt.filter(t=>!t.dead).sort((a,b)=>a.pos.distanceTo(e.pos)-b.pos.distanceTo(e.pos))[0]; if(target){ const ty=Math.atan2(target.pos.x-e.pos.x,target.pos.z-e.pos.z); e.tyaw=lerp(e.tyaw||ty,ty,.1); e.tur.rotation.y=e.tyaw-e.yaw; if(this.t>e.nextFire&&this.los(e.pos,target.pos)){ e.nextFire=this.t+rnd(e.fire[0],e.fire[1]); const a=e.tyaw+gauss()*.06; const dir=V3(Math.sin(a),0,Math.cos(a)); this.shell(e.pos.clone().add(V3(dir.x*.9,.68,dir.z*.9)),dir.multiplyScalar(K.enemyShellSpeed),e,true); AUD.pop(); } } });
    // shells
    this.shells=this.shells.filter(sh=>{ sh.t+=dt; const nx=sh.pos.x+sh.vel.x*dt, nz=sh.pos.z+sh.vel.z*dt;
      let bounced=false; if(this.hitWall(nx,sh.pos.z,.1)){ sh.vel.x*=-1; bounced=true; } if(this.hitWall(sh.pos.x,nz,.1)){ sh.vel.z*=-1; bounced=true; }
      if(bounced){ sh.bounces++; AUD.tick(); if(sh.bounces>1){ this.boom(sh.pos,.3); return this.killShell(sh); } } else { sh.pos.x=nx; sh.pos.z=nz; }
      // shell vs shell
      for(const o of this.shells){ if(o!==sh&&Math.hypot(o.pos.x-sh.pos.x,o.pos.z-sh.pos.z)<.3){ this.boom(sh.pos,.4); this.killShell(o); return this.killShell(sh); } }
      // hits
      const hd=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
      for(const e of this.enemies){ if(e.alive&&!sh.enemy&&hd(sh.pos,e.pos)<.75){ this.destroyEnemy(e,sh.owner); return this.killShell(sh); } }
      for(const t of this.pt){ if(!t.dead&&(sh.enemy||sh.owner!==t||sh.t>.4)&&hd(sh.pos,t.pos)<.7){ this.destroyPlayer(t); return this.killShell(sh); } }
      if(sh.t>6)return this.killShell(sh); return true; });
    this.fx=this.fx.filter(m=>{ m.userData.t+=dt; m.scale.multiplyScalar(1+4*dt); m.material.opacity=Math.max(0,.8-m.userData.t*2); if(m.userData.t>.4){ R.scene.remove(m); return false; } return true; });
    if(this.state==='fight'&&!this.enemies.some(e=>e.alive)&&this.stateT>1){ this.state='cleared'; this.stateT=0; banner('MISSION CLEAR','',2,'gold'); AUD.cheer(); }
    if(this.state==='cleared'&&this.stateT>2.4){ this.level++; if(this.level>=TK_LEVELS.length){ this.finish(true); return; } this.startLevel(); }
    if(this.state==='fight'&&this.pt.every((t,i)=>t.dead&&this.lives[i]<=0)){ this.state='lost'; this.stateT=0; banner('MISSION FAILED','',2.2,'red'); AUD.sad(); }
    if(this.state==='lost'&&this.stateT>2.6){ this.finish(false); return; }
    this.hudScore();
  },
  los(a,b){ const n=16; for(let i=1;i<n;i++){ const x=lerp(a.x,b.x,i/n), z=lerp(a.z,b.z,i/n); if(this.hitWall(x,z,.05))return false; } return true; },
  killShell(sh){ R.scene.remove(sh.m); if(!sh.enemy&&sh.owner)sh.owner.shells=Math.max(0,sh.owner.shells-1); return false; },
  boom(pos,r){ const m=sph(r,0xffc233,{m:{transparent:true,opacity:.8},cast:false,recv:false},10); m.position.copy(pos); m.userData.t=0; R.scene.add(m); this.fx.push(m); },
  destroyEnemy(e,owner){ e.alive=false; e.g.visible=false; this.boom(e.pos.clone().add(V3(0,.5,0)),.9); AUD.crash(); const i=this.pt.indexOf(owner); if(i>=0){ this.kills[i]++; buzz(owner.p,120); } },
  destroyPlayer(t){ const i=this.pt.indexOf(t); t.dead=true; t.deadT=0; t.g.visible=false; this.lives[i]--; this.boom(t.pos.clone().add(V3(0,.5,0)),.9); AUD.crash(); buzz(t.p,300); if(this.lives[i]<=0)t.cross.visible=false; },
  finish(won){ const rows=this.players.map((p,i)=>({p:p.cpu?null:p,name:p.name,color:p.color,val:this.kills[i],score:this.kills[i]+' kills'+(won?' · all missions clear':' · mission '+(this.level+1))})).sort((a,b)=>b.val-a.val); endSport(rows,'Tanks'); },
  onKey(k){ if(TEST){ const t=this.pt[0]; if(k===' ')this.fire(t); if(k==='w')t.p.joy={x:0,y:1}; if(k==='s')t.p.joy={x:0,y:-1}; if(k==='a')t.p.joy={x:-1,y:0}; if(k==='d')t.p.joy={x:1,y:0}; if(k==='x')t.p.joy={x:0,y:0}; } },
  dispose(){}
};
const _tk1=new THREE.Vector3();
