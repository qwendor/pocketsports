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
function placeShadow(sh,pos,scale=1,floor=0){ sh.position.x=pos.x; sh.position.z=pos.z; sh.position.y=floor+.012; const k=scale/(1+Math.max(0,pos.y-floor)*.25); sh.scale.set(k,k,1); }
// aim from the phone: turn the phone left/right (relative compass heading since the turn began); falls back to left/right tilt when no heading is available
function aimFrom(sp,p){ const o=p.orient; if(sp.yaw0==null)sp.yaw0=o.a; let d=o.a-sp.yaw0; d=((d+540)%360)-180; if(o.a===0&&sp.yaw0===0)return clamp(o.g/30,-1,1); return clamp(-d/28,-1,1); }
function cpuPlayer(name,color){ return {slot:-1,name,color,cname:'CPU',cpu:true,fake:true,inbox:[],btn:{},orient:{a:0,b:0,g:0}}; }
// is this player driving a live tracked controller (vs. touch/legacy swing events)?
function tracked(p){ return !p.cpu&&p.ctrl&&p.ctrl.live; }
// solve a launch velocity that lands at (tx,tz) after T seconds from (x0,y0,z0) to height ty
function arcTo(out,x0,y0,z0,tx,ty,tz,T,g=9.8){ return out.set((tx-x0)/T,(ty-y0+.5*g*T*T)/T,(tz-z0)/T); }

/* ============================== TENNIS (and PING PONG as a parameter set) ============================== */
const TENNIS_P={name:'Tennis',HL:11.885,HW:4.115,NET:.7,BR:.075,baseZ:10.6,serveZ:11.5,miiScale:.72,racketScale:1.45,txMax:3.5,depthMin:4.5,depthRange:6.6,paceMin:8,paceMax:21,servePace:12,serveGain:3,tossV:4.2,
  cam:[0,8.2,20.5],look:[0,.5,-3.5],hitR:.75,assistR:1.25,vAssist:1.6,assistSpeed:2.2,runSpeed:11,cpuSpeed:9,tableY:0,pointsToWin:0,spinGain:.14,restitution:.7,cpuErr:.06,cpuWhiff:.14,paceBase:6,paceGain:1.4,maxAngle:34,homeSpread:2.4,netClear:.2,art:'ic_tennis'};
const PINGPONG_P={name:'Ping Pong',HL:2.3,HW:1.3,NET:.3,BR:.06,baseZ:2.75,serveZ:2.85,miiScale:.85,racketScale:.75,txMax:1.0,depthMin:.7,depthRange:1.3,paceMin:4.5,paceMax:9.5,servePace:5.5,serveGain:1,tossV:2.6,
  cam:[0,3.3,6.4],look:[0,.9,-.6],hitR:.42,assistR:.62,vAssist:.7,assistSpeed:1.5,runSpeed:5,cpuSpeed:4,tableY:.76,pointsToWin:7,spinGain:.1,restitution:.7,cpuErr:.05,cpuWhiff:.12,paceBase:3.5,paceGain:.9,maxAngle:30,homeSpread:0,netClear:.12,art:'ic_tennis'};
SPORTS.tennis={
  name:'Tennis',icon:'🎾',players:'1-4 players',P:TENNIS_P,
  how:['Your racket follows your phone: tilt, turn and roll it and the racket does the same. Hold it like a racket handle.','Your player runs to the ball. Swing through the ball with the racket face to hit it; the face angle steers it, the swing speed sets the pace, swinging upward adds topspin.','A slow racket blocks the ball back. Miss the ball and the point is lost.','To serve, hit the tossed ball. First to win 2 games takes the match.'],
  who:n=>n<=1?'You vs the computer':n===2?'Player 1 vs Player 2':n===3?'Doubles: P1 & P3 vs P2 & a computer partner':'Doubles: P1 & P3 vs P2 & P4',
  buildScene(s){ const P=this.P; const ground=tplane(160,200,'tex_grass',0x3f9451,6); s.add(ground); skyDome(s); backdrop(s,'bg_crowd',{r:40,h:17,len:Math.PI*1.5,center:Math.PI,rep:3,y:8.5});
    const inner=plane(13,27,0x3b7fc4,{}); inner.position.y=.005; s.add(inner); const court=plane(10.97,23.77,0x4b8fd6,{}); court.position.y=.008; s.add(court);
    const W=0xffffff; [[.08,23.77,5.485,0],[.08,23.77,-5.485,0],[.08,23.77,4.115,0],[.08,23.77,-4.115,0]].forEach(([w,l,x,z])=>s.add(line(w,l,W,x,z,.012)));
    [[10.97,.08,0,11.885],[10.97,.08,0,-11.885],[8.23,.08,0,6.4],[8.23,.08,0,-6.4],[.08,12.8,0,0]].forEach(([w,l,x,z])=>s.add(line(w,l,W,x,z,.012)));
    const netP=box(12.4,.05,.05,W); netP.position.y=P.NET; s.add(netP); const netM=mesh(new THREE.PlaneGeometry(12.4,P.NET),0x223344,{m:{transparent:true,opacity:.55,side:THREE.DoubleSide},cast:false}); netM.position.y=P.NET/2; s.add(netM);
    for(const x of[-6.2,6.2]){ const p=cyl(.06,.06,P.NET+.15,0x333333); p.position.set(x,(P.NET+.15)/2,0); s.add(p); } },
  build(players){
    const P=this.P; const s=newScene(P.tableY?{sky:0x2a3550,fog:false,shadow:8,sunX:3,sunY:9,sunZ:4,hemi:.5,sun:.8,hemiSky:0x9fb3d8,hemiGround:0x2a2a3a}:{sky:0x8fd3ff,shadow:26,sunX:14,sunY:36,sunZ:18});
    this.players=players; this.t=0; this.state='serve'; this.pts=[0,0]; this.games=[0,0]; this.server=0; this.stateT=0; this.over=null; this.log=[];
    this.buildScene(s);
    this.T=[{side:1,chars:[]},{side:-1,chars:[]}];
    const order=[0,1,0,1]; players.forEach((p,i)=>this.addChar(p,order[i]));
    if(!this.T[1].chars.length)this.addChar(cpuPlayer('CPU','#8899aa'),1);
    while(this.T[1].chars.length<this.T[0].chars.length)this.addChar(cpuPlayer('CPU','#8899aa'),1);
    while(this.T[0].chars.length<this.T[1].chars.length)this.addChar(cpuPlayer('CPU 2','#8899aa'),0);
    this.T.forEach(t=>{ const n=t.chars.length; t.chars.forEach((c,i)=>{ c.homeX=n===1?0:(i===0?-P.homeSpread:P.homeSpread); c.x=c.homeX; c.z=t.side*P.baseZ; c.mii.g.position.set(c.x,0,c.z); c.mii.g.rotation.y=t.side>0?Math.PI:0; }); t.name=t.chars.map(c=>c.p.name).join(' & '); t.color=t.chars[0].p.color; });
    this.ball={pos:V3(0,1,0),vel:V3(),active:false,lastTeam:-1,sideB:0,netHit:false,spin:0,z2:null};
    this.ballM=sph(P.BR,P.tableY?0xffffff:0xd8f542,{phong:true},12); s.add(this.ballM); this.shadow=ballShadow(s);
    this.hitFx=sph(.18,0xffffff,{m:{transparent:true,opacity:.6},cast:false},10); this.hitFx.visible=false; s.add(this.hitFx);
    camSet(V3(...P.cam),V3(...P.look));
    this.serveSetup(); this.hudScore(); this.phones();
  },
  addChar(p,ti){ const P=this.P; const t=this.T[ti]; const mii=makeMii(p.color,p.name); mii.baseExpr='determined'; mii.face('determined'); mii.g.scale.setScalar(P.miiScale); R.scene.add(mii.g);
    const sc=P.miiScale; const c={p,cpu:!!p.cpu,mii,team:ti,side:t.side,x:0,z:t.side*P.baseZ,homeX:0,idealT:0,err:0,swung:false,tx:0,tz:t.side*P.baseZ,tr:new PointTracker(),rest:new THREE.Vector3(.45,-.12,.3),hitCd:0,headOff:{x:(.34+.45)*sc,z:(.3+.5*P.racketScale)*sc,y:1.15*sc}};
    if(c.cpu)mii.setTool('racket'); else { mii.setTrackedTool('racket'); mii.toolG.scale.setScalar(P.racketScale); c.ctrl=ctrlOf(p); }
    t.chars.push(c); p.char=c; return c; },
  onJoin(p){},
  phones(){ this.players.forEach(p=>{ const c=p.char; const srv=this.state==='serve'&&this.serverChar()===c; phoneUI(p,{mode:'tennis',icon:'🎾',art:this.P.art,title:srv?'Your serve':'Rally!',sub:srv?'Hit the tossed ball with your racket.':'Your racket follows the phone. Swing through the ball; the face angle aims it.',btns:[{id:'recenter',label:'RECENTER',sec:1}],rate:5}); }); },
  serverChar(){ const t=this.T[this.server]; return t.chars[(this.games[0]+this.games[1]+this.pts[0]+this.pts[1])%t.chars.length]; },
  serveSetup(){ const P=this.P; this.state='serve'; this.stateT=0; this.ball.active=false; this.tossT=-1; this.tossPeak=0; this.T.forEach(t=>t.chars.forEach(c=>{ c.tx=c.homeX; c.tz=c.side*P.baseZ; c.swung=false; })); const sc=this.serverChar(); sc.tx=sc.homeX+(sc.side*-.4); sc.tz=sc.side*P.serveZ; this.T.forEach(t=>t.hitter=null); this.phones(); hud('B',turnBox(sc.p,'to serve')); },
  toss(){ const P=this.P; const sc=this.serverChar(); const b=this.ball; if(sc.cpu){ b.pos.set(sc.x+.35*sc.side,P.tableY+1.0,sc.z); } else { b.pos.set(sc.x-sc.side*sc.headOff.x,sc.headOff.y-.15+ (P.tableY?0:0),sc.z-sc.side*sc.headOff.z); } b.vel.set(0,sc.cpu?P.tossV*1.3:P.tossV,0); b.active=true; b.lastTeam=-1; b.sideB=0; b.netHit=false; b.spin=0; this.tossT=this.t; this.tossPeak=this.t+b.vel.y/9.8; sc.swung=false; if(sc.cpu){ sc.cpuAt=this.tossPeak+gauss()*.03; } this.tossed=true; },
  floorAt(x,z){ const P=this.P; if(!P.tableY)return 0; return (Math.abs(x)<=P.HW+.05&&Math.abs(z)<=P.HL+.05)?P.tableY:0; },
  update(dt){
    const P=this.P; this.t+=dt; this.stateT+=dt; const b=this.ball;
    if(this.state==='serve'){ if(!this.tossed&&this.stateT>1.1)this.toss(); if(this.tossed&&b.active){ this.flyBall(dt,true); if(b.pos.y<this.floorAt(b.pos.x,b.pos.z)+P.BR+.02&&b.vel.y<0){ b.active=false; this.tossed=false; this.stateT=.3; } } }
    else if(this.state==='rally'){ this.flyBall(dt,false); }
    else if(this.state==='point'){ if(b.active)this.flyBall(dt,false,true); if(this.stateT>2){ if(this.over!=null)this.finish(); else{ this.tossed=false; this.serveSetup(); } } }
    this.T.forEach((t,ti)=>t.chars.forEach(c=>{
      const incoming=b.active&&this.state==='rally'&&b.lastTeam!==ti&&b.vel.z*c.side>0;
      if(incoming){ const hz=c.z-c.side*c.headOff.z; const tt=(hz-b.pos.z)/b.vel.z; c.idealT=this.t+tt; c.px=b.pos.x+b.vel.x*tt; if(t.hitter==null)t.hitter=t.chars.reduce((a,x)=>Math.abs((x.px||x.x)-c.px)<Math.abs((a.px||a.x)-c.px)?x:a,t.chars[0]);
        if(t.hitter===c){ const off=c.cpu?0:-c.side*c.headOff.x; c.tx=clamp(c.px-off,-P.HW-2,P.HW+2); if(!P.tableY&&b.sideB>0&&b.z2!=null){ c.tz=c.side*clamp(Math.abs(b.z2)-1.5+c.headOff.z*(c.cpu?0:1),2.2,P.baseZ); } else c.tz=c.side*P.baseZ; }
        else{ c.tx=c.homeX; c.tz=c.side*P.baseZ; }
        if(c.cpu&&t.hitter===c&&!c.swung&&this.t>=c.idealT+c.err&&Math.abs(c.idealT-this.t)<.4){ c.swung=true; if(Math.random()<.9)this.swing(c,{start:this.t,pw:clamp(1+gauss()*.2,.6,1.4)},c.err); else this.animSwing(c); }
      }
      else if(this.state==='rally'){ c.tx=c.homeX; c.tz=c.side*P.baseZ; }
      if(this.state==='serve'&&c.cpu&&this.tossed&&b.active&&this.serverChar()===c&&!c.swung&&this.t>=c.cpuAt){ c.swung=true; this.swing(c,{start:this.t,pw:clamp(1+gauss()*.2,.7,1.3)},c.cpuAt-this.tossPeak); }
      const sp=(c.cpu?P.cpuSpeed:P.runSpeed)*dt; c.x+=clamp(c.tx-c.x,-sp,sp); c.z+=clamp(c.tz-c.z,-sp,sp); c.mii.g.position.set(c.x,0,c.z);
      if(!c.cpu){ this.trackHand(c,dt); } c.mii.update(dt);
    }));
    this.ballM.position.copy(b.pos); this.ballM.visible=b.active||this.state!=='rally'; placeShadow(this.shadow,b.pos,1,this.floorAt(b.pos.x,b.pos.z)); this.shadow.visible=b.active;
    if(this.hitFx.visible){ this.hitFx.scale.multiplyScalar(1+6*dt); this.hitFx.material.opacity-=2.5*dt; if(this.hitFx.material.opacity<=0)this.hitFx.visible=false; }
    const cx=clamp(b.pos.x*.25,-2.5,2.5)*(P.tableY?.3:1); camLerp(V3(P.cam[0]+cx,P.cam[1],P.cam[2]),V3(P.look[0]+cx*1.2,P.look[1],P.look[2]),.05);
  },
  trackHand(c,dt){ const P=this.P, ctrl=c.ctrl; if(!ctrl.live){ if(c.mii.tracked){ c.mii.setTool('racket'); } return; } if(!c.mii.tracked){ c.mii.setTrackedTool('racket'); c.mii.toolG.scale.setScalar(P.racketScale); }
    rigHand(c.mii,ctrl,c.rest); c.tr.update(c.mii.toolG,_tn.set(0,0,.5),dt); c.hitCd=Math.max(0,c.hitCd-dt);
    const b=this.ball; if(!b.active||c.hitCd>0)return; const ti=c.team; if(b.lastTeam===ti)return; if(this.state==='point')return;
    if(this.state==='serve'&&(this.serverChar()!==c||!this.tossed))return;
    const head=c.tr.pos; const dx=b.pos.x-head.x, dy=b.pos.y-head.y, dz=b.pos.z-head.z; const dh=Math.hypot(dx,dz); const fast=c.tr.speed>P.assistSpeed;
    const r=fast?P.assistR:P.hitR; if(dh>r||Math.abs(dy)>(fast?P.vAssist:P.vAssist*.6))return;
    this.hitPhysical(c); },
  hitPhysical(c){ const P=this.P, b=this.ball, side=c.side; const hv=c.tr.vel; const serve=this.state==='serve';
    const n=_tn2.set(0,1,0).applyQuaternion(c.mii.toolG.getWorldQuaternion(_tq)); const speed=c.tr.speed; const weak=speed<2.0;
    n.y=0; if(n.z*side>0)n.negate(); const nH=n.length(); if(nH>1e-3)n.divideScalar(nH);
    _tv.set(hv.x,0,hv.z); const hH=_tv.length(); if(hH>1e-3)_tv.divideScalar(hH); if(_tv.z*side>0)_tv.negate();
    _tv.multiplyScalar(.7*clamp(hH/4,0,1)).addScaledVector(n,clamp(nH*2,0,1)); if(_tv.lengthSq()<1e-4)_tv.set(0,0,-side);
    let theta=Math.atan2(_tv.x*(side>0?1:-1),-side*_tv.z); if(!isFinite(theta))theta=0; theta=clamp(theta,-P.maxAngle*Math.PI/180,P.maxAngle*Math.PI/180);
    const pace=weak?P.paceMin*.8:clamp(P.paceBase+speed*P.paceGain+b.vel.length()*.15,P.paceMin,P.paceMax);
    const spin=clamp(hv.y*P.spinGain,-1,1);
    const depth=weak?P.depthMin*.8:clamp(P.depthMin+(pace-P.paceMin)/(P.paceMax-P.paceMin)*P.depthRange+(serve?-P.depthRange*.35:0),P.depthMin*.7,P.HL-.3);
    const tz=-side*depth, tx=clamp(b.pos.x+Math.tan(theta)*Math.abs(tz-b.pos.z)*(side>0?1:-1),-P.txMax,P.txMax);
    this.launch(c,tx,tz,pace,spin);
    this.hitFx.visible=true; this.hitFx.position.copy(b.pos); this.hitFx.scale.setScalar(1); this.hitFx.material.opacity=.6;
    c.hitCd=.35; buzz(c.p,weak?40:90); if(serve){ this.state='rally'; this.stateT=0; this.T.forEach(t=>{t.hitter=null;t.chars.forEach(x=>x.swung=false);}); this.phones(); hud('B',''); } },
  launch(c,tx,tz,vh,spin){ const P=this.P, b=this.ball; const x0=b.pos.x,y0=b.pos.y,z0=b.pos.z; const d=Math.hypot(tx-x0,tz-z0); const ty=P.tableY; let T,vy;
    for(let it=0;it<10;it++){ T=d/vh; vy=(ty-y0+.5*9.8*T*T+.05)/T; const tn=Math.abs(z0)/(Math.abs(tz-z0)/T); const yn=y0+vy*tn-4.9*tn*tn; if(yn>P.tableY+P.NET+P.netClear||vh<P.paceMin*.7)break; vh*=.9; }
    b.vel.set((tx-x0)/T,vy,(tz-z0)/T); b.spin=spin||0; b.lastTeam=c.team; b.sideB=0; b.z2=null; b.netHit=false; b.active=true; this.T.forEach(t=>{t.hitter=null;t.chars.forEach(x=>x.swung=false);}); AUD.pop();
    this.T[1-c.team].chars.forEach(x=>{ x.err=gauss()*P.cpuErr+(Math.random()<P.cpuWhiff?.45:0); }); },
  flyBall(dt,tossing,dead){
    const P=this.P, b=this.ball; const pz=b.pos.z; b.vel.y-=(9.8+(tossing?0:(b.spin||0)*4))*dt; b.pos.addScaledVector(b.vel,dt);
    if(!tossing&&Math.sign(pz)!==Math.sign(b.pos.z)&&pz!==0){ if(b.pos.y<P.tableY+P.NET+P.BR){ b.netHit=true; b.vel.z*=-.15; b.vel.x*=.3; b.pos.z=pz; AUD.buzz(); } else { b.sideB=0; } }
    const fl=this.floorAt(b.pos.x,b.pos.z);
    if(b.pos.y<fl+P.BR){ b.pos.y=fl+P.BR; if(b.vel.y<0){ b.vel.y*=-.7; b.vel.x*=.8; b.vel.z*=.8; b.spin*=.5; b.z2=b.pos.z+b.vel.z*(2*b.vel.y/9.8); if(Math.abs(b.vel.y)>1)AUD.thud();
      if(!tossing&&!dead){ const sideTeam=b.pos.z>0?0:1; if(b.netHit)this.point(1-b.lastTeam,'NET'); else { const outNow=P.tableY?fl===0:(Math.abs(b.pos.x)>P.HW+.06||Math.abs(b.pos.z)>P.HL+.06); b.sideB++; if(b.sideB===1){ if(outNow)this.point(sideTeam,'OUT'); } else if(b.sideB>=2)this.point(1-sideTeam,'POINT'); } } } }
    if(!tossing&&!dead&&(Math.abs(b.pos.z)>P.HL+5||Math.abs(b.pos.x)>P.HW+9)){ const sideTeam=b.pos.z>0?0:1; if(b.netHit)this.point(1-b.lastTeam,'NET'); else if(b.sideB>=1)this.point(1-sideTeam,'WINNER'); else this.point(sideTeam,'OUT'); }
    if(Math.abs(b.vel.y)<.3&&b.pos.y<=fl+P.BR+.001){ b.vel.multiplyScalar(1-2*dt); }
    b.pos.y=Math.max(b.pos.y,fl+P.BR);
  },
  animSwing(c){ const m=c.mii; if(m.tracked)return; if(m.anim&&m.anim.name==='swing'&&m.anim.t<.3)return; AUD.whoosh(); m.play('swing',.42,(mii,k)=>{ const sw=swingCurve(k); mii.arm('R',-1.25+.2*Math.sin(k*Math.PI),sw*1.5,0); mii.body.rotation.y=-sw*.55; }); m.rest=mii=>{ mii.arm('R',lerp(mii.arms.R.g.rotation.x,0,.1),lerp(mii.arms.R.g.rotation.y,0,.1),0); mii.body.rotation.y*=.9; }; },
  swing(c,sw,forcedDt){
    this.animSwing(c); const b=this.ball, P=this.P;
    if(this.state==='serve'){ if(this.serverChar()!==c||!this.tossed||!b.active)return; const dt=forcedDt!=null?forcedDt:sw.start-this.tossPeak; if(Math.abs(dt)>.3||b.pos.y<P.tableY+.8)return; this.hit(c,dt,sw.pw,true); this.state='rally'; this.stateT=0; this.T.forEach(t=>{t.hitter=null;t.chars.forEach(x=>x.swung=false);}); this.phones(); hud('B',''); return; }
    if(this.state!=='rally')return;
    const ti=c.team; if(b.lastTeam===ti||!b.active)return; if(!(b.vel.z*c.side>0)&&Math.abs(b.pos.z-c.z)>1.5)return;
    const dt=forcedDt!=null?forcedDt:sw.start-c.idealT; if(Math.abs(dt)>.3)return; if(Math.abs(b.pos.x-c.x)>P.HW*.7||b.pos.y>P.tableY+3)return; if(Math.abs(b.pos.z-c.z)>P.HL*.4&&b.pos.z*c.side>c.z*c.side)return;
    this.hit(c,dt,sw.pw,false);
  },
  hit(c,dt,pw,serve){ const P=this.P, b=this.ball, side=c.side; const k=clamp(dt/.3,-1,1); pw=clamp(pw,.3,1.6);
    let tx=side*k*P.txMax*(serve?.8:1)+rnd(-.1,.1)*P.txMax, tz=-side*(serve?(P.depthMin*.8+P.depthRange*.4*Math.random()):clamp(P.depthMin+P.depthRange*clamp(pw,.5,1.4)/1.4+rnd(-.1,.1)*P.depthRange,P.depthMin*.7,P.HL-.3));
    const vh=serve?P.servePace+P.serveGain*pw:P.paceMin+(P.paceMax-P.paceMin)*.8*clamp(pw,.3,1.6)/1.6; this.launch(c,tx,tz,vh,0); if(!c.cpu)buzz(c.p,60); },
  point(ti,why){ if(this.state==='point')return; const P=this.P; this.state='point'; this.stateT=0; (this.log=this.log||[]).push(why+':'+ti); const t=this.T[ti]; this.pts[ti]++; AUD.cheer(); let txt=why, sub=t.name+' wins the point';
    if(P.pointsToWin){ this.server=1-this.server; if(this.pts[ti]>=P.pointsToWin){ txt='GAME'; sub=t.name+' wins '+this.pts[ti]+'-'+this.pts[1-ti]; this.over=ti; } }
    else { const a=this.pts[ti],o=this.pts[1-ti]; if(a>=4&&a-o>=2){ this.games[ti]++; this.pts=[0,0]; this.server=1-this.server; txt='GAME'; sub=t.name+' wins the game'; if(this.games[ti]>=2){ txt='MATCH'; sub=t.name+' wins the match!'; this.over=ti; } } }
    banner(txt,sub,1.8,ti===0?'':'red'); this.hudScore(); this.T[1-ti].chars.forEach(c=>c.mii.face('sad',2)); t.chars.forEach(c=>{ c.mii.face('cheer',2); if(!c.cpu)buzz(c.p,150); if(!c.mii.tracked)c.mii.play('cheer',1.2,(m,k)=>{ m.arm('R',-2.6-Math.sin(k*20)*.3,0,0); m.arm('L',-2.6+Math.sin(k*20)*.3,0,0); m.body.position.y=Math.abs(Math.sin(k*12))*.18; }); }); },
  hudScore(){ const P=this.P; if(P.pointsToWin){ hud('TL',scoreboard([{name:this.T[0].name,color:this.T[0].color,v:this.pts[0]},{name:this.T[1].name,color:this.T[1].color,v:this.pts[1]}])); return; }
    const Pt=['0','15','30','40']; let a=this.pts[0],b=this.pts[1],sa,sb; if(a>=3&&b>=3){ if(a===b){sa=sb='40';} else if(a>b){sa='AD';sb='';} else {sa='';sb='AD';} } else { sa=Pt[Math.min(a,3)]; sb=Pt[Math.min(b,3)]; }
    hud('TL',scoreboard([{name:this.T[0].name,color:this.T[0].color,v:`${this.games[0]} <small style="font-size:.6em;color:#6b7c93">${sa}</small>`},{name:this.T[1].name,color:this.T[1].color,v:`${this.games[1]} <small style="font-size:.6em;color:#6b7c93">${sb}</small>`}])); },
  finish(){ const P=this.P; const w=this.over; const rows=[]; [w,1-w].forEach(ti=>this.T[ti].chars.forEach(c=>rows.push({p:c.cpu?null:c.p,name:c.p.name,color:c.p.color,score:P.pointsToWin?(ti===w?'WIN ':'LOSS ')+this.pts[ti]+'-'+this.pts[1-ti]:(ti===w?'WIN '+this.games[ti]+'-'+this.games[1-ti]:'LOSS '+this.games[ti]+'-'+this.games[1-ti])}))); endSport(rows,this.name); },
  onSwingStart(p){ if(p.char&&!tracked(p))this.animSwing(p.char); },
  onSwing(p,sw){ if(p.char&&!tracked(p))this.swing(p.char,sw); },
  onKey(k){ if(TEST){ const i='1234'.indexOf(k); if(i>=0&&this.players[i])this.swing(this.players[i].char,{start:this.t,pw:1}); } },
  dispose(){ this.players.forEach(p=>delete p.char); }
};
const _tn=new THREE.Vector3(), _tn2=new THREE.Vector3(), _tv=new THREE.Vector3(), _tq=new THREE.Quaternion();

/* ============================== PING PONG ============================== */
SPORTS.pingpong=Object.assign(Object.create(SPORTS.tennis),{
  name:'Ping Pong',icon:'🏓',players:'1-4 players',P:PINGPONG_P,
  how:['Your paddle follows your phone. Hold it like a paddle handle, face toward the table.','Stand at the table: the ball comes fast, meet it with the paddle face. Angle the face to aim, swing harder to hit harder.','A ball that misses the table is out. First to 7 points wins.','Serve by hitting the tossed ball.'],
  who:n=>n<=1?'You vs the computer':n===2?'Player 1 vs Player 2':'Doubles',
  buildScene(s){ const P=this.P; const floor=tplane(40,40,'tex_lane',0xc9955a,1.4); s.add(floor); backdrop(s,'bg_arena',{r:16,h:10,len:TAU,center:Math.PI,rep:3,y:4});
    const table=box(P.HW*2,.06,P.HL*2,0x1f5fa8); table.position.y=P.tableY-.03; s.add(table); const edge=box(P.HW*2+.06,.02,P.HL*2+.06,0xffffff,{cast:false}); edge.position.y=P.tableY-.06; s.add(edge);
    const W=0xffffff; s.add(line(.03,P.HL*2,W,0,0,P.tableY+.002)); [[P.HW*2,.03,0,P.HL],[P.HW*2,.03,0,-P.HL],[.03,P.HL*2,P.HW-.015,0],[.03,P.HL*2,-P.HW+.015,0]].forEach(([w,l,x,z])=>s.add(line(w,l,W,x,z,P.tableY+.002)));
    for(const sx of[-1,1]){ for(const sz of[-1,1]){ const leg=box(.08,P.tableY-.06,.08,0x333333); leg.position.set(sx*(P.HW-.2),(P.tableY-.06)/2,sz*(P.HL-.3)); s.add(leg); } }
    const netM=mesh(new THREE.PlaneGeometry(P.HW*2+.3,P.NET),0x223344,{m:{transparent:true,opacity:.6,side:THREE.DoubleSide},cast:false}); netM.position.y=P.tableY+P.NET/2; s.add(netM); const netTop=box(P.HW*2+.3,.02,.02,0xffffff,{cast:false}); netTop.position.y=P.tableY+P.NET; s.add(netTop);
    for(const x of[-P.HW-.15,P.HW+.15]){ const p=cyl(.02,.02,P.NET+.02,0x333333); p.position.set(x,P.tableY+P.NET/2,0); s.add(p); } }
});
