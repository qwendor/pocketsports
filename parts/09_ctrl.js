/* =====================================================================
   PHONE CONTROLLER
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
  document.addEventListener('touchmove',e=>{ if(C.state!=='join')e.preventDefault(); },{passive:false});
  document.addEventListener('gesturestart',e=>e.preventDefault());
  window.addEventListener('devicemotion',onMotion); window.addEventListener('deviceorientation',onOrient);
  if(params.get('join')&&C.name)cStatus('Tap JOIN to connect to room '+j);
}
function sensLabel(){ $('#cSensTxt').textContent='Sensitivity: '+(C.sens===1?'normal':C.sens>1?'high (small swings)':'low (big swings)'); }
function setTouch(on){ C.touch=on; $('#cSwipe').classList.toggle('on',on); $('#cTouch').classList.toggle('on',on); $('#cMotion').textContent=on?'TOUCH MODE: swipe to swing':(C.motionSeen?'MOTION OK':'MOTION'); }
async function motionPermission(){
  try{ if(typeof DeviceMotionEvent!=='undefined'&&typeof DeviceMotionEvent.requestPermission==='function'){ const r=await DeviceMotionEvent.requestPermission(); if(r!=='granted')C.denied=true; }
    if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){ await DeviceOrientationEvent.requestPermission(); } }catch(e){ C.denied=true; }
}
async function ctrlJoin(){
  const name=$('#cName').value.trim().slice(0,12)||'Player'; const code=$('#cCode').value.toUpperCase().replace(/[^A-Z]/g,'');
  if(code.length!==4){ cStatus('Enter the 4-letter room code shown on the TV.'); return; }
  C.name=name; C.code=code; localStorage.setItem('ps_name',name); localStorage.setItem('ps_code',code);
  cStatus('Asking for motion access...'); await motionPermission();
  if(location.protocol==='http:'&&!/^(localhost|127\.)/.test(location.hostname)){ cStatus('Note: motion sensors need https. Use the https address from the TV screen.'); }
  cStatus('Connecting to room '+code+'...'); ctrlConnect();
  try{ C.wl=await navigator.wakeLock.request('screen'); }catch(e){}
}
function ctrlConnect(){
  clearTimeout(C.retryT); C.connected=false;
  const go=()=>{ let conn; try{ conn=C.peer.connect(PREFIX+C.code,{serialization:'json'}); }catch(e){ return scheduleRetry(); } C.conn=conn;
    conn.on('open',()=>{ C.connected=true; conn.send({t:'hi',name:C.name,tok:C.tok,v:1}); cStatus('Joined!'); $('#cLink').classList.remove('off'); });
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
    case 'hello': C.state='pad'; C.slot=m.slot; $('#cJoin').classList.add('hidden'); $('#cPad').classList.remove('hidden'); $('#cHead .dot').style.setProperty('--c',m.color); $('#cHeadName').textContent=m.name+' · '+m.cname; $('#cHeadCode').textContent=m.code; if(!C.motionSeen&&!C.touch){ setTimeout(()=>{ if(!C.motionSeen&&!C.touch){ $('#cMotion').textContent='NO MOTION SENSORS - touch mode on'; $('#cMotion').classList.add('bad'); setTouch(true); } },3000); } break;
    case 'ui': applyUI(m); break;
    case 'msg': if(m.title!=null)$('#cTitle').textContent=m.title; if(m.sub!=null)$('#cSub').textContent=m.sub; break;
    case 'buzz': try{ navigator.vibrate&&navigator.vibrate(m.ms||80); }catch(e){} flash(); break;
    case 'ping': csend({t:'pong',hs:m.hs}); break;
    case 'full': cStatus('That room already has 4 players.'); C.state='join'; break;
  }
}
function flash(){ const f=$('#cFlash'); f.style.opacity=.6; setTimeout(()=>f.style.opacity=0,60); }
function pop(){ const p=$('#cPop'); p.classList.add('on'); clearTimeout(p._t); p._t=setTimeout(()=>p.classList.remove('on'),260); }
function applyUI(cfg){
  C.ui=cfg; C.mode=cfg.mode||''; C.rate=cfg.rate||5; const A=window.PS_ART||{}; if(cfg.art&&A[cfg.art])$('#cIcon').innerHTML='<img src="'+A[cfg.art]+'" alt="">'; else $('#cIcon').textContent=cfg.icon||'🎮'; $('#cTitle').textContent=cfg.title||''; $('#cSub').innerHTML=cfg.sub||'';
  const b=$('#cBtns'); b.innerHTML=''; (cfg.btns||[]).forEach(bt=>{ const d=document.createElement('div'); d.className='cbtn'+(bt.hold?' hold':'')+(bt.sec?' sec':'')+(bt.on?' on':''); d.textContent=bt.label; d.style.zIndex=2; d.style.position='relative';
    const down=e=>{ e.preventDefault(); if(d.classList.contains('down'))return; d.classList.add('down'); try{d.setPointerCapture(e.pointerId);}catch(x){} csend({t:'b',id:bt.id,d:1}); try{navigator.vibrate&&navigator.vibrate(15);}catch(x){} };
    const up=e=>{ if(!d.classList.contains('down'))return; d.classList.remove('down'); const st=recentStats(); csend(Object.assign({t:'b',id:bt.id,d:0},st)); };
    d.addEventListener('pointerdown',down); d.addEventListener('pointerup',up); d.addEventListener('pointercancel',up); d.addEventListener('lostpointercapture',up); b.appendChild(d); });
}
function recentStats(){ const t=performance.now(); let p=0,rg=0,sx=0,sy=0,sz=0; C.hist.forEach(h=>{ if(t-h.t<400){ if(h.mag>p)p=h.mag; if(Math.abs(h.rg)>Math.abs(rg))rg=h.rg; sx+=h.ax*h.mag; sy+=h.ay*h.mag; sz+=h.az*h.mag; } }); const n=Math.hypot(sx,sy,sz)||1; return {p:Math.round(p*10)/10,rg:Math.round(rg),dx:sx/n,dy:sy/n,dz:sz/n}; }
/* --- motion --- */
const grav={x:0,y:0,z:9.8};
function onMotion(e){
  const t=performance.now(); const a=e.acceleration, ag=e.accelerationIncludingGravity; let ax,ay,az;
  if(a&&a.x!=null){ ax=a.x;ay=a.y;az=a.z; } else if(ag&&ag.x!=null){ grav.x=lerp(grav.x,ag.x,.06); grav.y=lerp(grav.y,ag.y,.06); grav.z=lerp(grav.z,ag.z,.06); ax=ag.x-grav.x; ay=ag.y-grav.y; az=ag.z-grav.z; } else return;
  if(!isFinite(ax))return;
  const rr=e.rotationRate||{}; const ra=rr.alpha||0,rb=rr.beta||0,rg=rr.gamma||0; const mag=Math.hypot(ax,ay,az)*C.sens; const rmag=Math.hypot(ra,rb,rg)*C.sens;
  if(!C.motionSeen){ C.motionSeen=true; if(!C.touch){ $('#cMotion').textContent='MOTION OK'; $('#cMotion').classList.remove('bad'); } csend({t:'motion',ok:1}); }
  C.hist.push({t,mag,ax,ay,az,ra,rb,rg}); while(C.hist.length&&t-C.hist[0].t>1000)C.hist.shift();
  $('#cMeter i').style.width=Math.min(100,mag/28*100)+'%';
  if(C.touch)return;
  if(!C.sw){ if((mag>7.5||rmag>260)&&t-C.lastSwing>300){ const n0=Math.hypot(ax,ay,az)||1; C.sw={t0:t,peak:mag,rpeak:rmag,sx:0,sy:0,sz:0,ra:0,rb:0,rg:0,b:C.orient.b,g:C.orient.g}; csend({t:'s0',ts:t,p:Math.round(Math.max(mag,rmag/28)*10)/10,dx:ax/n0,dy:ay/n0,dz:az/n0,rg:Math.round(rg),b:Math.round(C.orient.b),g:Math.round(C.orient.g)}); pop(); } }
  if(C.sw){ const s=C.sw; s.peak=Math.max(s.peak,mag); s.rpeak=Math.max(s.rpeak,rmag); s.sx+=ax*mag; s.sy+=ay*mag; s.sz+=az*mag; if(Math.abs(ra)>Math.abs(s.ra))s.ra=ra; if(Math.abs(rb)>Math.abs(s.rb))s.rb=rb; if(Math.abs(rg)>Math.abs(s.rg))s.rg=rg;
    if(t-s.t0>=90){ const n=Math.hypot(s.sx,s.sy,s.sz)||1; const p=Math.max(s.peak,s.rpeak/28); csend({t:'s1',ts0:s.t0,ts1:t,p:Math.round(p*10)/10,dx:s.sx/n,dy:s.sy/n,dz:s.sz/n,ra:Math.round(s.ra),rb:Math.round(s.rb),rg:Math.round(s.rg),b:Math.round(s.b),g:Math.round(s.g)}); C.lastSwing=t; C.sw=null; flash(); } }
}
function onOrient(e){ if(e.beta==null)return; C.orient={a:e.alpha||0,b:e.beta||0,g:e.gamma||0}; const t=performance.now(); if(t-C.lastO>1000/C.rate){ C.lastO=t; csend({t:'o',a:Math.round(C.orient.a),b:Math.round(C.orient.b),g:Math.round(C.orient.g)}); } }
/* --- touch (swipe) fallback for phones/desktops without sensors --- */
(function(){ const el=$('#cSwipe'); let pts=[]; let down=false;
  el.addEventListener('pointerdown',e=>{ down=true; pts=[{x:e.clientX,y:e.clientY,t:performance.now()}]; try{el.setPointerCapture(e.pointerId);}catch(x){} });
  el.addEventListener('pointermove',e=>{ if(!down)return; pts.push({x:e.clientX,y:e.clientY,t:performance.now()}); if(pts.length>40)pts.shift(); const n=pts.length; if(n>2){ const a=pts[n-3],b=pts[n-1]; const v=Math.hypot(b.x-a.x,b.y-a.y)/Math.max(1,b.t-a.t); $('#cMeter i').style.width=Math.min(100,v/3*100)+'%'; } });
  const up=e=>{ if(!down)return; down=false; const t=performance.now(); let best=0,bi=0; for(let i=1;i<pts.length;i++){ const a=pts[i-1],b=pts[i]; const v=Math.hypot(b.x-a.x,b.y-a.y)/Math.max(1,b.t-a.t); if(v>best){best=v;bi=i;} }
    if(best<.45||pts.length<2)return; let i0=bi; while(i0>0&&t-pts[i0].t<160)i0--; const a=pts[Math.max(0,i0)],b=pts[pts.length-1]; const dx=b.x-a.x,dy=-(b.y-a.y); const n=Math.hypot(dx,dy)||1; const p=clamp(best*9,8,42); const ts0=pts[Math.max(0,bi-2)].t;
    csend({t:'s0',ts:ts0,p:Math.round(p*10)/10,dx:dx/n,dy:dy/n,dz:0,rg:Math.round(-dx/n*300),b:0,g:0,touch:1}); pop(); csend({t:'s1',ts0,ts1:t,p:Math.round(p*10)/10,dx:dx/n,dy:dy/n,dz:0,ra:0,rb:0,rg:Math.round(-dx/n*300),b:0,g:0,touch:1}); C.hist.push({t,mag:p,ax:dx/n,ay:dy/n,az:0,ra:0,rb:0,rg:-dx/n*300}); flash(); $('#cMeter i').style.width='0%'; };
  el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
})();
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&C.state==='pad'){ navigator.wakeLock&&navigator.wakeLock.request('screen').then(w=>C.wl=w).catch(()=>{}); if(!C.connected)ctrlConnect(); } });
