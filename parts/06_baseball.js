/* ============================== HOME RUN DERBY ============================== */
SPORTS.baseball={
  name:'Home Run Derby',icon:'⚾',players:'1-4 players',PITCHES:10,FENCE:100,DRAG:.0042,
  how:['Hold your phone like a bat, up over your shoulder.','The pitcher lobs the ball in. Swing when it reaches the plate.','Swing <b>early</b> to pull it left, <b>late</b> to push it right. Hard, well-timed swings go the farthest.','10 pitches each. Balls over the fence are home runs, most home runs wins (total distance breaks ties).'],
  who:n=>n<=1?'10 pitches, beat your best':n+' players alternate pitches, 10 each',
  build(players){
    const s=newScene({sky:0x8fd3ff,shadow:40,sunX:30,sunY:60,sunZ:20,fogNear:150,fogFar:400});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.stats=this.players.map(()=>({hr:0,dist:0,best:0,n:0})); this.turn=0; this.round=0; this.t=0; this.stateT=0;
    s.add(plane(600,600,0x3f9451,{}));
    const dirt=disc(29,0xc59a63,{}); dirt.position.set(0,.006,-19); s.add(dirt); const inf=plane(27.4,27.4,0x4aa85a,{}); inf.position.set(0,.012,-19.4); inf.rotation.z=Math.PI/4; s.add(inf);
    const home=disc(4,0xc59a63,{}); home.position.set(0,.014,0); s.add(home);
    const mound=cyl(2.8,3.2,.3,0xc59a63); mound.position.set(0,.15,-18.4); s.add(mound);
    [[19.4,-19.4],[0,-38.8],[-19.4,-19.4]].forEach(([x,z])=>{ const b=box(.9,.12,.9,0xffffff); b.position.set(x,.06,z); s.add(b); }); const hp=box(.6,.03,.6,0xffffff,{cast:false}); hp.position.set(0,.02,0); s.add(hp);
    [[0,0,19.4,-19.4],[19.4,-19.4,0,-38.8],[0,-38.8,-19.4,-19.4],[-19.4,-19.4,0,0]].forEach(([x1,z1,x2,z2])=>{ const l=line(1.6,27.4,0xc59a63,(x1+x2)/2,(z1+z2)/2,.01,Math.atan2(x2-x1,z2-z1)); s.add(l); });
    for(const sx of[-1,1]){ const fl=line(.3,150,0xffffff,sx*53,-53,.02,sx*Math.PI/4); s.add(fl); }
    const F=this.FENCE; for(let a=-48;a<48;a+=4){ const r=a*Math.PI/180, r2=(a+4)*Math.PI/180; const x=Math.sin((r+r2)/2)*F, z=-Math.cos((r+r2)/2)*F; const seg=box(F*(r2-r)+.3,3.2,.4,0x2f6fb0,{cast:false}); seg.position.set(x,1.6,z); seg.rotation.y=-(r+r2)/2; s.add(seg); const top=box(F*(r2-r)+.3,.2,.5,0xffc233,{cast:false}); top.position.set(x,3.3,z); top.rotation.y=-(r+r2)/2; s.add(top);
      for(let i=0;i<5;i++){ const st=box(F*(r2-r)+1,2,4,i%2?0x9fb3c8:0x8ea3b8,{cast:false}); const rr=F+4+i*4; st.position.set(Math.sin((r+r2)/2)*rr,1+i*2,-Math.cos((r+r2)/2)*rr); st.rotation.y=-(r+r2)/2; s.add(st); } }
    const spots=[]; for(let a=-45;a<=45;a+=6){ const r=a*Math.PI/180; for(let i=0;i<4;i++){ const rr=F+5+i*4; spots.push([Math.sin(r)*rr,2.4+i*2,-Math.cos(r)*rr,2,.3,2]); } } crowd(s,spots,400);
    [[-60,45,-160],[40,50,-220],[120,42,-120],[-130,48,-100]].forEach(([x,y,z])=>s.add(cloud(x,y,z,4)));
    stand(s,0,0,14,40,Math.PI,4); crowd(s,[[0,1.4,12.5,18,3,1]],90);
    this.miis=this.players.map(p=>{ const m=makeMii(p.color,p.name); m.setTool('bat'); m.g.visible=false; m.g.position.set(-.85,0,.15); m.g.rotation.y=Math.PI/2; s.add(m.g); return m; });
    this.pitcher=makeMii('#dddddd','',{}); this.pitcher.g.position.set(0,.3,-18); this.pitcher.g.rotation.y=0; s.add(this.pitcher.g);
    this.catcher=makeMii('#555555','',{}); this.catcher.g.position.set(0,0,1.6); this.catcher.g.rotation.y=Math.PI; this.catcher.g.scale.set(1,.7,1); s.add(this.catcher.g);
    this.ball={pos:V3(0,1.7,-17.7),vel:V3(),active:false,phase:'none',landed:false}; this.ballM=sph(.075,0xffffff,{phong:true},12); s.add(this.ballM); this.shadow=ballShadow(s);
    camSet(V3(0,2.6,7),V3(0,1.4,-14)); this.hudScore(); this.beginPitch();
  },
  cur(){ return this.players[this.turn]; },
  phones(){ this.players.forEach((p,i)=>{ if(p.cpu)return; if(i===this.turn)phoneUI(p,{mode:'base',icon:'⚾',title:'Batter up!',sub:'Bat over your shoulder. Swing when the pitch reaches the plate.',btns:[],rate:3}); else phoneUI(p,{mode:'wait',icon:'⚾',title:'Waiting',sub:this.cur().name+' is batting.',btns:[],rate:3}); }); },
  beginPitch(){ this.state='windup'; this.stateT=0; this.ball.active=false; this.ball.phase='none'; this.swung=false; this.miis.forEach((m,i)=>{ m.g.visible=i===this.turn; m.anim=null; m.rest=mii=>{ mii.arm('R',-2.2,-.6,-.3); mii.arm('L',-1.9,.5,.4); mii.body.rotation.y=lerp(mii.body.rotation.y,.25,.1); }; });
    const p=this.cur(); if(p.cpu)this.cpuDt=gauss()*.06; hud('B',turnBox(p,`Pitch ${this.round+1} of ${this.PITCHES}`)); this.phones();
    this.pitcher.play('windup',1.3,(m,k)=>{ m.arm('R',-k*2.6,0,-.4*k); m.arm('L',-1.2*Math.sin(k*Math.PI),0,.6); m.body.rotation.x=-.2*Math.sin(k*Math.PI); m.headG.rotation.x=.1*k; }); },
  pitch(){ const b=this.ball; b.pos.set(.3,1.85,-17.6); const T=.92; const tx=0,ty=1.05,tz=.15; b.vel.set((tx-b.pos.x)/T,(ty-b.pos.y+.5*9.8*T*T)/T,(tz-b.pos.z)/T); b.active=true; b.phase='pitch'; this.ideal=this.t+T; this.state='pitch'; this.stateT=0; AUD.swish(); this.pitcher.play('throw',.5,(m,k)=>{ m.arm('R',lerp(-2.6,.6,easeOut(k)),0,-.4*(1-k)); m.body.rotation.x=.2*Math.sin(k*Math.PI); }); const p=this.cur(); if(p.cpu)this.cpuAt=this.ideal+this.cpuDt; },
  animSwing(m){ AUD.whoosh(); m.play('swing',.45,(mii,k)=>{ const e=easeOut(k); mii.arm('R',lerp(-2.2,-1.4,e),lerp(-.6,1.9,e),-.3); mii.arm('L',lerp(-1.9,-1.3,e),lerp(.5,2.2,e),.4); mii.body.rotation.y=lerp(.25,-1.1,e); mii.headG.rotation.y=-.4*e; }); },
  onSwing(p,sw){ if(this.cur()!==p)return; this.swing(sw.start,sw.pw,sw); },
  swing(start,pw,sw){ if(this.swung||this.state!=='pitch'&&this.state!=='windup')return; const m=this.miis[this.turn]; if(this.state==='windup'){ this.animSwing(m); return; } this.swung=true; this.animSwing(m);
    const dt=start-this.ideal; const q=Math.abs(dt)<=.05?1:Math.max(0,1-(Math.abs(dt)-.05)/.2); const b=this.ball;
    if(q<=0||b.pos.z>1.2){ this.result('SWING AND A MISS','',0); return; }
    const th=(clamp(dt/.25,-1,1)*50+gauss()*5)*Math.PI/180, ph=(20+15*q+gauss()*7)*Math.PI/180; const v=22+26*q*clamp(pw,.5,1.4)/1.4;
    b.vel.set(Math.sin(th)*Math.cos(ph)*v,Math.sin(ph)*v,-Math.cos(th)*Math.cos(ph)*v); b.phase='hit'; b.landed=false; b.maxD=0; this.state='hit'; this.stateT=0; this.hitQ=q; this.hitTheta=th; AUD.crack(); const p=this.cur(); if(!p.cpu)buzz(p,120);
    if(!sw||!sw.touch)b.pos.z=Math.min(b.pos.z,.2); },
  result(txt,sub,dist,hr){ this.state='result'; this.stateT=0; const st=this.stats[this.turn]; st.n++; st.dist+=dist; st.best=Math.max(st.best,dist); if(hr){ st.hr++; AUD.cheer(); const p=this.cur(); if(!p.cpu)buzz(p,400); } banner(txt,sub,2,hr?'gold':''); this.hudScore(); hud('B',''); },
  hudScore(){ hud('TL',scoreboard(this.players.map((p,i)=>({name:p.name,color:p.color,v:this.stats[i].hr+' <small style="font-size:.55em;color:#6b7c93">HR</small>'})))); },
  update(dt){
    this.t+=dt; this.stateT+=dt; const b=this.ball, p=this.cur();
    if(this.state==='windup'&&this.stateT>1.25)this.pitch();
    if(this.state==='pitch'){ if(p.cpu&&!this.swung&&this.t>=this.cpuAt)this.swing(this.cpuAt,clamp(1+gauss()*.2,.6,1.4)); }
    if(b.active&&b.phase==='pitch'){ b.vel.y-=9.8*dt; b.pos.addScaledVector(b.vel,dt); if(b.pos.z>1.9){ b.active=false; if(this.state==='pitch'){ this.state='result'; this.stateT=.6; hud('B',''); if(!this.swung){ banner('TAKEN','no swing',1.4); this.stats[this.turn].n++; } } } }
    if(b.active&&b.phase==='hit'){ const STEP=1/120; let n=Math.ceil(dt/STEP), h=dt/n; for(let i=0;i<n;i++){ const sp=b.vel.length(); b.vel.addScaledVector(b.vel,-this.DRAG*sp*h); b.vel.y-=9.8*h; const pr=Math.hypot(b.pos.x,b.pos.z); b.pos.addScaledVector(b.vel,h); const r=Math.hypot(b.pos.x,b.pos.z);
        if(!b.landed&&pr<this.FENCE&&r>=this.FENCE){ const foul=Math.abs(Math.atan2(b.pos.x,-b.pos.z))>Math.PI/4; if(b.pos.y>3.2){ if(!foul){ const q=b.pos.clone(),v=b.vel.clone(); let g=0; while(q.y>0&&g++<3000){ const s2=v.length(); v.addScaledVector(v,-this.DRAG*s2*.01); v.y-=.098; q.addScaledVector(v,.01); } const carry=Math.hypot(q.x,q.z); this.result('HOME RUN!',Math.round(carry)+' m',carry,true); } else this.result('FOUL BALL','',0); b.landed=true; }
          else { b.vel.z*=-.3; b.vel.x*=.3; b.pos.setLength(this.FENCE-.5); b.pos.y=Math.max(b.pos.y,.1); AUD.thud(); if(!b.landed){ const foul2=Math.abs(Math.atan2(b.pos.x,-b.pos.z))>Math.PI/4; this.result(foul2?'FOUL BALL':'OFF THE WALL',foul2?'':Math.round(r)+' m',foul2?0:r); b.landed=true; } } }
        if(b.pos.y<.075){ b.pos.y=.075; if(!b.landed){ const foul=Math.abs(Math.atan2(b.pos.x,-b.pos.z))>Math.PI/4; const d=Math.hypot(b.pos.x,b.pos.z); this.result(foul?'FOUL BALL':(d<40?'GROUND BALL':'CAUGHT'),foul?'':Math.round(d)+' m',foul?0:d); b.landed=true; } b.vel.y*=-.45; b.vel.x*=.7; b.vel.z*=.7; if(Math.abs(b.vel.y)<.5)b.vel.y=0; }
        if(b.landed){ b.vel.x*=(1-1.5*h); b.vel.z*=(1-1.5*h); } if(r>this.FENCE+60||(b.landed&&b.vel.length()<.3)){ b.active=false; break; } } }
    if(this.state==='result'&&this.stateT>2.4&&(!b.active||b.phase!=='hit'||this.stateT>4.5)){ this.next(); }
    this.ballM.position.copy(b.pos); this.ballM.visible=b.active; placeShadow(this.shadow,b.pos); this.shadow.visible=b.active;
    if(b.active&&b.phase==='hit'){ const dir=V3(b.vel.x,0,b.vel.z).normalize(); camLerp(V3(b.pos.x-dir.x*16,b.pos.y*.5+6,b.pos.z-dir.z*16),b.pos.clone(),.12); }
    else if(this.state!=='result'||!b.active){ camLerp(V3(0,2.6,7),V3(0,1.4,-14),.06); }
    this.miis.forEach(m=>m.update(dt)); this.pitcher.update(dt); this.catcher.update(dt);
  },
  next(){ this.turn++; if(this.turn>=this.players.length){ this.turn=0; this.round++; } if(this.round>=this.PITCHES){ this.finish(); return; } this.beginPitch(); },
  finish(){ const rows=this.players.map((p,i)=>({p:p.cpu?null:p,name:p.name,color:p.color,hr:this.stats[i].hr,d:this.stats[i].dist})).sort((a,b)=>b.hr-a.hr||b.d-a.d).map(r=>Object.assign(r,{score:r.hr+' HR · '+Math.round(r.d)+' m'})); endSport(rows,'Home Run Derby'); },
  onKey(k){ if(TEST&&k===' ')this.swing(this.t,1); },
  dispose(){}
};
