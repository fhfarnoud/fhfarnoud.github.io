/* Local controller for the patient-example derivation. */
function distributionModel(p){
 const a=Math.round(p.a??1),t=Math.max(0,Math.round(p.t??0)),stage=Math.max(0,Math.min(6,Math.round(p.stage??0)));
 const probabilities=mcDistribution(a,t),previous=t?mcDistribution(a,t-1):null;
 const contributions=t?MC_PATIENT[0].map((_,j)=>[previous[0]*MC_PATIENT[0][j],previous[1]*MC_PATIENT[1][j]]):[[a,0],[0,1-a]];
 return {a,t,stage,probabilities,previous,contributions};
}
globalThis.DISTRIBUTION_MODEL=distributionModel;
function distributionUpdate(root,p){
 const m=distributionModel(p),section=root.closest('section');
 const render=tex=>katex.renderToString(tex,{displayMode:true,macros:MACROS,throwOnError:false});
 const fmtNumber=x=>String(Number(x.toFixed(3)));
 const initial=section.querySelector('.distribution-initial');
 initial.innerHTML=rich(`<b>Start in ${m.a?'remission':'relapse'}:</b> $\\boldsymbol\\pi_0=(${m.a},${1-m.a})$`);
 let html='';
 if(m.stage>0&&m.stage<4){
  const t=m.t,prev=m.previous||[m.a,1-m.a];
  html=`<p class="distribution-step-label">After ${t} ${t===1?'step':'steps'}</p>`;
  for(let j=0;j<2;j++){
   const blue=`\\textcolor{${C.prior}}{${fmtNumber(prev[0])}\\cdot${MC_PATIENT[0][j]}}`;
   const amber=`\\textcolor{${C.postC}}{${fmtNumber(prev[1])}\\cdot${MC_PATIENT[1][j]}}`;
   html+=render(`\\pi_{${t},${j+1}}=${blue}+${amber}=${fmtNumber(m.probabilities[j])}`);
  }
  html+=`<div class="distribution-result">${render(`\\boldsymbol\\pi_${t}=(${fmtNumber(m.probabilities[0])},${fmtNumber(m.probabilities[1])})`)}</div>`;
 }else if(m.stage>=4){
  html='<p class="distribution-step-label">Sum over the previous states:</p>';
  html+=render('\\pi_{t+1,j}=\\sum_i\\pi_{ti}P_{ij}');
  if(m.stage>=5)html+=render('\\boldsymbol\\pi_t=\\boldsymbol\\pi_{t-1}P');
  if(m.stage>=6)html+=render('\\boxed{\\boldsymbol\\pi_t=\\boldsymbol\\pi_0P^t}');
 }
 const panel=section.querySelector('.distribution-equations');
 if(panel._distributionHTML!==html){
  panel.innerHTML=html;panel._distributionHTML=html;
  if(!PRINT&&html&&!matchMedia('(prefers-reduced-motion: reduce)').matches)panel.animate([{opacity:.15,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});
 }
 section.querySelectorAll('[data-distribution-start]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.distributionStart)===m.a)));
 const slider=section.querySelector('input[data-param="t"]');
 if(slider)slider.disabled=m.stage<6;
 section.querySelector('.distribution-explore').textContent=m.stage<6?'After the derivation, use the slider to explore.':'Explore additional time steps with the slider.';
 root.dataset.time=m.t;root.dataset.stage=m.stage;root.dataset.initial=m.a;
 root.dataset.probabilities=JSON.stringify(m.probabilities);root.dataset.contributions=JSON.stringify(m.contributions);
 return m;
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#state-distribution [data-distribution-start]');if(!button)return;
 const root=button.closest('section').querySelector('.fig[data-fig="distributionStep"]'),a=Number(button.dataset.distributionStart);
 const init=JSON.parse(root.dataset.init);init.a=a;root.dataset.init=JSON.stringify(init);
 const state=live.get(root)||{},p={...stateFor(root),a};
 // Keep an explored time only when the derivation is already complete.
 if(p.stage===6&&Math.round(state.p?.stage)===6)p.t=state.p.t;
 cancelAnimationFrame(state.raf);
 FIGS.distributionStep.render(root,p);state.p=p;live.set(root,state);syncKnobs(root,p);
 event.preventDefault();event.stopPropagation();
});
Reveal.on('ready',()=>{
 const controls=document.querySelector('#state-distribution .distribution-start');
 controls.addEventListener('keydown',event=>event.stopPropagation());
});
