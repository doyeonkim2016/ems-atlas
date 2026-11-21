const sections={
 Reporting:['Overview','Reported energy','Plant analysis'],
 Investigation:['Plants','Investigation','Rulebook'],
 Operations:['Alerts','Requests','Teams']
};
const pageLabels={'Reported energy':'Reported energy',Overview:'Monthly overview',Plants:'Plant directory','Plant analysis':'Weekly comparison',Investigation:'Interval explorer',Rulebook:'DQ rulebook',Alerts:'Alert inbox',Requests:'Review requests',Teams:'Teams monitoring'};
function sectionNav(view){
 const nav=$('#nav');
 const active=Object.keys(sections).find(group=>sections[group].includes(view));
 nav.innerHTML=Object.entries(sections).map(([group,pages])=>`<details name="workspace-menu" class="navgroup"><summary class="${group===active?'selected':''}">${group}</summary><div class="navpages">${pages.map(page=>`<button data-page="${page}" aria-current="${page===view?'page':'false'}">${pageLabels[page]}</button>`).join('')}</div></details>`).join('');
 nav.querySelectorAll('[data-page]').forEach(button=>button.onclick=()=>{
  go(button.dataset.page);
  nav.querySelector('.selected').focus();
 });
 $('#crumb').textContent=active+' / '+pageLabels[view];
}
document.addEventListener('click',event=>{
 const open=$('#nav details[open]');
 if(open&&!open.contains(event.target))open.open=false;
});
document.addEventListener('keydown',event=>{
 const open=$('#nav details[open]');
 if(open&&event.key==='Escape'){open.open=false;open.querySelector('summary').focus()}
});
function safeText(value){
 return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
async function reviewApi(method='GET',body){
 const response=await fetch('/api/reviews',{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
 if(!response.ok)throw Error(response.status===409?'Another update was saved. Reopen this request before editing.':'Could not reach the request tracker. Please retry.');
 return response.json();
}
let reviewRows=[],reviewFilter='All',targetRequest=new URLSearchParams(location.search).get('request');
function requestAtInterval(context){
 const p=plants[selectedPlant],t=investigationInterval;
 const subs=meterScope<0?flat(p):p.meters[meterScope].subs;
 const opts=context?[context.sub]:[...subs].sort((a,b)=>b.readings[t].hits.length-a.readings[t].hits.length);
 const stamp=context?.stamp||batchLedger[p.p].day+' Nov 2026 '+time(t)+' · '+zones[p.p];
 modal('Request plant review',p.name+' · '+stamp,`<form class="reviewform"><label>Submeter<select name="meter">${opts.map((s,i)=>`<option value="${i}">${s.id} · ${s.name}</option>`).join('')}</select></label><output class="proof"></output><label>Plant contact · Teams work email<input name="recipient" type="email" required maxlength="254"></label><label>Question for the plant<textarea name="question" rows="3" required maxlength="1200" placeholder="Was this expected during the shift?"></textarea></label><button class="action">Create review request</button><small>Open the Teams draft after saving to notify the contact.</small><output role="status"></output></form>`);
 const form=$('.reviewform'),id=crypto.randomUUID();
 reviewApi().then(rows=>{const last=rows.find(r=>r.plant===p.p);if(last&&!form.elements.recipient.value)form.elements.recipient.value=last.recipient}).catch(()=>{});
 function evidence(){
  const s=opts[Number(form.elements.meter.value)],r=s.readings[t];
  if(context)return [p.name,s.id,stamp,context.notes].join(" | ");
  return [p.name,s.id,stamp,r.value===null?'No usable kWh value':r.value+' kWh',r.hits.length?r.hits.map(h=>h.name+' ('+h.evidence+')').join(' · '):'No rule flag'].join(' | ');
 }
 const display=()=>form.querySelector('.proof').textContent=evidence();
 display();form.elements.meter.onchange=display;
 form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;
 try{await reviewApi('POST',{id,plant:p.p,evidence:evidence(),recipient:form.elements.recipient.value.trim(),question:form.elements.question.value.trim()});$('dialog').close();targetRequest=id;reviewFilter='All';go('Requests')}
 catch(err){form.lastElementChild.textContent=err.message;btn.disabled=false}};
}
async function showRequests(){
 const page=document.createElement('section');page.className='panel';$('#body').replaceChildren(page);
 page.innerHTML='<div class="panelhead"><h2>Plant review queue</h2><small>Loading requests…</small></div>';
 try{const rows=await reviewApi();if(!page.isConnected)return;reviewRows=rows;
 const filtered=rows.filter(r=>reviewFilter==='All'||r.state===reviewFilter);
 page.innerHTML=`<div class="panelhead"><h2>Plant review queue</h2><select aria-label="Request status">${['All','Open','In review','Resolved'].map(s=>`<option ${s===reviewFilter?'selected':''}>${s}</option>`).join('')}</select></div>`+(filtered.length?`<div class="scroll"><table><thead><tr><th>Review question</th><th>Plant</th><th>Contact</th><th>Status</th></tr></thead><tbody>${filtered.map(r=>`<tr><td><button class="link" data-id="${safeText(r.id)}">${safeText(r.question)}</button></td><td>${plants[r.plant].name}</td><td>${safeText(r.recipient)}</td><td>${safeText(r.state)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="study"><h3>No matching requests</h3><p>Select an interval in Investigation, then choose Request plant review.</p><button class="tablebtn" onclick="go(\'Investigation\')">Explore intervals</button></div>');
 page.querySelector('select').onchange=e=>{reviewFilter=e.target.value;showRequests()};
 page.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>openReview(b.dataset.id));
 if(targetRequest){const id=targetRequest;targetRequest=null;openReview(id)}
 }catch(err){page.textContent=err.message;const retry=document.createElement('button');retry.textContent='Retry';retry.onclick=showRequests;page.append(retry)}
}
function openReview(id){
 const r=reviewRows.find(x=>x.id===id);
 if(!r){modal('Request unavailable','Review queue','<p>This request could not be found.</p>');return}
 const link=new URL(location.pathname,location.origin);link.searchParams.set('request',id);
 const teams=new URL('https://teams.microsoft.com/l/chat/0/0');
 teams.searchParams.set('users',r.recipient);teams.searchParams.set('message',[r.question,r.evidence,'Review and record your response: '+link.href].join('\n'));
 const history=JSON.parse(r.history);
 modal('Plant review · '+plants[r.plant].name,safeText(r.state)+' · '+safeText(r.recipient),`<div class="reviewform"><h3>${safeText(r.question)}</h3><p class="proof">${safeText(r.evidence)}</p><a class="tablebtn" target="_blank" rel="noopener noreferrer" href="${safeText(teams.href)}">Open Teams draft</a><small>Press Send in Teams. Site access is required to open the request link.</small><h3>Activity</h3>${history.map(h=>`<div class="reviewevent"><b>${safeText(h.state)}</b> · ${safeText(new Date(h.at).toLocaleString())}<p>${safeText(h.note)}${h.treatment?' · Reporting: '+safeText(h.treatment):''}</p></div>`).join('')}<form class="reviewform"><label>Status<select name="state">${['Open','In review','Resolved'].map(s=>`<option ${s===r.state?'selected':''}>${s}</option>`).join('')}</select></label><label>Reporting decision<select name="treatment">${['Undecided','Ready to report','Hold for correction'].map(x=>`<option ${history.at(-1).treatment===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Plant response or follow-up<textarea required maxlength="1200" rows="2" name="note"></textarea></label><button class="action">Save update</button><output role="status"></output></form></div>`);
 const form=$('dialog form');
 form.onsubmit=async e=>{e.preventDefault();const btn=form.querySelector('button');btn.disabled=true;try{await reviewApi('PATCH',{id,version:r.version,state:form.elements.state.value,treatment:form.elements.treatment.value,note:form.elements.note.value.trim()});$('dialog').close();targetRequest=id;go('Requests')}catch(err){form.lastElementChild.textContent=err.message;btn.disabled=false}};
}
