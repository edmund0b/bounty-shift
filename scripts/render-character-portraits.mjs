// Offline asset export from the real character rigs. No portrait renderer runs in the HUD.
import {createServer} from 'vite';
import {chromium} from 'playwright-core';
import {mkdir,writeFile} from 'node:fs/promises';
const app=await createServer({server:{host:'127.0.0.1',port:0},appType:'custom'});
app.middlewares.use('/__portrait',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end(`<script type="module">
import * as T from '/node_modules/.vite/deps/three.js';
import {characters} from '/src/characters/registry.ts';
import {createRig,disposeTree} from '/src/characters/rig.ts';
window.exportPortrait=(id)=>{
 const scene=new T.Scene();scene.background=new T.Color('#102132');
 const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(512,640);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 const rig=createRig(characters.find(c=>c.id===id));rig.ring.visible=false;scene.add(rig.root);rig.root.updateMatrixWorld(true);
 const bounds=new T.Box3().setFromObject(rig.head),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const height=Math.max(Math.min(size.y+.42,1.45),(size.x+.15)/.8)*1.08;
 const framingY=bounds.max.y+.12-height/2;
 const camera=new T.OrthographicCamera(-height*.4,height*.4,height*.5,-height*.5,.01,30);camera.position.set(center.x,framingY,7);camera.lookAt(center.x,framingY,0);
 scene.add(new T.HemisphereLight(0xcceaff,0x253646,1.4));for(const [x,y,z,power] of [[3,5,5,2.8],[-3,3,4,1.6],[2,4,-3,2]]){const light=new T.DirectionalLight(0xe1efff,power);light.position.set(x,y,z);scene.add(light);}
 renderer.render(scene,camera);const data=renderer.domElement.toDataURL('image/png');disposeTree(scene);renderer.dispose();return data;
};window.portraitIds=characters.map(c=>c.id);
</script>`);});
let browser;
try{await app.listen();const port=app.httpServer.address().port;browser=await chromium.launch({executablePath:process.env.BOUNTY_QA_BROWSER,headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage();page.on('pageerror',e=>console.error(e));await page.goto(`http://127.0.0.1:${port}/__portrait`);await page.waitForFunction(()=>window.exportPortrait);await mkdir('public/portraits',{recursive:true});for(const id of await page.evaluate(()=>window.portraitIds)){const url=await page.evaluate(id=>window.exportPortrait(id),id);await writeFile(`public/portraits/${id}.png`,Buffer.from(url.split(',')[1],'base64'));console.log('Exported',id);}}
finally{await browser?.close();await app.close();}
