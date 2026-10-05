// Verify capability changes on the same live match, without a reload or second HUD.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
process.env.BOUNTY_TEST = '1';
const { createGameServer } = await import('../server/index.ts');
const game = await createGameServer(true);
await new Promise(r => game.server.listen(0, '127.0.0.1', r));
let browser;
try {
 browser = await chromium.launch({executablePath:process.env.BOUNTY_QA_BROWSER||undefined,headless:true,args:['--no-sandbox','--no-zygote','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const host = await browser.newPage({viewport:{width:1024,height:600}});
 const context = await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
 const player = await context.newPage();
 const url = `http://127.0.0.1:${game.server.address().port}`;
 await host.goto(url);await host.getByLabel('Display name').fill('Mode Host');await host.getByRole('button',{name:'Create room'}).click();await host.locator('.code').waitFor();const code=await host.locator('.code').getAttribute('data-room-code');
 await player.goto(url);await player.getByLabel('Display name').fill('Mode Player');await player.getByLabel('Room code').fill(code);await player.getByRole('button',{name:'JOIN'}).click();
 await player.getByRole('button',{name:'Ready up'}).click();await host.getByRole('button',{name:'Ready up'}).click();await host.getByRole('button',{name:'START MATCH',exact:true}).click();await player.locator('.viewport canvas').waitFor();
 const room=game.rooms.rooms.get(code),self=room.players.find(p=>p.name==='Mode Player'),before={id:self.id,x:self.x,y:self.y,map:room.mapId,round:room.match.roundNumber};
 const canvas=await player.locator('canvas').elementHandle();
 const input=await context.newCDPSession(player);
 for(const touch of [true,false,true,false,true]){
  await input.send('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:5});
  await player.waitForFunction(t=>matchMedia('(pointer:coarse)').matches===t,touch);
  const state=await player.evaluate(()=>{
   const visible=s=>getComputedStyle(document.querySelector(s)).display!=='none';
   const r=document.querySelector('.player-status').getBoundingClientRect();
   return {health:document.querySelectorAll('#health').length,stamina:document.querySelectorAll('#stamina').length,joystick:visible('.joystick'),actions:visible('.touch-controls'),portrait:visible('.player-portrait'),top:r.y,bottom:r.bottom,height:innerHeight};
  });
  assert.equal(state.health,1);assert.equal(state.stamina,1);assert.equal(state.joystick,touch);assert.equal(state.actions,touch);assert.equal(state.portrait,!touch);
  assert(touch?state.top<state.height/2:state.bottom>state.height*.9,'Status changes position on the same match');
  assert(await canvas.evaluate(e=>e===document.querySelector('canvas')),'Same renderer canvas survives input-mode switch');
 }
 assert.deepEqual({id:self.id,x:self.x,y:self.y,map:room.mapId,round:room.match.roundNumber},before);assert.equal(room.players.length,2);
 console.log('PASS: five live touch/fine-pointer switches; one shared HUD/canvas, correct status and controls, unchanged identity/position/map/round/connection.');
} finally {if(browser)await browser.close();await game.close();}
