const dqConditions={
 SPIKE:'Gold excluded a positive spike', LOW:'Gold excluded a low reading',
 GOLD_MISSING:'Silver event has no Gold row', FACTOR:'Published delta lacks an energy conversion factor',
 REST:'Delta exceeds 2 kWh during scheduled rest', UNIT:'Silver engineering unit is empty',
 VALUE:'Silver reading has no numeric value', NO_READING:'Approved expected slot is overdue without a reading'
};
async function loadDqDay(panel,method='GET'){
 const {tag,day}=panel.dataset;
 const out=panel.querySelector('.dq-output');
 out.textContent=method==='POST'?'Loading sample and evaluating rules…':'Reading app database…';
 try{
  const res=await fetch('/api/meter-day?'+new URLSearchParams({tag,day}),{method});
  if(!res.ok)throw Error();
  const {slots,alerts}=await res.json();
  if(!slots.length){
   out.textContent='This meter-day has no stored batch. ';
   const button=document.createElement('button');button.className='action';button.textContent='Load sample day';button.onclick=()=>loadDqDay(panel,'POST');out.append(button);return;
  }
  const slotsById=new Map(slots.map(s=>[s.slot,s]));
  const bySlot=new Map();
  for(const a of alerts){if(!bySlot.has(a.slot))bySlot.set(a.slot,[]);bySlot.get(a.slot).push(a)}
  const buttons=Array.from({length:96},(_,i)=>{
   const slot=Number(day)*96+i,row=slotsById.get(slot),flags=bySlot.get(slot)||[];
   const label=utcText(pilotStart+slot*900000).slice(-5)+' UTC · '+(flags.map(a=>a.rule).join(', ')||(row?'No breach':'No stored slot'));
   return '<button type="button" data-slot="'+slot+'" class="'+(flags.length?'breach':row?'pass':'absent')+'" title="'+safeText(label)+'" aria-label="'+safeText(label)+'">'+(flags.length?'!':'')+'</button>';
  }).join('');
  out.innerHTML='<p><strong>'+bySlot.size+' flagged intervals</strong> / '+slots.length+' stored · '+alerts.length+' rule alerts</p><div class="dq-clock">'+buttons+'</div><div class="dq-times"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span></div><div class="dq-selected"></div>';
  function select(slot){
   const row=slotsById.get(slot),flags=bySlot.get(slot)||[],detail=out.querySelector('.dq-selected');
   for(const b of out.querySelectorAll('[data-slot]'))b.setAttribute('aria-pressed',String(Number(b.dataset.slot)===slot));
   detail.replaceChildren();
   const heading=document.createElement('strong');heading.textContent=utcText(pilotStart+slot*900000)+' UTC';detail.append(heading);
   const info=document.createElement('p');info.textContent=flags.map(a=>a.rule+' · '+a.version+' · '+dqConditions[a.rule]).join(' / ')||(row?'No configured rule breached.':'No stored slot.');detail.append(info);
   if(row){const evidence=document.createElement('p');evidence.textContent='Reading '+(row.raw??'—')+' · Gold delta '+(row.delta??'—')+' '+(row.unit??'')+' · '+row.status;detail.append(evidence)}
   if(row&&flags.length){const b=document.createElement('button');b.className='link';b.textContent='Inspect event and request review';b.onclick=()=>pilotEvidence(slot);detail.append(b)}
  }
  out.querySelector('.dq-clock').onclick=e=>{const b=e.target.closest('button');if(b)select(Number(b.dataset.slot))};
  select(alerts[0]?.slot??slots[0].slot);
 }catch{out.textContent='App database unavailable. ';const b=document.createElement('button');b.textContent='Retry';b.onclick=()=>loadDqDay(panel,method);out.append(b)}
}
