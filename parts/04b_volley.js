/* ============================== VOLLEYBALL (timed bump / set / spike) ============================== */
const VB_CFG={HL:9,HW:4.5,NET:2.1,BR:.12,winPts:7,window:.34,perfect:.09,good:.2,tossV:5.2,backZ:6.6,frontZ:2.4,miiScale:.85,cpuErr:.045,cpuFail:.06,cpuFailQ:.4,spikeTFast:.62,spikeTSlow:1.2,txMax:3.6};
// arc to (tx,tz) in T seconds, lifted if needed so it clears the net by a margin
function vbLob(b,tx,tz,T,margin=.25){ const K=VB_CFG; arcTo(b.vel,b.pos.x,b.pos.y,b.pos.z,tx,K.BR,tz,T); if(Math.sign(b.pos.z)!==Math.sign(tz)){ const tn=Math.abs(b.pos.z)/Math.max(.01,Math.abs(b.vel.z)); const yn=b.pos.y+b.vel.y*tn-4.9*tn*tn; const want=K.NET+margin; if(yn<want)b.vel.y+=(want-yn)/tn; } }
SPORTS.volley={
  name:'Volleyball',icon:'🏐',players:'1-4 players',
  how:['Teams of two, one side each. Your player runs under the ball; a ring shrinks onto them as the ball comes down.','Swing the phone when the ring closes: BUMP the first touch, SET the second, SPIKE the third over the net. Perfect timing makes a harder spike and a cleaner set.','Swing early to spike left, late to spike right. Miss the timing and the ball drops: point to the other team.','Serve by swinging when the toss reaches the top. First to 7 points.'],
  who:n=>n<=1?'You + a computer partner vs two computers':n===2?'P1 & a computer vs P2 & a computer':n===3?'P1 & P3 vs P2 & a computer':'P1 & P3 vs P2 & P4',
  build(players){
    const K=VB_CFG; const s=newScene({sky:0x8fd3ff,shadow:22,sunX:12,sunY:30,sunZ:14});
    this.players=players; this.t=0; this.stateT=0; this.pts=[0,0]; this.server=0; this.over=null; this.log=[];
    skyDome(s); backdrop(s,'bg_crowd',{r:36,h:15,len:Math.PI*1.5,center:Math.PI,rep:3,y:7.5}); const ground=tplane(120,120,'tex_grass',0x3f9451,6); s.add(ground);
    const sand=tdisc(1,'tex_dirt',0xe9d59a,4,{seg:4}); sand.scale.set(K.HW+1.6,K.HL+1.6,1); sand.rotation.z=Math.PI/4; sand.position.y=.006; s.add(sand);
    const court=plane(K.HW*2,K.HL*2,0xe4c98f,{}); court.position.y=.01; s.add(court); const W=0xffffff; [[K.HW*2,.08,0,K.HL],[K.HW*2,.08,0,-K.HL],[.08,K.HL*2,K.HW,0],[.08,K.HL*2,-K.HW,0],[K.HW*2,.06,0,3],[K.HW*2,.06,0,-3]].forEach(([w,l,x,z])=>s.add(line(w,l,W,x,z,.014)));
    const netM=mesh(new THREE.PlaneGeometry(K.HW*2+1,1),0x223344,{m:{transparent:true,opacity:.5,side:THREE.DoubleSide},cast:false}); netM.position.y=K.NET-.5; s.add(netM); const netTop=box(K.HW*2+1,.06,.06,W); netTop.position.y=K.NET; s.add(netTop); for(const x of[-K.HW-.6,K.HW+.6]){ const p=cyl(.07,.07,K.NET+.2,0x333333); p.position.set(x,(K.NET+.2)/2,0); s.add(p); }
    this.T=[{side:1,chars:[]},{side:-1,chars:[]}]; const order=[0,1,0,1]; players.forEach((p,i)=>this.addChar(p,order[i]));
    this.T.forEach((t,ti)=>{ while(t.chars.length<2)this.addChar(cpuPlayer(t.chars.length?'CPU '+(ti+1):'CPU',ti?'#8899aa':'#aab4c8'),ti); t.name=t.chars.map(c=>c.p.name).join(' & '); t.color=t.chars[0].p.color; t.chars.forEach((c,i)=>{ c.role=i===0?'back':'front'; c.homeX=i===0?-1.4:1.4; c.homeZ=t.side*(i===0?K.backZ:K.frontZ); c.x=c.homeX; c.z=c.homeZ; c.mii.g.position.set(c.x,0,c.z); c.mii.g.rotation.y=t.side>0?Math.PI:0; }); });
    this.ball={pos:V3(0,2,0),vel:V3(),active:false,lastTeam:-1}; this.ballM=sph(K.BR,0xffffff,{phong:true},14); const band=mesh(new THREE.TorusGeometry(K.BR,.015,6,24),0x2f80ff); this.ballM.add(band); const band2=band.clone(); band2.rotation.x=Math.PI/2; this.ballM.add(band2); s.add(this.ballM); this.shadow=ballShadow(s);
    this.ring=mesh(new THREE.TorusGeometry(.5,.05,8,40),0xffc233,{m:{emissive:0xb08000},cast:false}); this.ring.rotation.x=Math.PI/2; this.ring.visible=false; s.add(this.ring);
    this.touch=null; camSet(V3(0,7.5,17.5),V3(0,1.5,-2)); this.serveSetup(); this.hudScore(); this.phones();
  },
  addChar(p,ti){ const K=VB_CFG; const t=this.T[ti]; const mii=makeMii(p.color,p.name); mii.g.scale.setScalar(K.miiScale); mii.baseExpr='determined'; mii.face('determined'); R.scene.add(mii.g); const c={p,cpu:!!p.cpu,mii,team:ti,side:t.side,x:0,z:0,tx:0,tz:0,jump:0}; if(!c.cpu){ mii.setTrackedTool(null); c.ctrl=ctrlOf(p); mii.rest=m=>{ m.arm('L',-.5,.2,-.3); }; } else mii.rest=m=>{ m.arm('R',-.5,-.2,.3); m.arm('L',-.5,.2,-.3); }; t.chars.push(c); p.char=c; return c; },
  phones(){ this.players.forEach(p=>{ const c=p.char; const my=this.touch&&this.touch.c===c; const srv=this.state==='serve'&&this.serverChar()===c; phoneUI(p,{mode:'volley',icon:'🏐',title:srv?'Your serve':my?this.touch.kind.toUpperCase()+'!':'Get ready',sub:srv?'Swing when the toss reaches the top.':'Swing when the ring closes on your player. Early = left, late = right.',btns:[],rate:3}); }); },
  serverChar(){ const t=this.T[this.server]; return t.chars[0]; },
  serveSetup(){ const K=VB_CFG; this.state='serve'; this.stateT=0; this.tossed=false; this.ball.active=false; this.touch=null; this.ring.visible=false; this.T.forEach(t=>t.chars.forEach(c=>{ c.tx=c.homeX; c.tz=c.homeZ; })); const sc=this.serverChar(); sc.tx=0; sc.tz=sc.side*(K.HL+.6); hud('B',turnBox(sc.p,'to serve')); this.phones(); },
  toss(){ const K=VB_CFG; const sc=this.serverChar(); const b=this.ball; b.pos.set(sc.x,1.6,sc.z-sc.side*.4); b.vel.set(0,K.tossV,0); b.active=true; b.lastTeam=-1; this.tossed=true; sc.swung=false; this.tossPeak=this.t+K.tossV/9.8; if(sc.cpu)sc.cpuAt=this.tossPeak+gauss()*.03; },
  // plan the next touch for the receiving team: who, where, what height, when
  plan(ti,n){ const K=VB_CFG, t=this.T[ti], b=this.ball; const c=n===1?t.chars[1]:n===2?t.chars[0]:t.chars[1]; // front bumps... alternate so both touch: back bumps, front sets, back spikes
    const who=n===1?t.chars[0]:n===2?t.chars[1]:t.chars[0]; const h=n===1?1.1:n===2?1.9:2.5; const kind=n===1?'bump':n===2?'set':'spike';
    // time when the falling ball reaches height h
    const g=9.8; const disc=b.vel.y*b.vel.y-2*g*(h-b.pos.y); let tt; if(disc<0)tt=Math.max(.05,b.vel.y/g); else tt=(b.vel.y+Math.sqrt(disc))/g; tt=Math.max(.08,tt);
    const px=clamp(b.pos.x+b.vel.x*tt,-K.HW-.5,K.HW+.5), pz=clamp(b.pos.z+b.vel.z*tt,ti===0?.6:-K.HL-.5,ti===0?K.HL+.5:-.6);
    this.touch={team:ti,n,c:who,kind,h,x:px,z:pz,at:this.t+tt,done:false,cpuAt:this.t+tt+gauss()*K.cpuErr}; who.tx=px-(who.cpu?0:0); who.tz=pz; this.phones(); },
  update(dt){
    const K=VB_CFG; this.t+=dt; this.stateT+=dt; const b=this.ball;
    if(this.state==='serve'){ if(!this.tossed&&this.stateT>1.2)this.toss(); if(this.tossed){ this.fly(dt,true); const sc=this.serverChar(); if(sc.cpu&&this.t>=sc.cpuAt&&b.active&&!sc.swung){ sc.swung=true; this.serve(sc,gauss()*.05); } if(b.pos.y<K.BR+.02&&b.vel.y<0){ b.active=false; this.tossed=false; this.stateT=.4; sc.swung=false; } } }
    else if(this.state==='rally'){ const Th=this.touch; if(Th&&!Th.done&&!Th.c.cpu&&this.t>=Th.at-.02&&b.pos.y<Th.h-.3&&this.t<Th.at+K.window){ b.pos.y=Th.h-.3; b.vel.set(0,0,0); } this.fly(dt,false); const T=this.touch; if(T&&!T.done){ const c=T.c; if(c.cpu&&this.t>=T.cpuAt){ T.done=true; if(T.n===1&&b.vel.length()>7&&Math.random()<K.cpuFail+(this.spikeQ||0)*K.cpuFailQ){ /* CPU fails a hard spike */ c.mii.face('sad',1); banner('DIG MISSED','',.6); } else this.perform(c,T.cpuAt-T.at); } else if(this.t>T.at+K.window){ T.done=true; this.point(1-T.team,'DROP'); } } }
    else if(this.state==='point'){ if(b.active)this.fly(dt,false,true); if(this.stateT>2){ if(this.over!=null)this.finish(); else this.serveSetup(); } }
    this.T.forEach(t=>t.chars.forEach(c=>{ const sp=8*dt; c.x+=clamp(c.tx-c.x,-sp,sp); c.z+=clamp(c.tz-c.z,-sp,sp); c.mii.g.position.set(c.x,c.jump,c.z); c.jump=Math.max(0,c.jump-3*dt); if(!c.cpu&&tracked(c.p))rigHand(c.mii,c.p.ctrl,_vb1.set(.35,-.1,.4)); c.mii.update(dt); }));
    // timing ring on the player about to touch
    const T=this.touch; if(this.state==='rally'&&T&&!T.done){ const left=T.at-this.t; this.ring.visible=true; this.ring.position.set(T.c.x,.05,T.c.z); const k=clamp(left/1.0,0,1); this.ring.scale.setScalar(.7+k*2.4); this.ring.material.color.setHex(left<K.perfect?0x37c95c:0xffc233); } else this.ring.visible=false;
    this.ballM.position.copy(b.pos); this.ballM.visible=b.active||this.state!=='rally'; if(b.active)this.ballM.rotation.x+=dt*4; placeShadow(this.shadow,b.pos); this.shadow.visible=b.active;
    camLerp(V3(clamp(b.pos.x*.2,-1.5,1.5),7.5,17.5),V3(clamp(b.pos.x*.3,-2,2),1.5,-2),.05);
  },
  fly(dt,tossing,dead){ const K=VB_CFG, b=this.ball; const pz=b.pos.z; b.vel.y-=9.8*dt; b.pos.addScaledVector(b.vel,dt);
    if(!tossing&&!dead&&Math.sign(pz)!==Math.sign(b.pos.z)&&pz!==0){ if(b.pos.y<K.NET+K.BR){ b.vel.z*=-.2; b.vel.x*=.4; b.pos.z=pz; AUD.buzz(); this.point(1-b.lastTeam,'NET'); return; } const ti=b.pos.z>0?0:1; this.plan(ti,1); }
    if(b.pos.y<K.BR){ b.pos.y=K.BR; if(!tossing&&!dead){ const sideTeam=b.pos.z>0?0:1; const out=Math.abs(b.pos.x)>K.HW+.1||Math.abs(b.pos.z)>K.HL+.1; if(out)this.point(sideTeam,'OUT'); else this.point(1-sideTeam,'POINT'); } b.vel.y*=-.4; b.vel.x*=.6; b.vel.z*=.6; } },
  // a human swing: serve or perform the planned touch if the timing fits
  onSwingStart(p){ this.swingFrom(p); }, onSwing(p,sw){ if(sw.touch)return; },
  swingFrom(p){ const K=VB_CFG; const c=p.char; if(!c)return; const b=this.ball;
    if(this.state==='serve'){ if(this.serverChar()!==c||!this.tossed||!b.active)return; const dt=this.t-this.tossPeak; if(Math.abs(dt)>K.window)return; this.serve(c,dt); return; }
    const T=this.touch; if(this.state!=='rally'||!T||T.done||T.c!==c)return; const dt=this.t-T.at; if(dt<-K.window)return; T.done=true; this.perform(c,dt); },
  serve(c,dt){ const K=VB_CFG, b=this.ball; const q=1-Math.min(1,Math.abs(dt)/K.window); this.animHit(c,'spike'); const tx=rnd(-2.5,2.5), tz=-c.side*rnd(3,7.5); const T=lerp(1.5,1.0,q); vbLob(b,tx,tz,T,.3+(1-q)*.8); b.lastTeam=c.team; b.active=true; this.spikeQ=c.cpu?0:q*q*.5; this.state='rally'; this.stateT=0; this.touch=null; AUD.pop(); this.judge(c,dt,'SERVE'); hud('B',''); this.phones(); },
  perform(c,dt){ const K=VB_CFG, b=this.ball, T=this.touch; const q=1-Math.min(1,Math.abs(dt)/K.window); const side=c.side; this.animHit(c,T.kind); b.lastTeam=c.team;
    if(T.kind==='bump'){ const setter=this.T[c.team].chars[1]; const tx=setter.homeX*.6, tz=side*(K.frontZ+.2); arcTo(b.vel,b.pos.x,b.pos.y,b.pos.z,tx+gauss()*(1-q)*1.2,1.9,tz,1.15); this.plan(c.team,2); }
    else if(T.kind==='set'){ const tx=clamp(b.pos.x*.3+(Math.random()<.5?-1.5:1.5),-K.HW+1,K.HW-1), tz=side*1.3; arcTo(b.vel,b.pos.x,b.pos.y,b.pos.z,tx+gauss()*(1-q)*.8,2.5,tz,1.1); this.plan(c.team,3); }
    else { const k=clamp(dt/K.window,-1,1); const tx=clamp(k*K.txMax*side+gauss()*.4,-K.HW+.3,K.HW-.3); const tz=-side*lerp(2.5,7.5,Math.random()*.4+q*.6); const Tf=lerp(K.spikeTSlow,K.spikeTFast,q); vbLob(b,tx,tz,Tf,.2); c.jump=.5; this.spikeQ=c.cpu?0:q*q; this.touch=null; }
    AUD.pop(); this.judge(c,dt,T.kind.toUpperCase()); },
  judge(c,dt,what){ const K=VB_CFG; const ad=Math.abs(dt); const kind=ad<=K.perfect?'PERFECT':ad<=K.good?'GOOD':(dt<0?'EARLY':'LATE'); banner(kind,what,.6,kind==='PERFECT'?'gold':''); if(!c.cpu){ buzz(c.p,kind==='PERFECT'?120:50); c.mii.face(kind==='PERFECT'?'cheer':'happy',.6); } },
  animHit(c,kind){ const m=c.mii; if(kind==='bump')m.play('bump',.4,(mii,k)=>{ const e=Math.sin(k*Math.PI); if(!mii.tracked){ mii.arm('R',-.9-e*.5,-.2,.2); } mii.arm('L',-.9-e*.5,.2,-.2); mii.body.rotation.x=.15*e; });
    else if(kind==='set')m.play('set',.4,(mii,k)=>{ const e=Math.sin(k*Math.PI); if(!mii.tracked)mii.arm('R',-2.6-e*.3,0,.3); mii.arm('L',-2.6-e*.3,0,-.3); });
    else m.play('spike',.5,(mii,k)=>{ const e=easeOut(Math.min(1,k*1.4)); if(!mii.tracked)mii.arm('R',-2.9+e*1.8,0,.2); mii.arm('L',-2.2,0,-.4); mii.body.rotation.x=-.2+e*.5; }); AUD.whoosh(); },
  point(ti,why){ if(this.state==='point')return; const K=VB_CFG; this.state='point'; this.stateT=0; this.log.push(why+':'+ti); this.pts[ti]++; this.server=ti; const t=this.T[ti]; AUD.cheer(); let txt=why==='DROP'?'DROPPED':why, sub=t.name+' wins the point'; if(this.pts[ti]>=K.winPts){ txt='GAME'; sub=t.name+' wins '+this.pts[ti]+'-'+this.pts[1-ti]; this.over=ti; }
    banner(txt,sub,1.8,ti===0?'':'red'); this.hudScore(); this.ring.visible=false; this.touch=null; this.T[1-ti].chars.forEach(c=>c.mii.face('sad',2)); t.chars.forEach(c=>{ c.mii.face('cheer',2); if(!c.cpu)buzz(c.p,150); }); },
  hudScore(){ hud('TL',scoreboard([{name:this.T[0].name,color:this.T[0].color,v:this.pts[0]},{name:this.T[1].name,color:this.T[1].color,v:this.pts[1]}])); },
  finish(){ const w=this.over; const rows=[]; [w,1-w].forEach(ti=>this.T[ti].chars.forEach(c=>rows.push({p:c.cpu?null:c.p,name:c.p.name,color:c.p.color,score:(ti===w?'WIN ':'LOSS ')+this.pts[ti]+'-'+this.pts[1-ti]}))); endSport(rows,'Volleyball'); },
  onKey(k){ if(TEST&&k===' '&&this.players[0])this.swingFrom(this.players[0]); },
  dispose(){ this.players.forEach(p=>delete p.char); }
};
const _vb1=new THREE.Vector3();
