import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

export function watchAppServer(socket, onThreads) {
  // Only the local managed daemon is queried. Its thread status applies to its own loaded threads.
  const child = process.platform === 'win32'
    ? spawn('cmd.exe', ['/d','/c','codex app-server proxy'], {windowsHide:true,stdio:['pipe','pipe','ignore']})
    : spawn('codex', ['app-server','proxy','--sock',socket], {stdio:['pipe','pipe','ignore']});
  const lines = createInterface({input:child.stdout});
  const pending = new Map();
  const known = new Map();
  let id = 0;
  let polling;
  let running = false;
  let stopped = false;
  const send = (message) => {
    if (!child.stdin.destroyed) child.stdin.write(JSON.stringify(message)+'\n');
  };
  const request = (method,params) => new Promise((resolve,reject) => {
    const key = ++id;
    const timer = setTimeout(() => {pending.delete(key);reject(new Error('App Server read timed out'));},3000);
    pending.set(key, (message) => {
      clearTimeout(timer);
      if (message.error) reject(new Error('App Server read unavailable'));
      else resolve(message.result);
    });
    send({id:key,method,params});
  });
  const publish = () => onThreads([...known.values()]);
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(polling);
    lines.close();
    child.kill();
    for (const reply of pending.values()) reply({error:true});
    pending.clear();
    known.clear();
    onThreads([],true);
  };
  async function poll() {
    if (running) return;
    running = true;
    try {
      const loaded = await request('thread/loaded/list',{limit:32});
      const ids = Array.isArray(loaded?.data) ? loaded.data.filter(value=>typeof value==='string').slice(0,32) : [];
      for (const key of known.keys()) if (!ids.includes(key)) known.delete(key);
      await Promise.all(ids.map(async threadId => {
        const result = await request('thread/read',{threadId,includeTurns:false});
        const thread = result?.thread;
        if (thread?.id === threadId && typeof thread.cwd === 'string') known.set(threadId,thread);
      }));
      publish();
    } catch { stop(); }
    finally { running = false; }
  }
  lines.on('line',line=>{
    try {
      const message=JSON.parse(line);
      const reply=pending.get(message.id);
      if (reply) {pending.delete(message.id);reply(message);}
      if (message.method==='thread/status/changed') {
        const previous=known.get(message.params?.threadId);
        if (previous) {known.set(previous.id,{...previous,status:message.params.status});publish();}
      }
    } catch { /* Unknown protocol message. */ }
  });
  child.on('error',stop);
  child.stdin.on('error',stop);
  child.on('exit',stop);
  request('initialize',{clientInfo:{name:'wsb_agent_office',version:'0.1.0'}}).then(()=>{
    send({method:'initialized'});
    polling=setInterval(poll,5000);
    void poll();
  }).catch(stop);
  return stop;
}

export function mergeLive(history, threads, state) {
  const sessions = new Map(history.map(session=>[session.id,{...session,state:state(session)}]));
  for (const thread of threads) {
    const status=thread.status?.type;
    if (!['active','idle','systemError'].includes(status)) continue;
    const local=sessions.get(thread.id);
    const timestamp=(value)=>typeof value==='number' && Number.isFinite(value) && Math.abs(value)<8.64e12 ? new Date(value*1000).toISOString() : undefined;
    const waiting=thread.status?.activeFlags?.includes('waitingOnApproval');
    const lifecycle=waiting?'waiting_for_approval':status==='systemError'?'error':status==='active' && local?.state==='resumed'?'resumed':status;
    sessions.set(thread.id,{
      ...local,id:thread.id,cwd:thread.cwd,name:thread.name || local?.name,
      started:local?.started || timestamp(thread.createdAt),last:local?.last || timestamp(thread.updatedAt),
      branch:local?.branch || thread.gitInfo?.branch,model:local?.model || thread.model,
      state:lifecycle,source:'App Server',
    });
  }
  return [...sessions.values()];
}
