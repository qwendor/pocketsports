/* ============================== BASKETBALL (shootaround) + 3-POINT CONTEST ============================== */
const BB_CFG={setPitch:32,setTime:.12,snapRate:-3.5,releasePitchMax:55,speedBase:3.0,snapGain:.5,handGain:.8,minSpeed:5,maxSpeed:11.5,aimAssist:.65,speedAssist:.85,snapWindow:.08,ballR:.12,rimR:.225,rimH:3.05,boardZ:-.38,minElev:36,maxElev:60};
const BB_SPOTS=[[0,4.6,2],[-3.2,3.6,2],[3.2,3.6,2],[-4.6,1.6,2],[4.6,1.6,2],[0,6.9,3],[-4.9,4.9,3],[4.9,4.9,3]]; // x, z (distance from the hoop toward the shooter), points
const BB_RACKS=[[-6.4,1.6],[-4.8,4.9],[0,6.95],[4.8,4.9],[6.4,1.6]];
const BBASE={
  players:'1-4 players',
  build(players){
    const s=newScene({sky:0x2a3550,fog:false,shadow:14,sunX:6,sunY:16,sunZ:8,hemi:.45,sun:.75,hemiSky:0x9fb3d8,hemiGround:0x2a2a3a});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.t=0; this.stateT=0; this.pi=0; this.scores=this.players.map(()=>0); this.shotN=this.players.map(()=>0);
    this.threept=this.mode==='3pt'; this.shotsPer=this.threept?25:8; this.timer=this.threept?60:0;
    // court: hoop at the origin, shooter on +z
    const floor=tplane(30,34,'tex_lane',0xc9955a,1.4); floor.position.set(0,0,6); s.add(floor);
    const key=plane(4.9,5.8,0x2f6fb0,{}); key.position.set(0,.01,2.9); s.add(key); const ft=ring(1.8,1.86,0xffffff); ft.position.set(0,.02,5.8); s.add(ft);
    const arc=ring(6.75,6.83,0xffffff,{seg:64}); arc.position.set(0,.02,0); s.add(arc); const base=line(15,.08,0xffffff,0,-1.2,.02); s.add(base);
    for(const sx of[-1,1]){ const sl=line(.08,1.3,0xffffff,sx*6.75,-.5,.02); s.add(sl); }
    if(!flatBackdrop(s,'bg_arena',60,22,0,9,-14)){ const wall=box(60,14,1,0x1d2438,{cast:false}); wall.position.set(0,7,-14); s.add(wall); }
    backdrop(s,'bg_arena',{r:24,h:14,len:Math.PI*1.2,center:0,rep:3,y:5.5});
    const pole=cyl(.08,.08,3.6,0x555555); pole.position.set(0,1.8,-1.6); s.add(pole); const armb=box(.1,.1,1.2,0x555555); armb.position.set(0,3.35,-1.0); s.add(armb);
    const board=box(1.8,1.05,.05,0xffffff,{m:{transparent:true,opacity:.85}}); board.position.set(0,3.5,BB_CFG.boardZ); s.add(board); const sq=box(.6,.45,.06,0xff5a5f,{cast:false}); sq.position.set(0,3.28,BB_CFG.boardZ+.01); s.add(sq);
    const rim=mesh(new THREE.TorusGeometry(BB_CFG.rimR,.02,8,32),0xff7a2e,{phong:true}); rim.rotation.x=Math.PI/2; rim.position.set(0,BB_CFG.rimH,0); s.add(rim);
    const net=mesh(new THREE.CylinderGeometry(BB_CFG.rimR,.15,.4,16,1,true),0xffffff,{m:{transparent:true,opacity:.5,side:THREE.DoubleSide},cast:false}); net.position.set(0,BB_CFG.rimH-.2,0); s.add(net);
    this.ball={pos:V3(),vel:V3(),state:'held',bounces:0,scored:false,rimTouch:false}; this.ballM=sph(BB_CFG.ballR,0xe8772e,{phong:true},14); s.add(this.ballM); const seam=mesh(new THREE.TorusGeometry(BB_CFG.ballR,.006,6,24),0x222222); this.ballM.add(seam); const seam2=seam.clone(); seam2.rotation.y=Math.PI/2; this.ballM.add(seam2); this.shadow=ballShadow(s);
    this.miis=this.players.map(p=>{ const m=makeMii(p.color,p.name); m.baseExpr='determined'; m.face('determined'); m.g.visible=false; s.add(m.g); if(!p.cpu)m.setTrackedTool('basketball'); else m.setTool('bat'), m.setTool(null); return m; });
    this.tr=new PointTracker(); this.rackBalls=[];
    if(this.threept){ BB_RACKS.forEach(([x,z])=>{ const r=box(.5,.6,.5,0x3a3a3a); r.position.set(x,.3,z); s.add(r); const b=sph(.12,0xe8772e,{phong:true},10); b.position.set(x,.72,z); s.add(b); this.rackBalls.push(b); }); }
    this.beginTurn(); this.hudScore();
  },
  cur(){ return this.players[this.pi]; },
  spot(){ if(this.threept){ const rack=Math.min(4,Math.floor(this.shotN[this.pi]/5)); const r=BB_RACKS[rack]; return {x:r[0],z:r[1],pts:this.shotN[this.pi]%5===4?2:1,rack}; } const sp=BB_SPOTS[(this.shotN[this.pi]+this.pi*3)%BB_SPOTS.length]; return {x:sp[0],z:sp[1],pts:sp[2]}; },
  beginTurn(){ const p=this.cur(); this.state='hold'; this.stateT=0; this.armed=false; this.setT=0; this.snapT=0; this.peak=0; this.vPeak=new THREE.Vector3(); this.sp=this.spot(); const m=this.miis[this.pi]; this.miis.forEach((mm,i)=>mm.g.visible=i===this.pi);
    m.g.position.set(this.sp.x,0,this.sp.z); m.g.rotation.y=Math.atan2(0-this.sp.x,0-this.sp.z); m.anim=null; if(p.cpu){ m.rest=mii=>{ mii.arm('R',-1.4,0,.3); mii.arm('L',-1.4,0,-.3); }; this.cpuAt=this.t+1.4+Math.random(); }
    const b=this.ball; b.state='held'; b.bounces=0; b.scored=false; b.rimTouch=false; b.vel.set(0,0,0);
    if(this.threept&&this.timer<=0)this.timer=60;
    hud('B',turnBox(p,this.threept?`Rack ${this.sp.rack+1} · ball ${this.shotN[this.pi]%5+1} of 5${this.sp.pts===2?' · MONEY BALL':''}`:`Shot ${this.shotN[this.pi]+1} of ${this.shotsPer} · ${this.sp.pts} points`)); this.phones(); },
  phones(){ this.players.forEach((p,i)=>{ if(p.cpu)return; if(i===this.pi)phoneUI(p,{mode:'bb',icon:'🏀',title:'Shoot!',sub:'Hold the phone up like the ball at your set point (top of the phone pointing up). Then push up and snap your wrist forward like a real shot; the ball leaves on the snap.',btns:[{id:'recenter',label:'RECENTER',sec:1}],rate:3}); else phoneUI(p,{mode:'wait',icon:'🏀',title:'Waiting',sub:this.cur().name+' is shooting.',btns:[],rate:3}); }); },
  hudScore(){ hud('TL',scoreboard(this.players.map((p,i)=>({name:p.name,color:p.color,v:this.scores[i]+' <small style="font-size:.55em;color:#6b7c93">pts</small>'})))); if(this.threept)hud('TC',`<b>${Math.ceil(Math.max(0,this.timer))}s</b>`); },
  onBtn(p,id,down,m){ if(this.cur()!==p||this.state!=='hold')return; if(id==='grip'&&!down&&this.tr.n>2){ this.release(this.tr.vel.clone().add(p.ctrl?ctrlVelWorld(this.miis[this.pi],p.ctrl):_bbv2.set(0,0,0)),true); } },
  onSwing(p,sw){ if(this.cur()!==p||this.state!=='hold'||tracked(p))return; const el=(40+clamp(sw.dy,-1,1)*15)*Math.PI/180; const spd=clamp(4+sw.pw*4.5,BB_CFG.minSpeed,BB_CFG.maxSpeed); const m=this.miis[this.pi]; const dir=V3(-this.sp.x,0,-this.sp.z).normalize(); this.launch(V3(dir.x*Math.cos(el)*spd,Math.sin(el)*spd,dir.z*Math.cos(el)*spd),m.g.position.clone().add(V3(0,1.9,0))); },
  update(dt){
    this.t+=dt; this.stateT+=dt; const p=this.cur(), m=this.miis[this.pi], b=this.ball, K=BB_CFG;
    if(this.threept&&this.state!=='over'){ this.timer-=dt; if(this.timer<=0&&this.state==='hold'){ this.timer=0; this.finishTurn(true); } }
    if(this.state==='hold'){
      if(!p.cpu&&tracked(p)){ rigHand(m,p.ctrl,_bbRest,null,.7); this.tr.update(m.toolG,_bbv.set(0,0,.14),dt); b.pos.copy(this.tr.pos);
        // shooting motion: SET (phone pointing up for a moment) then the wrist SNAPS forward -> release with the snap
        const c=p.ctrl; const pitchDeg=c.pitch*180/Math.PI; const hv=ctrlVelWorld(m,c,_bbv2).add(this.tr.vel);
        if(pitchDeg>K.setPitch){ this.setT+=dt; if(this.setT>K.setTime)this.armed=true; } else if(!this.armed)this.setT=0;
        const snap=-c.w.x; // rad/s of forward wrist snap (pitching the top of the phone down toward the hoop)
        if(this.armed&&this.stateT>.3&&pitchDeg<K.releasePitchMax){ if(!this.snapT&&snap>-K.snapRate){ this.snapT=this.stateT; this.snapPeak=snap; this.hvPeak=hv.clone(); this.pitchAt=pitchDeg; }
          if(this.snapT){ if(snap>this.snapPeak){ this.snapPeak=snap; this.hvPeak.copy(hv); this.pitchAt=pitchDeg; } if(this.stateT-this.snapT>K.snapWindow||snap<this.snapPeak*.75){ const st=this.snapT; this.snapT=0; this.releaseSnap(this.snapPeak,this.hvPeak,this.pitchAt); } } } }
      else if(!p.cpu){ m.update(dt); b.pos.copy(m.g.position).add(_bbv.set(0,1.75,0).applyQuaternion(m.g.quaternion)); }
      else { m.update(dt); b.pos.copy(m.g.position).add(_bbv.set(.3,1.7,.4).applyQuaternion(m.g.quaternion)); if(this.t>this.cpuAt){ const d=Math.hypot(this.sp.x,this.sp.z); const el=(48+gauss()*3)*Math.PI/180; const ideal=this.idealSpeed(d,el,1.9); const spd=ideal*(1+gauss()*.045); const dir=V3(-this.sp.x,0,-this.sp.z).normalize().applyAxisAngle(V3(0,1,0),gauss()*.03); this.launch(V3(dir.x*Math.cos(el)*spd,Math.sin(el)*spd,dir.z*Math.cos(el)*spd),b.pos.clone()); } }
    }
    else if(this.state==='fly'){ this.physics(dt); m.update(dt); if(!p.cpu&&tracked(p))rigHand(m,p.ctrl,_bbRest,null,.7); if(b.state==='done'){ this.state='result'; this.stateT=0; } }
    else if(this.state==='result'){ m.update(dt); if(this.stateT>1.4)this.finishTurn(false); }
    this.ballM.position.copy(b.pos); if(b.state==='fly'){ this.ballM.rotation.x-=b.vel.length()*dt*2; } placeShadow(this.shadow,b.pos); this.ballM.visible=this.state!=='over';
    if(m.tracked&&m.ballMesh)m.ballMesh.visible=false;
    // camera: over the shooter's shoulder, drifting after the ball in flight
    const back=_bbv.set(this.sp.x,0,this.sp.z).normalize(); const camP=V3(this.sp.x+back.x*4.4-back.z*1.5,3.1,this.sp.z+back.z*4.4+back.x*1.5); const look=b.state==='fly'?V3(b.pos.x*.5,2.8,b.pos.z*.5):V3(0,2.8,0); camLerp(camP,look,.06);
    if(this.threept)this.hudScore();
  },
  idealSpeed(d,el,y0){ const dy=BB_CFG.rimH-y0; const c=Math.cos(el), s=Math.sin(el); const den=2*c*c*(d*Math.tan(el)-dy); return den>0?Math.sqrt(9.8*d*d/den):8; },
  releaseSnap(snap,hv,pitchDeg){ const K=BB_CFG, p=this.cur(), c=p.ctrl; const from=this.ball.pos.clone();
    const ax=c.axis().clone(); const toHoop=V3(-from.x,0,-from.z).normalize(); let h=V3(ax.x,0,ax.z); if(h.length()<.05)h.copy(toHoop); h.normalize(); h.lerp(toHoop,K.aimAssist).normalize();
    let el=clamp((pitchDeg+10)*Math.PI/180,K.minElev*Math.PI/180,K.maxElev*Math.PI/180);
    const d=Math.hypot(from.x,from.z); const ideal=this.idealSpeed(d,el,from.y); let spd=clamp(K.speedBase+snap*K.snapGain+hv.length()*K.handGain,K.minSpeed,K.maxSpeed); spd=lerp(spd,ideal,K.speedAssist);
    this.launch(V3(h.x*Math.cos(el)*spd,Math.sin(el)*spd,h.z*Math.cos(el)*spd),from); buzz(p,70); },
  release(vel,manual){ const K=BB_CFG, p=this.cur(); const c=p.ctrl; const from=this.ball.pos.clone();
    // direction: the phone's pointing direction blended with the hand path, then partly assisted toward the hoop
    const hv=vel.clone(); const hvN=hv.clone().normalize(); const ax=c?c.axis().clone():hvN.clone(); if(ax.y<-.2||!c)ax.copy(hvN);
    let dir=ax.multiplyScalar(.6).addScaledVector(hvN,.4).normalize();
    const toHoop=V3(0-from.x,0,0-from.z).normalize(); let h=V3(dir.x,0,dir.z); if(h.length()<.05)h.copy(toHoop); h.normalize(); h.lerp(toHoop,K.aimAssist).normalize();
    let el=Math.atan2(dir.y,Math.hypot(dir.x,dir.z)); el=clamp(el,K.minElev*Math.PI/180,K.maxElev*Math.PI/180);
    const d=Math.hypot(from.x,from.z); const ideal=this.idealSpeed(d,el,from.y); let spd=clamp(hv.length()*K.speedGain,K.minSpeed,K.maxSpeed); spd=lerp(spd,ideal,K.speedAssist);
    this.launch(V3(h.x*Math.cos(el)*spd,Math.sin(el)*spd,h.z*Math.cos(el)*spd),from); buzz(p,70); },
  launch(vel,from){ const b=this.ball; b.pos.copy(from); b.vel.copy(vel); b.state='fly'; b.bounces=0; b.scored=false; b.rimTouch=false; b.prevY=b.pos.y; this.state='fly'; this.stateT=0; AUD.swish(); const m=this.miis[this.pi]; if(!m.tracked)m.play('shoot',.6,(mii,k)=>{ mii.arm('R',-2.8*Math.min(1,k*2),0,.2); mii.arm('L',-2.8*Math.min(1,k*2),0,-.2); mii.body.position.y=Math.sin(k*Math.PI)*.15; }); },
  physics(dt){ const b=this.ball, K=BB_CFG; const STEP=1/240; let n=Math.min(40,Math.ceil(dt/STEP)), h=dt/n;
    for(let i=0;i<n;i++){ const py=b.pos.y, pz=b.pos.z; b.vel.y-=9.8*h; b.pos.addScaledVector(b.vel,h);
      // backboard
      if(pz>K.boardZ+K.ballR&&b.pos.z<=K.boardZ+K.ballR&&Math.abs(b.pos.x)<.9&&b.pos.y>2.95&&b.pos.y<4.05){ b.pos.z=K.boardZ+K.ballR; b.vel.z=Math.abs(b.vel.z)*.62; b.vel.x*=.85; AUD.thud(); }
      // rim plane crossing (downwards)
      const dr=Math.hypot(b.pos.x,b.pos.z);
      if(py>K.rimH&&b.pos.y<=K.rimH&&b.vel.y<0){ if(dr<K.rimR-.05&&!b.scored){ b.scored=true; this.score(); } else if(dr<K.rimR+K.ballR&&dr>=K.rimR-.05){ b.rimTouch=true; const nx=b.pos.x/dr, nz=b.pos.z/dr; const inward=dr<K.rimR; const kick=inward?-1:1; b.vel.x=b.vel.x*.4+nx*kick*2.2+gauss()*.6; b.vel.z=b.vel.z*.4+nz*kick*2.2+gauss()*.6; b.vel.y=Math.abs(b.vel.y)*.45; b.pos.y=K.rimH+.01; AUD.tick(); } }
      // upward touch of the rim ring from below / sides
      if(Math.abs(b.pos.y-K.rimH)<K.ballR&&Math.abs(dr-K.rimR)<K.ballR&&!b.scored&&b.vel.y>0){ b.vel.y=-Math.abs(b.vel.y)*.5; b.rimTouch=true; }
      if(b.pos.y<K.ballR){ b.pos.y=K.ballR; b.vel.y=Math.abs(b.vel.y)*.62; b.vel.x*=.85; b.vel.z*=.85; b.bounces++; if(Math.abs(b.vel.y)>.8)AUD.thud(); if(b.bounces>=2||b.vel.length()<1){ b.state='done'; if(!b.scored)this.miss(); return; } }
      if(b.pos.y>25||Math.abs(b.pos.x)>16||b.pos.z<-13||b.pos.z>20){ b.state='done'; if(!b.scored)this.miss(); return; }
    } },
  score(){ const p=this.cur(); const pts=this.sp.pts; this.scores[this.pi]+=pts; AUD.ding(); AUD.cheer(); banner(this.threept&&pts===2?'MONEY BALL!':(this.ball.rimTouch?'IT\'S GOOD!':'SWISH!'),'+'+pts,1.4,'gold'); this.miis[this.pi].face('cheer',2); buzz(p,250); this.hudScore(); },
  miss(){ if(this.ball.scored)return; banner(this.ball.rimTouch?'RIMS OUT':'MISS','',1,'red'); this.miis[this.pi].face('sad',1.5); },
  finishTurn(timeUp){ this.shotN[this.pi]++; if(this.threept&&this.rackBalls.length){ const idx=Math.min(24,this.shotN[this.pi]-1); if(idx%5===4){ /* rack emptied */ } }
    const done=timeUp||this.shotN[this.pi]>=this.shotsPer;
    if(done){ this.shotN[this.pi]=this.shotsPer; let next=this.pi+1; while(next<this.players.length&&this.shotN[next]>=this.shotsPer)next++; if(next>=this.players.length){ this.finish(); return; } this.pi=next; this.timer=this.threept?60:0; }
    else if(!this.threept){ this.pi=(this.pi+1)%this.players.length; while(this.shotN[this.pi]>=this.shotsPer)this.pi=(this.pi+1)%this.players.length; }
    this.beginTurn(); },
  finish(){ this.state='over'; const rows=this.players.map((p,i)=>({p:p.cpu?null:p,name:p.name,color:p.color,val:this.scores[i]})).sort((a,b)=>b.val-a.val).map(r=>Object.assign(r,{score:r.val+' pts'})); endSport(rows,this.name); },
  onKey(k){ if(TEST&&k===' '){ const p=this.cur(); const d=Math.hypot(this.sp.x,this.sp.z); const el=50*Math.PI/180; const spd=this.idealSpeed(d,el,1.9); const dir=V3(-this.sp.x,0,-this.sp.z).normalize(); this.launch(V3(dir.x*Math.cos(el)*spd,Math.sin(el)*spd,dir.z*Math.cos(el)*spd),this.miis[this.pi].g.position.clone().add(V3(0,1.9,0))); } },
  dispose(){}
};
const _bbv=new THREE.Vector3(), _bbv2=new THREE.Vector3(), _bbRest=new THREE.Vector3(.3,.05,.45);
SPORTS.threept=Object.assign({},BBASE,{name:'3-Point Contest',icon:'🏀',mode:'3pt',
  how:['Five racks of five balls along the three-point line, 60 seconds per player.','Shoot like a real jump shot: bring the phone up to your set point (top of the phone pointing up), then push up and snap your wrist forward. The ball leaves on the snap, toward where the phone points, harder for a faster snap.','Every make is 1 point, the last ball of each rack is a MONEY BALL worth 2.','Most points wins.'],
  who:n=>n<=1?'25 balls in 60 seconds':n+' players take turns, 60 s each'});
