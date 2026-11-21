// Historical demo weeks use mutually exclusive leaf meters and Monday-aligned local slots.
const weekLabels=['19–25 Oct','26 Oct–1 Nov','2–8 Nov','9–15 Nov','16–22 Nov'];
const weekDays=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const analysis={a:3,b:4,dimension:'area',tag:''};
const tagColors=['#a61932','#315e69','#a76836','#644d77','#387568','#77533d'];
function weeklyFields(p){
 return p.meters.flatMap((m,j)=>m.subs.map((s,k)=>({s,j,k,area:m.name,equipment:s.name.split(' ')[0]})));
}
function weeklyValue(f,w,d,n,p){
 const seed=(p.p+1)*19+f.j*11+f.k*7+w*13+d*17+n;
 if(seed%173===0||(p.p===0&&w===3&&d===3&&f.j===0&&n>=60&&n<82))return null;
 return reference.get(f.s)[n]*(1+.06*Math.sin(w+f.j)+.05*Math.cos(d+f.k)+(w===3&&f.j===0?.12:0))*(d>=5?.89:1);
}
function comparableDays(p){return [analysis.a,analysis.b].includes(4)?batchLedger[p.p].day-15:7}
function compareLeaves(fields,p){
 return fields.map(f=>{
 const days=[Array(7).fill(0),Array(7).fill(0)],valid=[0,0],matched=[0,0];
 for(let d=0;d<comparableDays(p);d++)for(let n=0;n<96;n++){
 const pair=[analysis.a,analysis.b].map(w=>weeklyValue(f,w,d,n,p));
 pair.forEach((v,i)=>{if(v!==null){days[i][d]+=v;valid[i]++}});
 if(pair.every(v=>v!==null))pair.forEach((v,i)=>matched[i]+=v);
 }
 return {...f,days,valid,matched,value:sum(days[1])};
 });
}
function groups(rows,key){
 const grouped=new Map();
 for(const r of rows)grouped.set(r[key],(grouped.get(r[key])||0)+r.value);
 return [...grouped].map(([name,value],i)=>({name,value,color:tagColors[i%tagColors.length]}));
}
function tileBoxes(items,x=0,y=0,w=100,h=100){
 if(items.length===1)return [{...items[0],x,y,w,h}];
 const total=sum(items.map(g=>g.value));let left=items[0].value,i=1;
 while(i<items.length-1&&Math.abs(total/2-left-items[i].value)<Math.abs(total/2-left))left+=items[i++].value;
 const share=left/total;
 return w>=h?[...tileBoxes(items.slice(0,i),x,y,w*share,h),...tileBoxes(items.slice(i),x+w*share,y,w*(1-share),h)]:
 [...tileBoxes(items.slice(0,i),x,y,w,h*share),...tileBoxes(items.slice(i),x,y+h*share,w,h*(1-share))];
}
function sankey(rows,key){
 const other=key==='area'?'equipment':'area',left=groups(rows,key),right=groups(rows,other);
 const scale=(200-8*Math.max(left.length,right.length))/sum(rows.map(r=>r.value));
 function position(nodes){let y=5;for(const node of nodes){node.y=y;node.cursor=y;y+=scale*node.value+8}}
 position(left);position(right);
 const links=[];
 for(const a of left)for(const b of right){
 const v=sum(rows.filter(r=>r[key]===a.name&&r[other]===b.name).map(r=>r.value));if(!v)continue;
 const height=v*scale,y1=a.cursor+height/2,y2=b.cursor+height/2;
 links.push(`<path tabindex="0" data-tip="${a.name} → ${b.name} | ${kwh(v)} kWh" d="M116 ${y1} C198 ${y1} 218 ${y2} 304 ${y2}" fill="none" stroke="${a.color}" stroke-opacity=".55" stroke-width="${height}"><title>${a.name} → ${b.name} · ${kwh(v)} kWh</title></path>`);
 a.cursor+=height;b.cursor+=height;
 }
 const nodes=(list,x,anchor)=>list.map(g=>`<rect x="${x}" y="${g.y}" width="7" height="${g.value*scale}" fill="${g.color}"/><text x="${anchor==='end'?x-4:x+10}" y="${g.y+g.value*scale/2+4}" text-anchor="${anchor}">${g.name}</text>`).join('');
 return `<svg viewBox="0 0 420 210" role="img" aria-label="Observed kWh allocation by ${key} and ${other}">${links.join('')}${nodes(left,109,'end')}${nodes(right,304,'start')}</svg>`;
}
function dailyPlot(days,max,pair){
 return `<svg viewBox="0 0 420 145" role="img" aria-label="Daily observed kWh">${[0,.5,1].map(f=>`<path d="M48 ${115-f*95}h364" stroke="#ddd"/><text x="42" y="${118-f*95}" text-anchor="end">${kwh(max*f)}</text>`).join('')}${days.map((v,d)=>`<rect tabindex="0" data-tip="${weekDays[d]} | Week A: ${kwh(pair[0][d])} kWh | Week B: ${kwh(pair[1][d])} kWh | Difference: ${signed(pair[1][d]-pair[0][d])} kWh" x="${55+d*51}" y="${115-v/max*95}" width="30" height="${v/max*95}" fill="#a61932"><title>${weekDays[d]} · ${kwh(v)} kWh</title></rect><text x="${70+d*51}" y="135" text-anchor="middle">${weekDays[d]}</text>`).join('')}</svg>`;
}
function weekly(){
 const p=plants[selectedPlant],key=analysis.dimension,rows=compareLeaves(weeklyFields(p),p),tags=groups(rows,key);
 if(!tags.some(g=>g.name===analysis.tag))analysis.tag='';
 const scoped=rows.filter(r=>!analysis.tag||r[key]===analysis.tag);
 const daily=[0,1].map(i=>weekDays.slice(0,comparableDays(p)).map((_,d)=>sum(scoped.map(r=>r.days[i][d]))));
 const totals=daily.map(sum),diff=totals[1]-totals[0],expected=scoped.length*comparableDays(p)*96;
 const coverage=[0,1].map(i=>(100*sum(scoped.map(r=>r.valid[i]))/expected).toFixed(1));
 const matched=sum(scoped.map(r=>r.matched[1]-r.matched[0]));
 const contributions=scoped.map(r=>({...r,delta:r.value-sum(r.days[0])})).sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta));
 const driver=contributions[0],max=Math.ceil(Math.max(...daily.flat())/100)*100;
 function select(id,label,opts,value){return `<label>${label} <select id="${id}">${opts.map(([v,l])=>`<option value="${v}" ${v===value?'selected':''}>${l}</option>`).join('')}</select></label>`}
 const weeks=weekLabels.map((v,i)=>[i,v]);
 $('#body').innerHTML=`<div class="invest-controls">${select('wkplant','Plant',plants.map(p=>[p.p,p.name]),p.p)}${select('wkdim','Group by',[['area','Area'],['equipment','Equipment type']],key)}${select('wktag','Tag',[['','All tags'],...tags.map(g=>[g.name,g.name])],analysis.tag)}</div>
 <div class="panel"><div class="panelhead"><h2>Tag breakdown</h2><small>Week B · ${weekLabels[analysis.b]} 2026 · Mon–${weekDays[comparableDays(p)-1]} · observed kWh</small></div><div class="weekgrid"><article><h3>Treemap</h3><small>Select a tag to compare its weeks.</small><div class="tiles">${tileBoxes(tags).map(g=>`<button class="${g.name===analysis.tag?'tilepicked':''}" data-tip="${g.name} | ${kwh(g.value)} kWh" data-tag="${g.name}" aria-pressed="${g.name===analysis.tag}" style="left:${g.x}%;top:${g.y}%;width:${g.w}%;height:${g.h}%;background:${g.color}"><b>${g.name}</b><br>${kwh(g.value)} kWh</button>`).join('')}</div></article><article><h3>Sankey</h3><small>Tag allocation · ${analysis.tag||'All tags'} · each submeter counted once</small>${sankey(scoped,key)}</article></div></div>
 <section class="panel directory"><div class="panelhead"><h2>Week comparison</h2><small>Matched weekdays · Mon–${weekDays[comparableDays(p)-1]} · Plant local · ${analysis.tag||'All tags'}</small></div><div class="weekgrid">${[0,1].map((i)=>`<article>${select('week'+i,'Week '+(i?'B':'A'),weeks,analysis[i?'b':'a'])}<h2>${kwh(totals[i])} kWh</h2><small>${coverage[i]}% reading coverage</small>${dailyPlot(daily[i],max,daily)}</article>`).join('')}</div>${waterfall(scoped,totals,matched)}<div class="weekdiff"><h3>Week B versus Week A</h3><p>Observed usage changed by <b>${signed(diff)} kWh (${signed(100*diff/totals[0])}%)</b>. Comparing only matching submeter, weekday and time slots gives <b>${signed(matched)} kWh</b>.</p><small>${Math.abs(driver.delta)<.001?'No change across submeters.':'Largest absolute contribution: '+driver.area+' / '+driver.s.id+' · '+signed(driver.delta)+' kWh.'}</small></div></section>`;
 $('#wkplant').onchange=e=>{selectedPlant=+e.target.value;analysis.tag='';chartChange(weekly)};
 $('#wkdim').onchange=e=>{analysis.dimension=e.target.value;analysis.tag='';chartChange(weekly)};
 $('#wktag').onchange=e=>{analysis.tag=e.target.value;chartChange(weekly)};
 $('#week0').onchange=e=>{analysis.a=+e.target.value;chartChange(weekly)};
 $('#week1').onchange=e=>{analysis.b=+e.target.value;chartChange(weekly)};
 document.querySelectorAll('[data-tag]').forEach(b=>b.onclick=()=>{analysis.tag=b.dataset.tag===analysis.tag?'':b.dataset.tag;chartChange(weekly)});
}
