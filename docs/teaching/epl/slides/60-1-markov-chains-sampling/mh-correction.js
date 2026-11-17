/* Isolate the proposal imbalance with two equally likely target states. */
function mhCorrectionJump(from,to,bias=1){
 const d=to-from;if(Math.abs(d)>1)return 0;if(d===0)return .5;
 return bias?(d>0?.75:.25):.5;
}
function mhCorrectionAcceptance(from,to,bias=1,corrected=true){
 const forward=mhCorrectionJump(from,to,bias);if(!forward)return 0;
 const ratio=Math.exp((from*from-to*to)/2);
 return Math.min(1,ratio*(corrected?mhCorrectionJump(to,from,bias)/forward:1));
}
function mhCorrectionComparison(bias=1,corrected=true){
 const a=-.4,b=.4,target=Math.exp(-a*a/2)/Math.sqrt(2*Math.PI);
 const rows=[[a,b],[b,a]].map(([from,to])=>{
  const jump=mhCorrectionJump(from,to,bias),reverse=mhCorrectionJump(to,from,bias),alpha=mhCorrectionAcceptance(from,to,bias,corrected);
  return {from,to,jump,reverse,alpha,flow:target*jump*alpha};
 });
 return {bias,corrected,a,b,target,rows,balanced:Math.abs(rows[0].flow-rows[1].flow)<1e-12};
}
globalThis.MH_CORRECTION_MODELS={jump:mhCorrectionJump,acceptance:mhCorrectionAcceptance,comparison:mhCorrectionComparison};

(function(){
 function render(root,p){
  const bias=PRINT?(p.bias??1):(root._mhBias??p.bias??1),view=PRINT?(p.view??0):(root._mhView??p.view??0),stage=Math.round(p.stage??0),corrected=stage>=1;
  const m=mhCorrectionComparison(bias,corrected),row=m.rows[view],svg=mcSvg(root,600,265),B=box2d(50,73,520,125,-3,3,0,.85),normal=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
  mcMath(root,'legend','<span class="c-pred">━ Target $p=\\mathcal N(0,1)$</span> · <span class="c-postC">□ Jump density $J$</span>',310,14,'c',C.ink,18);
  mcMath(root,'current',`<span class="c-prior">● Current $x=${row.from}$</span>`,195,41,'c',C.prior,18);
  mcMath(root,'proposal',`<span class="c-postC">◆ Proposed $x'=${row.to}$</span>`,445,41,'c',C.postC,18);
  mcAxes(root,svg,B,[-3,-2,-1,0,1,2,3],[0,.25,.5,.75],"Possible next state $x'$",'Density');
  for(const [from,to,height] of [[row.from-1,row.from,bias?.25:.5],[row.from,row.from+1,bias?.75:.5]]){
   el(svg,'rect',{x:B.X(from),y:B.Y(height),width:B.X(to)-B.X(from),height:B.Y(0)-B.Y(height),fill:C.postC,'fill-opacity':.12,stroke:C.postC,'stroke-width':2,'data-proposal-interval':JSON.stringify([from,to]),'data-density':height});
  }
  mcDensity(svg,B,normal,C.pred);
  for(const [x,color] of [[row.from,C.prior],[row.to,C.postC]])el(svg,'line',{x1:B.X(x),x2:B.X(x),y1:B.Y(0),y2:B.Y(normal(x)),stroke:color,'stroke-width':1.5,'stroke-dasharray':'4 4'});
  el(svg,'circle',{cx:B.X(row.from),cy:B.Y(normal(row.from)),r:5.5,fill:C.prior,stroke:'#fff','stroke-width':1.5});
  el(svg,'path',{d:`M${B.X(row.to)},${B.Y(normal(row.to))-6}l6,6l-6,6l-6,-6Z`,fill:C.postC,stroke:'#fff','stroke-width':1.4});
  const owner=root.closest('section'),numeric=owner.querySelector('.mh-comparison-readout');
  owner.querySelector('.mh-proposal-split').textContent=bias?'Right 75% · Left 25%':'Right 50% · Left 50%';
  numeric.querySelector('.mh-rule-label').textContent=corrected?'With the Hastings correction':'Ordinary Metropolis';
  numeric.querySelector('.mh-equal-target').innerHTML=rich(`Equal target densities: $p(-0.4)=p(0.4)\\approx${m.target.toFixed(4)}$`);
  numeric.querySelector('tbody').innerHTML=m.rows.map((r,i)=>`<tr class="${i===view?'mh-selected-move':''}"><td>${rich(`$${r.from}\\to ${r.to}$`)}</td><td>${r.jump.toFixed(2)}</td><td>${r.alpha.toFixed(3)}</td><td class="${m.balanced?'c-like':'c-post'}">${r.flow.toFixed(4)}</td></tr>`).join('');
  const message=corrected?(bias?"Correction: $0.75\\times\\tfrac13=0.25\\times1$. Equal flows.":'Proposal ratio $=1$: ordinary Metropolis is recovered.'):(bias?'Forward flow is <b>3 times</b> the reverse flow.':'Symmetric proposals already balance this pair.');
  const result=numeric.querySelector('.mh-flow-result');result.innerHTML=rich(message);result.classList.toggle('c-post',!m.balanced);result.classList.toggle('c-like',m.balanced);
  owner.querySelectorAll('[data-mh-bias]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mhBias)===bias)));
  owner.querySelectorAll('[data-mh-view]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.mhView)===view)));
  Object.assign(root.dataset,{bias:String(bias),view:String(view),stage:String(stage),corrected:String(corrected),balanced:String(m.balanced),forwardJ:String(m.rows[0].jump),reverseJ:String(m.rows[1].jump),forwardAlpha:String(m.rows[0].alpha),reverseAlpha:String(m.rows[1].alpha),forwardFlow:String(m.rows[0].flow),reverseFlow:String(m.rows[1].flow)});
 }
 FIGS.hastingsComparison={init(root){root.style.width='600px';root.style.height='265px';},render};
 if(PRINT)return;
 document.addEventListener('click',event=>{
  const b=event.target.closest('#hastings [data-mh-bias],#hastings [data-mh-view]');if(!b)return;
  const root=b.closest('section').querySelector('[data-fig=hastingsComparison]'),st=live.get(root)||{},p=stateFor(root);
  cancelAnimationFrame(st.raf);
  if(b.hasAttribute('data-mh-bias'))root._mhBias=Number(b.dataset.mhBias);
  if(b.hasAttribute('data-mh-view'))root._mhView=Number(b.dataset.mhView);
  render(root,p);st.p=p;live.set(root,st);event.preventDefault();event.stopPropagation();
 });
 Reveal.on('ready',()=>document.querySelectorAll('#hastings .mh-comparison-controls').forEach(group=>group.addEventListener('keydown',event=>event.stopPropagation())));
})();
