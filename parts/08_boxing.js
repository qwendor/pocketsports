/* ============================== BOXING ============================== */
SPORTS.boxing={
  name:'Boxing',icon:'🥊',players:'1-4 players',ROUNDS:3,ROUND_T:60,
  how:['Hold your phone in your fist. <b>Punch forward</b> to jab, swing sideways for a hook, punch upward for an uppercut.','Hold the <b>BLOCK</b> button on your phone to guard. Blocking stops most of the damage.','Harder punches hurt more. Knock your opponent\'s health to zero for a K.O.','3 rounds of 60 seconds. With 3 or 4 players, the winner stays in the ring.'],
  who:n=>n<=1?'You vs the computer':n===2?'Player 1 vs Player 2':'Winner stays on: P1 vs P2, then the winner takes on the next player',
  build(players){
    const s=newScene({sky:0x1b2233,fog:false,shadow:10,sunX:4,sunY:12,sunZ:6,hemi:.35,sun:.7,hemiSky:0x9fb3d8,hemiGround:0x1a2030});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.wins=this.players.map(()=>0); this.queue=this.players.slice(); this.t=0; this.stateT=0;
    s.add(plane(60,60,0x161c2a,{cast:false}));
    const ring=box(7,.6,7,0x3b4a66); ring.position.y=.3; s.add(ring); const mat_=plane(6.6,6.6,0xe8eef5,{}); mat_.position.y=.61; s.add(mat_);
    for(const [x,z] of[[-3.3,-3.3],[3.3,-3.3],[-3.3,3.3],[3.3,3.3]]){ const p=cyl(.08,.08,1.6,0xdddddd); p.position.set(x,1.4,z); s.add(p); }
    for(let i=0;i<3;i++){ const y=.95+i*.35; const col=[0xff5a5f,0xffffff,0x2f80ff][i]; for(const [x,z,rot] of[[0,-3.3,0],[0,3.3,0],[-3.3,0,Math.PI/2],[3.3,0,Math.PI/2]]){ const r=cyl(.025,.025,6.6,col,8); r.rotation.z=Math.PI/2; r.rotation.y=rot; r.position.set(x,y,z); s.add(r); } }
    for(let i=0;i<6;i++){ const l=new THREE.PointLight(0xfff1d6,.2,30); l.position.set(-5+i*2,6,i%2?4:-4); s.add(l); }
    if(!backdrop(s,'bg_arena',{r:15,h:11,len:TAU,center:Math.PI,rep:3,y:4.2})){ const spots=[]; for(let a=0;a<360;a+=15){ const r=a*Math.PI/180; for(let i=0;i<3;i++){ const rr=9+i*2.2; spots.push([Math.sin(r)*rr,.6+i*1.2,Math.cos(r)*rr,.8,.3,.8]); } } crowd(s,spots,240); for(let i=0;i<3;i++){ const st=mesh(new THREE.TorusGeometry(9.5+i*2.2,1.1,4,40),i%2?0x2a3550:0x223049,{cast:false}); st.rotation.x=Math.PI/2; st.position.y=i*1.2; s.add(st); } }
    this.fx=[]; camSet(V3(0,2.6,6),V3(0,1.2,0));
    this.startBout();
  },
  startBout(){ this.queue=this.queue||[]; const A=this.champ||this.queue.shift(); const B=this.queue.shift()||cpuPlayer('CPU','#8899aa'); this.boxers=[this.mkBoxer(A,-1),this.mkBoxer(B,1)]; this.round=0; this.state='intro'; this.stateT=0; this.hudHP(); banner('ROUND 1','get ready',1.8); this.phones(); AUD.fanfare(); },
  mkBoxer(p,side){ if(this.boxers)this.boxers.forEach(b=>{ if(b.p===p){ R.scene.remove(b.mii.g); } }); const mii=makeMii(p.color,p.name); mii.setTool('gloves'); mii.baseExpr='determined'; mii.face('determined'); mii.g.position.set(side*1.05,.62,0); mii.g.rotation.y=side>0?-Math.PI/2:Math.PI/2; R.scene.add(mii.g); const b={p,cpu:!!p.cpu,mii,side,hp:100,punch:null,block:false,stun:0,cd:0,ko:false,cpuAt:0,blockT:0,lean:0,hitT:0,side}; mii.rest=m=>{ this.guardPose(b,m); }; return b; },
  guardPose(b,m){ const bl=b.block?1:0; m.arm('R',lerp(-1.6,-2.3,bl),lerp(-.3,-.1,bl),.5-.3*bl); m.arm('L',lerp(-1.6,-2.3,bl),lerp(.3,.1,bl),-.5+.3*bl); m.body.rotation.x=lerp(m.body.rotation.x,.1+.15*bl,.2); m.body.position.z=lerp(m.body.position.z,0,.2); },
  phones(){ this.players.forEach(p=>{ const b=this.boxers.find(x=>x.p===p); if(b)phoneUI(p,{mode:'box',icon:'🥊',title:'FIGHT!',sub:'Punch forward, hook sideways, or uppercut. Hold BLOCK to guard.',btns:[{id:'block',label:'HOLD TO BLOCK',hold:1}],rate:3}); else phoneUI(p,{mode:'wait',icon:'🥊',title:'Next up',sub:this.boxers[0].p.name+' vs '+this.boxers[1].p.name,btns:[],rate:3}); }); },
  hudHP(){ const [A,B]=this.boxers; const bar=b=>`<div class="hp" style="--c:${b.p.color}"><div class="nm"><span>${esc(b.p.name)}</span><span>${Math.max(0,Math.ceil(b.hp))}</span></div><div class="bar"><i style="width:${clamp(b.hp,0,100)}%"></i></div></div>`; hud('TL',bar(A)); hud('TR',bar(B)); },
  hudTime(){ hud('TC',`<b>ROUND ${this.round+1}</b> &nbsp; ${Math.ceil(this.timer)}s`); },
  onBtn(p,id,down){ const b=this.boxers.find(x=>x.p===p); if(!b||id!=='block')return; b.block=down&&!b.ko; if(down&&b.punch)b.punch=null; },
  onSwingStart(p){ const b=this.boxers.find(x=>x.p===p); if(b)this.punch(b,'jab',.9,true); },
  onSwing(p,sw){ const b=this.boxers.find(x=>x.p===p); if(!b)return; const ax=Math.abs(sw.dx),ay=Math.abs(sw.dy),az=Math.abs(sw.dz); let type='jab'; if(sw.touch){ type=ay>ax?(sw.dy>0?'upper':'jab'):'hook'; } else { if(Math.abs(sw.rg)>260||(ax>ay&&ax>az))type='hook'; else if(az>ay&&sw.dz>0)type='upper'; }
    if(b.punch&&b.punch.early&&b.punch.t<.13){ b.punch.pw=clamp(sw.pw,.4,1.6); b.punch.type=type; b.punch.early=false; return; } this.punch(b,type,sw.pw); },
  punch(b,type,pw,early){ if(this.state!=='fight'||b.ko||b.punch||b.stun>0||b.cd>0)return; b.block=false; b.punch={type,t:0,dur:b.cpu?.5:.34,hitAt:b.cpu?.28:.16,pw:clamp(pw,.4,1.6),done:false,early:!!early,arm:b.nextArm=(b.nextArm==='L'?'R':'L')}; AUD.swish(); const m=b.mii, arm=b.punch.arm, self=this;
    m.play('punch',.34,(mii,k)=>{ self.guardPose(b,mii); const e=k<.45?easeOut(k/.45):1-easeIn((k-.45)/.55); if(type==='jab'){ mii.arm(arm,-1.55-e*.05,arm==='L'?.3*(1-e):-.3*(1-e),(arm==='L'?-1:1)*(.5-e*.45)); mii.body.position.z=-e*.25; }
      else if(type==='hook'){ mii.arm(arm,-1.5,(arm==='L'?1:-1)*(1.4-e*2.6),(arm==='L'?-1:1)*.4); mii.body.rotation.y=(arm==='L'?1:-1)*(.5-e*1.0); }
      else { mii.arm(arm,-.6-e*1.9,0,(arm==='L'?-1:1)*.3); mii.body.rotation.x=.3-e*.4; mii.body.position.z=-e*.15; } }); },
  resolve(b){ const o=this.boxers.find(x=>x!==b); const pn=b.punch; const dmg={jab:5+5*pn.pw,hook:8+7*pn.pw,upper:10+9*pn.pw}[pn.type]; b.cd=.35;
    if(o.dodge>0){ banner('DODGE','',.6); return; }
    if(o.block){ o.hp-=dmg*.2; AUD.thud(); o.mii.play('blockhit',.25,(m,k)=>{ this.guardPose(o,m); m.body.position.z=Math.sin(k*Math.PI)*.12; }); this.spark(o,0x9fb3c8); if(!o.cpu)buzz(o.p,40); }
    else { o.hp-=dmg; o.stun=.4; AUD.punch(); this.shake=.25; this.spark(o,0xffc233); if(!o.cpu)buzz(o.p,150); o.mii.face('surprised',.5); const up=pn.type==='upper'; o.punch=null; o.mii.play('hit',.45,(m,k)=>{ this.guardPose(o,m); const e=Math.sin(k*Math.PI); m.headG.rotation.x=(up?-.7:-.45)*e; m.headG.rotation.y=(pn.type==='hook'?.6:0)*e; m.body.position.z=e*.3; m.body.rotation.x=-.25*e; });
      if(o.hp<=0){ this.knockout(o,b); } }
    this.hudHP(); },
  spark(o,color){ for(let i=0;i<8;i++){ const m=sph(.05,color,{cast:false,recv:false},6); m.position.set(o.mii.g.position.x-o.side*.3,1.9+rnd(-.2,.2),rnd(-.2,.2)); m.userData.v=V3(rnd(-2,2),rnd(1,4),rnd(-2,2)); m.userData.t=0; R.scene.add(m); this.fx.push(m); } },
  knockout(o,b){ o.ko=true; o.block=false; this.state='ko'; this.stateT=0; o.mii.face('sad',9); b.mii.face('cheer',9); banner('K.O.!',b.p.name+' wins by knockout',3,'gold'); AUD.cheer(); AUD.crash(); if(!b.cpu)buzz(b.p,500); o.mii.play('ko',.9,(m,k)=>{ const e=easeIn(k); m.g.rotation.x=0; m.body.rotation.x=-e*1.5; m.body.position.z=e*.9; m.body.position.y=-e*.35; m.arm('L',-2.5*e,0,-.5); m.arm('R',-2.5*e,0,.5); }); o.mii.rest=null; this.endBout(b,o); },
  endBout(w,l){ this.pendingEnd=true; const wi=this.players.indexOf(w.p); if(wi>=0)this.wins[wi]++; this.champ=w.p; this.loser=l.p; },
  update(dt){
    this.t+=dt; this.stateT+=dt; const [A,B]=this.boxers;
    if(this.state==='intro'&&this.stateT>2){ this.state='fight'; this.stateT=0; this.timer=this.ROUND_T; banner('FIGHT!','',.9,'red'); AUD.ding(); }
    if(this.state==='fight'){ this.timer-=dt; if(this.timer<=0){ this.round++; if(this.round>=this.ROUNDS){ const w=A.hp>=B.hp?A:B, l=w===A?B:A; this.state='ko'; this.stateT=0; banner('DECISION',w.p.name+' wins on points',3,'gold'); AUD.cheer(); this.endBout(w,l); } else { this.state='rest'; this.stateT=0; banner('ROUND '+(this.round+1),'',1.8); this.boxers.forEach(b=>{ b.hp=Math.min(100,b.hp+15); b.punch=null; b.block=false; }); this.hudHP(); } }
      this.hudTime();
      this.boxers.forEach(b=>{ const o=b===A?B:A; b.stun=Math.max(0,b.stun-dt); b.cd=Math.max(0,b.cd-dt); b.dodge=Math.max(0,(b.dodge||0)-dt);
        if(b.punch){ b.punch.t+=dt; if(!b.punch.done&&b.punch.t>=b.punch.hitAt){ b.punch.done=true; this.resolve(b); } if(b.punch.t>=b.punch.dur)b.punch=null; }
        if(b.cpu){ if(o.punch&&!o.punch.done&&!b.block&&b.blockT<=0&&Math.random()<.02*60*dt*.6){ b.block=true; b.blockT=.5; } if(b.blockT>0){ b.blockT-=dt; if(b.blockT<=0)b.block=false; }
          if(this.t>b.cpuAt&&!b.block&&!b.punch&&b.stun<=0){ b.cpuAt=this.t+rnd(1.1,2.3); this.punch(b,['jab','jab','hook','upper'][Math.floor(Math.random()*4)],clamp(.85+gauss()*.2,.5,1.3)); } }
      });
    }
    if(this.state==='rest'&&this.stateT>2.2){ this.state='fight'; this.stateT=0; this.timer=this.ROUND_T; banner('FIGHT!','',.9,'red'); }
    if(this.state==='ko'&&this.stateT>3.4&&this.pendingEnd){ this.pendingEnd=false; this.nextBout(); return; }
    this.boxers.forEach(b=>{ b.mii.update(dt); if(!b.ko&&!b.mii.anim){ b.mii.headG.rotation.x*=.9; b.mii.headG.rotation.y*=.9; b.mii.body.rotation.y*=.85; } });
    this.fx=this.fx.filter(m=>{ m.userData.t+=dt; m.userData.v.y-=9.8*dt; m.position.addScaledVector(m.userData.v,dt); if(m.userData.t>.6){ R.scene.remove(m); return false; } return true; });
    this.shake=Math.max(0,(this.shake||0)-dt); const sh=this.shake*.25; camLerp(V3(rnd(-sh,sh),2.6+rnd(-sh,sh),6),V3(0,1.25,0),.2);
  },
  nextBout(){ if(this.queue.length){ this.boxers.forEach(b=>R.scene.remove(b.mii.g)); this.startBout(); } else this.finish(); },
  finish(){ const rows=this.players.map((p,i)=>({p:p.cpu?null:p,name:p.name,color:p.color,val:this.wins[i]+(this.champ===p?.5:0),w:this.wins[i]})).sort((a,b)=>b.val-a.val).map(r=>Object.assign(r,{score:r.p===this.champ?'CHAMPION':(r.w+' win'+(r.w===1?'':'s'))})); if(this.players.length===1&&this.champ&&this.champ.cpu)rows[0].score='LOST TO CPU'; endSport(rows,'Boxing'); },
  onKey(k){ if(TEST){ const b=this.boxers[0]; if(k==='j')this.punch(b,'jab',1); if(k==='h')this.punch(b,'hook',1); if(k==='u')this.punch(b,'upper',1); if(k==='b')b.block=!b.block; } },
  dispose(){}
};
