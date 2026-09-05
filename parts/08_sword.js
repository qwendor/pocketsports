/* ============================== SWORDPLAY (duel) ============================== */
const SW_CFG={rest:[.3,-.1,.4],posGain:1.2,armLen:.95,bladeLen:1.0,slashSpeed:3.2,hitR:.72,knockGain:.28,knockMin:.45,knockMax:1.5,parryPush:.35,stagger:.28,hitCd:.4,platformR:3.3,approachDist:1.9,approachSpeed:.8,roundsToWin:2};
SPORTS.sword={
  name:'Swordplay',icon:'⚔️',players:'1-4 players',
  how:['Your sword follows the phone. Hold it like a sword grip: point it forward, hold it sideways, raise it, whatever you do the sword does.','Slash through your opponent to knock them back. A faster slash knocks harder. Knock them off the edge of the platform to win the round.','Hold BLOCK to guard: a blocked slash barely moves you and pushes the attacker back instead.','First to 2 rounds wins. With 2 players the screen splits, one view behind each fighter. With 3 or 4 players the winner stays on.'],
  who:n=>n<=1?'You vs the computer':n===2?'Player 1 vs Player 2, split screen':'Winner stays on: P1 vs P2, then the next challenger',
  build(players){
    const s=newScene({sky:0x8fd3ff,shadow:12,sunX:8,sunY:20,sunZ:10,fogNear:80,fogFar:400});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.wins=this.players.map(()=>0); this.queue=this.players.slice(); this.t=0; this.stateT=0;
    skyDome(s); const sea=tplane(600,600,'tex_water',0x3aa5e6,14); sea.position.y=-6; s.add(sea); backdrop(s,'bg_hills',{r:200,h:70,len:TAU,center:Math.PI,rep:4,y:20});
    const base=cyl(SW_CFG.platformR+.3,SW_CFG.platformR+1.2,6,0x8a7a66,24); base.position.y=-3; s.add(base);
    const top=cyl(SW_CFG.platformR,SW_CFG.platformR+.3,.4,0xe9dcc0,48); top.position.y=-.2; s.add(top);
    const rim=mesh(new THREE.TorusGeometry(SW_CFG.platformR,.08,8,64),0xd63a48); rim.rotation.x=Math.PI/2; rim.position.y=.02; s.add(rim);
    for(let i=0;i<8;i++){ const a=i/8*TAU; const post=cyl(.12,.14,1.2,0x5a3a1a); post.position.set(Math.cos(a)*7,-.6,Math.sin(a)*7); s.add(post); }
    this.fx=[]; this.startBout();
  },
  startBout(){ const A=this.champ||this.queue.shift(); const B=this.queue.shift()||cpuPlayer('CPU','#8899aa'); if(this.f)this.f.forEach(f=>R.scene.remove(f.mii.g));
    this.f=[this.mkFighter(A,1),this.mkFighter(B,-1)]; this.round=0; this.rounds=[0,0]; this.state='intro'; this.stateT=0; this.cams(); this.hudRounds(); banner('ROUND 1','',1.8); this.phones(); AUD.fanfare(); },
  mkFighter(p,side){ const mii=makeMii(p.color,p.name); mii.baseExpr='determined'; mii.face('determined'); mii.g.position.set(0,0,side*1.25); mii.g.rotation.y=side>0?Math.PI:0; R.scene.add(mii.g);
    if(!p.cpu)mii.setTrackedTool('sword'); else mii.setTool('sword');
    const f={p,cpu:!!p.cpu,mii,side,pos:new THREE.Vector3(0,0,side*1.25),guard:false,stagger:0,cd:0,tr:new PointTracker(),rest:new THREE.Vector3(...SW_CFG.rest),out:false,fallT:0,cpuAt:0,slash:null,vel:new THREE.Vector3()};
    mii.rest=m=>{ if(!m.tracked){ m.arm('R',-1.1,-.4,.4); } m.arm('L',-.4,.2,-.3); }; return f; },
  cams(){ const humans=this.f.filter(f=>!f.cpu); if(humans.length===2){ R.views=this.f.map(f=>({cam:new THREE.PerspectiveCamera(50,1,.1,1000),f,pos:new THREE.Vector3(),look:new THREE.Vector3()})); $('#vsplit').classList.add('on'); } else { R.views=null; $('#vsplit').classList.remove('on'); } },
  phones(){ this.players.forEach(p=>{ const f=this.f.find(x=>x.p===p); if(f)phoneUI(p,{mode:'sword',icon:'⚔️',title:'FIGHT!',sub:'Your sword follows the phone. Slash through your opponent; hold BLOCK to guard.',btns:[{id:'block',label:'HOLD TO BLOCK',hold:1},{id:'recenter',label:'RECENTER',sec:1}],rate:3}); else phoneUI(p,{mode:'wait',icon:'⚔️',title:'Next up',sub:this.f[0].p.name+' vs '+this.f[1].p.name,btns:[],rate:3}); }); },
  hudRounds(){ const [A,B]=this.f; const pip=(f,i)=>`<div class="turn"><span class="dot" style="--c:${f.p.color}"></span><b>${esc(f.p.name)}</b> <span style="font-family:Fredoka;font-size:1.3em">${'●'.repeat(this.rounds[i])}${'○'.repeat(SW_CFG.roundsToWin-this.rounds[i])}</span></div>`; hud('TL',pip(A,0)); hud('TR',pip(B,1)); },
  onBtn(p,id,down){ const f=this.f.find(x=>x.p===p); if(!f||id!=='block')return; f.guard=down&&!f.out; },
  // legacy swing events (touch mode): a canned slash
  onSwing(p,sw){ const f=this.f.find(x=>x.p===p); if(!f||tracked(p))return; this.cannedSlash(f,clamp(sw.pw,.6,1.5)); },
  cannedSlash(f,pw){ if(f.slash||f.stagger>0||f.cd>0||this.state!=='fight'||f.out)return; f.slash={t:0,dur:.4,hitAt:.18,pw,done:false,canned:true}; AUD.swish(); const m=f.mii; if(!m.tracked)m.play('slash',.4,(mii,k)=>{ const e=k<.4?easeOut(k/.4):1-easeIn((k-.4)/.6); mii.arm('R',-1.1-e*.6,-.4+e*1.8,.4); mii.body.rotation.y=-.5+e*1.1; }); },
  trackSword(f,o,dt){ const K=SW_CFG, c=f.p.ctrl, m=f.mii; rigHand(m,c,f.rest,K.posGain,1,K.armLen); f.tr.update(m.toolG,_sw1.set(0,0,K.bladeLen),dt);
    if(this.state!=='fight'||f.out||f.cd>0||f.stagger>0)return;
    const hv=ctrlVelWorld(m,c,_sw2).add(f.tr.vel); const sp=hv.length(); if(sp<K.slashSpeed)return;
    // blade segment (hand -> tip) against the opponent's body
    const hand=_sw3.set(0,0,0); m.toolG.localToWorld(hand); const tip=f.tr.pos; const body=_sw4.copy(o.mii.g.position).add(_sw5.set(0,1.1,0)); const seg=_sw5.copy(tip).sub(hand); const L2=Math.max(1e-4,seg.lengthSq()); const tt=clamp(_sw6.copy(body).sub(hand).dot(seg)/L2,0,1); const near=_sw6.copy(hand).addScaledVector(seg,tt); const dy=Math.abs(near.y-body.y); const d=Math.hypot(near.x-body.x,near.z-body.z);
    if(d<K.hitR&&dy<.9){ this.hit(f,o,sp,hv); } },
  hit(f,o,sp,hv){ const K=SW_CFG; f.cd=K.hitCd; const dir=_sw3.copy(o.mii.g.position).sub(f.mii.g.position); dir.y=0; dir.normalize(); if(hv){ const h=_sw4.set(hv.x,0,hv.z); if(h.length()>.5){ h.normalize(); dir.lerp(h,.35).normalize(); } }
    let k=clamp(sp*K.knockGain,K.knockMin,K.knockMax);
    if(o.guard){ k*=.25; f.vel.addScaledVector(dir,-K.parryPush*3); banner('BLOCKED','',.5); AUD.crack(); this.spark(o,0x9fb3c8); o.mii.face('determined'); }
    else { o.stagger=K.stagger; AUD.punch(); AUD.tone(1400,.08,'square',.12,-600); this.spark(o,0xffc233); o.mii.face('surprised',.5); this.shake=.2; if(!o.cpu)buzz(o.p,150); o.mii.play('hit',.35,(m,kk)=>{ const e=Math.sin(kk*Math.PI); m.headG.rotation.x=-.4*e; m.body.rotation.x=-.25*e; }); }
    o.vel.addScaledVector(dir,k*3.2); if(!f.cpu)buzz(f.p,60); },
  spark(o,color){ for(let i=0;i<8;i++){ const m=sph(.05,color,{cast:false,recv:false},6); m.position.copy(o.mii.g.position).add(V3(rnd(-.2,.2),1.3+rnd(-.2,.2),rnd(-.2,.2))); m.userData.v=V3(rnd(-2,2),rnd(1,4),rnd(-2,2)); m.userData.t=0; R.scene.add(m); this.fx.push(m); } },
  update(dt){
    this.t+=dt; this.stateT+=dt; const [A,B]=this.f, K=SW_CFG;
    if(this.state==='intro'&&this.stateT>2){ this.state='fight'; this.stateT=0; banner('FIGHT!','',.9,'red'); AUD.ding(); }
    if(this.state==='fight'){
      this.f.forEach(f=>{ const o=f===A?B:A; f.cd=Math.max(0,f.cd-dt); f.stagger=Math.max(0,f.stagger-dt);
        // canned slash resolution (CPU / touch mode)
        if(f.slash&&f.slash.canned){ f.slash.t+=dt; if(!f.slash.done&&f.slash.t>=f.slash.hitAt){ f.slash.done=true; const dd=f.mii.g.position.distanceTo(o.mii.g.position); if(dd<2.1)this.hit(f,o,2.5+f.slash.pw*3,null); } if(f.slash.t>=f.slash.dur)f.slash=null; }
        if(f.cpu){ if(o.tr&&o.tr.speed>3&&!f.guard&&Math.random()<.02*60*dt*.5){ f.guard=true; f.guardT=.6; } if(f.guardT>0){ f.guardT-=dt; if(f.guardT<=0)f.guard=false; }
          if(this.t>f.cpuAt&&!f.guard&&!f.slash&&f.stagger<=0){ f.cpuAt=this.t+rnd(1.8,3.2); this.cannedSlash(f,clamp(.6+gauss()*.2,.4,1.0)); } }
        // approach when far apart, then knockback velocity + friction
        const toO=_sw1.copy(o.mii.g.position).sub(f.mii.g.position); toO.y=0; const dist=toO.length(); if(dist>K.approachDist&&f.stagger<=0){ f.vel.addScaledVector(toO.normalize(),K.approachSpeed*dt*4); }
        f.mii.g.position.addScaledVector(f.vel,dt); f.vel.multiplyScalar(Math.max(0,1-6*dt)); f.mii.g.position.y=0;
        const r=Math.hypot(f.mii.g.position.x,f.mii.g.position.z); if(r>K.platformR+.15&&!f.out){ this.fall(f,o); }
        f.mii.lookAt(o.mii.g.position.x,o.mii.g.position.z);
      });
      // keep them from overlapping
      const d=A.mii.g.position.distanceTo(B.mii.g.position); if(d<1.0){ const push=_sw1.copy(A.mii.g.position).sub(B.mii.g.position).normalize().multiplyScalar((1.0-d)/2); A.mii.g.position.add(push); B.mii.g.position.sub(push); }
    }
    this.f.forEach(f=>{ const o=f===A?B:A; if(!f.cpu&&tracked(f.p)&&!f.out){ if(!f.mii.tracked)f.mii.setTrackedTool('sword'); this.trackSword(f,o,dt); } if(f.out){ f.fallT+=dt; f.mii.g.position.y=-f.fallT*f.fallT*4; f.mii.g.rotation.x=-f.fallT*1.5; } f.mii.update(dt); if(f.guard&&!f.mii.anim){ f.mii.arm('L',-1.6,.4,-.6); } });
    if(this.state==='roundEnd'&&this.stateT>2.6){ if(this.rounds[0]>=K.roundsToWin||this.rounds[1]>=K.roundsToWin){ const wi=this.rounds[0]>=K.roundsToWin?0:1; this.endBout(this.f[wi],this.f[1-wi]); } else this.resetRound(); }
    if(this.state==='over'&&this.stateT>2.5){ this.nextBout(); return; }
    this.fx=this.fx.filter(m=>{ m.userData.t+=dt; m.userData.v.y-=9.8*dt; m.position.addScaledVector(m.userData.v,dt); if(m.userData.t>.6){ R.scene.remove(m); return false; } return true; });
    this.shake=Math.max(0,(this.shake||0)-dt); this.camera(dt);
  },
  camera(dt){ const sh=(this.shake||0)*.2; const camFor=(f,o,out)=>{ const back=_sw1.copy(f.mii.g.position).sub(o.mii.g.position); back.y=0; if(back.length()<.1)back.set(0,0,f.side); back.normalize(); const rx=back.z, rz=-back.x; out.pos.set(f.mii.g.position.x+back.x*4.0+rx*1.4+rnd(-sh,sh),2.8+rnd(-sh,sh),f.mii.g.position.z+back.z*4.0+rz*1.4); out.look.set(o.mii.g.position.x*.7+f.mii.g.position.x*.3,1.0,o.mii.g.position.z*.7+f.mii.g.position.z*.3); };
    if(R.views){ R.views.forEach(v=>{ camFor(v.f,v.f===this.f[0]?this.f[1]:this.f[0],v); v.cam.position.lerp(v.pos,.1); v.cam.lookAt(v.look); }); }
    else { const f=this.f.find(x=>!x.cpu)||this.f[0]; const o=f===this.f[0]?this.f[1]:this.f[0]; const tmp={pos:_sw2,look:_sw3}; camFor(f,o,tmp); camLerp(tmp.pos,tmp.look,.1); } },
  fall(f,o){ f.out=true; f.fallT=0; f.guard=false; this.state='roundEnd'; this.stateT=0; const wi=this.f.indexOf(o); this.rounds[wi]++; this.hudRounds(); banner('OFF THE EDGE!',o.p.name+' takes the round',2.2,'gold'); AUD.cheer(); AUD.noise(.5,.3,300,3000); o.mii.face('cheer',2.5); f.mii.face('sad',3); if(!o.cpu)buzz(o.p,300); },
  resetRound(){ this.round++; this.f.forEach(f=>{ f.out=false; f.fallT=0; f.mii.g.position.set(0,0,f.side*1.25); f.mii.g.rotation.x=0; f.vel.set(0,0,0); f.stagger=0; f.cd=0; f.slash=null; f.guard=false; }); this.state='intro'; this.stateT=.8; banner('ROUND '+(this.round+1),'',1.6); },
  endBout(w,l){ this.state='over'; this.stateT=0; const wi=this.players.indexOf(w.p); if(wi>=0)this.wins[wi]++; this.champ=w.p; banner('VICTORY',w.p.name+' wins the duel',2.4,'gold'); AUD.fanfare(); w.mii.face('cheer',5); },
  nextBout(){ if(this.queue.length){ this.startBout(); } else this.finish(); },
  finish(){ const rows=this.players.map((p,i)=>({p:p.cpu?null:p,name:p.name,color:p.color,val:this.wins[i]+(this.champ===p?.5:0),w:this.wins[i]})).sort((a,b)=>b.val-a.val).map(r=>Object.assign(r,{score:r.p===this.champ?'CHAMPION':(r.w+' win'+(r.w===1?'':'s'))})); if(this.players.length===1&&this.champ&&this.champ.cpu)rows[0].score='LOST TO CPU'; endSport(rows,'Swordplay'); },
  onKey(k){ if(TEST){ const f=this.f[0]; if(k==='j')this.cannedSlash(f,1); if(k==='b')f.guard=!f.guard; } },
  dispose(){ R.views=null; $('#vsplit').classList.remove('on'); }
};
const _sw1=new THREE.Vector3(), _sw2=new THREE.Vector3(), _sw3=new THREE.Vector3(), _sw4=new THREE.Vector3(), _sw5=new THREE.Vector3(), _sw6=new THREE.Vector3();
