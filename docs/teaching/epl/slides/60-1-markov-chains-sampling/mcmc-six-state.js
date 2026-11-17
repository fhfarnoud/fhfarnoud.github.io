/* A finite, reversible chain for each chosen target. The construction stays
   internal so the next slides can introduce Metropolis without spoilers. */
const SIX_STATE_TARGETS=[
 {name:'Uniform',weights:[1,1,1,1,1,1]},
 {name:'Single Peak',weights:[2,5,6,4,2,1]},
 {name:'Two Peaks',weights:[7,1,1,7,2,2]}
].map(t=>({...t,p:t.weights.map(w=>w/t.weights.reduce((a,b)=>a+b,0))}));
function sixStateFraction(a,b){
 const gcd=(x,y)=>y?gcd(y,x%y):x,g=gcd(a,b);return {numerator:a/g,denominator:b/g};
}
function sixStateTransitions(target){
 const w=SIX_STATE_TARGETS[target].weights;
 // A symmetric lazy ring proposal yields reversible, irreducible transitions.
 return w.map((wi,i)=>{
  const row=w.map(()=>0);
  for(const j of [(i+5)%6,(i+1)%6])row[j]=Math.min(wi,w[j])/(4*wi);
  row[i]=1-row.reduce((a,b)=>a+b,0);return row;
 });
}
function sixStateProbabilityFraction(target,i,j){
 if(i!==j&&j!==(i+5)%6&&j!==(i+1)%6)return {numerator:0,denominator:1};
 const w=SIX_STATE_TARGETS[target].weights,denominator=4*w[i];
 const numerator=i===j?denominator-Math.min(w[i],w[(i+5)%6])-Math.min(w[i],w[(i+1)%6]):Math.min(w[i],w[j]);
 return sixStateFraction(numerator,denominator);
}
function sixStateChain(target=0,seed=6117+target*101){
 const P=sixStateTransitions(target),random=mulberry32(seed),counts=[0,0,0,0,0,0],tail=[];
 let n=0,current=0,last=null;
 const snapshot=()=>({target,n,current,last:last?{...last}:null,counts:counts.slice(),frequencies:counts.map(x=>n?x/n:0),tail:tail.slice()});
 function advance(){
  const from=current,u=random();let sum=0,to=5;
  for(let j=0;j<6;j++){sum+=P[from][j];if(u<sum){to=j;break;}}
  current=to;counts[to]++;n++;last={from,to,probability:P[from][to]};tail.push(to);if(tail.length>12)tail.shift();
 }
 return {snapshot,step(){advance();return snapshot();},run(k){for(let i=0;i<k;i++)advance();return snapshot();}};
}
globalThis.SIX_STATE_MODELS={targets:SIX_STATE_TARGETS,matrix:sixStateTransitions,fraction:sixStateProbabilityFraction,create:sixStateChain};

(function(){
 const roots={},center=[335,217],positions=Array.from({length:6},(_,i)=>{
  const a=(-90+i*60)*Math.PI/180;return [center[0]+112*Math.cos(a),center[1]+112*Math.sin(a)];
 });
 const state={chain:sixStateChain(),running:false,busy:false,raf:0,generation:0};
 let before=state.chain.snapshot(),after=before,progress=1,printSnapshot;
 const section=()=>document.getElementById('mcmc');
 function display(){
  if(PRINT){if(!printSnapshot)printSnapshot=sixStateChain(1).run(10000);return {s:printSnapshot,a:printSnapshot,b:printSnapshot,u:1};}
  return {s:progress<1?before:after,a:before,b:after,u:progress};
 }
 function probabilityTex(target,i,j){
  const f=sixStateProbabilityFraction(target,i,j);return f.denominator===1?String(f.numerator):`\\tfrac{${f.numerator}}{${f.denominator}}`;
 }
 function buildGraph(root,target){
  const svg=mcSvg(root,670,435),P=sixStateTransitions(target),edges=[];
  for(let i=0;i<6;i++){
   for(const j of [(i+1)%6,(i+5)%6])edges.push({a:'n'+i,b:'n'+j,bend:22,color:'#aaa4b8',w:1.5,from:i,to:j});
   edges.push({a:'n'+i,loop:['above','right','right','below','left','left'][i],color:'#aaa4b8',w:1.5,from:i,to:i});
  }
  const nodes=Object.fromEntries(positions.map(([x,y],i)=>['n'+i,{at:[x/100,-y/100],d:.56,tex:'$'+(i+1)+'$',fill:'#fff',color:'#807a91'}]));
  mcGraph(root,svg,{s:100,key:'six-ring',fs:26,lw:1.7,nodes,edges},0,0);
  const group=svg.querySelector('g'),paths=[...group.querySelectorAll('path')],circles=[...group.querySelectorAll('circle')];
  const links=edges.map((edge,k)=>{
   const curve=paths[2*k],head=paths[2*k+1],length=curve.getTotalLength(),mid=curve.getPointAtLength(length/2);
   const chord=[(positions[edge.from][0]+positions[edge.to][0])/2,(positions[edge.from][1]+positions[edge.to][1])/2];
   let dx,dy;
   if(edge.from===edge.to){dx=positions[edge.from][0]-center[0];dy=positions[edge.from][1]-center[1];}
   else{dx=mid.x-chord[0];dy=mid.y-chord[1];}
   const norm=Math.hypot(dx,dy)||1,gap=edge.from===edge.to?25:23,labelX=mid.x+gap*dx/norm,labelY=mid.y+gap*dy/norm;
   curve.dataset.from=edge.from+1;curve.dataset.to=edge.to+1;curve.dataset.probability=P[edge.from][edge.to];
   const title=el(curve,'title'),f=sixStateProbabilityFraction(target,edge.from,edge.to);
   title.textContent=`State ${edge.from+1} to state ${edge.to+1}: ${f.numerator}/${f.denominator} = ${P[edge.from][edge.to].toFixed(4)}`;
   mcMath(root,'transition'+k,'$'+probabilityTex(target,edge.from,edge.to)+'$',labelX,labelY,'c',C.ink,20);
   const label=root.querySelector(`[data-k="transition${k}"]`);label.classList.add('six-probability');
   return {...edge,curve,head,label,length};
  });
  const token=el(svg,'circle',{r:6.5,fill:C.prior,stroke:'#fff','stroke-width':1.7});
  root._sixGraph={target,svg,links,circles,token};
 }
 const badge=i=>[positions[i][0]+21,positions[i][1]-21];
 const mix=(a,b,u)=>[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
 function renderGraph(root){
  const {s,a,b,u}=display();if(!root._sixGraph||root._sixGraph.target!==s.target)buildGraph(root,s.target);
  const g=root._sixGraph,last=b.last;
  g.circles.forEach((circle,k)=>{
   const i=Math.floor(k/2),on=i===s.current;
   if(k%2===0)attr(circle,{fill:on?'#e5ecf8':'#fff'});
   else attr(circle,{stroke:on?C.prior:'#807a91','stroke-width':on?3:1.7});
  });
  g.links.forEach(edge=>{
   const active=last&&edge.from===last.from&&edge.to===last.to;
   attr(edge.curve,{stroke:active?C.prior:'#aaa4b8','stroke-width':active?2.8:1.5});attr(edge.head,{fill:active?C.prior:'#aaa4b8',stroke:active?C.prior:'#aaa4b8'});
   edge.label.style.color=edge.from===s.current?C.prior:C.ink;
  });
  let xy=badge(s.current);
  if(last&&u<1){
   const edge=g.links.find(e=>e.from===last.from&&e.to===last.to),start=edge.curve.getPointAtLength(0),end=edge.curve.getPointAtLength(edge.length);
   if(u<.15)xy=mix(badge(a.current),[start.x,start.y],u/.15);
   else if(u>.85)xy=mix([end.x,end.y],badge(b.current),(u-.85)/.15);
   else{const point=edge.curve.getPointAtLength(edge.length*(u-.15)/.7);xy=[point.x,point.y];}
  }
  attr(g.token,{cx:xy[0],cy:xy[1]});
  mcMath(root,'current-label','Current: <b class="c-prior">'+(s.current+1)+'</b>',335,217,'c',C.mle,20);
  root.dataset.target=s.target;root.dataset.state=s.current+1;root.dataset.steps=s.n;
 }
 function renderFrequencies(root){
  const {s}=display(),key=s.target+':'+s.n;if(root._sixChartKey===key)return;
  const svg=mcSvg(root,500,300),target=SIX_STATE_TARGETS[s.target],ymax=Math.max(.4,Math.ceil(Math.max(...target.p,...s.frequencies)*5)/5),B=box2d(55,65,420,170,.5,6.5,0,ymax);
  mcAxes(root,svg,B,[1,2,3,4,5,6],Array.from({length:Math.round(ymax/.2)+1},(_,i)=>Number((i*.2).toFixed(1))),'State','Probability');
  mcMath(root,'legend','<span class="c-pred">□ Target $p$</span> · <span class="c-like">■ Empirical</span>',325,20,'c',C.ink,20);
  const g=new Scene(root,0,0,el(svg,'g'));g.begin();const plot=g.plot(B);
  const bars=plot.bars([1,2,3,4,5,6].map(x=>x-.15),s.frequencies,{width:.25,color:C.like,fo:.55});
  plot.bars([1,2,3,4,5,6].map(x=>x+.15),target.p,{width:.25,color:C.pred,fo:.06,stroke:C.pred,'stroke-width':2});g.trim();
  bars.forEach((bar,i)=>{bar.dataset.count=s.counts[i];bar.dataset.frequency=s.frequencies[i];});
  if(s.n)[0,1,2,3,4,5].forEach(i=>{
   const inside=s.frequencies[i]>.94*ymax;
   mcMath(root,'frequency'+i,Number(s.frequencies[i].toFixed(3)).toString(),B.X(i+1-.15),B.Y(s.frequencies[i])+(inside?14:-13),'c',C.like,16);
  });
  const vector=s.target===0?Array(6).fill('1/6').join(','):target.p.map(x=>x.toFixed(2)).join(',');
  const owner=root.closest('section'),values=owner.querySelector('.six-target-values');values.innerHTML=rich('$p=('+vector+')$');
  values.setAttribute('aria-label',target.name+' target: '+target.p.join(', '));
  owner.querySelectorAll('[data-mcmc-target]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.mcmcTarget)===s.target)));
  root.dataset.target=s.target;root.dataset.steps=s.n;root.dataset.counts=JSON.stringify(s.counts);root.dataset.frequencies=JSON.stringify(s.frequencies);root._sixChartKey=key;
 }
 [['mcmc',670,435,renderGraph],['mcmcFrequencies',500,300,renderFrequencies]].forEach(([name,w,h,render])=>{
  FIGS[name]={init(root){root.style.width=w+'px';root.style.height=h+'px';if(!PRINT)roots[name]=root;},render};
 });
 if(PRINT)return;
 function controls(){
  const s=section();
  s.querySelectorAll('[data-mcmc-action="next"],[data-mcmc-action="batch"]').forEach(button=>button.disabled=state.busy||state.running);
  const run=s.querySelector('[data-mcmc-action="run"]');run.textContent=state.running?'Pause':'Run';run.setAttribute('aria-pressed',String(state.running));
 }
 function draw(){
  Object.entries(roots).forEach(([name,root])=>FIGS[name].render(root));
  const s=display().s;
  section().querySelector('.six-state-status').textContent=s.n?`N=${s.n.toLocaleString()} recorded states · ${s.last.from+1} → ${s.last.to+1}`:'No visits recorded. Start at state 1.';
 }
 function next(){
  if(state.busy||Reveal.getCurrentSlide()?.id!=='mcmc')return;
  before=state.chain.snapshot();after=state.chain.step();progress=0;state.busy=true;controls();
  const generation=++state.generation,t0=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:state.running?220:650;
  const frame=now=>{
   if(generation!==state.generation)return;
   const t=duration?Math.min(1,(now-t0)/duration):1;progress=t*t*(3-2*t);draw();
   if(t<1)state.raf=requestAnimationFrame(frame);
   else{state.busy=false;before=after;controls();if(state.running)state.raf=requestAnimationFrame(next);}
  };
  state.raf=requestAnimationFrame(frame);
 }
 function reset(target=after.target){
  ++state.generation;cancelAnimationFrame(state.raf);state.running=false;state.busy=false;
  state.chain=sixStateChain(target);before=after=state.chain.snapshot();progress=1;draw();controls();
 }
 document.addEventListener('click',event=>{
  const button=event.target.closest('#mcmc button');if(!button)return;
  if(button.hasAttribute('data-mcmc-target'))reset(Number(button.dataset.mcmcTarget));
  else{
   const action=button.dataset.mcmcAction;
   if(action==='next')next();
   if(action==='run'){state.running=!state.running;controls();if(state.running&&!state.busy)next();}
   if(action==='reset')reset();
   if(action==='batch'&&!state.busy&&!state.running){after=state.chain.run(Number(button.dataset.count));before=after;progress=1;draw();controls();}
  }
  event.preventDefault();event.stopPropagation();
 });
 Reveal.on('ready',()=>{
  section().querySelectorAll('.six-target-controls,.six-run-controls').forEach(group=>group.addEventListener('keydown',event=>event.stopPropagation()));
  draw();controls();
 });
 Reveal.on('slidechanged',event=>{
  if(event.previousSlide?.id==='mcmc'){
   state.running=false;++state.generation;cancelAnimationFrame(state.raf);state.busy=false;progress=1;before=after;draw();controls();
  }
 });
 globalThis.SIX_STATE_DEMO={snapshot:()=>display().s,running:()=>state.running,busy:()=>state.busy,probabilities:()=>sixStateTransitions(after.target)};
})();
