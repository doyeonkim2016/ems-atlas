// An illustrative batch extract. The upload and register policies belong to this scenario.
const goldChecks=[
 ['GX01','Positive delta above 50 kWh / 15 min','Exclude the interval'],
 ['GX02','Negative delta without a confirmed reset','Exclude the interval'],
 ['GX03','Register reset with a confirmed anchor','Exclude the boundary and use the new register for the next delta'],
 ['GX04','Missing register endpoint','Hold the interval until both adjacent readings are available'],
 ['GA01','Gold row count or sum disagrees with the Silver delta','Investigate Gold transformation'],
 ['GA02','Four or more consecutive rest slots above twice the 2 kWh reference','Ask the plant to confirm operation'],
 ['GA03','Complete child sum exceeds an independently metered parent by over 5%','Check hierarchy, scope and meter calibration']
];
const goldName=id=>goldChecks.find(rule=>rule[0]===id)[1];
function goldFixture(p,s){
 const example=s===flat(p)[0];
 let register=1200,previous=register;
 return s.readings.map((reading,t)=>{
  const rest=t<16;
  let usage=rest?(example?8:2):Math.round(reference.get(s)[t]);
  if(example&&t===36)usage=75;
  if(example&&t===40)usage=-8;
  const reset=example&&t===48;
  register=reset?5:register+usage;
  const current=reading.source.count&&reading.source.raw!==null?register:null;
  const delta=current===null||previous===null?null:current-previous;
  const exclusion=delta===null?'GX04':reset?'GX03':delta<0?'GX02':delta>50?'GX01':null;
  const rows=exclusion?[]:[delta];
  if(example&&t===58&&rows.length)rows.push(delta);
  const parent=delta===null?null:Math.max(60,delta+60);
  // Sibling total and parent belong to the same illustrative 15-minute boundary.
  const siblings=parent===null?null:parent-delta+(example&&t===60?20:-3);
  const item={previous,current,delta,reset,exclusion,rows,rest,parent,siblings};
  previous=current;
  return item;
 });
}
function goldAudit(extract){
 let streak=0;
 return extract.map((row,t)=>{
  const included=row.rows.length>0,reported=included?sum(row.rows):null;
  const issues=[];
  if(included&&(row.rows.length!==1||row.delta===null||Math.abs(reported-row.delta)>.001))issues.push('GA01');
  streak=row.rest&&included&&reported>4?streak+1:0;
  if(streak>=4)issues.push('GA02');
  const children=included&&row.siblings!==null?row.siblings+reported:null;
  if(children!==null&&row.parent>0&&children>row.parent*1.05)issues.push('GA03');
  return {...row,t,included,reported,issues,streak,children};
 });
}
let goldIndex=0;
const goldVal=v=>v===null?'—':kwh(v);
function goldChart(data,t){
 const x=i=>46+i*7.4;
 const rawMax=Math.max(1,...data.map(r=>r.current??0));
 const goldMax=Math.max(1,...data.map(r=>r.reported??0));
 let prev=false;
 const path=data.map(r=>{
  if(r.current===null){prev=false;return ''}
  const segment=(prev&&!r.reset?'L':'M')+x(r.t)+' '+(99-68*r.current/rawMax);
  prev=true;return segment;
 }).join(' ');
 return `<svg class="goldchart" viewBox="0 0 780 245" aria-label="Silver register and Gold interval usage on a shared local time axis">
 <defs><pattern id="goldhatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5L5 0" stroke="#955925"/></pattern></defs>
 <text x="12" y="18">Silver · cumulative kWh</text><path d="M42 100H755 M42 208H755" stroke="#c8cbc9"/><path d="${path}" fill="none" stroke="#436678" stroke-width="2"/>
 <text x="12" y="130">Gold · kWh per 15 minutes</text>
 ${data.map(r=>r.included?`<rect x="${x(r.t)-3}" y="${208-Math.max(2,66*r.reported/goldMax)}" width="6" height="${Math.max(2,66*r.reported/goldMax)}" fill="${r.issues.length?'#a73549':'#41776e'}"/>`:`<rect x="${x(r.t)-3}" y="143" width="6" height="65" fill="url(#goldhatch)"/>`).join('')}
 ${data.filter(r=>r.reset).map(r=>`<text x="${x(r.t)}" y="88">↺</text>`).join('')}
 <path d="M${x(t)} 24V211" stroke="#362e31" stroke-dasharray="3 3"/>
 ${[0,24,48,72,95].map(i=>`<text x="${x(i)}" y="231" text-anchor="middle">${time(i)}</text>`).join('')}
 ${data.map(r=>`<rect x="${x(r.t)-3.7}" y="22" width="7.4" height="190" fill="transparent" data-tip="${time(r.t)} local | Silver: ${goldVal(r.current)} kWh | Gold: ${r.included?goldVal(r.reported)+' kWh':'Excluded · '+r.exclusion}" onclick="goldSelect(${r.t})"/>`).join('')}</svg>`;
}
function goldSelect(t){investigationInterval=Number(t);renderGold()}
function goldScope(){const p=plants[selectedPlant];return meterScope<0?flat(p):p.meters[meterScope].subs}
function renderGold(){
 const p=plants[selectedPlant],subs=goldScope();
 if(goldIndex>=subs.length)goldIndex=0;
 const s=subs[goldIndex],data=goldAudit(goldFixture(p,s)),t=investigationInterval,r=data[t];
 const rules=[...(r.exclusion?[r.exclusion]:[]),...r.issues];
 const hits=rules.map(id=>{
  const event=breachEvent(p,s,t,{id,name:goldName(id),severity:'Review'});
  return `<div class="breachproof"><b>${id} · ${goldName(id)}</b><small>Teams · ${safeText(deliveryStatus(event.id))}</small><a download="gold-event.json" href="data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(event))}">Download relay event</a></div>`;
 }).join('');
 const jumps=goldChecks.map(([id])=>{
  const at=data.findIndex(row=>row.exclusion===id||row.issues.includes(id));
  return at<0?'':`<button class="tablebtn" onclick="goldSelect(${at})">${id} · ${time(at)}</button>`;
 }).join('');
 $('#explorer').innerHTML=`<div class="panelhead"><div><h2>Silver → Gold audit</h2><small>Illustrative register and Gold extract · ${batchNote(p)}</small></div><label>Submeter <select onchange="goldIndex=+this.value;renderGold()">${subs.map((m,i)=>`<option value="${i}" ${i===goldIndex?'selected':''}>${m.id}</option>`).join('')}</select></label></div>
 <div class="invest-layout"><div class="study"><h3>Reporting decisions by interval</h3>${goldChart(data,t)}<small>Green: included · Red: included with anomaly · Hatched: excluded · ↺ reset anchor</small>
 <label class="invest-slider">Local time <input type="range" min="0" max="95" value="${t}" oninput="goldSelect(this.value);document.querySelector('#explorer input').focus()"></label>
 <div class="eventsteps">${jumps}</div><details><summary>Layer rules and demo thresholds</summary><p>Bronze checks daily delivery. Silver retains register endpoints. Gold evaluates interval deltas, then audits the resulting rows.</p>${goldChecks.map(([id,name,action])=>`<p><b>${id}</b> · ${name}<br>${action}</p>`).join('')}</details></div>
 <aside class="study"><h3>${s.id} · ${time(t)} local</h3><p><b>Reporting inclusion</b><br>${r.included?'Included · '+goldVal(r.reported)+' kWh':'Excluded · '+r.exclusion}</p>
 <p><b>Silver endpoints</b><br>${goldVal(r.previous)} → ${goldVal(r.current)} kWh · 15 min<br>Calculated delta: ${goldVal(r.delta)} kWh</p>
 <p><b>Gold calculation</b><br>${r.rows.length} output rows · ${r.issues.includes('GA01')?'Reconciliation failed':r.included?'Matches Silver delta':'No published value'}</p>
 <p><b>Operating pattern</b><br>${r.issues.includes('GA02')?r.streak*15+' min above rest reference · '+goldVal(r.reported)+' vs 2 kWh this interval':r.included?'No sustained-rest breach at this time':'Unassessed'}</p>
 ${r.issues.includes('GA03')?`<p><b>Meter balance</b><br>Children ${goldVal(r.children)} · parent ${goldVal(r.parent)} kWh</p>`:''}
 ${hits}<button class="action" onclick="requestGoldReview()">Request review</button></aside></div>`;
}
function requestGoldReview(){
 const p=plants[selectedPlant],s=goldScope()[goldIndex],r=goldAudit(goldFixture(p,s))[investigationInterval];
 const notes=['Demo Silver endpoints '+goldVal(r.previous)+' → '+goldVal(r.current)+' kWh','Delta '+goldVal(r.delta)+' kWh',r.included?'Gold included '+goldVal(r.reported)+' kWh':'Gold excluded '+r.exclusion,'Gold rows '+r.rows.length,...r.issues.map(id=>id+' '+goldName(id))];
 requestAtInterval({sub:s,notes:notes.join(' | ')});
}
function openGoldAudit(i){
 if(document.querySelector('dialog').open)document.querySelector('dialog').close();selectedPlant=i;meterScope=-1;goldIndex=0;investigationInterval=3;
 go('Investigation');changeGroup(5);
}
