const months='Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
function monthlyStatus(p,m){
 const coverage=100-((p.p*7+m*3)%18)/10;
 const missing=(p.p*7+m*3)%23===0;
 return {coverage,missing,status:m===11?'Upcoming':m===10?'In progress':coverage<99||missing?'Review':'Ready'};
}
function readiness(){
 return `<section class="panel reportpanel"><div class="panelhead"><div><h2>Monthly reporting readiness</h2><small>2026 · Simulated close status through 21 Nov · Select a plant-month</small></div></div><div class="scroll matrixframe"><table class="reportmatrix"><thead><tr><th>Plant</th>${months.map(m=>'<th>'+m+'</th>').join('')}</tr></thead><tbody>${plants.map(p=>'<tr><th>'+p.name+'</th>'+months.map((m,i)=>{const {status}=monthlyStatus(p,i);return `<td><button class="cell ${status.split(' ')[0]}" title="${p.name} · ${m} · ${status}" onclick="monthInfo(${p.p},${i})">${{'Ready':'✓','Review':'!','In progress':'MTD','Upcoming':'—'}[status]}</button></td>`}).join('')+'</tr>').join('')}</tbody></table></div><div class="panelhead"><small>✓ Ready · ! Review · MTD In progress · — Upcoming</small></div></section>`;
}
function monthInfo(i,m){
 const p=plants[i],v=monthlyStatus(p,m);
 modal(p.name+' · '+months[m]+' 2026','Simulated reporting readiness','<h3>'+v.status+'</h3><p>'+(m===11?'Reporting period starts in December.':'Valid coverage '+v.coverage.toFixed(1)+'% · '+(v.missing?'Required meter missing':'Required meters present')+(m===10?' · Month still open':''))+'</p><small>Ready requires a closed month, ≥99% valid coverage and all required meters present.</small>');
}
function waterfall(rows,totals,matched){
 const matchedA=sum(rows.map(r=>r.matched[0])),matchedB=sum(rows.map(r=>r.matched[1]));
 const pieces=[matched,-(totals[0]-matchedA),totals[1]-matchedB],net=totals[1]-totals[0];
 const ends=[0,pieces[0],pieces[0]+pieces[1],net],lo=Math.min(...ends),hi=Math.max(...ends);
 const y=v=>95-(v-lo)/(hi-lo||1)*70;
 return `<div class="study"><h3>What explains the weekly change?</h3><svg viewBox="0 0 560 132" style="width:100%;max-height:210px" role="img" aria-label="Weekly observed energy change decomposition in kWh"><path d="M8 ${y(0)}H552" stroke="#aaa"/>${[...pieces,net].map((v,i)=>{const start=i===3?0:ends[i],end=i===3?net:ends[i+1],x=22+i*139;return `<rect x="${x}" y="${Math.min(y(start),y(end))}" width="90" height="${Math.max(1,Math.abs(y(start)-y(end)))}" fill="${i===3?'#32393d':v<0?'#9b6061':'#3e837b'}"/><text x="${x+45}" y="${Math.min(y(start),y(end))-5}" text-anchor="middle">${signed(v)}</text><text x="${x+45}" y="118" text-anchor="middle">${['Matched slots','A-only slots','B-only slots','Net change'][i]}</text>`}).join('')}</svg><small>kWh · A-only and B-only use slots with a reading in just one week.</small></div>`;
}
function qualityMatrix(){
 const rules=dqRules.filter(r=>r[0].startsWith('DQ'));
 return `<details open class="study"><summary>Rule incidence across plants · 21 Nov</summary><small>Flagged submeter intervals ÷ expected submeter intervals. Parentheses show distinct affected submeters.</small><div class="scroll matrixframe"><table class="reportmatrix"><thead><tr><th>Plant</th>${rules.map(r=>`<th title="${r[1]}">${r[0]}<br>${r[1]}</th>`).join('')}</tr></thead><tbody>${plants.map(p=>{const subs=flat(p);return '<tr><th>'+p.name+'</th>'+rules.map(([id])=>{let count=0,meters=0,first=-1;for(const s of subs){let n=0;s.readings.forEach((r,t)=>{if(r.hits.some(h=>h.id===id)){n++;if(first===-1)first=t}});count+=n;if(n)meters++}const rate=100*count/(subs.length*96);return `<td><button class="cell" style="background:${rate?'hsl(12 58% '+Math.max(68,94-rate*6)+'%)':'#edf2ef'}" ${count?'':'disabled'} onclick="selectedPlant=${p.p};meterScope=-1;investigationGroup=0;investigationInterval=${first};renderInvestigation()">${rate.toFixed(2)}% (${meters})</button></td>`}).join('')+'</tr>'}).join('')}</tbody></table></div></details>`;
}
function incidentTimeline(){
 const incidents=[['Jakarta','No reading','16:00','16:02','16:12','21:30'],['Singapore','No reading','17:30','17:32','17:47','21:30'],['Atlanta','Delayed reading','16:30','16:32','16:45',null],['Cork','Duplicate reading','00:00','00:02',null,null]];
 return `<section class="panel directory"><div class="panelhead"><div><h2>Incident lifecycle</h2><small>Illustrative event history · 21 Nov 2026 UTC · Simulated Teams acknowledgements and recovery</small></div></div><div class="scroll"><table><thead><tr><th>Incident</th><th>Detected</th><th>Workflow accepted</th><th>Operator acknowledged</th><th>Recovered</th></tr></thead><tbody>${incidents.map(([p,issue,...times],i)=>'<tr><th>'+p+' · '+issue+'<br><small>DEMO-'+(i+1)+'</small></th>'+times.map(t=>'<td>'+ (t?'● '+t:'— Pending')+'</td>').join('')+'</tr>').join('')}</tbody></table></div></section>`;
}
