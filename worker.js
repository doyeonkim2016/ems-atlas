const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const bounded=(s,max)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
export default {async fetch(request,env){
 const u=new URL(request.url),path=u.pathname;
 if(!path.startsWith('/api/')){
  const file=path.slice(1)||'index.html',ext=file.split('.').pop();
  if(!Object.hasOwn(files,file))return new Response('Not found',{status:404});
  return new Response(files[file],{headers:{'Content-Type':({js:'text/javascript',css:'text/css',html:'text/html',svg:'image/svg+xml',json:'application/json'})[ext]||'text/plain'}});
 }
 if(path!='/api/reviews')return json({},404);
 const db=env.DB;
 if(request.method==='GET')return json((await db.prepare('SELECT * FROM reviews ORDER BY created DESC').all()).results);
 if(request.headers.get('origin')!==u.origin)return json({},403);
 const b=await request.json().catch(()=>null);
 if(!b||!bounded(b.id,36)||!/^[a-f0-9-]{36}$/.test(b.id))return json({},400);
 const now=new Date().toISOString();
 if(request.method==='POST'){
  if(!Number.isInteger(b.plant)||b.plant<0||b.plant>=20||!bounded(b.evidence,1200)||!bounded(b.question,1200)||!bounded(b.recipient,254)||!/^\S+@[^\s,@;]+\.[^\s,@;]+$/.test(b.recipient)||/[,;]/.test(b.recipient))return json({},400);
  await db.prepare('INSERT OR IGNORE INTO reviews VALUES(?,?,?,?,?,?,?,?,?)').bind(b.id,b.plant,b.evidence,b.recipient,b.question,'Open',JSON.stringify([{at:now,state:'Open',note:'Request created'}]),1,now).run();
  return json({id:b.id});
 }
 if(request.method==='PATCH'){
  const row=await db.prepare('SELECT * FROM reviews WHERE id=?').bind(b.id).first();
  if(!row)return json({},404);
  if(!['Open','In review','Resolved'].includes(b.state)||!bounded(b.note,1200))return json({},400);
  const history=JSON.parse(row.history);const treatment=b.treatment??history.at(-1)?.treatment??'Undecided';
  if(!['Undecided','Ready to report','Hold for correction'].includes(treatment))return json({},400);
  history.push({at:now,state:b.state,note:b.note,treatment});
  const result=await db.prepare('UPDATE reviews SET state=?,history=?,version=version+1 WHERE id=? AND version=?').bind(b.state,JSON.stringify(history),b.id,b.version).run();
  return json({},result.meta.changes?200:409);
 }
 return json({},405);
}};
