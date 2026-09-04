/* ============================== GOLF ============================== */
const HOLES=[
  {par:3,pin:[6,-138],fair:[[0,0],[3,-70],[6,-138]],fw:26,water:[[-32,-82,20]],sand:[[22,-128,7],[-9,-152,6]]},
  {par:4,pin:[-72,-290],fair:[[0,0],[8,-120],[-32,-210],[-72,-290]],fw:28,water:[[42,-162,26]],sand:[[-58,-272,8],[10,-140,7],[-88,-300,6]]},
  {par:5,pin:[92,-420],fair:[[0,0],[-10,-140],[30,-280],[92,-420]],fw:30,water:[[-8,-330,26],[-42,-222,22]],sand:[[80,-402,9],[104,-436,7],[-6,-130,8]]},
];
const CLUBS={driver:{v:69,ph:14,max:230},iron:{v:47.5,ph:22,max:160},wedge:{v:26.6,ph:38,max:70},putter:{v:7.2,ph:0,max:25}};
SPORTS.golf={
  name:'Golf',icon:'⛳',players:'1-4 players',GREEN:11,
  how:['Hold your phone like a golf club with both hands. <b>Tilt</b> it to aim (the line on the ground).','Swing the phone like a club. The club is picked for you: driver, iron, wedge or putter.','Swing gently on the green. A smooth swing flies straight, a wobbly one slices.','Water costs a stroke. 3 holes, lowest total wins.'],
  who:n=>n<=1?'3 holes, beat par':n+' players take turns, 3 holes',
  build(players){
    this.players=players.length?players:[cpuPlayer('CPU','#8899aa')]; this.scores=this.players.map(()=>[]); this.pi=0; this.hi=0; this.t=0; this.stateT=0;
    this.miis=null; this.loadHole(); this.card();
  },
  loadHole(){
    const H=this.H=HOLES[this.hi]; const s=newScene({sky:0x9fdcff,shadow:60,sunX:40,sunY:80,sunZ:30,fogNear:250,fogFar:700});
    s.add(tplane(1600,1600,'tex_grass',0x2f7a3a,10,{tint:0x8fbf88})); skyDome(s,'bg_sky',900); backdrop(s,'bg_hills',{r:640,h:230,len:TAU,center:Math.PI,rep:5,y:80});
    const fw=[]; for(let i=0;i<H.fair.length-1;i++){ const [x1,z1]=H.fair[i],[x2,z2]=H.fair[i+1]; const d=Math.hypot(x2-x1,z2-z1); for(let k=0;k<=d;k+=6){ const x=lerp(x1,x2,k/d),z=lerp(z1,z2,k/d); const c=tdisc(H.fw/2,'tex_grass',0x57b45f,8,{seg:24}); c.position.set(x,.02,z); s.add(c); } }
    const tee=box(8,.15,6,0x63c26a); tee.position.set(0,.05,2); s.add(tee);
    const gr=disc(this.GREEN,0x8fe08a,{seg:48}); gr.position.set(H.pin[0],.035,H.pin[1]); s.add(gr); const fr=ring(this.GREEN,this.GREEN+3,0x6fcc72); fr.position.set(H.pin[0],.03,H.pin[1]); s.add(fr);
    H.water.forEach(([x,z,r])=>{ const w=tdisc(r,'tex_water',0x3aa5e6,12,{seg:32}); w.position.set(x,.04,z); s.add(w); }); H.sand.forEach(([x,z,r])=>{ const b=disc(r,0xe9d59a,{seg:24}); b.position.set(x,.04,z); s.add(b); });
    const cup=disc(.4,0x111111,{}); cup.position.set(H.pin[0],.045,H.pin[1]); s.add(cup); const pole=cyl(.03,.03,2.4,0xffffff); pole.position.set(H.pin[0],1.2,H.pin[1]); s.add(pole); const flag=box(.9,.5,.03,0xff5a5f); flag.position.set(H.pin[0]+.45,2.1,H.pin[1]); s.add(flag);
    // trees
    let seed=this.hi*77+13; const rr=()=>{ seed=(seed*9301+49297)%233280; return seed/233280; };
    for(let i=0;i<70;i++){ const si=Math.floor(rr()*(H.fair.length-1)); const [x1,z1]=H.fair[si],[x2,z2]=H.fair[si+1]; const k=rr(); const cx=lerp(x1,x2,k),cz=lerp(z1,z2,k); const dx=x2-x1,dz=z2-z1,d=Math.hypot(dx,dz); const nx=-dz/d,nz=dx/d; const side=rr()<.5?-1:1; const off=H.fw/2+10+rr()*30; const x=cx+nx*off*side,z=cz+nz*off*side;
      if(Math.hypot(x-H.pin[0],z-H.pin[1])<this.GREEN+8)continue; if(H.water.some(([wx,wz,wr])=>Math.hypot(x-wx,z-wz)<wr+3))continue; const h=5+rr()*5; const tr=cyl(.35,.5,h*.4,0x6b4b2a); tr.position.set(x,h*.2,z); s.add(tr); const c1=mesh(new THREE.ConeGeometry(h*.35,h*.6,9),0x2e8b3d); c1.position.set(x,h*.6,z); s.add(c1); const c2=mesh(new THREE.ConeGeometry(h*.26,h*.5,9),0x36a047); c2.position.set(x,h*.9,z); s.add(c2); }
    if(!ART.bg_sky)[[-80,60,-150],[60,70,-260],[150,55,-90]].forEach(([x,y,z])=>s.add(cloud(x,y,z,5)));
    this.ball={pos:V3(0,.05,0),vel:V3(),state:'rest',last:V3(0,.05,0)}; this.ballM=sph(.11,0xffffff,{phong:true},12); s.add(this.ballM); this.shadow=ballShadow(s);
    this.guide=new THREE.Group(); s.add(this.guide); for(let i=0;i<14;i++){ const d=disc(.22,0xffffff,{m:{transparent:true,opacity:.7},recv:false}); d.position.set(0,.06,-2-i*2.2); this.guide.add(d); }
    this.miis=this.players.map(p=>{ const m=makeMii(p.color,p.name); m.setTool('club'); m.g.visible=false; s.add(m.g); return m; });
    this.strokes=0; this.beginShot(true); $('#minimap').classList.remove('hidden');
  },
  surface(x,z){ const H=this.H; if(H.water.some(([wx,wz,wr])=>Math.hypot(x-wx,z-wz)<wr))return 'water'; if(H.sand.some(([sx,sz,sr])=>Math.hypot(x-sx,z-sz)<sr))return 'sand'; if(Math.hypot(x-H.pin[0],z-H.pin[1])<this.GREEN)return 'green';
    for(let i=0;i<H.fair.length-1;i++){ const [x1,z1]=H.fair[i],[x2,z2]=H.fair[i+1]; const dx=x2-x1,dz=z2-z1,l2=dx*dx+dz*dz; const t=clamp(((x-x1)*dx+(z-z1)*dz)/l2,0,1); if(Math.hypot(x-(x1+dx*t),z-(z1+dz*t))<H.fw/2)return 'fairway'; } return 'rough'; },
  beginShot(first){ const b=this.ball; const H=this.H; b.state='rest'; b.vel.set(0,0,0); b.pos.y=.05; b.last.copy(b.pos); this.state='aim'; this.stateT=0; this.aim=0; this.swung=false; this.yaw0=null;
    const d=Math.hypot(H.pin[0]-b.pos.x,H.pin[1]-b.pos.z); this.surf=this.surface(b.pos.x,b.pos.z); this.club=this.surf==='green'?'putter':this.surf==='sand'?'wedge':d>190?'driver':d>75?'iron':'wedge'; this.dist=d;
    this.dir=V3(H.pin[0]-b.pos.x,0,H.pin[1]-b.pos.z).normalize();
    const p=this.players[this.pi]; this.miis.forEach((m,i)=>{ m.g.visible=i===this.pi; m.anim=null; m.rest=mii=>{ mii.arm('R',-.55,0,.35); mii.arm('L',-.55,0,-.35); mii.body.rotation.y=lerp(mii.body.rotation.y,0,.1); }; });
    if(p.cpu)this.cpuAt=this.t+1.6;
    hud('B',turnBox(p,`Hole ${this.hi+1} · Par ${H.par} · Stroke ${this.strokes+1} · ${Math.round(d)} m · ${this.club.toUpperCase()}${this.surf==='sand'?' (sand)':this.surf==='rough'?' (rough)':''}`)); this.phones(); this.card(); },
  phones(){ this.players.forEach((p,i)=>{ if(p.cpu)return; if(i===this.pi)phoneUI(p,{mode:'golf',icon:'⛳',title:this.club.toUpperCase()+' · '+Math.round(this.dist)+' m',sub:this.club==='putter'?'Turn to aim. Swing gently to putt.':'Turn to aim. Swing the phone like a club.',btns:[{id:'recenter',label:'RE-CENTER AIM',sec:1}],rate:15}); else phoneUI(p,{mode:'wait',icon:'⛳',title:'Waiting',sub:this.players[this.pi].name+' is on hole '+(this.hi+1),btns:[],rate:3}); }); },
  onOrient(p){ if(this.players[this.pi]===p&&this.state==='aim')this.aim=aimFrom(this,p); },
  onBtn(p,id,down){ if(this.players[this.pi]===p&&id==='recenter'&&down){ this.yaw0=null; this.aim=0; } },
  onSwing(p,sw){ if(this.players[this.pi]!==p||this.state!=='aim')return; this.shot(sw.pw,Math.abs(sw.dx)+Math.abs(sw.dz)*.5); },
  shot(pw,wobble){ if(this.swung)return; this.swung=true; const m=this.miis[this.pi]; const self=this; AUD.whoosh();
    m.play('swing',.9,(mii,k)=>{ const bk=k<.45?easeOut(k/.45):1-easeIn((k-.45)/.55)*1.9; mii.arm('R',-.55,0,.35+bk*2.1); mii.arm('L',-.55,0,-.35+bk*2.1); mii.body.rotation.y=bk*.5; if(k>=.45&&self.pendingShot){ self.launch(self.pendingShot); self.pendingShot=null; } });
    const C=CLUBS[this.club]; let f=clamp(pw/1.2,.12,1.15); if(this.surf==='rough')f*=.8; if(this.surf==='sand')f*=.7; const err=(gauss()*2.5+clamp(wobble,0,1)*9*(Math.random()<.5?-1:1))*Math.PI/180; this.pendingShot={f,err,C}; },
  launch(sh){ const b=this.ball; const ang=Math.atan2(this.dir.x,this.dir.z)+this.aim*30*Math.PI/180+sh.err; const v=sh.C.v*sh.f, ph=sh.C.ph*Math.PI/180; b.vel.set(Math.sin(ang)*Math.cos(ph)*v,Math.sin(ph)*v,Math.cos(ang)*Math.cos(ph)*v); b.state=this.club==='putter'?'roll':'fly'; b.pos.y=.05; this.state='flight'; this.stateT=0; this.strokes++; AUD.pop(); const p=this.players[this.pi]; if(!p.cpu)buzz(p,80); this.guide.visible=false; hud('B',''); },
  update(dt){
    this.t+=dt; this.stateT+=dt; const b=this.ball, H=this.H, p=this.players[this.pi];
    const ang=Math.atan2(this.dir.x,this.dir.z)+this.aim*30*Math.PI/180; const ad=V3(Math.sin(ang),0,Math.cos(ang));
    if(this.state==='aim'){ this.guide.visible=true; this.guide.position.copy(b.pos); this.guide.rotation.y=ang+Math.PI; this.guide.scale.setScalar(this.club==='putter'?.25:1);
      const m=this.miis[this.pi]; m.g.position.set(b.pos.x-ad.z*.75,0,b.pos.z+ad.x*.75); m.g.rotation.y=ang+Math.PI/2;
      if(p.cpu&&this.t>this.cpuAt){ this.aim=gauss()*.1; const C=CLUBS[this.club]; const want=this.club==='putter'?Math.sqrt(2*1.0*this.dist)/C.v:Math.min(1,this.dist/C.max); this.shot(clamp(want*1.2+gauss()*.05,.15,1.4),.1); }
      const back=this.club==='putter'?4:7, up=this.club==='putter'?1.6:2.6; camLerp(V3(b.pos.x-ad.x*back,up,b.pos.z-ad.z*back),V3(b.pos.x+ad.x*30,1,b.pos.z+ad.z*30),.08); }
    else if(this.state==='flight'){ this.physics(dt); if(b.state==='rest'&&this.state==='flight'){ this.state='done'; this.stateT=0; }
      const dir=V3(b.vel.x,0,b.vel.z); if(dir.length()>.5)dir.normalize(); else dir.copy(ad); const back=b.state==='fly'?14:6, up=b.state==='fly'?6+b.pos.y*.4:2.2; camLerp(V3(b.pos.x-dir.x*back,up,b.pos.z-dir.z*back),b.pos.clone(),b.state==='fly'?.1:.06); }
    else if(this.state==='done'){ if(this.stateT>1.8)this.afterShot(); }
    else if(this.state==='holed'){ if(this.stateT>2.4)this.nextPlayer(); }
    this.ballM.position.copy(b.pos); this.ballM.visible=!(this.state==='holed'); placeShadow(this.shadow,b.pos,.8);
    this.miis.forEach(m=>m.update(dt)); this.drawMap();
  },
  physics(dt){ const b=this.ball, H=this.H; const STEP=1/120; let n=Math.ceil(dt/STEP), h=dt/n;
    for(let i=0;i<n;i++){ if(b.state==='fly'){ b.vel.y-=9.8*h; b.vel.multiplyScalar(1-.004*h); b.pos.addScaledVector(b.vel,h); if(b.pos.y<=.05){ b.pos.y=.05; const sf=this.surface(b.pos.x,b.pos.z); if(sf==='water'){ this.splash(); return; } b.vel.y*=-.35; b.vel.x*=sf==='sand'?.2:.6; b.vel.z*=sf==='sand'?.2:.6; AUD.thud(); if(b.vel.y<1.2){ b.vel.y=0; b.state='roll'; } else b.state='fly'; } }
      else if(b.state==='roll'){ const sf=this.surface(b.pos.x,b.pos.z); if(sf==='water'){ this.splash(); return; } const dec={green:1.0,fairway:2.6,rough:5.5,sand:10}[sf]||3; const sp=Math.hypot(b.vel.x,b.vel.z); const ns=Math.max(0,sp-dec*h); if(sp>0){ b.vel.x*=ns/sp; b.vel.z*=ns/sp; } b.pos.addScaledVector(b.vel,h); b.pos.y=.05;
        const dh=Math.hypot(b.pos.x-H.pin[0],b.pos.z-H.pin[1]); if(dh<.45&&ns<3.5){ this.holed(); return; } if(ns<.05){ b.vel.set(0,0,0); b.state='rest'; return; } if(Math.abs(b.pos.x)>600||Math.abs(b.pos.z)>700){ this.splash(true); return; } } } },
  splash(lost){ const b=this.ball; b.state='rest'; b.vel.set(0,0,0); b.pos.copy(b.last); this.strokes++; banner(lost?'OUT OF BOUNDS':'SPLASH!','+1 penalty stroke',1.8,'red'); this.miis[this.pi].face('sad',2.5); AUD.noise(.5,.3,300,3000); this.state='done'; this.stateT=0; },
  holed(){ const b=this.ball; b.state='rest'; b.vel.set(0,0,0); b.pos.set(this.H.pin[0],.05,this.H.pin[1]); this.state='holed'; this.stateT=0; AUD.ding(); const par=this.H.par, s=this.strokes; const names={[-3]:'ALBATROSS!',[-2]:'EAGLE!',[-1]:'BIRDIE!',0:'PAR',1:'BOGEY',2:'DOUBLE BOGEY'}; const t=s===1?'HOLE IN ONE!':(names[s-par]||('+'+(s-par))); banner(t,this.players[this.pi].name+' · '+s+' strokes',2.2,s-par<0?'gold':''); if(s-par<=0){ AUD.cheer(); this.miis[this.pi].face('cheer',3); } const p=this.players[this.pi]; if(!p.cpu)buzz(p,300); this.scores[this.pi][this.hi]=s; this.card(); },
  afterShot(){ const H=this.H; if(this.strokes>=H.par+5){ banner('PICK UP','max strokes',1.6); this.scores[this.pi][this.hi]=H.par+5; this.card(); this.state='holed'; this.stateT=1; return; } this.beginShot(); },
  nextPlayer(){ this.pi++; if(this.pi>=this.players.length){ this.pi=0; this.hi++; if(this.hi>=HOLES.length){ this.finish(); return; } this.loadHole(); return; } this.strokes=0; const b=this.ball; b.pos.set(0,.05,0); b.last.copy(b.pos); this.beginShot(true); },
  card(){ const el=$('#golfcard'); el.classList.remove('hidden'); let h='<table><tr><th></th>'+HOLES.map((H,i)=>`<th>H${i+1}<br><small>par ${H.par}</small></th>`).join('')+'<th>Total</th></tr>';
    this.players.forEach((p,i)=>{ const sc=this.scores[i]; const tot=sc.reduce((a,b)=>a+(b||0),0); const parSoFar=HOLES.slice(0,sc.length).reduce((a,H)=>a+H.par,0); const rel=tot-parSoFar; h+=`<tr class="${i===this.pi?'cur':''}"><td class="nm" style="--c:${p.color}">${esc(p.name)}</td>`+HOLES.map((H,k)=>`<td>${sc[k]!=null?sc[k]:(k===this.hi&&i===this.pi?'<b>'+this.strokes+'</b>':'')}</td>`).join('')+`<td><b>${tot}</b> <small>${sc.length?(rel>0?'+'+rel:rel===0?'E':rel):''}</small></td></tr>`; });
    el.innerHTML=h+'</table>'; },
  drawMap(){ const c=$('#minimap'); const x=c.getContext('2d'); const H=this.H; const W=c.width; x.clearRect(0,0,W,W);
    const pts=[...H.fair,...H.water.map(w=>[w[0],w[1]]),...H.sand.map(s=>[s[0],s[1]])]; let minx=Infinity,maxx=-Infinity,minz=Infinity,maxz=-Infinity; pts.forEach(([px,pz])=>{ minx=Math.min(minx,px-40);maxx=Math.max(maxx,px+40);minz=Math.min(minz,pz-30);maxz=Math.max(maxz,pz+30); });
    const sc=Math.min(W/(maxx-minx),W/(maxz-minz)); const ox=(W-(maxx-minx)*sc)/2, oz=(W-(maxz-minz)*sc)/2; const T=(px,pz)=>[ox+(px-minx)*sc,W-(oz+(pz-minz)*sc)];
    x.fillStyle='#2f7a3a'; x.beginPath(); x.roundRect?x.roundRect(0,0,W,W,18):x.rect(0,0,W,W); x.fill();
    x.strokeStyle='#57b45f'; x.lineWidth=H.fw*sc; x.lineCap='round'; x.lineJoin='round'; x.beginPath(); H.fair.forEach(([px,pz],i)=>{ const [a,b]=T(px,pz); i?x.lineTo(a,b):x.moveTo(a,b); }); x.stroke();
    H.water.forEach(([wx,wz,r])=>{ const [a,b]=T(wx,wz); x.fillStyle='#3aa5e6'; x.beginPath(); x.arc(a,b,r*sc,0,TAU); x.fill(); }); H.sand.forEach(([sx,sz,r])=>{ const [a,b]=T(sx,sz); x.fillStyle='#e9d59a'; x.beginPath(); x.arc(a,b,r*sc,0,TAU); x.fill(); });
    { const [a,b]=T(H.pin[0],H.pin[1]); x.fillStyle='#8fe08a'; x.beginPath(); x.arc(a,b,this.GREEN*sc,0,TAU); x.fill(); x.fillStyle='#ff5a5f'; x.fillRect(a-1,b-10,2,10); x.fillRect(a,b-10,7,4); }
    const b=this.ball; const [a,bb]=T(b.pos.x,b.pos.z); x.fillStyle='#fff'; x.strokeStyle=this.players[this.pi].color; x.lineWidth=3; x.beginPath(); x.arc(a,bb,5,0,TAU); x.fill(); x.stroke(); },
  finish(){ const par=HOLES.reduce((a,H)=>a+H.par,0); const rows=this.players.map((p,i)=>({p:p.cpu?null:p,name:p.name,color:p.color,val:this.scores[i].reduce((a,b)=>a+(b||0),0)})).sort((a,b)=>a.val-b.val).map(r=>Object.assign(r,{score:r.val+' ('+(r.val-par>0?'+':'')+(r.val-par===0?'E':r.val-par)+')'})); endSport(rows,'Golf'); },
  onKey(k){ if(TEST){ if(k===' ')this.shot(1,0); if(k==='a')this.aim=clamp(this.aim-.2,-1,1); if(k==='d')this.aim=clamp(this.aim+.2,-1,1); } },
  dispose(){ $('#golfcard').classList.add('hidden'); $('#minimap').classList.add('hidden'); }
};
