import {spawn} from 'node:child_process';
const next = process.platform === 'win32' ? 'node_modules/next/dist/bin/next' : 'node_modules/next/dist/bin/next';
const children=[spawn(process.execPath,['monitor/server.mjs'],{stdio:'inherit'}),spawn(process.execPath,[next,'dev','-H','127.0.0.1','-p','3000'],{stdio:'inherit'})];
function stop(){for(const c of children)c.kill();} process.on('SIGINT',()=>{stop();process.exit()});process.on('SIGTERM',stop);for(const c of children)c.on('exit',code=>{if(code){stop();process.exitCode=code}});
