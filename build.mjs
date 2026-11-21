import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const names=['index.html',...Array.from(html.matchAll(/(?:href|src)="([\w.-]+\.(?:js|css))"/g),m=>m[1]),'world.svg','icons.svg','teams_relay.py','event.json'];
const files=Object.fromEntries(names.map(name=>[name,readFileSync(name,'utf8')]));
mkdirSync('dist/server',{recursive:true});
writeFileSync('dist/server/index.js','const files='+JSON.stringify(files)+';\n'+readFileSync('worker.js','utf8'));
