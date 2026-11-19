/* SVG figures use the shared Scene/Plot primitives and Sampling I palette. */
const S2DEMO = (()=>{
 const models=new Map(),colors=[C.prior,C.postC,C.like,C.rose];
 const num=(x,n=2)=>Number.isFinite(x)?x.toFixed(n):'—';
 const stop=section=>{
  if(section._s2timer){clearInterval(section._s2timer);section._s2timer=null;}
  if(section._s2hmcTimer){clearTimeout(section._s2hmcTimer);section._s2hmcTimer=null;}
  section.querySelectorAll('[data-do="run"],[data-do="trajectory"]').forEach(b=>{
   b.setAttribute('aria-pressed','false');
   if(b.dataset.original)b.textContent=b.dataset.original;
  });
 };
 function create(id,old={}){
  const rho=old.rho??.8,tau=old.tau??.6,epsilon=old.epsilon??(id==='hmc-algorithm'?.25:.2),L=old.L??(id==='hmc-algorithm'?12:10);
  let m={rho,tau,epsilon,L};
  if(id==='sampling-chain'){m={t:1000,burn:100,thin:1,chain:S2_CHAIN.create()};S2_CHAIN.select(m.chain,m.burn,m.thin,m.t);}
  else if(id==='jump-size'){m.multi=old.multi??false;m.chains=(m.multi?[[2.5,-2.5],[-2.5,2.5],[-2.5,-2.5],[2.5,2.5]]:[[2.5,-2.5]]).map((start,i)=>S2.metropolis({rho,tau,start,seed:121+i*77}));}
  else if(id==='random-walk'){const r=S2.rng(533);m.epsilon=old.epsilon??.5;m.steps=old.steps??100;m.signs=Array.from({length:10000},()=>r()<.5?-1:1);}
  else if(id==='why-gibbs'){m.rho=.9;m.direction=0;m.q=[1.25,-1.25];m.random=S2.rng(321);}
  else if(id==='bivariate-gaussian'){
   m.g=S2.gibbs({rho,start:[0,1.5]});
   m.fixed=old.fixed??1.5;
   m.direction=old.direction??0;
   m.inspect=old.inspect??true;
   m.extent=old.extent??4;
   m.plottedThrough=0;
   m.samplePath={};
  }
  else if(id==='metropolis-gibbs'){m.met=S2.metropolis({rho,tau:.6});m.g=S2.gibbs({rho});}
  else if(id==='gibbs-practice')m.selected='C';
  else if(id==='why-hmc'){
   const start=[-2,-1.5],steps=30;
   m.met=S2.metropolis({rho,tau:.22,start}).run(steps);
   m.eng=S2.leapEngine({rho,epsilon:.1,q:start,p:[1.2,1.3]});
   m.descent=[start];
   for(let i=0;i<steps;i++){
    m.eng.step();
    const q=m.descent.at(-1),g=S2.grad(q,rho);
    m.descent.push(q.map((x,j)=>x-.08*g[j]));
   }
  }
  else if(id==='energy-momentum'){
   m.position=-2.6;
   m.momentum=.8;
   m.t=0;
  }
  else if(id==='hamiltonian-dynamics'){m.q0=[-1.5,-1];m.p0=[1.2,.2];m.t=0;m.path=[m.q0];m.state=S2.exact(m.q0,m.p0,0,rho);m.H0=S2.H(m.q0,m.p0,rho);}
  else if(id==='leapfrog'){
   m.eng=S2.leapEngine({epsilon,rho});
   m.energyError=0;
   m.maxEnergyError=0;
  }
  else if(id==='hmc-algorithm'){m.hmc=S2.hmc({rho,epsilon,L});}
  return m;
 }
 function model(section){if(!models.has(section.id))models.set(section.id,create(section.id));return models.get(section.id);}
 function text(svg,s,x,y,color=C.ink,size=20,anchor='middle'){const t=el(svg,'text',{x,y,fill:color,'font-size':size,'text-anchor':anchor});t.textContent=s;return t;}
 function math(root,key,s,x,y,anchor='c',color=C.ink,size=21){label(root,key,s,x,y,anchor,color);root.querySelector(`.lab[data-k="${key}"]`).style.fontSize=size+'px';}
 function line(svg,pts,color=C.prior,w=2,dash=''){return el(svg,'path',{d:pathOf(pts),stroke:color,fill:'none','stroke-width':w,'stroke-dasharray':dash,'stroke-linejoin':'round'});}
 function scene(root,svg,B){const sc=new Scene(root,0,0,el(svg,'g'));sc.begin();return sc.plot(B);}
 function axes2(root,svg,B,xname='$\\theta_1$',yname='$\\theta_2$',xt=[-3,0,3],yt=[-3,0,3],prefix=''){
  const sc=new Scene(root,0,0,el(svg,'g'));sc.begin();const p=sc.plot(B),l=sc.label.bind(sc);sc.label=(k,...args)=>l(prefix+k,...args);p.axes({grid:false,ox:B.xlo,oy:B.ylo,xt,yt,names:['','']});sc.trim();
  for(const y of yt)if(y>B.ylo)el(svg,'line',{x1:B.X(B.xlo),x2:B.X(B.xhi),y1:B.Y(y),y2:B.Y(y),stroke:C.grid});
  math(root,prefix+'xlabel',xname,B.x0+B.W/2,B.y0+B.H+43);math(root,prefix+'ylabel',yname,B.x0,B.y0-21,'l');
 }
 function target(root,svg,rho,w=704,h=400,{x=66,y=43,W=w-112,H=h-103,R=3.6,title='Gaussian target',contours=null,ticks=[-3,0,3]}={}){
  const B=box2d(x,y,W,H,-R,R,-R,R);axes2(root,svg,B,undefined,undefined,ticks,ticks);const p=scene(root,svg,B);[.6,1.2,1.8,2.4,3].forEach((r,i)=>p.ellipse(rho,{r,color:C.pred,w:1.7,opacity:r===3?.28:.5,...contours?.[i]}));
  if(title)text(svg,title,w/2,19,C.pred,21);const clipid='s2clip-'+root.dataset.fig;const defs=el(svg,'defs');const clip=el(defs,'clipPath',{id:clipid});el(clip,'rect',{x:B.x0,y:B.y0,width:B.W,height:B.H});B.marks=el(svg,'g',{'clip-path':'url(#'+clipid+')'});return B;
 }
 function path(svg,B,qs,color=C.prior,w=2,dash=''){return line(B.marks||svg,qs.map(q=>[B.X(q[0]),B.Y(q[1])]),color,w,dash);}
 function dot(svg,B,q,color=C.prior,r=5){if(q.every(Number.isFinite))el(B.marks||svg,'circle',{cx:B.X(q[0]),cy:B.Y(q[1]),r,fill:color,stroke:'#fff','stroke-width':1.5});}
 function cross(svg,B,q,color=C.post){const x=B.X(q[0]),y=B.Y(q[1]);svg=B.marks||svg;line(svg,[[x-5,y-5],[x+5,y+5]],color,2.5);line(svg,[[x-5,y+5],[x+5,y-5]],color,2.5);}
 function cloud(root,svg,B,qs,color=C.like,fo=.36){scene(root,B.marks||svg,B).cloud(S2.dots(qs),{color,r:2.3,fo});}
 // Keep previous rejections in one SVG path. The latest rejection is drawn separately.
 function rejectedHistory(svg,B,chains){
  const points=[];
  for(const m of chains)for(let i=0;i<m.moves.length-1;i++){
   const move=m.moves[i];if(!move.accepted)points.push(move.proposal);
  }
  rejectedMarks(svg,B,points);
 }
 function rejectedMarks(svg,B,points,opacity){
  const count=points.length,size=3.1;
  let d='';
  for(const [a,b] of points){
   const x=B.X(a),y=B.Y(b);
   d+=`M${(x-size).toFixed(1)},${(y-size).toFixed(1)}L${(x+size).toFixed(1)},${(y+size).toFixed(1)}M${(x-size).toFixed(1)},${(y+size).toFixed(1)}L${(x+size).toFixed(1)},${(y-size).toFixed(1)}`;
  }
  if(count)el(B.marks||svg,'path',{d,fill:'none',stroke:C.post,'stroke-width':1.2,opacity:opacity??Math.max(.045,Math.min(.52,9/Math.sqrt(count))),'data-rejected-count':count});
 }
 function chain(root,svg,B,m,color=C.prior,{solidBlueSamples=false,pathPoints=160}={}){cloud(root,svg,B,m.history,solidBlueSamples?C.prior:color,solidBlueSamples?1:.36);path(svg,B,[m.start,...m.history].slice(-pathPoints),color,1.5);dot(svg,B,m.q,solidBlueSamples?C.prior:color,6);if(m.last){path(svg,B,[m.last.from,m.last.proposal],m.last.accepted?C.like:C.post,2.5,'5 4');if(!m.last.accepted)cross(svg,B,m.last.proposal);else dot(svg,B,m.last.proposal,solidBlueSamples?C.prior:C.like,4);}}
 function gaussianConditional(rho,fixed){
  return {mean:rho*fixed,variance:1-rho*rho};
 }
 function drawSlice(svg,B,rho,direction,fixed){
  const color=direction===0?C.prior:C.postC;
  const {mean,variance}=gaussianConditional(rho,fixed);
  const point=(x,height=0)=>direction===0?[x,fixed+height]:[fixed+height,x];
  const peakHeight=fixed>B.yhi-.82?-.82:.82;
  const curve=Array.from({length:181},(_,i)=>{
   const x=-3.6+7.2*i/180;
   return point(x,peakHeight*Math.exp(-((x-mean)**2)/(2*variance)));
  });
  path(svg,B,[point(-3.6),point(3.6)],color,1.5,'6 5');
  path(svg,B,curve,color,2.7);
  dot(svg,B,point(mean),color,5);
  return {mean,variance};
 }
 function gibbsCurrent(svg,B,q,color=C.prior){
  return el(B.marks,'circle',{cx:B.X(q[0]),cy:B.Y(q[1]),r:6,fill:color,stroke:'#fff','stroke-width':1.5,'data-gibbs-current':''});
 }
 function stat(root,s){root.closest('section').querySelector('.s2-status')?.replaceChildren(document.createTextNode(s));}
 function hist(root,svg,B,values,color=C.like,bins=35){const dx=(B.xhi-B.xlo)/bins,counts=Array(bins).fill(0);values.forEach(x=>{const k=Math.floor((x-B.xlo)/dx);if(k>=0&&k<bins)counts[k]++;});scene(root,svg,B).bars(counts.map((_,i)=>B.xlo+(i+.5)*dx),counts.map(n=>values.length?n/(values.length*dx):0),{width:dx*.9,color,fo:.45,w:1});}
 function arrows(B,q,p,rho){
  const [x,y]=[B.X(q[0]),B.Y(q[1])];
  const g=S2.grad(q,rho);
  for(const [v,scale,color] of [[p,.45,C.prior],[g,-.3,C.post]]){
   const [endX,endY]=[B.X(q[0]+scale*v[0]),B.Y(q[1]+scale*v[1])];
   const length=Math.hypot(endX-x,endY-y);
   if(length>1)arrow(B.marks,x,y,endX,endY,color,3,Math.min(10,length*.7));
  }
 }
 function legendItem(svg,symbol,caption,x,y,color){
  text(svg,symbol,x,y,color,21,'start');
  text(svg,caption,x+25,y,C.ink,18,'start');
 }
 function energyBar(svg,y,E,K,maximum){
  const x=67,width=590,height=18,total=E+K;
  const potential=maximum>0?width*E/maximum:0;
  const kinetic=maximum>0?width*K/maximum:0;
  el(svg,'rect',{x,y,width,height,rx:3,fill:'#f1edf5'});
  el(svg,'rect',{x,y,width:potential,height,fill:C.pred});
  el(svg,'rect',{x:x+potential,y,width:kinetic,height,fill:C.prior});
  el(svg,'rect',{x,y,width,height,rx:3,fill:'none',stroke:'#a39aae','stroke-width':1});
  text(svg,`Potential E = ${num(E)}`,x,y+44,C.pred,20,'start');
  text(svg,`Kinetic K = ${num(K)}`,x+width/2,y+44,C.prior,20);
  text(svg,`Total H = ${num(total)}`,x+width,y+44,C.ink,20,'end');
  return total;
 }
 function ring(svg,B,q,color,r,data={}){
  return el(svg,'circle',{cx:B.X(q[0]),cy:B.Y(q[1]),r,fill:'none',stroke:color,'stroke-width':2.8,...data});
 }
 function diamond(svg,B,q,color,r){
  const x=B.X(q[0]),y=B.Y(q[1]);
  return el(svg,'path',{d:`M${x},${y-r}l${r},${r}l-${r},${r}l-${r},-${r}Z`,fill:'#fff',stroke:color,'stroke-width':2.5});
 }
 function leapfrogSubstep(m){
  const e=m.eng;
  e.substep();
  if(e.phase===0){
   m.energyError=S2.H(e.q,e.p,m.rho)-e.H0;
   m.maxEnergyError=Math.max(m.maxEnergyError,Math.abs(m.energyError));
  }
 }
 function register(name,w,h,render){FIGS[name]={duration:1,init(root){root.style.width=w+'px';root.style.height=h+'px';},render(root){root.replaceChildren();const svg=el(root,'svg',{width:w,height:h,viewBox:`0 0 ${w} ${h}`,role:'img','aria-label':root.closest('section').querySelector('h2').textContent});render(root,svg,model(root.closest('section')),w,h);}};}
 register('s2Trace',704,390,(root,svg,m)=>{
  const selection=S2_CHAIN.select(m.chain,m.burn,m.thin,m.t),n=m.t;
  const all=m.chain.history.slice(0,n),keep=selection.values;
  const traceLo=Math.min(-5,Math.floor(Math.min(m.chain.start,...all))-1),traceHi=Math.max(5,Math.ceil(Math.max(m.chain.start,...all))+1);
  const traceTicks=Array.from({length:Math.floor(traceHi/5)-Math.ceil(traceLo/5)+1},(_,i)=>5*(Math.ceil(traceLo/5)+i));
  const B=box2d(65,40,584,112,0,n,traceLo,traceHi);
  axes2(root,svg,B,'Iteration $t$',String.raw`$\theta$`,[0,Math.round(n/2),n],traceTicks,'trace');
  math(root,'tracexlabel','Iteration $t$',357,187,'c',C.ink,20);
  el(svg,'rect',{x:B.X(0),y:B.y0,width:B.X(Math.min(m.burn,n))-B.X(0),height:B.H,fill:C.postC,opacity:.14,'data-burn-in':m.burn});
  line(svg,[[B.X(0),B.Y(m.chain.start)],...all.map((v,i)=>[B.X(i+1),B.Y(v)])],C.prior,1.3);
  const markerSize=keep.length>2000?1.6:keep.length>500?2:2.8;
  selection.iterations.forEach((t,i)=>el(svg,'circle',{cx:B.X(t),cy:B.Y(keep[i]),r:markerSize,fill:C.like,'data-retained-iteration':t}));
  text(svg,`Start: ${m.chain.start}     Amber: burn-in     Blue: chain     Green: retained`,352,16,C.mle,18);
  math(root,'mixture-target',String.raw`$p(\theta)=\tfrac12\mathcal N(\theta;-2,${S2_CHAIN.sd}^2)+\tfrac12\mathcal N(\theta;2,${S2_CHAIN.sd}^2)$`,352,216,'c',C.pred,20);
  const R=Math.max(5,Math.ceil(Math.max(0,...keep.map(Math.abs))));
  const bins=50,dx=2*R/bins,counts=Array(bins).fill(0);
  keep.forEach(x=>counts[Math.min(bins-1,Math.max(0,Math.floor((x+R)/dx)))]++);
  const heights=counts.map(c=>keep.length?c/(keep.length*dx):0);
  const ymax=Math.ceil(Math.max(.4,...heights)*1.12*10)/10;
  const D=box2d(65,263,584,78,-R,R,0,ymax);
  axes2(root,svg,D,String.raw`Retained $\theta$`,'Density',R>5?Array.from({length:2*Math.floor(R/5)+1},(_,i)=>5*(i-Math.floor(R/5))):[-4,-2,0,2,4],[0,ymax/2,ymax],'hist');
  math(root,'histxlabel',String.raw`Retained $\theta$`,357,376,'c',C.ink,20);
  scene(root,svg,D).bars(counts.map((_,i)=>-R+(i+.5)*dx),heights,{width:dx*.9,color:C.like,fo:.45,w:1});
  scene(root,svg,D).curve(S2_CHAIN.density,{color:C.pred,w:2.8});
  stat(root,`Generated ${m.chain.history.length.toLocaleString()} · shown ${n.toLocaleString()} · retained ${keep.length.toLocaleString()} · τ = ${S2_CHAIN.tau}`);
  Object.assign(root.dataset,{generated:String(m.chain.history.length),shown:String(n),retained:String(keep.length),burn:String(m.burn),thin:String(m.thin),retainedIterations:JSON.stringify(selection.iterations)});
 });
 register('s2Jump',704,365,(root,svg,m)=>{
  // Inner to outer levels: darker purple indicates higher target density.
  const contours=['#5E2675','#7D4593','#A075B4','#BDA0CC','#D7C5E0'].map((color,i)=>({color,w:i<2?2.3:1.8,opacity:1}));
  const B=target(root,svg,m.rho,704,365,{title:'Same target, different Gaussian jumps',contours});
  rejectedHistory(svg,B,m.chains);
  m.chains.forEach((c,i)=>chain(root,svg,B,c,colors[i],{solidBlueSamples:true}));
  const n=m.chains[0].history.length,total=n*m.chains.length,accepted=m.chains.reduce((a,c)=>a+c.accepted,0),distance=m.chains.reduce((a,c)=>a+c.distance,0);
  stat(root,`${n} iterations / chain · accepted ${total?num(accepted/total*100,0):'—'}% · mean squared jump ${total?num(distance/total,3):'—'}`);
  root.dataset.rejected=String(total-accepted);
 });
 register('s2Walk',704,355,(root,svg,m)=>{
  const n=m.steps,unit=[0],qs=[[0,0]];
  for(let i=0;i<n;i++){unit.push(unit.at(-1)+m.signs[i]);qs.push([i+1,m.epsilon*unit.at(-1)]);}
  // Rescale with epsilon so even the smallest steps remain visible.
  const R=m.epsilon*Math.max(Math.sqrt(n)*1.5,...unit.map(Math.abs))*1.05,B=box2d(66,56,581,229,0,n,-R,R);
  const ytick=Number((R/2).toPrecision(1));
  axes2(root,svg,B,'Number of steps $t$','Displacement',[0,Math.round(n/2),n],[-ytick,0,ytick]);
  path(svg,B,qs,C.prior,2);
  for(const sign of [-1,1])path(svg,B,Array.from({length:150},(_,i)=>[n*i/149,sign*m.epsilon*Math.sqrt(n*i/149)]),C.postC,2,'7 5');
  math(root,'walk-legend',String.raw`Blue: random walk · Yellow dashed: $\pm\varepsilon\sqrt{T}$`,352,8,'c',C.mle,19);
  stat(root,`T = ${n} · realized |displacement| = ${num(Math.abs(qs.at(-1)[1]))} · theoretical RMS = ${num(m.epsilon*Math.sqrt(n))}`);
  Object.assign(root.dataset,{steps:String(n),epsilon:String(m.epsilon),ymin:String(-R),ymax:String(R),displacement:String(qs.at(-1)[1]),rms:String(m.epsilon*Math.sqrt(n))});
 });
 register('s2GibbsMotivation',704,410,(root,svg,m)=>{
  const B=target(root,svg,m.rho,704,410,{title:m.direction===0?'Horizontal conditional slice':'Vertical conditional slice'});
  drawSlice(svg,B,m.rho,m.direction,m.q[1-m.direction]);
  gibbsCurrent(svg,B,m.q,C.like);
  stat(root,m.direction===0?'Draw θ₁ while θ₂ stays fixed':'Draw θ₂ while θ₁ stays fixed');
 });
 // A single filled SVG path keeps every sample without creating a DOM node per dot.
 function allGibbsSamples(svg,m,B,range,count){
  let cache=m.samplePath;
  if(cache.range!==range||cache.count>count)cache=m.samplePath={range,count:0,d:''};
  const radius=1.65,diameter=2*radius;
  let marks='';
  for(let i=cache.count;i<count;i++){
   const [x,y]=m.g.history[i];
   marks+='M'+(B.X(x)-radius).toFixed(2)+','+B.Y(y).toFixed(2)+
          'a'+radius+','+radius+' 0 1 0 '+diameter+',0a'+radius+','+radius+' 0 1 0 -'+diameter+',0Z';
  }
  cache.d+=marks;
  cache.count=count;
  el(svg,'path',{d:cache.d,fill:C.like,'fill-opacity':1,'data-sample-count':count});
 }
 function exampleSlice(m,stage){
  const preview=stage<3||m.inspect;
  const position=m.pending?.from??m.g.q;
  const direction=preview?m.direction:(m.pending?.j??m.g.next);
  return {preview,direction,fixed:preview?m.fixed:position[1-direction]};
 }
 function exampleGaussianCurve(range,mean,variance,point){
  const normalizer=1/Math.sqrt(2*Math.PI*variance);
  return Array.from({length:181},(_,i)=>{
   const x=range*(2*i/180-1);
   return point(x,normalizer*Math.exp(-((x-mean)**2)/(2*variance)));
  });
 }
 function exampleControls(section,m,range,slice){
  const rho=section.querySelector('[data-param="rho"]');
  rho.value=m.rho;
  rho.nextElementSibling.textContent=num(m.rho);
  const fixed=section.querySelector('[data-param="fixed"]');
  fixed.min=-range;
  fixed.max=range;
  fixed.value=slice.fixed;
  fixed.nextElementSibling.textContent=num(slice.fixed,slice.preview?1:2);
  fixed.disabled=Boolean(m.pending);
  section.querySelectorAll('[data-do="horizontal"],[data-do="vertical"]').forEach(button=>{
   const direction=button.dataset.do==='horizontal'?0:1;
   button.setAttribute('aria-pressed',String(direction===slice.direction));
   button.disabled=Boolean(m.pending);
  });
  section.querySelectorAll('[data-conditional-direction]').forEach(rule=>{
   rule.classList.toggle('active',Number(rule.dataset.conditionalDirection)===slice.direction);
  });
  section.querySelectorAll('.s2-gibbs-actions [data-do]').forEach(button=>{
   button.disabled=Boolean(m.pending)&&button.dataset.do!=='reset';
  });
 }
 register('s2GaussianGibbs',674,438,(root,svg,m)=>{
  const section=root.closest('section');
  const stage=stateFor(root).stage??1;
  const g=m.g,slice=exampleSlice(m,stage);
  const count=g.sweeps-(m.pending?.j===1?1:0);
  if(stage>=3){
   for(let i=m.plottedThrough;i<g.history.length;i++){
    const [x,y]=g.history[i];
    m.extent=Math.max(m.extent,Math.abs(x)+.25,Math.abs(y)+.25);
   }
   m.plottedThrough=g.history.length;
   m.extent=Math.max(m.extent,...g.q.map(x=>Math.abs(x)+.25));
  }
  const range=Math.max(4,Math.ceil(m.extent));
  const B=box2d(52,72,554,287,-range,range,-range,range);
  const ticks=[-range,-range/2,0,range/2,range];
  const joint=scene(root,svg,B);
  joint.axes({grid:false,ox:-range,oy:-range,xt:ticks,yt:ticks,names:['','']});
  for(const y of ticks.slice(1))el(svg,'line',{x1:B.x0,y1:B.Y(y),x2:B.x0+B.W,y2:B.Y(y),stroke:C.grid});
  [0.65,1.3,1.95,2.6,3.25].forEach((r,i)=>{
   joint.ellipse(m.rho,{r,color:C.pred,w:1.7,opacity:.76-i*.12});
  });
  const centerX=B.x0+B.W/2,centerY=B.y0+B.H/2;
  math(root,'gibbs-x',String.raw`$\theta_1$`,B.x0+B.W+25,B.y0+B.H+20,'c',C.ink,18);
  math(root,'gibbs-y',String.raw`$\theta_2$`,22,centerY,'c',C.ink,18);

  const marginal='#087f80';
  const topAxis=B.y0-22,rightAxis=B.x0+B.W+21;
  line(svg,[[B.x0,topAxis],[B.x0+B.W,topAxis]],C.axis,1);
  line(svg,[[rightAxis,B.y0],[rightAxis,B.y0+B.H]],C.axis,1);
  line(svg,exampleGaussianCurve(range,0,1,(x,density)=>[B.X(x),topAxis-62*density]),marginal,2.7);
  line(svg,exampleGaussianCurve(range,0,1,(y,density)=>[rightAxis+85*density,B.Y(y)]),marginal,2.7);
  math(root,'marginal-1',String.raw`$p(\theta_1\mid\mathbf y)$`,centerX,10,'c',marginal,18);
  math(root,'marginal-2',String.raw`$p(\theta_2\mid\mathbf y)$`,636,B.y0-11,'c',marginal,18);
  legendItem(svg,'━','Joint contours',52,409,C.pred);
  legendItem(svg,'━','Marginals (fixed as ρ changes)',218,409,marginal);

  if(stage>=3)allGibbsSamples(svg,m,B,range,count);
  if(stage>=2){
   const {direction,fixed,preview}=slice;
   const {mean,variance}=gaussianConditional(m.rho,fixed);
   const color=direction===0?C.prior:C.postC;
   const curveScale=42;
   const peak=curveScale*phi(0,0,variance);
   const fixedAxisPixels=direction===0?B.H:B.W;
   const side=fixed+peak*2*range/fixedAxisPixels>range?-1:1;
   const onSlice=(x,height=0)=>direction===0?[B.X(x),B.Y(fixed)-side*height]:[B.X(fixed)+side*height,B.Y(x)];
   line(svg,[onSlice(-range),onSlice(range)],color,1.6,'5 5');
   line(svg,exampleGaussianCurve(range,mean,variance,(x,density)=>onSlice(x,curveScale*density)),color,2.8);
   const [cx,cy]=onSlice(mean);
   el(svg,'circle',{cx,cy,r:4.1,fill:color,stroke:'#fff','stroke-width':1.4});
   legendItem(svg,'━','Horizontal slice',52,431,C.prior);
   legendItem(svg,'━','Vertical slice',218,431,C.postC);
   const mode=stage<3?'Conditional':preview?'Slice preview':m.pending?'Drawing':'Next draw';
   const name=direction===0?'θ₁':'θ₂';
   const status=section.querySelector('.s2-conditional-status');
   status.textContent=mode+' '+name+' · Mean '+num(mean)+' · Variance '+num(variance,3);
  }
  if(stage>=3){
   const move=m.pending;
   const current=ring(svg,B,g.q,C.ink,6.5,{'data-gibbs-example-current':''});
   if(move?.animate&&current.animate){
    const dx=B.X(move.from[0])-B.X(move.to[0]);
    const dy=B.Y(move.from[1])-B.Y(move.to[1]);
    current.animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],{duration:250,easing:'ease-in-out'});
   }
   legendItem(svg,'●','Recorded samples',500,409,C.like);
   legendItem(svg,'○','Current state',500,431,C.ink);
   const updates=g.coordinates-(m.pending?1:0);
   section.querySelector('.s2-gibbs-actions + .s2-status').textContent=
    'Coordinate updates '+updates.toLocaleString()+' · Completed sweeps '+count.toLocaleString();
  }
  exampleControls(section,m,range,slice);
 });
 function comparisonTarget(root,svg,rho){
  const B=target(root,svg,rho,588,309,{title:''});
  math(root,'ylabel',String.raw`$\theta_2$`,29,B.y0+B.H/2);
  return B;
 }
 register('s2CompareMetropolis',588,309,(root,svg,m)=>{
  const B=comparisonTarget(root,svg,m.rho);
  const {history,moves,accepted,last,q}=m.met;
  rejectedHistory(svg,B,[m.met]);
  cloud(root,svg,B,history,C.prior,1);
  if(last?.accepted)path(svg,B,[last.from,last.to],C.like,3);
  else if(last)cross(svg,B,last.proposal);
  ring(B.marks,B,q,C.ink,6.5);
  const rate=moves.length?num(100*accepted/moves.length,1)+'%':'—';
  const summary=`Recorded joint states ${history.length.toLocaleString()} · Proposals ${moves.length.toLocaleString()} · Acceptance ${rate}`;
  text(svg,summary,294,17,C.mle,20);
  svg.setAttribute('aria-label','Metropolis · '+summary);
 });
 register('s2CompareGibbs',588,309,(root,svg,m)=>{
  const B=comparisonTarget(root,svg,m.rho);
  const g=m.g;
  cloud(root,svg,B,g.history,C.like,1);
  if(g.sweeps){
   const [start,middle,end]=g.path.slice(-3);
   path(svg,B,[start,middle],C.prior,3);
   path(svg,B,[middle,end],C.postC,3);
  }
  ring(B.marks,B,g.q,C.ink,6.5);
  const summary=`Recorded joint states ${g.history.length.toLocaleString()} · Conditional draws ${g.coordinates.toLocaleString()} · No rejection step`;
  text(svg,summary,294,17,C.mle,20);
  svg.setAttribute('aria-label','Gibbs · '+summary);
 });
 register('s2Blanket',704,378,(root,svg,m)=>{
  const positions={A:[155,82],B:[485,82],C:[265,214],D:[155,333],E:[565,248]};
  const edges=[['A','C'],['B','C'],['C','D'],['B','E']];
  const blankets={A:['B','C'],B:['A','C','E'],C:['A','B','D'],D:['C'],E:['B']};
  const selected=m.selected,blanket=blankets[selected];
  for(const [a,b]of edges){const p=positions[a],q=positions[b],dx=q[0]-p[0],dy=q[1]-p[1],d=Math.hypot(dx,dy);arrow(svg,p[0]+dx/d*31,p[1]+dy/d*31,q[0]-dx/d*34,q[1]-dy/d*34,C.axis,2,12);}
  for(const [name,[cx,cy]] of Object.entries(positions)){
   const active=name===selected,inBlanket=blanket.includes(name);
   const color=active?C.prior:inBlanket?C.postC:C.axis;
   const fill=active?'#eef4fd':inBlanket?'#fff8e9':'#f4f4f4';
   el(svg,'circle',{cx,cy,r:32,fill,stroke:color,'stroke-width':active?4:3,'data-node':name});
   text(svg,name,cx,cy+9,active?C.prior:C.ink,29);
  }
  legendItem(svg,'●','Selected node',94,25,C.prior);
  legendItem(svg,'●','Markov blanket',282,25,C.postC);
  legendItem(svg,'●','Other nodes',490,25,C.axis);
  const members=blanket.join(', ');
  const status=root.closest('section').querySelector('.s2-status');
  status.innerHTML=rich(`Markov blanket of $${selected}$ is $\\{${members}\\}$<br>Gibbs conditional $p(${selected}\\mid ${members})$`);
 });
 register('s2WhyHMC',704,400,(root,svg,m)=>{
  const stage=stateFor(root).stage??1;
  const B=target(root,svg,m.rho,704,400,{y:64,H:278,title:''});
  legendItem(svg,'━','Random-walk Metropolis',65,23,C.prior);
  legendItem(svg,'○','Common start',193,49,C.ink);
  path(svg,B,[m.met.start,...m.met.history],C.prior,2.3);
  if(stage>=2){
   legendItem(svg,'┄','Gradient descent',316,23,C.mle);
   path(svg,B,m.descent,C.mle,2.8,'7 5');
  }
  if(stage>=3){
   legendItem(svg,'━','Hamiltonian path',515,23,C.postC);
   legendItem(svg,'◇','Proposal endpoint',389,49,C.postC);
   path(svg,B,m.eng.path,C.postC,3.1);
   diamond(B.marks,B,m.eng.q,C.postC,8);
  }
  ring(B.marks,B,m.met.start,C.ink,7);
 });
 register('s2Energy',704,396,(root,svg,m)=>{
  // Exact unit-mass motion in the one-dimensional quadratic potential.
  const c=Math.cos(m.t),s=Math.sin(m.t);
  const q=m.position*c+m.momentum*s,p=m.momentum*c-m.position*s;
  const E=q*q/2,K=p*p/2;
  const B=box2d(65,47,592,226,-4.6,4.6,0,11);
  axes2(root,svg,B,String.raw`Position $\theta$`,'Potential energy',[-4,-2,0,2,4],[0,4,8]);
  math(root,'valley-potential',String.raw`$E(\theta)=\tfrac12\theta^2$`,370,18,'c',C.pred,22);
  const valley=scene(root,svg,B);
  valley.area(x=>x*x/2,{color:C.pred,fo:.10,from:-4.6,to:4.6});
  valley.curve(x=>x*x/2,{color:C.pred,w:3.2,from:-4.6,to:4.6});

  const x=B.X(q),y=B.Y(E);
  el(svg,'line',{x1:x,y1:y,x2:x,y2:B.Y(0),stroke:C.pred,opacity:.45,'stroke-dasharray':'5 5'});
  const arrowY=y-26;
  if(Math.abs(p)>.025){
   const tip=B.X(q+.38*p);
   arrow(svg,x,arrowY,tip,arrowY,C.prior,3,Math.min(11,Math.abs(tip-x)*.7));
  }
  el(svg,'circle',{cx:x,cy:y,r:11,fill:C.prior,stroke:'#fff','stroke-width':2.3});
  math(root,'valley-velocity',String.raw`Momentum $\phi$`,x,arrowY-16,'c',C.prior,17);
  energyBar(svg,340,E,K,9);
  stat(root,'Position '+num(q)+' · Momentum '+num(p)+' · Time '+num(m.t));
 });
 register('s2Dynamics',704,430,(root,svg,m)=>{
  const B=target(root,svg,m.rho,704,362,{title:'Position-space view of the trajectory',H:254});
  path(svg,B,m.path.slice(-1000),C.like,2.7);
  arrows(B,m.state.q,m.state.p,m.rho);
  dot(svg,B,m.state.q,C.ink,5);
  const E=S2.E(m.state.q,m.rho),K=S2.K(m.state.p);
  const H=energyBar(svg,366,E,K,m.H0);
  stat(root,'Time '+num(m.t)+' · Change in total energy '+num(Math.abs(H-m.H0),6));
 });
 register('s2Leapfrog',704,350,(root,svg,m)=>{
  const e=m.eng;
  const B=target(root,svg,m.rho,704,350,{title:''});
  legendItem(svg,'→','Momentum',123,21,C.prior);
  legendItem(svg,'→','Force',310,21,C.post);
  legendItem(svg,'━','Leapfrog path',458,21,C.like);
  path(svg,B,e.path.slice(-1000),C.like,2.6);
  arrows(B,e.q,e.p,m.rho);
  dot(svg,B,e.q,C.ink,5);

  const applied=e.phase||(e.steps>0?3:0);
  root.closest('section').querySelectorAll('[data-leap-phase]').forEach(row=>{
   const active=Number(row.dataset.leapPhase)===applied;
   row.classList.toggle('active',active);
   if(active)row.setAttribute('aria-current','step');
   else row.removeAttribute('aria-current');
  });
  const stage=['Ready','First half momentum','Full position','Second half momentum'][applied];
  const detail=e.steps
   ? 'Last completed ΔH '+m.energyError.toExponential(2)+' · Peak |ΔH| '+m.maxEnergyError.toExponential(2)
   : 'Energy error appears after the first complete step.';
  const status=root.closest('section').querySelector('.s2-status');
  status.replaceChildren(document.createTextNode('Completed steps '+e.steps+' · '+stage),document.createElement('br'),document.createTextNode(detail));
 });
 register('s2HMC',704,366,(root,svg,m)=>{
  const c=m.hmc,progress=m.hmcProgress;
  const section=root.closest('section'),step=hmcStage(m);
  const proposal=progress?.trajectory??c.last;
  const decision=progress?progress.decision:c.last;
  const points=proposal?.path??[c.q];
  const position=points.at(-1),steps=points.length-1;
  let maxPosition=0;
  for(const positions of [points,[c.q],c.acceptedPoints,c.rejectedPoints]){
   for(const [x,y] of positions)maxPosition=Math.max(maxPosition,Math.abs(x),Math.abs(y));
  }
  const R=maxPosition>3.45?Math.ceil(maxPosition+.15)+.3:3.6;
  const tick=Math.floor(R);
  const B=target(root,svg,m.rho,704,366,{y:94,H:213,R,ticks:[-tick,0,tick],title:''});
  math(root,'ylabel',String.raw`$\theta_2$`,29,B.y0+B.H/2);
  let phase=['Ready for a proposal','1 · Refresh momentum',`2 · Generate a proposal (L = ${c.L})`,'','4 · Record the resulting position'][step];
  let color=C.pred;
  if(step===3){
   phase=decision.accepted?'3 · Accept proposal':'3 · Reject proposal';
   color=decision.accepted?C.like:C.post;
  }
  section.querySelectorAll('.s2-algorithm li').forEach((row,i)=>{
   if(step===i+1)row.setAttribute('aria-current','step');
   else row.removeAttribute('aria-current');
  });
  text(svg,phase,352,23,color,23);
  legendItem(svg,'○','Current chain position',72,48,C.prior);
  legendItem(svg,'◇','Proposed endpoint',323,48,C.postC);
  legendItem(svg,'→','Momentum',537,48,C.prior);
  legendItem(svg,'●','Accepted samples',72,71,C.like);
  legendItem(svg,'━','Leapfrog trajectory',323,71,C.postC);
  legendItem(svg,'×','Rejections',537,71,C.post);
  cloud(root,svg,B,c.acceptedPoints,C.like,1);
  rejectedMarks(svg,B,c.rejectedPoints,.75);
  if(steps){
   path(svg,B,points,C.postC,2.7);
   for(const q of points.slice(1,-1))dot(svg,B,q,C.postC,3.2);
  }
  if(steps===c.L)diamond(B.marks,B,position,C.postC,8);
  else if(steps)dot(svg,B,position,C.postC,5);
  if(progress){
   const [x,y]=position,[u,v]=progress.trajectory.p;
   const px=B.X(x),py=B.Y(y);
   const dx=B.X(x+.35*u)-px,dy=B.Y(y+.35*v)-py;
   const length=Math.hypot(dx,dy);
   if(length>1){
    const scale=Math.min(1,56/length);
    arrow(B.marks,px,py,px+scale*dx,py+scale*dy,C.prior,3,Math.min(10,.7*length));
   }
  }
  if(decision&&!decision.accepted)cross(svg,B,position);
  if(step===4&&decision.accepted)dot(svg,B,c.q,C.like,4.5);
  ring(B.marks,B,c.q,C.prior,12,{'data-hmc-current':c.q.join(',')});
  svg.setAttribute('aria-label','HMC Algorithm · '+phase);

  const status=section.querySelector('.s2-status');
  const count=c.history.length;
  const history='Recorded states '+count.toLocaleString()+(count?' · Accepted '+num(100*c.accepted/count,1)+'%':'');
  if(!proposal){stat(root,history);return;}
  if(!decision){
   status.replaceChildren(
    document.createTextNode('Start H '+num(proposal.H0,3)+' · Trajectory H '+num(S2.H(position,progress.trajectory.p,c.rho),3)),
    document.createElement('br'),document.createTextNode(history)
   );
   return;
  }
  const result=document.createElement('strong');
  result.className=decision.accepted?'c-like':'c-post';
  if(progress)result.textContent=decision.accepted?'Will record the endpoint':'Will record the starting position';
  else result.textContent=decision.accepted?'Accepted · recorded endpoint':'Rejected · recorded starting position';
  status.replaceChildren(
   result,document.createTextNode(' · α = '+num(decision.alpha,4)),
   document.createElement('br'),
   document.createTextNode('Start H '+num(decision.H0,3)+' → End H '+num(decision.H1,3)+' · ΔH '+num(decision.delta,3)),
   document.createElement('br'),document.createTextNode(history)
  );
 });
 register('s2Mechanisms',1200,128,(root,svg)=>{
  ['Symmetric jump','General proposal','Conditional update','Hamiltonian path'].forEach((name,i)=>{const cx=150+300*i;text(svg,name,cx,20,C.pred,22);[1,1.7].forEach(r=>el(svg,'ellipse',{cx,cy:79,rx:r*40,ry:r*20,stroke:'#b4a7c9',fill:'none','stroke-width':1.5}));if(i===0){arrow(svg,cx-38,91,cx+40,58,C.prior,2.5);arrow(svg,cx+40,63,cx-38,96,C.postC,2.5);}if(i===1){arrow(svg,cx-40,90,cx+40,59,C.prior,4);arrow(svg,cx+38,69,cx-34,98,C.postC,1.5);}if(i===2){arrow(svg,cx-39,96,cx+15,96,C.prior,2.5);arrow(svg,cx+15,96,cx+15,59,C.postC,2.5);}if(i===3){const h=S2.leapEngine({q:[-1.5,-1],p:[1.2,.3],epsilon:.16});for(let j=0;j<18;j++)h.step();line(svg,h.path.map(q=>[cx+q[0]*34,78-q[1]*22]),C.like,3);}});
 });
 function redraw(section){section.querySelectorAll('.fig[data-fig]').forEach(root=>FIGS[root.dataset.fig].render(root,{}));sync(section);}
 function sync(section){
  if(section.id==='bivariate-gaussian')return;
  const m=model(section);
  section.querySelectorAll('[data-param]').forEach(input=>{
   const key=input.dataset.param;
   if(m[key]==null)return;
   input.value=m[key];
   const digits=['rho','epsilon','tau'].includes(key)?2:['fixed','position','momentum'].includes(key)?1:0;
   input.nextElementSibling.textContent=Number(input.value).toFixed(digits);
  });
  section.querySelectorAll('[data-do="horizontal"],[data-do="vertical"]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.do==='horizontal'?0:1)===m.direction)));
  if(section.id==='gibbs-practice'){
   section.querySelectorAll('[data-do]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.do===m.selected)));
  }
 }
 function advance(section,action){const id=section.id,m=model(section),n=action==='100'?100:action==='1000'?1000:1;
  if(id==='sampling-chain'){m.t=Math.min(3000,m.t+n);m.chain.ensure(m.t);}
  else if(id==='jump-size')m.chains.forEach(c=>c.run(n));
  else if(id==='random-walk'){m.steps=Math.min(m.steps+1,1000);}
  else if(id==='metropolis-gibbs'){m.met.run(n);m.g.run(n);}
  else if(id==='energy-momentum')m.t+=.09;
  else if(id==='hamiltonian-dynamics'){m.t+=.06;m.state=S2.exact(m.q0,m.p0,m.t,m.rho);m.path.push(m.state.q);}
  else if(id==='leapfrog'){
   do{leapfrogSubstep(m);}while(action!=='substep'&&m.eng.phase!==0);
  }
 }
 function hmcStage(m){
  const progress=m.hmcProgress;
  if(!progress)return m.hmc.last?4:0;
  if(progress.decision)return 3;
  return progress.trajectory.path.length>1?2:1;
 }
 function advanceHMC(m){
  const c=m.hmc,progress=m.hmcProgress;
  if(!progress){
   m.hmcProgress={trajectory:c.begin()};
   return;
  }
  if(progress.trajectory.path.length===1)c.generate(progress.trajectory);
  else if(!progress.decision)progress.decision=c.decide(progress.trajectory);
  else{
   c.record(progress.decision);
   m.hmcProgress=null;
  }
 }
 function showHMCStage(section){
  const fragment=hmcStage(model(section))-2;
  if(fragment>=0&&Reveal.getCurrentSlide()===section&&(Reveal.getIndices().f??-1)<fragment){
   Reveal.navigateFragment(fragment);
  }
  redraw(section);
 }
 function hmcAction(section,m,action){
  const pause=action==='run'&&section._s2hmcTimer;
  stop(section);
  if(pause)return;
  if(action==='reset')models.set(section.id,create(section.id));
  else if(action==='next')advanceHMC(m);
  else if(action==='100'){
   const remaining=m.hmcProgress?99:100;
   while(m.hmcProgress)advanceHMC(m);
   m.hmc.run(remaining);
  }
  else{
   const run=section.querySelector('[data-do="run"]');
   run.dataset.original=run.textContent;
   run.textContent='Pause';
   run.setAttribute('aria-pressed','true');
   const delays=[0,850,1050,1000,850];
   const speed=action==='run'?3:1;
   function tick(){
    if(Reveal.getCurrentSlide()!==section){stop(section);return;}
    advanceHMC(m);
    showHMCStage(section);
    const step=hmcStage(m);
    if(step===4&&action==='step')stop(section);
    else section._s2hmcTimer=setTimeout(tick,delays[step]/speed);
   }
   tick();
   return;
  }
  showHMCStage(section);
 }
 function gaussianGibbsAction(section,m,action){
  if(action==='reset'){
   models.set(section.id,create(section.id,{...m,inspect:false}));
   redraw(section);
   return;
  }
  if(m.pending)return;
  if(action==='horizontal'||action==='vertical'){
   m.direction=action==='horizontal'?0:1;
   if(!m.inspect)m.fixed=m.g.q[1-m.direction];
   m.inspect=true;
   redraw(section);
   return;
  }
  m.inspect=false;
  if(action==='100'||action==='1000'){
   m.g.run(Number(action));
   redraw(section);
   return;
  }
  const targetSweep=m.g.sweeps+1;
  const animate=!matchMedia('(prefers-reduced-motion: reduce)').matches;
  function coordinate(){
   const move=m.g.step();
   m.pending={...move,animate};
   redraw(section);
   function complete(){
    if(model(section)!==m)return;
    m.pending=null;
    if(action==='sweep'&&m.g.sweeps<targetSweep&&Reveal.getCurrentSlide()===section)coordinate();
    else redraw(section);
   }
   if(animate)setTimeout(complete,250);
   else complete();
  }
  coordinate();
 }
 document.addEventListener('click',event=>{const button=event.target.closest('.sampling2 [data-do]');if(!button)return;event.stopPropagation();const section=button.closest('section'),id=section.id,m=model(section),action=button.dataset.do;
  if(id==='bivariate-gaussian'){gaussianGibbsAction(section,m,action);return;}
  if(id==='hmc-algorithm'){hmcAction(section,m,action);return;}
  if(action==='run'||action==='trajectory'){
   if(section._s2timer){stop(section);return;}
   const trajectory=action==='trajectory';
   const finishStep=trajectory?m.eng.steps+m.L:null;
   button.dataset.original=button.textContent;
   button.textContent=trajectory?'Pause trajectory':'Pause';
   button.setAttribute('aria-pressed','true');
   section._s2timer=setInterval(()=>{
    if(Reveal.getCurrentSlide()!==section){stop(section);return;}
    advance(section,trajectory?'substep':'step');
    redraw(section);
    if((trajectory&&m.eng.steps>=finishStep)||
       (id==='random-walk'&&m.steps>=1000))stop(section);
   },trajectory?200:90);
   return;
  }
  stop(section);
  const animateDraw=id==='why-gibbs'&&action==='slice-draw';
  const startDot=animateDraw?section.querySelector('[data-gibbs-current]'):null;
  if(action==='reset'){models.set(id,create(id));}
  else if(id==='why-gibbs'&&action==='slice-draw'){
   const {mean,variance}=gaussianConditional(m.rho,m.q[1-m.direction]);
   m.q[m.direction]=mean+Math.sqrt(variance)*S2.normalPair(m.random)[0];
  }
  else if(['small','moderate','large'].includes(action)){models.set(id,create(id,{...m,tau:{small:.05,moderate:.6,large:3.5}[action]}));}
  else if(action==='starts')models.set(id,create(id,{...m,multi:!m.multi}));
  else if(action==='horizontal'||action==='vertical')m.direction=action==='horizontal'?0:1;
  else if(id==='gibbs-practice')m.selected=action;
  else advance(section,action);
  redraw(section);
  if(startDot&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const endDot=section.querySelector('[data-gibbs-current]');
   const dx=Number(startDot.getAttribute('cx'))-Number(endDot.getAttribute('cx'));
   const dy=Number(startDot.getAttribute('cy'))-Number(endDot.getAttribute('cy'));
   endDot.animate([{transform:`translate(${dx}px, ${dy}px)`},{transform:'translate(0, 0)'}],{duration:400,easing:'ease-in-out'});
  }
 });
 document.addEventListener('input',event=>{const input=event.target.closest('.sampling2 [data-param]');if(!input)return;event.stopPropagation();const section=input.closest('section'),id=section.id,m=model(section),key=input.dataset.param,value=Number(input.value);stop(section);
  if(id==='bivariate-gaussian'){
   if(key==='rho'&&value!==m.rho)models.set(id,create(id,{...m,rho:value}));
   if(key==='fixed'){
    if(!m.inspect)m.direction=m.g.next;
    m.fixed=value;
    m.inspect=true;
   }
   redraw(section);
   return;
  }
  m[key]=value;
  if(id==='sampling-chain')S2_CHAIN.select(m.chain,m.burn,m.thin,m.t);
  if(id==='energy-momentum')m.t=0;
  if(['jump-size','metropolis-gibbs','hmc-algorithm'].includes(id)||(id==='leapfrog'&&key==='epsilon'))models.set(id,create(id,m));
  redraw(section);
 });
 document.addEventListener('keydown',event=>{if(event.target.closest('.sampling2 input')||(event.target.closest('.sampling2 button')&&['Enter',' '].includes(event.key)))event.stopPropagation();});
 Reveal.on('slidechanged',event=>{if(event.previousSlide?.classList.contains('sampling2'))stop(event.previousSlide);if(event.currentSlide?.classList.contains('sampling2'))sync(event.currentSlide);});
 return {models,model,redraw,advance,stop};
})();
