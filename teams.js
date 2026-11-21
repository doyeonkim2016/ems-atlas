let importedAttempts=[];
function breachEvent(p,s,t,h){
 const day='2026-11-'+batchLedger[p.p].day;
 return {id:[p.code,s.id,day,time(t),h.id].join('/'),plant:p.name,meter:s.id,issue:h.id+' · '+h.name,severity:h.severity,time:day+' '+time(t)+' '+zones[p.p]};
}
function deliveryStatus(id){
 const rows=importedAttempts.filter(r=>r.id===id).sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
 if(!rows.length)return 'No matching delivery record';
 const r=rows[0];
 const label=r.status==='Accepted'?'Workflow accepted · channel delivery unconfirmed':r.status==='Delivered'?'Channel delivery confirmed':r.status;
 return label+' · '+r.at;
}
function drawAttempts(){
 $('#logrows').textContent=importedAttempts.length?importedAttempts.map(r=>[r.at,r.plant,r.issue,r.status].join(' · ')).join('\n'):'No imported delivery attempts';
}
function showTeams(){
 $('#body').innerHTML=incidentTimeline()+`<section class="panel"><div class="panelhead"><h2>Teams monitoring</h2><small>Pipeline relay · Setup required</small></div><div class="study"><h3>Connect a Teams channel</h3><ol><li>Create a Teams Workflow using “Send webhook alerts to a channel”. Select the team and channel.</li><li>Save its URL as TEAMS_WORKFLOW_URL in your pipeline secret store. Tenant-authenticated workflows also need a valid TEAMS_ACCESS_TOKEN.</li><li>Run the relay from your alert job with a stable event ID and a persistent SQLite path.</li></ol><a href="teams_relay.py" download>Download Python relay</a> · <a href="event.json" download>Example alert JSON</a><pre>python teams_relay.py event.json --db alerts.sqlite
python teams_relay.py --db alerts.sqlite --export attempts.json</pre><h3>Delivery attempts</h3><p>Import an exported log to inspect workflow acceptance and failures. Match an interval using its downloaded relay event. Imported logs apply to this browser session. Confirm channel delivery in Teams Workflow run history.</p><input id="logfile" type="file" accept=".json" aria-label="Import delivery attempts"><div id="logrows">Awaiting log import</div></div></section>`;
 drawAttempts();
 $('#logfile').onchange=async e=>{
  try{
   const rows=JSON.parse(await e.target.files[0].text());
   if(!Array.isArray(rows)||rows.some(r=>!r||!['id','at','status'].every(k=>typeof r[k]==='string')||!Number.isFinite(Date.parse(r.at))))throw Error();
   importedAttempts=rows.slice(0,500);
   drawAttempts();
  }catch{$('#logrows').textContent='Invalid log file. Previous records retained.'}
 };
}
