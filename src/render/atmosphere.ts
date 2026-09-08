import * as T from 'three';
import type { GameState } from '../simulation/state';

/** Original procedural sky, flying leaves and the completed botanical orrery. */
export class Atmosphere {
 private sky:T.Mesh;private skyMaterial:T.ShaderMaterial;private leaves:T.InstancedMesh;private matrix=new T.Object3D();private orrery=new T.Group();private rings:T.Mesh[]=[];private bloom=new T.Group();private splinters=new T.Group();private time=0;
 constructor(scene:T.Scene){
  this.skyMaterial=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{zenith:{value:new T.Color(0x789c9b)},horizon:{value:new T.Color(0xf0d5a2)},nadir:{value:new T.Color(0xc7cfb7)},glow:{value:0}},vertexShader:'varying vec3 vDirection; void main(){vDirection=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`
   varying vec3 vDirection; uniform vec3 zenith;uniform vec3 horizon;uniform vec3 nadir;uniform float glow;
   void main(){vec3 d=normalize(vDirection);float h=smoothstep(-.35,.65,d.y);vec3 color=mix(horizon,zenith,h);color=mix(color,nadir,1.-smoothstep(-.8,-.4,d.y));
   float sun=max(0.,dot(d,normalize(vec3(-.48,.32,-.8))));color+=vec3(1.,.72,.36)*pow(sun,22.)*.22+vec3(1.,.91,.64)*pow(sun,900.)*.8;
   float cloud=sin(d.x*17.+d.z*11.)*.5+sin(d.x*31.-d.z*14.)*.22;float band=exp(-pow((d.y-.06)*10.,2.));color=mix(color,horizon*1.12,smoothstep(.25,.58,cloud)*band*.5);color+=glow*vec3(.24,.2,.12);gl_FragColor=vec4(color,1.);
   #include <tonemapping_fragment>
   #include <colorspace_fragment>
  }`});
  this.sky=new T.Mesh(new T.SphereGeometry(200,24,16),this.skyMaterial);this.sky.renderOrder=-100;scene.add(this.sky);
  const leafGeo=new T.SphereGeometry(1,6,3),leafMat=new T.MeshStandardMaterial({color:0xb8ba76,roughness:1,side:T.DoubleSide});this.leaves=new T.InstancedMesh(leafGeo,leafMat,100);this.leaves.instanceMatrix.setUsage(T.DynamicDrawUsage);this.leaves.frustumCulled=false;scene.add(this.leaves);
  const brass=new T.MeshStandardMaterial({color:0xb99554,metalness:.65,roughness:.32});
  const luminous=new T.MeshStandardMaterial({color:0xf7d79a,emissive:0xffcd77,emissiveIntensity:1.4,roughness:.5});
  for(let i=0;i<4;i++){const ring=new T.Mesh(new T.TorusGeometry(2.7+i*.48,.035,6,96),i%2?brass:luminous);this.orrery.add(ring);ring.rotation.set(i*.4,0,i*.6);this.rings.push(ring);}
  for(let i=0;i<24;i++){const a=i*Math.PI/12;const node=new T.Mesh(new T.IcosahedronGeometry(.12,0),luminous);node.position.set(Math.cos(a)*3.8,Math.sin(a)*3.8,0);this.orrery.add(node);}
  this.orrery.position.set(0,5,0);scene.add(this.orrery);
  const petals=[new T.MeshStandardMaterial({color:0xe8a885,roughness:.78}),new T.MeshStandardMaterial({color:0xeac18b,roughness:.78})];
  for(let k=0;k<2;k++)for(let i=0;i<12;i++){const a=i*Math.PI/6+k*.23;const p=new T.Mesh(new T.SphereGeometry(1,10,6),petals[k]);p.position.set(Math.sin(a)*(1.3-k*.5),k*.3,Math.cos(a)*(1.3-k*.5));p.scale.set(.65,.2,1.7-k*.4);p.rotation.y=a;p.rotation.x=-.4+k*.1;this.bloom.add(p);}
  const core=new T.Mesh(new T.IcosahedronGeometry(.8,2),luminous);this.bloom.add(core);this.bloom.position.set(0,5,0);scene.add(this.bloom);
  const shardMat=new T.MeshStandardMaterial({color:0xbfb48c,roughness:.85});for(let i=0;i<14;i++){const shard=new T.Mesh(new T.BoxGeometry(2+i%3,.24,1.6),shardMat);shard.position.set((i%2?1:-1)*(13+i%4),2+i%5,-16+i*2.5);shard.rotation.set(i*.4,i,0);this.splinters.add(shard);}scene.add(this.splinters);
 }
 update(s:GameState,dt:number){
  this.time+=dt;const t=this.time,ride=s.level===5,accident=s.level===4,final=s.level===6;
  this.skyMaterial.uniforms.glow.value=final&&s.seal>0?Math.sin(Math.min(1,s.seal/7)*Math.PI):0;
  this.leaves.visible=s.level>0;for(let i=0;i<100;i++){const z=((i*7.91+t*(ride&&s.bloom>0?18:1.2))%75)-40;this.matrix.position.set(Math.sin(i*53.2)*22,1+(i*.83+t*.2)%14,z);this.matrix.rotation.set(t+i,i*3+t*.6,i*1.4);this.matrix.scale.set(.07+(i%3)*.03,.012,.22);this.matrix.updateMatrix();this.leaves.setMatrixAt(i,this.matrix.matrix);}this.leaves.instanceMatrix.needsUpdate=true;
  this.orrery.visible=final;this.bloom.visible=final;this.orrery.scale.setScalar(.45+s.step*.13+(s.seal>0?.4:0));this.bloom.scale.setScalar(.12+s.bloom*.1+s.step*.16+(s.seal>0?Math.min(s.seal*.11,.7):0));
  this.rings.forEach((r,i)=>{r.rotation.y=t*(.1+i*.025);r.rotation.z=i*.6+Math.sin(t*.4+i)*.4;r.rotation.x=i*.5+Math.sin(t*.3+i)*.2;});this.bloom.rotation.y=t*.12;
  this.splinters.visible=accident||ride||final;this.splinters.children.forEach((o,i)=>{const spread=accident?Math.min(1,s.time/5):final?Math.max(0,1-s.seal/6):1;o.position.y=1+spread*(2+i%5+Math.sin(t*.5+i));o.rotation.z=spread*Math.sin(t*.3+i)*.25;});
 }
}
