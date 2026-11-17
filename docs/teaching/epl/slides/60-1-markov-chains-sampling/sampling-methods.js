/* Basic sampling methods use the notes' unnormalized shapes q and g.
   Their normalized densities are p=q/Zq and r=g/Zg. */
function basicGrid(m,d=2){
 m=Math.max(4,Math.round(m));d=Math.max(1,Math.round(d));
 const nodes=Array.from({length:m},(_,i)=>(i+.5)/m),q=x=>x*x*(1-x);
 const denominator=nodes.reduce((s,x)=>s+q(x),0),numerator=nodes.reduce((s,x)=>s+x*q(x),0);
 return {m,d,nodes,numerator,denominator,estimate:numerator/denominator,cost:(BigInt(m)**BigInt(d)).toString()};
}
function basicRejection(n,M=.25,seed=45){
 // mcRejection uses normalized shape 2 theta. Halving its constant gives M theta.
 const run=mcRejection(Math.max(0,Math.round(n)),M/2,seed);
 return {...run,samples:run.points.filter(p=>p.accepted).map(p=>p.x),Zq:1/12,Zg:1/2};
}
function basicImportance(n,seed=16){
 const rnd=mulberry32(seed),draws=[];let numerator=0,denominator=0,unweighted=0;
 for(let i=0;i<n;i++){const u=rnd(),theta=Math.sqrt(u),w=theta*(1-theta),h=theta;draws.push({u,theta,x:theta,w,h});numerator+=w*h;denominator+=w;unweighted+=h;}
 return {draws,numerator,denominator,estimate:numerator/denominator,unweighted:unweighted/n};
}
globalThis.BASIC_SAMPLING_MODELS={grid:basicGrid,inverse:u=>Math.sqrt(u),cdf:x=>x*x,rejection:basicRejection,importance:basicImportance};

mcRegister('monteCarlo',620,355,(root,svg,p)=>{
 const n=Math.max(10,Math.round(p.n??20)),seed=p.seed??14,data=mcBeta(n,seed),ymax=Math.max(2.5,Math.ceil(mcHistogramPeak(data,20,0,1)*2)/2);
 const B=box2d(65,48,490,125,0,1,0,ymax);
 mcAxes(root,svg,B,[0,.5,1],[0,ymax/2,ymax],'','Density');mcHistogram(svg,B,data,20);mcDensity(svg,B,x=>12*x*x*(1-x));
 mcMath(root,'theta-axis','$\\theta$',580,198,'c',C.ink,21);
 mcMath(root,'density-legend','<span class="c-pred">Target</span> · <span class="c-like">Sample histogram</span>',365,20,'c',C.ink,19);
 let sum=0;const means=data.map((x,i)=>{sum+=x;return [i+1,sum/(i+1)];});
 mcMath(root,'estimate',`Mean: $${(sum/n).toFixed(4)}$ · Exact: $0.6$`,310,226,'c',C.ink,21);
 const T=box2d(65,246,490,51,1,n,0,1);mcAxes(root,svg,T,[1,n],[0,.5,1],'Samples $N$','');
 el(svg,'line',{x1:T.X(1),x2:T.X(n),y1:T.Y(.6),y2:T.Y(.6),stroke:C.pred,'stroke-dasharray':STYLE.dash,'stroke-width':2});
 mcLine(svg,means.map(([x,y])=>[T.X(x),T.Y(y)]),C.like,2.5);
 el(svg,'circle',{cx:T.X(n),cy:T.Y(sum/n),r:5,fill:C.like,stroke:'#fff','stroke-width':1.5});
 root.dataset.mean=sum/n;root.dataset.init=JSON.stringify({n,seed});
});

mcRegister('gridIntegration',680,345,(root,svg,p)=>{
 const m=basicGrid(p.m??10,p.d??2),B=box2d(65,65,585,220,0,1,0,.17),q=x=>x*x*(1-x),error=Math.abs(m.estimate-.6);
 mcAxes(root,svg,B,[0,.25,.5,.75,1],[0,.05,.1,.15],'$\\theta$','');
 const g=new Scene(root,0,0,el(svg,'g'));g.begin();
 const bars=g.plot(B).bars(m.nodes,m.nodes.map(x=>x*q(x)),{width:1/m.m,color:C.like,fo:.18,stroke:C.like,'stroke-width':.8});g.trim();
 bars.forEach((bar,i)=>{bar.classList.add('grid-cell');Object.assign(bar.dataset,{theta:m.nodes[i],integrand:m.nodes[i]*q(m.nodes[i]),cellWidth:1/m.m});});
 mcDensity(svg,B,q,C.pred);mcDensity(svg,B,x=>x*q(x),C.like);
 m.nodes.forEach(x=>el(svg,'circle',{cx:B.X(x),cy:B.Y(x*q(x)),r:2.7,fill:C.like}));
 mcMath(root,'legend','1D example: <span class="c-pred">$q(\\theta)$</span> · <span class="c-like">$h(\\theta)q(\\theta)$</span>',350,17,'c',C.ink,20);
 mcMath(root,'rectangles','Green rectangles approximate the numerator integral.',350,42,'c',C.mle,18);
 const owner=root.closest('section');
 owner.querySelector('.grid-estimate').innerHTML=rich(`Grid estimate: $${m.estimate.toFixed(6)}$`);
 owner.querySelector('.grid-error').innerHTML=rich(`Absolute error: $${error.toFixed(6)}$`);
 owner.querySelector('.grid-evaluation-count').textContent=BigInt(m.cost).toLocaleString('en-US');
 Object.assign(root.dataset,{m:String(m.m),dimension:String(m.d),estimate:String(m.estimate),error:String(error),cost:m.cost,numeratorIntegral:String(m.numerator/m.m),denominatorIntegral:String(m.denominator/m.m),init:JSON.stringify({m:m.m,d:m.d})});
});

mcRegister('inverseCDF',620,365,(root,svg,p)=>{
 const u=clamp(p.u??.36),theta=Math.sqrt(u),seed=p.seed??12,B=box2d(65,65,480,215,0,1,0,1);
 mcAxes(root,svg,B,[0,.25,.5,.75,1],[0,.25,.5,.75,1],'','$F(\\theta)$');
 mcDensity(svg,B,x=>x*x,C.prior);
 el(svg,'line',{x1:B.X(0),x2:B.X(theta),y1:B.Y(u),y2:B.Y(u),stroke:C.postC,'stroke-width':2,'stroke-dasharray':'6 4'});
 el(svg,'line',{x1:B.X(theta),x2:B.X(theta),y1:B.Y(u),y2:B.Y(0),stroke:C.postC,'stroke-width':2,'stroke-dasharray':'6 4'});
 [[0,u],[theta,u],[theta,0]].forEach(([x,y])=>el(svg,'circle',{cx:B.X(x),cy:B.Y(y),r:5,fill:C.postC,stroke:'#fff','stroke-width':1.2}));
 mcMath(root,'curve','$F(\\theta)=\\theta^2$',350,22,'c',C.prior,24);
 mcMath(root,'theta-axis','$\\theta$',578,301,'c',C.ink,22);
 mcMath(root,'mapping',`$u=${u.toFixed(2)}\\quad\\Rightarrow\\quad\\theta=\\sqrt u=${theta.toFixed(3)}$`,310,340,'c',C.postC,25);
 root.dataset.u=u;root.dataset.theta=theta;root.dataset.init=JSON.stringify({u,seed});
});

mcRegister('rejection',620,335,(root,svg,p)=>{
 const n=Math.max(0,Math.round(p.n??0)),M=Math.max(.25,p.M??.25),seed=p.seed??45,run=basicRejection(n,M,seed),B=box2d(65,55,490,170,0,1,0,Math.max(.3,M));
 mcAxes(root,svg,B,[0,.25,.5,.75,1],[0,B.yhi/2,B.yhi],'$\\theta$','');
 run.points.slice(-650).forEach((point,i,list)=>el(svg,'circle',{cx:B.X(point.x),cy:B.Y(point.y),r:i===list.length-1?5:3,fill:point.accepted?C.like:C.post,'fill-opacity':.65,stroke:'#fff','stroke-width':.7}));
 mcDensity(svg,B,x=>x*x*(1-x),C.pred);mcDensity(svg,B,x=>M*x,C.prior);
 mcMath(root,'curves','<span class="c-pred">Target shape $q$</span> · <span class="c-prior">Envelope $Mg$</span>',310,20,'c',C.ink,20);
 mcMath(root,'count','<span class="c-like">Green: accepted</span> · <span class="c-post">Red: rejected</span>',310,293,'c',C.ink,20);
 mcMath(root,'rates',(n?`${run.accepted}/${n} accepted (${(100*run.accepted/n).toFixed(1)}%)`:'No proposals yet')+` · Expected: ${(100*run.expected).toFixed(1)}%`,310,320,'c',C.ink,19);
 root.dataset.proposals=n;root.dataset.accepted=run.accepted;root.dataset.expectedRate=run.expected;root.dataset.init=JSON.stringify({n,M,seed});
});

mcRegister('rejectionAccepted',500,360,(root,svg,p)=>{
 const n=Math.max(100,Math.round(p.n??1000)),M=p.M??.25,seed=p.seed??45,run=basicRejection(n,M,seed),ymax=Math.max(2.5,Math.ceil(mcHistogramPeak(run.samples,20,0,1)*2)/2),B=box2d(60,80,400,190,0,1,0,ymax);
 mcAxes(root,svg,B,[0,.5,1],[0,1,2],'$\\theta$','Density');mcHistogram(svg,B,run.samples,20);mcDensity(svg,B,x=>12*x*x*(1-x),C.pred);
 mcMath(root,'legend','<span class="c-like">Accepted histogram</span> · <span class="c-pred">Target $p$</span>',250,25,'c',C.ink,21);
 mcMath(root,'rate',`${run.accepted}/${n} accepted · Exact rate: $2/3$`,250,345,'c',C.ink,20);
 root.dataset.accepted=run.accepted;root.dataset.proposals=n;root.dataset.expectedRate=run.expected;root.dataset.init=JSON.stringify({n,M,seed});
});

mcRegister('importance',620,390,(root,svg,p)=>{
 const n=Math.max(5,Math.round(p.n??30)),seed=p.seed??16,stage=Math.max(0,Math.min(4,Math.round(p.stage??0))),weighted=stage>=2,m=basicImportance(n,seed),old=root._importanceView;
 const B=box2d(65,75,490,120,0,1,0,2.3);
 mcAxes(root,svg,B,[0,.25,.5,.75,1],[0,1,2],'$\\theta$','Density');
 mcDensity(svg,B,x=>12*x*x*(1-x),C.pred);mcDensity(svg,B,x=>2*x,C.prior);
 mcMath(root,'density-legend','<span class="c-pred">Target $p(\\theta)=12\\theta^2(1-\\theta)$</span> · <span class="c-prior">Proposal $r(\\theta)=2\\theta$</span>',310,22,'c',C.ink,18);
 mcMath(root,'draws','Green dots: all proposal samples $\\theta_i\\sim r$',310,262,'c',C.like,21);
 m.draws.forEach(({theta,w},i)=>{
  const radius=weighted?22*Math.sqrt(w):7.8;
  const dot=el(svg,'circle',{cx:B.X(theta),cy:289+(i%3)*10,r:radius,'data-sample':i+1,'data-theta':theta,'data-x':theta,'data-weight':w,'data-h':theta,fill:C.like,'fill-opacity':.5,stroke:'#fff','stroke-width':.8});
  const title=el(dot,'title');title.textContent=`Sample ${i+1}\ntheta_i = ${theta.toFixed(4)}`+(weighted?`\nw_i = theta_i(1-theta_i) = ${w.toFixed(4)}`:'');
  if(!PRINT&&radius>0&&old&&old.n===n&&old.seed===seed&&old.weighted!==weighted&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const before=old.weighted?22*Math.sqrt(w):7.8;
   dot.style.transformBox='fill-box';dot.style.transformOrigin='center';
   dot.animate([{transform:`scale(${before/radius})`},{transform:'scale(1)'}],{duration:350,easing:'ease-in-out'});
  }
 });
 if(stage>=3){
  mcMath(root,'unweighted',`Unweighted mean: $${m.unweighted.toFixed(4)}$ · limit $2/3$`,310,348,'c',C.mle,21);
  mcMath(root,'estimate',`Weighted mean: $${m.estimate.toFixed(4)}$ · limit $0.6$`,310,377,'c',C.like,21);
 }
 const caption=root.closest('section').querySelector('.importance-area-caption');
 if(caption)caption.innerHTML=rich(weighted?'Dot area is proportional to $w_i=\\theta_i(1-\\theta_i)$.':'All dots have equal area.');
 root.dataset.stage=stage;root.dataset.weightMode=weighted?'weighted':'equal';root.dataset.estimate=m.estimate;root.dataset.unweighted=m.unweighted;
 root.dataset.init=JSON.stringify({n,seed,stage:0});root._importanceView={n,seed,weighted};
});
FIGS.importance.duration=1;

if(!PRINT){
 document.addEventListener('click',event=>{
  const button=event.target.closest('#inverse-cdf [data-basic-draw]');if(!button)return;
  const root=document.querySelector('#inverse-cdf .fig'),state=live.get(root)||{},p={...(state.p||stateFor(root))};
  p.seed=Math.round(p.seed??12)+1;
  // Match the displayed input's two-decimal precision before applying the inverse.
  p.u=Number(mulberry32(p.seed)().toFixed(2));
  cancelAnimationFrame(state.raf);FIGS.inverseCDF.render(root,p);state.p=p;live.set(root,state);syncKnobs(root,p);
  event.preventDefault();event.stopPropagation();
 });
 Reveal.on('ready',()=>document.querySelector('#inverse-cdf .sampling-local-controls').addEventListener('keydown',event=>event.stopPropagation()));
}
