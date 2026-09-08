export type Role = 'Shaper' | 'Warden';
export type Vec = {x:number;y:number;z:number};
export type Transform = Vec & {yaw:number;moving:number;grounded:boolean;cast:number};
export type Player = {id:string;role:Role;ready:boolean;transform:Transform;channel:boolean;axis:number;lift:number;sparkAt:number;held:number};
export type GameState = {version:number;epoch:number;phase:'lobby'|'playing'|'ending';level:number;time:number;shape:number;bloom:number;step:number;done:boolean;flags:number[];ride:number;seal:number;ferryZ:number;vineHeight:number;message:string;players:Player[];toys:{x:number;y:number;z:number;owner:string|null}[];seed:number;paused:boolean};
export type Intent = {type:'control';channel:boolean;axis:number;lift:number} | {type:'ping';at?:Vec} | {type:'spark'|'hand'|'ready'|'swap'|'start'|'rematch'|'respawn'|'advance'|'reset'} | {type:'transform';value:Transform};
export type GameEvent = {id:number;kind:string;at:Vec;role?:Role;text?:string};
export const opposite = (role:Role):Role => role==='Shaper'?'Warden':'Shaper';
export const clamp = (n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
export const distance = (a:Vec,b:Vec)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export const transform = (x=0,y=0,z=12):Transform=>({x,y,z,yaw:0,moving:0,grounded:true,cast:0});
export const levelNames = ['A small practical lesson','The rootwright’s crossing','A flower with somewhere to be','The irrigation engine','The glasshouse comes undone','Ride the wild green','The heart of the lesson'];
export const chapters = ['01 · THE ATELIER','02 · ROOT & REASON','03 · PETAL EXPRESS','04 · ONE SMALL ACCIDENT','05 · THROUGH THE LOOKING GLASS','06 · THE WILD GREEN','07 · A SPELL, TOGETHER'];
export const goals = [[0],[-.65,.65],[-.78,.78,0],[-.65,.6,0],[-.8,.8,0],[-.8,.8,0,-.8,0,.8],[-.65,.65,0]];
export const targets = (s:GameState):Vec=> s.level===1 ? (s.step===0?{x:0,y:1,z:5}:{x:-5,y:1,z:-3}) : s.level===2?flowerPosition(s):s.level===4?{x:0,y:2,z:-3}:{x:0,y:1,z:0};
export const flowerPosition = (s:GameState):Vec=>({x:s.shape*9,y:1+s.bloom*6,z:s.ferryZ});
export const desired = (s:GameState)=>goals[s.level]?.[Math.min(s.step,(goals[s.level]?.length??1)-1)]??0;
export const vineHeights = [1,4,2,5,2,4];
export const vineAligned = (s:GameState)=>aligned(s)&&Math.abs(s.vineHeight-vineHeights[Math.min(5,s.step)])<.8;
export const aligned = (s:GameState)=>Math.abs(s.shape-desired(s))<.17;
export function spawn(s:GameState,index:number):Transform {
  if(s.level===4)return transform(s.players[index]?.role==='Shaper'?-8:8,0,9);
  if(s.level===5)return transform(s.shape*8+(index===0?-1.4:1.4),s.vineHeight,2);
  if(s.level===2 && s.flags[0]) {const p=flowerPosition(s);return transform(p.x+(index===0?-1:1),p.y+.1,p.z);}
  if(s.level===1 && s.step>0)return transform(-5+(index===0?-.7:.7),0,-3);
  return transform(index===0?-1.6:1.6,0,s.level===6?10:12);
}
export function initialState(host:string):GameState {
 return {version:0,epoch:0,phase:'lobby',level:0,time:0,shape:-.9,bloom:0,step:0,done:false,flags:[],ride:0,seal:0,ferryZ:6,vineHeight:1,message:'',players:[{id:host,role:'Shaper',ready:false,transform:transform(-1.6),channel:false,axis:0,lift:0,sparkAt:-99,held:-1}],toys:[{x:-5,y:.1,z:9,owner:null},{x:5,y:.1,z:9,owner:null},{x:4,y:.1,z:4,owner:null}],seed:Math.floor(Math.random()*10000),paused:false};
}
