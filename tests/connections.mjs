import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const online=process.argv.includes('--online'),base='http://localhost:4173/';
const browser=await chromium.launch({headless:true,args:['--enable-gpu','--disable-background-timer-throttling','--disable-renderer-backgrounding']});
const contexts=await Promise.all([browser.newContext({viewport:{width:900,height:700}}),browser.newContext({viewport:{width:900,height:700}})]);
const a=await contexts[0].newPage();let b=await contexts[1].newPage();const log=[];
const url=(code='')=>base+`?debug=1&${online?'online':'local'}=1${code?'&room='+code:''}`;
const inspect=p=>p.evaluate(()=>({status:window.__MAGIC_GAME__.connectionState,code:window.__MAGIC_GAME__.roomCode,rtc:window.__MAGIC_GAME__.rtc,phase:window.__MAGIC_GAME__.gamePhase,peers:window.__MAGIC_GAME__.peerCount,events:window.__MAGIC_GAME__.recentEvents}));
async function wait(p,fn,label){try{await p.waitForFunction(fn,null,{timeout:35000});log.push(label);console.log('PASS',label);}catch(e){console.log('HOST',await inspect(a).catch(()=>null));console.log('GUEST',await inspect(b).catch(()=>null));throw e;}}
try{
 await a.goto(url());await a.getByRole('button',{name:/Create a lesson/}).click();const code=await a.evaluate(()=>window.__MAGIC_GAME__.roomCode);await b.goto(url(code));await b.getByRole('button',{name:/Join the lesson/}).click();await wait(b,()=>window.__MAGIC_GAME__.peerCount===2,'initial connection');
 await a.getByRole('button',{name:'I’m ready'}).click();await b.getByRole('button',{name:'I’m ready'}).click();await a.getByRole('button',{name:/Begin the lesson/}).click();await wait(b,()=>window.__MAGIC_GAME__.gamePhase==='playing','start');
 await b.close();await wait(a,()=>window.__MAGIC_GAME__.connectionState==='disconnected','guest disconnect');await a.getByRole('button',{name:/Return both players to the room/}).click();await wait(a,()=>window.__MAGIC_GAME__.gamePhase==='lobby','return lobby');
 b=await contexts[1].newPage();await b.goto(url(code));await b.getByRole('button',{name:/Join the lesson/}).click();await wait(b,()=>window.__MAGIC_GAME__.peerCount===2,'replacement guest');
 await a.close();await wait(b,()=>window.__MAGIC_GAME__.connectionState==='disconnected','host disconnect');
}catch(e){log.push('FAIL '+e);console.error(e);process.exitCode=1;}finally{await fs.writeFile(`test-results/connections-${online?'online':'local'}.json`,JSON.stringify(log,null,2));await browser.close();}
