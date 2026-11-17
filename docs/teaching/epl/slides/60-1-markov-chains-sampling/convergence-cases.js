/* Exact distribution updates for the three contrasting transition graphs. */
const CONVERGENCE_CASE_MATRICES=[[[1,0],[0,1]],[[0,1],[1,0]],MC_PATIENT];
function convergenceCaseDistribution(which,start,t){
 let v=start?[0,1]:[1,0];
 for(let k=0;k<t;k++)v=mcMultiply(v,CONVERGENCE_CASE_MATRICES[which]);
 return v;
}
globalThis.CONVERGENCE_CASE_MODELS={matrices:CONVERGENCE_CASE_MATRICES,distribution:convergenceCaseDistribution};
(function(){
 const names=['convergenceDisconnected','convergencePeriodic','convergencePatient'];
 const tint=(j,p)=>{const hex=MC_COLORS[j].slice(1),a=.06+.68*p;return '#'+[0,2,4].map(i=>Math.round(255+(parseInt(hex.slice(i,i+2),16)-255)*a).toString(16).padStart(2,'0')).join('');};
 names.forEach((name,which)=>mcRegister(name,370,188,(root,svg,p)=>{
  const start=Math.round(p.start??0),t=Math.max(0,Math.min(20,Math.round(p.t??0))),v=convergenceCaseDistribution(which,start,t),old=root._convergenceVector;
  svg.setAttribute('aria-label',`${['Disconnected','Periodic','Regular patient'][which]} chain at time ${t}. State probabilities ${v.map(x=>Number(x.toFixed(4))).join(', ')}.`);
  const edges=[];
  CONVERGENCE_CASE_MATRICES[which].forEach((row,i)=>row.forEach((prob,j)=>{
   if(!prob)return;
   edges.push(i===j?{a:i?'b':'a',loop:i?'right':'left',lab:'$'+prob+'$',pos:i?'right':'left',gap:9,color:MC_COLORS[i]}:{a:i?'b':'a',b:j?'b':'a',bend:32,lab:'$'+prob+'$',pos:i?'below':'above',gap:9,color:MC_COLORS[i]});
  }));
  mcGraph(root,svg,{s:75,key:name,fs:23,lw:1.6,nodes:{a:{at:[0,0],d:.7,tex:'$1$',fill:tint(0,v[0]),color:MC_COLORS[0]},b:{at:[2.4,0],d:.7,tex:'$2$',fill:tint(1,v[1]),color:MC_COLORS[1]}},edges},95,60);
  mcMath(root,'name1',which===2?'Remission':'State 1',95,108,'c',C.prior,18);
  mcMath(root,'name2',which===2?'Relapse':'State 2',275,108,'c',C.postC,18);
  const blue=el(svg,'rect',{x:35,y:137,width:300*v[0],height:12,fill:C.prior,'fill-opacity':.6});
  const amber=el(svg,'rect',{x:35+300*v[0],y:137,width:300*v[1],height:12,fill:C.postC,'fill-opacity':.6});
  el(svg,'rect',{x:35,y:137,width:300,height:12,fill:'none',stroke:'#c1bacf','stroke-width':.7});
  const number=x=>String(Number(x.toFixed(4)));
  mcMath(root,'distribution',`$\\boldsymbol\\pi_${t}=(\\textcolor{${C.prior}}{${number(v[0])}},\\textcolor{${C.postC}}{${number(v[1])}})$`,185,173,'c',C.ink,23);
  if(!PRINT&&old&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   svg.querySelectorAll('circle[stroke="none"]').forEach((node,j)=>node.animate([{fill:tint(j,old[j])},{fill:tint(j,v[j])}],{duration:350,easing:'ease-out'}));
   [blue,amber].forEach((bar,j)=>{
    if(!v[j])return;
    bar.style.transformBox='fill-box';bar.style.transformOrigin='0 0';
    const dx=j?300*(old[0]-v[0]):0;
    bar.animate([{transform:`translateX(${dx}px) scaleX(${old[j]/v[j]})`},{transform:'translateX(0) scaleX(1)'}],{duration:350,easing:'ease-out'});
   });
  }
  root._convergenceVector=v;root.dataset.probabilities=JSON.stringify(v);root.dataset.time=t;
  root.dataset.init=JSON.stringify({start,t});
 }));
 if(PRINT)return;
 const section=()=>document.getElementById('chain-convergence');
 document.addEventListener('click',event=>{
  const button=event.target.closest('#chain-convergence button');if(!button)return;
  const roots=[...section().querySelectorAll('.fig')],current=JSON.parse(roots[0].dataset.init),p={...current};
  if(button.hasAttribute('data-convergence-start')){p.start=Number(button.dataset.convergenceStart);p.t=0;}
  if(button.dataset.convergenceAction==='next')p.t=Math.min(20,p.t+1);
  if(button.dataset.convergenceAction==='reset')p.t=0;
  roots.forEach(root=>{const state=live.get(root)||{};cancelAnimationFrame(state.raf);FIGS[root.dataset.fig].render(root,p);state.p={...p};live.set(root,state);});
  section().querySelectorAll('[data-convergence-start]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.convergenceStart)===p.start)));
  section().querySelector('[data-convergence-action="next"]').disabled=p.t===20;
  section().querySelector('.convergence-case-time').innerHTML=rich(`Time $t=${p.t}$`);
  event.preventDefault();event.stopPropagation();
 });
 Reveal.on('ready',()=>section().querySelector('.convergence-case-controls').addEventListener('keydown',event=>event.stopPropagation()));
})();
