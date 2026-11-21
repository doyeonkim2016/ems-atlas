const months='Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
function monthlyStatus(p,m){
 const days=batchDays(p,m);
 return {status:m===11?'Upcoming':m===10?'In progress':days.includes('Review')?'Review':'Ready'};
}
function readiness(){
 return `<section class="panel reportpanel"><div class="panelhead"><div><h2>Monthly reporting readiness</h2><small>2026 · Daily batches through 20 Nov · Select a plant-month</small></div><button class="link" onclick="go('Reported energy')">Explore 0188 reported energy</button></div><div class="scroll matrixframe"><table class="reportmatrix"><thead><tr><th>Plant</th>${months.map(m=>'<th>'+m+'</th>').join('')}</tr></thead><tbody>${plants.map(p=>'<tr><th>'+p.name+'</th>'+months.map((m,i)=>{const {status}=monthlyStatus(p,i);return `<td><button class="cell ${status.split(' ')[0]}" data-tip="${p.name} · ${m} 2026 | ${status}" aria-label="${p.name} · ${m} · ${status}" onclick="monthInfo(${p.p},${i})">${{'Ready':'✓','Review':'!','In progress':'MTD','Upcoming':'—'}[status]}</button></td>`}).join('')+'</tr>').join('')}</tbody></table></div><div class="panelhead"><small>✓ Ready · ! Review · MTD In progress · — Upcoming</small></div></section>`;
}
function monthInfo(i,m){
 const p=plants[i],v=monthlyStatus(p,m);
 const days=batchDays(p,m);
 modal(p.name+' · '+months[m]+' 2026',m===10?batchNote(p):'Daily close history · Sample data',
 '<h3>'+v.status+'</h3><div class="daygrid">'+days.map((s,d)=>'<div class="day '+s+'"><b>'+String(d+1).padStart(2,'0')+'</b><small>'+s+'</small></div>').join('')+'</div>'+
 (m===9&&p.code==='0188'?`<button class="action" onclick="document.querySelector('dialog').close();go('Reported energy')">Explore simulated October energy</button>`:'')+
 (m===10?'<p>Latest assessed day · '+batchLedger[i].day+' Nov</p><button class="tablebtn" onclick="investigateBatch('+i+')">Inspect readings and flags</button> <button class="tablebtn" onclick="openGoldAudit('+i+')">Inspect Silver → Gold</button>':''));
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
 return `<details open class="study"><summary>Rule incidence · Latest assessed day per plant</summary><small>Flagged submeter intervals ÷ expected submeter intervals. Parentheses show distinct affected submeters.</small><div class="scroll matrixframe"><table class="reportmatrix"><thead><tr><th>Plant</th>${rules.map(r=>`<th title="${r[1]}">${r[0]}<br>${r[1]}</th>`).join('')}</tr></thead><tbody>${plants.map(p=>{const subs=flat(p);return '<tr><th>'+p.name+' · '+batchLedger[p.p].day+' Nov</th>'+rules.map(([id])=>{let count=0,meters=0,first=-1;for(const s of subs){let n=0;s.readings.forEach((r,t)=>{if(r.hits.some(h=>h.id===id)){n++;if(first===-1)first=t}});count+=n;if(n)meters++}const rate=100*count/(subs.length*96);return `<td><button class="cell" style="background:${rate?'hsl(12 58% '+Math.max(68,94-rate*6)+'%)':'#edf2ef'}" ${count?'':'disabled'} onclick="selectedPlant=${p.p};meterScope=-1;investigationGroup=0;investigationInterval=${first};renderInvestigation()">${rate.toFixed(2)}% (${meters})</button></td>`}).join('')+'</tr>'}).join('')}</tbody></table></div></details>`;
}
function incidentTimeline(){
 return '<section class="panel directory"><div class="panelhead"><h2>Daily batch notifications</h2><small>Teams preview · Sample events</small></div><div class="scroll"><table><thead><tr><th>Plant</th><th>Event</th><th>Reading day</th><th>Detected locally</th></tr></thead><tbody>'+plants.map(p=>{
 const b=batchLedger[p.p];
 if(b.state==='Late')return '<tr><th>'+p.name+'</th><td>Delivery overdue</td><td>20 Nov</td><td>21 Nov 08:00</td></tr>';
 if(b.state!=='Assessed')return '';
 const counts=new Map();
 for(const s of flat(p))for(const r of s.readings)for(const h of r.hits)counts.set(h.name,(counts.get(h.name)||0)+1);
 if(!counts.size)return '';
 return '<tr><th>'+p.name+'</th><td>Batch digest · '+[...counts].map(([name,count])=>name+' × '+count).join(', ')+'</td><td>'+b.day+' Nov</td><td>21 Nov '+localClock(b.assessed,p)+'</td></tr>';
 }).join('')+'</tbody></table></div></section>';
}
