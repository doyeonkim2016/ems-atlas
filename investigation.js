const reference = new Map(all.map(s => [s, s.readings.map((r,t) =>
  +(r.value ?? rBaseline(s,t)).toFixed(2))]));
function rBaseline(s,t) {
  return (s.readings.slice(0,48).reduce((a,r)=>a+(r.value??0),0)/48) + Math.sin(t*.19);
}
for (let t=40;t<=45;t++) plants[0].meters[0].subs[0].readings[t].value += 38;

let investigationInterval = 40;
let meterScope = -1;
const kwh = n => n.toLocaleString('en',{maximumFractionDigits:1});
const sum = a => a.reduce((n,v)=>n+v,0);
const signed = n => (n>=0?'+':'')+kwh(n);

const investigationGroups=[
 ['Investigate interval',[]],
 ['Usage & drivers',[0,1,2,4,5,6]],
 ['Data quality',[3,7,8,9]],
 ['Operating context',[10,11,12,13,14,15,16,17,18,19]],
 ['All charts',[]]
];
let investigationGroup=0, activeStudy=0;
function changeGroup(i){
 investigationGroup=i;
 if(investigationGroups[i][1].length)activeStudy=investigationGroups[i][1][0];
 renderInvestigation();
}
function openStudy(i){
 investigationGroup=investigationGroups.findIndex(g=>g[1].includes(i));
 activeStudy=i;
 renderInvestigation();
}
function openQualityInterval(t){
 investigationGroup=0;
 investigationInterval=t;
 renderInvestigation();
 document.getElementById('invest-evidence').scrollIntoView({block:'center'});
}
function renderInvestigation() {
  const p=plants[selectedPlant];
  if(meterScope>=p.meters.length)meterScope=-1;
  $('#body').innerHTML=`<div class="invest-controls"><button class="tablebtn" onclick="go('Plant analysis')">Tag breakdown &amp; week comparison</button>
  <label>Plant <select id="invest-plant">${plants.map(x=>`<option value="${x.p}" ${x===p?'selected':''}>${x.name}</option>`).join('')}</select></label>
  <label>Meter scope <select id="invest-meter"><option value="-1">All meters</option>${p.meters.map((m,j)=>`<option value="${j}" ${meterScope===j?'selected':''}>${m.name}</option>`).join('')}</select></label>
  </div><div class="inv-tabs" aria-label="Investigation views">${investigationGroups.map(([name],i)=>`<button aria-pressed="${i===investigationGroup}" onclick="changeGroup(${i})">${name}</button>`).join('')}</div><div ${investigationGroup===0?'':'hidden'}><div id="invest-kpis"></div><div class="invest-layout"><section class="panel"><div class="panelhead"><div><h2>Energy profile</h2><small>15-minute readings · UTC</small></div></div>
  <div id="invest-chart"></div><label class="invest-slider">Selected interval <input id="invest-range" type="range" min="0" max="95" aria-label="Investigation interval UTC"></label><div id="rule-time"></div><div id="invest-events" class="invest-events"></div></section>
  <aside class="panel"><div class="panelhead"><h2>Interval evidence</h2><output id="invest-time" class="mono"></output></div><div id="invest-evidence"></div></aside></div>
  <section class="panel directory"><div class="panelhead"><div><h2>Demand composition</h2><small>Observed usage for the day · Select a meter to isolate its profile</small></div></div><div id="invest-mix"></div></section></div><section class="panel directory" id="explorer" ${investigationGroup===0?'hidden':''}></section>`;
  $('#invest-plant').onchange=e=>{selectedPlant=+e.target.value;meterScope=-1;renderInvestigation()};
  $('#invest-meter').onchange=e=>{meterScope=+e.target.value;renderInvestigation()};
  $('#invest-range').oninput=e=>inspectInterval(+e.target.value);
  paintInvestigation();
}

function inspectInterval(t) {
  investigationInterval=t;
  paintInvestigation();
}

function paintInvestigation() {
  const p=plants[selectedPlant], t=investigationInterval;
  const subs=meterScope<0?flat(p):p.meters[meterScope].subs;
  const series=Array.from({length:96},(_,n)=>{
    const observed=sum(subs.map(s=>s.readings[n].value??0));
    const expected=sum(subs.map(s=>reference.get(s)[n]));
    const flagged=subs.filter(s=>s.readings[n].flag).length;
    return {observed,expected,flagged,spike:!flagged&&observed-expected>=Math.max(10,expected*.20)};
  });
  const total=sum(series.map(x=>x.observed)), expected=sum(series.map(x=>x.expected));
  $('#invest-kpis').innerHTML=`<div class="metrics invest-kpis">${[
    ['Observed usage',kwh(total)+' kWh','Sum of available readings'],['Sample baseline',kwh(expected)+' kWh','Simulated reference profile'],
    ['Usage deviations',series.filter(x=>x.spike).length,'Intervals ≥20% and ≥10 kWh above reference'],
    ['Data quality flags',series.filter(x=>x.flagged).length,'Intervals with at least one flagged reading']
  ].map(([a,b,c])=>`<div class="metric"><label>${a}</label><strong>${b}</strong><div class="sub">${c}</div></div>`).join('')}</div>`;
  const x=n=>55+n*8, max=Math.ceil(Math.max(...series.flatMap(q=>[q.observed,q.expected]))/25)*25;
  const y=n=>214-n/max*180;
  const points=key=>series.map((q,n)=>x(n)+','+y(q[key])).join(' ');
  const ticks=[0,1,2,3,4].map(n=>`<path d="M55 ${y(max*n/4)}H815" stroke="#e0e8e6"/><text x="42" y="${y(max*n/4)+4}" text-anchor="end">${kwh(max*n/4)}</text>`).join('');
  $('#invest-chart').innerHTML=`<div class="chartlegend"><span class="observed">Observed</span><span class="baseline">Sample baseline</span><span class="spike">Usage spike</span><span class="quality">Data quality flag</span></div>
    <svg class="energyplot" viewBox="0 0 850 251" role="img" aria-label="Observed energy and sample baseline by 15-minute interval">
    <text x="13" y="17">kWh</text>${ticks}
    ${series.map((q,n)=>q.flagged?`<rect x="${x(n)-4}" y="34" width="8" height="180" fill="#f9ead0"/>`:'').join('')}
    <polyline points="${points('expected')}" fill="none" stroke="#859b98" stroke-width="2" stroke-dasharray="5 4"/>
    <polyline points="${points('observed')}" fill="none" stroke="#226f67" stroke-width="2.3"/>
    ${series.map((q,n)=>q.spike?`<circle cx="${x(n)}" cy="${y(q.observed)}" r="3.6" fill="#c55736"/>`:'').join('')}
    <path d="M${x(t)} 29V218" stroke="#1b3535" stroke-dasharray="4 3"/><circle cx="${x(t)}" cy="${y(series[t].observed)}" r="5" fill="#173c3a" stroke="white" stroke-width="1.5"/>
    ${[0,24,48,72,95].map(n=>`<text x="${x(n)}" y="239" text-anchor="middle">${time(n)}</text>`).join('')}
    ${series.map((q,n)=>`<rect x="${x(n)-4}" y="28" width="8" height="194" fill="transparent" onclick="inspectInterval(${n})"><title>${time(n)} · ${kwh(q.observed)} kWh${q.flagged?' · Data quality flag':q.spike?' · Usage spike':''}</title></rect>`).join('')}</svg>`;
  $('#invest-range').value=t;
  $('#invest-range').setAttribute('aria-valuetext',time(t)+' UTC');
  const episodes=[];
  for (const [n,q] of series.entries()) {
    const kind=q.flagged?'Data quality flag':q.spike?'Usage spike':null;
    if(kind && (n===0 || (series[n-1].flagged?'Data quality flag':series[n-1].spike?'Usage spike':null)!==kind))
      episodes.push({n,kind});
  }
  $('#invest-events').innerHTML=episodes.length?episodes.map(({n,kind})=>`<button class="tablebtn" onclick="inspectInterval(${n})">${time(n)} · ${kind}</button>`).join(''):'<small>No spikes or quality flags in this scope</small>';
  $('#invest-time').textContent=time(t)+' UTC';
  const q=series[t], rows=[];
  p.meters.forEach((m,j)=>{
    if(meterScope>=0&&meterScope!==j)return;
    m.subs.forEach((s,k)=>{
      const r=s.readings[t];
      rows.push({s,j,k,r,delta:r.value===null?null:r.value-reference.get(s)[t]});
    });
  });
  rows.sort((a,b)=>Number(b.r.flag)-Number(a.r.flag)||Math.abs(b.delta??0)-Math.abs(a.delta??0));
  $('#invest-evidence').innerHTML=`<div class="evidence-summary"><b>${q.flagged?'Data quality flag':q.spike?'Usage spike':'Within sample range'}</b><p>${kwh(q.observed)} kWh observed · ${kwh(q.expected)} kWh baseline</p><small>${q.flagged? q.flagged+' flagged submeter(s) · observed total may be incomplete':signed(q.observed-q.expected)+' kWh vs baseline'}</small></div>
    <div class="evidence-rows">${rows.map(({s,j,k,r,delta})=>`<button class="tree" onclick="sub(${p.p},${j},${k})"><span><b>${s.name}</b><small>${p.meters[j].name} · ${s.id}</small></span><span class="reading-end">${r.flag?hitNames(r):delta?'Δ '+signed(delta)+' kWh':kwh(r.value)+' kWh'} ${ico('chevron-right')}</span></button>`).join('')}</div>`;
  const mix=p.meters.map((m,j)=>({m,j,usage:sum(m.subs.flatMap(s=>s.readings.map(r=>r.value??0)))})).sort((a,b)=>b.usage-a.usage);
  const whole=sum(mix.map(x=>x.usage));
  $('#invest-mix').innerHTML=mix.map(({m,j,usage})=>`<button class="mix-row ${j===meterScope?'active-mix':''}" aria-pressed="${j===meterScope}" onclick="meterScope=meterScope===${j}?-1:${j};renderInvestigation()"><b>${m.name}</b><span class="mix-track"><i style="width:${100*usage/whole}%"></i></span><span>${kwh(100*usage/whole)}%</span><span>${kwh(usage)} kWh</span></button>`).join('');
  ruleTimeline(subs,t);
  if(investigationGroup!==0)drawExplorer(p,subs,series,t);
}


const studies=[
 ['Variance drivers','Which submeter explains the change?','Signed difference from the simulated baseline at the selected interval. Flagged readings are excluded.'],
 ['Hourly energy','When was energy use highest?','Hourly sums reveal peaks. Hatched bars indicate that at least one reading needs review.'],
 ['Cumulative energy','When did the daily gap build up?','Running totals show whether a brief surge materially changes the daily energy balance.'],
 ['Quality heatmap','Which submeters failed together?','Aligned 15-minute cells expose coincident gaps across equipment. Select a cell to inspect its interval.'],
 ['Pareto concentration','How many submeters account for most usage?','Cumulative share after sorting by observed daily energy helps focus metering reviews.'],
 ['Load duration','Was high consumption brief or sustained?','Ranking valid intervals by energy shows the frequency of high load independently of clock time.'],
 ['Energy histogram','What level of consumption is typical?','Eight bins summarize the spread of valid 15-minute energy totals within this day.'],
 ['Hourly coverage','Can the hourly comparison be trusted?','Valid readings divided by expected readings identifies hours needing data review.'],
 ['Longest gap','Where was the longest interruption?','The longest uninterrupted run of missing values identifies outages hidden by daily averages.'],
 ['Quality burden','Which devices account for flagged readings?','Counts by submeter prioritize devices that generate repeated missing, delayed or duplicate readings.']
];
const candidates=[
 ['Calendar heatmap','Check whether anomalies recur by weekday and hour.','Several weeks of timestamped readings and plant timezone'],
 ['Historical normal band','Separate unusual usage from normal shift variation.','Comparable historical shifts and sufficient valid samples'],
 ['Energy intensity','Track kWh per tonne to account for output changes.','Production tonnes aligned to time and meter scope'],
 ['Production scatterplot','Identify shifts using excess energy at similar output.','Paired energy and output across many shifts, product mix'],
 ['Idle energy','Quantify load while a line is scheduled off.','Run/stop history and equipment mapping'],
 ['Tariff cost breakdown','Rank anomalies by their cost impact.','Local tariff periods, currency and billing rules'],
 ['Parent–child balance','Locate unexplained supply-versus-demand differences.','Independent parent readings, verified hierarchy and aligned coverage'],
 ['Gateway incident timeline','Test whether several meter faults coincide with a gateway outage.','Gateway mapping and independent gateway logs'],
 ['Ingestion latency percentiles','Find sources that regularly arrive late.','Source and ingestion timestamps with synchronized clocks'],
 ['Peer plant benchmark','Compare efficiency across similar sites.','Comparable processes, production scope and normalized units']
];
function studyCard(p,subs,series,t,explorerView){
 const [name,question,reason]=studies[explorerView];
 const total=s=>sum(s.readings.map(r=>r.value??0));
 const hours=Array.from({length:24},(_,h)=>series.slice(h*4,h*4+4));
 const valid=series.filter(q=>!q.flagged).map(q=>q.observed);
 const bars=(items,unit,diverging=false)=>{
   const peak=Math.max(1,...items.map(x=>Math.abs(x[1])));
   return items.map(([label,value,flag])=>`<div class="studybar"><span>${label}</span><div class="studytrack ${diverging?'diverge':''}"><i style="width:${Math.abs(value)/peak*(diverging?50:100)}%;left:${diverging?(value<0?50-Math.abs(value)/peak*50:50):0}%;background:${flag?'repeating-linear-gradient(45deg,#ddac71 0 3px,#f4d7b1 3px 6px)':value<0?'#be7958':'#599c8c'}"></i></div><b>${kwh(value)} ${unit}</b></div>`).join('');
 };
 const plot=(lines,unit)=>{
   const hi=Math.max(1,...lines.flat()),w=720;
   return `<svg viewBox="0 0 800 175" role="img" aria-label="${name} in ${unit}"><text x="2" y="18">${kwh(hi)}</text><text x="6" y="146">0</text><path d="M62 10V145H782" fill="none" stroke="#b8c6c2"/>${lines.map((line,i)=>`<polyline points="${line.map((v,n)=>(62+w*n/Math.max(1,line.length-1))+','+(145-130*v/hi)).join(' ')}" stroke="${i?'#bd805c':'#297e71'}" stroke-width="3" fill="none" ${i?'stroke-dasharray="5 4"':''}/>`).join('')}</svg>`;
 };
 let chart='';
 switch(explorerView){
 case 0:chart=bars(subs.filter(s=>!s.readings[t].flag).map(s=>[s.id,s.readings[t].value-reference.get(s)[t]]).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])),'kWh',true)||'No valid readings';break;
 case 1:chart=bars(hours.map((h,i)=>[time(i*4),sum(h.map(q=>q.observed)),h.some(q=>q.flagged)]),'kWh');break;
 case 2:{let a=0,b=0;chart=plot([series.map(q=>a+=q.observed),series.map(q=>b+=q.expected)],'kWh')+'<small>00:00 – 23:45 UTC · Solid observed / dashed baseline · kWh</small>';break}
 case 3:chart='<small>00:00 – 23:45 UTC · Green valid / orange flagged</small>'+subs.map(s=>`<div class="matrixrow"><span>${s.id}</span><div>${s.readings.map((r,n)=>`<button title="${time(n)} · ${hitNames(r)}" style="background:${r.flag?'#cf894b':'#71a698'}" onclick="openQualityInterval(${n})"></button>`).join('')}</div></div>`).join('');break;
 case 4:{let running=0;const sorted=subs.map(s=>[s.id,total(s)]).sort((a,b)=>b[1]-a[1]);const whole=sum(sorted.map(x=>x[1]));chart=bars(sorted.map(([id,v])=>[id,100*(running+=v)/whole]),'%');break}
 case 5:chart=plot([valid.slice().sort((a,b)=>b-a)],'kWh')+'<small>Highest to lowest valid interval · kWh per 15 minutes</small>';break;
 case 6:{let min=Math.min(...valid),width=(Math.max(...valid)-min)/8||1;const bins=Array(8).fill(0);valid.forEach(v=>bins[Math.min(7,Math.floor((v-min)/width))]++);chart=bars(bins.map((v,i)=>[kwh(min+i*width)+'–'+kwh(min+(i+1)*width)+' kWh',v]),'slots');break}
 case 7:chart=bars(hours.map((h,i)=>[time(i*4),100*(1-sum(h.map(q=>q.flagged))/(subs.length*4))]),'%');break;
 case 8:chart=bars(subs.map(s=>{let run=0,max=0;for(const r of s.readings){run=r.source.count===0?run+15:0;max=Math.max(run,max)}return [s.id,max]}).sort((a,b)=>b[1]-a[1]),'min');break;
 case 9:chart=bars(subs.map(s=>[s.id,s.readings.filter(r=>r.flag).length]).sort((a,b)=>b[1]-a[1]),'flags');break;
 }
 return galleryCard(name,question,reason,chart);
}
function galleryCard(name,question,reason,chart){
 return `<article class="study"><h3>${name}</h3><p>${question}</p><div class="studyplot">${chart}</div><small>${reason}</small></article>`;
}
function drawExplorer(p,subs,series,t){
 const h=Array.from({length:24},(_,i)=>sum(series.slice(i*4,i*4+4).map(q=>q.observed)));
 const production=h.map((_,i)=>i<5?0:12+6*Math.sin(i*.7+p.p));
 const totalEnergy=sum(h);
 const labels=h.map((_,i)=>String(i).padStart(2,'0'));
 function graphic(content,caption){return '<svg viewBox="0 0 350 115" role="img" aria-label="'+caption+'">'+content+'</svg><small>'+caption+'</small>'}
 function columns(vals,caption,names=labels){const hi=Math.max(...vals,1),w=300/vals.length;return graphic(vals.map((v,i)=>`<rect x="${30+i*w}" y="${84-70*v/hi}" width="${w*.73}" height="${70*v/hi}" fill="#458678"><title>${names[i]} · ${kwh(v)}</title></rect>${(vals.length<6||i%4===0)?`<text x="${30+i*w}" y="102">${names[i]}</text>`:''}`).join(''),caption)}
 const path=(arr,max)=>arr.map((v,i)=>(15+i*320/(arr.length-1))+','+(90-v/max*75)).join(' ');
 const ref=series.map(q=>q.expected),hi=Math.max(...series.map(q=>Math.max(q.expected*1.15,q.observed)));
 const heat=graphic(Array.from({length:7},(_,d)=>labels.map((l,i)=>`<rect x="${25+i*13}" y="${d*14+2}" width="12" height="13" fill="hsl(168 26% ${80-38*(1+Math.sin(i*.3+d*.8))/2}%)"><title>Day ${d+1} · ${l}:00 · simulated usage index</title></rect>`).join('')+`<text y="${d*14+13}">${['M','T','W','T','F','S','S'][d]}</text>`).join(''),'Mon–Sun · 00–23 UTC · darker = higher illustrative load');
 const band=graphic(`<polygon points="${path(ref.map(v=>v*1.15),hi)} ${path(ref.map(v=>v*.85),hi).split(' ').reverse().join(' ')}" fill="#c3dcd1"/><polyline points="${path(series.map(q=>q.observed),hi)}" stroke="#256b61" stroke-width="2" fill="none"/>`,'00–23 UTC · illustrative ±15% band · observed energy');
 const points=graphic(h.map((v,i)=>`<circle cx="${20+production[i]*16}" cy="${90-v/Math.max(...h)*72}" r="3" fill="#347d70"><title>${labels[i]}:00 · ${kwh(production[i])} t · ${kwh(v)} kWh</title></circle>`).join(''),'Horizontal: production (t) · vertical: observed energy (kWh)');
 const tiers=[.12,.19,.28], costs=tiers.map((r,k)=>sum(h.slice(k*8,k*8+8))*r);
 const qa=series.map(q=>q.flagged>0);
 const gateway=graphic(['Meter flag','Gateway log'].map((n,j)=>`<text x="0" y="${35+j*34}">${n}</text>`+qa.map((v,i)=>`<rect x="${82+2.65*i}" y="${22+j*34}" width="2.6" height="15" fill="${(j?i>=65&&i<78:v)?'#c98654':'#cddecf'}"/>`).join('')).join(''),'00–23 UTC · orange = event · gateway track simulated');
 const peers=['Site A','Site B','Site C','Site D'];
 const charts=[heat,band,columns(h.map((v,i)=>production[i]?v/production[i]:0),'kWh/t by hour · 00–04 excluded (idle hours)'),points,
 columns([sum(h.slice(0,5)),sum(h.slice(5))],'Energy (kWh) · assumed idle schedule 00–05 UTC',['Idle','Running']),
 columns(costs,'Estimated cost by tariff block · illustrative currency units',['00–08','08–16','16–24']),
 columns([totalEnergy*1.04,totalEnergy,totalEnergy*.04],'Energy (kWh) · illustrative independent supply reading',['Supply','Submeters','Residual']),gateway,
 columns([3,11,29],'Illustrative ingestion delay in seconds',['P50','P95','P99']),
 columns([.9,1.03,1.14,.95].map(k=>k*totalEnergy/sum(production)),'Simulated peer intensity (kWh/t)',peers)];
 const catalog=[...studies,...candidates];
 if(investigationGroup===4){
   $('#explorer').innerHTML='<div class="panelhead"><h2>Chart directory</h2><small>20 charts</small></div><div class="chartindex">'+investigationGroups.slice(1,4).map(([name,ids])=>`<section><h3>${name}</h3>${ids.map(i=>`<button onclick="openStudy(${i})"><b>${catalog[i][0]}</b><small>${catalog[i][1]}</small></button>`).join('')}</section>`).join('')+'</div>';
   return;
 }
 const [group,ids]=investigationGroups[investigationGroup];
 const i=activeStudy;
 const card=i<10?studyCard(p,subs,series,t,i):galleryCard(...candidates[i-10].slice(0,2),'Simulated scenario · Operational data required: '+candidates[i-10][2],charts[i-10]);
 $('#explorer').innerHTML=`<div class="panelhead"><h2>${group}</h2><small>${p.name} · ${meterScope<0?'All meters':p.meters[meterScope].name} · ${time(t)} UTC</small></div>${investigationGroup===2?qualityMatrix():''}<div class="focusgrid"><div class="chartchoices">${ids.map(j=>`<button aria-pressed="${j===i}" onclick="openStudy(${j})">${catalog[j][0]}</button>`).join('')}</div><div>${card}</div></div>`;
}
