import test from 'node:test';
import assert from 'node:assert/strict';
import {apply, belongs, state, deduplicate} from '../monitor/parser.mjs';
import {mergeLive} from '../monitor/app-server.mjs';

const at = '2026-11-22T10:00:00.000Z';
test('resumes the same identity and stops projecting old turns as active', () => {
  const session = {};
  const now=Date.parse(at);
  apply(session,{type:'session_meta',timestamp:at,payload:{id:'same',cwd:'C:/work/wsb'}});
  assert.equal(state(session,now),'discovered');
  const turn = (type,turn_id) => apply(session,{type:'event_msg',timestamp:at,payload:{type,turn_id}});
  turn('task_started','one');
  turn('task_started','one');
  assert.equal(state(session,now),'active');
  turn('task_complete','one');
  assert.equal(state(session,now+13000),'unknown');
  turn('task_started','two');
  assert.equal(state(session,now),'resumed');
  assert.equal(session.id,'same');
  turn('exec_approval_request','two');
  assert.equal(state(session,now),'waiting_for_approval');
  assert.equal(state(session,now+121000),'unknown');
});
test('uses confirmed App Server idle and discards unloaded status', () => {
  const history=[{id:'i',cwd:'C:/work/wsb',usage:{total_tokens:20}}];
  const thread={id:'i',cwd:'C:/work/wsb',status:{type:'idle'}};
  assert.equal(mergeLive(history,[thread],state)[0].state,'idle');
  assert.equal(mergeLive(history,[thread],state)[0].usage.total_tokens,20);
  assert.equal(mergeLive(history,[{...thread,status:{type:'notLoaded'}}],state)[0].state,'discovered');
});
test('translates recognized test commands without retaining arguments or output', () => {
  const session = {};
  apply(session,{type:'event_msg',timestamp:at,payload:{type:'exec_command_begin',command:['npm','test','private-argument']}});
  assert.equal(session.activity,'Testing');
  apply(session,{type:'event_msg',timestamp:at,payload:{type:'exec_command_end',command:['npm','test'],exit_code:1,stdout:'private-output'}});
  assert.equal(session.activity,'Analyzing');
  assert.deepEqual(session.events.map(item=>item.detail),['Started','Exit code 1']);
  assert.doesNotMatch(JSON.stringify(session),/private/);
});
test('deduplicates repeated session IDs using the most recent record', () => {
  assert.deepEqual(deduplicate([{id:'a',last:'2026-01-01',value:1},{id:'a',last:'2026-02-01',value:2}]).map(s=>s.value),[2]);
});
test('matches repository boundaries', () => {
  assert.equal(belongs('C:/work/wsb/src', 'C:/work/wsb'), true);
  assert.equal(belongs('C:/work/wsb-other', 'C:/work/wsb'), false);
});
test('tracks cumulative token snapshots without double counting and excludes prompt content', () => {
  const s = {};
  apply(s, {type:'session_meta',timestamp:at,payload:{id:'one',cwd:'C:/work/wsb',base_instructions:'secret'}});
  const count = n => ({type:'event_msg',timestamp:at,payload:{type:'token_count',info:{total_token_usage:{input_tokens:n-10,output_tokens:10,total_tokens:n}}}});
  apply(s,count(100)); apply(s,count(100)); apply(s,count(150));
  assert.equal(s.usage.total_tokens,150); assert.equal(s.daily['2026-11-22'],150);
  assert.doesNotMatch(JSON.stringify(s),/secret/);
});
test('recent task activity is not inferred indefinitely', () => {
  const s = {}; apply(s,{type:'event_msg',timestamp:at,payload:{type:'task_started'}});
  assert.equal(state(s,Date.parse(at)+1000),'active');
  assert.equal(state(s,Date.parse(at)+121000),'unknown');
  apply(s,{type:'event_msg',timestamp:at,payload:{type:'task_complete'}});
  assert.equal(state(s,Date.parse(at)+1000),'completed');
});
