// The fixture represents the delivery ledger at 12:00 UTC on 21 November.
const zones=['Asia/Jakarta','America/New_York','Europe/Dublin','Asia/Singapore','Asia/Tokyo','Asia/Shanghai','Asia/Seoul','Asia/Kolkata','Asia/Bangkok','Australia/Sydney','Europe/London','Europe/Berlin','Europe/Madrid','Africa/Cairo','Africa/Nairobi','Africa/Johannesburg','America/Toronto','America/Mexico_City','America/Sao_Paulo','America/Argentina/Buenos_Aires'];
const snapshot=Date.UTC(2026,10,21,12);
function localClock(stamp,p){
 return new Intl.DateTimeFormat('en-GB',{timeZone:zones[p.p],hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(stamp);
}
const batchLedger=plants.map(p=>{
 const localHour=localClock(snapshot,p).split(':').map(Number);
 const due=snapshot+(8*60-localHour[0]*60-localHour[1])*60000;
 const arrival=due-(p.p===1?100:32+p.p)*60000;
 const received=p.p!==7 && arrival<=snapshot;
 const state=received?'Assessed':due<=snapshot?'Late':'Awaiting';
 const loaded=received?arrival:arrival-86400000;
 return {state,day:received?20:19,loaded,assessed:loaded+5*60000};
});
function batchNote(p){
 const b=batchLedger[p.p];
 return 'Readings through '+b.day+' Nov · Loaded '+(b.day+1)+' Nov '+localClock(b.loaded,p)+' · Assessed '+localClock(b.assessed,p)+' · '+zones[p.p];
}
function batchDetails(group){
 const rows=plants.filter(p=>!group||batchLedger[p.p].state===group);
 modal(group||'Daily deliveries','20 Nov reporting day · Deadline 08:00 next morning, plant local time',rows.map(p=>'<button class="tree" onclick="monthInfo('+p.p+',10)"><div>'+p.name+' · '+batchLedger[p.p].state+'<small>'+batchNote(p)+'</small></div></button>').join(''));
}
function batchOverview(){
 return '<section class="panel batchstrip"><div><h2>Daily deliveries</h2><small>20 Nov reporting day · Snapshot 21 Nov, 12:00 UTC</small></div>'+['Assessed','Awaiting','Late'].map(state=>'<button onclick="batchDetails(\''+state+'\')"><strong>'+batchLedger.filter(b=>b.state===state).length+'</strong> '+state+'</button>').join('')+'</section>';
}
function dayStatus(p,m,d){
 if(m>10||m===10&&d>20)return 'Upcoming';
 if(m===10&&d===20&&batchLedger[p.p].day<20)return batchLedger[p.p].state;
 if(m===10&&d===batchLedger[p.p].day)return flat(p).some(s=>s.readings.some(r=>r.flag))?'Review':'Ready';
 return (p.p*13+m*7+d)%83===0?'Review':'Ready';
}
function batchDays(p,m){
 return Array.from({length:new Date(2026,m+1,0).getDate()},(_,i)=>dayStatus(p,m,i+1));
}
function investigateBatch(i){
 document.querySelector('dialog').close();selectedPlant=i;meterScope=-1;
 const first=flat(plants[i]).flatMap(s=>s.readings.map((r,t)=>r.flag?t:96)).reduce((a,b)=>Math.min(a,b),96);
 investigationInterval=first===96?0:first;go('Investigation');
}
