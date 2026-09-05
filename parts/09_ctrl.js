/* =====================================================================
   PHONE CONTROLLER
   Pipeline:  sensors -> MotionInput (MI: orientation quaternion, angular velocity, linear
   acceleration, bounded velocity/position estimate, stationary detection, calibration)
   -> compact 'm' packets at MOTION_CFG.sendHz -> host RemoteCtrl.
   Swing gestures (s0/s1) are still emitted as a SECONDARY event stream.
   ===================================================================== */
const C={state:'join',peer:null,conn:null,code:'',name:'',tok:'',sens:1,touch:false,motionSeen:false,ui:null,lastO:0,rate:5,orient:{a:0,b:0,g:0},connected:false,hist:[],sw:null,lastSwing:0,retryT:null};
function cStatus(t){ $('#cStatus').textContent=t; }
function csend(m){ if(C.conn&&C.conn.open){ try{C.conn.send(m);}catch(e){} } }
function ctrlInit(){
  $('#host').classList.add('hidden'); $('#ctrl').classList.remove('hidden');
  C.name=localStorage.getItem('ps_name')||''; $('#cName').value=C.name;
  const j=(params.get('join')||localStorage.getItem('ps_code')||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4); $('#cCode').value=j;
  C.tok=sessionStorage.getItem('ps_tok')||('t'+Math.random().toString(36).slice(2,10)); sessionStorage.setItem('ps_tok',C.tok);
  C.sens=parseFloat(localStorage.getItem('ps_sens')||'1'); sensLabel();
  $('#cJoinBtn').onclick=ctrlJoin; $('#cCode').addEventListener('keydown',e=>{ if(e.key==='Enter')ctrlJoin(); });
  $('#cSens').onclick=()=>{ C.sens=C.sens===1?1.4:C.sens===1.4?.7:1; localStorage.setItem('ps_sens',C.sens); sensLabel(); };
  $('#cTouch').onclick=()=>setTouch(!C.touch);
  $('#cMenu').onclick=()=>{ csend({t:'b',id:'menu',d:1}); csend({t:'b',id:'menu',d:0}); try{navigator.vibrate&&navigator.vibrate(15);}catch(e){} };
  $('#cRecenter').onclick=()=>{ miCalibrate(); try{navigator.vibrate&&navigator.vibrate(20);}catch(e){} };
  $('#cCalBtn').onclick=()=>{ miCalibrate(); $('#cCal').classList.add('hidden'); };
  $('#cCalSkip').onclick=()=>{ $('#cCal').classList.add('hidden'); };
  document.addEventListener('touchmove',e=>{ if(C.state!=='join')e.preventDefault(); },{passive:false});
  document.addEventListener('gesturestart',e=>e.preventDefault());
  window.addEventListener('devicemotion',miOnMotion); window.addEventListener('deviceorientation',miOnOrientation);
  setInterval(miSend,1000/MOTION_CFG.sendHz); setInterval(miRates,1000);
  if(params.get('join')&&C.name)cStatus('Tap JOIN to connect to room '+j);
}
function sensLabel(){ $('#cSensTxt').textContent='Sensitivity: '+(C.sens===1?'normal':C.sens>1?'high (small swings)':'low (big swings)'); }
function setTouch(on){ C.touch=on; $('#cSwipe').classList.toggle('on',on); $('#cTouch').classList.toggle('on',on); $('#cMotion').textContent=on?'TOUCH MODE: drag to aim, flick to swing':(MI.hasOri?'MOTION OK':'MOTION'); if(on)$('#cCal').classList.add('hidden'); }
async function motionPermission(){
  try{ if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){ const r=await DeviceMotionEvent.requestPermission(); if(r!=='granted')C.denied=true; }
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){ const r2=await DeviceOrientationEvent.requestPermission(); if(r2!=='granted')C.denied=true; } }catch(e){ C.denied=true; }
}
async function ctrlJoin(){
  const name=$('#cName').value.trim().slice(0,12)||'Player'; const code=$('#cCode').value.toUpperCase().replace(/[^A-Z]/g,'');
  if(code.length!==4){ cStatus('Enter the 4-letter room code shown on the TV.'); return; }
  C.name=name; C.code=code; localStorage.setItem('ps_name',name); localStorage.setItem('ps_code',code);
  cStatus('Asking for motion access...'); await motionPermission();
  if(C.denied)cStatus('Motion access was denied. You can still play in touch mode, or reload and allow motion.');
  if(location.protocol==='http:'&&!/^(localhost|127\.)/.test(location.hostname)){ cStatus('Note: motion sensors need https. Use the https address from the TV screen.'); }
  cStatus('Connecting to room '+code+'...'); ctrlConnect();
  try{ C.wl=await navigator.wakeLock.request('screen'); }catch(e){}
}
function ctrlConnect(){
  clearTimeout(C.retryT); C.connected=false;
  const go=()=>{ let conn; try{ conn=C.peer.connect(PREFIX+C.code,{serialization:'json'}); }catch(e){ return scheduleRetry(); } C.conn=conn;
    conn.on('open',()=>{ C.connected=true; conn.send({t:'hi',name:C.name,tok:C.tok,v:2}); cStatus('Joined!'); $('#cLink').classList.remove('off'); });
    conn.on('data',onHostMsg); conn.on('close',()=>onLost()); conn.on('error',()=>onLost());
    setTimeout(()=>{ if(!C.connected&&C.conn===conn){ cStatus('Still connecting... make sure the TV shows the lobby with code '+C.code+'.'); if(C.state==='join')scheduleRetry(); } },9000); };
  if(C.peer&&!C.peer.destroyed&&C.peer.open){ go(); return; }
  if(C.peer){ try{C.peer.destroy();}catch(e){} }
  const peer=new Peer(undefined,PEER_OPTS); C.peer=peer;
  peer.on('open',go);
  peer.on('error',e=>{ if(e.type==='peer-unavailable'){ cStatus('Room '+C.code+' not found. Check the code on the TV.'); scheduleRetry(6000); } else if(e.type==='network'||e.type==='server-error'||e.type==='socket-error'){ cStatus('Network problem ('+e.type+'). Retrying...'); scheduleRetry(); } });
  peer.on('disconnected',()=>{ try{peer.reconnect();}catch(e){} });
}
function scheduleRetry(ms=3000){ clearTimeout(C.retryT); C.retryT=setTimeout(()=>{ if(!C.connected)ctrlConnect(); },ms); }
function onLost(){ if(!C.connected&&C.state!=='pad')return; C.connected=false; $('#cLink').classList.add('off'); if(C.state==='pad'){ $('#cTitle').textContent='Reconnecting...'; $('#cSub').textContent='Lost the connection to the TV. Trying again.'; } scheduleRetry(2000); }
function onHostMsg(m){
  if(!m||typeof m!=='object')return;
  switch(m.t){
    case 'hello': C.state='pad'; C.slot=m.slot; $('#cJoin').classList.add('hidden'); $('#cPad').classList.remove('hidden'); $('#cHead .dot').style.setProperty('--c',m.color); $('#cHeadName').textContent=m.name+' · '+m.cname; $('#cHeadCode').textContent=m.code;
      setTimeout(()=>{ if(!MI.hasOri&&!C.touch){ $('#cMotion').textContent='NO MOTION SENSORS - touch mode on'; $('#cMotion').classList.add('bad'); setTouch(true); } else if(!C.touch&&!MI.calibrated){ $('#cCal').classList.remove('hidden'); } },2500); break;
    case 'ui': applyUI(m); break;
    case 'msg': if(m.title!=null)$('#cTitle').textContent=m.title; if(m.sub!=null)$('#cSub').textContent=m.sub; break;
    case 'buzz': try{ navigator.vibrate&&navigator.vibrate(m.ms||80); }catch(e){} flash(); break;
    case 'ping': csend({t:'pong',hs:m.hs}); break;
    case 'cal': miCalibrate(); break;
    case 'resetpos': miResetPos(); break;
    case 'full': cStatus('That room already has 4 players.'); C.state='join'; break;
  }
}
function flash(){ const f=$('#cFlash'); f.style.opacity=.6; setTimeout(()=>f.style.opacity=0,60); }
function pop(txt){ const p=$('#cPop'); if(txt)p.textContent=txt; p.classList.add('on'); clearTimeout(p._t); p._t=setTimeout(()=>{ p.classList.remove('on'); p.textContent='SWING!'; },260); }
function applyUI(cfg){
  C.ui=cfg; C.mode=cfg.mode||''; C.rate=cfg.rate||5; const A=window.PS_ART||{}; if(cfg.art&&A[cfg.art])$('#cIcon').innerHTML='<img src="'+A[cfg.art]+'" alt="">'; else $('#cIcon').textContent=cfg.icon||'🎮'; $('#cTitle').textContent=cfg.title||''; $('#cSub').innerHTML=cfg.sub||'';
  const b=$('#cBtns'); b.innerHTML=''; (cfg.btns||[]).forEach(bt=>{ const d=document.createElement('div'); d.className='cbtn'+(bt.hold?' hold':'')+(bt.sec?' sec':'')+(bt.on?' on':''); d.textContent=bt.label; d.style.zIndex=2; d.style.position='relative';
    const down=e=>{ e.preventDefault(); if(d.classList.contains('down'))return; d.classList.add('down'); try{d.setPointerCapture(e.pointerId);}catch(x){} if(bt.id==='calib'||bt.id==='recenter'){ miCalibrate(); } if(bt.id==='resetpos')miResetPos(); csend({t:'b',id:bt.id,d:1}); try{navigator.vibrate&&navigator.vibrate(15);}catch(x){} };
    const up=e=>{ if(!d.classList.contains('down'))return; d.classList.remove('down'); const st=recentStats(); csend(Object.assign({t:'b',id:bt.id,d:0},st)); };
    d.addEventListener('pointerdown',down); d.addEventListener('pointerup',up); d.addEventListener('pointercancel',up); d.addEventListener('lostpointercapture',up); b.appendChild(d); });
}
function recentStats(){ const t=performance.now(); let p=0,rg=0,sx=0,sy=0,sz=0; C.hist.forEach(h=>{ if(t-h.t<400){ if(h.mag>p)p=h.mag; if(Math.abs(h.rg)>Math.abs(rg))rg=h.rg; sx+=h.ax*h.mag; sy+=h.ay*h.mag; sz+=h.az*h.mag; } }); const n=Math.hypot(sx,sy,sz)||1; return {p:Math.round(p*10)/10,rg:Math.round(rg),dx:sx/n,dy:sy/n,dz:sz/n}; }

/* =========================== MOTION INPUT (MI) ===========================
   Frames: device frame = x right, y up the screen (top of the phone), z out of the screen.
   Controller/game frame = x right, y up, z toward the player (so "forward" = -z).
   qRaw maps device -> world (y up, -z = magnetic/initial north). yawFix removes the heading
   measured at calibration so "forward" = the direction the phone pointed at when calibrated.
   Pitch/roll are gravity-true (a flat phone always means a level controller); only yaw is relative.
*/
const MI={qRaw:new THREE.Quaternion(),q:new THREE.Quaternion(),yawFix:new THREE.Quaternion(),hasOri:false,hasMot:false,oriN:0,motN:0,rateOri:0,rateMot:0,
  w:new THREE.Vector3(),a:new THREE.Vector3(),v:new THREE.Vector3(),p:new THREE.Vector3(),stationary:true,stillT:0,sign:0,signAcc:0,lastMotT:0,calibrated:false,calT:0,
  touchYaw:0,touchPitch:0,touchRoll:0,gravDev:new THREE.Vector3(0,0,9.81),ts:0};
const _e=new THREE.Euler(), _q0=new THREE.Quaternion(), _q1=new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5)), _zee=new THREE.Vector3(0,0,1), _v=new THREE.Vector3(), _v2=new THREE.Vector3();
function screenAngle(){ const o=screen.orientation&&screen.orientation.angle!=null?screen.orientation.angle:(window.orientation||0); return o*Math.PI/180; }
// W3C deviceorientation (alpha about z, beta about x, gamma about y; ZXY intrinsic) -> quaternion, y-up world
function oriToQuat(out,alpha,beta,gamma,orient){ _e.set(beta,alpha,-gamma,'YXZ'); out.setFromEuler(_e); out.multiply(_q1); out.multiply(_q0.setFromAxisAngle(_zee,-orient)); return out; }
function miOnOrientation(e){
  if(e.beta==null||e.gamma==null)return; if(C.touch)return;
  const a=(e.alpha||0)*Math.PI/180,b=e.beta*Math.PI/180,g=e.gamma*Math.PI/180;
  oriToQuat(MI.qRaw,a,b,g,screenAngle()); MI.q.copy(MI.yawFix).multiply(MI.qRaw); MI.hasOri=true; MI.oriN++; MI.ts=performance.now();
  C.orient={a:e.alpha||0,b:e.beta,g:e.gamma};
  if(!C.motionSeen){ C.motionSeen=true; $('#cMotion').textContent='MOTION OK'; $('#cMotion').classList.remove('bad'); csend({t:'motion',ok:1,ori:1}); }
}
// yaw-only calibration: the direction the phone points at (top edge, or the back of the screen when held upright) becomes "forward"
function miCalibrate(){
  if(C.touch){ MI.touchYaw=0; MI.touchPitch=0; MI.touchRoll=0; miResetPos(); MI.calibrated=true; csend({t:'cal',ok:1}); pop('CENTERED'); return; }
  if(!MI.hasOri){ pop('NO SENSOR'); return; }
  _v.set(0,1,0).applyQuaternion(MI.qRaw); // phone top axis in world
  if(Math.hypot(_v.x,_v.z)<.35){ _v.set(0,0,-1).applyQuaternion(MI.qRaw); } // held upright: use the direction the back of the phone faces
  const yaw=Math.atan2(_v.x,-_v.z); MI.yawFix.setFromAxisAngle(new THREE.Vector3(0,1,0),-yaw); MI.q.copy(MI.yawFix).multiply(MI.qRaw);
  MI.calibrated=true; MI.calT=performance.now(); miResetPos(); csend({t:'cal',ok:1}); pop('CENTERED'); flash();
}
function miResetPos(){ MI.v.set(0,0,0); MI.p.set(0,0,0); }
function miRates(){ MI.rateOri=MI.oriN; MI.rateMot=MI.motN; MI.oriN=0; MI.motN=0; }
function miOnMotion(e){
  const t=performance.now(); const dt=MI.lastMotT?clamp((t-MI.lastMotT)/1000,.004,.06):.016; MI.lastMotT=t; MI.motN++; MI.hasMot=true;
  const K=MOTION_CFG; const rr=e.rotationRate||{}; const a=e.acceleration, ag=e.accelerationIncludingGravity;
  // angular velocity: device frame (beta about x, gamma about y, alpha about z) -> game frame
  const wd=_v.set((rr.beta||0),(rr.gamma||0),(rr.alpha||0)).multiplyScalar(Math.PI/180); if(!isFinite(wd.x))wd.set(0,0,0);
  MI.w.copy(wd).applyQuaternion(MI.q);
  // linear acceleration in the device frame; detect the sign convention from gravity (iOS reports the opposite sign of the spec)
  let ad=null;
  if(ag&&ag.x!=null&&isFinite(ag.x)){ _v2.set(0,1,0).applyQuaternion(_q0.copy(MI.qRaw).invert()); const s=(ag.x*_v2.x+ag.y*_v2.y+ag.z*_v2.z)/9.81; if(Math.abs(Math.hypot(ag.x,ag.y,ag.z)-9.81)<1.5){ MI.signAcc=lerp(MI.signAcc,Math.sign(s),.05); MI.sign=MI.signAcc>0?1:MI.signAcc<0?-1:MI.sign; } }
  const sg=MI.sign||1;
  if(a&&a.x!=null&&isFinite(a.x)){ ad=_v2.set(a.x,a.y,a.z).multiplyScalar(sg); }
  else if(ag&&ag.x!=null){ ad=_v2.set(ag.x,ag.y,ag.z).multiplyScalar(sg); const up=new THREE.Vector3(0,1,0).applyQuaternion(_q0.copy(MI.qRaw).invert()); ad.addScaledVector(up,-9.81); }
  if(!ad)return;
  MI.a.copy(ad).applyQuaternion(MI.q); // game frame m/s^2
  if(MI.a.length()<K.accelDeadZone)MI.a.set(0,0,0);
  // stationary detection + zero-velocity update
  const still=MI.a.length()<K.stationaryAccel&&MI.w.length()<K.stationaryRot;
  MI.stillT=still?MI.stillT+dt:0; MI.stationary=MI.stillT>K.stationaryTime;
  if(MI.stationary){ MI.v.multiplyScalar(Math.max(0,1-K.velDecayStill*dt)); }
  else { MI.v.addScaledVector(MI.a,dt*K.accelGain); MI.v.multiplyScalar(Math.max(0,1-K.velDecay*dt)); }
  const vm=MI.v.length(); if(vm>K.maxVel)MI.v.multiplyScalar(K.maxVel/vm);
  MI.p.addScaledVector(MI.v,dt); MI.p.multiplyScalar(Math.max(0,1-K.posSpring*dt)); const pm=MI.p.length(); if(pm>K.maxRange)MI.p.multiplyScalar(K.maxRange/pm);
  // ---- secondary gesture layer (swing events), unchanged protocol ----
  const mag=MI.a.length()*C.sens, rmag=MI.w.length()*180/Math.PI*C.sens; const ax=ad.x,ay=ad.y,az=ad.z;
  C.hist.push({t,mag,ax,ay,az,ra:rr.alpha||0,rb:rr.beta||0,rg:rr.gamma||0}); while(C.hist.length&&t-C.hist[0].t>1000)C.hist.shift();
  $('#cMeter i').style.width=Math.min(100,Math.max(mag/28,MI.v.length()/K.maxVel)*100)+'%';
  if(C.touch)return;
  if(!C.sw){ if((mag>K.swingAccel||rmag>K.swingRot)&&t-C.lastSwing>K.swingCooldown){ const n0=Math.hypot(ax,ay,az)||1; C.sw={t0:t,peak:mag,rpeak:rmag,sx:0,sy:0,sz:0,ra:0,rb:0,rg:0,b:C.orient.b,g:C.orient.g}; csend({t:'s0',ts:t,p:Math.round(Math.max(mag,rmag/28)*10)/10,dx:ax/n0,dy:ay/n0,dz:az/n0,rg:Math.round(rr.gamma||0),b:Math.round(C.orient.b),g:Math.round(C.orient.g)}); pop(); } }
  if(C.sw){ const s=C.sw; s.peak=Math.max(s.peak,mag); s.rpeak=Math.max(s.rpeak,rmag); s.sx+=ax*mag; s.sy+=ay*mag; s.sz+=az*mag; const ra=rr.alpha||0,rb=rr.beta||0,rg=rr.gamma||0; if(Math.abs(ra)>Math.abs(s.ra))s.ra=ra; if(Math.abs(rb)>Math.abs(s.rb))s.rb=rb; if(Math.abs(rg)>Math.abs(s.rg))s.rg=rg;
    if(t-s.t0>=K.swingWindow){ const n=Math.hypot(s.sx,s.sy,s.sz)||1; const p=Math.max(s.peak,s.rpeak/28); csend({t:'s1',ts0:s.t0,ts1:t,p:Math.round(p*10)/10,dx:s.sx/n,dy:s.sy/n,dz:s.sz/n,ra:Math.round(s.ra),rb:Math.round(s.rb),rg:Math.round(s.rg),b:Math.round(s.b),g:Math.round(s.g)}); C.lastSwing=t; C.sw=null; flash(); } }
}
const r2=x=>Math.round(x*100)/100, r3=x=>Math.round(x*1000)/1000, r4=x=>Math.round(x*10000)/10000;
function miSend(){
  if(!C.connected||C.state!=='pad')return; if(!MI.hasOri&&!C.touch)return;
  const q=MI.q, flags=(MI.stationary?1:0)|(MI.calibrated?2:0)|(MI.hasOri?4:0)|(MI.hasMot?8:0)|(C.touch?16:0);
  csend({t:'m',d:[Math.round(performance.now()),r4(q.x),r4(q.y),r4(q.z),r4(q.w),r2(MI.w.x),r2(MI.w.y),r2(MI.w.z),r2(MI.a.x),r2(MI.a.y),r2(MI.a.z),r2(MI.v.x),r2(MI.v.y),r2(MI.v.z),r3(MI.p.x),r3(MI.p.y),r3(MI.p.z),flags,MI.rateOri,MI.rateMot]});
}
/* --- touch fallback: drag on the pad = aim the controller (yaw/pitch), flick = swing --- */
(function(){ const el=$('#cSwipe'); let pts=[]; let down=false; let last=null;
  el.addEventListener('pointerdown',e=>{ down=true; last={x:e.clientX,y:e.clientY,t:performance.now()}; pts=[last]; try{el.setPointerCapture(e.pointerId);}catch(x){} });
  el.addEventListener('pointermove',e=>{ if(!down)return; const t=performance.now(); const dx=e.clientX-last.x, dy=e.clientY-last.y, dt=Math.max(1,t-last.t)/1000; last={x:e.clientX,y:e.clientY,t}; pts.push(last); if(pts.length>40)pts.shift();
    MI.touchYaw=clamp(MI.touchYaw-dx*.35,-120,120); MI.touchPitch=clamp(MI.touchPitch-dy*.35,-90,90); _e.set(MI.touchPitch*Math.PI/180,MI.touchYaw*Math.PI/180,0,'YXZ'); MI.q.setFromEuler(_e); MI.hasOri=true; MI.calibrated=true;
    MI.w.set(-dy*.35*Math.PI/180/dt,-dx*.35*Math.PI/180/dt,0); MI.v.set(dx*.004/dt*.05,-dy*.004/dt*.05,0); MI.v.clampLength(0,MOTION_CFG.maxVel); MI.p.addScaledVector(MI.v,dt); MI.p.clampLength(0,MOTION_CFG.maxRange); MI.stationary=false; MI.stillT=0; MI.ts=t;
    const v=Math.hypot(dx,dy)/Math.max(1,t-(pts[Math.max(0,pts.length-3)].t))*1; $('#cMeter i').style.width=Math.min(100,v/3*100)+'%'; });
  const up=e=>{ if(!down)return; down=false; const t=performance.now(); MI.w.set(0,0,0); MI.stationary=true; let best=0,bi=0; for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i]; const v=Math.hypot(b.x-a.x,b.y-a.y)/Math.max(1,b.t-a.t); if(v>best){best=v;bi=i;} }
    if(best<.45||pts.length<2)return; let i0=bi; while(i0>0&&t-pts[i0].t<160)i0--; const a=pts[Math.max(0,i0)],b=pts[pts.length-1]; const dx=b.x-a.x,dy=-(b.y-a.y); const n=Math.hypot(dx,dy)||1; const p=clamp(best*9,8,42); const ts0=pts[Math.max(0,bi-2)].t;
    csend({t:'s0',ts:ts0,p:Math.round(p*10)/10,dx:dx/n,dy:dy/n,dz:0,rg:Math.round(-dx/n*300),b:0,g:0,touch:1}); pop(); csend({t:'s1',ts0,ts1:t,p:Math.round(p*10)/10,dx:dx/n,dy:dy/n,dz:0,ra:0,rb:0,rg:Math.round(-dx/n*300),b:0,g:0,touch:1}); C.hist.push({t,mag:p,ax:dx/n,ay:dy/n,az:0,ra:0,rb:0,rg:-dx/n*300}); flash(); $('#cMeter i').style.width='0%'; };
  el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
  setInterval(()=>{ if(C.touch&&!down){ MI.v.multiplyScalar(.85); MI.p.multiplyScalar(.9); } },33);
})();
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&C.state==='pad'){ navigator.wakeLock&&navigator.wakeLock.request('screen').then(w=>C.wl=w).catch(()=>{}); if(!C.connected)ctrlConnect(); } });
