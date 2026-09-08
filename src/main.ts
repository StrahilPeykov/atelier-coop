import './ui/style.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/fraunces/latin-400.css';
import { Network } from './multiplayer/network';
import { Simulation } from './simulation/game';
import { type GameState,type Transform,spawn,targets } from './simulation/state';
import { Physics } from './physics/world';
import { View } from './render/view';
import { Input } from './input/input';
import { Sound } from './audio/sound';
import { UI } from './ui/ui';

async function boot(){
 const canvas=document.querySelector<HTMLCanvasElement>('#world')!,net=new Network(),sound=new Sound(),ui=new UI(net,sound),physics=new Physics(),input=new Input(canvas);
 let view:View;try{view=new View(canvas);await physics.init();}catch(e){ui.root.innerHTML='<div class="loading fatal"><h2>The glasshouse needs WebGL 2.</h2><p>Enable hardware acceleration in a current desktop browser and reload.</p></div>';throw e;}
 const titleSim=new Simulation('title');titleSim.addPlayer('companion');const titleState=titleSim.state;titleState.players[0].transform={...titleState.players[0].transform,x:2,z:6};titleState.players[1].transform={...titleState.players[1].transform,x:4,z:5};
 let epoch=-999,last=performance.now(),acc=0,send=0,clock=0,fallTimer=0,foot=0,cast=0;let controlsSent=false;
 const syncSpawn=(s:GameState)=>{physics.rebuild(s);const index=Math.max(0,s.players.findIndex(p=>p.id===net.id));physics.teleport(spawn(s,index));epoch=s.epoch;view.yaw=0;input.clear();};
 net.onChange=()=>ui.render();
 net.onEvent=e=>{view.event(e);sound.play(e.kind);if(e.text&&e.kind==='message')ui.toast(e.text);if(e.kind==='respawn'&&e.text===net.id){physics.teleport({...physics.position,...e.at});fallTimer=0;}if(e.kind==='chapter'){epoch=-999;input.clear();}};
 ui.onResume=()=>{input.clear();sound.start();};ui.onRespawn=()=>{net.intent({type:'respawn'});if(net.state)physics.teleport(spawn(net.state,net.state.players.findIndex(p=>p.id===net.id)));};ui.onExit=()=>{epoch=-999;input.clear();};
 ui.render(true);if(new URLSearchParams(location.search).has('room')){ui.mode='join';ui.render(true);}void view.loadAssets();
 document.addEventListener('game-context-lost',()=>{ui.mode='pause';net.error='Graphics context interrupted. Waiting for the browser to restore it.';ui.render(true);});
 const debugEnabled=import.meta.env.DEV||new URLSearchParams(location.search).get('debug')==='1';
 const api={get state(){return net.state;},get gamePhase(){return net.state?.phase??'title';},get localRole(){return net.local?.role;},get peerCount(){return net.peerCount;},get hostPeer(){return net.hostPeer;},get roomCode(){return net.code;},get connectionState(){return net.status;},get transport(){return net.transport;},get rtc(){return net.rtcStats;},get latency(){return net.latency;},get localPlayer(){return physics.position;},get remotePlayer(){return net.state?.players.find(p=>p.id!==net.id)?.transform;},get currentCheckpoint(){return net.state?.level;},get currentPuzzle(){return {shape:net.state?.shape,bloom:net.state?.bloom,step:net.state?.step};},get setPiecePhase(){return net.state?.ride;},get finalSealPhase(){return net.state?.seal;},get renderer(){return view.stats;},get recentEvents(){return net.recent;},
  ...(debugEnabled?{loadCheckpoint:(name:number|string)=>{if(!net.host||!net.sim)throw Error('Only the host loads checkpoints');const names=['movement','combined','flower','wheel','split','vine','seal'];const i=typeof name==='number'?name:names.indexOf(name);net.sim.load(Math.max(0,i));net.broadcast();},resetCurrentPuzzle:()=>net.intent({type:'reset'}),respawn:()=>ui.onRespawn(),startVineSequence:()=>{net.sim?.load(5);net.broadcast();},loadFinalSeal:()=>{net.sim?.load(6);net.broadcast();},returnToLobby:()=>{net.intent({type:'rematch'});net.broadcast();},setRole:()=>net.intent({type:'swap'}),toggleDebug:()=>ui.debug=!ui.debug,teleport:(x:number,y:number,z:number)=>{physics.teleport({...physics.position,x,y,z});net.intent({type:'transform',value:{...physics.position}});},action:(intent:any)=>net.intent(intent),setCamera:(yaw:number,pitch:number)=>{view.yaw=yaw;view.pitch=pitch;},get id(){return net.id;}}:{})};
 Object.defineProperty(window,'__MAGIC_GAME__',{value:api,configurable:true});
 function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;clock+=dt;
  if(input.once('Escape')){if(ui.mode==='play')ui.mode='pause';else if(ui.mode==='pause'&&!net.state?.paused)ui.mode='play';input.clear();ui.render(true);}if(input.once('F3'))ui.debug=!ui.debug;
  const s=net.state??titleState,playing=!!net.state&&s.phase==='playing',active=playing&&!ui.menu&&!s.paused;
  input.enabled=active;if(playing&&epoch!==s.epoch)syncSpawn(s);
  if(active){
   const channel=input.keys.has('KeyE'),axis=input.axis('KeyA','KeyD'),lift=input.axis('KeyS','KeyW');
   let jump=input.once('Space'),dash=input.once('ShiftLeft')||input.once('ShiftRight');
   if(input.spark||input.once('KeyR')){input.spark=false;net.intent({type:'spark'});cast=.5;}
   if(input.once('KeyQ'))net.intent({type:'hand'});if(input.once('KeyF'))net.intent({type:'ping',at:view.pick(input.pointerX,input.pointerY,targets(s))});
   acc+=dt;physics.sync(s);while(acc>=1/60){physics.step(1/60,channel?0:axis,channel?0:input.axis('KeyW','KeyS'),jump,dash,view.yaw);jump=false;dash=false;acc-=1/60;if(physics.jumped)sound.play('jump');if(physics.landed)sound.play('land');if(physics.dashed){sound.play('dash');view.event({id:0,kind:'spark',at:physics.position,role:net.local?.role});}}
   cast=Math.max(0,cast-dt);physics.position.cast=cast;send+=dt;if(send>.05){send=0;net.intent({type:'transform',value:{...physics.position}});net.intent({type:'control',channel,axis,lift});controlsSent=channel;}
   if(physics.position.y<-6){fallTimer+=dt;if(fallTimer>.55){ui.onRespawn();fallTimer=0;}}
   if(physics.position.moving>1&&physics.position.grounded){foot+=dt;if(foot>.32){foot=0;sound.noise(.055,.04);}}
  }else if(controlsSent){net.intent({type:'control',channel:false,axis:0,lift:0});controlsSent=false;}
  net.tick(dt);const current=net.state??titleState;
  view.update(current,net.id,playing?physics.position:undefined,dt,ui.menu,input.mouseX,input.mouseY);input.mouseX=input.mouseY=0;
  sound.tick(clock,current.level,!!net.local?.channel);ui.tick(current,clock,view.stats);
  const remote=current.players.find(p=>p.id!==net.id);const tag=document.querySelector<HTMLElement>('#partner-tag');if(tag&&remote&&playing){const pos=view.screen({...remote.transform,y:remote.transform.y+2.6});tag.style.display=pos.visible?'block':'none';tag.style.left=pos.x+'px';tag.style.top=pos.y+'px';tag.textContent=`${remote.role==='Shaper'?'◇':'❧'} ${remote.role}`;}
 }
 requestAnimationFrame(frame);
}
void boot().catch(e=>console.error('Game startup failed',e));
