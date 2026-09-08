import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Atmosphere } from './atmosphere';
import { surfaces, type Surface } from '../physics/world';
import { type GameState,type Transform,type Role,type GameEvent,flowerPosition,targets,desired,aligned,clamp,vineHeights } from '../simulation/state';

const palette={cream:0xe8d9b0,stone:0xbca780,wood:0x68432d,dark:0x263e39,brass:0xc69b51,jade:0x537d5e,leaf:0x7d9d64,coral:0xe69a76,ink:0x29352f};
const mats=new Map<number,T.MeshStandardMaterial>();
function mat(c:number){let m=mats.get(c);if(!m){m=new T.MeshStandardMaterial({color:c,roughness:.86,metalness:c===palette.brass?.45:0,flatShading:true});mats.set(c,m);}return m;}
const cloudGeo=new T.SphereGeometry(1,16,10);
const boxGeo=new T.BoxGeometry(1,1,1),sphereGeo=new T.IcosahedronGeometry(1,1),cylGeo=new T.CylinderGeometry(1,1,1,12);
function mesh(g:T.BufferGeometry,c:number,parent:T.Object3D,x=0,y=0,z=0,sx=1,sy=1,sz=1){const m=new T.Mesh(g,mat(c));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p:T.Object3D,c:number,x:number,y:number,z:number,w:number,h:number,d:number){return mesh(boxGeo,c,p,x,y,z,w,h,d);}
function orb(p:T.Object3D,c:number,x:number,y:number,z:number,r:number,s=1){return mesh(sphereGeo,c,p,x,y,z,r,r*s,r);}
function line(p:T.Object3D,points:T.Vector3[],color=palette.brass,r=.045){const curve=new T.CatmullRomCurve3(points);return mesh(new T.TubeGeometry(curve,Math.max(8,points.length*3),r,5,false),color,p);}
function ring(p:T.Object3D,r:number,y:number,c=palette.brass,thickness=.035){const m=mesh(new T.TorusGeometry(r,thickness,6,64),c,p,0,y,0);m.rotation.x=-Math.PI/2;return m;}

export class View {
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(52,1,.1,300);root=new T.Group();decor=new T.Group();puzzle=new T.Group();actors=new T.Group();fx=new T.Group();
 atmosphere:Atmosphere;private raycaster=new T.Raycaster();
 yaw=0;pitch=.32;distance=9;epoch=-1;level=-1;avatarModels:T.Group[]=[];assetKit=new Map<string,T.Object3D>();assetReady=false;
 private floors=new Map<string,T.Mesh>();private avatarRoots:T.Group[]=[];private avatarRoles:Role[]=[];private ringParts:T.Object3D[]=[];private growth=new T.Group();private ferry=new T.Group();private guide=new T.Group();private wheel=new T.Group();private stageItems:T.Object3D[]=[];private particles:{m:T.Mesh;v:T.Vector3;life:number;max:number}[]=[];private dust:T.Points;private waterDrops:T.Group[]=[];private sun:T.DirectionalLight;private focusPoint=new T.Vector3();private cameraPos=new T.Vector3();private temp=new T.Vector3();private frameTimes:number[]=[];private elapsed=0;private labelSprites:T.Sprite[]=[];private toys:T.Object3D[]=[];private bellRoots:T.Group[]=[];private wildVine=new T.Group();private lastRoot='';private lastRealFrame=performance.now();
 stats={fps:60,drawCalls:0,triangles:0,geometries:0,textures:0,frameMs:0};
 constructor(canvas:HTMLCanvasElement){
  this.renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
  this.scene.background=new T.Color(0xc9d6bd);this.scene.fog=new T.FogExp2(0xc9d6bd,.008);this.scene.add(new T.HemisphereLight(0xf7eacc,0x465e53,1.65));this.sun=new T.DirectionalLight(0xffdfa0,2.6);this.sun.position.set(-16,26,14);this.sun.castShadow=true;this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.camera.left=-24;this.sun.shadow.camera.right=24;this.sun.shadow.camera.top=24;this.sun.shadow.camera.bottom=-24;this.sun.shadow.normalBias=.04;this.sun.shadow.bias=-.0002;this.scene.add(this.sun);
  this.scene.add(this.root,this.actors,this.fx);this.root.add(this.decor,this.puzzle);this.puzzle.add(this.growth,this.ferry,this.guide,this.wheel);
  this.atmosphere=new Atmosphere(this.scene);
  const positions=new Float32Array(180*3);for(let i=0;i<180;i++){positions[i*3]=(Math.sin(i*327.4)*.5+.5)*65-32;positions[i*3+1]=(Math.sin(i*42.1)*.5+.5)*17;positions[i*3+2]=(Math.cos(i*183.4)*.5+.5)*65-32;}const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));this.dust=new T.Points(g,new T.PointsMaterial({color:0xffe8a9,size:.055,transparent:true,opacity:.65,depthWrite:false}));this.scene.add(this.dust);
  window.addEventListener('resize',()=>this.resize());canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.dispatchEvent(new CustomEvent('game-context-lost'));});canvas.addEventListener('webglcontextrestored',()=>location.reload());this.resize();
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 async loadAssets(){try{const gltf=await new GLTFLoader().loadAsync('/assets/glasshouse-kit.glb');for(const obj of [...gltf.scene.children])this.assetKit.set(obj.name,obj);this.assetReady=true;if(this.level>=0)this.level=-1;}catch{console.info('Authored kit not built yet; using greybox kit.');}}
 instance(name:string,parent:T.Object3D,x:number,y:number,z:number,scale=1,rotation=0){const base=this.assetKit.get(name);if(!base)return undefined;const m=base.clone(true);m.position.set(x,y,z);m.scale.setScalar(scale);m.rotation.y=rotation;m.traverse(o=>{if(o instanceof T.Mesh){o.castShadow=true;o.receiveShadow=true;}});parent.add(m);return m;}
 private clear(group:T.Group){group.traverse(o=>{if(o instanceof T.Mesh&&o.geometry!==boxGeo&&o.geometry!==sphereGeo&&o.geometry!==cylGeo)o.geometry.dispose();if(o instanceof T.Sprite){o.material.map?.dispose();o.material.dispose();}});group.clear();}
 private plant(p:T.Object3D,x:number,z:number,scale=1){if(!p.userData.distant&&this.instance('Planter',p,x,0,z,scale))return;mesh(new T.CylinderGeometry(.65,.45,1,10),palette.coral,p,x,.5*scale,z,scale,scale,scale);for(let i=0;i<5;i++){const a=i*2.4;const leaf=orb(p,i%2?palette.leaf:palette.jade,x+Math.sin(a)*.55*scale,(1.3+i*.18)*scale,z+Math.cos(a)*.5*scale,.5*scale,.32);leaf.rotation.z=a;}}
 private arch(parent:T.Object3D,z:number,width=14,height=14){const group=new T.Group();parent.add(group);group.position.z=z;const pts:T.Vector3[]=[];for(let i=0;i<=32;i++){const a=i/32*Math.PI;pts.push(new T.Vector3(Math.cos(a)*width,3+Math.sin(a)*height*.7,0));}line(group,pts,palette.brass,.12);for(const x of [-width,width]){box(group,palette.dark,x,1.5,0,.35,3,.35);orb(group,palette.brass,x,3,0,.27);}for(let i=1;i<6;i++){const a=i/6*Math.PI;line(group,[new T.Vector3(Math.cos(a)*width,3+Math.sin(a)*height*.7,0),new T.Vector3(Math.cos(a)*width*.86,3+Math.sin(a)*height*.7-1.1,0)],palette.brass,.04);}return group;}
 private label(text:string,x:number,y:number,z:number,parent:T.Object3D=this.decor){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='rgba(34,54,45,.9)';ctx.roundRect(4,8,504,112,12);ctx.fill();ctx.strokeStyle='#c9ac73';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#f2dfb3';ctx.font=text.length===1?'76px Georgia':'36px Georgia';ctx.textAlign='center';ctx.fillText(text,256,77);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const m=new T.Sprite(new T.SpriteMaterial({map:texture,depthWrite:false}));m.position.set(x,y,z);m.scale.set(text.length===1?1.2:3.6,.9,1);parent.add(m);this.labelSprites.push(m);return m;}
 build(s:GameState){
  this.level=s.level;this.epoch=s.epoch;this.clear(this.decor);this.clear(this.puzzle);this.floors.clear();this.ringParts=[];this.stageItems=[];this.waterDrops=[];this.labelSprites=[];this.toys=[];this.bellRoots=[];this.lastRoot='';this.growth=new T.Group();this.ferry=new T.Group();this.guide=new T.Group();this.wheel=new T.Group();this.wildVine=new T.Group();this.puzzle.add(this.growth,this.ferry,this.guide,this.wheel,this.wildVine);
  const atelier=s.level===0,sky=s.level>=4;this.scene.background=new T.Color(sky?0xb3cece:0xc6d1b2);(this.scene.fog as T.FogExp2).color.copy(this.scene.background);(this.scene.fog as T.FogExp2).density=sky?.008:.011;
  this.sun.intensity=sky?2.8:2.6;
  if(s.level!==5){
   for(let z=-16;z<=16;z+=8){if(!this.instance('GreenhouseArch',this.decor,0,0,z))this.arch(this.decor,z);}
   for(const x of [-14,14]){box(this.decor,palette.dark,x,1,0,.35,2,37);box(this.decor,palette.brass,x,2.05,0,.5,.12,37);for(let z=-17;z<=17;z+=2){box(this.decor,palette.brass,x,2.8,z,.08,1.5,.08);}}
   if(atelier){
    for(const x of [-14,14]){box(this.decor,0xb9ba94,x,3,0,.7,6,37);for(let z=-13;z<=13;z+=6){box(this.decor,palette.wood,x*.96,3,z,.45,6,.28);box(this.decor,palette.cream,x*.97,4,z-2,.3,2,2.5);}}
    for(const x of [-10,10])for(const z of [-13,-5,9]){if(!this.instance('Bookshelf',this.decor,x,0,z,1.1,x<0?-Math.PI/2:Math.PI/2)){for(let j=0;j<4;j++){box(this.decor,palette.wood,x,j*.8+.3,z,2.8,.15,1.1);for(let k=0;k<6;k++)box(this.decor,[palette.coral,palette.dark,palette.cream][k%3],x-1+k*.35,j*.8+.68,z,.25,.6,.6);}}}
    for(const x of [-8,8]){this.instance('Workbench',this.decor,x,0,3,1);this.plant(this.decor,x+2,1,.8);}
    this.label('WATER THE GLASSHOUSE',0,5,-15);
    // A timber end wall and circular conservatory window frame the lesson.
    for(const x of [-10,10])box(this.decor,0x9aa184,x,4,-18,9,8,.45);
    box(this.decor,palette.wood,0,.7,-18,30,1.4,.5);box(this.decor,palette.wood,0,8.5,-18,30,.3,.6);
    const windowRing=ring(this.decor,4.2,0,palette.brass,.1);windowRing.rotation.x=0;windowRing.position.set(0,5,-17.8);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;line(this.decor,[new T.Vector3(0,5,-17.7),new T.Vector3(Math.cos(a)*4.2,5+Math.sin(a)*4.2,-17.7)],palette.brass,.045);}
   }
   for(const x of [-12,12])for(let z=-15;z<=15;z+=5){this.plant(this.decor,x,z,1+(Math.sin(z*3)+1)*.4);if(!atelier)this.plant(this.decor,x+(x<0?1:-1),z+1,.8);}
   for(let i=0;i<8;i++){const x=i%2?-13:13,z=-16+i*4;this.instance('Lantern',this.decor,x,4,z,1);}
  }
  // Distant floating botanical architecture gives depth without extending playable scope.
  for(let i=0;i<8;i++){const a=i*2.4,r=43+(i%3)*12,x=Math.sin(a)*r,z=Math.cos(a)*r;const g=new T.Group();g.userData.distant=true;this.decor.add(g);g.position.set(x,-10-(i%4)*3,z);mesh(new T.CylinderGeometry(7,2,12,7),0x789080,g,0,-6,0);this.arch(g,0,7,12);for(let k=0;k<3;k++)this.plant(g,(k-1)*3,1,.9);}
  for(let i=0;i<18;i++){const a=i*2.4;for(let j=0;j<3;j++){const cloud=mesh(cloudGeo,0xe3dfc9,this.decor,Math.sin(a)*60+j*5,-17-i%4+j%2*2,Math.cos(a)*60,10,4+j%2*2,8);cloud.castShadow=false;}}
  if([0,3,6].includes(s.level)){
   const base=s.level===6?5:3;mesh(cylGeo,palette.dark,this.puzzle,0,.2,0,base,.4,base);ring(this.puzzle,base,.43);
   for(let i=0;i<3;i++){const g=new T.Group();this.wheel.add(g);if(!this.instance('SealRing',g,0,.5+i*.04,0,(base-.5-i*.65)/3)){ring(g,base-.5-i*.65,.5+i*.05,palette.brass,.09);for(let j=0;j<6;j++){const a=j*Math.PI/3;box(g,palette.cream,Math.cos(a)*(base-.5-i*.65),.55,Math.sin(a)*(base-.5-i*.65),.32,.1,.65);}}
    this.ringParts.push(g);
   }
   if(s.level===3){this.wheel.rotation.x=Math.PI/2;this.wheel.position.set(0,4,-2);this.label('THE IRRIGATION ENGINE',0,8,-3);for(const x of [-5,5]){mesh(cylGeo,palette.brass,this.puzzle,x,.8,-4,.65,1.6,.65);ring(this.puzzle,.8,.05).position.set(x,.05,-4);}}
   else {for(const x of [-(s.level===6?5:4),s.level===6?5:4]){const r=ring(this.puzzle,1.15,.06,palette.brass,.08);r.position.x=x;const m=orb(this.puzzle,palette.cream,x,.1,0,.23);m.scale.y=.15;}}
   if(s.level===6){const stem:T.Vector3[]=[];for(let i=0;i<24;i++)stem.push(new T.Vector3(Math.sin(i*.5)*.6,i*.23,Math.cos(i*.5)*.6));line(this.growth,stem,palette.jade,.3);}else this.plant(this.growth,0,0,1.2);
  }
  if(s.level===1){this.plant(this.decor,0,5,.85);this.plant(this.decor,-5,-3,.85);this.label('ROOTWRIGHT’S CROSSING',0,6,-15);for(const [x,z]of[[-5,-3],[3,-13]]){const socket=ring(this.decor,1.6,.1,palette.brass,.1);socket.position.set(x,.1,z);}}
  if(s.level===2){this.buildFlower(this.ferry,3.6);this.label('PETAL EXPRESS',0,6,7);for(let i=0;i<3;i++){const g=new T.Group();this.puzzle.add(g);g.position.set([-7,7,0][i],[3,6,4][i]+1.7,[6,-1,-8][i]);orb(g,0xebdf98,0,0,0,.45,1.4);ring(g,.8,0,palette.brass);this.waterDrops.push(g);}}
  if(s.level===4){this.label('ROOT GALLERY',8,3.5,1);this.label('STRUCTURE GALLERY',-8,3.5,1);for(let i=0;i<3;i++){const g=this.arch(this.puzzle,-7,2.4,6);g.position.x=(i-1)*5;this.label(String(i+1),(i-1)*5,5.8,-7);this.stageItems.push(g);}for(const x of [-8,8]){ring(this.decor,1.4,.05).position.set(x,.05,-4);mesh(cylGeo,palette.dark,this.decor,x,.55,-4,.7,1.1,.7);ring(this.decor,.7,0).position.set(x,1.13,-4);}}
  if(s.level===5){this.buildFlower(this.ferry,5);this.ferry.position.y=.8;
   const spine:T.Vector3[]=[];for(let i=0;i<35;i++)spine.push(new T.Vector3(Math.sin(i*.22)*4,-2-i*.13,i*3));line(this.wildVine,spine,palette.jade,2.1);
   for(let i=0;i<25;i++){const z=i*4;const leaf=orb(this.wildVine,i%2?palette.leaf:palette.jade,Math.sin(i*.88)*4+(i%2?3:-3),-1-i*.15,z,3,.15);leaf.scale.z=1.7;leaf.rotation.y=i*1.4;const tendril:T.Vector3[]=[];for(let j=0;j<15;j++){const a=j*.55;tendril.push(new T.Vector3(Math.sin(i*.88)*4+Math.cos(a)*2,-2+Math.sin(a)*2-i*.15,z+j*.25));}line(this.wildVine,tendril,palette.leaf,.08);}
   this.mergeStatic(this.wildVine);
   for(let i=0;i<15;i++){const g=this.arch(this.decor,-i*12-12,14+(i%3)*3,13);g.userData.startZ=g.position.z;this.stageItems.push(g);}for(let i=0;i<8;i++){const g=new T.Group();this.decor.add(g);g.position.set(Math.sin(i*2.4)*22,Math.cos(i)*7-4,-i*22);g.userData.startZ=g.position.z;box(g,palette.stone,0,0,0,8,.5,5);this.plant(g,0,0,2);this.stageItems.push(g);}
  }
  if(s.level===6){this.label('THE HEART OF THE LESSON',0,8,-8);for(let i=0;i<12;i++){const a=i*Math.PI/6;const g=new T.Group();this.decor.add(g);g.position.set(Math.sin(a)*11,0,Math.cos(a)*11);this.buildFlower(g,1.2);}}
  if(s.level!==5)this.mergeStatic(this.decor);
  if(s.level===0){for(let i=0;i<3;i++){const g=new T.Group();this.puzzle.add(g);g.position.set([-6,0,6][i],2.7,-7);this.instance('Bell',g,0,0,0,1.3);this.bellRoots.push(g);line(this.decor,[new T.Vector3(g.position.x,3.5,-7),new T.Vector3(g.position.x,7,-7)],palette.brass,.025);}}
  s.toys.forEach(t=>{const g=new T.Group();this.puzzle.add(g);if(!this.instance('Ceramic',g,0,0,0,1.8))orb(g,palette.coral,0,.3,0,.3);this.toys.push(g);});
  this.buildGuide();if(s.level===4){box(this.guide,palette.stone,0,-.1,0,2,.3,2);for(let i=0;i<3;i++){const path=line(this.growth,[new T.Vector3(8,.2,-4),new T.Vector3(8,2,-8),new T.Vector3((i-1)*5,2,-7)],palette.leaf,.08);path.name='root-route-'+i;}}
  this.updateSurfaces(s);this.yaw=0;this.pitch=.32;
 }
 private mergeStatic(group:T.Group){
  group.updateMatrixWorld(true);const buckets=new Map<T.Material,T.BufferGeometry[]>();const objects:T.Mesh[]=[];
  group.traverse(o=>{if(o instanceof T.Mesh&&!Array.isArray(o.material)&&!(o instanceof T.InstancedMesh)){const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);if(!g.getAttribute('uv'))g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.getAttribute('position').count*2),2));const list=buckets.get(o.material)??[];list.push(g);buckets.set(o.material,list);objects.push(o);}});
  for(const o of objects)o.removeFromParent();for(const [material,list]of buckets){const merged=mergeGeometries(list,false);if(merged){const m=new T.Mesh(merged,material);m.castShadow=true;m.receiveShadow=true;group.add(m);}list.forEach(g=>g.dispose());}
 }
 private buildFlower(g:T.Group,r:number){mesh(cylGeo,palette.brass,g,0,-.3,0,r*.55,.35,r*.55);for(let i=0;i<10;i++){const a=i*Math.PI/5;const petal=mesh(sphereGeo,i%2?palette.coral:0xf3b88c,g,Math.sin(a)*r*.57,.04,Math.cos(a)*r*.57,r*.49,.2,r*.8);petal.rotation.y=a;}mesh(cylGeo,0xb99d5a,g,0,.15,0,r*.65,.2,r*.65);ring(g,r*.7,.28,palette.cream,.04);}
 private buildGuide(){ring(this.guide,1.3,.07,palette.cream,.035);for(let i=0;i<4;i++){const a=i*Math.PI/2;box(this.guide,palette.brass,Math.sin(a)*1.6,.08,Math.cos(a)*1.6,.13,.07,.5);}}
 private updateSurfaces(s:GameState){const seen=new Set<string>();for(const f of surfaces(s)){if(f.kind==='wall')continue;seen.add(f.id);let m=this.floors.get(f.id);if(!m){m=box(this.puzzle,f.kind==='root'?palette.jade:f.kind==='wood'?palette.wood:palette.stone,f.x,f.y,f.z,f.w,f.h,f.d);this.floors.set(f.id,m);
    if(f.kind==='tile'){const tileG=new T.BoxGeometry(1.89,.05,1.89);const count=Math.floor(f.w/2)*Math.floor(f.d/2);const tiles=new T.InstancedMesh(tileG,mat(palette.cream),count);tiles.receiveShadow=true;const d=new T.Object3D();let n=0;for(let x=-f.w/2+1;x<f.w/2;x+=2)for(let z=-f.d/2+1;z<f.d/2;z+=2){if(n>=count)break;d.position.set(f.x+x,f.y+f.h/2+.02,f.z+z);d.updateMatrix();tiles.setMatrixAt(n,d.matrix);tiles.setColorAt(n,new T.Color(n%5===0?0xbcb697:n%3===0?0xd0c09b:0xddcca6));n++;}this.puzzle.add(tiles);}
   }m.position.set(f.x,f.y,f.z);m.rotation.y=f.angle??0;m.visible=f.kind!=='flower'&&f.id!=='ride';}
  for(const[id,m]of this.floors)if(!seen.has(id)){this.puzzle.remove(m);this.floors.delete(id);}
 }
 private avatar(index:number,role:Role){const root=new T.Group();this.actors.add(root);let model=this.instance(index===0?'Ivo':'Nell',root,0,0,0) as T.Group|undefined;
  if(!model){model=new T.Group();root.add(model);mesh(new T.CylinderGeometry(.32,.4,.8,7),index===0?palette.cream:palette.jade,model,0,1.05,0);orb(model,0xd1a17a,0,1.65,0,.28,1.1);orb(model,index===0?0x3b3026:0x815036,0,1.85,.03,.29,.65);for(const side of [-1,1]){const arm=new T.Group();arm.name=side<0?'ArmL':'ArmR';arm.position.set(side*.36,1.4,0);model.add(arm);box(arm,palette.cream,0,-.28,0,.16,.6,.2);const leg=new T.Group();leg.name=side<0?'LegL':'LegR';leg.position.set(side*.17,.72,0);model.add(leg);box(leg,palette.dark,0,-.33,0,.23,.66,.25);}box(model,palette.coral,0,.93,-.27,.5,.7,.08);}
  model.scale.set(index===0?.87:.97,1.1,.9);
  const shadow=new T.Mesh(new T.CircleGeometry(.55,24),new T.MeshBasicMaterial({color:0x20382c,transparent:true,opacity:.2,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.035;root.add(shadow);
  const glyph=new T.Group();glyph.name='castGlyph';root.add(glyph);ring(glyph,.48,0,role==='Shaper'?0xffd09a:0xc2e6b0,.018);glyph.position.set(.45,1.45,-.8);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;line(glyph,[new T.Vector3(Math.cos(a)*.6,0,Math.sin(a)*.6),new T.Vector3(0,0,0),new T.Vector3(Math.cos(a+.3)*.3,.15,Math.sin(a+.3)*.3)],role==='Shaper'?0xffd09a:0xc2e6b0,.013);}glyph.visible=false;
  this.avatarRoots[index]=root;this.avatarModels[index]=model;this.avatarRoles[index]=role;return root;
 }
 event(e:GameEvent){const color=e.role==='Warden'?0xc6e69e:e.kind==='finale'?0xffeed0:0xffd28a;const n=e.kind==='finale'?70:e.kind==='success'?30:12;for(let i=0;i<n;i++){if(this.particles.length>150){const old=this.particles.shift()!;this.fx.remove(old.m);}const m=new T.Mesh(sphereGeo,new T.MeshBasicMaterial({color,transparent:true}));m.position.set(e.at.x,e.at.y+1,e.at.z);m.scale.setScalar(e.kind==='finale'?.15:.07);this.fx.add(m);this.particles.push({m,v:new T.Vector3((Math.random()-.5)*5,Math.random()*4+.5,(Math.random()-.5)*5),life:e.kind==='finale'?4:1.2,max:e.kind==='finale'?4:1.2});}if(e.kind==='ping'){const g=ring(this.fx,1,.1,0xffefad,.1);g.position.set(e.at.x,e.at.y+.2,e.at.z);this.particles.push({m:g,v:new T.Vector3(0,1,0),life:2,max:2});}}
 update(s:GameState,localId:string,local:Transform|undefined,dt:number,menu:boolean,mouseX=0,mouseY=0){
  this.elapsed+=dt;const time=this.elapsed;if(this.level!==s.level||this.epoch!==s.epoch)this.build(s);this.updateSurfaces(s);
  s.players.forEach((p,i)=>{let a=this.avatarRoots[i];if(!a||this.avatarRoles[i]!==p.role||(!a.userData.authored&&this.assetReady)){if(a)this.actors.remove(a);a=this.avatar(i,p.role);a.userData.authored=this.assetReady;}
   a.visible=true;const t=p.id===localId&&local?local:p.transform;const desiredP=this.temp.set(t.x,t.y,t.z);if(p.id===localId||a.position.distanceTo(desiredP)>10)a.position.copy(desiredP);else a.position.lerp(desiredP,1-Math.exp(-dt*14));
   a.rotation.y+=T.MathUtils.euclideanModulo(t.yaw-a.rotation.y+Math.PI,Math.PI*2)-Math.PI;
   const m=this.avatarModels[i];const stride=Math.sin(time*12+i)*Math.min(1,t.moving/5);m.position.y=t.grounded?Math.abs(stride)*.05:0;m.rotation.z=Math.sin(time*2+i)*.016;
   for(const side of ['L','R']){const sign=side==='L'?1:-1;const prefix=i===0?'Ivo_':'Nell_';const leg=m.getObjectByName(prefix+'Leg'+side)??m.getObjectByName('Leg'+side),arm=m.getObjectByName(prefix+'Arm'+side)??m.getObjectByName('Arm'+side);if(leg)leg.rotation.x=t.grounded?stride*.6*sign:-.3*sign;if(arm){arm.rotation.x=p.channel?1.15:t.cast>0?1.45:-stride*.5*sign;arm.rotation.z=p.channel?sign*.35:0;}}
   const cape=m.getObjectByName(i===0?'Ivo_Cape':'Nell_Cape');if(cape)cape.rotation.x=.04+Math.abs(stride)*.18+Math.sin(time*4)*.035;
   const glyph=a.getObjectByName('castGlyph')!;glyph.visible=p.channel||t.cast>0;glyph.rotation.y=time*2;
  });for(let i=s.players.length;i<this.avatarRoots.length;i++)this.avatarRoots[i].visible=false;
  const a=aligned(s),target=targets(s);this.guide.visible=s.phase!=='ending'&&!(s.level===6&&s.seal>4);this.guide.position.set(target.x,target.y-.8,target.z);this.guide.rotation.y=time*.2;
  for(let i=0;i<this.ringParts.length;i++){const active=i===Math.min(s.step,2);this.ringParts[i].rotation.y=(i<s.step?0:(active?s.shape-desired(s):1))*(Math.PI*.75);}
  if(s.level===0||s.level===6){this.growth.scale.setScalar(.2+s.bloom*.8+(s.done?.3:0));this.growth.rotation.y=time*.15;}
  if(s.level===1){const signature=`${s.step}:${Math.round(s.bloom*25)}:${Math.round(s.shape*20)}`;if(signature!==this.lastRoot){this.lastRoot=signature;this.clear(this.growth);for(let i=0;i<2;i++){if(i>s.step)continue;const grown=i<s.step?1:Math.max(.05,s.bloom);const start=i===0?new T.Vector3(0,.25,5):new T.Vector3(-5,.25,-3);const end=i===0?new T.Vector3(-5,.25,-3):new T.Vector3(3,.25,-13);if(i===s.step)end.x+= (s.shape-desired(s))*7;end.lerp(start,1-grown);line(this.growth,[start,start.clone().lerp(end,.5).add(new T.Vector3(0,.5,0)),end],palette.jade,.5);for(let j=1;j<9;j++){const p=start.clone().lerp(end,j/9);const leaf=orb(this.growth,j%2?palette.leaf:palette.jade,p.x+(j%2?1:-1)*.7,p.y,p.z,1.2,.13);leaf.scale.z=1.5;leaf.rotation.y=j*.8;}}}}
  if(s.level===2){const f=flowerPosition(s);this.ferry.position.set(f.x,f.y,f.z);this.ferry.rotation.z=Math.sin(time)*.015;this.waterDrops.forEach((g,i)=>{g.visible=i>=s.step;g.rotation.y=time;g.position.y=[3,6,4][i]+1.7+Math.sin(time*2)*.15;});}
  if(s.level===3){this.growth.scale.setScalar(.2+s.step*.4+s.bloom*.4);if(s.done)this.wheel.rotation.z=time*.3;}
  if(s.level===4){const role=s.players.find(p=>p.id===localId)?.role;this.stageItems.forEach((g,i)=>{const correct=i===Math.round((desired(s)+.8)/.8);g.scale.setScalar(role==='Warden'&&correct?1.13:1);g.traverse(o=>{if(o instanceof T.Mesh)o.material=mat(role==='Warden'&&correct?palette.leaf:palette.brass);});});this.growth.children.forEach((o,i)=>{o.visible=role==='Warden'&&i===Math.round((desired(s)+.8)/.8);});this.guide.position.set(s.shape*6,2,-5);}
  if(s.level===5){this.ferry.position.set(s.shape*8,s.vineHeight-.2,0);this.ferry.rotation.z=-s.shape*.08;this.wildVine.position.set(s.shape*8,s.vineHeight-1,0);this.wildVine.rotation.z=Math.sin(time*.5)*.02;for(let i=0;i<this.stageItems.length;i++){const g=this.stageItems[i];g.position.z=(g.userData.startZ+s.ride*4)%230;if(g.position.z>12)g.position.z-=230;g.rotation.z=Math.sin(time*.3+i)*.08;}this.guide.position.set(desired(s)*8,vineHeights[Math.min(5,s.step)]+2,-12);this.guide.scale.setScalar(2);this.guide.rotation.x=Math.PI/2;}
  this.toys.forEach((m,i)=>{const t=s.toys[i];m.visible=s.level===0;m.position.set(t.x,t.y+(t.owner?Math.sin(time*3)*.12:0),t.z);m.rotation.y=t.owner?time:0;});this.bellRoots.forEach((g,i)=>{const recent=s.players.some(p=>s.time-p.sparkAt<1&&Math.abs(p.transform.x-g.position.x)<6&&p.transform.z<0);g.rotation.z=recent?Math.sin(time*20)*.2:Math.sin(time*.8+i)*.015;});
  if(s.level===6&&s.seal>0){const scale=1+s.seal*2;this.guide.scale.setScalar(scale);this.guide.position.set(0,.1,0);this.sun.intensity=3.6+Math.sin(Math.min(1,s.seal/5)*Math.PI)*3;}
  this.dust.rotation.y=time*.012;this.dust.position.y=Math.sin(time*.2)*.4;
  for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;if(p.life<=0){this.fx.remove(p.m);if(p.m.material instanceof T.Material&&!Array.isArray(p.m.material)&&!Array.from(mats.values()).includes(p.m.material as T.MeshStandardMaterial))p.m.material.dispose();this.particles.splice(i,1);}else{p.m.position.addScaledVector(p.v,dt);p.v.y-=dt;const material=p.m.material as T.MeshBasicMaterial;if(material.transparent)material.opacity=p.life/p.max;}}
  const own=local??s.players[0]?.transform??{x:0,y:0,z:12};
  if(menu||s.level===6&&s.seal>0){this.cameraPos.set(s.level===6?12:9,s.level===6?10:7.5,16);this.focusPoint.set(-1,s.level===6?3.5:2.7,-1);this.camera.position.lerp(this.cameraPos,1-Math.exp(-dt*2));this.camera.lookAt(this.focusPoint);}
  else{this.yaw-=mouseX*.004;this.pitch=clamp(this.pitch+mouseY*.003,.12,.95);const ride=s.level===5;const dist=ride?16:this.distance;const focusY=own.y+1.45;this.cameraPos.set(own.x+Math.sin(this.yaw)*dist,focusY+Math.sin(this.pitch)*dist,own.z+Math.cos(this.yaw)*Math.cos(this.pitch)*dist);if(!ride){this.cameraPos.x=clamp(this.cameraPos.x,-13.7,13.7);this.cameraPos.z=clamp(this.cameraPos.z,-17.7,18);}this.camera.position.lerp(this.cameraPos,1-Math.exp(-dt*9));this.focusPoint.set(own.x,focusY,own.z-(ride?6:0));this.camera.lookAt(this.focusPoint);}
  this.atmosphere.update(s,dt);this.renderer.render(this.scene,this.camera);const realNow=performance.now();this.frameTimes.push(realNow-this.lastRealFrame);this.lastRealFrame=realNow;if(this.frameTimes.length>120)this.frameTimes.shift();if(Math.floor(time*2)!==Math.floor((time-dt)*2)){this.stats.frameMs=this.frameTimes.reduce((a,b)=>a+b,0)/this.frameTimes.length;this.stats.fps=1000/this.stats.frameMs;this.stats.drawCalls=this.renderer.info.render.calls;this.stats.triangles=this.renderer.info.render.triangles;this.stats.geometries=this.renderer.info.memory.geometries;this.stats.textures=this.renderer.info.memory.textures;}
 }
 pick(x:number,y:number,fallback:{x:number;y:number;z:number}){this.raycaster.setFromCamera(new T.Vector2(x/innerWidth*2-1,-y/innerHeight*2+1),this.camera);const hit=this.raycaster.intersectObjects([this.puzzle,this.decor],true).find(h=>h.distance<45);return hit?{x:hit.point.x,y:hit.point.y,z:hit.point.z}:fallback;}
 screen(v:{x:number;y:number;z:number}){this.temp.set(v.x,v.y,v.z).project(this.camera);return{x:(this.temp.x*.5+.5)*innerWidth,y:(-this.temp.y*.5+.5)*innerHeight,visible:this.temp.z<1};}
}
