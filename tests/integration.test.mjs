import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';

test('discovers a rollout and restores persisted history on restart', {timeout:20000}, async () => {
  const tmp=mkdtempSync(path.join(tmpdir(),'office-test-')), home=path.join(tmp,'home'), data=path.join(tmp,'data'), dir=path.join(home,'sessions','2026','11','22');
  mkdirSync(dir,{recursive:true});
  const timestamp='2026-11-22T10:00:00.000Z';
  writeFileSync(path.join(dir,'rollout.jsonl'),[
    {type:'session_meta',timestamp,payload:{id:'fixture-session',cwd:'C:/work/wsb'}},
    {type:'event_msg',timestamp,payload:{type:'token_count',info:{total_token_usage:{input_tokens:80,output_tokens:20,total_tokens:100}}}}
  ].map(JSON.stringify).join('\n')+'\n');
  const port=44318, url=`http://127.0.0.1:${port}/snapshot`;
  const start=()=>spawn(process.execPath,['monitor/server.mjs'],{env:{...process.env,CODEX_HOME:home,OFFICE_DATA_DIR:data,OFFICE_MONITOR_PORT:String(port)},stdio:'ignore'});
  async function waitForSession() { for(let i=0;i<60;i++){try {const r=await fetch(url);const s=await r.json();if(s.sessions.length) return s.sessions[0];}catch{} await new Promise(r=>setTimeout(r,100));}throw Error('monitor did not discover fixture'); }
  async function stop(child) { child.kill(); await new Promise(resolve=>child.once('exit',resolve)); }
  let child=start();
  try { let session=await waitForSession(); assert.equal(session.id,'fixture-session');assert.equal(session.usage.total_tokens,100);assert.equal(session.state,'discovered'); await stop(child); child=start(); session=await waitForSession();assert.equal(session.usage.total_tokens,100);assert.equal(session.daily['2026-11-22'],100); }
  finally { if(child.exitCode===null) await stop(child); rmSync(tmp,{recursive:true,force:true}); }
});
