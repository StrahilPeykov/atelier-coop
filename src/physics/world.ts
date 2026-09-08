import RAPIER from '@dimforge/rapier3d-compat';
import type { GameState,Transform,Vec } from '../simulation/state';
import { flowerPosition,transform } from '../simulation/state';

export type Surface={id:string;x:number;y:number;z:number;w:number;h:number;d:number;angle?:number;kind?:string};
export function surfaces(s:GameState):Surface[]{
 const a:Surface[]=[];const box=(id:string,x:number,y:number,z:number,w:number,h:number,d:number,kind='stone',angle=0)=>a.push({id,x,y,z,w,h,d,kind,angle});
 if(s.level===1){box('entry',0,-.65,11,24,1.3,12,'tile');box('far',0,-.65,-15,24,1.3,10,'tile');box('island',-5,-.65,-3,6,1.3,5,'stone');
  if(s.step>=1)box('root1',-2.5,-.25,1,4,.5,10,'root',.56);
  if(s.done)box('root2',-1,-.25,-8,4,.5,13,'root',-.675);
 }else if(s.level===2){box('entry',0,-.65,13,24,1.3,10,'tile');box('far',0,-.65,-16,24,1.3,8,'tile');const f=flowerPosition(s);box('ferry',f.x,f.y-.3,f.z,7,.6,6,'flower');}
 else if(s.level===4){box('left',-8,-.65,0,7,1.3,32,'tile');box('right',8,-.65,0,7,1.3,32,'tile');}
 else if(s.level===5){box('ride',s.shape*8,s.vineHeight-.7,0,10,1.4,12,'root');}
 else {box('floor',0,-.65,0,29,1.3,37,'tile');
  if(s.level===0){box('tableA',-8,.75,3,4,1.5,3,'wood');box('tableB',8,.75,3,4,1.5,3,'wood');box('step1',-10,.3,-7,3,.6,3);box('step2',-10,.8,-10,3,1.6,3);}
  if(s.level===3){for(let i=0;i<4;i++)box(`stair${i}`,-9, i*.24,-3-i*2,3,.5+i*.48,2.2);}
 }
 // Invisible boundary parapets are placed only where architecture visibly closes the room.
 if(s.level!==5){box('wallL',-14.8,2,0,.5,5,38,'wall');box('wallR',14.8,2,0,.5,5,38,'wall');box('wallBack',0,2,18.8,30,5,.5,'wall');}
 return a;
}
export class Physics {
 world!:RAPIER.World;body!:RAPIER.RigidBody;collider!:RAPIER.Collider;controller!:RAPIER.KinematicCharacterController;private colliders=new Map<string,RAPIER.Collider>();
 position:Transform=transform();vx=0;vz=0;vy=0;coyote=0;jumpBuffer=0;dash=0;dashCooldown=0;private lastFerry?:Vec;landed=false;jumped=false;dashed=false;
 async init(){await RAPIER.init();this.world=new RAPIER.World({x:0,y:-22,z:0});this.body=this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased());this.collider=this.world.createCollider(RAPIER.ColliderDesc.capsule(.55,.32).setTranslation(0,.87,0),this.body);this.controller=this.world.createCharacterController(.025);this.controller.enableAutostep(.42,.25,false);this.controller.enableSnapToGround(.25);this.controller.setMaxSlopeClimbAngle(.85);this.controller.setMinSlopeSlideAngle(1.05);}
 rebuild(s:GameState){for(const c of this.colliders.values())this.world.removeCollider(c,true);this.colliders.clear();this.sync(s);this.lastFerry=undefined;}
 sync(s:GameState){const seen=new Set<string>();for(const p of surfaces(s)){seen.add(p.id);let c=this.colliders.get(p.id);if(!c){c=this.world.createCollider(RAPIER.ColliderDesc.cuboid(p.w/2,p.h/2,p.d/2));this.colliders.set(p.id,c);}c.setTranslation({x:p.x,y:p.y,z:p.z});const angle=p.angle??0;c.setRotation({x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)});}
  for(const [id,c]of this.colliders)if(!seen.has(id)){this.world.removeCollider(c,true);this.colliders.delete(id);}
  if(s.level===2||s.level===5){const f=s.level===2?flowerPosition(s):{x:s.shape*8,y:s.vineHeight,z:0};if(this.lastFerry&&this.position.grounded&&Math.abs(this.position.x-this.lastFerry.x)<(s.level===5?5.5:4)&&Math.abs(this.position.z-this.lastFerry.z)<(s.level===5?6.5:3.6)&&Math.abs(this.position.y-this.lastFerry.y)<.7){this.teleport({...this.position,x:this.position.x+f.x-this.lastFerry.x,y:this.position.y+f.y-this.lastFerry.y,z:this.position.z+f.z-this.lastFerry.z},false);}this.lastFerry={...f};}
 }
 teleport(p:Transform,reset=true){this.position={...p};this.body.setTranslation(p,true);this.body.setNextKinematicTranslation(p);if(reset){this.vx=this.vz=this.vy=0;this.dash=0;}this.world.step();}
 step(dt:number,mx:number,mz:number,jump:boolean,dash:boolean,yaw:number){
  this.landed=this.jumped=this.dashed=false;const p=this.position;const wasGround=p.grounded;
  if(jump)this.jumpBuffer=.15;else this.jumpBuffer-=dt;if(p.grounded)this.coyote=.14;else this.coyote-=dt;
  this.dashCooldown-=dt;this.dash-=dt;
  let x=mx*Math.cos(yaw)+mz*Math.sin(yaw),z=mx*-Math.sin(yaw)+mz*Math.cos(yaw);const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
  if(dash&&this.dashCooldown<=0){this.dash=.18;this.dashCooldown=.8;this.dashed=true;if(length<.1){x=-Math.sin(p.yaw);z=-Math.cos(p.yaw);}this.vx=x*17;this.vz=z*17;this.vy=Math.max(this.vy,0);}
  if(this.dash<=0){const smooth=1-Math.exp(-dt*(p.grounded?18:8));this.vx+=(x*6.5-this.vx)*smooth;this.vz+=(z*6.5-this.vz)*smooth;}
  if(this.jumpBuffer>0&&this.coyote>0){this.vy=8.8;this.jumpBuffer=0;this.coyote=0;p.grounded=false;this.jumped=true;}
  this.vy-=22*dt;if(wasGround&&this.vy<0)this.vy=-2;
  this.controller.computeColliderMovement(this.collider,{x:this.vx*dt,y:this.vy*dt,z:this.vz*dt});const move=this.controller.computedMovement();
  p.x+=move.x;p.y+=move.y;p.z+=move.z;p.grounded=this.controller.computedGrounded();this.landed=!wasGround&&p.grounded;if(p.grounded&&this.vy<0)this.vy=0;
  p.moving=Math.hypot(this.vx,this.vz);if(p.moving>.3)p.yaw=Math.atan2(-this.vx,-this.vz);
  this.body.setNextKinematicTranslation(p);this.world.timestep=dt;this.world.step();
 }
}
