import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath:process.env.OFFICE_CHROMIUM || undefined,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
});
try {
  const page=await browser.newPage({viewport:{width:900,height:600}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{
    if(message.text().includes('Attempted to synchronously unmount a root')) errors.push(message.text());
  });
  await page.addInitScript(()=>{
    const session={id:'motion-test',cwd:'C:/fixture/WSB',state:'idle',isWsb:true,activity:'Coding',model:'fixture'};
    const couchWorkers=Array.from({length:3},(_,index)=>({...session,id:`couch-${index}`}));
    window.EventSource=class {
      constructor() {
        window.setTurn=state=>{
          session.state=state;
          this.onmessage?.({data:JSON.stringify({sessions:[...couchWorkers,session],now:new Date().toISOString()})});
        };
        queueMicrotask(()=>{this.onopen?.();window.setTurn('idle');});
      }
      close(){}
    };
    window.phases=[];
    new MutationObserver(()=>{
      const phase=document.querySelector('[data-session="motion-test"]')?.getAttribute('data-animation');
      if(phase && window.phases.at(-1)!==phase) window.phases.push(phase);
    }).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:['data-animation']});
  });
  await page.goto('http://127.0.0.1:3000/',{waitUntil:'commit'});
  const worker=page.locator('[data-session="motion-test"]');
  const intro=page.getByText('In this town, no one else works harder than me.',{exact:true});
  const speech=page.getByText('HUSS! HUSS! HUSS!',{exact:true});
  const party=page.getByText('In this town, everyone goes to party except me.',{exact:true});
  const wait=phase=>worker.and(page.locator(`[data-animation="${phase}"]`)).waitFor({timeout:25000});
  const turn=state=>page.evaluate(state=>window.setTurn(state),state);
  await wait('COUCH_IDLE');
  assert.equal(await page.locator('[data-animation="COUCH_IDLE"]').count(),4);
  if (process.env.OFFICE_SEATING_SCREENSHOT) {
    await page.screenshot({path:process.env.OFFICE_SEATING_SCREENSHOT,style:'nextjs-portal { display: none }'});
  }
  const couch=(await worker.boundingBox()).x;
  await turn('active');
  await intro.waitFor();
  assert.equal(await speech.count(),0);
  await speech.waitFor();
  if (process.env.OFFICE_MOTION_SCREENSHOT) {
    await page.screenshot({path:process.env.OFFICE_MOTION_SCREENSHOT,style:'nextjs-portal { display: none }'});
  }
  await wait('WORKING');
  const desk=(await worker.boundingBox()).x;
  assert.ok(Math.abs(couch-desk)>60);
  await party.waitFor();
  await intro.waitFor();
  assert.deepEqual(await page.evaluate(()=>window.phases.slice(0,6)),['COUCH_IDLE','REACT','STAND','SPRINT','DESK_SIT','WORKING']);
  await turn('completed');
  await page.locator('.robot-speech').waitFor({state:'hidden'});
  await wait('WALK_TO_COUCH');
  await page.waitForFunction(desk => Math.abs(document.querySelector('[data-session="motion-test"]').getBoundingClientRect().x-desk)>22,desk);
  await turn('resumed');
  await wait('SPRINT');
  await wait('WORKING');
  assert.equal(await worker.count(),1);
  await turn('waiting_for_approval');
  await worker.and(page.locator('[data-state="waiting_for_approval"]')).waitFor();
  await speech.waitFor();
  assert.equal(await intro.count(),0);
  await turn('completed');
  await wait('COUCH_IDLE');
  assert.ok(Math.abs(couch-(await worker.boundingBox()).x)<12);
  await turn('unknown');
  await worker.and(page.locator('[data-state="unknown"]')).waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await turn('active');
  await wait('WORKING');
  await intro.waitFor();
  await speech.waitFor();
  await turn('completed');
  await speech.waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('Couch, sprint bubble, desk work, interrupted return, and reduced-motion checks passed.');
} finally {
  await browser.close();
}
