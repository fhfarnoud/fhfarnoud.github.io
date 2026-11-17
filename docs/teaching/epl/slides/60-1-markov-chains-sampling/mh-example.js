/* Construct the finite chain from q and J, then sample the resulting P. */
const MH_EXAMPLE_Q=[1,3],MH_EXAMPLE_J=[[.2,.8],[.2,.8]];
const MH_EXAMPLE_ALPHA=MH_EXAMPLE_J.map((row,i)=>row.map((j,k)=>Math.min(1,MH_EXAMPLE_Q[k]*MH_EXAMPLE_J[k][i]/(MH_EXAMPLE_Q[i]*j))));
const MH_EXAMPLE_P=MH_EXAMPLE_J.map((row,i)=>{
 const actual=row.map((j,k)=>i===k?0:j*MH_EXAMPLE_ALPHA[i][k]);actual[i]=1-actual.reduce((a,b)=>a+b,0);return actual;
});
function mhExampleChain(seed=547,start=0){
 const random=mulberry32(seed),counts=[0,0],history=[];let n=0,current=start,repeats=0,last=null;
 const snapshot=()=>({n,current,repeats,last:last?{...last}:null,counts:counts.slice(),frequencies:counts.map(c=>n?c/n:0),history:history.map(x=>({...x}))});
 function advance(){
  const from=current,to=random()<MH_EXAMPLE_P[from][0]?0:1,repeat=to===from;
  current=to;counts[to]++;n++;if(repeat)repeats++;last={from,to,probability:MH_EXAMPLE_P[from][to]};
  history.push({state:to,repeat});if(history.length>12)history.shift();
 }
 return {snapshot,step(){advance();return snapshot();},run(n){for(let i=0;i<n;i++)advance();return snapshot();}};
}
globalThis.MH_EXAMPLE_MODELS={q:MH_EXAMPLE_Q,J:MH_EXAMPLE_J,alpha:MH_EXAMPLE_ALPHA,P:MH_EXAMPLE_P,create:mhExampleChain};

(function(){
 const roots={},positions=[[90,80],[210,80]],badge=i=>[positions[i][0]+16,positions[i][1]-17];
 let chain=mhExampleChain(),before=chain.snapshot(),after=before,progress=1,busy=false,raf=0,generation=0,printSnapshot;
 function display(){
  if(PRINT){if(!printSnapshot)printSnapshot=mhExampleChain().run(10000);return {s:printSnapshot,a:printSnapshot,b:printSnapshot,u:1};}
  return {s:progress<1?before:after,a:before,b:after,u:progress};
 }
 function buildGraph(root,actual){
  const svg=mcSvg(root,300,220),P=actual?MH_EXAMPLE_P:MH_EXAMPLE_J;
  const edges=[
   {a:'a',b:'b',bend:32,lab:'$'+P[0][1].toFixed(1)+'$',pos:'above',gap:12,color:C.prior,from:0,to:1},
   {a:'b',b:'a',bend:32,lab:'$'+P[1][0].toFixed(1)+'$',pos:'below',gap:12,color:C.postC,from:1,to:0},
   {a:'a',loop:'left',lab:'$'+P[0][0].toFixed(1)+'$',pos:'left',gap:12,color:C.mle,from:0,to:0},
   {a:'b',loop:'right',lab:'$'+P[1][1].toFixed(1)+'$',pos:'right',gap:12,color:C.mle,from:1,to:1}
  ];
  mcGraph(root,svg,{s:80,key:actual?'mh-actual':'mh-proposal',fs:20,lw:1.8,nodes:{a:{at:[0,0],d:.58,tex:'$A$',fill:'#fff'},b:{at:[1.5,0],d:.58,tex:'$B$',fill:'#fff'}},edges},90,80);
  const g=svg.querySelector('g'),paths=[...g.querySelectorAll('path')],circles=[...g.querySelectorAll('circle')];
  const links=edges.map((edge,k)=>{
   const curve=paths[2*k],head=paths[2*k+1];Object.assign(curve.dataset,{from:edge.from,to:edge.to,probability:P[edge.from][edge.to]});
   return {...edge,curve,head,length:curve.getTotalLength()};
  });
  const tex=`$${actual?'P':'J'}=\\begin{pmatrix}${P[0].map(x=>x.toFixed(1)).join('&')}\\\\${P[1].map(x=>x.toFixed(1)).join('&')}\\end{pmatrix}$`;
  mcMath(root,'matrix',tex,150,181,'c',C.ink,24);
  const token=actual?el(svg,'circle',{r:5.5,fill:C.prior,stroke:'#fff','stroke-width':1.5}):null;
  return {svg,circles,links,token};
 }
 function renderProposal(root){if(!root._mhGraph)root._mhGraph=buildGraph(root,false);}
 function renderChain(root,p){
  if(!root._mhGraph)root._mhGraph=buildGraph(root,true);
  const {s,a,b,u}=display(),stage=Math.round(p.stage??0),g=root._mhGraph,on=stage>=4,last=b.last;
  g.circles.forEach((circle,k)=>{
   const active=on&&Math.floor(k/2)===s.current;
   if(k%2===0)attr(circle,{fill:active?'#e5ecf8':'#fff'});
   else attr(circle,{stroke:active?C.prior:C.ink,'stroke-width':active?3:1.8});
  });
  g.links.forEach(link=>{
   const active=on&&last&&link.from===last.from&&link.to===last.to;
   attr(link.curve,{stroke:active?C.prior:link.color,'stroke-width':active?3:1.8});attr(link.head,{fill:active?C.prior:link.color,stroke:active?C.prior:link.color});
  });
  let xy=badge(s.current);
  if(last&&u<1){
   const link=g.links.find(x=>x.from===last.from&&x.to===last.to),start=link.curve.getPointAtLength(0),end=link.curve.getPointAtLength(link.length);
   const mix=(x,y,t)=>[x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t];
   if(u<.15)xy=mix(badge(a.current),[start.x,start.y],u/.15);
   else if(u>.85)xy=mix([end.x,end.y],badge(b.current),(u-.85)/.15);
   else{const point=link.curve.getPointAtLength(link.length*(u-.15)/.7);xy=[point.x,point.y];}
  }
  attr(g.token,{cx:xy[0],cy:xy[1],visibility:on?'visible':'hidden'});
  Object.assign(root.dataset,{stage:String(stage),steps:String(s.n),current:String(s.current),counts:JSON.stringify(s.counts)});
  if(!PRINT)controls(stage);
 }
 function renderFrequencies(root,p){
  const stage=Math.round(p.stage??0),{s}=display(),key=stage+':'+s.n;
  if(root._mhKey===key)return;const svg=mcSvg(root,610,140);root._mhKey=key;
  if(stage<4){root.dataset.normalizedVisible='false';return;}
  const target=MH_EXAMPLE_Q.map(q=>q/MH_EXAMPLE_Q.reduce((a,b)=>a+b,0)),x=175,w=260;
  mcMath(root,'legend','<span class="c-pred">□ Target</span> · <span class="c-like">■ Empirical frequency</span>',325,10,'c',C.ink,17);
  for(const t of [0,.5,1]){
   el(svg,'line',{x1:x+w*t,x2:x+w*t,y1:27,y2:117,stroke:C.grid});mcMath(root,'tick'+t,(100*t)+'%',x+w*t,131,'c',C.mle,15);
  }
  for(const i of [0,1]){
   const y=35+i*53;
   mcMath(root,'target'+i,`$p(${i?'B':'A'})=${target[i]*100}\\%$`,78,y+16,'c',C.pred,18);
   el(svg,'rect',{x,y,width:w*target[i],height:9,fill:C.pred,'fill-opacity':.06,stroke:C.pred,'stroke-width':1.5,'data-target':target[i]});
   el(svg,'rect',{x,y:y+14,width:w*s.frequencies[i],height:10,fill:C.like,'fill-opacity':.55,stroke:C.like,'stroke-width':1,'data-frequency':s.frequencies[i],'data-count':s.counts[i]});
   mcMath(root,'frequency'+i,`${s.counts[i].toLocaleString()} visits · ${(100*s.frequencies[i]).toFixed(1)}%`,525,y+19,'c',C.like,16);
  }
  const owner=root.closest('section'),history=owner.querySelector('.mh-example-history');
  history.innerHTML='<span>Visits:</span>'+(s.history.length?s.history.map(v=>`<span class="mh-visit ${v.repeat?'mh-repeat':''}" title="${v.repeat?'Repeated state, counted again':'Recorded state'}">${v.state?'B':'A'}</span>`).join(''):'<span class="mh-history-empty">No recorded states yet</span>');
  owner.querySelector('.mh-example-status').textContent=`Current: ${s.current?'B':'A'} · N = ${s.n.toLocaleString()} · Repeated states = ${s.repeats.toLocaleString()}`;
  Object.assign(root.dataset,{normalizedVisible:'true',steps:String(s.n),counts:JSON.stringify(s.counts),frequencies:JSON.stringify(s.frequencies),repeats:String(s.repeats)});
 }
 [['mhExampleProposal',300,220,renderProposal],['mhExampleChain',300,220,renderChain],['mhExampleFrequencies',610,140,renderFrequencies]].forEach(([name,w,h,render])=>{
  FIGS[name]={init(root){root.style.width=w+'px';root.style.height=h+'px';if(!PRINT)roots[name]=root;},render};
 });
 if(PRINT)return;
 function stage(){return Math.round(stateFor(roots.mhExampleChain).stage??0);}
 function controls(value=stage()){
  document.querySelectorAll('#mh-example [data-mh-example]').forEach(b=>b.disabled=value<4||(busy&&b.dataset.mhExample!=='reset'));
 }
 function draw(){for(const [name,root] of Object.entries(roots))FIGS[name].render(root,stateFor(root));controls();}
 function next(){
  if(busy||stage()<4||Reveal.getCurrentSlide()?.id!=='mh-example')return;
  before=chain.snapshot();after=chain.step();progress=0;busy=true;controls();
  const token=++generation,t0=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;
  function frame(now){
   if(token!==generation)return;const t=duration?Math.min(1,(now-t0)/duration):1;progress=t*t*(3-2*t);
   if(t===1){before=after;busy=false;}draw();if(t<1)raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
 }
 function reset(){++generation;cancelAnimationFrame(raf);busy=false;chain=mhExampleChain();before=after=chain.snapshot();progress=1;for(const r of Object.values(roots))r._mhKey=null;draw();}
 function finish(){++generation;cancelAnimationFrame(raf);progress=1;before=after;busy=false;draw();}
 document.addEventListener('click',event=>{
  const b=event.target.closest('#mh-example [data-mh-example]');if(!b||stage()<4)return;
  if(b.dataset.mhExample==='next')next();
  if(b.dataset.mhExample==='reset')reset();
  if(b.dataset.mhExample==='batch'&&!busy){after=chain.run(Number(b.dataset.count));before=after;progress=1;draw();}
  event.preventDefault();event.stopPropagation();
 });
 Reveal.on('ready',()=>{document.querySelector('#mh-example .mh-example-controls').addEventListener('keydown',e=>e.stopPropagation());draw();});
 Reveal.on('slidechanged',e=>{if(e.previousSlide?.id==='mh-example'&&busy)finish();});
 Reveal.on('fragmenthidden',()=>{if(Reveal.getCurrentSlide()?.id==='mh-example'&&stage()<4&&busy)finish();});
 globalThis.MH_EXAMPLE_DEMO={snapshot:()=>display().s,busy:()=>busy};
})();
