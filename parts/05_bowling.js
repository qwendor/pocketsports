/* ============================== BOWLING ============================== */
const PINSPOTS=[[0,0],[-.1524,-.264],[.1524,-.264],[-.3048,-.528],[0,-.528],[.3048,-.528],[-.4572,-.792],[-.1524,-.792],[.1524,-.792],[.4572,-.792]];
function bowlScore(fr){ // fr = array of frames, each an array of rolls; returns {cum:[...], total, done}
  const rolls=[]; const idx=[]; fr.forEach((f,i)=>f.forEach(r=>{rolls.push(r);idx.push(i);}));
  const cum=[]; let total=0, k=0;
  for(let f=0;f<10;f++){ const fRolls=fr[f]||[]; if(!fRolls.length){cum.push(null);continue;}
    if(f<9){ if(fRolls[0]===10){ if(rolls.length>=k+3){ total+=10+rolls[k+1]+rolls[k+2]; cum.push(total);} else cum.push(null); k+=1; }
      else if(fRolls.length>=2&&fRolls[0]+fRolls[1]===10){ if(rolls.length>=k+3){ total+=10+rolls[k+2]; cum.push(total);} else cum.push(null); k+=2; }
      else if(fRolls.length>=2){ total+=fRolls[0]+fRolls[1]; cum.push(total); k+=2; } else { cum.push(null); k+=1; } }
    else { const need=(fRolls[0]===10||fRolls[0]+(fRolls[1]||0)===10)?3:2; if(fRolls.length>=need){ total+=fRolls.reduce((a,b)=>a+b,0); cum.push(total);} else cum.push(null); }
  }
  return {cum,total};
}
SPORTS.bowling={
  name:'Bowling',icon:'🎳',players:'1-4 players',FRAMES:10,BR:.108,PR:.058,
  how:['Hold your phone like a bowling ball. <b>Tilt</b> it left or right to aim.','Press and <b>hold</b> the button on your phone, swing your arm back and forward like a real bowl.','<b>Let go</b> of the button at the bottom of your swing to release the ball. Faster swing = faster ball.','Twist your wrist as you release to put a hook on the ball. 10 frames, highest score wins.'],
  who:n=>n<=1?'Solo game, 10 frames':n+' players take turns, 10 frames each',
  build(players){
    const s=newScene({sky:0x2a3550,fog:false,shadow:14,sunX:6,sunY:18,sunZ:-4,hemi:.3,sun:.55,hemiSky:0x8fa3c8,hemiGround:0x222a3a});
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.frames=this.players.map(()=>[]); this.pi=0; this.fi=0; this.roll=0; this.t=0; this.stateT=0;
    // building
    const floor=plane(60,60,0x39455e,{}); floor.position.set(0,-.02,-8); s.add(floor);
    const back=box(60,10,1,0x1d2438,{cast:false}); back.position.set(0,5,-24); s.add(back);
    const lanes=[-2.2,0,2.2]; lanes.forEach(x=>{ const l=box(1.05,.04,24,0xc9955a,{cast:false}); l.position.set(x,0,-8); s.add(l); for(const sx of[-1,1]){ const g=box(.24,.04,24,0x2a3142,{cast:false}); g.position.set(x+sx*.66,-.04,-8); s.add(g); }
      for(let i=0;i<7;i++){ const a=mesh(new THREE.ConeGeometry(.04,.16,3),0x6b4b2a,{cast:false}); a.rotation.x=-Math.PI/2; a.rotation.z=0; a.position.set(x+(i-3)*.14,.025,-4.5-Math.abs(i-3)*.28); s.add(a); }
      const pit=box(1.6,.6,1.2,0x0e1220,{cast:false}); pit.position.set(x,.3,-20.6); s.add(pit); const cap=box(1.7,.2,1.4,0x1d2438,{cast:false}); cap.position.set(x,.95,-20.6); s.add(cap);
      const foul=box(1.05,.045,.05,0x222222,{cast:false}); foul.position.set(x,.005,0); s.add(foul);
      const app=box(1.6,.04,6,0xcdb48e,{cast:false}); app.position.set(x,-.005,3); s.add(app);
      if(x!==0){ PINSPOTS.forEach(([px,pz])=>{ const pm=this.pinMesh(); pm.position.set(x+px,0,-18.29+pz); s.add(pm); }); } });
    const neon=box(8,.3,.1,0xff5a5f,{cast:false,m:{emissive:0xff5a5f}}); neon.position.set(0,3.2,-23.4); s.add(neon);
    for(let i=0;i<4;i++){ const lamp=new THREE.PointLight(0xffe7c2,.25,20); lamp.position.set(-3+i*2,4,-14+i*2); s.add(lamp); }
    const seats=box(8,.5,2,0x8a2f3a,{cast:false}); seats.position.set(0,.25,6.5); s.add(seats);
    crowd(s,[[0,.9,6.6,3.5,.2,.6]],14);
    this.pins=[]; this.ball={x:0,z:3,vx:0,vz:0,spin:0,active:false,y:0,gutter:false};
    this.ballM=sph(this.BR,0x2b2f6b,{phong:true}); s.add(this.ballM); this.ballM.visible=false;
    this.guide=new THREE.Group(); s.add(this.guide); for(let i=0;i<12;i++){ const d=disc(.05,0xffffff,{m:{transparent:true,opacity:.6},recv:false}); d.position.set(0,.03,-1-i*1.4); this.guide.add(d); }
    this.miis=this.players.map(p=>{ const m=makeMii(p.color,p.name); m.setTool('ball'); m.g.visible=false; s.add(m.g); return m; });
    this.setPins(true); this.beginTurn(); this.card();
    camSet(V3(1.5,2.4,6.6),V3(-.1,.5,-8));
  },
  pinMesh(){ const g=new THREE.Group(); const b=cyl(.045,.058,.3,0xffffff,12); b.position.y=.15; g.add(b); const n=cyl(.03,.045,.08,0xffffff,12); n.position.y=.33; g.add(n); const h=sph(.04,0xffffff,{},10); h.position.y=.37; g.add(h); const st=mesh(new THREE.TorusGeometry(.046,.012,6,16),0xe0313f); st.rotation.x=Math.PI/2; st.position.y=.3; g.add(st); return g; },
  setPins(fresh){ if(fresh){ this.pins.forEach(p=>R.scene.remove(p.m)); this.pins=PINSPOTS.map(([x,z],i)=>{ const m=this.pinMesh(); m.position.set(x,0,-18.29+z); R.scene.add(m); return {i,x,z:-18.29+z,ox:x,oz:-18.29+z,vx:0,vz:0,up:true,fallT:0,m,gone:false,rot:0,dir:0,drop:0}; }); }
    else { this.pins=this.pins.filter(p=>{ if(!p.up){ R.scene.remove(p.m); return false; } p.ox=p.x; p.oz=p.z; p.vx=p.vz=0; return true; }); } },
  beginTurn(){ this.state='aim'; this.stateT=0; const p=this.players[this.pi]; this.ball.active=false; this.ball.gutter=false; this.ballM.visible=false; this.hold=false; this.holdT=0; this.aim=0; this.released=false;
    this.miis.forEach((m,i)=>{ m.g.visible=i===this.pi; m.g.position.set(0,0,3.4); m.g.rotation.y=Math.PI; m.arm('R',0,0,0); m.arm('L',0,0,0); m.body.rotation.y=0; m.anim=null; m.rest=null; if(m.ballMesh)m.ballMesh.visible=true; });
    if(p.cpu){ this.cpuAt=this.t+1.5; }
    hud('B',turnBox(p,`Frame ${this.fi+1} · ${this.roll===0?'1st':this.roll===1?'2nd':'3rd'} ball`));
    this.phones(); this.card(); },
  phones(){ this.players.forEach((p,i)=>{ if(p.cpu)return; if(i===this.pi)phoneUI(p,{mode:'bowl',icon:'🎳',title:'Your turn',sub:'Tilt to aim. Hold the button, swing your arm, and let go to release.',btns:[{id:'hold',label:'HOLD · SWING · RELEASE',hold:1}],rate:15}); else phoneUI(p,{mode:'wait',icon:'🎳',title:'Waiting',sub:this.players[this.pi].name+' is bowling. Frame '+(this.fi+1),btns:[],rate:3}); }); },
  card(){ const el=$('#bowlcard'); el.classList.remove('hidden'); let h='<table><tr><th></th>'+Array.from({length:10},(_,i)=>'<th>'+(i+1)+'</th>').join('')+'<th>Total</th></tr>';
    this.players.forEach((p,pi)=>{ const fr=this.frames[pi]; const sc=bowlScore(fr); h+=`<tr class="${pi===this.pi?'cur':''}"><td class="nm" style="--c:${p.color}">${esc(p.name)}</td>`;
      for(let f=0;f<10;f++){ const r=fr[f]||[]; const marks=r.map((v,i)=>{ if(v===10)return 'X'; if(i>0&&r[i-1]!==10&&r[i-1]+v===10)return '/'; if(f===9&&i===2&&r[1]!==10&&r[1]+v===10)return '/'; return v===0?'-':v; }); h+=`<td><div class="r">${marks.map(m=>'<span>'+m+'</span>').join('')||'&nbsp;'}</div><div class="t">${sc.cum[f]!=null?sc.cum[f]:'&nbsp;'}</div></td>`; }
      h+=`<td class="t">${sc.total}</td></tr>`; });
    el.innerHTML=h+'</table>'; },
  onOrient(p){ if(this.players[this.pi]===p&&this.state==='aim'){ this.aim=clamp(p.orient.g/30,-1,1); } },
  onBtn(p,id,down,m){ if(this.players[this.pi]!==p||this.state!=='aim')return; if(id!=='hold')return;
    if(down){ this.startHold(); } else if(this.hold){ this.throwBall(clamp((m.p||12)/20,.3,1.6),(m.rg||0),(m.dx||0)); } },
  onSwing(p,sw){ if(this.players[this.pi]!==p||this.state!=='aim')return; if(!this.hold){ this.startHold(); this.throwBall(sw.pw,sw.rg,sw.dx,true); } else this.throwBall(sw.pw,sw.rg,sw.dx); },
  startHold(){ if(this.hold)return; this.hold=true; this.holdT=0; const m=this.miis[this.pi]; m.play('back',.9,(mii,k)=>{ mii.arm('R',easeOut(k)*1.35,0,0); mii.g.position.z=3.4-easeOut(k)*2.2; mii.body.rotation.x=.12*k; }); },
  throwBall(pw,rg,dx,quick){ if(this.released)return; this.released=true; const m=this.miis[this.pi]; const self=this;
    const delay=quick?.35:0; const speed=clamp(4.2+5.2*pw,4.5,11.5); const spin=clamp(-(rg||0)/600,-1,1); const ang=this.aim*4.5+clamp(dx,-1,1)*1.2+gauss()*.4; this.pendingThrow={speed,spin,ang};
    m.play('throw',.55+delay,(mii,k)=>{ const kk=clamp((k*(0.55+delay)-delay)/.55,0,1); mii.arm('R',lerp(1.35,-1.5,easeOut(kk)),0,0); mii.g.position.z=1.2-easeOut(kk)*1.0; mii.body.rotation.x=lerp(.12,.35,kk); if(kk>.55&&self.pendingThrow){ self.launch(self.pendingThrow); self.pendingThrow=null; } });
    m.rest=mii=>{ mii.arm('R',lerp(mii.arms.R.g.rotation.x,0,.05),0,0); mii.body.rotation.x*=.95; }; },
  launch(th){ const b=this.ball; const m=this.miis[this.pi]; if(m.ballMesh)m.ballMesh.visible=false; const a=th.ang*Math.PI/180; b.x=0+Math.sin(a)*.2; b.z=0; b.vx=Math.sin(a)*th.speed; b.vz=-Math.cos(a)*th.speed; b.spin=th.spin; b.active=true; b.gutter=false; b.y=0; this.ballM.visible=true; this.state='roll'; this.stateT=0; this.guide.visible=false; AUD.thud(); const p=this.players[this.pi]; if(!p.cpu)buzz(p,60); hud('B',''); },
  update(dt){
    this.t+=dt; this.stateT+=dt; const p=this.players[this.pi];
    if(this.state==='aim'){ this.guide.visible=!this.hold; this.guide.rotation.y=-this.aim*4.5*Math.PI/180; if(p.cpu&&this.t>this.cpuAt&&!this.hold){ this.aim=(Math.random()<.5?1:-1)*.5+gauss()*.15; this.startHold(); setTimeout(()=>{ if(this.state==='aim')this.throwBall(1+gauss()*.15,0,0); },700); }
      if(this.hold&&!this.released){ this.holdT+=dt; if(this.holdT>6){ this.throwBall(.8,0,0); } }
      camLerp(V3(1.5+this.aim*.3,2.4,6.6),V3(-.1+this.aim*.5,.5,-8),.06); }
    else if(this.state==='roll'){ this.physics(dt); const b=this.ball; camLerp(V3(b.x*.4,1.5,b.z+4.2),V3(b.x*.2,.25,b.z-7),.08); if(!b.active){ this.state='settle'; this.stateT=0; } }
    else if(this.state==='settle'){ this.physics(dt); camLerp(V3(0,1.4,-14.2),V3(0,.3,-18.6),.06); const moving=this.pins.some(pn=>!pn.gone&&(Math.abs(pn.vx)+Math.abs(pn.vz))>.05); if((!moving&&this.stateT>1.2)||this.stateT>4){ this.finishRoll(); } }
    else if(this.state==='result'){ this.physics(dt); if(this.stateT>2.2){ this.nextTurn(); } }
    const b=this.ball; this.ballM.position.set(b.x,this.BR+b.y,b.z); if(b.active){ this.ballM.rotation.x-=b.vz*dt/this.BR*.5; }
    this.pins.forEach(pn=>{ if(pn.gone)return; if(!pn.up){ pn.fallT=Math.min(pn.fallT+dt*3,1); const k=easeOut(pn.fallT); pn.m.rotation.set(0,pn.dir,0); pn.m.rotateX(k*Math.PI/2*(pn.flip?-1:1)); pn.m.position.y=-k*.02; } pn.m.position.x=pn.x; pn.m.position.z=pn.z; if(pn.drop>0){ pn.drop+=dt; pn.m.position.y=-pn.drop*2; if(pn.drop>.6){ pn.gone=true; pn.m.visible=false; } } });
    this.miis.forEach(m=>m.update(dt));
  },
  physics(dt){ const STEP=1/240; let n=Math.min(60,Math.ceil(dt/STEP)); const h=dt/n; for(let i=0;i<n;i++)this.step(h); },
  step(h){
    const b=this.ball, BR=this.BR, PR=this.PR;
    if(b.active){ if(!b.gutter){ if(b.z<-7)b.vx+=b.spin*.55*h; b.vx*=(1-.02*h); b.vz*=(1-.015*h); }
      b.x+=b.vx*h; b.z+=b.vz*h;
      if(!b.gutter&&Math.abs(b.x)>.525+BR*.35){ b.gutter=true; b.x=Math.sign(b.x)*.66; b.vx=0; b.y=-.06; b.spin=0; AUD.thud(); }
      if(b.z<-19.9||Math.hypot(b.vx,b.vz)<.15){ b.active=false; this.ballM.visible=false; }
      if(!b.gutter)this.pins.forEach(pn=>{ if(pn.gone)return; const dx=pn.x-b.x,dz=pn.z-b.z,d=Math.hypot(dx,dz); if(d<BR+PR&&d>1e-4){ const nx=dx/d,nz=dz/d; const rv=(b.vx-pn.vx)*nx+(b.vz-pn.vz)*nz; if(rv>0){ const mb=6.8,mp=1.2,e=.65; const j=(1+e)*rv/(1/mb+1/mp); b.vx-=j/mb*nx; b.vz-=j/mb*nz; pn.vx+=j/mp*nx+gauss()*.3; pn.vz+=j/mp*nz; this.knock(pn); } const ov=BR+PR-d; pn.x+=nx*ov; pn.z+=nz*ov; } }); }
    for(let i=0;i<this.pins.length;i++){ const a=this.pins[i]; if(a.gone)continue;
      for(let j=i+1;j<this.pins.length;j++){ const c=this.pins[j]; if(c.gone)continue; const ra=a.up?PR:PR*1.6, rc=c.up?PR:PR*1.6; const dx=c.x-a.x,dz=c.z-a.z,d=Math.hypot(dx,dz); if(d<ra+rc&&d>1e-4){ const nx=dx/d,nz=dz/d; const rv=(a.vx-c.vx)*nx+(a.vz-c.vz)*nz; if(rv>0){ const e=.6; const j2=(1+e)*rv/2; a.vx-=j2*nx; a.vz-=j2*nz; c.vx+=j2*nx+gauss()*.15; c.vz+=j2*nz; if(rv>.35){ this.knock(c); this.knock(a); } } const ov=ra+rc-d; a.x-=nx*ov/2; a.z-=nz*ov/2; c.x+=nx*ov/2; c.z+=nz*ov/2; } }
      const sp=Math.hypot(a.vx,a.vz); if(sp>0){ const f=a.up?3.5:1.1; const ns=Math.max(0,sp-f*h); a.vx*=ns/sp; a.vz*=ns/sp; }
      a.x+=a.vx*h; a.z+=a.vz*h; if(a.up&&Math.hypot(a.x-a.ox,a.z-a.oz)>.04)this.knock(a);
      if(!a.gone&&(Math.abs(a.x)>.64||a.z<-19.6)&&!a.drop){ a.drop=.001; a.vx=0; a.vz=0; a.up=false; }
    }
  },
  knock(pn){ if(!pn.up)return; pn.up=false; pn.fallT=0; pn.dir=Math.atan2(pn.vx,pn.vz)+Math.PI; pn.flip=false; AUD.crash(); },
  finishRoll(){ this.state='result'; this.stateT=0; const standing=this.pins.filter(p=>p.up).length; const before=this.pins.length; const knocked=before-standing; const fr=this.frames[this.pi]; if(!fr[this.fi])fr[this.fi]=[]; fr[this.fi].push(knocked);
    const p=this.players[this.pi]; let txt=null; if(knocked===10&&this.roll===0)txt='STRIKE!'; else if(this.fi===9&&knocked===10&&this.roll>0&&before===10)txt='STRIKE!'; else if(knocked===before&&this.roll>0&&before<10&&knocked>0)txt='SPARE!'; else if(knocked===0)txt=this.ball.gutter?'GUTTER':'MISS'; else txt=knocked+' PIN'+(knocked===1?'':'S');
    banner(txt,p.name,1.8,txt==='STRIKE!'?'gold':''); if(txt==='STRIKE!'||txt==='SPARE!'){ AUD.cheer(); if(!p.cpu)buzz(p,250); } this.card(); this.lastKnocked=knocked; this.lastBefore=before; },
  nextTurn(){
    const fr=this.frames[this.pi][this.fi]; const k=this.lastKnocked, before=this.lastBefore; let next=false, fresh=false;
    if(this.fi<9){ if(this.roll===0&&k<10){ this.roll=1; } else next=true; }
    else { const r=fr; if(r.length===1){ if(r[0]===10){ this.roll=1; fresh=true; } else this.roll=1; }
      else if(r.length===2){ if(r[0]===10){ if(r[1]===10)fresh=true; this.roll=2; } else if(r[0]+r[1]===10){ this.roll=2; fresh=true; } else next=true; }
      else next=true; }
    if(next){ this.roll=0; fresh=true; this.pi++; if(this.pi>=this.players.length){ this.pi=0; this.fi++; } if(this.fi>=10){ this.finish(); return; } }
    this.setPins(fresh); this.beginTurn();
  },
  finish(){ const rows=this.players.map((p,i)=>({p:p.cpu?null:p,name:p.name,color:p.color,val:bowlScore(this.frames[i]).total})).sort((a,b)=>b.val-a.val).map(r=>Object.assign(r,{score:r.val+' pts'})); endSport(rows,'Bowling'); },
  onKey(k){ if(TEST){ if(k===' '){ const p=this.players[this.pi]; if(this.state==='aim'){ if(!this.hold)this.startHold(); else this.throwBall(1,0,0); } } if(k==='a')this.aim=clamp(this.aim-.2,-1,1); if(k==='d')this.aim=clamp(this.aim+.2,-1,1); } },
  dispose(){ $('#bowlcard').classList.add('hidden'); }
};
