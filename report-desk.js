const businessLabels={positive_spike_ignored:'Spike excluded',low_reading_ignored:'Low reading excluded',silver_only:'Gold output missing',reset_anchor:'Reset boundary',missing_factor:'Missing conversion factor',approved_override:'Approved override',rest_usage:'Usage in scheduled rest'};
function findingType(r){
 if(r.tag.type==='power')return '';
 if(r.tag.factor===null&&r.delta!==null)return 'missing_factor';
 if(r.status!=='ok')return r.status;
 // Explicit fictional maintenance window for this pilot only.
 if(r.tag===pilotTags[1]&&r.i>=96&&r.i<104&&r.delta>2)return 'rest_usage';
 return '';
}
function episodes(tags){
 const list=[];
 for(const tag of tags){
  let group;
  for(const r of pilotData.get(tag.id)){
   const type=findingType(r);
   if(!type){group=null;continue}
   if(!group||group.type!==type){group={type,tag,start:r.i,end:r.i,id:r.key+'/'+type};list.push(group)}
   group.end=r.i;
  }
 }
 return list;
}
function compareDesk(tags,first,last){
 const offset=7*96;
 if(reportState.week<0||first<offset)return [];
 return tags.filter(t=>t.factor!==null&&t.type==='running_total').map(tag=>{
  const rows=pilotData.get(tag.id);let a=0,b=0,count=0;
  for(let i=first;i<=last;i++){
   if(rows[i].mj===null||rows[i-offset].mj===null)continue;
   a+=rows[i-offset].mj;b+=rows[i].mj;count++;
  }
  return {tag,change:(b-a)/3600,count,a,b};
 }).sort((x,y)=>Math.abs(y.change)-Math.abs(x.change));
}
function weekPairs(changes){
 const matched=changes.filter(x=>x.count>0);
 if(!matched.length)return '';
 const ceiling=Math.max(1,...matched.flatMap(x=>[x.a,x.b]));
 return '<div class="weekpairs"><h3>Same-weekday energy comparison</h3><small>○ Previous week · ● Selected week · matched intervals only</small>'+matched.map(x=>{
  const a=x.a/ceiling*100,b=x.b/ceiling*100;
  return `<button onclick="pilotSelect('tag',${pilotTags.indexOf(x.tag)})"><strong>${x.tag.name}</strong><span class="pairtrack" aria-hidden="true"><i style="left:${Math.min(a,b)}%;width:${Math.abs(a-b)}%"></i><em style="left:${a}%"></em><b style="left:${b}%"></b></span><span>${pilotNum(x.a/3600)} → ${pilotNum(x.b/3600)} MWh</span></button>`;
 }).join('')+'</div>';
}
function businessSummary(tags,rows){
 const first=rows[0].i,last=rows.at(-1).i,changes=compareDesk(tags,first,last);
 const findings=episodes(tags).filter(e=>e.start<=last&&e.end>=first);
 const baseline=changes.reduce((s,x)=>s+x.a,0),current=changes.reduce((s,x)=>s+x.b,0);
 const label=baseline?signed((current-baseline)/baseline*100)+'%':'No comparable period';
 const day=i=>utcText(pilotStart+i*900000).slice(5,10);
 return `<section class="panel study"><small>${day(first)} – ${day(last)} UTC · ${reportState.scope} · simulated</small><div class="deskmetrics"><div>Reported energy<strong>${mwh(tags.flatMap(t=>pilotWindow(pilotData.get(t.id))))} MWh</strong></div><div>Same weekdays last week<strong>${label}</strong><small>${changes.length?changes.reduce((s,r)=>s+r.count,0)+' matching meter intervals':'Earlier matching window unavailable'}</small></div><div>Grouped findings<strong>${findings.length}</strong></div></div>${weekPairs(changes)}</section>
 <details class="panel directory"><summary>Reporting findings · ${findings.length} grouped</summary><div class="scroll"><table><thead><tr><th>Finding</th><th>Meter</th><th>Intervals in scope</th><th>Review / reporting</th></tr></thead><tbody>${findings.map(e=>{const i=Math.max(e.start,first);return `<tr><th><button class="link" onclick="deskJump(${pilotTags.indexOf(e.tag)},${i})">${businessLabels[e.type]}</button></th><td>${e.tag.name}</td><td>${Math.min(e.end,last)-i+1}</td><td data-case="${e.id}">Checking requests…</td></tr>`}).join('')||'<tr><td colspan="4">No findings in this scope</td></tr>'}</tbody></table></div></details>`;
}
function deskJump(tag,i){Object.assign(reportState,{tag,day:Math.floor(i/96),hour:Math.floor(i%96/4)});pilotReport();pilotEvidence(i)}
function caseFor(r){return episodes([r.tag]).find(e=>e.start<=r.i&&e.end>=r.i)}
function caseMatches(row,id){
 if(row.evidence.includes('Finding '+id+' |'))return true;
 const match=row.evidence.match(/Simulated event (SIM-0188-\d+-\d+) ·/);
 if(!match)return false;
 const [,tagId,index]=match[1].match(/^SIM-0188-(\d+)-(\d+)$/)||[];
 const r=pilotData.get(tagId)?.[+index];
 return r && ((caseFor(r)?.id||r.key)===id);
}
async function deskRequests(root,keys){
 const period=root.querySelector('#period-reviews');
 const cells=[...root.querySelectorAll('[data-case]')];if(!cells.length&&!period)return;
 try{
  const rows=await reviewApi();reviewRows=rows;
  if(period&&keys){
   const requests=rows.filter(r=>{const k=r.evidence.match(/Simulated event (SIM-0188-\d+-\d+) ·/);return k&&keys.has(k[1])});
   period.querySelector('p').textContent=requests.length?'':'No linked requests in this window.';
   for(const r of requests){const button=document.createElement('button');button.className='tree';button.textContent=[r.question,r.recipient,r.state,JSON.parse(r.history).at(-1).treatment||'Undecided'].join(' · ');button.onclick=()=>openReview(r.id);period.append(button)}
  }
  for(const cell of cells){
   const row=rows.find(r=>caseMatches(r,cell.dataset.case));
   if(row){const treatment=JSON.parse(row.history).at(-1).treatment||'Undecided';cell.innerHTML=`<button class="link">View request</button> · ${safeText(row.recipient)} · ${safeText(row.state)} · ${safeText(treatment)}`;cell.querySelector('button').onclick=()=>openReview(row.id)}
   else if(cell.dataset.slot!==undefined){cell.innerHTML='<button class="action">Request review</button>';cell.querySelector('button').onclick=()=>pilotReview(+cell.dataset.slot)}
   else cell.textContent='No linked request';
  }
 }catch{if(period)period.querySelector('p').textContent='Request status unavailable';for(const cell of cells)cell.textContent='Request status unavailable'}
}
function impactText(r){
 const type=findingType(r);
 if(type==='rest_usage')return 'Consumption is included. The simulated maintenance schedule marks this interval as rest. Ask the plant whether operation was expected.';
 if(type==='missing_factor')return 'The meter has a published delta, but its conversion factor is missing. Its energy cannot be included in the MWh total.';
 if(type==='reset_anchor')return 'This reading starts a new register baseline. Usage across the reset boundary is unknown.';
 if(type==='approved_override')return 'The approved override contributes to reported energy. This event has no matching Silver reading.';
 if(['silver_only','positive_spike_ignored','low_reading_ignored'].includes(type)){
  const next=pilotData.get(r.tag.id)[r.i+1];
  return 'This interval has no published usage.'+(next?.delta!==null&&next?.previous===r.previous?' At '+utcText(next.at).slice(-5)+' UTC the delta uses the previous accepted reading. The later total spans the gap; the interval split is unknown.':' Inspect adjacent readings to determine the effect on the total.');
 }
 return r.tag.type==='power'?'Instantaneous power is outside the consumption KPI.':'The published delta contributes to the energy total.';
}
