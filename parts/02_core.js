'use strict';
/* =====================================================================
   POCKET SPORTS - one file, two roles.
   HOST  = the TV / laptop screen (3D game, runs all game logic)
   CTRL  = a phone (sends motion swings, tilt and button presses)
   ===================================================================== */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), lerp=(a,b,t)=>a+(b-a)*t, rnd=(a,b)=>a+Math.random()*(b-a), TAU=Math.PI*2;
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v)};
const now=()=>performance.now()/1000;
const params=new URLSearchParams(location.search);
const TEST=params.has('test');
const PREFIX='pocket-sports-';
const COLORS=['#ff5a5f','#2f80ff','#37c95c','#ffc233'];
const CNAMES=['Red','Blue','Green','Yellow'];
const MAXP=4;
// TURN relay (metered.ca, same app as Blastoff) so phones on cellular data can still reach the host.
const TURN_USER='cac99fd1809f691ee619c851', TURN_PASS='BFuUCQ9siM/y87si';
const TURN=[{urls:'stun:stun.relay.metered.ca:80'},
  {urls:'turn:global.relay.metered.ca:80',username:TURN_USER,credential:TURN_PASS},
  {urls:'turn:global.relay.metered.ca:80?transport=tcp',username:TURN_USER,credential:TURN_PASS},
  {urls:'turn:global.relay.metered.ca:443',username:TURN_USER,credential:TURN_PASS},
  {urls:'turns:global.relay.metered.ca:443?transport=tcp',username:TURN_USER,credential:TURN_PASS}];
const PEER_OPTS={debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'},...TURN]}};
const IS_CTRL=params.has('join')||params.has('ctrl')||location.hash==='#ctrl';

/* ---------------- audio (host) ---------------- */
const AUD={ctx:null,
  init(){ if(this.ctx)return; try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} },
  tone(f,d=.12,type='sine',vol=.25,slide=0){ const c=this.ctx; if(!c)return; const o=c.createOscillator(),g=c.createGain(); o.type=type; o.frequency.setValueAtTime(f,c.currentTime); if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),c.currentTime+d); g.gain.setValueAtTime(vol,c.currentTime); g.gain.exponentialRampToValueAtTime(.001,c.currentTime+d); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime+d); },
  noise(d=.2,vol=.2,hp=400,lp=6000){ const c=this.ctx; if(!c)return; const n=c.sampleRate*d,b=c.createBuffer(1,n,c.sampleRate),x=b.getChannelData(0); for(let i=0;i<n;i++)x[i]=(Math.random()*2-1)*(1-i/n); const s=c.createBufferSource(); s.buffer=b; const f1=c.createBiquadFilter(); f1.type='highpass'; f1.frequency.value=hp; const f2=c.createBiquadFilter(); f2.type='lowpass'; f2.frequency.value=lp; const g=c.createGain(); g.gain.value=vol; s.connect(f1).connect(f2).connect(g).connect(c.destination); s.start(); },
  whoosh(){ this.noise(.18,.18,600,3000); },
  pop(){ this.tone(520,.08,'square',.18,-300); this.noise(.05,.15,1500,8000); },
  thud(){ this.tone(140,.1,'sine',.25,-60); },
  crack(){ this.noise(.08,.35,2000,9000); this.tone(900,.06,'square',.15,-500); },
  crash(){ this.noise(.6,.35,300,5000); this.tone(220,.3,'sawtooth',.12,-150); },
  cheer(){ this.noise(1.2,.25,800,4000); setTimeout(()=>this.noise(.8,.18,900,4000),200); },
  ding(){ this.tone(1200,.25,'sine',.2); setTimeout(()=>this.tone(1600,.3,'sine',.15),90); },
  buzz(){ this.tone(110,.3,'sawtooth',.2); },
  punch(){ this.noise(.09,.35,200,2500); this.tone(90,.12,'sine',.35,-40); },
  swish(){ this.noise(.12,.12,1200,5000); },
  fanfare(){ [0,120,240,420].forEach((t,i)=>setTimeout(()=>this.tone([523,659,784,1047][i],.25,'triangle',.22),t)); },
  sad(){ [0,200,400].forEach((t,i)=>setTimeout(()=>this.tone([392,349,294][i],.28,'triangle',.2),t)); },
  tick(){ this.tone(800,.04,'square',.08); },
};

/* ---------------- host game state ---------------- */
const G={state:'title',players:[],sport:null,sportId:null,menuIdx:0,manual:false,fakeCount:0,lastFrame:0};
const NET={peer:null,code:null,open:false};
function genCode(){ const a='ABCDEFGHJKLMNPQRSTUVWXYZ'; let s=''; for(let i=0;i<4;i++)s+=a[Math.floor(Math.random()*a.length)]; return s; }
function toast(t){ const d=document.createElement('div'); d.className='toast'; d.textContent=t; $('#toasts').appendChild(d); setTimeout(()=>d.remove(),3500); }
let bannerT=null;
function banner(t,s='',dur=1.6,cls=''){ const b=$('#banner'); b.className='show '+cls; b.querySelector('.t').textContent=t; b.querySelector('.s').textContent=s; clearTimeout(bannerT); if(dur>0)bannerT=setTimeout(()=>b.classList.remove('show'),dur*1000); }
function hideBanner(){ $('#banner').classList.remove('show'); }

function hostStart(){
  AUD.init();
  if(NET.peer)return showLobby();
  NET.code=params.get('code')||genCode();
  $('#code').textContent=NET.code;
  showLobby();
  $('#joinurl').textContent='Connecting to the network...';
  try{
    const peer=new Peer(PREFIX+NET.code,PEER_OPTS); NET.peer=peer;
    peer.on('open',()=>{ NET.open=true; buildJoinInfo(); });
    peer.on('connection',c=>{ c.on('data',d=>onCtrlMsg(c,d)); c.on('close',()=>onCtrlClose(c)); c.on('error',()=>onCtrlClose(c)); });
    peer.on('error',e=>{ console.warn('peer error',e); if(e.type==='unavailable-id'){ NET.peer=null; NET.code=genCode(); hostStart(); } else if(!NET.open){ $('#joinurl').textContent='Network error ('+e.type+'). Check the internet connection and reload.'; } });
    peer.on('disconnected',()=>{ try{peer.reconnect();}catch(e){} });
  }catch(e){ $('#joinurl').textContent='Could not start networking: '+e.message; }
}
let joinBase=null;
async function buildJoinInfo(){
  // Prefer the LAN address reported by serve.py so the QR works even if this page was opened as localhost.
  let base=location.origin+location.pathname;
  if(location.protocol!=='file:'&&/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(location.hostname)){ try{ const r=await fetch('/ip',{cache:'no-store'}); if(r.ok){ const j=await r.json(); if(j.ips&&j.ips[0]) base='https://'+j.ips[0]+':'+j.https+'/'; } }catch(e){} }
  else { $('#joinurl').textContent='Phones cannot reach a file:// page. Run serve.py and open the https address it prints.'; $('#qr').innerHTML=''; joinBase=null; return; }
  if(/^http:\/\/(localhost|127\.)/.test(base)) base=base.replace(/\/$/,'')+'/';
  joinBase=base;
  const url=base+'?join='+NET.code;
  $('#joinurl').textContent=url.replace(/^https?:\/\//,'');
  const q=$('#qr'); q.innerHTML='';
  try{ new QRCode(q,{text:url,width:520,height:520,correctLevel:QRCode.CorrectLevel.M}); }catch(e){ q.textContent=url; }
}

/* ---------------- players ---------------- */
function mkPlayer(slot,name,conn,tok){
  return {slot,name,color:COLORS[slot],cname:CNAMES[slot],conn,tok,online:true,ready:false,orient:{a:0,b:0,g:0},btn:{},s0:null,owd:.03,rtt:0,lastUI:null,score:0,pingT:0,lastSeen:now(),hasMotion:false};
}
function send(p,m){ if(p&&p.conn&&p.conn.open){ try{p.conn.send(m);}catch(e){} } if(p&&p.fake)p.inbox.push(m); }
function sendAll(m){ G.players.forEach(p=>send(p,m)); }
function phoneUI(p,cfg){ p.lastUI=cfg; send(p,Object.assign({t:'ui'},cfg)); }
function buzz(p,ms=80){ send(p,{t:'buzz',ms}); }
function onCtrlMsg(c,m){
  if(!m||typeof m!=='object')return;
  if(m.t==='hi'){
    let p=G.players.find(x=>x.tok===m.tok);
    if(p){ if(p.conn&&p.conn!==c&&p.conn.open){try{p.conn.close();}catch(e){}} p.conn=c; p.online=true; p.name=m.name||p.name; toast(p.name+' reconnected'); }
    else{
      if(G.players.length>=MAXP){ try{c.send({t:'full'});}catch(e){} return; }
      const slot=[0,1,2,3].find(s=>!G.players.some(x=>x.slot===s));
      p=mkPlayer(slot,(m.name||'Player').slice(0,12),c,m.tok); G.players.push(p); G.players.sort((a,b)=>a.slot-b.slot);
      toast(p.name+' joined as '+p.cname); AUD.ding();
      if(G.sport&&G.sport.onJoin)G.sport.onJoin(p);
    }
    c._p=p; p.lastSeen=now();
    send(p,{t:'hello',slot:p.slot,color:p.color,cname:p.cname,name:p.name,code:NET.code});
    refreshPhones(); renderLobby(); return;
  }
  const p=c._p||(c.fakeP); if(!p)return; p.lastSeen=now();
  switch(m.t){
    case 's0': p.s0={ts:m.ts,hostT:now()-(G.manual?0:p.owd)}; p.hasMotion=true; if(G.sport&&G.sport.onSwingStart)G.sport.onSwingStart(p); break;
    case 's1': { let start; if(p.s0&&p.s0.ts===m.ts0)start=p.s0.hostT; else start=now()-(m.ts1-m.ts0)/1000-(G.manual?0:p.owd); p.s0=null; p.hasMotion=true;
      const sw={start,age:now()-start,raw:m.p||0,pw:clamp((m.p||0)/20,.3,1.6),dx:m.dx||0,dy:m.dy||0,dz:m.dz||0,ra:m.ra||0,rb:m.rb||0,rg:m.rg||0,b:m.b||0,g:m.g||0,touch:!!m.touch};
      onSwing(p,sw); break; }
    case 'o': p.orient={a:m.a||0,b:m.b||0,g:m.g||0}; if(G.sport&&G.sport.onOrient)G.sport.onOrient(p); break;
    case 'b': p.btn[m.id]=!!m.d; onBtn(p,m.id,!!m.d,m); break;
    case 'pong': { const r=now()-m.hs; p.rtts=(p.rtts||[]).concat([r]).slice(-6); p.rtt=Math.min(...p.rtts); p.owd=clamp(p.rtt/2,0,.15); break; }
    case 'motion': p.hasMotion=!!m.ok; renderLobby(); break;
  }
}
function onCtrlClose(c){ const p=c._p; if(!p||p.conn!==c)return; p.online=false; toast(p.name+' disconnected'); renderLobby(); }
function onSwing(p,sw){ if(G.sport&&typeof G.sport.t==='number'){ sw.age=clamp(sw.age,0,.5); sw.start=G.sport.t-sw.age; } if(G.sport&&G.sport.onSwing)G.sport.onSwing(p,sw); }
function onBtn(p,id,down,m){
  if(G.state==='play'&&G.sport){ if(G.sport.onBtn)G.sport.onBtn(p,id,down,m); return; }
  if(!down)return;
  if(G.state==='lobby'){ if(id==='ready'){ p.ready=!p.ready; renderLobby(); refreshPhones(); AUD.tick(); } if(id==='start'&&p.slot===G.players[0].slot)showMenu(); }
  else if(G.state==='menu'){ if(p.slot!==G.players[0].slot)return; if(id==='prev')menuMove(-1); if(id==='next')menuMove(1); if(id==='ok')menuPick(); if(id==='back')showLobby(); }
  else if(G.state==='intro'){ if(p.slot!==G.players[0].slot)return; if(id==='ok')startSport(G.sportId); if(id==='back')showMenu(); }
  else if(G.state==='results'){ if(p.slot!==G.players[0].slot)return; if(id==='ok')startSport(G.sportId); if(id==='back')showMenu(); }
}
// send every phone the UI that matches the current screen
function refreshPhones(){
  G.players.forEach(p=>{
    const first=G.players[0]&&p.slot===G.players[0].slot;
    if(G.state==='lobby')phoneUI(p,{mode:'lobby',icon:'🎮',title:'You are in!',sub:'You are '+p.cname+'. Hold the phone like a remote. Swing it to test the motion meter.',btns:[{id:'ready',label:p.ready?'READY ✓':'READY',on:p.ready},...(first?[{id:'start',label:'CHOOSE SPORT',sec:1}]:[])]});
    else if(G.state==='menu')phoneUI(p,{mode:'menu',icon:'🏟️',title:first?'Pick a sport':'Player 1 is choosing',sub:first?'Use the buttons to pick a sport on the big screen.':'Look at the big screen.',btns:first?[{id:'prev',label:'◀'},{id:'next',label:'▶'},{id:'ok',label:'SELECT',on:1},{id:'back',label:'BACK',sec:1}]:[]});
    else if(G.state==='intro')phoneUI(p,{mode:'menu',icon:SPORTS[G.sportId].icon,title:SPORTS[G.sportId].name,sub:first?'Press START when everyone is ready.':'Read the instructions on the big screen.',btns:first?[{id:'ok',label:'START',on:1},{id:'back',label:'BACK',sec:1}]:[]});
    else if(G.state==='results')phoneUI(p,{mode:'menu',icon:'🏆',title:'Game over',sub:first?'Play again or pick another sport.':'Look at the big screen.',btns:first?[{id:'ok',label:'PLAY AGAIN',on:1},{id:'back',label:'SPORTS',sec:1}]:[]});
  });
}
function renderLobby(){
  const el=$('#plist'); el.innerHTML='';
  for(let s=0;s<MAXP;s++){ const p=G.players.find(x=>x.slot===s); const d=document.createElement('div'); d.className='pslot'+(p?' on':''); d.style.setProperty('--c',COLORS[s]);
    d.innerHTML=p?`<div class="dot">${s+1}</div><div class="nm">${esc(p.name)}</div>${p.online?(p.ready?'<div class="rd">READY</div>':'<div class="rd" style="color:#9aa9bd">JOINED</div>'):'<div class="off">OFFLINE</div>'}`:`<div class="dot">${s+1}</div><div class="nm">Waiting for a phone...</div>`;
    el.appendChild(d); }
  $('#bMenu').disabled=!G.players.length&&!TEST; $('#bMenu').style.opacity=(G.players.length||TEST)?1:.5;
}
function esc(s){ return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
function showScreen(id){ ['title','lobby','menu','intro','results'].forEach(s=>$('#'+s).classList.toggle('hidden',s!==id)); $('#hud').classList.toggle('hidden',id!=='' ); }
function showLobby(){ G.state='lobby'; disposeSport(); showScreen('lobby'); renderLobby(); refreshPhones(); }
function showMenu(){ G.state='menu'; disposeSport(); showScreen('menu'); renderMenu(); refreshPhones(); }
function menuMove(d){ const ids=Object.keys(SPORTS); G.menuIdx=(G.menuIdx+d+ids.length)%ids.length; renderMenu(); AUD.tick(); }
function menuPick(){ const id=Object.keys(SPORTS)[G.menuIdx]; showIntro(id); }
function renderMenu(){ const t=$('#tiles'); const ids=Object.keys(SPORTS); if(!t.children.length){ ids.forEach((id,i)=>{ const s=SPORTS[id]; const d=document.createElement('div'); d.className='tile'; d.innerHTML=`<div class="ic">${s.icon}</div><div class="nm">${s.name}</div><div class="pl">${s.players}</div>`; d.onclick=()=>{G.menuIdx=i;renderMenu();showIntro(id);}; t.appendChild(d); }); }
  [...t.children].forEach((c,i)=>c.classList.toggle('sel',i===G.menuIdx)); }
function showIntro(id){ G.state='intro'; G.sportId=id; const s=SPORTS[id]; showScreen('intro'); $('#introIc').textContent=s.icon; $('#introName').textContent=s.name; $('#introHow').innerHTML=s.how.map(h=>'<li>'+h+'</li>').join(''); $('#introWho').textContent=s.who(G.players.length); refreshPhones(); AUD.tick(); }
function startSport(id){
  G.sportId=id; G.state='play'; hideBanner(); showScreen(''); $('#hud').classList.remove('hidden');
  ['#hudTL','#hudTC','#hudTR','#hudB'].forEach(s=>$(s).innerHTML=''); $('#bowlcard').classList.add('hidden'); $('#golfcard').classList.add('hidden'); $('#minimap').classList.add('hidden'); $('#gauge').classList.add('hidden');
  disposeSport(); const s=SPORTS[id]; G.sport=Object.create(s); G.sport.build(G.players.slice()); AUD.init();
}
function disposeSport(){ if(G.sport){ try{G.sport.dispose&&G.sport.dispose();}catch(e){} G.sport=null; } if(R.scene){ R.scene=null; } hideBanner(); $('#hud').classList.add('hidden'); }
function endSport(rows,title){
  // rows: [{p:player|null,name,color,score:'text',val:number}] sorted best first
  G.state='results'; $('#resTitle').textContent=title||SPORTS[G.sportId].name+' results';
  const r=$('#rank'); r.innerHTML=''; rows.forEach((row,i)=>{ const d=document.createElement('div'); d.className='rrow'+(i===0?' w':''); d.style.setProperty('--c',row.color); d.innerHTML=`<div class="pos">${i===0?'🏆':i+1}</div><div class="dot"></div><div class="nm">${esc(row.name)}</div><div class="sc">${esc(row.score)}</div>`; r.appendChild(d); });
  showScreen('results'); $('#hud').classList.add('hidden'); hideBanner(); refreshPhones(); AUD.fanfare();
  G.players.forEach(p=>{ const me=rows.find(x=>x.p===p); const i=rows.indexOf(me); phoneUI(p,Object.assign(p.lastUI||{},{icon:i===0?'🏆':'🎮',title:i===0?'You win!':(me?'#'+(i+1)+' - '+me.score:'Game over')})); buzz(p,i===0?300:80); });
}
/* keyboard on the host */
window.addEventListener('keydown',e=>{
  if(e.repeat)return; AUD.init();
  const k=e.key;
  if(G.state==='title'){ if(k==='Enter'||k===' ')hostStart(); return; }
  if(G.state==='lobby'){ if(k==='Enter'&&(G.players.length||TEST))showMenu(); if(k==='Escape')showTitle(); return; }
  if(G.state==='menu'){ if(k==='ArrowLeft'||k==='ArrowUp')menuMove(-1); if(k==='ArrowRight'||k==='ArrowDown')menuMove(1); if(k==='Enter')menuPick(); if(k==='Escape')showLobby(); return; }
  if(G.state==='intro'){ if(k==='Enter')startSport(G.sportId); if(k==='Escape')showMenu(); return; }
  if(G.state==='results'){ if(k==='Enter')startSport(G.sportId); if(k==='Escape')showMenu(); return; }
  if(G.state==='play'){ if(k==='Escape'){ showMenu(); return; } if(G.sport&&G.sport.onKey)G.sport.onKey(k,e); }
});
function showTitle(){ G.state='title'; disposeSport(); showScreen('title'); }
$('#bHost').onclick=hostStart; $('#bCtrl').onclick=()=>{ location.href=location.pathname+'?ctrl'; };
$('#bMenu').onclick=()=>{ if(G.players.length||TEST)showMenu(); }; $('#bLobbyBack').onclick=showTitle;
$('#bStart').onclick=()=>startSport(G.sportId); $('#bIntroBack').onclick=showMenu;
$('#bAgain').onclick=()=>startSport(G.sportId); $('#bResMenu').onclick=showMenu;

/* ---------------- main loop ---------------- */
function frame(){ requestAnimationFrame(frame); if(G.manual)return; tick(); }
function tick(dtOverride){
  const t=now(); let dt=dtOverride!=null?dtOverride:(G.lastFrame?t-G.lastFrame:1/60); G.lastFrame=t; dt=clamp(dt,0,.1);
  G.players.forEach(p=>{ if(t-p.pingT>2&&!G.manual){ p.pingT=t; send(p,{t:'ping',hs:t}); } });
  if(G.state==='play'&&G.sport){ G.sport.update(dt); render(); }
  if(TEST){ fpsN++; if(t-fpsT>1){ $('#fps').textContent=fpsN+' fps'; fpsN=0; fpsT=t; } }
}
let fpsN=0,fpsT=0;
setInterval(()=>{ if(!G.manual&&document.hidden&&G.state==='play')tick(.05); },50);
