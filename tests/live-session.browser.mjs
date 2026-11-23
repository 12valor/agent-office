import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {chromium} from 'playwright';

const cwd = process.env.OFFICE_WSB_SMOKE_ROOT;
if (!cwd) throw new Error('Set OFFICE_WSB_SMOKE_ROOT to an existing WSB repository.');
const browser=await chromium.launch({executablePath:process.env.OFFICE_CHROMIUM || undefined,
  args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const children=new Set();
function launch(resume) {
  if (resume && !/^[0-9a-f-]{36}$/.test(resume)) throw new Error('Unexpected session ID format');
  const tail=resume ? ['resume',resume] : [];
  const prompt='Without using any tools or inspecting files, write a 220-word plain-language description of how an orthographic camera presents a miniature diorama. This is a read-only telemetry verification.';
  const args=['exec','--sandbox','read-only','--ignore-user-config','--json',...tail,prompt];
  const child=process.platform==='win32'
    ? spawn('powershell.exe',['-NoProfile','-Command',`codex ${args.map(value=>"'"+value.replaceAll("'","''")+"'").join(' ')}`],{cwd,stdio:['ignore','pipe','ignore']})
    : spawn('codex',args,{cwd,stdio:['ignore','pipe','ignore']});
  children.add(child);
  const done=new Promise((resolve,reject)=>{
    child.once('error',reject);
    child.once('exit',code=>{children.delete(child);code===0?resolve():reject(new Error(`Codex exited with ${code}`));});
  });
  const identity=new Promise((resolve,reject)=>{
    createInterface({input:child.stdout}).on('line',line=>{
      try{const event=JSON.parse(line);if(event.type==='thread.started')resolve(event.thread_id);}catch{}
    });
    done.then(()=>reject(new Error('Codex exited before reporting identity')),reject);
  });
  done.catch(()=>{});
  return {identity,done};
}

try {
  const page=await browser.newPage({viewport:{width:1366,height:768},reducedMotion:'reduce'});
  await page.goto('http://127.0.0.1:3000/',{waitUntil:'commit'});
  await page.getByRole('button',{name:'Codex usage',exact:true}).waitFor({timeout:45000});
  await page.getByText('Local monitor connected').waitFor();
  const first=launch();
  const id=await first.identity;
  const marker=page.locator(`[data-session="${id}"]`);
  await page.locator(`[data-session="${id}"][data-state="active"]`).waitFor({timeout:30000});
  await first.done;
  await page.locator(`[data-session="${id}"][data-state="completed"]`).waitFor();
  console.log('New WSB session appeared as active and completed.');
  const resumed=launch(id);
  const second=launch();
  const [resumedId,secondId]=await Promise.all([resumed.identity,second.identity]);
  assert.equal(resumedId,id);
  assert.notEqual(secondId,id);
  const retry=page.locator(`[data-session="${id}"][data-state="resumed"]`);
  const other=page.locator(`[data-session="${secondId}"][data-state="active"]`);
  await Promise.all([retry.waitFor({timeout:30000}),other.waitFor({timeout:30000})]);
  assert.equal(await marker.count(),1);
  const [left,right]=await Promise.all([retry.boundingBox(),other.boundingBox()]);
  assert.ok(left && right && Math.hypot(left.x-right.x,left.y-right.y)>20);
  await retry.click();
  await page.locator(`[data-session-view="${id}"]`).waitFor();
  await page.getByText(id,{exact:true}).waitFor();
  await Promise.all([resumed.done,second.done]);
  await page.locator(`[data-session="${id}"][data-animation="COUCH_IDLE"]`).waitFor({state:'attached',timeout:22000});
  console.log('Resume reused the same identity, concurrent sessions used separate desks, and the completed agent returned to its resting pose.');
} finally {
  for(const child of children) child.kill();
  await browser.close();
}
