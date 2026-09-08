import { joinRoom as joinPublic, selfId } from 'trystero';
import { joinRoom as joinLocal } from '@trystero-p2p/ws-relay';
import type { Room,MessageAction } from '@trystero-p2p/core';
import { Simulation } from '../simulation/game';
import type { GameState,GameEvent,Intent } from '../simulation/state';

export class Network {
 id=selfId;host=false;hostPeer='';code='';status='offline';latency=0;transport='WebRTC';room?:Room;sim?:Simulation;state?:GameState;events:GameEvent[]=[];recent:string[]=[];onChange=()=>{};onEvent=(e:GameEvent)=>{};error='';
 private message?:MessageAction<string>;private lastEvent=0;private broadcastAt=0;private pingAt=0;private helloAt=0;private joinedAt=0;private disposed=false;
 async connect(host:boolean,code?:string){
  await this.leave();this.disposed=false;this.host=host;this.code=code?.toUpperCase().replace(/[^A-Z0-9]/g,'')||this.makeCode();this.status=host?'waiting':'connecting';this.error='';this.joinedAt=performance.now();this.lastEvent=0;
  if(host){this.hostPeer=this.id;this.sim=new Simulation(this.id);this.state=this.sim.state;}
  const config:{appId:string;relayConfig?:{urls:string[]};turnConfig?:RTCIceServer[]}={appId:'glasshouse-lesson-2026-v1'};
  const turnUrl=import.meta.env.VITE_TURN_ENDPOINT;
  if(turnUrl){try{const r=await fetch(turnUrl);if(!r.ok)throw Error('TURN unavailable');const j=await r.json();config.turnConfig=j.iceServers;}catch{this.log('TURN unavailable; trying direct connection.');}}
  const local=(import.meta.env.DEV&&!new URLSearchParams(location.search).has('online'))||new URLSearchParams(location.search).has('local');
  if(local){config.relayConfig={urls:[import.meta.env.VITE_SIGNAL_URL||`ws://${location.hostname}:8787`]};this.transport='WebRTC · local discovery';}
  else this.transport='WebRTC · public discovery';
  const callbacks={onJoinError:(e:{error:string})=>{this.log(e.error);}};
  this.room=local?joinLocal({...config,relayConfig:config.relayConfig!},this.code,callbacks):joinPublic(config,this.code,callbacks);
  this.message=this.room.makeAction<string>('lesson');
  this.message.onMessage=(data,ctx)=>{try{this.receive(JSON.parse(data),ctx.peerId);}catch(e){this.log(`Ignored malformed peer message: ${String(e)}`);}};
  this.room.onPeerJoin=id=>{this.log('Peer connected');this.send({kind:'hello',host:this.host},id);};
  this.room.onPeerLeave=id=>{
   if(this.host&&this.sim?.state.players.some(p=>p.id===id)){this.sim.removePlayer(id);this.status='disconnected';this.error='Your partner disconnected. Return to the room to invite them again.';this.broadcast();}
   else if(id===this.hostPeer){this.status='disconnected';this.error='The host disconnected. Return to the title and create or join a new room.';if(this.state)this.state.paused=true;}
   this.onChange();
  };
  this.onChange();
 }
 private makeCode(){const a=new Uint8Array(6);crypto.getRandomValues(a);return Array.from(a,n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');}
 private log(s:string){this.recent.push(s);if(this.recent.length>30)this.recent.shift();}
 private send(data:unknown,target?:string){if(this.disposed)return;void this.message?.send(JSON.stringify(data),target?{target}:undefined).catch(()=>this.log('Peer send interrupted'));}
 private receive(data:{kind:string;[key:string]:any},id:string){
  if(data.kind==='hello'){
   if(this.host&&!data.host){if(this.sim!.addPlayer(id)){this.status='connected';this.error='';this.send({kind:'welcome',host:this.id},id);this.broadcast();}else this.send({kind:'reject',message:'This lesson is for exactly two. The room is full or already playing.'},id);}
   else if(!this.host&&data.host){this.hostPeer=id;this.send({kind:'hello',host:false},id);}
   return;
  }
  if(data.kind==='welcome'&&!this.host&&(!this.hostPeer||this.hostPeer===id)){this.hostPeer=id;this.status='connected';this.log('Host admitted this apprentice');this.onChange();return;}
  if(data.kind==='reject'&&!this.host&&(!this.hostPeer||id===this.hostPeer)){this.error=String(data.message);this.status='rejected';void this.room?.leave();this.onChange();return;}
  if(data.kind==='snapshot'&&!this.host&&id===this.hostPeer){this.state=data.state;for(const e of data.events as GameEvent[]){if(e.id>this.lastEvent){this.lastEvent=e.id;this.events.push(e);this.onEvent(e);}}this.events=this.events.slice(-30);this.onChange();return;}
  if(data.kind==='intent'&&this.host&&this.sim?.state.players.some(p=>p.id===id)){this.sim.accept(id,data.intent as Intent);return;}
 }
 intent(intent:Intent){
  if(this.host&&intent.type==='rematch'){
   if(this.status==='disconnected'){
    // Reopen discovery after losing the only partner; do not reuse stale offers indefinitely.
    const code=this.code,role=this.local?.role;
    void this.connect(true,code).then(()=>{if(role&&this.local)this.local.role=role;this.onChange();});return;
   }
   this.error='';this.status=this.peerCount===2?'connected':'waiting';
  }
  if(this.host)this.sim?.accept(this.id,intent);else if(this.hostPeer)this.send({kind:'intent',intent},this.hostPeer);
 }
 tick(dt:number){
  if(this.host&&this.sim){this.sim.tick(dt);this.state=this.sim.state;for(const e of this.sim.events)if(e.id>this.lastEvent){this.lastEvent=e.id;this.onEvent(e);}this.broadcastAt+=dt;if(this.broadcastAt>.1){this.broadcastAt=0;this.broadcast();}}
  this.pingAt+=dt;if(this.pingAt>4){this.pingAt=0;const peer=this.state?.players.find(p=>p.id!==this.id)?.id;if(peer)void this.room?.ping(peer).then(n=>this.latency=n).catch(()=>{});}
  this.helloAt+=dt;if(this.helloAt>2){this.helloAt=0;for(const id of Object.keys(this.room?.getPeers()??{})){if(this.host?!this.state?.players.some(p=>p.id===id):this.status==='connecting')this.send({kind:'hello',host:this.host},id);}}
  if(this.status==='connecting'&&performance.now()-this.joinedAt>25000){this.error='Still looking for the host. Check the room code and that both browsers use the same discovery mode. Restrictive networks may need TURN.';}
 }
 broadcast(){if(this.host&&this.sim){const guest=this.sim.state.players.find(p=>p.id!==this.id);if(guest)this.send({kind:'snapshot',state:this.sim.state,events:this.sim.events.slice(-15)},guest.id);this.onChange();}}
 async leave(){this.disposed=true;await this.room?.leave();this.room=undefined;this.message=undefined;this.sim=undefined;this.state=undefined;this.status='offline';this.hostPeer='';this.code='';this.events=[];}
 get local(){return this.state?.players.find(p=>p.id===this.id);}
 get peerCount(){return this.state?.players.length??0;}
 get rtcStats(){return Object.entries(this.room?.getPeers()??{}).map(([id,pc])=>({id,state:pc.connectionState,ice:pc.iceConnectionState}));}
}
