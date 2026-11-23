import assert from 'node:assert/strict';
import path from 'node:path';
import {chromium} from 'playwright';

const browser=await chromium.launch({executablePath:process.env.OFFICE_CHROMIUM || undefined,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
    const now=new Date().toISOString();
    const names=['websystembuilders','TalisayTourism','my-portfolio','files-pasted-by-the-user-project-2'];
    const sessions=names.map((name,i)=>({
      id:'seating-'+i,cwd:'C:/fixture/'+name,isWsb:i===0,state:'idle',model:'fixture-model-'+i,operation:'Read office fixture',
      started:'2026-11-22T10:00:00Z',last:now,usage:{total_tokens:1111+i,input_tokens:1000+i,output_tokens:111,cached_input_tokens:43},
    }));
    window.EventSource=class {
      constructor(){queueMicrotask(()=>{this.onopen?.();this.onmessage?.({data:JSON.stringify({sessions})});});
        window.setFixtureTurn=(i,state)=>{sessions[i].state=state;this.onmessage?.({data:JSON.stringify({sessions})});};}
      close(){}
    };
  });
  await page.goto('http://127.0.0.1:3000/',{waitUntil:'commit'});
  const worker=id=>page.locator(`[data-session="seating-${id}"]`);
  const panel=id=>page.locator(`[data-session-view="seating-${id}"]`);
  const screenshot=async name=>{
    if(process.env.OFFICE_FACE_SHOTS) {
      await page.screenshot({path:path.join(process.env.OFFICE_FACE_SHOTS,name),style:'nextjs-portal{display:none}'});
    }
  };
  await worker(3).waitFor({timeout:40000});
  await screenshot('robot-proportions-after.png');
  const before=await worker(0).boundingBox();
  await worker(0).focus();
  await page.keyboard.press('Enter');
  await panel(0).waitFor();
  assert.equal(await page.getByRole('dialog').count(),0);
  await panel(0).getByText('fixture-model-0',{exact:true}).waitFor();
  await page.waitForTimeout(1700);
  await screenshot('robot-face-status.png');
  await page.getByRole('button',{name:'Token Usage'}).click();
  await panel(0).getByText('1,111',{exact:true}).waitFor();
  await screenshot('robot-face-tokens.png');
  await page.getByRole('button',{name:'Activity'}).click();
  await panel(0).getByText('Read office fixture',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await panel(0).waitFor({state:'hidden'});
  await page.waitForFunction(({x,y})=>{
    const box=document.querySelector('[data-session="seating-0"]').getBoundingClientRect();
    return Math.abs(box.x-x)<10&&Math.abs(box.y-y)<12;
  },before);
  await page.evaluate(()=>window.setFixtureTurn(1,'active'));
  await worker(1).and(page.locator('[data-animation="WORKING"]')).waitFor({timeout:25000});
  await worker(1).click();
  await panel(1).getByText('fixture-model-1',{exact:true}).waitFor();
  await page.waitForTimeout(1700);
  await screenshot('robot-face-desk.png');
  await page.getByRole('button',{name:'Back to office'}).click();
  await panel(1).waitFor({state:'hidden'});
  await worker(1).waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  await worker(3).click();
  await panel(3).getByText('fixture-model-3',{exact:true}).waitFor();
  await page.keyboard.press('Escape');
  await panel(3).waitFor({state:'hidden'});
  assert.deepEqual(errors,[]);
  console.log('Office restores its camera; seated and working robots show individual face data.');
} finally {await browser.close();}
