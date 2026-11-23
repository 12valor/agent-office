import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const themes=[
  ['Standard Office','standard-office','office','standard'],
  ['Tropical Beach','tropical-beach','beach','beach'],
  ['Cyberpunk Rooftop','cyberpunk-rooftop','cyberpunk','rooftop'],
  ['Forest Cabin','forest-cabin','cozy','cabin'],
  ['Space Station','space-station','astronaut','station'],
];

const browser=await chromium.launch({executablePath:process.env.OFFICE_CHROMIUM || undefined,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(message.type()==='error'&&/synchronously unmount|WebGL context lost/.test(message.text())) errors.push(message.text());
  });
  await page.addInitScript(()=>{
    const resources={buffers:0,contexts:0};
    window.themeResources=resources;
    const {createBuffer,deleteBuffer}=WebGL2RenderingContext.prototype;
    const activeBuffers=new WeakSet();
    WebGL2RenderingContext.prototype.createBuffer=function(){
      const buffer=createBuffer.call(this);
      if(buffer){activeBuffers.add(buffer);resources.buffers++;}
      return buffer;
    };
    WebGL2RenderingContext.prototype.deleteBuffer=function(buffer){
      if(activeBuffers.delete(buffer))resources.buffers--;
      return deleteBuffer.call(this,buffer);
    };
    const contexts=new WeakSet();
    const getContext=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(...args){
      const context=getContext.apply(this,args);
      if(context instanceof WebGL2RenderingContext&&!contexts.has(context)){
        contexts.add(context);resources.contexts++;
      }
      return context;
    };
    const time=new Date().toISOString();
    const sessions=['Web System Builders','Studio Build','Talisay Tourism','Prototype'].map((name,i)=>({
      id:'theme-worker-'+i,cwd:'C:/fixture/'+name,name,isWsb:i===0,state:i===1?'active':'idle',
      activity:i===1?'Coding':undefined,model:'fixture-model',started:time,last:time,
    }));
    let count=3;
    window.EventSource=class {
      constructor(){
        const publish=()=>this.onmessage?.({data:JSON.stringify({sessions:sessions.slice(0,count),now:time})});
        window.addThemeWorker=()=>{count=4;publish();};
        window.setThemeTask=(index,state)=>{sessions[index].state=state;publish();};
        queueMicrotask(()=>{this.onopen?.();publish();});
      }
      close(){}
    };
  });
  const open=()=>page.getByRole('button',{name:'Office themes',exact:true}).click();
  const marker=id=>page.locator(`[data-session="theme-worker-${id}"]`);
  async function choose(label,id,outfit) {
    await open();
    await page.getByRole('button',{name:new RegExp(label)}).click();
    await page.locator(`main[data-theme="${id}"]`).waitFor();
    await marker(1).and(page.locator(`[data-outfit="${outfit}"][data-animation="WORKING"]`)).waitFor();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  async function shots(label) {
    if(!process.env.OFFICE_THEME_SHOTS&&!process.env.OFFICE_THEME_THUMBNAILS) return;
    const style='nextjs-portal {display:none}';
    if(process.env.OFFICE_THEME_SHOTS) {
      await page.setViewportSize({width:1920,height:1080});
      await page.waitForTimeout(420);
      await page.screenshot({path:path.join(process.env.OFFICE_THEME_SHOTS,`office-${label}-1920x1080.png`),style});
    }
    if(process.env.OFFICE_THEME_THUMBNAILS && label!=='beach') {
      await page.setViewportSize({width:516,height:300});
      await page.waitForTimeout(420);
      await page.screenshot({path:path.join(process.env.OFFICE_THEME_THUMBNAILS,label+'.jpg'),type:'jpeg',quality:88,
        style:style+'.office-header,.office-footer,.marker-layer,.theme-transition{display:none}'});
    }
    await page.setViewportSize({width:1366,height:768});
  }

  await page.goto('http://127.0.0.1:3000/',{waitUntil:'commit'});
  await marker(1).and(page.locator('[data-outfit="office"]')).waitFor({timeout:40000});
  await page.evaluate(()=>window.addThemeWorker());
  await marker(3).waitFor();
  await open();
  assert.equal(await page.getByRole('button',{name:/Standard Office/}).getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('.theme-choice').count(),themes.length);
  await page.keyboard.press('Escape');
  const activeNode=await marker(1).elementHandle();
  const canvas=await page.locator('canvas').elementHandle();
  for (const [label,id,outfit,shot] of themes) {
    if(id!=='standard-office') await choose(label,id,outfit);
    assert.equal(await page.locator(`[data-outfit="${outfit}"]`).count(),4);
    assert.equal(await marker(1).evaluate((node,saved)=>node===saved,activeNode),true);
    const resetCamera=page.getByRole('button',{name:'Reset camera'});
    await resetCamera.click();
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const home=await marker(1).boundingBox();
    await page.mouse.move(220,170);
    await page.mouse.down();
    await page.mouse.move(280,195,{steps:6});
    await page.mouse.up();
    await page.waitForFunction(({x,y})=>{
      const marker=document.querySelector('[data-session="theme-worker-1"]');
      const box=marker?.getBoundingClientRect();
      return box&&Math.hypot(box.x-x,box.y-y)>8;
    },home);
    // Let the orbit controls finish damping the drag before resetting the view.
    await page.waitForTimeout(550);
    await resetCamera.click();
    await page.waitForFunction(({x,y})=>{
      const marker=document.querySelector('[data-session="theme-worker-1"]');
      const box=marker?.getBoundingClientRect();
      return box&&Math.hypot(box.x-x,box.y-y)<4;
    },home,{timeout:8000}).catch(error=>{
      throw new Error('Camera failed to reset in '+label,{cause:error});
    });
    await shots(shot);
    await marker(1).click();
    await page.locator('[data-session-view="theme-worker-1"]').getByText('fixture-model').waitFor();
    await page.getByRole('button',{name:'Token Usage'}).click();
    await page.locator('dl[aria-label$="Token Usage"]').waitFor({state:'attached'});
    await page.keyboard.press('Escape');
    await marker(1).waitFor();
  }
  const baseline=await page.evaluate(()=>window.themeResources.buffers);
  for(let i=0;i<2;i++)for(const theme of themes) await choose(...theme);
  assert.equal(await page.locator('canvas').evaluate((node,saved)=>node===saved,canvas),true);
  const resources=await page.evaluate(()=>window.themeResources);
  assert.equal(resources.contexts,1);
  assert.ok(resources.buffers<=baseline+24,JSON.stringify({baseline,...resources}));
  console.log('Live GL buffers after two full theme cycles:',baseline,resources.buffers);
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.setThemeTask(3,'active'));
  await marker(3).and(page.locator('[data-animation="SPRINT"][data-outfit="astronaut"]')).waitFor();
  await marker(3).and(page.locator('[data-animation="WORKING"][data-outfit="astronaut"]')).waitFor();
  await page.evaluate(()=>window.setThemeTask(3,'completed'));
  await marker(3).and(page.locator('[data-animation="COUCH_IDLE"][data-outfit="astronaut"]')).waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('main[data-theme="space-station"]').waitFor();
  await marker(1).and(page.locator('[data-outfit="astronaut"][data-animation="WORKING"]')).waitFor();
  await page.evaluate(()=>window.addThemeWorker());
  await marker(3).and(page.locator('[data-outfit="astronaut"]')).waitFor();
  await open();
  assert.equal(await page.getByRole('button',{name:/Space Station/}).getAttribute('aria-pressed'),'true');
  const previews=page.locator('.theme-choice img');
  await previews.evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  assert.deepEqual(errors,[]);
  console.log('Theme persistence, mounted worker identity, new outfits, visor and repeated switches passed.');
} finally {await browser.close();}
