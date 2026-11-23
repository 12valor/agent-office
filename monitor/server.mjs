import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {DatabaseSync} from 'node:sqlite';import {execFileSync} from 'node:child_process';import {apply,belongs,state,deduplicate} from './parser.mjs';
import { mergeLive, watchAppServer } from './app-server.mjs';
const home=process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),root=path.join(home,'sessions'),data=path.resolve(process.env.OFFICE_DATA_DIR||'.data'),port=Number(process.env.OFFICE_MONITOR_PORT||4318);fs.mkdirSync(data,{recursive:true});const db=new DatabaseSync(path.join(data,'office.sqlite'));db.exec('CREATE TABLE IF NOT EXISTS files (path TEXT PRIMARY KEY, size INTEGER, mtime REAL, json TEXT); CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)');
let settings=db.prepare("SELECT value FROM settings WHERE key='wsb'").get()?.value||path.join(os.homedir(),'Downloads','websystembuilders');let clients=new Set(), diagnostic='Connecting';
function gitRoot(p){try{return execFileSync('git',['-C',p,'rev-parse','--show-toplevel'],{encoding:'utf8',timeout:1500,windowsHide:true,stdio:['ignore','pipe','ignore']}).trim()}catch{return p}}
settings=gitRoot(settings);let cached=[];
let liveThreads=[];
let stopAppServer;
let lastAppServerAttempt=0;
const controlSocket=path.join(home,'app-server-control','app-server-control.sock');
function findAppServer() {
  if (stopAppServer || Date.now()-lastAppServerAttempt<30000 || !fs.existsSync(controlSocket)) return;
  lastAppServerAttempt=Date.now();
  stopAppServer=watchAppServer(controlSocket,(threads,disconnected)=>{
    liveThreads=threads;
    if(disconnected) stopAppServer=undefined;
    broadcast();
  });
}
function walk(dir,out){let entries;try{entries=fs.readdirSync(dir,{withFileTypes:true})}catch{return}for(const e of entries){let f=path.join(dir,e.name);if(e.isDirectory())walk(f,out);else if(e.name.endsWith('.jsonl'))out.push(f)}}
function scan(){if(!fs.existsSync(root)){diagnostic='Codex sessions directory not found';return}diagnostic='Reading local Codex rollouts';let files=[];walk(root,files);const get=db.prepare('SELECT * FROM files WHERE path=?'),put=db.prepare('INSERT INTO files VALUES (?,?,?,?) ON CONFLICT(path) DO UPDATE SET size=excluded.size,mtime=excluded.mtime,json=excluded.json');for(const f of files){try{const stat=fs.statSync(f),old=get.get(f);if(old&&old.size===stat.size&&old.mtime===stat.mtimeMs)continue;let offset=old&&stat.size>=old.size?old.size:0,s=offset?JSON.parse(old.json):{};const fd=fs.openSync(f,'r');let pos=offset, pending='';const b=Buffer.alloc(256*1024);while(pos<stat.size){let n=fs.readSync(fd,b,0,Math.min(b.length,stat.size-pos),pos);if(!n)break;pos+=n;pending+=b.toString('utf8',0,n);let lines=pending.split('\n');pending=lines.pop();for(const line of lines){try{apply(s,JSON.parse(line))}catch{}}}fs.closeSync(fd);put.run(f,stat.size-Buffer.byteLength(pending),stat.mtimeMs,JSON.stringify(s));}catch{}}
 cached=deduplicate(db.prepare('SELECT json FROM files').all().map(x=>{try{return JSON.parse(x.json)}catch{return {}}}).filter(x=>x.id&&x.cwd));broadcast()}
function cpuTimes() {
  return os.cpus().reduce(({idle,total},{times}) => ({
    idle:idle+times.idle, total:total+Object.values(times).reduce((a,b)=>a+b,0),
  }),{idle:0,total:0});
}
let previousCpu = cpuTimes();
let cpu = null;
setInterval(() => {
  const next = cpuTimes();
  const elapsed = next.total - previousCpu.total;
  cpu = elapsed > 0 ? Math.round(100 * (1 - (next.idle - previousCpu.idle) / elapsed)) : null;
  previousCpu = next;
}, 5000).unref();
function snapshot() {
  const sessions = mergeLive(cached,liveThreads,state).map(s => ({...s,isWsb:belongs(s.cwd,settings)}));
  const totalMemory = os.totalmem();
  const host = {cpu,ram:Math.round(100*(1-os.freemem()/totalMemory)),totalMemory,cores:os.availableParallelism(),platform:os.platform(),architecture:os.arch()};
  return {sessions,wsbPath:settings,diagnostic,now:new Date().toISOString(),codexHomeFound:fs.existsSync(home),host};
}
function broadcast(){const msg='data: '+JSON.stringify(snapshot())+'\n\n';for(const res of clients)res.write(msg)}
const server=http.createServer((req,res)=>{const origin=req.headers.origin;const host=req.headers.host;if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(host)){res.writeHead(403).end();return}if(origin&&origin!=='http://127.0.0.1:3000'&&origin!=='http://localhost:3000'){res.writeHead(403).end();return}if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin')}res.setHeader('Cache-Control','no-store');if(req.method==='OPTIONS'&&req.url==='/settings'&&origin){res.writeHead(204,{'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'}).end();return}if(req.method==='GET'&&req.url==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Connection':'keep-alive'});clients.add(res);res.write('data: '+JSON.stringify(snapshot())+'\n\n');req.on('close',()=>clients.delete(res));return}if(req.method==='GET'&&req.url==='/snapshot'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(snapshot()));return}if(req.method==='POST'&&req.url==='/settings'&&origin){let body='';req.on('data',c=>{body+=c;if(body.length>4096)req.destroy()});req.on('end',()=>{try{const p=JSON.parse(body).path;if(typeof p!=='string'||!path.isAbsolute(p)||!fs.existsSync(p))throw Error();const git=gitRoot(p);if(!fs.existsSync(path.join(git,'.git')))throw Error();settings=git;db.prepare("INSERT OR REPLACE INTO settings VALUES ('wsb',?)").run(settings);res.end('ok');broadcast()}catch{res.writeHead(400).end('Enter an existing Git repository path')}});return}res.writeHead(404).end()});server.listen(port,'127.0.0.1',()=>{console.log(`Monitor: http://127.0.0.1:${port}`);setTimeout(scan,100)});setInterval(() => {findAppServer();scan()},3500);setInterval(()=>{for(const r of clients)r.write(': keepalive\n\n')},25000);

let scanTimer;
try {
  fs.watch(root,{recursive:true,persistent:false},()=>{
    clearTimeout(scanTimer);
    scanTimer=setTimeout(scan,180);
  }).on('error',()=>{});
} catch { /* Polling covers a missing or unsupported watch directory. */ }
process.on('exit',()=>stopAppServer?.());
