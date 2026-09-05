/* =====================================================================
   SPORTS. Each sport: build(players), update(dt), onSwing(p,sw), onSwingStart(p),
   onBtn(p,id,down,m), onOrient(p), onKey(k), onJoin(p), dispose().
   Tracked sports read the continuous controller (ctrlOf(p): q, axis(), normal(), w, v, pos, stationary).
   The swing events (sw = {start, pw, dx,dy,dz, rg, ...}) are a secondary/fallback layer (touch mode, no sensors).
   ===================================================================== */
const SPORTS={};
function hud(id,html){ $('#hud'+id).innerHTML=html; }
function scoreboard(rows){ return '<div class="sb">'+rows.map(r=>`<div class="nm"><span class="dot" style="--c:${r.color}"></span>${esc(r.name)}</div><div class="v">${r.v}</div>`).join('')+'</div>'; }
function turnBox(p,txt){ return `<div class="turn"><span class="dot" style="--c:${p.color}"></span><b>${esc(p.name)}</b> <span>${txt||''}</span></div>`; }
function ballShadow(s){ const d=disc(.13,0x000000,{m:{transparent:true,opacity:.35},recv:false}); d.position.y=.012; s.add(d); return d; }
function placeShadow(sh,pos,scale=1){ sh.position.x=pos.x; sh.position.z=pos.z; const k=scale/(1+Math.max(0,pos.y)*.25); sh.scale.set(k,k,1); }
// aim from the phone: turn the phone left/right (relative compass heading since the turn began); falls back to left/right tilt when no heading is available
function aimFrom(sp,p){ const o=p.orient; if(sp.yaw0==null)sp.yaw0=o.a; let d=o.a-sp.yaw0; d=((d+540)%360)-180; if(o.a===0&&sp.yaw0===0)return clamp(o.g/30,-1,1); return clamp(-d/28,-1,1); }
function cpuPlayer(name,color){ return {slot:-1,name,color,cname:'CPU',cpu:true,fake:true,inbox:[],btn:{},orient:{a:0,b:0,g:0}}; }
// is this player driving a live tracked controller (vs. touch/legacy swing events)?
function tracked(p){ return !p.cpu&&p.ctrl&&p.ctrl.live; }
const TENNIS_CFG={hitRadius:.38,assistRadius:.8,assistSpeed:3,vAssist:1.0,restitution:.75,minSpeed:10,maxSpeed:27,spinGain:.14,maxAngle:38,paceBase:6,paceGain:1.6,faceWeight:1.0,swingWeight:.7};

/* ============================== TENNIS ============================== */
SPORTS.tennis={
  name:'Tennis',icon:'🎾',players:'1-4 players',
  how:['Your racket follows your phone: tilt, turn and roll it and the racket does the same. Hold it like a racket handle, screen up.','Your player runs to the ball. Swing through the ball with the racket face to hit it; the face angle steers it, the swing speed sets the pace, swinging upward adds topspin.','A slow racket only blocks the ball back. Miss the ball and the point is lost.','To serve, hit the tossed ball. First to win 2 games takes the match.'],
  who:n=>n<=1?'You vs the computer':n===2?'Player 1 vs Player 2':n===3?'Doubles: P1 & P3 vs P2 & a computer partner':'Doubles: P1 & P3 vs P2 & P4',
  HL:11.885,HW:4.115,NET:.95,BR:.067,
  build(players){
    const s=newScene({sky:0x8fd3ff,shadow:26,sunX:14,sunY:36,sunZ:18});
    this.players=players; this.t=0; this.state='serve'; this.pts=[0,0]; this.games=[0,0]; this.server=0; this.stateT=0; this.serveCount=0; this.over=null; this.log=[];
    const ground=tplane(160,200,'tex_grass',0x3f9451,6); s.add(ground); skyDome(s); backdrop(s,'bg_crowd',{r:40,h:17,len:Math.PI*1.5,center:Math.PI,rep:3,y:8.5});
    const inner=plane(13,27,0x3b7fc4,{}); inner.position.y=.005; s.add(inner);
    const court=plane(10.97,23.77,0x4b8fd6,{}); court.position.y=.008; s.add(court);
    const W=0xffffff; [[.08,23.77,5.485,0],[.08,23.77,-5.485,0],[.08,23.77,4.115,0],[.08,23.77,-4.115,0]].forEach(([w,l,x,z])=>s.add(line(w,l,W,x,z,.012)));
    [[10.97,.08,0,11.885],[10.97,.08,0,-11.885],[8.23,.08,0,6.4],[8.23,.08,0,-6.4],[.08,12.8,0,0]].forEach(([w,l,x,z])=>s.add(line(w,l,W,x,z,.012)));
    [[.08,.3,0,11.75],[.08,.3,0,-11.75]].forEach(([w,l,x,z])=>s.add(line(w,l,W,x,z,.012)));
    const netP=box(12.4,.05,.05,W); netP.position.y=this.NET; s.add(netP);
    const netM=mesh(new THREE.PlaneGeometry(12.4,this.NET),0x223344,{m:{transparent:true,opacity:.55,side:THREE.DoubleSide},cast:false}); netM.position.y=this.NET/2; s.add(netM);
    for(const x of[-6.2,6.2]){ const p=cyl(.06,.06,1.1,0x333333); p.position.set(x,.55,0); s.add(p); }
    if(!ART.bg_crowd){ for(const sx of[-1,1]){ stand(s,sx*19,0,0,34,sx>0?-Math.PI/2:Math.PI/2,5); } stand(s,0,0,-24,34,0,5); crowd(s,[[-17,1.4,0,1,4,15],[17,1.4,0,1,4,15],[0,1.4,-22,15,4,1]],140); }
    this.T=[{side:1,chars:[]},{side:-1,chars:[]}];
    const order=[0,1,0,1]; players.forEach((p,i)=>this.addChar(p,order[i]));
    if(!this.T[1].chars.length)this.addChar(cpuPlayer('CPU','#8899aa'),1);
    while(this.T[1].chars.length<this.T[0].chars.length)this.addChar(cpuPlayer('CPU','#8899aa'),1);
    while(this.T[0].chars.length<this.T[1].chars.length)this.addChar(cpuPlayer('CPU 2','#8899aa'),0);
    this.T.forEach(t=>{ const n=t.chars.length; t.chars.forEach((c,i)=>{ c.homeX=n===1?0:(i===0?-2.4:2.4); c.x=c.homeX; c.z=t.side*10.8; c.mii.g.position.set(c.x,0,c.z); c.mii.g.rotation.y=t.side>0?Math.PI:0; }); t.name=t.chars.map(c=>c.p.name).join(' & '); t.color=t.chars[0].p.color; });
    this.ball={pos:V3(0,1,0),vel:V3(),active:false,lastTeam:-1,sideB:0,netHit:false,spin:0,z2:null};
    this.ballM=sph(this.BR,0xd8f542,{phong:true},12); s.add(this.ballM); this.shadow=ballShadow(s);
    this.hitFx=sph(.18,0xffffff,{m:{transparent:true,opacity:.6},cast:false},10); this.hitFx.visible=false; s.add(this.hitFx);
    camSet(V3(0,7.5,19.5),V3(0,.5,-3));
    this.serveSetup(); this.hudScore(); this.phones();
  },
  addChar(p,ti){ const t=this.T[ti]; const mii=makeMii(p.color,p.name); mii.baseExpr='determined'; mii.face('determined'); R.scene.add(mii.g);
    const c={p,cpu:!!p.cpu,mii,team:ti,side:t.side,x:0,z:t.side*10.8,homeX:0,idealT:0,err:0,swung:false,tx:0,tz:t.side*10.8,tr:new PointTracker(),rest:new THREE.Vector3(.45,-.12,.3),hitCd:0,headOff:{x:.76,z:.85}};
    if(c.cpu)mii.setTool('racket'); else { mii.setTrackedTool('racket'); c.ctrl=ctrlOf(p); }
    t.chars.push(c); p.char=c; return c; },
  onJoin(p){},
  phones(){ this.players.forEach(p=>{ const c=p.char; const srv=this.state==='serve'&&this.serverChar()===c; phoneUI(p,{mode:'tennis',icon:'🎾',title:srv?'Your serve':'Rally!',sub:srv?'Hit the tossed ball with your racket.':'Your racket follows the phone. Swing through the ball; the face angle aims it.',btns:[{id:'recenter',label:'RECENTER',sec:1}],rate:5}); }); },
  serverChar(){ const t=this.T[this.server]; return t.chars[(this.games[0]+this.games[1])%t.chars.length]; },
  serveSetup(){ this.state='serve'; this.stateT=0; this.ball.active=false; this.tossT=-1; this.tossPeak=0; this.T.forEach(t=>t.chars.forEach(c=>{ c.tx=c.homeX; c.tz=c.side*10.8; c.swung=false; })); const sc=this.serverChar(); sc.tx=sc.homeX+(sc.side*-.6); sc.tz=sc.side*11.7; this.T.forEach(t=>t.hitter=null); this.phones(); hud('B',turnBox(sc.p,'to serve')); },
  toss(){ const sc=this.serverChar(); const b=this.ball; if(sc.cpu){ b.pos.set(sc.x+.35*sc.side,1.3,sc.z); } else { b.pos.set(sc.x-sc.side*sc.headOff.x,1.0,sc.z-sc.side*sc.headOff.z); } b.vel.set(0,sc.cpu?5.9:4.2,0); b.active=true; b.lastTeam=-1; b.sideB=0; b.netHit=false; b.spin=0; this.tossT=this.t; this.tossPeak=this.t+b.vel.y/9.8; sc.swung=false; if(sc.cpu){ sc.cpuAt=this.tossPeak+gauss()*.03; } this.tossed=true; },
  update(dt){
    this.t+=dt; this.stateT+=dt; const b=this.ball;
    if(this.state==='serve'){ if(!this.tossed&&this.stateT>1.1)this.toss(); if(this.tossed&&b.active){ this.flyBall(dt,true); if(b.pos.y<this.BR+.02&&b.vel.y<0){ b.active=false; this.tossed=false; this.stateT=.3; } } }
    else if(this.state==='rally'){ this.flyBall(dt,false); }
    else if(this.state==='point'){ if(b.active)this.flyBall(dt,false,true); if(this.stateT>2){ if(this.over!=null)this.finish(); else{ this.tossed=false; this.serveSetup(); } } }
    this.T.forEach((t,ti)=>t.chars.forEach(c=>{
      const incoming=b.active&&this.state==='rally'&&b.lastTeam!==ti&&b.vel.z*c.side>0;
      if(incoming){ const hz=c.z-c.side*c.headOff.z; const tt=(hz-b.pos.z)/b.vel.z; c.idealT=this.t+tt; c.px=b.pos.x+b.vel.x*tt; if(t.hitter==null)t.hitter=t.chars.reduce((a,x)=>Math.abs((x.px||x.x)-c.px)<Math.abs((a.px||a.x)-c.px)?x:a,t.chars[0]);
        if(t.hitter===c){ const off=c.cpu?0:-c.side*c.headOff.x; c.tx=clamp(c.px-off,-6,6); if(b.sideB>0&&b.z2!=null){ c.tz=c.side*clamp(Math.abs(b.z2)-1.5+c.headOff.z*(c.cpu?0:1),2.2,10.8); } else c.tz=c.side*10.8; }
        else{ c.tx=c.homeX; c.tz=c.side*10.8; }
        if(c.cpu&&t.hitter===c&&!c.swung&&this.t>=c.idealT+c.err&&Math.abs(c.idealT-this.t)<.4){ c.swung=true; if(Math.random()<.9)this.swing(c,{start:this.t,pw:clamp(1+gauss()*.2,.6,1.4)},c.err); else this.animSwing(c); }
      }
      else if(this.state==='rally'){ c.tx=c.homeX; c.tz=c.side*10.8; }
      if(this.state==='serve'&&c.cpu&&this.tossed&&b.active&&this.serverChar()===c&&!c.swung&&this.t>=c.cpuAt){ c.swung=true; this.swing(c,{start:this.t,pw:clamp(1+gauss()*.2,.7,1.3)},c.cpuAt-this.tossPeak); }
      const sp=(c.cpu?7.5:10)*dt; c.x+=clamp(c.tx-c.x,-sp,sp); c.z+=clamp(c.tz-c.z,-sp,sp); c.mii.g.position.set(c.x,0,c.z);
      if(!c.cpu){ this.trackHand(c,dt); } c.mii.update(dt);
    }));
    this.ballM.position.copy(b.pos); this.ballM.visible=b.active||this.state!=='rally'; placeShadow(this.shadow,b.pos); this.shadow.visible=b.active;
    if(this.hitFx.visible){ this.hitFx.scale.multiplyScalar(1+6*dt); this.hitFx.material.opacity-=2.5*dt; if(this.hitFx.material.opacity<=0)this.hitFx.visible=false; }
    camLerp(V3(clamp(b.pos.x*.25,-2,2),7.5,19.5),V3(clamp(b.pos.x*.3,-2,2),.5,-3),.05);
  },
  // ---- tracked racket: the rig follows the phone, and the ball collides with the racket head ----
  trackHand(c,dt){ const ctrl=c.ctrl; if(!ctrl.live){ if(c.mii.tracked){ c.mii.setTool('racket'); } return; } if(!c.mii.tracked)c.mii.setTrackedTool('racket');
    rigHand(c.mii,ctrl,c.rest); c.tr.update(c.mii.toolG,_tn.set(0,0,.5),dt); c.hitCd=Math.max(0,c.hitCd-dt);
    const b=this.ball; if(!b.active||c.hitCd>0)return; const ti=c.team; if(b.lastTeam===ti)return; if(this.state==='point')return;
    if(this.state==='serve'&&(this.serverChar()!==c||!this.tossed))return;
    const head=c.tr.pos; const dx=b.pos.x-head.x, dy=b.pos.y-head.y, dz=b.pos.z-head.z; const dh=Math.hypot(dx,dz); const fast=c.tr.speed>TENNIS_CFG.assistSpeed;
    const r=fast?TENNIS_CFG.assistRadius:TENNIS_CFG.hitRadius; if(dh>r||Math.abs(dy)>(fast?TENNIS_CFG.vAssist:.5))return;
    this.hitPhysical(c); },
  hitPhysical(c){ const K=TENNIS_CFG, b=this.ball, side=c.side; const hv=c.tr.vel; const serve=this.state==='serve';
    const n=_tn2.set(0,1,0).applyQuaternion(c.mii.toolG.getWorldQuaternion(_tq)); // racket face normal (world)
    const speed=c.tr.speed; const weak=speed<2.5;
    // shot direction = the racket face normal (horizontal part, pointed at the far side) blended with the swing path direction
    n.y=0; if(n.z*side>0)n.negate(); const nH=n.length(); if(nH>1e-3)n.divideScalar(nH);
    _tv.set(hv.x,0,hv.z); const hH=_tv.length(); if(hH>1e-3)_tv.divideScalar(hH); if(_tv.z*side>0)_tv.negate();
    _tv.multiplyScalar(K.swingWeight*clamp(hH/4,0,1)).addScaledVector(n,K.faceWeight*clamp(nH*2,0,1)); if(_tv.lengthSq()<1e-4)_tv.set(0,0,-side);
    let theta=Math.atan2(_tv.x*(side>0?1:-1),-side*_tv.z); if(!isFinite(theta))theta=0; theta=clamp(theta,-K.maxAngle*Math.PI/180,K.maxAngle*Math.PI/180);
    const paceRaw=weak?6:clamp(K.paceBase+speed*K.paceGain+b.vel.length()*.2,K.minSpeed,K.maxSpeed);
    const spin=clamp(hv.y*K.spinGain,-1,1); // upward racket path = topspin (ball dips), downward = slice (floats)
    const depth=weak?3.2:clamp(4+(paceRaw-K.minSpeed)/(K.maxSpeed-K.minSpeed)*7.6+(serve?-2.5:0),3,11.6);
    const tz=-side*depth, tx=clamp(b.pos.x+Math.tan(theta)*Math.abs(tz-b.pos.z)*(side>0?1:-1)*.6,-3.8,3.8);
    this.launch(c,tx,tz,paceRaw,spin);
    this.hitFx.visible=true; this.hitFx.position.copy(b.pos); this.hitFx.scale.setScalar(1); this.hitFx.material.opacity=.6;
    c.hitCd=.35; buzz(c.p,weak?40:90); if(serve){ this.state='rally'; this.stateT=0; this.T.forEach(t=>{t.hitter=null;t.chars.forEach(x=>x.swung=false);}); this.phones(); hud('B',''); } },
  // shared trajectory solver: land at (tx,tz) with horizontal pace vh, clearing the net
  launch(c,tx,tz,vh,spin){ const b=this.ball; const x0=b.pos.x,y0=b.pos.y,z0=b.pos.z; const d=Math.hypot(tx-x0,tz-z0); let T,vy;
    for(let it=0;it<10;it++){ T=d/vh; vy=(.5*9.8*T*T-y0+.05)/T; const tn=Math.abs(z0)/(Math.abs(tz-z0)/T); const yn=y0+vy*tn-4.9*tn*tn; if(yn>this.NET+.2||vh<7)break; vh*=.9; }
    b.vel.set((tx-x0)/T,vy,(tz-z0)/T); b.spin=spin||0; b.lastTeam=c.team; b.sideB=0; b.z2=null; b.netHit=false; b.active=true; this.T.forEach(t=>{t.hitter=null;t.chars.forEach(x=>x.swung=false);}); AUD.pop();
    this.T[1-c.team].chars.forEach(x=>{ x.err=gauss()*.06+(Math.random()<.14?.45:0); }); },
  flyBall(dt,tossing,dead){
    const b=this.ball, HL=this.HL, HW=this.HW; const pz=b.pos.z; b.vel.y-=(9.8+(tossing?0:(b.spin||0)*4))*dt; b.pos.addScaledVector(b.vel,dt);
    if(!tossing&&Math.sign(pz)!==Math.sign(b.pos.z)&&pz!==0){ if(b.pos.y<this.NET+this.BR){ b.netHit=true; b.vel.z*=-.15; b.vel.x*=.3; b.pos.z=pz; AUD.buzz(); } else { b.sideB=0; } }
    if(b.pos.y<this.BR){ b.pos.y=this.BR; if(b.vel.y<0){ b.vel.y*=-.7; b.vel.x*=.8; b.vel.z*=.8; b.spin*=.5; b.z2=b.pos.z+b.vel.z*(2*b.vel.y/9.8); if(Math.abs(b.vel.y)>1)AUD.thud();
      if(!tossing&&!dead){ const sideTeam=b.pos.z>0?0:1; if(b.netHit)this.point(1-b.lastTeam,'NET'); else { b.sideB++; if(b.sideB===1){ if(Math.abs(b.pos.x)>HW+.06||Math.abs(b.pos.z)>HL+.06)this.point(sideTeam,'OUT'); } else if(b.sideB>=2)this.point(1-sideTeam,'POINT'); } } } }
    if(!tossing&&!dead&&(Math.abs(b.pos.z)>17||Math.abs(b.pos.x)>13)){ const sideTeam=b.pos.z>0?0:1; if(b.netHit)this.point(1-b.lastTeam,'NET'); else if(b.sideB>=1)this.point(1-sideTeam,'WINNER'); else this.point(sideTeam,'OUT'); }
    if(Math.abs(b.vel.y)<.3&&b.pos.y<=this.BR+.001){ b.vel.multiplyScalar(1-2*dt); }
    b.pos.y=Math.max(b.pos.y,this.BR);
  },
  // ---- legacy / CPU swing path (canned animation + timing) ----
  animSwing(c){ const m=c.mii; if(m.tracked)return; if(m.anim&&m.anim.name==='swing'&&m.anim.t<.3)return; AUD.whoosh(); m.play('swing',.42,(mii,k)=>{ const sw=swingCurve(k); mii.arm('R',-1.25+.2*Math.sin(k*Math.PI),sw*1.5,0); mii.body.rotation.y=-sw*.55; }); m.rest=mii=>{ mii.arm('R',lerp(mii.arms.R.g.rotation.x,0,.1),lerp(mii.arms.R.g.rotation.y,0,.1),0); mii.body.rotation.y*=.9; }; },
  swing(c,sw,forcedDt){
    this.animSwing(c); const b=this.ball;
    if(this.state==='serve'){ if(this.serverChar()!==c||!this.tossed||!b.active)return; const dt=forcedDt!=null?forcedDt:sw.start-this.tossPeak; if(Math.abs(dt)>.3||b.pos.y<.9)return; this.hit(c,dt,sw.pw,true); this.state='rally'; this.stateT=0; this.T.forEach(t=>{t.hitter=null;t.chars.forEach(x=>x.swung=false);}); this.phones(); hud('B',''); return; }
    if(this.state!=='rally')return;
    const ti=c.team; if(b.lastTeam===ti||!b.active)return; if(!(b.vel.z*c.side>0)&&Math.abs(b.pos.z-c.z)>1.5)return;
    const dt=forcedDt!=null?forcedDt:sw.start-c.idealT; if(Math.abs(dt)>.3)return; if(Math.abs(b.pos.x-c.x)>2.8||b.pos.y>3)return; if(Math.abs(b.pos.z-c.z)>4.5&&b.pos.z*c.side>c.z*c.side)return;
    this.hit(c,dt,sw.pw,false);
  },
  hit(c,dt,pw,serve){ const b=this.ball, side=c.side; const k=clamp(dt/.3,-1,1); pw=clamp(pw,.3,1.6);
    let tx=side*k*(serve?3.6:4.7)+rnd(-.35,.35), tz=-side*(serve?(3.6+2.5*Math.random()):(6.3+4.6*clamp(pw,.5,1.4)/1.4+rnd(-.6,.6)+(pw>1.4?rnd(0,1.6):0)));
    const vh=serve?15+4*pw:11+9*clamp(pw,.3,1.6)/1.6; this.launch(c,tx,tz,vh,0); if(!c.cpu)buzz(c.p,60); },
  point(ti,why){ if(this.state==='point')return; this.state='point'; this.stateT=0; (this.log=this.log||[]).push(why+':'+ti); const t=this.T[ti]; this.pts[ti]++; AUD.cheer(); let txt=why, sub=t.name+' wins the point';
    const a=this.pts[ti],o=this.pts[1-ti]; if(a>=4&&a-o>=2){ this.games[ti]++; this.pts=[0,0]; this.server=1-this.server; txt='GAME'; sub=t.name+' wins the game'; if(this.games[ti]>=2){ txt='MATCH'; sub=t.name+' wins the match!'; this.over=ti; } }
    banner(txt,sub,1.8,ti===0?'':'red'); this.hudScore(); this.T[1-ti].chars.forEach(c=>c.mii.face('sad',2)); t.chars.forEach(c=>{ c.mii.face('cheer',2); if(!c.cpu)buzz(c.p,150); if(!c.mii.tracked)c.mii.play('cheer',1.2,(m,k)=>{ m.arm('R',-2.6-Math.sin(k*20)*.3,0,0); m.arm('L',-2.6+Math.sin(k*20)*.3,0,0); m.body.position.y=Math.abs(Math.sin(k*12))*.18; }); }); },
  hudScore(){ const P=['0','15','30','40']; let a=this.pts[0],b=this.pts[1],sa,sb; if(a>=3&&b>=3){ if(a===b){sa=sb='40';} else if(a>b){sa='AD';sb='';} else {sa='';sb='AD';} } else { sa=P[Math.min(a,3)]; sb=P[Math.min(b,3)]; }
    hud('TL',scoreboard([{name:this.T[0].name,color:this.T[0].color,v:`${this.games[0]} <small style="font-size:.6em;color:#6b7c93">${sa}</small>`},{name:this.T[1].name,color:this.T[1].color,v:`${this.games[1]} <small style="font-size:.6em;color:#6b7c93">${sb}</small>`}])); },
  finish(){ const w=this.over; const rows=[]; [w,1-w].forEach(ti=>this.T[ti].chars.forEach(c=>rows.push({p:c.cpu?null:c.p,name:c.p.name,color:c.p.color,score:ti===w?'WIN '+this.games[ti]+'-'+this.games[1-ti]:'LOSS '+this.games[ti]+'-'+this.games[1-ti]}))); endSport(rows,'Tennis'); },
  onSwingStart(p){ if(p.char&&!tracked(p))this.animSwing(p.char); },
  onSwing(p,sw){ if(p.char&&!tracked(p))this.swing(p.char,sw); },
  onKey(k){ if(TEST){ const i='1234'.indexOf(k); if(i>=0&&this.players[i])this.swing(this.players[i].char,{start:this.t,pw:1}); } },
  dispose(){ this.players.forEach(p=>delete p.char); }
};
const _tn=new THREE.Vector3(), _tn2=new THREE.Vector3(), _tv=new THREE.Vector3(), _tq=new THREE.Quaternion();
