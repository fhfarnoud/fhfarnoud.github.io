/* Three real Markov chains. Course SVG primitives and seeded probabilities.
   This file only owns the Markov Chains in Practice slide. */
const PRACTICE_LINKS=[[1,3],[2,4],[1,5],[0,4,6],[1,5,7],[2,4,8],[3,7],[4,8],[4,7]];
const PRACTICE_POS=[[80,65],[275,60],[505,75],[65,190],[285,190],[515,210],[90,315],[290,315],[510,325]];
const PRACTICE_DNA_POS=[[75,35],[255,35],[75,130],[255,130]];
const PRACTICE_LETTERS=['A','C','G','T'];
function practiceProbabilities(){return PRACTICE_LINKS.map(row=>Array.from({length:9},(_,j)=>.15/9+(row.includes(j)?.85/row.length:0)));}
function practiceNeighbors([x,y]){return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b])=>a>=0&&a<5&&b>=0&&b<5);}
function practiceChain(seed=171126){
 const surfer=mulberry32(seed),walk=mulberry32(seed+1),dna=mulberry32(seed+2);
 let n=0,page=0,particle=[2,2],nucleotide=0,counts=[1,0,0,0,0,0,0,0,0],trail=[[2,2]],last=null;
 const snapshot=()=>({n,page,particle:particle.slice(),nucleotide,counts:counts.slice(),trail:trail.map(p=>p.slice()),last});
 return {snapshot,step(){
  const from=page,oldParticle=particle.slice(),oldNucleotide=nucleotide,jump=surfer()>=.85;
  page=jump?Math.floor(surfer()*9):PRACTICE_LINKS[from][Math.floor(surfer()*PRACTICE_LINKS[from].length)];
  counts[page]++;n++;
  const neighbors=practiceNeighbors(particle);particle=neighbors[Math.floor(walk()*neighbors.length)];trail.push(particle.slice());trail=trail.slice(-12);
  if(dna()>=.8){const other=[0,1,2,3].filter(i=>i!==nucleotide);nucleotide=other[Math.floor(dna()*3)];}
  last={from,to:page,jump,oldParticle,oldNucleotide};return snapshot();
 }};
}
const PRACTICE_MODELS={links:PRACTICE_LINKS,probabilities:practiceProbabilities,neighbors:practiceNeighbors,create:practiceChain};
globalThis.PRACTICE_MODELS=PRACTICE_MODELS;

(function(){
 const roots={},modelState={chain:practiceChain(),running:false,busy:false,raf:0,generation:0};
 let before=modelState.chain.snapshot(),after=before,progress=1,printView=null;
 const mix=(a,b,t)=>a+(b-a)*t;
 const text=(svg,value,x,y,size=20,color=C.ink,anchor='middle')=>{
  const e=el(svg,'text',{x,y,'font-size':size,fill:color,'text-anchor':anchor});e.textContent=value;return e;
 };
 const point=(a,b,t)=>[mix(a[0],b[0],t),mix(a[1],b[1],t)];
 function geometry(a,b,rx=39,ry=29,bend=16){
  const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1,t=Math.min(rx/(Math.abs(dx)||1e-9),ry/(Math.abs(dy)||1e-9));
  return {start:[a[0]+dx*t,a[1]+dy*t],end:[b[0]-dx*t,b[1]-dy*t],control:[(a[0]+b[0])/2-dy/L*bend,(a[1]+b[1])/2+dx/L*bend]};
 }
 function curvePoint(g,t){const u=1-t;return [u*u*g.start[0]+2*u*t*g.control[0]+t*t*g.end[0],u*u*g.start[1]+2*u*t*g.control[1]+t*t*g.end[1]];}
 function curveD(g){return `M${g.start}Q${g.control} ${g.end}`;}
 function connection(svg,a,b,color=C.axis,width=1.4,rx=39,ry=29,bend=16){
  const g=geometry(a,b,rx,ry,bend);
  const line=el(svg,'path',{d:curveD(g),fill:'none',stroke:color,'stroke-width':width});
  const head=el(svg,'path',{d:arrowHeadD(...g.control,...g.end,7),fill:color});return {g,line,head};
 }
 function movePosition(g,t,start,end){
  // Move from the page's visitor badge to its link, follow the link curve,
  // then settle onto the next page's badge.
  if(t<.15)return point(start,g.start,t/.15);
  if(t>.85)return point(g.end,end,(t-.85)/.15);
  return curvePoint(g,(t-.15)/.7);
 }
 function rootSvg(root,w,h){root.style.width=w+'px';root.style.height=h+'px';root.replaceChildren();return el(root,'svg',{width:w,height:h,viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':root.dataset.fig==='practicePages'?'Nine webpages and random-surfer visit counts':root.dataset.fig==='practiceWalk'?'Random walk on a five by five grid':'Four-state DNA mutation chain'});}
 function initPages(root){
  const svg=rootSvg(root,820,390),edges=[];
  PRACTICE_LINKS.forEach((row,i)=>row.forEach(j=>edges.push({from:i,to:j,...connection(svg,PRACTICE_POS[i],PRACTICE_POS[j],'#b4afc4')})));
  const jump=el(svg,'path',{fill:'none',stroke:C.pred,'stroke-width':2.7,'stroke-dasharray':STYLE.dash,visibility:'hidden'});
  const cards=PRACTICE_POS.map(([x,y],i)=>{
   const rect=el(svg,'rect',{x:x-36,y:y-26,width:72,height:52,rx:5,fill:'#fff',stroke:'#463C7D','stroke-width':1.6});
   el(svg,'line',{x1:x-35,y1:y-13,x2:x+35,y2:y-13,stroke:'#d5d1df'});
   [-24,-16,-8].forEach(dx=>el(svg,'circle',{cx:x+dx,cy:y-20,r:1.8,fill:'#a8a1ba'}));
   text(svg,String.fromCharCode(65+i),x,y+12,24);return rect;
  });
  el(svg,'line',{x1:605,x2:605,y1:4,y2:355,stroke:'#dedbe6'});
  text(svg,'Visits',708,23,23);const counts=[],bars=[];
  for(let i=0;i<9;i++){
   const y=58+i*33;text(svg,String.fromCharCode(65+i),631,y,20);
   bars.push(el(svg,'rect',{x:653,y:y-12,width:0,height:14,rx:2,fill:C.like,'fill-opacity':.4}));
   counts.push(text(svg,'0',800,y,21,C.ink,'end'));
  }
  const total=text(svg,'Step 0 · 1 visit',710,373,18,C.mle);
  const token=el(svg,'circle',{cx:106,cy:44,r:8,fill:C.postC,stroke:'#fff','stroke-width':2});
  root._practice={svg,cards,edges,jump,counts,bars,total,token};
 }
 function initWalk(root){
  const svg=rootSvg(root,330,160),X=x=>103+x*31,Y=y=>16+y*31;
  for(let i=0;i<5;i++){
   el(svg,'line',{x1:X(i),x2:X(i),y1:Y(0),y2:Y(4),stroke:'#dfdce8','stroke-width':1.5});
   el(svg,'line',{x1:X(0),x2:X(4),y1:Y(i),y2:Y(i),stroke:'#dfdce8','stroke-width':1.5});
  }
  for(let x=0;x<5;x++)for(let y=0;y<5;y++)el(svg,'circle',{cx:X(x),cy:Y(y),r:2.5,fill:'#aaa3bd'});
  const trail=el(svg,'path',{fill:'none',stroke:C.prior,'stroke-width':2.3,'stroke-opacity':.55});
  const token=el(svg,'circle',{r:7,fill:C.postC,stroke:'#fff','stroke-width':1.5});
  root._practice={svg,trail,token,X,Y};
 }
 function initDNA(root){
  const svg=rootSvg(root,330,165),edges=[];
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(i!==j)edges.push({from:i,to:j,...connection(svg,PRACTICE_DNA_POS[i],PRACTICE_DNA_POS[j],'#c9c4d4',1.1,25,25,12)});
  const nodes=PRACTICE_DNA_POS.map(([x,y],i)=>{
   const circle=el(svg,'circle',{cx:x,cy:y,r:23,fill:'#fff',stroke:'#463C7D','stroke-width':1.6});text(svg,PRACTICE_LETTERS[i],x,y+8,25);return circle;
  });
  const ring=el(svg,'circle',{r:28,fill:'none',stroke:C.postC,'stroke-width':2.5});
  const token=el(svg,'circle',{r:6,fill:C.postC,stroke:'#fff','stroke-width':1.5,visibility:'hidden'});
  root._practice={svg,nodes,edges,ring,token};
 }
 function displayed(){
  if(PRINT){if(!printView){const c=practiceChain();for(let i=0;i<200;i++)c.step();printView=c.snapshot();}return {a:printView,b:printView,u:1};}
  return {a:before,b:after,u:progress};
 }
 function renderPages(root){
  const {a,b,u}=displayed(),g=root._practice,s=u<1?a:b,last=b.last;
  g.cards.forEach((card,i)=>attr(card,{fill:i===s.page?'#fff0ce':'#fff','stroke-width':i===s.page?2.7:1.6}));
  g.edges.forEach(e=>{const selected=last&&!last.jump&&e.from===last.from&&e.to===last.to;attr(e.line,{stroke:selected?C.prior:'#b4afc4','stroke-width':selected?2.7:1.4});attr(e.head,{fill:selected?C.prior:'#b4afc4'});});
  const badge=i=>[PRACTICE_POS[i][0]+26,PRACTICE_POS[i][1]-21];let xy=badge(b.page);
  g.jump.setAttribute('visibility','hidden');
  if(last&&u<1){
   if(last.from!==last.to){const geom=geometry(PRACTICE_POS[last.from],PRACTICE_POS[last.to]);xy=movePosition(geom,u,badge(last.from),badge(last.to));if(last.jump)attr(g.jump,{d:curveD(geom),visibility:'visible'});}
   else xy=badge(last.from);
  }
  attr(g.token,{cx:xy[0],cy:xy[1]});
  const maximum=Math.max(1,...s.counts);s.counts.forEach((v,i)=>{g.counts[i].textContent=v;attr(g.bars[i],{width:102*v/maximum});});
  g.total.textContent=`Step ${s.n} · ${s.n+1} ${s.n?'visits':'visit'}`;
  root.dataset.steps=s.n;root.dataset.visits=s.counts.join(',');root.dataset.page=String.fromCharCode(65+s.page);
 }
 function renderWalk(root){
  const {a,b,u}=displayed(),g=root._practice,trail=(u<1?a:b).trail;
  g.trail.setAttribute('d',pathOf(trail.map(([x,y])=>[g.X(x),g.Y(y)])));
  const xy=point(a.particle,b.particle,u);attr(g.token,{cx:g.X(xy[0]),cy:g.Y(xy[1])});
 }
 function renderDNA(root){
  const {a,b,u}=displayed(),g=root._practice,from=a.nucleotide,to=b.nucleotide,index=u<1?from:to;
  g.nodes.forEach((node,i)=>attr(node,{fill:i===index?'#fff0ce':'#fff'}));
  const [x,y]=PRACTICE_DNA_POS[index];attr(g.ring,{cx:x,cy:y,r:28+(from===to&&u<1?3*Math.sin(u*Math.PI):0)});
  g.edges.forEach(e=>{const on=from!==to&&e.from===from&&e.to===to;attr(e.line,{stroke:on?C.postC:'#c9c4d4','stroke-width':on?2.5:1.1});attr(e.head,{fill:on?C.postC:'#c9c4d4'});});
  if(from!==to&&u<1){const e=g.edges.find(e=>e.from===from&&e.to===to),p=curvePoint(e.g,u);attr(g.token,{cx:p[0],cy:p[1],visibility:'visible'});}else g.token.setAttribute('visibility','hidden');
 }
 [['practicePages',820,390,initPages,renderPages],['practiceWalk',330,160,initWalk,renderWalk],['practiceDNA',330,165,initDNA,renderDNA]].forEach(([name,w,h,init,render])=>{
  FIGS[name]={init(root){init(root);if(!PRINT)roots[name]=root;},render};
 });
 function draw(){Object.entries(roots).forEach(([name,root])=>FIGS[name].render(root));}
 const section=()=>document.getElementById('markov-practice');
 function controls(){
  const s=section();if(!s)return;
  s.querySelector('[data-practice="next"]').disabled=modelState.busy||modelState.running;
  const run=s.querySelector('[data-practice="run"]');run.textContent=modelState.running?'Pause':'Run';run.setAttribute('aria-pressed',String(modelState.running));
 }
 function status(){
  const last=after.last;
  section().querySelector('.practice-status').textContent=last?`${last.jump?'Jump':'Follow link'}: ${String.fromCharCode(65+last.from)} → ${String.fromCharCode(65+last.to)}`:'Start at page A';
 }
 function next(){
  if(modelState.busy||Reveal.getCurrentSlide()?.id!=='markov-practice')return;
  before=modelState.chain.snapshot();after=modelState.chain.step();progress=0;modelState.busy=true;controls();
  const token=++modelState.generation,t0=performance.now(),duration=matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;
  const frame=now=>{
   if(token!==modelState.generation)return;
   const t=duration?Math.min(1,(now-t0)/duration):1;progress=t*t*(3-2*t);draw();
   if(t<1)modelState.raf=requestAnimationFrame(frame);
   else{modelState.busy=false;before=after;status();controls();if(modelState.running)modelState.raf=requestAnimationFrame(next);}
  };
  modelState.raf=requestAnimationFrame(frame);
 }
 function reset(){
  ++modelState.generation;cancelAnimationFrame(modelState.raf);modelState.chain=practiceChain();modelState.running=false;modelState.busy=false;before=modelState.chain.snapshot();after=before;progress=1;draw();status();controls();
 }
 if(!PRINT){
  Reveal.on('ready',()=>section().querySelector('.practice-controls').addEventListener('keydown',event=>event.stopPropagation()));
  document.addEventListener('click',event=>{
   const button=event.target.closest('#markov-practice [data-practice]');if(!button)return;
   const action=button.dataset.practice;
   if(action==='next')next();
   if(action==='run'){modelState.running=!modelState.running;controls();if(modelState.running&&!modelState.busy)next();}
   if(action==='reset')reset();
   event.preventDefault();event.stopPropagation();
  });
  Reveal.on('slidechanged',event=>{
   if(event.previousSlide?.id==='markov-practice'){
    modelState.running=false;++modelState.generation;cancelAnimationFrame(modelState.raf);modelState.busy=false;progress=1;before=after;draw();controls();
   }
  });
 }
 globalThis.PRACTICE_DEMO={snapshot:()=>modelState.chain.snapshot(),running:()=>modelState.running,busy:()=>modelState.busy};
})();
