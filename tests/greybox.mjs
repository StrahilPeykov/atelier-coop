import { chromium } from 'playwright';
import fs from 'node:fs/promises';
await fs.mkdir('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
const errors=[];
const contexts=await Promise.all([browser.newContext({viewport:{width:1440,height:900}}),browser.newContext({viewport:{width:1440,height:900}})]);
const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));for(const [i,p]of[a,b].entries()){p.on('pageerror',e=>errors.push(`${i}: ${e.message}`));p.on('console',m=>{if(m.type()==='error')errors.push(`${i}: ${m.text()}`);});}
try{
 await a.goto('http://localhost:5173');await a.getByRole('button',{name:/Create a lesson/}).waitFor();await a.screenshot({path:'test-results/00-title-greybox.png'});
 await a.getByRole('button',{name:/Create a lesson/}).click();const code=await a.evaluate(()=>window.__MAGIC_GAME__.roomCode);console.log('Room',code);
 await b.goto(`http://localhost:5173/?room=${code}`);await b.getByRole('button',{name:/Join the lesson/}).click();await a.waitForFunction(()=>window.__MAGIC_GAME__.peerCount===2,{},{timeout:30000});await b.waitForFunction(()=>window.__MAGIC_GAME__.peerCount===2);
 console.log('RTC',await a.evaluate(()=>window.__MAGIC_GAME__.rtc));
 await a.getByRole('button',{name:'I’m ready'}).click();await b.getByRole('button',{name:'I’m ready'}).click();await a.getByRole('button',{name:/Begin the lesson/}).click();await b.waitForFunction(()=>window.__MAGIC_GAME__.gamePhase==='playing');
 await a.waitForTimeout(1200);await a.keyboard.down('KeyW');await a.waitForTimeout(850);await a.keyboard.press('Space');await a.waitForTimeout(400);await a.keyboard.up('KeyW');await a.waitForTimeout(500);
 console.log('Movement',await a.evaluate(()=>({local:window.__MAGIC_GAME__.localPlayer,remote:window.__MAGIC_GAME__.remotePlayer,stats:window.__MAGIC_GAME__.renderer})));
 await a.screenshot({path:'test-results/01-greybox-shaper.png'});await b.screenshot({path:'test-results/02-greybox-warden.png'});
 await a.evaluate(()=>window.__MAGIC_GAME__.loadCheckpoint(1));await b.waitForFunction(()=>window.__MAGIC_GAME__.currentCheckpoint===1);await a.waitForTimeout(500);
 await a.evaluate(()=>window.__MAGIC_GAME__.teleport(-2,0,6));await b.evaluate(()=>window.__MAGIC_GAME__.teleport(2,0,6));
 await a.keyboard.down('KeyE');await a.keyboard.down('KeyD');await a.waitForTimeout(370);await a.keyboard.up('KeyD');await b.keyboard.down('KeyE');await a.waitForTimeout(6800);await a.keyboard.up('KeyE');await b.keyboard.up('KeyE');
 console.log('Bridge',await a.evaluate(()=>window.__MAGIC_GAME__.currentPuzzle));await a.screenshot({path:'test-results/03-greybox-bridge.png'});
 console.log('Errors',errors);
}finally{await browser.close();}
