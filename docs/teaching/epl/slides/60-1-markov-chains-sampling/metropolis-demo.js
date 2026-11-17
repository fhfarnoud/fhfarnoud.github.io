/* One actual uniform-proposal Metropolis chain, shared by staged and batch controls. */
function metroNormalDensity(x){return Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);}
function metroAcceptance(x,xp){return Math.min(1,Math.exp((x*x-xp*xp)/2));}
function metroChain(seed=121,start=2){
 const random=mulberry32(seed),samples=[];
 let current=start,stage=0,move=null,acceptedCount=0;
 const snapshot=()=>({current,stage,n:samples.length,samples:samples.slice(),acceptedCount,move:move?{...move}:null});
 function advance(){
  if(stage===0||stage===4){move={from:current,proposal:current+2*random()-1,alpha:null,u:null,accepted:null,to:null};stage=1;}
  else if(stage===1){move.alpha=metroAcceptance(move.from,move.proposal);stage=2;}
  else if(stage===2){move.u=random();move.accepted=move.u<=move.alpha;stage=3;}
  else{current=move.accepted?move.proposal:move.from;move.to=current;samples.push(current);if(move.accepted)acceptedCount++;stage=4;}
 }
 function complete(){if(stage===0||stage===4)advance();while(stage!==4)advance();}
 return {snapshot,next(){advance();return snapshot();},iteration(){complete();return snapshot();},run(n){for(let i=0;i<n;i++)complete();return snapshot();}};
}
function metroHistogram(samples,current,proposal){
 let lo=Math.min(-4,Math.floor(current-1)),hi=Math.max(4,Math.ceil(current+1));
 if(proposal!==undefined){lo=Math.min(lo,Math.floor(proposal));hi=Math.max(hi,Math.ceil(proposal));}
 for(const x of samples){lo=Math.min(lo,Math.floor(x));hi=Math.max(hi,Math.ceil(x));}
 const width=.5,bins=Math.round((hi-lo)/width),counts=Array(bins).fill(0);
 for(const x of samples)counts[Math.min(bins-1,Math.max(0,Math.floor((x-lo)/width)))]++;
 const heights=counts.map(c=>samples.length?c/(samples.length*width):0);
 return {lo,hi,width,counts,heights,centers:counts.map((_,i)=>lo+(i+.5)*width),ymax:Math.max(.6,Math.ceil(Math.max(0,...heights)*5)/5)};
}
globalThis.METROPOLIS_DEMO_MODELS={create:metroChain,acceptance:metroAcceptance,density:metroNormalDensity,histogram:metroHistogram};

(function(){
 let chain=metroChain(),visible=chain.snapshot(),animation=null,root,busy=false,running=false,raf=0,timer=0,generation=0,printState;
 function view(){
  if(PRINT){if(!printState)printState=metroChain().run(10000);return {s:printState,x:printState.current};}
  return {s:visible,x:animation?animation.from+(animation.to-animation.from)*animation.u:visible.current};
 }
 function markup(s){
  const m=s.move,f=x=>Number(x).toFixed(3);
  let precision=3;
  if(m?.u!==null&&m?.u!==undefined)while(precision<12&&m.u!==m.alpha&&m.u.toFixed(precision)===m.alpha.toFixed(precision))precision++;
  const probability=x=>Number(x).toFixed(precision);
  let summary='Start at $x=2$. Propose the next state.',calculation='Calculate the acceptance probability after proposing.',decision='Then draw $u$, decide, and record the next state.';
  if(s.stage===1)summary=`<b>1. Propose:</b> $x'=${f(m.proposal)}$ from $[${f(m.from-1)},${f(m.from+1)}]$.`;
  if(s.stage===2)summary=`<b>2. Calculate:</b> compare the unnormalized target values.`;
  if(s.stage===3)summary=`<b>3. Decide:</b> ${m.accepted?'accept the proposed state.':'reject the proposed state.'}`;
  if(s.stage===4)summary=`<b>4. Update:</b> ${m.accepted?`moved to $x=${f(s.current)}$.`:`stayed at $x=${f(s.current)}$.`} Recorded once.`;
  if(s.stage>=2){
   const q=x=>Math.exp(-x*x/2),format=x=>x>=.00005?x.toFixed(4):x.toExponential(2).replace(/e([+-]?\d+)/,'\\times10^{$1}');
   calculation=`$\\alpha=\\min\\!\\left(1,\\frac{q(x')}{q(x)}\\right)=\\min\\!\\left(1,\\frac{${format(q(m.proposal))}}{${format(q(m.from))}}\\right)=${probability(m.alpha)}$`;
  }
  if(s.stage>=3)decision=`<span class="${m.accepted?'c-like':'c-post'}">$u=${probability(m.u)} ${m.accepted?'\\le': '>'} \\alpha=${probability(m.alpha)}$ <b>${m.accepted?'ACCEPT':'REJECT'}</b></span>`;
  return {summary,calculation,decision};
 }
 function render(r){
  const {s,x}=view(),m=s.move,proposing=s.stage>=1&&s.stage<=3,H=metroHistogram(s.samples,s.current,proposing?m.proposal:undefined);
  const svg=mcSvg(r,720,330),B=box2d(60,76,630,190,H.lo,H.hi,0,H.ymax);
  const xt=[];for(let t=H.lo;t<=H.hi;t++)if(t%2===0)xt.push(t);
  const yt=H.ymax<=1?[0,.2,.4,...(H.ymax>=.8?[.6,.8]:[]),...(H.ymax===1?[1]:[])]:[0,H.ymax/2,H.ymax];
  mcAxes(r,svg,B,xt,yt.filter(v=>v<=H.ymax),'State $x$','Density');
  mcMath(r,'legend','<span class="c-pred">━ Target $p(x)$</span> · <span class="c-postC">□ Jump $J$</span> · <span class="c-like">■ Visited states</span>',375,13,'c',C.ink,19);
  mcMath(r,'current',`<span class="c-prior">● Current $x=${s.current.toFixed(3)}$</span>`,230,46,'c',C.prior,19);
  if(proposing)mcMath(r,'proposal',`<span class="c-postC">◆ Proposed $x'=${m.proposal.toFixed(3)}$</span>`,530,46,'c',C.postC,19);
  const left=B.X(s.current-1),right=B.X(s.current+1),top=B.Y(.5),base=B.Y(0);
  el(svg,'rect',{x:left,y:top,width:right-left,height:base-top,fill:C.postC,'fill-opacity':.10,stroke:C.postC,'stroke-width':2,'data-jump-left':s.current-1,'data-jump-right':s.current+1,'data-jump-height':.5});
  if(s.n){
   const g=new Scene(r,0,0,el(svg,'g'));g.begin();
   const bars=g.plot(B).bars(H.centers,H.heights,{width:H.width*.95,color:C.like,fo:.24,stroke:C.like,'stroke-width':1});g.trim();
   bars.forEach((bar,i)=>{bar.dataset.count=H.counts[i];bar.dataset.height=H.heights[i];});
  }
  mcDensity(svg,B,metroNormalDensity,C.pred);
  el(svg,'line',{x1:B.X(x),x2:B.X(x),y1:base,y2:B.Y(metroNormalDensity(x)),stroke:C.prior,'stroke-width':2,'stroke-dasharray':'4 4'});
  el(svg,'circle',{cx:B.X(x),cy:B.Y(metroNormalDensity(x)),r:6,fill:C.prior,stroke:'#fff','stroke-width':1.7,'data-current-dot':'1','data-state':x});
  if(proposing){
   const color=s.stage===3?(m.accepted?C.like:C.post):C.postC;
   el(svg,'line',{x1:B.X(m.proposal),x2:B.X(m.proposal),y1:base,y2:B.Y(metroNormalDensity(m.proposal)),stroke:color,'stroke-width':2,'stroke-dasharray':'3 4'});
   el(svg,'path',{d:`M${B.X(m.proposal)},${B.Y(metroNormalDensity(m.proposal))-7}l7,7l-7,7l-7,-7Z`,fill:color,stroke:'#fff','stroke-width':1.5,'data-proposed-state':m.proposal});
  }
  const owner=r.closest('section'),copy=markup(s);
  owner.querySelector('.metro-stage-summary').innerHTML=rich(copy.summary);
  owner.querySelector('.metro-calculation').innerHTML=rich(copy.calculation);
  owner.querySelector('.metro-calculation').classList.toggle('metro-placeholder',s.stage<2);
  owner.querySelector('.metro-decision').innerHTML=rich(copy.decision);
  owner.querySelector('.metro-decision').classList.toggle('metro-placeholder',s.stage<3);
  owner.querySelector('.metro-count').textContent=`N = ${s.n.toLocaleString()} recorded states`;
  owner.querySelectorAll('[data-metro-stage]').forEach(li=>{li.classList.toggle('metro-active',Number(li.dataset.metroStage)===s.stage);li.setAttribute('aria-current',Number(li.dataset.metroStage)===s.stage?'step':'false');});
  Object.assign(r.dataset,{stage:String(s.stage),steps:String(s.n),current:String(s.current),alpha:String(m?.alpha),u:String(m?.u),accepted:String(m?.accepted),counts:JSON.stringify(H.counts),heights:JSON.stringify(H.heights),binWidth:String(H.width),ymax:String(H.ymax)});
 }
 FIGS.metropolis={init(r){r.style.width='720px';r.style.height='330px';if(!PRINT)root=r;},render};
 if(PRINT)return;
 function controls(){
  const owner=document.getElementById('metropolis'),stage=owner.querySelector('[data-metro-action=stage]');
  stage.textContent=['Propose','Calculate','Decide','Update','Propose'][visible.stage];
  owner.querySelectorAll('[data-metro-action=stage],[data-metro-action=iteration],[data-metro-action=batch]').forEach(b=>b.disabled=busy||running);
  const run=owner.querySelector('[data-metro-action=run]');run.textContent=running?'Pause':'Run';run.setAttribute('aria-pressed',String(running));
 }
 function draw(){if(root)render(root);controls();}
 function settle(next){
  if(next.n===visible.n){visible=next;draw();return;}
  const previous=visible;busy=true;visible={...previous,stage:3,move:next.move};animation={from:previous.current,to:next.current,u:0};
  const token=++generation,start=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:running?220:350;controls();
  function frame(now){
   if(token!==generation)return;
   const t=duration?Math.min(1,(now-start)/duration):1;animation.u=t*t*(3-2*t);
   if(t===1){visible=next;animation=null;busy=false;}
   draw();
   if(t<1)raf=requestAnimationFrame(frame);else if(running)timer=setTimeout(iteration,80);
  }
  raf=requestAnimationFrame(frame);
 }
 function iteration(){if(busy||Reveal.getCurrentSlide()?.id!=='metropolis')return;settle(chain.iteration());}
 function stop(){running=false;clearTimeout(timer);controls();}
 function reset(){stop();++generation;cancelAnimationFrame(raf);busy=false;animation=null;chain=metroChain();visible=chain.snapshot();draw();}
 document.addEventListener('click',event=>{
  const button=event.target.closest('#metropolis [data-metro-action]');if(!button)return;
  const action=button.dataset.metroAction;
  if(action==='reset')reset();
  else if(action==='run'){if(running)stop();else{running=true;controls();if(!busy)iteration();}}
  else if(!busy&&!running){
   if(action==='stage')settle(chain.next());
   if(action==='iteration')iteration();
   if(action==='batch'){visible=chain.run(Number(button.dataset.count));draw();}
  }
  event.preventDefault();event.stopPropagation();
 });
 Reveal.on('ready',()=>{
  document.querySelector('#metropolis .metro-controls').addEventListener('keydown',event=>event.stopPropagation());draw();
 });
 Reveal.on('slidechanged',event=>{
  if(event.previousSlide?.id==='metropolis'){stop();++generation;cancelAnimationFrame(raf);visible=chain.snapshot();animation=null;busy=false;draw();}
 });
 globalThis.METROPOLIS_DEMO={snapshot:()=>({...visible,samples:visible.samples.slice(),move:visible.move?{...visible.move}:null}),running:()=>running,busy:()=>busy};
})();
