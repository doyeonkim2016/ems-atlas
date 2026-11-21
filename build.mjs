import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
const html=readFileSync('index.html','utf8');
const names=['index.html',...Array.from(html.matchAll(/(?:href|src)="([\w.-]+\.(?:js|css))"/g),m=>m[1]),'world.svg','icons.svg','teams_relay.py','event.json'];
const files=Object.fromEntries(names.map(name=>[name,readFileSync(name,'utf8')]));
mkdirSync('dist/server',{recursive:true});
const fixture=files['reported-energy.js'].split('const pilotData=')[0];
const worker=[fixture,readFileSync('dq-store.js','utf8'),readFileSync('worker.js','utf8')].join('\n');
writeFileSync('dist/server/index.js','const files='+JSON.stringify(files)+';\n'+worker);
