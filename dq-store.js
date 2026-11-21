// Same-origin adapter for the app database. Sample loads append immutable slots.
async function meterDay(request,url,db){
 const tag=pilotTags.find(t=>t.id===url.searchParams.get('tag'));
 const dayText=url.searchParams.get('day');
 if(!tag||!/^([0-9]|1[0-3])$/.test(dayText??''))return json({},400);
 const first=Number(dayText)*96,last=first+95;
 if(request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)return json({},403);
  const rows=pilotExtract(tag).slice(first,last+1).map(r=>[r.i,r.key,r.status,r.raw,r.delta,tag.unit,tag.factor,Number(tag.type==='running_total'),Number(r.silver),Number(r.gold),Number(tag===pilotTags[1]&&r.i>=96&&r.i<104)]);
  const fields=Array.from({length:11},(_,i)=>"json_extract(value,'$["+i+"]')").join(',');
  await db.prepare('INSERT INTO meter_slot(plant,tag,slot,event_key,status,raw,delta,unit,factor,running,silver,gold,rest) SELECT ?,?,'+fields+' FROM json_each(?) WHERE true ON CONFLICT(plant,tag,slot) DO NOTHING').bind('0188',tag.id,JSON.stringify(rows)).run();
 }else if(request.method!=='GET')return json({},405);
 const args=['0188',tag.id,first,last];
 const slots=(await db.prepare('SELECT slot,delta,unit,status,raw FROM meter_slot WHERE plant=? AND tag=? AND slot BETWEEN ? AND ? ORDER BY slot').bind(...args).all()).results;
 const alerts=(await db.prepare('SELECT slot,rule,version FROM dq_alert WHERE plant=? AND tag=? AND slot BETWEEN ? AND ? ORDER BY slot,rule').bind(...args).all()).results;
 return json({slots,alerts});
}
