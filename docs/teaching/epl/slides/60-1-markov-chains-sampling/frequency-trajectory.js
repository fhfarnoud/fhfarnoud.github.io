/* One trajectory supplies every state, history chip, count, and empirical bar. */
const FREQUENCY_TARGET=mcStationary(MC_FIVE),FREQUENCY_CACHE=new Map();
function frequencySnapshot(n,seed=8){
 n=Math.max(1,Math.min(10000,Math.round(n)));
 if(!FREQUENCY_CACHE.has(seed)){
  const states=mcSimulate(MC_FIVE,10000,seed,2).states,counts=[[0,0,0,0,0]];
  states.forEach(x=>{const row=counts.at(-1).slice();row[x]++;counts.push(row);});
  FREQUENCY_CACHE.set(seed,{states,counts});
  if(FREQUENCY_CACHE.size>4)FREQUENCY_CACHE.delete(FREQUENCY_CACHE.keys().next().value);
 }
 const trace=FREQUENCY_CACHE.get(seed),counts=trace.counts[n].slice();
 return {n,seed,counts,freq:counts.map(c=>c/n),current:trace.states[n-1],previous:n>1?trace.states[n-2]:2,history:trace.states.slice(Math.max(0,n-20),n),first:Math.max(1,n-19)};
}
globalThis.FREQUENCY_MODELS={snapshot:frequencySnapshot,matrix:MC_FIVE,stationary:FREQUENCY_TARGET};
mcRegister('frequencies',1200,350,(root,svg,p)=>{
 const m=frequencySnapshot(p.n??10,p.seed??8),old=root._frequencySnapshot;
 svg.setAttribute('aria-label',`One Markov-chain trajectory with ${m.n} recorded visits. Current state ${m.current+1}. Counts ${m.counts.join(', ')}.`);
 [[150,'1. Run the chain'],[510,'2. Record visits'],[955,'3. Estimate probabilities']].forEach(([x,title],i)=>mcMath(root,'heading'+i,'<b>'+title+'</b>',x,18,'c','#463C7D',24));
 arrow(svg,318,163,362,163,'#463C7D',2,10);arrow(svg,662,163,705,163,'#463C7D',2,10);
 const pos=Array.from({length:5},(_,i)=>{const a=(-90+i*72)*Math.PI/180;return [.82*Math.cos(a),.82*Math.sin(a)];});
 const nodes=Object.fromEntries(pos.map(([x,y],i)=>['n'+i,{at:[x,-y],d:.44,tex:'$'+(i+1)+'$',fill:m.current===i?'#dcefdc':'#fff',color:m.current===i?C.like:'#777'}]));
 const edges=[];
 MC_FIVE.forEach((row,i)=>row.forEach((v,j)=>{
  if(!v)return;
  const recent=m.previous===i&&m.current===j,color=recent?C.like:'#b4b0bd',w=recent?2.7:1.1;
  edges.push(i===j?{a:'n'+i,loop:['left','right','right','left','left'][i],color,w}:{a:'n'+i,b:'n'+j,bend:MC_FIVE[j][i]?10:0,color,w});
 }));
 mcGraph(root,svg,{s:100,key:'frequency-chain',fs:22,headscale:.6,nodes,edges},150,165);
 const xy=[150+100*pos[m.current][0],165+100*pos[m.current][1]],ring=el(svg,'circle',{cx:xy[0],cy:xy[1],r:26,fill:'none',stroke:C.like,'stroke-width':2.7,'data-current-state':m.current+1});
 mcMath(root,'current',`Current state: <b>${m.current+1}</b>`,150,270,'c',C.like,22);
 mcMath(root,'links','Links between states: $1/5$',150,294,'c',C.mle,18);
 mcMath(root,'loops-label','Self-loops (states 1 to 5)',150,314,'c',C.mle,17);
 mcMath(root,'loops','$(1/5,4/5,1/5,2/5,3/5)$',150,335,'c',C.mle,18);
 mcMath(root,'initial','Start: $X_0=3$ (not counted)',510,58,'c',C.mle,19);
 m.history.forEach((state,i)=>{
  const x=382+(i%5)*50,y=85+Math.floor(i/5)*44,last=i===m.history.length-1;
  const chip=el(svg,'rect',{x,y,width:40,height:34,rx:4,fill:last?'#dcefdc':'#f7f6f9',stroke:last?C.like:'#c8c2d8','stroke-width':last?2:1,'data-visit':m.first+i,'data-state':state+1});
  mcMath(root,'visit'+i,'$'+(state+1)+'$',x+20,y+17,'c',last?C.like:C.ink,22);
  if(last)root._frequencyLastChip=chip;
 });
 mcMath(root,'history-window',m.n>20?'Latest 20 visits, in time order':m.n+' visits, in time order',510,280,'c',C.mle,19);
 mcMath(root,'visit-range',`Visits ${m.first.toLocaleString()} to ${m.n.toLocaleString()}`,510,307,'c',C.mle,19);
 mcMath(root,'recorded',`$N=${m.n.toLocaleString()}$ recorded visits`,510,336,'c',C.ink,22);
 const ymax=Math.max(.6,Math.ceil((Math.max(...m.freq,...FREQUENCY_TARGET)-1e-10)/.2)*.2),B=box2d(755,85,420,183,.5,5.5,0,ymax);
 mcMath(root,'legend','<span class="c-like">■ Empirical</span> · <span class="c-pred">□ Stationary</span>',1020,51,'c',C.ink,20);
 mcAxes(root,svg,B,[1,2,3,4,5],Array.from({length:Math.round(ymax/.2)+1},(_,i)=>Number((i*.2).toFixed(1))),'State','Probability');
 const g=new Scene(root,0,0,el(svg,'g'));g.begin();const plot=g.plot(B);
 const bars=plot.bars([1,2,3,4,5].map(j=>j-.15),m.freq,{width:.27,color:C.like,fo:.55});
 plot.bars([1,2,3,4,5].map(j=>j+.15),FREQUENCY_TARGET,{width:.27,color:C.pred,fo:.07,stroke:C.pred,'stroke-width':2});g.trim();
 bars.forEach((bar,j)=>{bar.dataset.count=m.counts[j];bar.dataset.frequency=m.freq[j];});
 [0,1,2,3,4].forEach(j=>mcMath(root,'frequency'+j,Number(m.freq[j].toFixed(3)).toString(),B.X(j+1-.15),B.Y(m.freq[j])-13,'c',C.like,17));
 mcMath(root,'target','Theoretical $\\boldsymbol\\sigma=(1/12,1/2,1/12,1/4,1/12)$',965,335,'c',C.pred,18);
 root.dataset.init=JSON.stringify({n:m.n,seed:m.seed});root.dataset.n=m.n;root.dataset.current=m.current+1;
 root.dataset.counts=JSON.stringify(m.counts);root.dataset.frequencies=JSON.stringify(m.freq);root.dataset.history=JSON.stringify(m.history.map(x=>x+1));
 if(!PRINT&&old&&old.n!==m.n&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  ring.style.transformBox='fill-box';ring.style.transformOrigin='center';ring.animate([{opacity:.25,transform:'scale(1.3)'},{opacity:1,transform:'scale(1)'}],{duration:300,easing:'ease-out'});
  root._frequencyLastChip.animate([{opacity:.25,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:250,easing:'ease-out'});
  bars.forEach((bar,j)=>{if(!m.freq[j])return;bar.style.transformBox='fill-box';bar.style.transformOrigin='center bottom';bar.animate([{transform:`scaleY(${old.freq[j]/m.freq[j]*ymax/old.ymax})`},{transform:'scaleY(1)'}],{duration:300,easing:'ease-out'});});
 }
 root._frequencySnapshot={...m,ymax};
 if(typeof syncSamplingControls==='function')syncSamplingControls(root,{n:m.n});
});
FIGS.frequencies.duration=1;
if(!PRINT){
 let frequencyTimer=null;
 const frequencyRoot=()=>document.querySelector('#frequencies .fig');
 function frequencyStop(){clearInterval(frequencyTimer);frequencyTimer=null;const b=document.querySelector('#frequencies [data-frequency-action="run"]');b.textContent='Run';b.setAttribute('aria-pressed','false');}
 function frequencyDraw(p){const root=frequencyRoot(),state=live.get(root)||{};cancelAnimationFrame(state.raf);FIGS.frequencies.render(root,p);state.p={...p};live.set(root,state);document.querySelectorAll('#frequencies [data-frequency-action]').forEach(b=>b.disabled=p.n>=10000);}
 function frequencyAdvance(){const p=JSON.parse(frequencyRoot().dataset.init);if(p.n>=10000){frequencyStop();return;}p.n++;frequencyDraw(p);if(p.n>=10000)frequencyStop();}
 document.addEventListener('click',event=>{
  const button=event.target.closest('#frequencies .frequency-controls button');if(!button)return;
  const p=JSON.parse(frequencyRoot().dataset.init),action=button.dataset.frequencyAction||button.dataset.action;
  if(action==='run'){
   if(frequencyTimer)frequencyStop();else if(p.n<10000){button.textContent='Pause';button.setAttribute('aria-pressed','true');frequencyTimer=setInterval(frequencyAdvance,350);}
  }else{
   frequencyStop();
   if(action==='count')p.n=Number(button.dataset.value);
   if(action==='rerun')p.seed++;
   if(action==='step')p.n=Math.min(10000,p.n+1);
   frequencyDraw(p);
  }
  event.preventDefault();event.stopImmediatePropagation();
 },true);
 Reveal.on('slidechanged',event=>{if(event.previousSlide?.id==='frequencies')frequencyStop();});
 Reveal.on('ready',()=>document.querySelector('#frequencies .frequency-controls').addEventListener('keydown',event=>event.stopPropagation()));
 globalThis.FREQUENCY_DEMO={running:()=>frequencyTimer!==null,snapshot:()=>{const p=JSON.parse(frequencyRoot().dataset.init);return frequencySnapshot(p.n,p.seed);}};
}
