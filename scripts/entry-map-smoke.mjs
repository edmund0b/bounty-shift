import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {MAPS} from '../shared/map.ts';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../server/index.ts');
const game=await createGameServer(true);await new Promise(r=>game.server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.BOUNTY_QA_BROWSER,headless:true,args:['--no-sandbox','--no-zygote','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const a=await browser.newPage({viewport:{width:1366,height:768}}),mobile=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true}),b=await mobile.newPage(),errors=[];for(const p of[a,b])p.on('pageerror',e=>errors.push(e.message));
 const url=`http://127.0.0.1:${game.server.address().port}`;
 await a.goto(url);await a.getByLabel('Display name').fill('Map Host');await a.getByRole('button',{name:'CREATE ROOM',exact:true}).click();await a.locator('.code').waitFor();const code=await a.locator('.code').getAttribute('data-room-code');
 await b.goto(url);await b.getByLabel('Display name').fill('Map Player');await b.getByLabel('Room code').fill(code);await b.getByRole('button',{name:'JOIN',exact:true}).click();
 const room=game.rooms.rooms.get(code);
 for(const mapId of Object.keys(MAPS)){
  await a.getByRole('button',{name:'READY UP',exact:true}).click();await b.getByRole('button',{name:'READY UP',exact:true}).click();await a.getByRole('button',{name:'START MATCH',exact:true}).click();await a.locator('canvas').waitFor();await b.locator('canvas').waitFor();assert.equal(room.mapId,'central_plaza');
  if(mapId!=='central_plaza'){game.rooms.tick(room.round.endsAt);room.nextMapId=mapId;room.nextMapVariant=mapId==='aerie_sky_port'?'night':null;game.rooms.tick(room.round.returnAt);room.round.endsAt=Date.now()+90000;}
  for(const page of[a,b]){
   await page.waitForFunction(m=>document.querySelector('.viewport canvas')?.dataset.mapId===m,mapId);await page.waitForTimeout(200);
   assert.equal(await page.locator('.graphics-error').count(),0);assert.equal(await page.locator('.minimap').count(),1);assert.equal(await page.locator('#health').count(),1);assert.equal(await page.locator('#stamina').count(),1);assert.equal(await page.locator('.entry-screen').count(),0);
   const m=await page.evaluate(()=>{const r=document.querySelector('.viewport canvas').getBoundingClientRect();return {w:r.width,h:r.height,iw:innerWidth,ih:innerHeight,scroll:document.documentElement.scrollHeight};});assert.equal(m.w,m.iw);assert.equal(m.h,m.ih);assert(m.scroll<=m.ih);
  }
  assert.equal(room.players.length,2);assert(room.players.every(p=>p.socket));await a.getByRole('button',{name:'Return everyone to lobby'}).click();await a.locator('.entry-lobby').waitFor();await b.locator('.entry-lobby').waitFor();assert.equal(room.mapId,'central_plaza');assert(room.players.every(p=>!p.ready));
  console.log(`PASS: existing ${MAPS[mapId].name} renders on both clients, synchronized map/minimap, preserved HUD and full-screen canvas, returns to real lobby.`);
 }
 assert.deepEqual(errors,[]);
}finally{if(browser)await browser.close();await game.close();}
