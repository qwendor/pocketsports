/* ============================== CONTROLLER LAB (debug) ============================== */
SPORTS.lab={
  name:'Controller Lab',icon:'🕹️',players:'test your phone',
  how:['A 3D phone and a racket follow each connected phone in real time.','Use CALIBRATE on the phone with it held flat and pointing at the TV. RECENTER does the same at any time; RESET POSITION zeroes the estimated hand travel.','Rotation, angular velocity and acceleration are real sensor data. Velocity and position are estimates (bounded, decaying) because phones cannot track true position.','The readout shows sensor rate, network rate, latency, stationary state and tracking quality.'],
  who:n=>n?n+' controller'+(n===1?'':'s')+' connected':'Connect a phone first',
  build(players){
    const s=newScene({sky:0x223044,fog:false,shadow:8,sunX:3,sunY:8,sunZ:5,hemi:.5,sun:.7,hemiSky:0x9fb3d8,hemiGround:0x1a2030});
    this.players=players; this.t=0; this.readT=0;
    const floor=plane(30,30,0x2a3550,{cast:false}); s.add(floor); const grid=new THREE.GridHelper(30,30,0x4a5c80,0x35456a); grid.position.y=.01; s.add(grid);
    this.units=players.map((p,i)=>{ const x=(i-(players.length-1)/2)*2.4; const mii=makeMii(p.color,p.name); mii.g.position.set(x,0,0); mii.setTrackedTool('racket'); mii.baseExpr='happy'; s.add(mii.g);
      const phone=new THREE.Group(); s.add(phone); const ph=box(.34,.7,.04,0x1c2430,{phong:true}); phone.add(ph); const sc=box(.29,.6,.01,0x2f80ff,{m:{emissive:0x1a4fa0},phong:true}); sc.position.set(0,0,.024); phone.add(sc); const tip=mesh(new THREE.ConeGeometry(.08,.18,10),0xffc233); tip.position.y=.44; phone.add(tip); const cam=sph(.03,0x111111,{},8); cam.position.set(-.1,.27,-.03); phone.add(cam); phone.position.set(x,3.0,-.6); this.phoneY=3.0;
      const posDot=sph(.05,p.color,{cast:false},10); s.add(posDot); const ring=mesh(new THREE.TorusGeometry(MOTION_CFG.maxRange,.01,6,48),0x6b7c93,{cast:false}); ring.rotation.x=Math.PI/2; ring.position.set(x,3.0,-.6); s.add(ring);
      const tr=new PointTracker(); return {p,mii,phone,posDot,tr,x}; });
    camSet(V3(0,2.6,5.4),V3(0,1.9,-.4)); $('#lab').classList.remove('hidden'); this.phones(); hud('B','');
  },
  phones(){ this.players.forEach(p=>phoneUI(p,{mode:'lab',icon:'🕹️',title:'Controller Lab',sub:'Point at the TV and tap CALIBRATE. Then move: the phone and racket on screen follow you.',btns:[{id:'calib',label:'CALIBRATE',on:1},{id:'recenter',label:'RECENTER',sec:1},{id:'resetpos',label:'RESET POSITION',sec:1},{id:'grip',label:'HOLD (grip test)',hold:1}],rate:3})); },
  update(dt){ this.t+=dt; this.readT+=dt;
    this.units.forEach(u=>{ const c=ctrlOf(u.p); const hand=rigHand(u.mii,c,new THREE.Vector3(.42,-.1,.35)); u.mii.update(dt); u.mii.face(u.p.btn.grip?'determined':'happy');
      // the big phone model shows the raw controller orientation in the game frame (camera looks down -z, so what you see is what you hold)
      u.phone.quaternion.copy(c.q); u.phone.position.set(u.x+c.pos.x,3.0+c.pos.y,-.6+c.pos.z); u.posDot.position.set(u.x+c.pos.x,3.0+c.pos.y-.5,-.6+c.pos.z);
      u.tr.update(u.mii.toolG,new THREE.Vector3(0,0,.5),dt); });
    if(this.readT>.1){ this.readT=0; this.readout(); }
  },
  readout(){ const d=x=>(x>=0?' ':'')+x.toFixed(2); const deg=r=>((r*180/Math.PI)>=0?' ':'')+(r*180/Math.PI).toFixed(0)+'°';
    $('#lab').innerHTML=this.units.map(u=>{ const c=ctrlOf(u.p); const q=c.q; const on=c.live; return `<div><b>${esc(u.p.name)}</b> ${on?'<span class="ok">TRACKING</span>':'<span class="bad">NO DATA</span>'} ${c.touch?'(touch mode)':''}
pitch ${deg(c.pitch)}  yaw ${deg(c.yaw)}  roll ${deg(c.roll)}
quat  ${d(q.x)} ${d(q.y)} ${d(q.z)} ${d(q.w)}
angVel ${d(c.w.x)} ${d(c.w.y)} ${d(c.w.z)} rad/s  |${c.angSpeed.toFixed(2)}|
accel  ${d(c.a.x)} ${d(c.a.y)} ${d(c.a.z)} m/s²
vel~   ${d(c.v.x)} ${d(c.v.y)} ${d(c.v.z)} m/s   (estimate)
pos~   ${d(c.pos.x)} ${d(c.pos.y)} ${d(c.pos.z)} m   (estimate, bounded ${MOTION_CFG.maxRange} m)
racket head speed ${u.tr.speed.toFixed(2)} m/s
sensor ${c.rateOri} ori/s ${c.rateMot} motion/s   net ${c.rateNet.toFixed(0)} pkt/s   gap ${(c.gap*1000).toFixed(0)} ms
latency ~${(u.p.rtt*1000).toFixed(0)} ms rtt   age ${(c.age*1000).toFixed(0)} ms
${c.stationary?'<span class="ok">STATIONARY</span>':'MOVING'}   ${c.calibrated?'<span class="ok">CALIBRATED</span>':'<span class="bad">NOT CALIBRATED</span>'}   quality ${(c.quality*100).toFixed(0)}%   grip ${u.p.btn.grip?'ON':'off'}</div>`; }).join('<hr style="border:0;border-top:1px solid #3a4a60;margin:6px 0">')||'<b>No phones connected.</b> Join from a phone and come back.'; },
  onBtn(p,id,down){ if(id==='resetpos'&&down){ const c=ctrlOf(p); c.pos.set(0,0,0); c.posT.set(0,0,0); send(p,{t:'resetpos'}); } },
  onJoin(p){ /* rebuilt on next start */ },
  onKey(k){},
  dispose(){ $('#lab').classList.add('hidden'); }
};
