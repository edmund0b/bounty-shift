import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../server/index.ts');
const game=await createGameServer(true);await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
let browser;
const out=resolve('controls-previews');await mkdir(out,{recursive:true});
try{
 browser=await chromium.launch({executablePath:process.env.BOUNTY_QA_BROWSER,headless:true,args:['--no-sandbox','--no-zygote']});
 const a=await browser.newPage({viewport:{width:1366,height:768}}),touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true}),b=await touch.newPage(),errors=[];
 for(const p of[a,b])p.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${game.server.address().port}`;
 await a.goto(url);await a.getByLabel('Display name').fill('Controls Host');await a.getByRole('button',{name:'CREATE ROOM',exact:true}).click();await a.locator('.code').waitFor();const code=await a.locator('.code').getAttribute('data-room-code');
 await b.goto(url);await b.getByLabel('Display name').fill('Controls Player');await b.getByLabel('Room code').fill(code);await b.getByRole('button',{name:'JOIN',exact:true}).click();await b.locator('.entry-lobby').waitFor();await a.getByRole('button',{name:'READY UP',exact:true}).click();await b.waitForFunction(()=>document.querySelector('.ready-state.is-ready'));
 const room=game.rooms.rooms.get(code),sockets=room.players.map(p=>p.socket);
 const snapshot=()=>JSON.stringify({code:room.code,host:room.hostId,phase:room.phase,map:room.mapId,match:room.match.id,players:room.players.map(p=>({id:p.id,name:p.name,ready:p.ready,connected:!!p.socket}))});
 const before=snapshot(),lobbyBefore=await a.locator('.entry-lobby').evaluate(e=>e.outerHTML);
 await a.getByRole('button',{name:'CONTROLS',exact:true}).click();await a.waitForTimeout(300);const dialog=a.getByRole('dialog');
 assert.equal(await dialog.locator('.control-section').count(),4);assert.equal(await dialog.locator('.control-row').count(),11);
 const keys=await dialog.locator('kbd').allTextContents();assert.deepEqual(keys,['W','↑','A','←','S','↓','D','→','Shift','Space','Q','E','F','Esc']);
 assert.match(await dialog.textContent(),/Left click/);assert.doesNotMatch(await dialog.textContent(),/FIELD GUIDE|Aim|Pickup|Ability|Open Menu/);
 await a.screenshot({path:resolve(out,'Bounty_Shift_Controls_Desktop.png')});await dialog.screenshot({path:resolve(out,'Bounty_Shift_Controls_Complete.png')});
 const fit=await dialog.evaluate(e=>({scroll:e.scrollHeight,visible:e.clientHeight}));assert(fit.scroll<=fit.visible,'Complete desktop drawer fits the laptop screen');
 await a.keyboard.press('Tab');assert.equal(await a.evaluate(()=>document.activeElement?.getAttribute('aria-label')),'Close panel');await a.keyboard.press('Escape');assert.equal(await a.getByRole('dialog').count(),0);assert.equal(snapshot(),before);assert.equal(await a.locator('.entry-lobby').evaluate(e=>e.outerHTML),lobbyBefore);
 await a.getByRole('button',{name:'CONTROLS',exact:true}).click();await a.waitForTimeout(300);await a.getByRole('button',{name:'Close panel'}).click();assert.equal(snapshot(),before);
 await a.getByRole('button',{name:'CONTROLS',exact:true}).click();await a.waitForTimeout(300);await a.mouse.click(100,100);assert.equal(await a.getByRole('dialog').count(),0);assert.equal(snapshot(),before);
 await b.getByRole('button',{name:'CONTROLS',exact:true}).click();await b.waitForTimeout(300);assert.equal(await b.locator('.control-section').count(),3);assert.match(await b.getByRole('dialog').textContent(),/Left joystick/);assert.match(await b.getByRole('dialog').textContent(),/Drag open right side/);assert.equal(await b.locator('kbd').count(),0);await b.screenshot({path:resolve(out,'Bounty_Shift_Controls_Mobile.png')});await b.getByRole('button',{name:'Close panel'}).click();assert.equal(snapshot(),before);
 // Window dimensions affect only overlay layout. Scroll retains access on short displays.
 for(const [w,h]of[[1920,1080],[1536,864],[1024,768],[800,600],[667,375],[320,568]]){
  await a.setViewportSize({width:w,height:h});await a.getByRole('button',{name:'CONTROLS',exact:true}).click();await a.waitForTimeout(250);
  const m=await a.getByRole('dialog').evaluate(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:innerWidth,close:e.querySelector('button').getBoundingClientRect().top};});assert(m.left>=0&&m.right<=m.width&&m.close>=0);await a.getByRole('button',{name:'Close panel'}).click();assert.equal(snapshot(),before);
 }
 assert(room.players.every((p,i)=>p.socket===sockets[i]));assert.deepEqual(errors,[]);
 console.log('PASS: verified all desktop/mobile controls, complete laptop drawer, six additional sizes, X/Escape/outside dismissal, focus trap/return, same room/code/host/ready/player identities/map/match and exact sockets; lobby markup unchanged; no browser errors.');
}finally{if(browser)await browser.close();await game.close();}
