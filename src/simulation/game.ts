import { type GameState,type Intent,type GameEvent,type Player,type Vec,initialState,transform,opposite,clamp,distance,targets,aligned,desired,flowerPosition,spawn } from './state';

/** All puzzle authority lives here. No scene objects, clocks, DOM or network dependencies. */
export class Simulation {
 state:GameState; events:GameEvent[]=[]; private eventId=0; private cooldowns=new Map<string,number>();
 constructor(host:string){this.state=initialState(host);}
 emit(kind:string,at:Vec={x:0,y:1,z:0},role?:Player['role'],text?:string){this.events.push({id:++this.eventId,kind,at:{...at},role,text});if(this.events.length>80)this.events.shift();}
 addPlayer(id:string){const s=this.state;if(s.players.some(p=>p.id===id))return true;if(s.players.length>=2||s.phase!=='lobby')return false;s.players.push({id,role:opposite(s.players[0].role),ready:false,transform:transform(1.6),channel:false,axis:0,lift:0,sparkAt:-99,held:-1});s.paused=false;return true;}
 removePlayer(id:string){this.state.players=this.state.players.filter(p=>p.id!==id);this.state.paused=this.state.phase==='playing';for(const p of this.state.players){p.ready=false;p.channel=false;}for(const t of this.state.toys)if(t.owner===id)t.owner=null;}
 load(level:number){this.cooldowns.clear();const s=this.state;s.level=clamp(level,0,6);s.phase='playing';s.epoch++;s.time=0;s.shape=level===2||level===5?0:-.9;s.bloom=0;s.step=0;s.done=false;s.flags=[];s.ride=0;s.seal=0;s.ferryZ=6;s.message='';s.paused=false;for(let i=0;i<s.players.length;i++){const p=s.players[i];p.transform=spawn(s,i);p.channel=false;p.axis=0;p.lift=0;p.sparkAt=-99;p.held=-1;}s.toys.forEach(t=>t.owner=null);this.emit('chapter',undefined,undefined,String(level));}
 respawn(p:Player){p.transform=spawn(this.state,this.state.players.indexOf(p));p.channel=false;this.emit('respawn',p.transform,p.role,p.id);}
 accept(id:string,intent:Intent){
  const s=this.state,p=s.players.find(p=>p.id===id);if(!p)return;
  if(intent.type==='transform') {const v=intent.value;if([v.x,v.y,v.z,v.yaw,v.moving,v.cast].every(Number.isFinite)&&Math.abs(v.x)<200&&Math.abs(v.z)<3000&&Math.abs(v.y)<200){p.transform={...v};}return;}
  if(intent.type==='ready'&&s.phase==='lobby'){p.ready=!p.ready;return;}
  if(intent.type==='swap'&&s.phase==='lobby'){s.players.forEach(a=>{a.role=opposite(a.role);a.ready=false;});return;}
  if(intent.type==='start'&&id===s.players[0]?.id&&s.phase==='lobby'&&s.players.length===2&&s.players.every(a=>a.ready)){this.load(0);return;}
  if(intent.type==='rematch'&&id===s.players[0]?.id){s.phase='lobby';s.paused=false;s.epoch++;s.players.forEach(a=>{a.ready=false;a.channel=false;});return;}
  if(s.phase!=='playing'||s.paused)return;
  if(intent.type==='control'){p.channel=!!intent.channel;p.axis=clamp(Number(intent.axis)||0,-1,1);p.lift=clamp(Number(intent.lift)||0,-1,1);return;}
  if(intent.type==='respawn'){this.respawn(p);return;}
  const key=id+intent.type;if(s.time-(this.cooldowns.get(key)??-99)<.25)return;this.cooldowns.set(key,s.time);
  if(intent.type==='ping'){const at=intent.at;const valid=at&&[at.x,at.y,at.z].every(Number.isFinite)&&distance(at,p.transform)<45;this.emit('ping',valid?at:targets(s),p.role,`${p.role} is looking here`);return;}
  if(intent.type==='hand'){
   if(p.held>=0){const t=s.toys[p.held];t.owner=null;t.x=p.transform.x;t.y=.3;t.z=p.transform.z-2;p.held=-1;this.emit('toss',t,p.role);}
   else {const index=s.toys.findIndex(t=>!t.owner&&distance(t,p.transform)<6);if(index>=0){p.held=index;s.toys[index].owner=p.id;this.emit('hand',s.toys[index],p.role);}}
   return;
  }
  if(intent.type==='reset'){s.bloom=0;s.shape=-.9;this.emit('reset');return;}
  if(intent.type==='spark'){
   p.sparkAt=s.time;this.emit('spark',p.transform,p.role);
   if(s.level===0){s.flags[0]=(s.flags[0]??0)|1<<s.players.indexOf(p);if(s.done&&this.bothNodes(4,0))this.complete();}
   if(s.level===2){const f=flowerPosition(s),tx=[-7,7,0][s.step],ty=[3,6,4][s.step];if(!s.done&&Math.abs(f.x-tx)<1.8&&Math.abs(f.y-ty)<1.3&&distance(p.transform,f)<5&&s.players.every(a=>distance(a.transform,f)<5)){s.step++;this.emit('success',f);if(s.step===3){s.done=true;this.emit('message',f,undefined,'Delivery complete. Step onto the far landing.');}}}
   if(s.level===3&&s.done){if(Math.abs(p.transform.x)>3&&p.transform.z<0&&p.transform.z>-10){s.flags[s.players.indexOf(p)]=1;if(s.flags[0]&&s.flags[1]&&Math.abs(s.players[0].sparkAt-s.players[1].sparkAt)<3){this.complete();}}}
   if(s.level===4&&s.done)this.complete();
   if(s.level===6&&s.done&&this.bothNodes(5,0)){s.seal=1;this.emit('finale',undefined,undefined,'A little less water, perhaps.');}
  }
  if(intent.type==='advance'&&s.done&&s.level!==0&&s.level!==3&&s.level!==6&&s.players.every(a=>a.transform.z<-11))this.complete();
 }
 bothNodes(x:number,z:number){const s=this.state;return s.players.length===2&&s.players.every((p,i)=>distance(p.transform,{x:i===0?-x:x,y:0,z})<3&&s.time-p.sparkAt<3);}
 complete(){const s=this.state;if(s.level===6){s.phase='ending';return;}this.load(s.level+1);}
 tick(dt:number){
  const s=this.state;if(s.phase!=='playing'||s.paused||s.players.length!==2)return;s.time+=dt;s.version++;
  const sh=s.players.find(p=>p.role==='Shaper')!,wa=s.players.find(p=>p.role==='Warden')!;
  const inRange=(p:Player)=>s.level===5||s.level===4||s.level===2||distance(p.transform,targets(s))<12;
  const shape=sh.channel&&inRange(sh),bloom=wa.channel&&inRange(wa);
  if(s.level===2){
   const dest=[6,-1,-8,-12][Math.min(3,s.step)];s.ferryZ+=(dest-s.ferryZ)*Math.min(1,dt*1.5);
   const f=flowerPosition(s);if(!s.flags[0]&&s.players.every(p=>distance(p.transform,f)<4.5))s.flags[0]=1;
   if(s.flags[0]&&!s.done){if(shape)s.shape=clamp(s.shape+sh.axis*dt*.46,-1,1);if(bloom)s.bloom=clamp(s.bloom+(wa.lift===0?1:wa.lift)*dt*.25,0,1);}
  }else if(s.level===5){
   if(shape)s.shape=clamp(s.shape+sh.axis*dt*1.05,-1,1);
   const gate=Math.min(5,Math.floor(s.ride/12));s.step=gate;
   const toGate=(gate+1)*12-2;
   if(bloom&&(s.ride<toGate||aligned(s))){s.ride=Math.min(72,s.ride+dt*.9);s.bloom=1;}else s.bloom=0;
   if(s.ride>=72){s.done=true;s.seal+=dt;if(s.seal>2)this.complete();}
  }else if(!s.done){
   if(shape){s.shape=clamp(s.shape+sh.axis*dt*.7,-1,1);if(Math.abs(s.shape-desired(s))<.08&&sh.axis===0)s.shape=desired(s);}
   if(bloom){
    if(aligned(s))s.bloom=Math.min(1,s.bloom+dt*(s.level===1?.18:.32));
    else if(s.level===0)s.bloom=Math.min(.85,s.bloom+dt*.45);
    else s.bloom=Math.max(.08,s.bloom-dt*.1);
   }
   if(s.bloom>=.999&&aligned(s)){
    this.emit('success',targets(s),undefined,'The living geometry holds.');s.step++;
    const count=s.level===0?1:s.level===1?2:3;
    if(s.step>=count){s.done=true;this.emit('message',undefined,undefined,s.level===0?'Stand on the two brass pads. Spark together.':s.level===6?'Take opposite sides. Spark together to finish the spell.':'A new way forward.');}
    else {s.bloom=0;if(s.level!==1)s.shape=-.9;}
   }
  }
  if(s.level===1&&s.done&&s.players.every(p=>p.transform.z<-11))this.complete();
  if(s.level===2&&s.done&&s.players.every(p=>p.transform.z<-12))this.complete();
  if(s.level===4&&s.done){s.seal+=dt;if(s.seal>3)this.complete();}
  if(s.level===6&&s.seal>0){s.seal+=dt;if(s.seal>7)this.complete();}
  for(const p of s.players){if(p.transform.y<-8)this.respawn(p);if(p.held>=0){const t=s.toys[p.held];t.x=p.transform.x+Math.sin(p.transform.yaw)*1.5;t.z=p.transform.z-Math.cos(p.transform.yaw)*1.5;t.y=p.transform.y+2.3;}}
 }
}
