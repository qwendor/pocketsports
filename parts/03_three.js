/* ---------------- 3D renderer, textures, Mii builder, scene helpers ---------------- */
const ART=window.PS_ART||{};
const R={renderer:null,scene:null,cam:null,sun:null,camPos:new THREE.Vector3(0,5,10),camLook:new THREE.Vector3(),t:0};
function initGL(){
  if(R.renderer)return;
  const r=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); r.setPixelRatio(Math.min(devicePixelRatio,2)); r.shadowMap.enabled=true; r.shadowMap.type=THREE.PCFSoftShadowMap; r.outputEncoding=THREE.sRGBEncoding;
  r.domElement.id='gl'; $('#host').insertBefore(r.domElement,$('#ui')); R.renderer=r;
  R.cam=new THREE.PerspectiveCamera(45,1,.1,2500);
  resize(); window.addEventListener('resize',resize);
}
function resize(){ if(!R.renderer)return; const w=innerWidth,h=innerHeight; R.renderer.setSize(w,h,false); R.cam.aspect=w/h; R.cam.updateProjectionMatrix(); }
function newScene(o={}){
  initGL(); const s=new THREE.Scene(); s.background=new THREE.Color(o.sky||0x8fd3ff); if(o.fog!==false)s.fog=new THREE.Fog(o.sky||0x8fd3ff,o.fogNear||60,o.fogFar||220);
  const hemi=new THREE.HemisphereLight(o.hemiSky||0xcfe9ff,o.hemiGround||0x6a8a4a,o.hemi!=null?o.hemi:.75); s.add(hemi);
  const sun=new THREE.DirectionalLight(0xffffff,o.sun!=null?o.sun:.95); sun.position.set(o.sunX||20,o.sunY||40,o.sunZ||15); sun.castShadow=true; const sz=o.shadow||30; sun.shadow.camera.left=-sz; sun.shadow.camera.right=sz; sun.shadow.camera.top=sz; sun.shadow.camera.bottom=-sz; sun.shadow.camera.near=1; sun.shadow.camera.far=200; sun.shadow.mapSize.set(2048,2048); sun.shadow.bias=-.0008; s.add(sun); s.add(sun.target); R.sun=sun;
  R.scene=s; return s;
}
function render(){ if(!R.scene||!R.renderer)return; R.renderer.render(R.scene,R.cam); }
function camLerp(pos,look,k=.1){ R.camPos.lerp(pos,k); R.camLook.lerp(look,k); R.cam.position.copy(R.camPos); R.cam.lookAt(R.camLook); }
function camSet(pos,look){ R.camPos.copy(pos); R.camLook.copy(look); R.cam.position.copy(pos); R.cam.lookAt(look); }
const V3=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const MAT={}; function mat(c,o={}){ const k=c+'|'+JSON.stringify(o); if(!MAT[k]){ MAT[k]=o.phong?new THREE.MeshPhongMaterial(Object.assign({color:c,shininess:60},o.m||{})):new THREE.MeshLambertMaterial(Object.assign({color:c},o.m||{})); } return MAT[k]; }
function mesh(geo,c,o={}){ const m=new THREE.Mesh(geo,mat(c,o)); m.castShadow=o.cast!==false; m.receiveShadow=o.recv!==false; return m; }
function box(w,h,d,c,o){ return mesh(new THREE.BoxGeometry(w,h,d),c,o); }
function cyl(rt,rb,h,c,seg=16,o){ return mesh(new THREE.CylinderGeometry(rt,rb,h,seg),c,o); }
function sph(r,c,o,seg=16){ return mesh(new THREE.SphereGeometry(r,seg,Math.max(8,seg*.75|0)),c,o); }
function plane(w,h,c,o={}){ const m=mesh(new THREE.PlaneGeometry(w,h),c,Object.assign({cast:false},o)); m.rotation.x=-Math.PI/2; return m; }
function disc(r,c,o={}){ const m=mesh(new THREE.CircleGeometry(r,o.seg||40),c,Object.assign({cast:false},o)); m.rotation.x=-Math.PI/2; return m; }
function ring(ri,ro,c,o={}){ const m=mesh(new THREE.RingGeometry(ri,ro,48),c,Object.assign({cast:false},o)); m.rotation.x=-Math.PI/2; return m; }
function line(w,len,c,x,z,y=.01,rot=0){ const m=plane(w,len,c,{recv:false}); m.position.set(x,y,z); m.rotation.z=rot; return m; }
/* --- generated textures (art.js) --- */
function tex(name,rx=1,ry=1){ if(!ART[name])return null; const t=new THREE.TextureLoader().load(ART[name]); t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rx,ry); t.encoding=THREE.sRGBEncoding; t.anisotropy=8; return t; }
function tplane(w,h,name,color,tile=4,o={}){ const t=tex(name,w/tile,h/tile); const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshLambertMaterial(Object.assign({color:t?(o.tint||0xffffff):color,map:t||null},o.m||{}))); m.rotation.x=-Math.PI/2; m.receiveShadow=true; return m; }
function tdisc(r,name,color,tile=4,o={}){ const t=tex(name,2*r/tile,2*r/tile); const m=new THREE.Mesh(new THREE.CircleGeometry(r,o.seg||40),new THREE.MeshLambertMaterial({color:t?0xffffff:color,map:t||null})); m.rotation.x=-Math.PI/2; m.receiveShadow=true; return m; }
function tbox(w,h,d,name,color,tile=1){ const t=tex(name,w/tile,d/tile); const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshLambertMaterial({color:t?0xffffff:color,map:t||null})); m.receiveShadow=true; return m; }
function skyDome(s,name='bg_sky',r=700){ const t=tex(name,2,1); if(!t)return null; const g=new THREE.SphereGeometry(r,48,24,0,TAU,0,Math.PI*.5); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:t,side:THREE.BackSide,fog:false,depthWrite:false})); m.position.y=-r*.03; m.renderOrder=-10; s.add(m); return m; }
// curved backdrop (crowd, arena wall) around the playing area. center = angle of the middle (PI = behind -z), len = angular width
function backdrop(s,name,o={}){ const r=o.r||60,h=o.h||20,len=o.len||Math.PI,center=o.center!=null?o.center:Math.PI; const t=tex(name,o.rep||2,1); if(!t)return null; const g=new THREE.CylinderGeometry(r,r,h,64,1,true,center-len/2,len); const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide,fog:!!o.fog,transparent:true,depthWrite:false})); m.renderOrder=-5; m.position.set(o.x||0,o.y!=null?o.y:h/2,o.z||0); s.add(m); return m; }
function flatBackdrop(s,name,w,h,x,y,z,rotY=0){ const t=tex(name,1,1); if(!t)return null; const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,fog:false})); m.position.set(x,y,z); m.rotation.y=rotY; s.add(m); return m; }
function textSprite(txt,color='#fff',size=1.6){ const c=document.createElement('canvas'); c.width=512; c.height=128; const x=c.getContext('2d'); x.font='900 64px Fredoka, Nunito, sans-serif'; x.textAlign='center'; x.textBaseline='middle'; x.lineWidth=12; x.strokeStyle='rgba(0,0,0,.45)'; x.strokeText(txt,256,64); x.fillStyle=color; x.fillText(txt,256,64); const t=new THREE.CanvasTexture(c); const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,transparent:true})); s.scale.set(size,size/4,1); return s; }
function cloud(x,y,z,s=1){ const g=new THREE.Group(); [[0,0,0,1.6],[1.4,.2,.3,1.2],[-1.4,.1,-.2,1.1],[.4,.6,-.3,1],[-.5,.5,.4,.9]].forEach(([a,b,c,r])=>{ const m=sph(r*s,0xffffff,{cast:false,recv:false},10); m.position.set(a*s,b*s,c*s); g.add(m); }); g.position.set(x,y,z); return g; }
function crowd(s,spots,n=60){ const geo=new THREE.SphereGeometry(.28,8,6); const im=new THREE.InstancedMesh(geo,new THREE.MeshLambertMaterial({color:0xffffff}),n); const d=new THREE.Object3D(); const cols=[0xff5a5f,0x2f80ff,0x37c95c,0xffc233,0xffffff,0xff9f43,0xa55eea,0x111111];
  for(let i=0;i<n;i++){ const sp=spots[i%spots.length]; d.position.set(sp[0]+rnd(-sp[3],sp[3]),sp[1]+rnd(0,sp[4]||0),sp[2]+rnd(-sp[5]||-1,sp[5]||1)); d.updateMatrix(); im.setMatrixAt(i,d.matrix); im.setColorAt(i,new THREE.Color(cols[i%cols.length])); }
  im.instanceMatrix.needsUpdate=true; if(im.instanceColor)im.instanceColor.needsUpdate=true; im.castShadow=false; s.add(im); return im; }
function stand(s,x,y,z,w,rot=0,rows=4,color=0x9fb3c8){ const g=new THREE.Group(); for(let i=0;i<rows;i++){ const b=box(w,1,2,i%2?color:0x8ea3b8,{cast:false}); b.position.set(0,.5+i,-i*2); g.add(b); } g.position.set(x,y,z); g.rotation.y=rot; s.add(g); return g; }

/* ---- Mii ---- */
const _hold1=new THREE.Vector3(), _hold2=new THREE.Vector3(), _hold3=new THREE.Vector3();
// tools are modelled along +z (face normal +y); the device frame has the top along +y and the screen normal +z: rotate -90 deg about x
const TOOL_FIX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2), TOOL_FIX_INV=TOOL_FIX.clone().invert();
const SKINS=[0xf6cfae,0xe9b88c,0xc68a5a,0x8d5a3c,0xffd9b8], HAIRS=[0x3a2417,0xf5d36b,0xd9662a,0x111111,0x8c5a2b,0xdddddd];
const FACES={happy:[0,0],surprised:[1,0],determined:[2,0],cheer:[0,1],sad:[1,1],wink:[2,1]};
function makeMii(color,name,opts={}){
  const g=new THREE.Group(); const c=new THREE.Color(color); const skin=opts.skin!=null?opts.skin:SKINS[Math.floor(Math.random()*SKINS.length)], hair=opts.hair!=null?opts.hair:HAIRS[Math.floor(Math.random()*HAIRS.length)];
  const body=new THREE.Group(); g.add(body);
  const torso=cyl(.27,.33,.72,c.getHex()); torso.position.y=.98; body.add(torso);
  const hips=sph(.33,c.getHex()); hips.scale.set(1,.55,1); hips.position.y=.64; body.add(hips);
  const belt=cyl(.335,.335,.06,0xffffff); belt.position.y=.72; body.add(belt);
  const legs=[]; for(const sx of[-1,1]){ const l=cyl(.1,.11,.46,0x2a3340); l.position.set(sx*.14,.3,0); body.add(l); const f=sph(.12,0x1c2430); f.scale.set(1,.5,1.4); f.position.set(sx*.14,.07,.04); body.add(f); legs.push(l); }
  const headG=new THREE.Group(); headG.position.y=1.62; body.add(headG);
  const head=sph(.33,skin,{},24); headG.add(head);
  const hairM=mesh(new THREE.SphereGeometry(.355,20,12,0,TAU,0,Math.PI*.52),hair); hairM.position.set(0,.04,-.02); hairM.rotation.x=-.25; headG.add(hairM);
  let faceTex=null;
  if(ART.faces){ faceTex=tex('faces',1/3,1/2); const cap=new THREE.SphereGeometry(.338,24,16,Math.PI/2-.62,1.24,Math.PI/2-.5,1.0); const fm=new THREE.Mesh(cap,new THREE.MeshBasicMaterial({map:faceTex,transparent:true,depthWrite:false})); fm.position.y=-.02; headG.add(fm); }
  else { for(const sx of[-1,1]){ const e=sph(.045,0x1c2430,{cast:false},8); e.position.set(sx*.12,.03,.29); headG.add(e); } const mouth=box(.12,.03,.02,0xa04040,{cast:false}); mouth.position.set(0,-.13,.31); headG.add(mouth); }
  const arms={}; for(const side of['L','R']){ const sx=side==='L'?-1:1; const a=new THREE.Group(); a.position.set(sx*.34,1.27,0); body.add(a); a.rotation.order='YXZ'; const up=cyl(.075,.07,.62,c.getHex()); up.position.y=-.31; a.add(up); const hand=sph(.09,skin); hand.position.y=-.66; a.add(hand); const tool=new THREE.Group(); tool.position.y=-.68; a.add(tool); a.rotation.z=sx*-.18; arms[side]={g:a,tool,hand,sx}; }
  const toolG=new THREE.Group(); body.add(toolG); toolG.visible=false;
  const tag=textSprite(name||'',color); tag.position.y=2.25; g.add(tag);
  const mii={toolG,tracked:false,g,body,headG,arms,tag,legs,anim:null,t:rnd(0,9),tool:null,color,name,faceT:0,baseExpr:'happy',
    face(expr,hold){ if(!faceTex)return; const f=FACES[expr]||FACES.happy; faceTex.offset.set(f[0]/3,f[1]===0?.5:0); this.faceT=hold||0; this.expr=expr; },
    // tracked tools live in toolG (positioned at the hand each frame by hold()), built along +z (tool direction) with the face normal +y
    setTrackedTool(kind){ toolG.clear(); this.tracked=!!kind; toolG.visible=!!kind; for(const s of['L','R'])arms[s].tool.clear(); this.tool=kind; if(!kind)return; const add=m=>toolG.add(m); const rx=m=>{ m.rotation.x=Math.PI/2; return m; };
      if(kind==='racket'){ const h=rx(cyl(.02,.02,.32,0x222222)); h.position.z=.16; add(h); const hd=mesh(new THREE.TorusGeometry(.17,.02,8,24),0xdddddd); hd.rotation.x=Math.PI/2; hd.position.z=.5; add(hd); const st=mesh(new THREE.CircleGeometry(.16,24),0xffffff,{m:{transparent:true,opacity:.35,side:THREE.DoubleSide},cast:false}); st.rotation.x=-Math.PI/2; st.position.z=.5; add(st); }
      if(kind==='bat'){ const b=rx(cyl(.02,.038,.86,0xc98d55)); b.position.z=.43; add(b); }
      if(kind==='club'){ const sh=rx(cyl(.013,.013,.95,0xbbbbbb)); sh.position.z=.47; add(sh); const hd=box(.09,.05,.06,0x444444); hd.position.set(.03,-.03,.95); add(hd); }
      if(kind==='ball'){ const b=sph(.108,0x1b1f3b,{phong:true}); b.position.z=.12; add(b); this.ballMesh=b; }
      if(kind==='basketball'){ const b=sph(.12,0xe8772e,{phong:true}); b.position.z=.14; add(b); this.ballMesh=b; }
      if(kind==='glove'){ const gl=sph(.15,0xd63a48,{phong:true}); add(gl); }
      if(kind==='phone'){ const ph=box(.075,.009,.155,0x1c2430); ph.position.z=.078; add(ph); const sc=box(.064,.002,.135,0x2f80ff,{m:{emissive:0x1a4fa0}}); sc.position.set(0,.0045,.078); add(sc); const tip=mesh(new THREE.ConeGeometry(.02,.05,8),0xffc233); tip.rotation.x=Math.PI/2; tip.position.z=.18; add(tip); }
      if(kind==='sword'){ const bl=box(.05,.008,.9,0xdde3ea,{phong:true}); bl.position.z=.5; add(bl); const gd=box(.16,.02,.03,0xffc233); gd.position.z=.05; add(gd); }
    },
    // place the tracked hand: handLocal = shoulder-relative offset (mii-local), qLocal = tool orientation (mii-local)
    hold(handLocal,qLocal,side='R',maxLen){ const a=arms[side].g; const sh=a.position; const d=_hold1.copy(handLocal); const len=Math.min(d.length(),maxLen||.7); d.normalize(); const hand=_hold2.copy(sh).addScaledVector(d,len); a.quaternion.setFromUnitVectors(_hold3.set(0,-1,0),d); toolG.position.copy(hand); toolG.quaternion.copy(qLocal).multiply(TOOL_FIX); return hand; },
    setTool(kind){ for(const s of['L','R'])arms[s].tool.clear(); this.tool=kind; if(!kind)return; const add=(m,side)=>arms[side||'R'].tool.add(m);
      if(kind==='racket'){ const h=cyl(.02,.02,.32,0x222222); h.position.y=-.16; add(h); const hd=mesh(new THREE.TorusGeometry(.17,.02,8,24),0xdddddd); hd.position.y=-.5; add(hd); const st=mesh(new THREE.CircleGeometry(.16,24),0xffffff,{m:{transparent:true,opacity:.35,side:THREE.DoubleSide},cast:false}); st.position.y=-.5; add(st); }
      if(kind==='bat'){ const b=cyl(.038,.02,.86,0xc98d55); b.position.y=-.43; add(b); const k=cyl(.03,.03,.04,0x333333); k.position.y=-.02; add(k); }
      if(kind==='club'){ const sh=cyl(.013,.013,.95,0xbbbbbb); sh.position.y=-.47; add(sh); const hd=box(.09,.06,.05,0x444444); hd.position.set(.03,-.95,.02); add(hd); }
      if(kind==='ball'){ const b=sph(.108,0x1b1f3b,{phong:true}); b.position.y=-.12; add(b); this.ballMesh=b; }
      if(kind==='gloves'){ for(const s of['L','R']){ const gl=sph(.15,0xd63a48,{phong:true}); gl.position.y=-.05; arms[s].tool.add(gl); } }
    },
    arm(side,x,y,z){ const a=arms[side].g; a.rotation.set(x,y,z+(arms[side].sx*-.18)); },
    lookAt(x,z){ this.g.rotation.y=Math.atan2(x-this.g.position.x,z-this.g.position.z); },
    idle(dt){ this.t+=dt; body.position.y=Math.sin(this.t*2.2)*.015; headG.rotation.z=Math.sin(this.t*1.3)*.04; if(this.faceT>0){ this.faceT-=dt; if(this.faceT<=0)this.face(this.baseExpr); } },
    play(name,dur,fn){ this.anim={name,t:0,dur,fn}; },
    update(dt){ this.idle(dt); if(this.anim){ this.anim.t+=dt; const k=clamp(this.anim.t/this.anim.dur,0,1); this.anim.fn(this,k); if(k>=1){ this.anim=null; } } else if(this.rest){ this.rest(this); } }
  };
  mii.face('happy'); g.userData.mii=mii; return mii;
}
const easeOut=k=>1-Math.pow(1-k,3), easeIn=k=>k*k*k, swingCurve=k=>k<.3?-(k/.3):(k<.6?-1+((k-.3)/.3)*2.2:1.2-((k-.6)/.4)*1.2);
