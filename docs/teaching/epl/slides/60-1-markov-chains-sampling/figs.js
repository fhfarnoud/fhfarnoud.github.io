/* Mathematical figures on the course's existing FIGS / SVG engine.
   Every simulation is a deterministic function of (seed, number of steps).
   Controls redraw the same model used for print states. No external services. */
const MC_PATIENT = [[0.8, 0.2], [0.5, 0.5]];
const MC_FIVE = [[1,1,1,1,1],[0,4,0,1,0],[1,1,1,1,1],[1,1,1,2,0],[0,1,0,1,3]].map(r=>r.map(v=>v/5));
const MC_ACTIVITY = [[0.5,0.5,0],[0.25,0.25,0.5],[0,0.2,0.8]];
const MC_COLORS = [C.prior,C.postC,C.teal,C.pred,C.rose];
function mcMultiply(v,P) { return P[0].map((_,j)=>v.reduce((s,x,i)=>s+x*P[i][j],0)); }
function mcStationary(P) { let v=P.map(()=>1/P.length); for(let i=0;i<2000;i++)v=mcMultiply(v,P); return v; }
function mcDistribution(a,t) { let v=[a,1-a]; for(let k=0;k<Math.round(t);k++)v=mcMultiply(v,MC_PATIENT); return v; }
function mcSimulate(P,n,seed,start=0) {
  const rnd=mulberry32(seed), states=[], counts=P.map(()=>0); let x=start;
  for(let t=0;t<n;t++){let u=rnd(),sum=0,j=P.length-1;for(let k=0;k<P.length;k++){sum+=P[x][k];if(u<sum){j=k;break;}}x=j;states.push(x);counts[x]++;}
  return {states,counts,freq:counts.map(c=>c/n)};
}
function mcNormal(rnd){return Math.sqrt(-2*Math.log(Math.max(1e-14,rnd())))*Math.cos(2*Math.PI*rnd());}
function mcTarget(x){return Math.exp(-x*x/2);}
function mcMetropolis(n,seed=121) {
  const rnd=mulberry32(seed), history=[-2], moves=[]; let x=-2;
  for(let t=0;t<n;t++){
    const proposal=x+mcNormal(rnd),alpha=Math.min(1,mcTarget(proposal)/mcTarget(x)),u=rnd(),accepted=u<=alpha;
    moves.push({from:x,proposal,alpha,u,accepted,to:accepted?proposal:x});
    if(accepted)x=proposal;history.push(x);
  }
  return {history,moves};
}
function mcBeta(n,seed) {
  // Sum independent exponentials to obtain Gamma(3,1) and Gamma(2,1).
  const rnd=mulberry32(seed), out=[];
  for(let i=0;i<n;i++){let a=0,b=0;for(let j=0;j<3;j++)a-=Math.log(Math.max(1e-14,rnd()));for(let j=0;j<2;j++)b-=Math.log(Math.max(1e-14,rnd()));out.push(a/(a+b));}return out;
}
// Figures use the same Scene/Plot marks and KaTeX labels as the other decks.
function mcRejection(n,M,seed){
 const rnd=mulberry32(seed),points=[];let accepted=0;
 for(let i=0;i<n;i++){const x=Math.sqrt(rnd()),u=rnd(),alpha=x*(1-x)/(2*M),ok=u<=alpha;accepted+=ok?1:0;points.push({x,y:u*M*2*x,u,alpha,accepted:ok});}
 return {points,accepted,expected:1/(12*M)};
}
function mcSvg(root,w,h){root.replaceChildren();root.style.width=w+'px';root.style.height=h+'px';root._axisCount=0;return el(root,'svg',{width:w,height:h,viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':root.closest('section')?.querySelector('h2')?.textContent||'Mathematical figure'});}
function mcText(svg,s,x,y,color=C.ink,size=20,anchor='middle'){
 const e=el(svg,'text',{x,y,fill:color,'font-size':size,'text-anchor':anchor});e.textContent=s;return e;
}
function mcMath(root,key,tex,x,y,anchor='c',color=C.ink,size=22){
 label(root,key,tex,x,y,anchor,color);root.querySelector(`.lab[data-k="${key}"]`).style.fontSize=size+'px';
}
function mcLine(svg,points,color,w=STYLE.curve,dash=''){return el(svg,'path',{d:pathOf(points),fill:'none',stroke:color,'stroke-width':w,'stroke-dasharray':dash,'stroke-linejoin':'round'});}
function mcCurve(svg,d,color,w=2,head){el(svg,'path',{d,fill:'none',stroke:color,'stroke-width':w});if(head)arrow(svg,...head,color,w,9);}
function mcNode(svg,x,y,r,s,color=C.ink,fill='#fff'){el(svg,'circle',{cx:x,cy:y,r,fill,stroke:color,'stroke-width':2});mcMath(svg.parentElement,'node'+x+'-'+y,'$'+s+'$',x,y,'c',color,24);}
function mcAxes(root,svg,B,xt,yt,xname,yname){
 const prefix='axis'+root._axisCount++,g=new Scene(root,0,0,el(svg,'g')),original=g.label.bind(g);
 g.label=(key,...args)=>original(prefix+key,...args);
 g.begin();g.plot(B).axes({grid:false,ox:B.xlo,oy:B.ylo,xt:[...new Set(xt)],yt,names:['','']});g.trim();
 yt.filter(v=>v>B.ylo).forEach(v=>el(svg,'line',{x1:B.X(B.xlo),x2:B.X(B.xhi),y1:B.Y(v),y2:B.Y(v),stroke:C.grid}));
 mcMath(root,prefix+'x',xname,B.x0+B.W/2,B.y0+B.H+43,'c',STYLE.axisName,20);
 mcMath(root,prefix+'y',yname,B.x0,B.y0-24,'l',STYLE.axisName,20);
}
function mcDensity(svg,B,f,color=C.pred,n=150,dash=''){
 const g=new Scene(svg.parentElement,0,0,el(svg,'g'));g.begin();g.plot(B).curve(f,{color,w:STYLE.curve,dash});g.trim();
}
function mcHistogram(svg,B,values,bins,color=C.like){
 const counts=Array(bins).fill(0),dx=(B.xhi-B.xlo)/bins;
 values.forEach(x=>{const b=Math.floor((x-B.xlo)/dx);if(b>=0&&b<bins)counts[b]++;});
 const g=new Scene(svg.parentElement,0,0,el(svg,'g'));g.begin();g.plot(B).bars(counts.map((_,i)=>B.xlo+(i+.5)*dx),counts.map(c=>values.length?c/(values.length*dx):0),{width:dx*.91,color,fo:STYLE.fill,stroke:color,'stroke-width':1});g.trim();
}
function mcHistogramPeak(values,bins,lo,hi){
 if(!values.length)return 0;const counts=Array(bins).fill(0),dx=(hi-lo)/bins;values.forEach(x=>{const i=Math.floor((x-lo)/dx);if(i>=0&&i<bins)counts[i]++;});return Math.max(...counts)/(values.length*dx);
}
function mcRegister(name,w,h,render){FIGS[name]={init(root){root.style.width=w+'px';root.style.height=h+'px';},render(root,p){const svg=mcSvg(root,w,h);render(root,svg,p);},duration:450};}
function mcBars(svg,x,y,w,h,empirical,target,names){
 const root=svg.parentElement,B=box2d(x,y,w,h,.5,names.length+.5,0,1),g=new Scene(root,0,0,el(svg,'g'));
 mcAxes(root,svg,B,[],[0,.25,.5,.75,1],'State','Probability');
 g.begin();const P=g.plot(B);P.bars(names.map((_,i)=>i+1-.14),empirical,{width:.24,color:C.like,fo:.45});P.bars(names.map((_,i)=>i+1+.14),target,{width:.24,color:C.pred,fo:.12});g.trim();
 names.forEach((name,i)=>mcMath(root,'category'+i,name,B.X(i+1),B.Y(0)+22,'c',C.ink,20));
}
function mcGraph(root,svg,options,ox,oy){const g=new Scene(root,0,0,el(svg,'g'));g.begin();drawGraph(g,{fs:24,lw:1.8,R:n=>(n.d??.8)/2,...options},ox,oy);g.trim();}

mcRegister('chainBN',1000,145,(root,svg,p)=>{
 const names=['x_0','x_1','\\cdots','x_t','x_{t+1}'];
 const nodes=Object.fromEntries(names.map((name,i)=>['n'+i,{at:[i*1.9,0],d:.67,tex:'$'+name+'$',plain:i===2,fill:i===3&&p.observed?'#e1f0e2':'#fff'}]));
 mcGraph(root,svg,{s:100,key:'chain',nodes,edges:[0,1,2,3].map(i=>({a:'n'+i,b:'n'+(i+1)}))},110,60);
 mcMath(root,'given','Current state',680,126,'c',p.observed?C.like:C.ink,21);
});
mcRegister('patient',560,440,(root,svg,p)=>{
 const sel=Math.round(p.selected||0),col=i=>sel===i?MC_COLORS[i]:'#999';
 mcGraph(root,svg,{s:100,key:'patient',nodes:{a:{at:[0,0],d:.8,tex:'$1$',fill:sel===0?'#e5ecf8':'#fff'},b:{at:[2.6,0],d:.8,tex:'$2$',fill:sel===1?'#fff0ce':'#fff'}},edges:[
 {a:'a',b:'b',bend:32,lab:'$0.2$',pos:'above',gap:13,color:col(0),w:sel===0?2.8:1.6},
 {a:'b',b:'a',bend:32,lab:'$0.5$',pos:'below',gap:13,color:col(1),w:sel===1?2.8:1.6},
 {a:'a',loop:'left',lab:'$0.8$',pos:'left',gap:15,color:col(0)},
 {a:'b',loop:'right',lab:'$0.5$',pos:'right',gap:15,color:col(1)}]},150,110);
 mcMath(root,'state1','Remission',150,197,'c',C.prior,24);mcMath(root,'state2','Relapse',410,197,'c',C.postC,24);
 [150,410].forEach((x,i)=>el(svg,'circle',{cx:x,cy:110,r:43,fill:'transparent',class:'state-hit',tabindex:0,role:'button','aria-label':`Select ${i?'relapse':'remission'}`,'data-action':'select','data-value':i}));
 // Use the same labelled table convention as the weather chain in Graphical Models I.
 const table='<table class="transition-matrix"><thead><tr><th></th><th>1</th><th>2</th></tr></thead><tbody>'+MC_PATIENT.map((row,i)=>'<tr'+(sel===i?' class="selected row'+i+'"':'')+'><th>'+(i+1)+'</th>'+row.map(v=>'<td>'+v.toFixed(1)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 mcMath(root,'matrix-title','<b>Transition Matrix</b>',280,242,'c',C.ink,24);
 mcMath(root,'P','$P=$',150,333,'c',C.ink,27);mcMath(root,'matrix',table,320,333);
 mcMath(root,'axes','Rows: current state · Columns: next state',280,427,'c',C.mle,19);
 const explanation=root.closest('section').querySelector('.transition-explanation');
 if(explanation)explanation.textContent=sel===0?'If in remission, there is an 80% chance of remaining in remission, and a 20% chance of relapse.':'If in relapse, there is a 50% chance of remission, and a 50% chance of remaining in relapse.';
 if(typeof syncSamplingControls==='function')syncSamplingControls(root,p);
});
mcRegister('distributionStep',560,390,(root,svg,p)=>{
 const oldBars=root._distributionBars,m=distributionUpdate(root,p),B=box2d(65,100,425,195,.4,2.6,0,1);
 mcMath(root,'title',`State Distribution at Time $${m.t}$`,280,25,'c',C.ink,23);
 mcAxes(root,svg,B,[],[0,.25,.5,.75,1],'State','Probability');
 const g=new Scene(root,0,0,el(svg,'g'));g.begin();const P=g.plot(B),bars=[];
 [0,1].forEach(j=>{
  const [blue,amber]=m.contributions[j];
  bars.push(...P.bars([j+1],[blue],{width:.42,color:C.prior,fo:.5}));
  bars.push(...P.bars([j+1],[blue+amber],{width:.42,base:blue,color:C.postC,fo:.5}));
  mcMath(root,'total'+j,'$'+Number(m.probabilities[j].toFixed(3))+'$',B.X(j+1),B.Y(m.probabilities[j])-18,'c',C.ink,22);
  mcMath(root,'cat'+j,j?'Relapse':'Remission',B.X(j+1),B.Y(0)+22,'c',C.ink,20);
 });g.trim();
 mcMath(root,'current',`$\\boldsymbol\\pi_${m.t}=(${Number(m.probabilities[0].toFixed(3))},${Number(m.probabilities[1].toFixed(3))})$`,280,374,'c',C.ink,23);
 const newBars=bars.map(bar=>({y:Number(bar.getAttribute('y')),h:Number(bar.getAttribute('height'))}));
 if(!PRINT&&oldBars&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
  bars.forEach((bar,i)=>{if(newBars[i].h>0&&(oldBars[i].h!==newBars[i].h||oldBars[i].y!==newBars[i].y)){bar.style.transformBox='fill-box';bar.style.transformOrigin='0 0';bar.animate([{transform:`translateY(${oldBars[i].y-newBars[i].y}px) scaleY(${oldBars[i].h/newBars[i].h})`},{transform:'translateY(0) scaleY(1)'}],{duration:280,easing:'ease-out'});}});
 }
 root._distributionBars=newBars;
});
// Keep derivation stages discrete. Bar and equation transitions are handled locally.
FIGS.distributionStep.duration=1;
mcRegister('convergence',620,385,(root,svg,p)=>{
 const a=clamp(p.a??1),t=Math.max(0,Math.min(15,Math.round(p.t??2))),compare=Math.round(p.compare??0)===1,limitVisible=Math.round(p.limit??0)===1;
 const starts=compare?[1,0]:[a],vectors=starts.map(start=>mcDistribution(start,t)),B=box2d(65,52,475,215,0,15,0,1);
 // Exploration survives the conclusion reveal without making the limit visible early.
 const init=JSON.parse(root.dataset.init||'{}');Object.assign(init,{a,t,compare:Number(compare)});root.dataset.init=JSON.stringify(init);
 mcAxes(root,svg,B,[0,5,10,15],[0,.25,.5,.75,1],'$t$','State probability');
 if(limitVisible)[0,1].forEach(j=>{
  const color=MC_COLORS[j],limit=j===0?5/7:2/7;
  el(svg,'line',{x1:B.X(0),x2:B.X(15),y1:B.Y(limit),y2:B.Y(limit),stroke:color,'stroke-dasharray':STYLE.dash,'stroke-opacity':.5,'data-limit':j});
  mcMath(root,'limit'+j,j?'$2/7$':'$5/7$',B.X(15)+17,B.Y(limit),'l',color,20);
 });
 starts.forEach((start,i)=>{
  const dashed=compare&&i===1;
  [0,1].forEach(j=>{
   const color=MC_COLORS[j],curve=mcLine(svg,Array.from({length:t+1},(_,k)=>[B.X(k),B.Y(mcDistribution(start,k)[j])]),color,STYLE.curve,dashed?'10 6':'');
   curve.dataset.start=start;curve.dataset.state=j;
   for(let k=0;k<=t;k++)el(svg,'circle',{cx:B.X(k),cy:B.Y(mcDistribution(start,k)[j]),r:k===t?5:3,fill:dashed?'#fff':color,stroke:dashed?color:'#fff','stroke-width':dashed?1.8:1.2});
  });
  const y=compare?330+37*i:345,v=vectors[i];
  mcMath(root,'start'+i,compare?(dashed?'Dashed: start in relapse':'Solid: start in remission'):`$\\boldsymbol\\pi_0=(${a.toFixed(1)},${(1-a).toFixed(1)})$`,compare?160:170,y,'c',C.ink,compare?19:22);
  mcMath(root,'now'+i,`$\\boldsymbol\\pi_{${t}}=(${v[0].toFixed(4)},${v[1].toFixed(4)})$`,435,y,'c',C.ink,compare?20:22);
 });
 root.dataset.time=t;root.dataset.compare=Number(compare);root.dataset.limit=Number(limitVisible);root.dataset.probabilities=JSON.stringify(vectors);
 if(typeof syncSamplingControls==='function')syncSamplingControls(root,{...p,a,compare:Number(compare)});
});
FIGS.convergence.duration=1;
mcRegister('stationaryFlow',560,245,(root,svg)=>{
 const pi=[5/7,2/7],g=new Scene(root,0,0,el(svg,'g'));g.begin();
 [45,335].forEach((x,k)=>{
  const B=box2d(x,50,180,125,.4,2.6,0,1),P=g.plot(B);
  [0,1].forEach(j=>{P.bars([j+1],[pi[j]],{width:.48,color:MC_COLORS[j],fo:.5});mcMath(root,'st'+k+j,j?'$2/7$':'$5/7$',B.X(j+1),B.Y(pi[j])-18,'c',MC_COLORS[j]);mcMath(root,'sn'+k+j,j?'2':'1',B.X(j+1),B.Y(0)+22);});
  g.arrow([x,175],[x+190,175]);mcMath(root,'time'+k,k?'After one step':'Before',x+90,18);
 });g.trim();
 arrow(svg,242,110,316,110,C.axis,1.8);mcMath(root,'timesP','$\\times P$',280,80);
 mcMath(root,'same','$\\boldsymbol\\sigma P=\\boldsymbol\\sigma=(5/7,2/7)$',280,229);
});
// Long-run trajectory, visit history, and frequency plot are in frequency-trajectory.js.
mcRegister('balance',1200,275,(root,svg,p)=>{
 const shown=Math.round(p.stage??0)>0,previous=root._balanceShown;
 [[20,180,'Remission',C.prior,500,50],[860,1020,'Relapse',C.postC,200,20]].forEach(([x,cx,name,color,count,dots])=>{
  mcMath(root,'state'+count,'<b>'+name+'</b>',cx,18,'c',color,26);
  el(svg,'rect',{x,y:43,width:320,height:165,rx:8,fill:count===500?'#f3f6fc':'#fff9ef',stroke:color,'stroke-opacity':.45});
  mcMath(root,'population'+count,'<b>'+count+' patients</b>',cx,74,'c',color,31);
  for(let i=0;i<dots;i++){
   const leaving=shown&&i<10,cy=105+Math.floor(i/10)*16+(dots===20?24:0);
   el(svg,'circle',{cx:cx-99+(i%10)*22,cy,r:leaving?5.3:4.5,fill:color,'fill-opacity':shown?(leaving?1:.3):.6});
  }
 });
 if(shown){
  arrow(svg,367,111,833,111,C.prior,4.5,14);arrow(svg,833,177,367,177,C.postC,4.5,14);
  mcMath(root,'forward','$500\\times0.2=100$',600,81,'c',C.prior,28);
  mcMath(root,'backward','$200\\times0.5=100$',600,209,'c',C.postC,28);
  mcMath(root,'expected','Expected transitions in one step',600,145,'c',C.mle,20);
  mcMath(root,'after1','After: $400+100=500$',180,233,'c',C.prior,23);
  mcMath(root,'after2','After: $100+100=200$',1020,233,'c',C.postC,23);
  if(!PRINT&&!previous&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   [[367,111,466,C.prior],[833,177,-466,C.postC]].forEach(([x,y,dx,color])=>{
    for(let i=0;i<10;i++){
     const dot=el(svg,'circle',{cx:x,cy:y,r:4.5,fill:color,stroke:'#fff','stroke-width':1,opacity:0});
     dot.animate([{opacity:0,transform:'translateX(0)'},{opacity:1,offset:.1},{opacity:1,offset:.9},{opacity:0,transform:`translateX(${dx}px)`}],{duration:900,delay:i*55,easing:'ease-in-out'});
    }
   });
  }
 }
 mcMath(root,'dot-key','Each dot represents 10 patients. Transition counts are expectations.',600,265,'c',C.mle,18);
 root._balanceShown=shown;root.dataset.forward=100;root.dataset.backward=100;root.dataset.stage=Number(shown);
});
FIGS.balance.duration=1;
mcRegister('balanceTwoState',560,150,(root,svg)=>{
 mcGraph(root,svg,{s:90,key:'dbp-two-state',fs:22,lw:1.7,nodes:{a:{at:[0,0],d:.62,tex:'$1$',fill:'#f3f6fc',color:C.prior},b:{at:[2.6,0],d:.62,tex:'$2$',fill:'#fff9ef',color:C.postC}},edges:[
  {a:'a',b:'b',bend:30,lab:'$\\alpha$',pos:'above',gap:4,color:C.prior},
  {a:'b',b:'a',bend:30,lab:'$\\beta$',pos:'below',gap:4,color:C.postC},
  {a:'a',loop:'left',lab:'$1-\\alpha$',pos:'left',gap:10,color:C.prior},
  {a:'b',loop:'right',lab:'$1-\\beta$',pos:'right',gap:10,color:C.postC}]},160,75);
});

// Basic-method figures are registered in sampling-methods.js.
function mcSamplerFigure(root,svg,p,interactive){
 const n=Math.max(0,Math.round(p.n??0)),phase=Math.round(p.phase??0),run=mcMetropolis(n+1,p.seed??121),history=run.history.slice(0,n+1),move=run.moves[n],last=run.moves[n-1];
 // Expand the actual axes if a visited or proposed state lies outside the usual range.
 const lo=Math.min(-4,Math.floor(Math.min(...history,phase?move.proposal:0))),hi=Math.max(4,Math.ceil(Math.max(...history,phase?move.proposal:0)));
 const ymax=Math.max(.6,n>=10?Math.ceil(mcHistogramPeak(history.slice(1),24,lo,hi)*5)/5:0),B=box2d(65,55,490,140,lo,hi,0,ymax),normal=x=>phi(x,0,1);
 mcAxes(root,svg,B,[lo,0,hi],[0,ymax/2,ymax],'$x$','Density');if(n>=10)mcHistogram(svg,B,history.slice(1),24);mcDensity(svg,B,normal,C.pred);
 mcMath(root,'target','<span class="c-pred">Target $p(x)$</span>'+(!interactive?' · <span class="c-like">Sample histogram</span>':''),365,22,'c',C.ink,20);
 const current=history.at(-1),xp=B.X(current),yp=B.Y(normal(current));
 el(svg,'line',{x1:xp,x2:xp,y1:B.Y(0),y2:yp,stroke:C.prior,'stroke-width':2,'stroke-dasharray':'4 4'});
 el(svg,'circle',{cx:xp,cy:yp,r:STYLE.dot,fill:C.prior,stroke:'#fff','stroke-width':1.5,'data-current-dot':'1'});
 if(interactive&&phase>0){
  const proposed=B.X(move.proposal);el(svg,'circle',{cx:proposed,cy:B.Y(normal(move.proposal)),r:STYLE.dot,fill:phase===1?C.postC:move.accepted?C.like:C.post,stroke:'#fff','stroke-width':1.5});
  arrow(svg,xp,175,proposed,175,C.postC,2,9);
 }
 let text;
 if(interactive){
  text=`$x=${current.toFixed(3)}$ · ${n} recorded states`;
  if(phase===1)text=`Propose $x'=${move.proposal.toFixed(3)}$ · $\\alpha=${move.alpha.toFixed(3)}$`;
  if(phase===2)text=`$u=${move.u.toFixed(3)} ${move.accepted?'\\le':'>'} \\alpha=${move.alpha.toFixed(3)}$: <b>${move.accepted?'ACCEPT':'REJECT'}</b>`;
  if(phase===0&&last)text+=last.accepted?' · accepted':' · repeated after rejection';
 }else text=`$N=${n}$ · Sample mean: $${(history.slice(1).reduce((a,b)=>a+b,0)/n).toFixed(3)}$ · Target mean: $0$`;
 mcMath(root,'status',text,310,262,'c',phase===2?(move.accepted?C.like:C.post):C.ink,20);
 const T=box2d(65,325,490,78,0,Math.max(10,n),lo,hi);mcAxes(root,svg,T,[0,Math.max(10,n)],[lo,0,hi],'Recorded transitions $t$','Chain state $x_t$');
 const pts=[];history.forEach((x,i)=>{if(i)pts.push([T.X(i),T.Y(history[i-1])]);pts.push([T.X(i),T.Y(x)]);});mcLine(svg,pts,C.prior,1.8);
 if(n<50)history.forEach((x,i)=>el(svg,'circle',{cx:T.X(i),cy:T.Y(x),r:2.7,fill:C.prior}));
 el(svg,'circle',{cx:T.X(n),cy:T.Y(current),r:4,fill:C.prior});
 root.dataset.steps=n;root.dataset.current=String(current);root.dataset.phase=phase;root.dataset.nextAlpha=String(move.alpha);root.dataset.nextAccepted=String(move.accepted);
}
// The introductory finite-state MCMC demonstration is in mcmc-six-state.js.
// The continuous-state Metropolis demonstration is in metropolis-demo.js.

function mcTransitionDensity(x,xp){
 return Math.abs(xp-x)<=1?.5*Math.min(1,Math.exp((x*x-xp*xp)/2)):0;
}
function mcTransitionComparison(direction){
 const lower=Math.round(direction)===1,from=lower?1.2:2,to=lower?2:1.2;
 const ratio=Math.exp((from*from-to*to)/2),alpha=Math.min(1,ratio),jump=.5;
 return {from,to,ratio,alpha,jump,density:mcTransitionDensity(from,to)};
}
globalThis.TRANSITION_MODELS={comparison:mcTransitionComparison,density:mcTransitionDensity};
mcRegister('acceptance',600,445,(root,svg,p)=>{
 const direction=root._transitionDirection??p.direction??0,m=mcTransitionComparison(direction),stage=Math.round(p.stage??0),final=stage>=2;
 const B=box2d(50,115,520,165,-3,3.5,0,.6),normal=x=>Math.exp(-x*x/2)/Math.sqrt(2*Math.PI);
 mcMath(root,'heading',`${m.alpha===1?'Higher':'Lower'} target density: $${m.from}\\to ${m.to}$`,300,16,'c','#463C7D',24);
 mcMath(root,'legend','<span class="c-pred">━ Target $p$</span> · <span class="c-postC">□ Jump $J$</span>'+(final?' · <span class="c-like">━ Transition density $P$</span>':''),300,50,'c',C.ink,18);
 mcMath(root,'current',`<span class="c-prior">● Current $x=${m.from}$</span>`,165,79,'c',C.prior,19);
 mcMath(root,'proposed',`<span class="c-postC">◆ Proposed $x'=${m.to}$</span>`,430,79,'c',C.postC,19);
 mcAxes(root,svg,B,[-3,-2,-1,0,1,2,3],[0,.2,.4,.6],"Possible next state $x'$",'Density');
 const left=B.X(m.from-1),right=B.X(m.from+1);
 el(svg,'rect',{x:left,y:B.Y(.5),width:right-left,height:B.Y(0)-B.Y(.5),fill:C.postC,'fill-opacity':.09,stroke:C.postC,'stroke-width':1.8,'data-jump-left':m.from-1,'data-jump-right':m.from+1});
 if(final){
  const pts=[[B.X(B.xlo),B.Y(0)],[left,B.Y(0)]];
  for(let i=0;i<=100;i++){const xp=m.from-1+2*i/100;pts.push([B.X(xp),B.Y(mcTransitionDensity(m.from,xp))]);}
  pts.push([right,B.Y(0)],[B.X(B.xhi),B.Y(0)]);mcLine(svg,pts,C.like,3);
  el(svg,'circle',{cx:B.X(m.to),cy:B.Y(m.density),r:5.5,fill:C.like,stroke:'#fff','stroke-width':1.5,'data-transition-density':m.density});
 }
 mcDensity(svg,B,normal,C.pred);
 for(const [x,color] of [[m.from,C.prior],[m.to,C.postC]]){
  el(svg,'line',{x1:B.X(x),x2:B.X(x),y1:B.Y(0),y2:B.Y(normal(x)),stroke:color,'stroke-width':1.7,'stroke-dasharray':'4 4'});
 }
 el(svg,'circle',{cx:B.X(m.from),cy:B.Y(normal(m.from)),r:5.5,fill:C.prior,stroke:'#fff','stroke-width':1.5});
 el(svg,'path',{d:`M${B.X(m.to)},${B.Y(normal(m.to))-6}l6,6l-6,6l-6,-6Z`,fill:C.postC,stroke:'#fff','stroke-width':1.3});
 mcMath(root,'ratio',`$q(x')/q(x)=${m.ratio.toFixed(3)}$`,300,352,'c',C.ink,22);
 if(final){
  for(const [key,x,caption,tex,color] of [
   ['jump',110,'Jump density $J$','$0.500$',C.postC],
   ['alpha',300,'Acceptance $\\alpha$',`$${m.alpha.toFixed(3)}$`,m.alpha===1?C.like:C.postC],
   ['transition',490,'Transition density $P$',`$${m.density.toFixed(3)}$`,C.like]
  ]){mcMath(root,key+'-caption',caption,x,391,'c',C.mle,18);mcMath(root,key,tex,x,425,'c',color,26);}
  mcMath(root,'times','$\\times$',207,425,'c',C.ink,22);mcMath(root,'equals','$=$',395,425,'c',C.ink,22);
 }else mcMath(root,'alpha',`Acceptance probability: $\\alpha=${m.alpha.toFixed(3)}$`,300,411,'c',m.alpha===1?C.like:C.postC,25);
 root.closest('section').querySelectorAll('[data-transition-direction]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.transitionDirection)===Math.round(direction))));
 Object.assign(root.dataset,{direction:String(Math.round(direction)),stage:String(stage),from:String(m.from),to:String(m.to),ratio:String(m.ratio),alpha:String(m.alpha),jump:String(m.jump),density:String(m.density)});
});
if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const b=event.target.closest('#acceptance [data-transition-direction]');if(!b)return;
 const root=b.closest('section').querySelector('[data-fig=acceptance]'),p=stateFor(root),st=live.get(root)||{};
 cancelAnimationFrame(st.raf);root._transitionDirection=Number(b.dataset.transitionDirection);p.direction=root._transitionDirection;
 FIGS.acceptance.render(root,p);st.p=p;live.set(root,st);event.preventDefault();event.stopPropagation();
});
mcRegister('metropolisFlow',600,150,(root,svg)=>{
  mcNode(svg,55,76,27,'x',C.prior);mcNode(svg,545,76,27,"x'",C.postC);
  arrow(svg,93,59,507,59,C.prior,3.2,12);arrow(svg,507,93,93,93,C.postC,3.2,12);
  mcMath(root,'f',"$p(x)J(x'\\mid x)\\alpha(x,x')$",300,24,'c',C.prior,21);
  mcMath(root,'r',"$p(x')J(x\\mid x')\\alpha(x',x)$",300,130,'c',C.postC,21);
});

mcRegister('asymmetric',550,255,(root,svg)=>{
 mcGraph(root,svg,{s:100,key:'asym',nodes:{a:{at:[0,0],d:.75,tex:'$A$'},b:{at:[2.3,0],d:.75,tex:'$B$'}},edges:[
 {a:'a',b:'b',bend:30,lab:'$0.8$',pos:'above',gap:15,w:4,color:C.prior},
 {a:'b',b:'a',bend:30,lab:'$0.2$',pos:'below',gap:15,w:1.8,color:C.postC},
 {a:'a',loop:'left',lab:'$0.2$',pos:'left',gap:13},
 {a:'b',loop:'right',lab:'$0.8$',pos:'right',gap:13}]},155,110);
 mcMath(root,'proposal','Proposal probabilities $J$',275,235,'c',C.ink,21);
});
mcRegister('activityProposal',1080,230,(root,svg)=>{
 const nodes={a:{at:[0,0],d:.74,tex:'$A$'},b:{at:[3.4,0],d:.74,tex:'$B$'},c:{at:[6.8,0],d:.74,tex:'$C$'}};
 const edges=[['a','b'],['b','a'],['b','c'],['c','b']].map(([a,b])=>({a,b,bend:20,lab:'$1/2$',pos:a<b?'above':'below',gap:14}));
 edges.push({a:'a',loop:'left',lab:'$1/2$',pos:'left',gap:15},{a:'c',loop:'right',lab:'$1/2$',pos:'right',gap:15});
 mcGraph(root,svg,{s:100,key:'activity',nodes,edges},190,100);
 ['A','B','C'].forEach((name,i)=>mcMath(root,'q'+i,'$q('+name+')='+[1,2,5][i]+'$',190+i*340,210,'c',MC_COLORS[i],25));
});
mcRegister('activityFrequency',560,310,(root,svg,p)=>{
 const n=Math.max(1,Math.round(p.n)),run=mcSimulate(MC_ACTIVITY,n,p.seed??51),target=[1/8,2/8,5/8];
 mcMath(root,'legend','<span class="c-like">Empirical</span> · <span class="c-pred">Target</span>',300,23,'c',C.ink,20);
 mcBars(svg,60,70,440,165,run.freq,target,['$A$','$B$','$C$']);mcMath(root,'n',`$N=${n.toLocaleString()}$ transitions`,300,306,'c',C.ink,21);
});
// Pure models are exported for a small numerical check without a browser.
globalThis.SAMPLING_MODELS={patient:MC_PATIENT,five:MC_FIVE,activity:MC_ACTIVITY,multiply:mcMultiply,stationary:mcStationary,simulate:mcSimulate,metropolis:mcMetropolis,beta:mcBeta,rejection:mcRejection};
