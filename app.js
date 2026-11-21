const $=q=>document.querySelector(q),ico=(n)=>'<svg class="icon" aria-hidden="true"><use href="icons.svg#'+n+'"/></svg>';
const colors={Healthy:'#75c8b0',Warning:'#f3bd63',Critical:'#ff8066'};
const raw=[
['Jakarta','Indonesia','0188',106.8,-6.2],['Atlanta','United States','US01',-84.4,33.7],['Cork','Ireland','IE01',-8.5,51.9],['Singapore','Singapore','SG01',103.8,1.35],['Tokyo','Japan','JP01',139.7,35.7],['Shanghai','China','CN01',121.5,31.2],['Seoul','South Korea','KR01',127,37.6],['Pune','India','IN01',73.9,18.5],['Bangkok','Thailand','TH01',100.5,13.7],['Sydney','Australia','AU01',151.2,-33.9],['London','United Kingdom','GB01',-.1,51.5],['Berlin','Germany','DE01',13.4,52.5],['Madrid','Spain','ES01',-3.7,40.4],['Cairo','Egypt','EG01',31.2,30],['Nairobi','Kenya','KE01',36.8,-1.3],['Johannesburg','South Africa','ZA01',28,-26.2],['Toronto','Canada','CA01',-79.4,43.7],['Mexico City','Mexico','MX01',-99.1,19.4],['São Paulo','Brazil','BR01',-46.6,-23.6],['Buenos Aires','Argentina','AR01',-58.4,-34.6]];
const issues=['Missing readings','Delayed readings','Duplicate readings','Missing readings'],states=['Critical','Warning','Warning','Critical'],areas=['Refrigeration','HVAC','Packaging','Utilities','Warehouse','Mixing'];
const plants=raw.map(([name,country,code,lon,lat],p)=>({name,country,code,lon,lat,p,meters:Array.from({length:3+p%4},(_,m)=>({name:areas[m],subs:Array.from({length:2+(m+p)%3},(_,s)=>{
let bad=p<4&&m===0&&s===0,issue=bad?issues[p]:null,severity=bad?states[p]:'Healthy';
let readings=Array.from({length:96},(_,t)=>{let flagged=bad&&(p===2?t%6===0:t>=64+p*2&&t<86);return {flag:flagged,value:flagged&&issue==='Missing readings'?null:+(8+(p+m+s)%7+3*Math.sin(t*.19+p)+2*Math.cos(t*.43+m)).toFixed(2)}});
return {name:['Compressor','Pump','Fan','Drive'][s]+' '+String(s+1).padStart(2,'0'),id:code+'-M'+(m+1)+'-S'+(s+1),readings,issue,severity}})}))}));
const flat=p=>p.meters.flatMap(m=>m.subs),all=plants.flatMap(flat),samples=a=>a.flatMap(x=>x.readings),pct=a=>{let r=samples(a);return (100*r.filter(x=>!x.flag).length/r.length).toFixed(2)},status=p=>flat(p).find(x=>x.issue)?.severity||'Healthy',alerts=plants.filter(p=>status(p)!=='Healthy');
const ack=new Set(JSON.parse(localStorage.getItem('ems-atlas-ack')||'[]'));let view='Overview',page=0,query='',filter='All statuses',alertFilter='All alerts';
const pill=s=>'<span class="pill '+s.toLowerCase()+'">'+ico(s==='Healthy'?'circle-check':s==='Critical'?'circle-alert':'triangle-alert')+s+'</span>';
function mini(i){let a=[[4,4,4,4,5,5,5,5,6,6,6,6,7,7],[3,4,5,4,5,7,5,6,7,7,6,8,7,8],[4,5,6,5,6,5,7,7,6,8,7,8,7,8],[6,6,7,7,5,5,4,4,5,5,3,3,4,4]][i];return '<svg class="mini" viewBox="0 0 84 23" aria-hidden="true">'+a.map((n,j)=>'<rect x="'+j*6+'" y="'+(23-n*2.5)+'" width="4" height="'+n*2.5+'" fill="'+(i===3?'#d78363':'#86a9a4')+'"/>').join('')+'</svg>'}
function metrics(){let m=plants.reduce((a,p)=>a+p.meters.length,0);return '<div class="metrics">'+[['factory','Plants monitored',20,'Global network'],['network','Meter inventory',m+all.length,m+' meters · '+all.length+' submeters'],['activity','Data quality',pct(all)+'%','Valid intervals'],['bell','Batch findings',alerts.length,alerts.filter(p=>status(p)==='Critical').length+' critical · 2 warning']].map(([ic,t,v,s],i)=>'<div class="metric"><label>'+ico(ic)+t+'</label><strong>'+v+'</strong><div class="sub">'+s+'</div>'+mini(i)+'</div>').join('')+'</div>'}
function alertRow(p){let s=flat(p)[0];return '<button class="alertitem" onclick="sub('+p.p+',0,0)"><span class="signal '+s.severity.toLowerCase()+'">'+ico(s.severity==='Critical'?'circle-alert':'triangle-alert')+'</span><span><strong>'+s.issue+'</strong><small>'+p.name+' · '+s.id+'</small></span><time>'+(ack.has(p.code)?'Reviewed':'Assessed '+localClock(batchLedger[p.p].assessed,p))+'</time></button>'}
function directory(){return '<section class="panel directory"><div class="panelhead"><h2>Plant directory <span class="count">20</span></h2><div class="tools"><input id="search" type="search" placeholder="Search plants…" aria-label="Search plants"><select id="filter" aria-label="Filter plant status">'+['All statuses','Critical','Warning','Healthy'].map(s=>'<option>'+s+'</option>').join('')+'</select></div></div><div class="scroll"><table><thead><tr>'+['Plant','Status','Meters / subs','Data quality','Alerts',''].map(s=>'<th>'+s+'</th>').join('')+'</tr></thead><tbody></tbody></table></div><div class="tblfoot"></div></section>'}
function rows(){let list=plants.filter(p=>(p.name+p.country+p.code).toLowerCase().includes(query.toLowerCase())&&(filter==='All statuses'||status(p)===filter)),size=6;$('.directory tbody').innerHTML=list.slice(page*size,page*size+size).map(p=>'<tr onclick="plant('+p.p+')"><td><div class="siteName"><span class="siteicon">'+ico('factory')+'</span><div><b>'+p.name+'</b><small>'+p.country+' · '+p.code+'</small></div></div></td><td>'+pill(status(p))+'</td><td class="mono">'+p.meters.length+' / '+flat(p).length+'</td><td><span class="score"><span class="bar"><i style="width:'+pct(flat(p))+'%"></i></span>'+pct(flat(p))+'%</span></td><td>'+flat(p).filter(x=>x.issue).length+'</td><td><button aria-label="Inspect '+p.name+'">'+ico('chevron-right')+'</button></td></tr>').join('')||'<tr><td colspan="6">No matching plants</td></tr>';$('.tblfoot').innerHTML='<span>'+list.length+' plants · Page '+(page+1)+' of '+Math.max(1,Math.ceil(list.length/size))+'</span><span><button class="tablebtn" onclick="page--;rows()" '+(!page?'disabled':'')+'>Previous</button><button class="tablebtn" onclick="page++;rows()" '+((page+1)*size>=list.length?'disabled':'')+'>Next</button></span>'}
function go(v){stopReplay();view=v;page=0;sectionNav(v);$('#title').textContent={Requests:'Review requests',Overview:'Monthly reporting desk',Plants:'Plant directory',Alerts:'Alert inbox',Investigation:'Energy investigation',Teams:'Teams monitoring',Rulebook:'DQ Rulebook','Plant analysis':'Plant analysis'}[v];$('#date').innerHTML=ico('calendar')+'Daily batch · 21 Nov 2026';if(v==='Reported energy'){$('#title').textContent='Reported energy';pilotReport();return}if(v==='Requests'){showRequests();return}if(v==='Plant analysis'){weekly();return}if(v==='Rulebook'){rulebook();return}if(v==='Teams'){showTeams();return}if(v==='Investigation'){investigationGroup=0;renderInvestigation();return}let opts=['All alerts','Needs review','Reviewed'];$('#body').innerHTML=v==='Alerts'?'<div class="panel"><div class="panelhead"><h2>Batch findings <span class="count">4</span></h2><select aria-label="Review status" onchange="alertFilter=this.value;go(view)">'+opts.map(s=>'<option '+(s===alertFilter?'selected':'')+'>'+s+'</option>').join('')+'</select></div>'+ (alerts.filter(p=>alertFilter==='All alerts'||ack.has(p.code)===(alertFilter==='Reviewed')).map(alertRow).join('')||'<div class="empty">No alerts in this view.</div>')+'</div>':(v==='Overview'?batchOverview()+readiness()+replayConsole()+'<article class="panel"><div class="panelhead"><h2>Latest assessed findings <span class="count">4</span></h2><button class="link" onclick="go(\'Alerts\')">View all</button></div><div class="dailyfeed">'+alerts.map(alertRow).join('')+'</div></article>':'')+directory();if(v==='Alerts'){$('#body').insertAdjacentHTML('afterbegin',`<section class="panel study"><b>October reporting alerts · Plant 0188</b> <button class="link" onclick="go('Reported energy')">View findings and report impact</button></section>`);$('#body').insertAdjacentHTML('beforeend',incidentTimeline())}if(v!=='Alerts'){$('#search').value=query;$('#filter').value=filter;$('#search').oninput=e=>{query=e.target.value;page=0;rows()};$('#filter').onchange=e=>{filter=e.target.value;page=0;rows()};rows();if(v==='Overview'){paintInterval();layoutConcept()}}}
function modal(title,meta,content,back=''){stopReplay();let d=$('dialog');$('#detail').innerHTML='<div class="dhead">'+back+'<div class="row"><h2>'+title+'</h2><button class="close" onclick="document.querySelector(\'dialog\').close()" aria-label="Close">'+ico('x')+'</button></div><p style="margin:6px 0 0;color:#c4d2d2">'+meta+'</p></div><div class="dcontent">'+content+'</div>';if(!d.open)d.showModal();d.scrollTop=0}
function back(label,action){return '<button class="back" onclick="'+action+'">'+label+'</button>'}
function plant(i){let p=plants[i];modal(p.name+' plant',p.country+' / '+p.code,'<div class="row"><h3>Meter hierarchy</h3>'+pill(status(p))+'</div>'+p.meters.map((m,j)=>'<button class="tree" onclick="meter('+i+','+j+')"><div>'+ico('gauge')+' '+m.name+'<small>'+m.subs.length+' submeters</small></div>'+ico('chevron-right')+'</button>').join(''))}
function meter(i,j){let p=plants[i],m=p.meters[j];modal(m.name,p.name+' / Meter '+(j+1),'<h3>Submeters</h3>'+m.subs.map((s,k)=>'<button class="tree" onclick="sub('+i+','+j+','+k+')"><div>'+s.name+'<small>'+s.id+'</small></div>'+pill(s.severity)+'</button>').join(''),back(p.name+' plant','plant('+i+')'))}
function time(t){return String(Math.floor(t/4)).padStart(2,'0')+':'+String(t%4*15).padStart(2,'0')}
function sub(i,j,k){let p=plants[i],m=p.meters[j],s=m.subs[k],r=s.readings,bad=r.filter(v=>v.flag).length;modal(s.name,batchNote(p)+' / '+m.name+' / '+s.id,'<div class="row"><h3>'+ (s.issue||'Reading quality')+'</h3>'+pill(s.severity)+'</div><div class="summary"><div><small>Valid intervals</small><strong>'+(96-bad)+' / 96</strong></div><div><small>Observed usage</small><strong>'+r.reduce((a,v)=>a+(v.value||0),0).toFixed(1)+' kWh</strong></div></div><h3>Collection history</h3><small>'+batchLedger[i].day+' Nov · 15-minute intervals · local</small><div class="strip">'+r.map((v,t)=>'<i class="'+(v.flag?'missing':'')+'" title="'+time(t)+' · '+(hitNames(v))+'"></i>').join('')+'</div><div class="row"><small>00:00</small><small>12:00</small><small>23:45</small></div>'+(s.issue?'<p>'+bad+' intervals flagged by data quality rules.</p><button class="action" onclick="review('+i+','+j+','+k+')">'+(ack.has(p.code)?'Mark as unreviewed':'Acknowledge alert')+'</button>':'')+'<details class="readings"><summary>Source readings · 96 intervals</summary><table><thead><tr><th>local</th><th>kWh</th><th>Check</th></tr></thead><tbody>'+r.map((v,t)=>'<tr><td>'+time(t)+'</td><td>'+(v.value??'—')+'</td><td>'+(hitNames(v))+'</td></tr>').join('')+'</tbody></table></details>',back(m.name+' meter','meter('+i+','+j+')'))}
function review(i,j,k){let id=plants[i].code;ack.has(id)?ack.delete(id):ack.add(id);localStorage.setItem('ems-atlas-ack',JSON.stringify([...ack]));go(view);sub(i,j,k)}
$('dialog').addEventListener('click',e=>{if(e.target===$('dialog'))$('dialog').close()});

let selectedPlant = 0;
let interval = 64;
let timer = null;
const intervalState = (p, t) => flat(p).find(s => s.readings[t].flag)?.severity || 'Healthy';

function replayConsole() {
  const pins = plants.slice().reverse().map(p => {
    const x = (p.lon + 180) * 2, y = (82 - p.lat) * 2;
    return `<g id="pin-${p.p}" class="pin" role="button" tabindex="0" onclick="choosePlant(${p.p})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();choosePlant(${p.p})}" transform="translate(${x} ${y})">
      <title></title><circle r="10" fill="transparent"/><circle class="selection" r="10" fill="none" stroke="#fff"/><circle class="halo" r="8" fill="currentColor" opacity=".23"/><circle r="3.7" fill="currentColor"/></g>`;
  }).join('');
  return `<section class="console"><div class="consolebar"><h2>${ico('globe')} Latest assessed day · Replay</h2><div class="controlclock"><span id="replayday"></span> <output id="clock"></output> local</div></div>
  <div class="stage"><div class="mapwell"><svg viewBox="0 0 720 280" aria-label="Select a plant on the map" role="group"><image href="world.svg" width="720" height="280"/>${pins}<g id="maplabel" pointer-events="none"><rect x="11" y="-13" height="23" rx="3" fill="#102528" stroke="#647f7e"/><text x="18" y="3" fill="white" font-family="monospace" font-size="12"></text></g></svg>
  <div class="mapkey" id="mapkey"></div></div><aside class="inspector">
  <label for="plantpick">PLANT INSPECTOR</label><select id="plantpick" onchange="choosePlant(+this.value)">${plants.map(p=>`<option value="${p.p}">${p.name}</option>`).join('')}</select>
  <div id="plantmeta"></div><div class="telemetry"><span>Observed load</span><div><b id="load"></b> kWh <small>/ 15 min</small></div></div>
  <div id="loadchart"></div><div id="affected"></div><button class="invest-jump" onclick="meterScope=-1;investigationInterval=interval;go('Investigation')">Investigate this interval</button><button class="inspectlink" onclick="plant(selectedPlant)">Inspect meter hierarchy ${ico('chevron-right')}</button>
  </aside></div><div class="transport"><button id="play" onclick="toggleReplay()"></button><div class="scrub"><input type="range" id="scrub" min="0" max="95" value="${interval}" aria-label="Replay time at each plant" oninput="stopReplay();seek(+this.value)"><div><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:45</span></div></div></div></section>`;
}

function choosePlant(id) {
  selectedPlant = id;
  paintInterval();
}

function seek(t) {
  interval = t;
  paintInterval();
}

function stopReplay() {
  clearInterval(timer);
  timer = null;
  if ($('#play')) updatePlay();
}

function updatePlay() {
  $('#play').textContent = timer ? 'Ⅱ  Pause' : '▶  Play';
  $('#play').setAttribute('aria-label', timer ? 'Pause replay' : 'Play replay');
}

function toggleReplay() {
  if (timer) return stopReplay();
  if (interval === 95) seek(0);
  timer = setInterval(() => {
    seek(interval + 1);
    if (interval === 95) stopReplay();
  }, 700);
  updatePlay();
}

function paintInterval() {
  const p = plants[selectedPlant], subs = flat(p), t = interval;
  const states = plants.map(site => intervalState(site, t));
  $('#replayday').textContent=batchLedger[p.p].day+' NOV';
  $('#clock').textContent = time(t);
  $('#scrub').value = t;
  $('#scrub').setAttribute('aria-valuetext', time(t) + ' local');
  $('#plantpick').value = p.p;
  for (const site of plants) {
    const pin = $('#pin-' + site.p), label = site.name + ' · ' + states[site.p];
    pin.style.color = colors[states[site.p]];
    pin.classList.toggle('chosen', site === p);
    pin.setAttribute('aria-label', label);
    pin.setAttribute('aria-pressed', String(site === p));
    pin.querySelector('title').textContent = label;
  }
  const label = $('#maplabel'), width = p.name.length * 7.3 + 15;
  const x = (p.lon + 180)*2, y = (82-p.lat)*2;
  label.setAttribute('transform', 'translate(' + (x+width+12>720 ? x-width-24 : x) + ' ' + y + ')');
  label.querySelector('text').textContent = p.name;
  label.querySelector('rect').setAttribute('width', width);
  $('#mapkey').innerHTML = Object.keys(colors).map(s => `<span><i class="dot" style="background:${colors[s]}"></i>${s} · ${states.filter(v=>v===s).length}</span>`).join('');
  $('#plantmeta').textContent = batchNote(p);
  const totals = Array.from({length:96}, (_,n) => subs.reduce((a,s)=>a+(s.readings[n].value??0),0));
  $('#load').textContent = totals[t].toFixed(1);
  const hi=Math.max(...totals)*1.1, cx=t*3, cy=53-totals[t]/hi*48;
  const points=totals.map((v,n)=>n*3+','+(53-v/hi*48).toFixed(1)).join(' ');
  $('#loadchart').innerHTML = `<svg viewBox="0 0 285 57" preserveAspectRatio="none" role="img" aria-label="Observed energy profile, selected time ${time(t)}"><polygon points="0,56 ${points} 285,56" fill="#315654"/><polyline points="${points}" stroke="#8bd6be" stroke-width="1.6" fill="none"/><path d="M${cx} 0V56" stroke="#ebad78" stroke-dasharray="3 3"/><circle cx="${cx}" cy="${cy}" r="3" fill="#ffb77d"/>${totals.map((v,n)=>`<rect x="${n*3-1.5}" y="0" width="3" height="57" fill="transparent" data-tip="${p.name} · ${time(n)} local | Observed sum: ${kwh(v)} kWh"/>`).join('')}</svg>`;
  const flagged = subs.filter(s=>s.readings[t].flag);
  $('#affected').innerHTML = flagged.length ? flagged.map(s=>{
    const m=p.meters.findIndex(m=>m.subs.includes(s)), k=p.meters[m].subs.indexOf(s);
    return `<button class="event" onclick="sub(${p.p},${m},${k})">${ico('circle-alert')}<span><b>${hitNames(s.readings[t])}</b><small>${s.id}</small></span>${ico('chevron-right')}</button>`;
  }).join('') : '<div class="clearstate">'+ico('circle-check')+' All '+subs.length+' submeters valid</div>';
  updatePlay();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopReplay(); });
