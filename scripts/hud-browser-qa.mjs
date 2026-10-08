import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {WebSocket} from 'ws';
import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../server/index.ts');
const game=await createGameServer(true);await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${game.server.address().port}`,out=resolve('polish-previews');await mkdir(out,{recursive:true});
const wait=async fn=>{let end=Date.now()+10000;while(!fn()){if(Date.now()>end)throw Error('State timeout');await new Promise(r=>setTimeout(r,30));}};
let browser,ws;const mobile=process.argv.includes('--mobile');
try{
 console.log('Launching',mobile?'phone':'desktop');
 browser=await chromium.launch({executablePath:process.env.BOUNTY_QA_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1366,height:768},hasTouch:mobile,isMobile:mobile});const page=await context.newPage();page.setDefaultTimeout(15000);let errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);console.log('Loaded');await page.getByLabel('Display name').fill('Host');await page.getByRole('button',{name:'CREATE ROOM',exact:true}).click();await page.locator('.code').waitFor({state:'attached'});const code=await page.locator('.code').getAttribute('data-room-code'),room=game.rooms.rooms.get(code);
 ws=new WebSocket(url.replace('http:','ws:')+'/ws');await new Promise(r=>ws.once('open',r));const send=m=>ws.send(JSON.stringify(m));send({type:'join',name:'Runner',code});await wait(()=>room.players.length===2);console.log('Lobby joined');
 if(!mobile){for(const [width,height] of [[1366,768],[1280,720],[1024,768],[800,600]]){await page.setViewportSize({width,height});await page.waitForTimeout(100);const fit=await page.evaluate(()=>({page:document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth,controls:[...document.querySelectorAll('.entry-lobby button,.leave-lobby')].filter(e=>e.getClientRects().length).every(e=>{let r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;})}));assert(fit.page&&fit.controls,`Lobby fit ${width}: ${JSON.stringify(fit)}`);await page.screenshot({path:resolve(out,`Lobby_${width}.png`)});console.log('Fit',width,height);}await page.setViewportSize({width:1366,height:768});}
 else{await page.getByRole('button',{name:'PLAYERS / ROOM CODE',exact:true}).tap();assert(await page.getByRole('button',{name:'COPY',exact:true}).isVisible());await page.getByRole('button',{name:'GAME MODE / SETTINGS',exact:true}).tap();await page.screenshot({path:resolve(out,'Lobby_Phone.png')});}
 for(const mode of ['TAG','KILL RACE','FLAG RUN']){
 await page.getByRole('button',{name:`Select ${mode}`,exact:true}).click();await page.getByRole('button',{name:'READY UP',exact:true}).click();send({type:'ready',ready:true});await page.getByRole('button',{name:'START MATCH',exact:true}).click();await wait(()=>room.phase==='arena');room.round.endsAt=Date.now()+600000;await page.locator('canvas').waitFor();console.log('Arena',mode);await page.waitForTimeout(300);
 const p=room.players[0];assert.equal(await page.locator('.graphics-error').count(),0);assert.equal(await page.locator('.loadout-slot').count(),3);assert(!/\d/.test(await page.locator('.stamina-line').innerText()));
 if(!mobile){await page.getByRole('button',{name:/HIDE CONTROLS/}).click();console.log('Hints',await page.locator('.control-hints').getAttribute('class'),await page.evaluate(()=>matchMedia('(pointer:coarse)').matches));await page.waitForFunction(()=>getComputedStyle(document.querySelector('.hint-cards')).visibility==='hidden');const seen=p.dashSeen;await page.keyboard.press('z');await wait(()=>p.dashSeen>seen);await page.getByRole('button',{name:/SHOW CONTROLS/}).click();}
 else {assert(await page.getByRole('button',{name:'Attack',exact:true}).isVisible());assert(await page.getByRole('button',{name:'Contextual interaction',exact:true}).isVisible());}
 await page.getByRole('button',{name:'Expand map',exact:true}).click();await page.getByRole('dialog').waitFor();const ack=p.ack;await page.waitForTimeout(300);assert(p.ack>ack,'Server continues with map open');assert.equal(await page.locator('.minimap svg').count(),1);await page.screenshot({path:resolve(out,`Map_${mobile?'Phone':'Desktop'}.png`)});if(mobile)await page.getByRole('button',{name:'Close map',exact:true}).tap();else await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
 const item=room.mode.items.find(i=>i.source==='floor');Object.assign(p,{x:item.x,y:item.y,elevation:item.elevation??0,dashRemaining:0});game.rooms.broadcast(room);await page.waitForTimeout(150);if(mobile)await page.getByRole('button',{name:'Contextual interaction',exact:true}).tap();else{await page.locator('canvas').focus();await page.keyboard.press('e');}await wait(()=>!!p.heldItem);await page.waitForFunction(()=>document.querySelector('.loadout-slot.equipped')?.getAttribute('data-item')!=='hand');
 assert(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight));await page.screenshot({path:resolve(out,`${mode.replaceAll(' ','_')}_${mobile?'Phone':'Desktop'}.png`)});
 await page.getByRole('button',{name:'Return everyone to lobby'}).click();await page.locator('.entry-lobby').waitFor();console.log('PASS',mode);
 }
 assert.deepEqual(errors,[]);console.log('PASS all HUD checks');
}finally{ws?.terminate();await browser?.close();await game.close();}
