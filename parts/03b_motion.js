/* =====================================================================
   HOST MOTION LAYER: RemoteCtrl = the phone as a tracked controller.
   One instance per player (p.ctrl). Sports read ctrl.q / axis() / normal() / w / v / pos ...
   Frames: controller ("game") frame = x right, y up, z toward the player (forward = -z).
   A Mii faces its local +z, so tool poses are converted with FLIP (180 deg about y).
   ===================================================================== */
const _qp=new THREE.Quaternion(), _qd=new THREE.Quaternion(), _ax=new THREE.Vector3(), _t1=new THREE.Vector3(), _t2=new THREE.Vector3(), _t3=new THREE.Vector3();
const FLIP=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI), FLIPI=FLIP.clone().invert();
const Q1INV=new THREE.Quaternion(Math.sqrt(.5),0,0,Math.sqrt(.5)); // undoes the flat-phone base rotation so pitch/yaw/roll read 0 for a flat phone pointing at the TV
class RemoteCtrl{
  constructor(p){ this.p=p; this.q=new THREE.Quaternion(); this.qT=new THREE.Quaternion(); this.qLocal=new THREE.Quaternion(); this.w=new THREE.Vector3(); this.a=new THREE.Vector3(); this.v=new THREE.Vector3(); this.vT=new THREE.Vector3(); this.pos=new THREE.Vector3(); this.posT=new THREE.Vector3(); this.euler=new THREE.Euler(0,0,0,'YXZ');
    this.stationary=true; this.calibrated=false; this.hasOri=false; this.hasMot=false; this.touch=false; this.quality=0; this.rateNet=0; this.netN=0; this.rateT=now(); this.lastRecv=-1; this.age=9; this.rateOri=0; this.rateMot=0; this.phoneTs=0; this.gap=0; this.init=false; this.samples=0; }
  packet(d){ if(!Array.isArray(d)||d.length<18)return; const t=now(); if(this.lastRecv>=0){ const g=t-this.lastRecv; this.gap=this.gap?lerp(this.gap,g,.2):g; } this.lastRecv=t; this.netN++; this.samples++; this.phoneTs=d[0];
    this.qT.set(d[1],d[2],d[3],d[4]); if(this.qT.lengthSq()<.5)this.qT.identity(); this.qT.normalize(); this.w.set(d[5],d[6],d[7]); this.a.set(d[8],d[9],d[10]); this.vT.set(d[11],d[12],d[13]); this.posT.set(d[14],d[15],d[16]);
    const f=d[17]||0; this.stationary=!!(f&1); this.calibrated=!!(f&2); this.hasOri=!!(f&4); this.hasMot=!!(f&8); this.touch=!!(f&16); this.rateOri=d[18]||0; this.rateMot=d[19]||0;
    if(!this.init){ this.init=true; this.q.copy(this.qT); this.pos.copy(this.posT); this.v.copy(this.vT); } }
  update(dt){ const K=MOTION_CFG; const t=now(); if(t-this.rateT>1){ this.rateNet=this.netN/(t-this.rateT); this.netN=0; this.rateT=t; } this.age=this.lastRecv<0?9:t-this.lastRecv;
    this.quality=this.lastRecv<0?0:clamp((this.hasOri?.55:0)+(this.hasMot?.15:0)+clamp(this.rateNet/K.sendHz,0,1)*.3,0,1)*(this.age>1.5?0:1);
    if(!this.init)return;
    // dead reckoning: rotate the last received orientation forward by the angular velocity for the time it has been in flight (bounded)
    const lead=clamp(this.age+(this.p.owd||0),0,K.predictMax); const wm=this.w.length(); _qp.copy(this.qT); if(wm>.02&&lead>0){ _ax.copy(this.w).normalize(); _qd.setFromAxisAngle(_ax,wm*lead); _qp.premultiply(_qd); }
    // adaptive smoothing: heavy while nearly still (no jitter), light while moving fast (no lag)
    const k=clamp(K.rotSmoothMin+wm*K.rotSmoothGain,K.rotSmoothMin,1); this.q.slerp(_qp,1-Math.pow(1-k,dt*60)); this.q.normalize();
    const vm=this.vT.length(); const kp=clamp(K.posSmoothMin+vm*K.posSmoothGain,K.posSmoothMin,1); const kpf=1-Math.pow(1-kp,dt*60); this.pos.lerp(this.posT,kpf); this.v.lerp(this.vT,kpf);
    this.qLocal.copy(FLIP).multiply(this.q).multiply(FLIPI); _qp.copy(this.q).multiply(Q1INV); this.euler.setFromQuaternion(_qp,'YXZ'); }
  axis(out){ return (out||_t1).set(0,1,0).applyQuaternion(this.q); }     // where the top of the phone points (tool direction). Neutral = (0,0,-1)
  normal(out){ return (out||_t2).set(0,0,1).applyQuaternion(this.q); }   // screen normal (racket face / palm). Neutral = up
  right(out){ return (out||_t3).set(1,0,0).applyQuaternion(this.q); }
  get pitch(){ return this.euler.x; } get yaw(){ return this.euler.y; } get roll(){ return this.euler.z; }
  get speed(){ return this.v.length(); } get angSpeed(){ return this.w.length(); }
  get live(){ return this.init&&this.age<1.5; }
}
function ctrlOf(p){ return p.ctrl||(p.ctrl=new RemoteCtrl(p)); }
// Converts a controller-frame vector into Mii-local (facing +z) space
function toLocal(v,out){ return (out||new THREE.Vector3()).copy(v).applyQuaternion(FLIP); }
/* Hand rig: places the Mii's tracked hand + tool from a controller.
   rest = neutral arm vector in mii-local space (shoulder -> hand when the phone is flat and pointing forward). */
const _rig1=new THREE.Vector3(), _rig2=new THREE.Vector3();
const _rigQ=new THREE.Quaternion(), _rigD=new THREE.Vector3(), _rigZ=new THREE.Vector3(0,0,1);
const _rigI=new THREE.Quaternion();
function rigHand(mii,ctrl,rest,posGain,follow,maxLen,side){ const K=MOTION_CFG; const g=posGain!=null?posGain:K.posGain; const f=follow!=null?follow:1;
  ctrl.axis(_rigD).applyQuaternion(FLIP); _rigQ.setFromUnitVectors(_rigZ,_rigD); if(f<1)_rigQ.slerp(_rigI,1-f); // arm swing = the rotation that takes "pointing at the TV" to the current pointing direction (no roll)
  _rig1.copy(rest).applyQuaternion(_rigQ); _rig2.copy(ctrl.pos).multiplyScalar(g).applyQuaternion(FLIP); _rig1.add(_rig2); // hand offset from the shoulder (local)
  return mii.hold(_rig1,ctrl.qLocal,side||'R',maxLen); }
// controller-frame velocity (player-relative) -> world space for a Mii facing any direction
function ctrlVelWorld(mii,ctrl,out){ return (out||new THREE.Vector3()).copy(ctrl.v).applyQuaternion(FLIP).applyQuaternion(mii.g.quaternion); }
/* Tracks the world position/velocity of a point on an object between frames (for racket heads, gloves, club heads). */
class PointTracker{ constructor(){ this.pos=new THREE.Vector3(); this.prev=new THREE.Vector3(); this.vel=new THREE.Vector3(); this.speed=0; this.n=0; }
  update(obj,local,dt){ this.prev.copy(this.pos); this.pos.copy(local); obj.localToWorld(this.pos); if(this.n++>0&&dt>0){ _t1.copy(this.pos).sub(this.prev).divideScalar(dt); this.vel.lerp(_t1,.6); this.speed=this.vel.length(); } return this; } }
