const chartTip=document.createElement('div');
chartTip.id='chart-tip';chartTip.setAttribute('role','tooltip');chartTip.hidden=true;
document.body.append(chartTip);
let tipOwner=null;
function hideChartTip(){
 if(tipOwner){tipOwner.classList.remove('reading-hover');tipOwner.removeAttribute('aria-describedby')}
 tipOwner=null;chartTip.hidden=true;
}
function displayChartTip(el,x,y){
 if(!el){hideChartTip();return}
 if(el!==tipOwner){
  hideChartTip();tipOwner=el;el.classList.add('reading-hover');
  el.setAttribute('aria-describedby','chart-tip');
  chartTip.textContent=el.dataset.tip.replaceAll(' | ','\n');chartTip.hidden=false;
 }
 const box=chartTip.getBoundingClientRect();
 chartTip.style.left=Math.max(6,Math.min(innerWidth-box.width-6,x+12))+'px';
 chartTip.style.top=Math.max(6,y-box.height-13<0?Math.min(innerHeight-box.height-6,y+15):y-box.height-13)+'px';
}
function showAtElement(el){
 if(!el)return hideChartTip();
 const r=el.getBoundingClientRect();displayChartTip(el,r.left+r.width/2,r.top+Math.min(25,r.height/2));
}
document.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')displayChartTip(e.target.closest('[data-tip]'),e.clientX,e.clientY)});
document.addEventListener('pointerup',e=>{if(e.pointerType==='touch')displayChartTip(e.target.closest('[data-tip]'),e.clientX,e.clientY)});
document.addEventListener('focusin',e=>{
 if(e.target.id==='invest-range')showAtElement(document.querySelector('.energyplot [data-slot="'+e.target.value+'"]'));
 else showAtElement(e.target.closest('[data-tip]'));
});
document.addEventListener('input',e=>{if(e.target.id==='invest-range')showAtElement(document.querySelector('.energyplot [data-slot="'+e.target.value+'"]'))});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hideChartTip()});
document.addEventListener('scroll',hideChartTip,true);
window.addEventListener('blur',hideChartTip);
document.documentElement.addEventListener('pointerleave',hideChartTip);
new MutationObserver(()=>{if(tipOwner&&!tipOwner.isConnected)hideChartTip()}).observe(document.querySelector('main'),{childList:true,subtree:true});
function chartChange(render){
 hideChartTip();
 if(document.startViewTransition&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  document.startViewTransition(render);
 }else render();
}
