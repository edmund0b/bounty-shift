import assert from 'node:assert/strict';
import { chromium as browserEngine } from 'playwright-core';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
process.env.BOUNTY_TEST='1';
const {createGameServer}=await import('../server/index.ts');
const game=await createGameServer(true);await new Promise(r=>game.server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${game.server.address().port}`;
const output=resolve(process.env.BOUNTY_QA_OUTPUT||resolve(tmpdir(),'bounty-shift-qa'));await mkdir(output,{recursive:true});
let browser;
try{
 browser=await browserEngine.launch({executablePath:process.env.BOUNTY_QA_BROWSER||undefined,args:['--no-sandbox','--no-zygote','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],headless:true});
 const ca=await browser.newContext({viewport:{width:1440,height:1050}}),cb=await browser.newContext({viewport:{width:1440,height:1050}});const a=await ca.newPage(),b=await cb.newPage();const errors=[];for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
 await a.goto(url);await a.getByLabel('Display name').fill('goichi');await a.getByRole('button',{name:'Create room'}).click();await a.locator('.code').waitFor();const code=await a.locator('.code').textContent();
 await b.goto(url);await b.getByLabel('Display name').fill('Aizen');await b.getByLabel('Room code').fill(code);await b.getByRole('button',{name:'Join room'}).click();await b.getByRole('button',{name:'Ready up'}).click();await a.getByRole('button',{name:'Ready up'}).click();await a.getByRole('button',{name:'Start match',exact:true}).click();await a.locator('.viewport canvas').waitFor();await b.locator('.viewport canvas').waitFor();await a.waitForTimeout(1300);
 // Verify containment of actual gameplay content, not only hidden document overflow.
 const sizes=[[1920,1080],[1440,900],[1366,768],[1280,720],[1024,600],[800,450],[640,360],[390,844],[375,667],[320,568],[844,390]];
 async function checkLayout(page){
  const metrics=await page.evaluate(()=>{
   const selectors=['.game-screen>header','.objective','.viewport','.game-hud','.hint','.legend','.touch-controls','.game-hud label','.game-hud span','.game-hud progress','.touch-controls button','.legend li','.arena-section>.panel>*'];
   const items=selectors.flatMap(s=>[...document.querySelectorAll(s)]).filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {name:e.className||e.tagName,x:r.x,y:r.y,right:r.right,bottom:r.bottom,height:r.height};});
   return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,items};
  });
  assert(metrics.scrollWidth<=metrics.width&&metrics.scrollHeight<=metrics.height,JSON.stringify(metrics));
  for(const r of metrics.items)assert(r.x>=-1&&r.y>=-1&&r.right<=metrics.width+1&&r.bottom<=metrics.height+1,JSON.stringify(r));
  const arena=metrics.items.find(r=>r.name==='viewport');
  if(arena)assert(arena.height>=metrics.height*.35,'Arena must remain a substantial part of the viewport: '+JSON.stringify(metrics));
 }
 for(const [width,height] of sizes){await a.setViewportSize({width,height});await a.waitForTimeout(80);await checkLayout(a);}
 await a.mouse.wheel(0,500);assert.equal(await a.evaluate(()=>scrollY),0);
 await a.setViewportSize({width:1366,height:768});await a.waitForTimeout(100);
 await a.screenshot({path:resolve(output,'STEP2_PREVIEW.png'),fullPage:true});
 const room=game.rooms.rooms.get(code),self=room.players.find(p=>p.name==='goichi');const oldX=self.x;
 await a.keyboard.down('w');await a.waitForTimeout(600);await a.keyboard.up('w');await a.waitForTimeout(150);assert(self.x>oldX+40,'Camera-relative forward follows initial opponent-facing view');
 await a.keyboard.down('e');await a.waitForTimeout(250);await a.keyboard.up('e');await a.keyboard.down('Shift');await a.keyboard.down('w');await a.waitForTimeout(200);await a.keyboard.press('Space');await a.keyboard.up('w');await a.keyboard.up('Shift');await a.waitForTimeout(200);assert(self.stamina<100);assert(self.dashCooldown>0);
 // Server fixture places an opponent within the reticle-facing range; no test endpoint added.
 await a.getByRole('button',{name:'Return everyone to lobby'}).click();await a.getByRole('button',{name:'Ready up'}).click();await b.getByRole('button',{name:'Ready up'}).click();await a.getByRole('button',{name:'Start match',exact:true}).click();await a.locator('.viewport canvas').waitFor();await a.waitForTimeout(200);const victim=room.players.find(p=>p.name==='Aizen');Object.assign(self,{x:1000,y:700});Object.assign(victim,{x:1040,y:700});await a.waitForTimeout(200);await a.keyboard.press('f');await a.waitForTimeout(200);assert.equal(victim.health,75);await b.waitForFunction(()=>document.querySelector('.game-hud')?.textContent.includes('75 / 100'));
 await a.reload();await a.locator('.viewport canvas').waitFor();assert.equal(room.players.length,2);await a.waitForTimeout(300);
 await a.setViewportSize({width:390,height:844});await a.screenshot({path:resolve(output,'STEP2_MOBILE_PREVIEW.png'),fullPage:true});assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
 for(let n=1;n<=3;n++){game.rooms.tick(room.round.endsAt);await a.getByRole('heading',{name:n===3?'MATCH COMPLETE':'Round complete',exact:true}).waitFor();await checkLayout(a);if(n<3){game.rooms.tick(room.round.returnAt);await a.locator('.viewport canvas').waitFor();await a.waitForTimeout(150);}}assert.equal(room.phase,'complete');
 await b.getByRole('button',{name:'Return everyone to lobby'}).click();await a.getByRole('button',{name:'Ready up'}).waitFor();assert(room.players.every(p=>p.matchEliminations===0&&p.targetId===null));assert.equal(await a.evaluate(()=>document.documentElement.classList.contains('match-open')),false,'Lobby restores normal page flow');
 assert.deepEqual(errors,[]);console.log('Browser QA passed: two independent sessions, WebGL render, forward/sprint/dash, turn, reticle melee, synchronized health, refresh, 11 viewport sizes without overflow or clipped HUD, three-round transitions, final results, lobby reset.');
}finally{if(browser)await browser.close();await game.close();}
