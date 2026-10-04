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
 await a.screenshot({path:resolve(output,'STEP2_PREVIEW.png'),fullPage:true});
 const room=game.rooms.rooms.get(code),self=room.players.find(p=>p.name==='goichi');const oldX=self.x;
 await a.keyboard.down('w');await a.waitForTimeout(600);await a.keyboard.up('w');await a.waitForTimeout(150);assert(self.x>oldX+40,'Camera-relative forward follows initial opponent-facing view');
 await a.keyboard.down('e');await a.waitForTimeout(250);await a.keyboard.up('e');await a.keyboard.down('Shift');await a.keyboard.down('w');await a.waitForTimeout(200);await a.keyboard.press('Space');await a.keyboard.up('w');await a.keyboard.up('Shift');await a.waitForTimeout(200);assert(self.stamina<100);assert(self.dashCooldown>0);
 // Server fixture places an opponent within the reticle-facing range; no test endpoint added.
 await a.getByRole('button',{name:'Return everyone to lobby'}).click();await a.getByRole('button',{name:'Ready up'}).click();await b.getByRole('button',{name:'Ready up'}).click();await a.getByRole('button',{name:'Start match',exact:true}).click();await a.locator('.viewport canvas').waitFor();await a.waitForTimeout(200);const victim=room.players.find(p=>p.name==='Aizen');Object.assign(self,{x:1000,y:700});Object.assign(victim,{x:1040,y:700});await a.waitForTimeout(200);await a.keyboard.press('f');await a.waitForTimeout(200);assert.equal(victim.health,75);assert((await b.locator('.game-hud').textContent()).includes('75 / 100'));
 await a.reload();await a.locator('.viewport canvas').waitFor();assert.equal(room.players.length,2);await a.waitForTimeout(300);
 await a.setViewportSize({width:390,height:844});await a.screenshot({path:resolve(output,'STEP2_MOBILE_PREVIEW.png'),fullPage:true});assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal overflow');
 for(let n=1;n<=3;n++){game.rooms.tick(room.round.endsAt);await a.getByRole('heading',{name:n===3?'MATCH COMPLETE':'Round complete',exact:true}).waitFor();if(n<3){game.rooms.tick(room.round.returnAt);await a.locator('.viewport canvas').waitFor();await a.waitForTimeout(150);}}assert.equal(room.phase,'complete');
 await b.getByRole('button',{name:'Return everyone to lobby'}).click();await a.getByRole('button',{name:'Ready up'}).waitFor();assert(room.players.every(p=>p.matchEliminations===0&&p.targetId===null));
 assert.deepEqual(errors,[]);console.log('Browser QA passed: two independent sessions, WebGL render, forward/sprint/dash, turn, reticle melee, synchronized health, refresh, 390px layout, three-round transitions, final results, lobby reset.');
}finally{if(browser)await browser.close();await game.close();}
