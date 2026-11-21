// Rules run against a normalized interval and its preserved sample source fields.
const dqRules=[
 ['DQ01','No reading','Completeness','Critical','No source row arrived for an expected 15-minute slot.',o=>o.count===0?'Expected 1 row · received 0':null],
 ['DQ02','Missing value','Completeness','Critical','A source row arrived with a null numeric value.',o=>o.count>0&&o.raw===null?'Received 1 row · value = null':null],
 ['DQ03','Missing UOM','Units','Warning','A numeric source reading has a blank unit.',o=>o.count&&o.raw!==null&&!o.unit?'Raw value '+o.raw+' · unit blank · excluded from kWh':null],
 ['DQ04','Counter reset','Continuity','Warning','The cumulative register decreased between consecutive readings.',o=>o.counter<o.previous?'Register '+o.previous+' → '+o.counter+' kWh · verify reset or rollover':null],
 ['DQ05','Delayed reading','Timeliness','Warning','Source capture lag exceeded 15 minutes within the delivered file.',o=>o.delay>15?'Arrival lag '+o.delay+' min · limit 15 min':null],
 ['DQ06','Duplicate reading','Uniqueness','Warning','Multiple rows share the meter and interval key.',o=>o.count>1?'Same key received '+o.count+' times':null],
 ['OP01','Usage spike','Usage','Warning','Valid usage exceeds baseline by at least 20% and 10 kWh.',o=>o.unit==='kWh'&&o.raw-o.base>=Math.max(10,.2*o.base)?o.raw+' kWh observed · '+o.base+' kWh baseline':null],
 ['OP02','Usage during rest','Schedule','Warning','Scheduled REST with energy above the demo idle allowance of 2 kWh.',o=>o.state==='REST'&&o.raw>2?'Scheduled REST · '+o.raw+' kWh · allowance 2 kWh':null],
 ['OP03','Equipment not working','Equipment','Critical','Scheduled RUN with explicit equipment feedback FAULT.',o=>o.state==='RUN'&&o.feedback==='FAULT'?'Scheduled RUN · feedback FAULT · observed '+o.raw+' kWh':null]
];
function ruleApplies(id,o){
 switch(id){
 case 'DQ02':case 'DQ05':case 'DQ06':return o.count>0;
 case 'DQ03':return o.count>0 && Number.isFinite(o.raw);
 case 'DQ04':return Number.isFinite(o.counter) && Number.isFinite(o.previous);
 case 'OP01':return Number.isFinite(o.raw) && Number.isFinite(o.base) && o.unit==='kWh';
 case 'OP02':return o.state==='REST' && Number.isFinite(o.raw) && o.unit==='kWh';
 case 'OP03':return o.state==='RUN' && Boolean(o.feedback);
 default:return true;
 }
}
for(const p of plants)for(const s of flat(p))s.readings.forEach((r,t)=>{
 const o={raw:r.value,unit:'kWh',count:r.value===null?0:1,base:reference.get(s)[t],delay:0,state:'RUN',feedback:'OK'};
 if(r.flag&&s.issue==='Delayed readings')o.delay=22;
 if(r.flag&&s.issue==='Duplicate readings')o.count=2;
 if(s===plants[0].meters[0].subs[0]){
   if(t===24)o.state='REST';
   if(t===32){o.feedback='FAULT';o.raw=0}
   if(t===48){o.previous=13842;o.counter=3}
   if(t===52)o.unit='';
   if(t===56)o.raw=null;
 }
 r.source=o;r.hits=dqRules.map(([id,name,group,severity,test,check])=>({id,name,severity,evidence:ruleApplies(id,o)?check(o):null})).filter(h=>h.evidence);
 r.flag=r.hits.some(h=>h.id.startsWith('DQ'));
 r.value=o.unit==='kWh'?o.raw:null;
});
function hitNames(r){return r.hits?.map(h=>h.name).join(', ')||'Valid'}
function rulebook(){
 $('#body').innerHTML='<section class="panel"><div class="panelhead"><div><h2>Rule definitions</h2><small>15-minute sample intervals · Select an example to inspect the source evidence.</small></div></div>'+dqRules.map(([id,name,group,severity,test])=>{
 for(const p of plants)for(const [j,m] of p.meters.entries())for(const s of m.subs){const t=s.readings.findIndex(r=>r.hits.some(h=>h.id===id));if(t>=0)return `<div class="ruledef"><div><small>${id} · ${group} · ${severity}</small><h3>${name}</h3><p>${test}</p></div><button class="tablebtn" onclick="selectedPlant=${p.p};meterScope=${j};investigationInterval=${t};go('Investigation')">Inspect ${p.name} · ${time(t)}</button></div>`;}
 return `<div class="ruledef"><div><small>${id} · ${group} · ${severity}</small><h3>${name}</h3><p>${test}</p></div><small>No breach in this batch</small></div>`;
 }).join('')+'<div class="ruledef"><div><small>Gold · Demo policies</small><h3>Delta exclusions and post-Gold checks</h3><p>Review register resets, duplicate Gold rows, sustained rest usage and parent–child balance.</p></div><button class="tablebtn" onclick="openGoldAudit(0)">Inspect demo batch</button></div></section>';
}
function ruleTimeline(subs,t){
 const entries=[];
 const lanes=dqRules.map(([id,name])=>{
 const cells=subs[0].readings.map((_,n)=>{
 const found=subs.flatMap(s=>s.readings[n].hits.filter(h=>h.id===id).map(h=>({s,h})));
 if(n===t)entries.push(...found);
 return found.length?`<button class="hitcell ${n===t?'picked':''}" aria-label="${name} at ${time(n)}" title="${name} · ${time(n)} local" onclick="inspectInterval(${n})"></button>` : (n===t?'<i class="picked"></i>':'<i></i>');
 }).join('');
 return `<div class="rulelane"><span>${id} · ${name}</span><div>${cells}</div></div>`;
 }).join('');
 const events = Array.from({length:96},(_,n)=>subs.some(s=>s.readings[n].hits.some(h=>!s.readings[n-1]?.hits.some(prev=>prev.id===h.id))));
 const previous=events.lastIndexOf(true,t-1), next=events.findIndex((hit,n)=>hit&&n>t);
 const steps=`<div class="eventsteps"><button class="tablebtn" ${previous<0||t===0?'disabled':''} onclick="inspectInterval(${previous})">Previous event</button><output>${time(t)} local</output><button class="tablebtn" ${next<0?'disabled':''} onclick="inspectInterval(${next})">Next event</button></div>`;
 $('#rule-time').innerHTML='<div class="panelhead"><h2>Rule flags by interval</h2><button class="link" onclick="go(\'Rulebook\')">DQ Rulebook</button></div><div class="rulegrid"><small>00:00–23:45 plant local · Select a highlighted interval</small>'+lanes+'</div>'+steps;
 const p=plants[selectedPlant];
 const coverage=dqRules.map(([id,name])=>{
  const applicable=subs.filter(s=>ruleApplies(id,s.readings[t].source)).length;
  const breached=entries.filter(e=>e.h.id===id).length;
  return `<tr><th>${id} · ${name}</th><td>${applicable-breached}</td><td>${breached}</td><td>${subs.length-applicable}</td></tr>`;
 }).join('');
 const evidence=entries.map(({s,h})=>{
  const event=breachEvent(p,s,t,h);
  const payload=encodeURIComponent(JSON.stringify(event,null,2));
  return `<div class="breachproof"><strong>${h.id} · ${h.name}</strong><small>${s.id} · ${h.severity}</small><p>${h.evidence}</p><b>Teams · ${safeText(deliveryStatus(event.id))}</b><a download="ems-alert.json" href="data:application/json;charset=utf-8,${payload}">Download relay event</a></div>`;
 }).join('');
 $('#invest-evidence').insertAdjacentHTML('afterbegin',`<div class="ruleproof"><b>${p.name} · ${batchLedger[p.p].day} Nov · ${time(t)} local</b><p>${entries.length} rule breaches across ${subs.length} selected submeters</p>${evidence}<details><summary>Checks at this interval · ${dqRules.length} rules</summary><div class="scroll"><table><thead><tr><th>Rule</th><th>Passed</th><th>Breach</th><th>N/A</th></tr></thead><tbody>${coverage}</tbody></table></div><small>Counts are submeters. N/A means required source fields or operating conditions are absent.</small></details></div>`);
 $('#invest-evidence').insertAdjacentHTML('beforeend','<button class="action" onclick="requestAtInterval()">Request plant review</button>');

}
go(new URLSearchParams(location.search).has('request')?'Requests':(concept?'Overview':'Reported energy'));
