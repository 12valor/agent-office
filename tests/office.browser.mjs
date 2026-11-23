import assert from 'node:assert/strict';
import path from 'node:path';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: process.env.OFFICE_CHROMIUM || undefined,
  args: ['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
});
try {
  const page = await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:3000/',{waitUntil:'commit',timeout:60000});
  try {
    await page.getByRole('button',{name:'Codex usage',exact:true}).waitFor({timeout:50000});
  } catch (error) {
    console.error(await page.locator('body').innerText(),errors);
    throw error;
  }
  await page.getByText('Monitor connected',{exact:true}).waitFor();
  assert.deepEqual(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight]),[1920,1080]);
  if(process.env.OFFICE_SCREENSHOT) await page.screenshot({path:process.env.OFFICE_SCREENSHOT,style:'nextjs-portal { display: none }'});
  await page.setViewportSize({width:1366,height:768});
  await page.getByRole('button',{name:'Reset camera'}).click();
  assert.deepEqual(await page.evaluate(()=>[document.documentElement.scrollWidth,document.documentElement.scrollHeight]),[1366,768]);
  if(process.env.OFFICE_LAPTOP_SCREENSHOT) await page.screenshot({path:process.env.OFFICE_LAPTOP_SCREENSHOT,style:'nextjs-portal { display: none }'});
  await page.getByRole('button',{name:'Codex usage',exact:true}).click();
  await page.getByRole('heading',{name:'Account limits'}).waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'Codex usage',exact:true}).evaluate(button=>button===document.activeElement),true);
  await page.getByRole('button',{name:'Compute rack',exact:true}).click();
  await page.getByText('System RAM',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Close details'}).click();
  await page.getByRole('button',{name:'Session history'}).click();
  await page.getByRole('heading',{name:'Session history'}).waitFor();
  await page.keyboard.press('Escape');
  for (const [button,heading] of [['Settings','Office settings'],['Test bench','Test bench'],['Deployment','Deployment station']]) {
    await page.getByRole('button',{name:button,exact:true}).click();
    const panel=page.getByRole('dialog',{name:heading,exact:true});
    await panel.waitFor();
    await page.mouse.click(20,200);
    await panel.waitFor({state:'hidden'});
  }
  await page.mouse.move(1090,580);
  await page.mouse.down(); await page.mouse.move(1150,560,{steps:8}); await page.mouse.up();
  await page.mouse.wheel(0,-180);
  await page.getByRole('button',{name:'Reset camera'}).click();
  await page.setViewportSize({width:390,height:844});
  const help=page.getByRole('button',{name:'Camera controls'});
  assert.equal(await help.locator('.camera-hint-text').isVisible(),false);
  await help.click();
  await page.getByText('Scroll or pinch',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await page.locator('#camera-help').waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),390);
  assert.deepEqual(errors,[]);
  const fixture = await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const rootWarnings=[];
  fixture.on('console',message=>{
    if (message.text().includes('Attempted to synchronously unmount a root')) rootWarnings.push(message.text());
  });
  await fixture.addInitScript(() => {
    const last = new Date().toISOString();
    const base = {started:last,last,state:'active',model:'fixture-model'};
    const sessions = [
      {...base,id:'fixture-wsb',cwd:'C:/test/wsb',isWsb:true,activity:'Coding'},
      {...base,id:'fixture-other',cwd:'C:/test/fixture-other',isWsb:false,activity:'Testing'},
      {...base,id:'fixture-old',cwd:'C:/test/fixture-old',isWsb:false,state:'unknown'},
    ];
    window.EventSource = class {
      static CONNECTING = 0;
      constructor() {
        const publish = () => this.onmessage?.({data:JSON.stringify({sessions,now:last})});
        window.fixtureConnection = state => {
          this.readyState = state===true ? 1 : state==='reconnecting' ? 0 : 2;
          if(state===true){this.onopen?.();publish();}else this.onerror?.();
        };
        window.fixtureState = state => {sessions[0].state=state;publish();};
        queueMicrotask(() => window.fixtureConnection(true));
      }
      close() {}
    };
  });
  await fixture.goto('http://127.0.0.1:3000/',{waitUntil:'commit'});
  await fixture.getByRole('button',{name:'Web System Builders',exact:true}).waitFor({timeout:40000});
  assert.equal(await fixture.getByRole('button',{name:'fixture-other',exact:true}).count(),1);
  assert.equal(await fixture.getByRole('button',{name:'fixture-old',exact:true}).count(),0);
  await fixture.getByRole('button',{name:'Web System Builders',exact:true}).click();
  await fixture.getByText('fixture-model',{exact:true}).waitFor();
  await fixture.getByText('Coding',{exact:true}).waitFor();
  const connection=fixture.locator('.connection');
  await fixture.evaluate(() => window.fixtureConnection('reconnecting'));
  await connection.getByText('Reconnecting to monitor',{exact:true}).waitFor({state:'attached'});
  await fixture.evaluate(() => window.fixtureConnection(false));
  await connection.getByText('Monitor disconnected',{exact:true}).waitFor({state:'attached'});
  await fixture.locator('[data-session="fixture-wsb"][data-state="disconnected"]').waitFor({state:'attached'});
  await fixture.evaluate(() => {window.fixtureConnection(true);window.fixtureState('resumed');});
  await fixture.getByText('Resumed turn',{exact:true}).waitFor();
  assert.equal(await fixture.locator('[data-session="fixture-wsb"]').count(),1);
  await fixture.evaluate(() => window.fixtureState('idle'));
  await fixture.getByText('Idle',{exact:true}).waitFor();
  await fixture.evaluate(() => window.fixtureState('resumed'));
  await fixture.getByText('Resumed turn',{exact:true}).waitFor();
  await fixture.keyboard.press('Escape');
  const worker=fixture.locator('[data-session="fixture-wsb"]');
  await fixture.evaluate(() => window.fixtureState('unknown'));
  await worker.waitFor({state:'detached'});
  await fixture.evaluate(() => window.fixtureState('resumed'));
  await worker.waitFor({state:'visible'});
  await fixture.getByRole('button',{name:'Reset camera'}).click();
  assert.equal(await fixture.locator(".office-header h1,.brand-mark").count(),0);
  const toolbar=fixture.getByRole('group',{name:'Office controls'});
  assert.equal(await toolbar.getByRole('button').count(),3);
  const themes=toolbar.getByRole('button',{name:'Office themes'});
  await themes.focus();
  await fixture.keyboard.press('Tab');
  await fixture.keyboard.press('Shift+Tab');
  await fixture.locator('.control-tip').getByText('Office themes',{exact:true}).waitFor();
  await fixture.keyboard.press('Escape');
  await fixture.getByRole('button',{name:'Codex usage',exact:true}).focus();
  assert.ok(await fixture.evaluate(async()=>{
    await document.fonts.ready;
    return getComputedStyle(document.body).fontFamily.includes('Poppins')&&
      [...document.fonts].some(face=>face.family.includes('Poppins')&&face.status==='loaded');
  }));
  await fixture.evaluate(()=>document.activeElement.blur());
  if(process.env.OFFICE_UI_SHOTS) {
    await fixture.evaluate(() => window.fixtureState('idle'));
    await worker.and(fixture.locator('[data-animation="COUCH_IDLE"]')).waitFor();
  }
  if(process.env.OFFICE_UI_SHOTS) for(const [width,height] of [[1920,1080],[1366,768]]){
    await fixture.setViewportSize({width,height});
    await fixture.waitForTimeout(250);
    const toolbarBox=await toolbar.boundingBox();
    assert.ok(toolbarBox.x>width*.7);
    await fixture.screenshot({path:path.join(process.env.OFFICE_UI_SHOTS,`office-ui-${width}x${height}.png`)});
  }
  assert.deepEqual(rootWarnings,[]);
  console.log('Office, usage, compute, history, camera, viewport and fixture agent checks passed.');
} finally { await browser.close(); }
