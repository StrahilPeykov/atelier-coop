import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// A second full playthrough, with the guest shaping and host blooming.
// No teleport, checkpoint loading, direct puzzle edits or synthetic game intents.
const browser=await chromium.launch({headless:true,args:['--enable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const contexts=await Promise.all([browser.newContext({viewport:{width:1100,height:720}}),browser.newContext({viewport:{width:1100,height:720}})]);
const [host,guest]=await Promise.all(contexts.map(c=>c.newPage()));
const report={started:new Date().toISOString(),checks:[],errors:[],performance:[]};
for(const p of [host,guest]){p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});}
const state=()=>host.evaluate(()=>window.__MAGIC_GAME__.state);
const position=p=>p.evaluate(()=>({...window.__MAGIC_GAME__.localPlayer}));
const wait=(p,fn,arg)=>p.waitForFunction(fn,arg,{timeout:45000,polling:80});
const check=s=>{report.checks.push(s);console.log('PASS',s);};
async function release(p){for(const k of ['KeyE','KeyA','KeyD','KeyW','KeyS','Space'])await p.keyboard.up(k);}
async function move(p,x,z){
 const started=Date.now();const epoch=(await state()).epoch;const keys=new Set();
 try{while(Date.now()-started<22000){if((await state()).epoch!==epoch)return;const v=await position(p);const dx=x-v.x,dz=z-v.z;if(Math.hypot(dx,dz)<.45)return;
  const wanted=new Set();if(Math.abs(dx)>.23)wanted.add(dx>0?'KeyD':'KeyA');if(Math.abs(dz)>.23)wanted.add(dz>0?'KeyS':'KeyW');
  for(const k of keys)if(!wanted.has(k)){await p.keyboard.up(k);keys.delete(k);}for(const k of wanted)if(!keys.has(k)){await p.keyboard.down(k);keys.add(k);}await p.waitForTimeout(90);
 }throw Error(`Traversal stalled toward ${x},${z}: ${JSON.stringify(await position(p))}`);
 }finally{await release(p);await p.waitForTimeout(160);}
}
async function together(x,z){await Promise.all([move(host,x-.5,z),move(guest,x+.5,z)]);}
async function align(target){const s=await state();await guest.keyboard.down('KeyE');if(Math.abs(s.shape-target)>.06){const key=s.shape<target?'KeyD':'KeyA';await guest.keyboard.down(key);await wait(host,({target,key})=>key==='KeyD'?window.__MAGIC_GAME__.state.shape>=target-.04:window.__MAGIC_GAME__.state.shape<=target+.04,{target,key});await guest.keyboard.up(key);}await guest.waitForTimeout(180);}
async function grow(step){await host.keyboard.down('KeyE');await wait(host,step=>window.__MAGIC_GAME__.state.step>step,step);await release(host);await release(guest);}
async function height(p,target){const current=(await state()).vineHeight;if(Math.abs(current-target)<.1)return;const key=current<target?'KeyW':'KeyS';await p.keyboard.down(key);await wait(host,({target,key})=>key==='KeyW'?window.__MAGIC_GAME__.state.vineHeight>=target-.08:window.__MAGIC_GAME__.state.vineHeight<=target+.08,{target,key});await p.keyboard.up(key);}
async function next(n){await wait(guest,n=>window.__MAGIC_GAME__.currentCheckpoint===n,n);await host.waitForTimeout(800);}
async function shot(name){await host.screenshot({path:`test-results/traversal-${name}-warden.png`});await guest.screenshot({path:`test-results/traversal-${name}-shaper.png`});report.performance.push({name,host:await host.evaluate(()=>window.__MAGIC_GAME__.renderer),guest:await guest.evaluate(()=>window.__MAGIC_GAME__.renderer)});}
try{
 await fs.mkdir('test-results',{recursive:true});await host.goto('http://localhost:4173/?local=1&debug=1');await host.getByRole('button',{name:/Create a lesson/}).click();const code=await host.evaluate(()=>window.__MAGIC_GAME__.roomCode);
 await guest.goto(`http://localhost:4173/?local=1&debug=1&room=${code}`);await guest.getByRole('button',{name:/Join the lesson/}).click();await wait(guest,()=>window.__MAGIC_GAME__.peerCount===2);
 await host.getByRole('button',{name:/Swap disciplines/}).click();await wait(guest,()=>window.__MAGIC_GAME__.localRole==='Shaper');await host.getByRole('button',{name:'I’m ready'}).click();await guest.getByRole('button',{name:'I’m ready'}).click();await host.getByRole('button',{name:/Begin the lesson/}).click();await next(0);
 await together(0,4);await align(0);await grow(0);await Promise.all([move(host,-4,0),move(guest,4,0)]);await host.keyboard.press('KeyR');await guest.keyboard.press('KeyR');await next(1);check('Swapped roles complete the teaching seal using continuous keyboard traversal');
 await together(0,6);await align(-.65);await grow(0);
 for(const [x,z]of [[0,5],[-2.5,1],[-5,-3]])await together(x,z);
 assert((await position(host)).y>-.3);assert((await position(guest)).y>-.3);await align(.65);await grow(1);
 for(const [x,z]of [[-1,-8],[3,-14]])await together(x,z);
 await next(2);check('Both root sections crossed continuously, including the middle island');
 await together(0,9.7);
 await Promise.all([host,guest].map(async p=>{await p.keyboard.down('KeyW');await p.keyboard.press('Space');await wait(p,()=>window.__MAGIC_GAME__.localPlayer.z<6.7);await release(p);await wait(p,()=>window.__MAGIC_GAME__.localPlayer.grounded);}));
 await wait(host,()=>window.__MAGIC_GAME__.state.flags[0]===1);check('Both apprentices jump aboard the flower from the real entry landing');
 for(let i=0;i<3;i++){
  await align([-7/9,7/9,0][i]);await release(guest);const goal=([3,6,4][i]-1)/6;const key=(await state()).bloom<goal?'KeyW':'KeyS';await host.keyboard.down('KeyE');await host.keyboard.down(key);await wait(host,({goal,key})=>key==='KeyW'?window.__MAGIC_GAME__.state.bloom>=goal-.025:window.__MAGIC_GAME__.state.bloom<=goal+.025,{goal,key});await release(host);
  await wait(host,()=>window.__MAGIC_GAME__.state.players.every(p=>Math.abs(p.transform.y-(1+window.__MAGIC_GAME__.state.bloom*6))<1));await guest.keyboard.press('KeyR');await wait(host,i=>window.__MAGIC_GAME__.state.step>i,i);
 }
 await wait(host,()=>window.__MAGIC_GAME__.state.ferryZ<-11.6);await shot('flower');await together(0,-15);await next(3);check('Host Warden raises and lowers; guest Shaper steers; both disembark onto the far landing');
 await together(0,4);for(let i=0;i<3;i++){await align([-.65,.6,0][i]);await grow(i);}await Promise.all([move(host,-5,-4),move(guest,5,-4)]);await host.keyboard.press('KeyR');await guest.keyboard.press('KeyR');await next(4);
 await shot('split');assert((await position(host)).x>0);assert((await position(guest)).x<0);check('Asymmetric gallery follows discipline after swapping characters');
 for(let i=0;i<3;i++){await align([-.8,.8,0][i]);await grow(i);}await next(5);
 await host.keyboard.down('KeyE');for(let i=0;i<6;i++){await align([-.8,.8,0,-.8,0,.8][i]);await release(guest);await height(host,[1,4,2,5,2,4][i]);await wait(host,i=>window.__MAGIC_GAME__.state.ride>=(i+1)*12||window.__MAGIC_GAME__.state.level===6,i);if(i===2)await shot('vine');}await release(host);await next(6);check('Swapped disciplines steer and grow the complete six-arch ride');
 await together(0,4);for(let i=0;i<3;i++){await align([-.65,.65,0][i]);await grow(i);}await Promise.all([move(host,-5,0),move(guest,5,0)]);await host.keyboard.press('KeyR');await guest.keyboard.press('KeyR');await wait(guest,()=>window.__MAGIC_GAME__.gamePhase==='ending');await shot('ending');check('Entire chapter completed in swapped roles without teleporting or loading checkpoints');
 assert.equal(report.errors.length,0,'No browser errors');
}catch(e){report.failure=String(e);console.error(e);console.log(JSON.stringify(await state()));console.log('POSITIONS',await position(host),await position(guest));await shot('failure').catch(()=>{});process.exitCode=1;}
finally{report.finished=new Date().toISOString();await fs.writeFile('test-results/traversal-report.json',JSON.stringify(report,null,2));await browser.close();}
