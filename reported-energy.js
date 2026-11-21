// Fictional October batch. Each reporting row retains its source event key.
const pilotTags=[
 ['90071992547409930','Grid intake','Supply','running_total','kWh',3.6],
 ['90071992547409931','Chilled storage','Demand','running_total','kWh',3.6],
 ['90071992547409932','Air handling','Demand','running_total','kWh',3.6],
 ['90071992547409933','Unmapped compressor','Demand','running_total','pulse',null],
 ['90071992547409934','Instantaneous load','Demand','power','kW',null]
].map(([id,name,scope,type,unit,factor])=>({id,name,scope,type,unit,factor}));
const pilotStart=Date.UTC(2026,9,1);
const utcText=ms=>new Date(ms).toISOString().slice(0,16).replace('T',' ');
function pilotExtract(tag){
 let anchor=1000,physical=1000;
 return Array.from({length:14*96},(_,i)=>{
  const at=pilotStart+i*900000,previous=anchor,special=tag===pilotTags[1];
  const increment=(tag.scope==='Supply'?35:6)+Math.round(3*Math.sin(i%96*Math.PI/48))+Number(tag.id.slice(-1));
  physical+=increment;
  let raw=physical,status='ok',delta=null,silver=true,gold=true;
  if(tag.type==='power'){raw=30+increment;status='instantaneous_power'}
  else if(special&&i===41){raw+=4000;status='positive_spike_ignored'}
  else if(special&&i===61){raw=anchor-7;status='low_reading_ignored'}
  else if(special&&i===72){raw=physical=5;anchor=5;status='reset_anchor'}
  else if(special&&i===90){silver=false;raw=null;delta=increment;status='approved_override';anchor=physical}
  else if(special&&i===85){gold=false;status='silver_only'}
  else{delta=raw-anchor;anchor=raw}
  const mj=delta!==null&&tag.factor!==null?delta*tag.factor:null;
  return {key:'SIM-0188-'+tag.id+'-'+i,i,at,previous,raw,delta,status,gold,silver,mj,tag};
 });
}
const pilotData=new Map(pilotTags.map(tag=>[tag.id,pilotExtract(tag)]));
const reportState={scope:'Demand',week:-1,tag:1,day:0,hour:10};
const pilotNum=(n,d=3)=>n===null?'—':n.toLocaleString('en',{maximumFractionDigits:d});
function isoWeek(ms){const d=new Date(ms);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}
const pilotWeeks=[...new Set(pilotData.get(pilotTags[0].id).map(r=>isoWeek(r.at)))];
function pilotSum(rows){const valid=rows.filter(r=>r.mj!==null);return valid.length?valid.reduce((a,r)=>a+r.mj,0):null}
function mwh(rows){const mj=pilotSum(rows);return mj===null?'—':pilotNum(mj/3600,5)}
function pilotWindow(rows){return reportState.week<0?rows:rows.filter(r=>isoWeek(r.at)===pilotWeeks[reportState.week])}
function pilotSelect(key,value){
 reportState[key]=key==='scope'?value:Number(value);
 if(key==='scope')reportState.tag=pilotTags.findIndex(t=>t.scope===value);
 if(key==='week'&&reportState.week>=0)reportState.day=Math.floor(pilotWindow(pilotData.get(pilotTags[reportState.tag].id))[0].i/96);
 pilotReport();
}
function pilotReport(){
 const state=reportState,tag=pilotTags[state.tag],rows=pilotWindow(pilotData.get(tag.id));
 const scoped=pilotTags.filter(t=>t.scope===state.scope);
 const scopeRows=scoped.flatMap(t=>pilotWindow(pilotData.get(t.id)));
 const dayRows=rows.filter(r=>Math.floor(r.i/96)===state.day);
 const hours=Array.from({length:24},(_,i)=>dayRows.filter(r=>Math.floor(r.i%96/4)===i));
 const max=Math.max(1,...hours.map(h=>pilotSum(h)||0));
 const select=(key,label,options)=>`<label>${label} <select onchange="pilotSelect('${key}',this.value)">${options.map(([v,l])=>`<option value="${v}" ${v===state[key]?'selected':''}>${l}</option>`).join('')}</select></label>`;
 $('#date').textContent='1–14 Oct 2026 · UTC';
 $('#body').innerHTML=`<div class="invest-controls"><b>Simulated CSV pilot · Plant 0188</b>${select('scope','Meter scope',['Demand','Supply'].map(x=>[x,x]))}${select('week','Reporting window',[[-1,'Full extract'],...pilotWeeks.map((w,i)=>[i,'Week of '+w])])}</div>
 ${businessSummary(scoped,rows)}<section class="panel"><div class="panelhead"><div><h2>Reported ${state.scope.toLowerCase()} energy</h2><small>Gold running-total deltas · window clipped to the extract</small></div><strong>${mwh(scopeRows)} MWh</strong></div><div class="scroll"><table><thead><tr><th>Meter</th><th>Reported MWh</th><th>Gold rows</th><th>Silver readings</th><th>Conversion</th></tr></thead><tbody>${scoped.map(t=>{const r=pilotWindow(pilotData.get(t.id));return `<tr><th><button class="link" aria-pressed="${t===tag}" onclick="pilotSelect('tag',${pilotTags.indexOf(t)})">${t.name}</button></th><td>${mwh(r)}</td><td>${r.filter(x=>x.gold).length}</td><td>${r.filter(x=>x.silver).length}</td><td>${t.type==='power'?'Power · outside energy KPI':t.factor===null?'Missing factor':'× '+t.factor+' MJ/'+t.unit}</td></tr>`}).join('')}</tbody></table></div><div class="panelhead"><small>Reporting confidence · Expected cadence unapproved. Counts describe observed rows.</small></div></section>
 <section class="panel directory"><div class="panelhead"><div><h2>${tag.name} · Hourly contribution</h2><small>${tag.id} · UTC · Select an hour for its events</small></div>${select('day','Day',[...new Set(rows.map(r=>Math.floor(r.i/96)))].map(d=>[d,utcText(pilotStart+d*86400000).slice(0,10)]))}</div>
 <div class="pilothours">${hours.map((h,i)=>`<button aria-label="${i}:00 UTC · ${mwh(h)} MWh" data-tip="${i}:00 UTC | ${mwh(h)} MWh" aria-pressed="${state.hour===i}" onclick="pilotSelect('hour',${i})"><i style="height:${Math.max(2,90*(pilotSum(h)||0)/max)}px"></i><small>${String(i).padStart(2,'0')}</small></button>`).join('')}</div>
 <div class="panelhead"><b>${utcText(hours[state.hour][0].at)} UTC · ${mwh(hours[state.hour])} MWh</b><small>Select an event to inspect Silver and Gold</small></div><div class="scroll"><table><thead><tr><th>Time UTC</th><th>Gold delta (${tag.unit})</th><th>Processing decision</th><th>Reported MWh</th></tr></thead><tbody>${hours[state.hour].map(r=>`<tr><td><button class="link" onclick="pilotEvidence(${r.i})">${utcText(r.at).slice(-5)}</button></td><td>${pilotNum(r.delta)}</td><td>${r.status}</td><td>${mwh([r])}</td></tr>`).join('')}</tbody></table></div></section>
 <section class="panel study" id="period-reviews"><h2>Requests in this reporting window</h2><p>Checking requests…</p></section><details class="panel study"><summary>Source data · five generated CSVs</summary><p>Fictional events, 1 Oct inclusive to 15 Oct exclusive (UTC). Selected-tag hourly uses the current meter. Observations contains the selected day.</p>${Object.keys(pilotSchemas).map(file=>`<button class="tablebtn" onclick="downloadPilot('${file}')">${file}.csv</button>`).join(' ')}</details>`;
 deskRequests($('#body'),new Set(scopeRows.map(r=>r.key)));
}
function pilotEvidence(i){
 const r=pilotData.get(pilotTags[reportState.tag].id)[i],t=r.tag;
 modal(t.name+' · '+utcText(r.at)+' UTC','Simulated event · '+r.key,`<h3>Reported contribution · ${mwh([r])} MWh</h3><p>${impactText(r)}</p><small>Teams · ${safeText(deliveryStatus(caseFor(r)?.id||r.key))}</small><details><summary>Calculation evidence · ${r.status}</summary><dl class="pilotproof"><dt>${t.type==='power'?'Silver instantaneous power':'Silver cumulative reading'}</dt><dd>${r.silver?pilotNum(r.raw)+' '+t.unit:'No Silver event · Gold override'}</dd><dt>Gold preserved reading</dt><dd>${r.gold?pilotNum(r.raw):'No Gold row'}</dd><dt>Previous accepted reference</dt><dd>${r.gold&&t.type==='running_total'?pilotNum(r.previous):'—'}</dd><dt>Published delta</dt><dd>${r.delta===null?'No published delta':pilotNum(r.delta)+' '+t.unit}</dd><dt>Conversion to MJ</dt><dd>${pilotNum(t.factor)}</dd></dl></details><p>Simulated vee_v1 decision · No operational assessment or Teams delivery feed.</p><button class="tablebtn" ${i===0?'disabled':''} onclick="pilotEvidence(${i-1})">Previous event</button> <button class="tablebtn" ${i===1343?'disabled':''} onclick="pilotEvidence(${i+1})">Next event</button><p data-case="${caseFor(r)?.id||r.key}" data-slot="${i}">Checking requests…</p>`);
 deskRequests($('#detail'));
}
function pilotReview(i){
 const r=pilotData.get(pilotTags[reportState.tag].id)[i];selectedPlant=0;
 requestAtInterval({sub:{id:r.tag.id,name:r.tag.name,readings:[]},stamp:utcText(r.at)+' UTC',notes:'Finding '+(caseFor(r)?.id||r.key)+' | '+impactText(r)+' | Simulated event '+r.key+' · '+r.status+' · published '+pilotNum(r.delta)+' '+r.tag.unit+' · reported '+mwh([r])+' MWh'});
}
const pilotSchemas={
 meter_catalog:'plant_id,tag_id,meter_key,hierarchy_path,engineering_unit,building,supply_demand_scope,energy_type,energy_user,device_name,tag_name,dimension_as_of_utc',
 contributions_weekly:'plant_id,tag_id,hierarchy_path,measurement_type,week_start_utc,energy_mj,gold_rows,rows_missing_factor,latest_event_utc,energy_mwh,building,supply_demand_scope,energy_type,energy_user,device_name,tag_name',
 silver_coverage_weekly:'tag_id,hierarchy_path,week_start_utc,silver_rows,first_event_utc,last_event_utc,min_raw_value,max_raw_value,plant_id',
 selected_tag_hourly:'plant_id,tag_id,week_start_utc,hour_start_utc,energy_mj,energy_mwh,gold_rows',
 selected_tag_observations_one_day:'event_key,silver_timestamp_utc,silver_raw_value,engUnit,gold_timestamp_utc,gold_raw_value,prev_value,published_value,delta_status,FactorToMJ,plant_id,tag_id,timestamp_utc'
};
function pilotCsvRows(file){
 const out=[],tag=pilotTags[reportState.tag],stamp=ms=>new Date(ms).toISOString();
 for(const t of pilotTags){
  const records=pilotData.get(t.id),path='Demo/'+t.scope+'/'+t.name,meta=['Demo building',t.scope,'Electricity',t.name,t.name,t.name];
  if(file==='meter_catalog')out.push(['0188',t.id,'SIM-'+t.id,path,t.unit,...meta,stamp(pilotStart)]);
  if(file==='contributions_weekly'||file==='silver_coverage_weekly')for(const week of pilotWeeks){
   const rows=records.filter(r=>isoWeek(r.at)===week);
   if(file==='contributions_weekly'){
    const g=rows.filter(r=>r.gold),mj=pilotSum(g);
    out.push(['0188',t.id,path,t.type,week,mj,g.length,g.filter(r=>t.type==='running_total'&&r.delta!==null&&t.factor===null).length,stamp(g.at(-1).at),mj===null?null:mj/3600,...meta]);
   }else{
    const s=rows.filter(r=>r.silver),values=s.map(r=>r.raw);
    out.push([t.id,path,week,s.length,stamp(s[0].at),stamp(s.at(-1).at),Math.min(...values),Math.max(...values),'0188']);
   }
  }
  if(t!==tag)continue;
  if(file==='selected_tag_hourly')for(let i=0;i<records.length;i+=4){
   const rows=records.slice(i,i+4),mj=pilotSum(rows);
   out.push(['0188',t.id,isoWeek(rows[0].at),stamp(rows[0].at),mj,mj===null?null:mj/3600,rows.filter(r=>r.gold).length]);
  }
  if(file==='selected_tag_observations_one_day')for(const r of records.slice(reportState.day*96,(reportState.day+1)*96)){
   const at=stamp(r.at);
   out.push([r.key,r.silver?at:null,r.silver?r.raw:null,t.unit,r.gold?at:null,r.gold?r.raw:null,r.gold&&t.type==='running_total'?r.previous:null,r.delta,r.gold?r.status:null,t.factor,'0188',t.id,at]);
  }
 }
 return out;
}
function downloadPilot(file){
 const lines=pilotCsvRows(file).map(row=>row.map(v=>v===null?'':'"'+String(v).replaceAll('"','""')+'"').join(','));
 const blob=new Blob([[pilotSchemas[file],...lines].join('\r\n')],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=file+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
