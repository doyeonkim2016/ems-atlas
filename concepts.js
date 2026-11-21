const concepts={
 ledger:{title:'Monthly reporting desk',first:'.reportpanel'},
 shift:{title:'Shift handover',first:'article.panel'},
 atlas:{title:'Plant atlas',first:'.console'}
};
const concept=new URLSearchParams(location.search).get('design');
if(Object.hasOwn(concepts,concept)){
 document.body.dataset.design=concept;
 const switcher=document.createElement('div');
 switcher.className='conceptnav';
 switcher.innerHTML='<span>Design preview</span>'+Object.entries(concepts).map(([id,c])=>`<a href="?design=${id}" ${id===concept?'aria-current="page"':''}>${c.title}</a>`).join('')+'<a class="original" href="./">Original</a>';
 document.querySelector('header').after(switcher);
}
function layoutConcept(){
 if(!Object.hasOwn(concepts,concept))return;
 const {title,first}=concepts[concept],body=document.querySelector('#body');
 const lead=body.querySelector(':scope > '+first);
 if(lead)body.prepend(lead);
 document.querySelector('#title').textContent=title;
 if(concept==='shift'&&lead){
   lead.querySelector('h2').firstChild.textContent='Alerts for review ';
   const table=body.querySelector('.directory');
   if(table)lead.after(table);
 }
}
