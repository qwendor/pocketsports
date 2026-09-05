/* =====================================================================
   TEST HOOKS (?test) + BOOT
   ===================================================================== */
if(TEST){
  window.game={G,R,NET,SPORTS,AUD,MOTION_CFG,
    addFake(name){ const tok='fake'+(++G.fakeCount); const conn={open:true,send(){},close(){},inbox:[]}; onCtrlMsg(conn,{t:'hi',name:name||('Bot'+G.fakeCount),tok}); const p=conn._p; p.fake=true; p.inbox=conn.inbox; return p; },
    p(slot){ return G.players.find(x=>x.slot===slot); },
    swing(slot,pw=1,o={}){ const p=this.p(slot); const ts=performance.now(); onCtrlMsg(p.conn,Object.assign({t:'s0',ts,p:pw*20/1.5,dx:0,dy:1,dz:0,rg:0,b:0,g:0},o)); onCtrlMsg(p.conn,Object.assign({t:'s1',ts0:ts,ts1:ts,p:pw*20,dx:0,dy:1,dz:0,ra:0,rb:0,rg:0,b:0,g:0},o)); },
    btn(slot,id,d=1,extra={}){ const p=this.p(slot); onCtrlMsg(p.conn,Object.assign({t:'b',id,d},extra)); },
    orient(slot,b=0,g=0,a=0){ const p=this.p(slot); onCtrlMsg(p.conn,{t:'o',a,b,g}); },
    // synthetic controller state: pitch/yaw/roll in degrees (game frame), w/a/v/p vectors, st = stationary. snap=true copies it straight into the smoothed state.
    motion(slot,o={},snap=true){ const p=this.p(slot); const e=new THREE.Euler((o.pitch||0)*Math.PI/180,(o.yaw||0)*Math.PI/180,(o.roll||0)*Math.PI/180,'YXZ'); const q=new THREE.Quaternion().setFromEuler(e).multiply(new THREE.Quaternion(-Math.sqrt(.5),0,0,Math.sqrt(.5))); const w=o.w||[0,0,0],a=o.a||[0,0,0],v=o.v||[0,0,0],pp=o.p||[0,0,0]; const flags=(o.st?1:0)|2|4|8;
      onCtrlMsg(p.conn,{t:'m',d:[performance.now(),q.x,q.y,q.z,q.w,w[0],w[1],w[2],a[0],a[1],a[2],v[0],v[1],v[2],pp[0],pp[1],pp[2],flags,60,60]}); const c=p.ctrl; if(snap){ c.q.copy(c.qT); c.pos.copy(c.posT); c.v.copy(c.vT); } c.update(1/60); return c; },
    ctrl(slot){ return this.p(slot).ctrl; },
    step(n=1,dt=1/60){ G.manual=true; for(let i=0;i<n;i++)tick(dt); },
    run(){ G.manual=false; G.lastFrame=0; },
    state(){ const s=G.sport; return {state:G.state,sport:G.sportId,sportState:s&&s.state,players:G.players.map(p=>({slot:p.slot,name:p.name,online:p.online,ui:p.lastUI&&p.lastUI.mode,title:p.lastUI&&p.lastUI.title,inbox:p.inbox?p.inbox.length:0})),code:NET.code,open:NET.open}; },
    ui(slot){ const p=this.p(slot); return p.lastUI; },
    last(slot,t){ const p=this.p(slot); const ib=p.inbox||[]; for(let i=ib.length-1;i>=0;i--)if(!t||ib[i].t===t)return ib[i]; return null; },
    start(id){ startSport(id); }, menu:showMenu, lobby:showLobby, host:hostStart, results(){ return $('#rank').innerText; }, banner(){ return $('#banner .t').textContent+' | '+$('#banner .s').textContent; },
  };
}
function boot(){
  if(IS_CTRL){ ctrlInit(); return; }
  initGL(); showScreen('title');
  if(ART.bg_title){ $('#title').classList.add('art'); $('#title').style.backgroundImage='url('+ART.bg_title+')'; } if(ART.logo){ $('#logoImg').src=ART.logo; $('#logoImg').classList.remove('hidden'); $('#logoTxt').classList.add('hidden'); }
  if(location.protocol==='file:')$('#titleNote').textContent='Phones will join through '+PUBLIC_URL.replace(/^https?:\/\//,'')+' (needs internet).';
  if(params.has('host')||params.has('instant'))hostStart();
  if(params.has('instant')&&TEST){ const n=parseInt(params.get('n')||'1'); for(let i=0;i<n;i++)window.game.addFake(); startSport(params.get('sport')||'tennis'); }
  requestAnimationFrame(frame);
}
window.addEventListener('load',()=>{ if(typeof THREE==='undefined'&&!IS_CTRL){ $('#titleNote').textContent='Three.js failed to load. Check the internet connection and reload.'; } boot(); });
</script>
</body>
</html>
