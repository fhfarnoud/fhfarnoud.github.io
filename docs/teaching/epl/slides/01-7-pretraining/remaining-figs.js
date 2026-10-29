// Sections 2–7. Math models are explicit teaching examples except where the
// published Chinchilla fit is evaluated. No pretrained model is loaded.
(function () {
  const f = (x, d = 2) => Number(x).toFixed(d);
  const sm = (s, n = 19) => `<span style="font-size:${n}px">${s}</span>`;
  const softmaxT = (z, T = 1) => { const a = z.map(v => v / T), m = Math.max(...a), e = a.map(v => Math.exp(v - m)), s = e.reduce((x,y)=>x+y,0); return e.map(v=>v/s); };
  const A = 406.4, B = 410.7, E = 1.69, alpha = .34, beta = .28;
  const terms = (N,D) => [E,A/N**alpha,B/D**beta];
  const loss = (N,D) => terms(N,D).reduce((a,b)=>a+b,0);
  const budget = 6e22, K = budget/6;
  const optN = (alpha*A*K**beta/(beta*B))**(1/(alpha+beta));
  const short = v => v >= 1e12 ? f(v/1e12,2)+'T' : v >= 1e9 ? f(v/1e9,1)+'B' : f(v/1e6,0)+'M';

  function axes(g, Bx, o = {}) {
    const P = g.plot(Bx);
    P.line([Bx.xlo,Bx.ylo],[Bx.xhi,Bx.ylo],{color:C.axis});
    P.line([Bx.xlo,Bx.ylo],[Bx.xlo,Bx.yhi],{color:C.axis});
    (o.xt||[]).forEach(v=>P.text([v,Bx.ylo],o.xf?o.xf(v):v,{dy:24,size:17}));
    (o.yt||[]).forEach(v=>{
      P.line([Bx.xlo,v],[Bx.xhi,v],{color:C.grid});
      P.text([Bx.xlo,v],o.yf?o.yf(v):v,{dx:-9,dy:5,anchor:'end',size:17});
    });
    if(o.x)g.label((o.key||'ax')+'x',sm(o.x,18),[Bx.x0+Bx.W/2,Bx.y0+Bx.H+48],'c');
    if(o.y)g.label((o.key||'ax')+'y',sm(o.y,18),[Bx.x0-12,Bx.y0-29],'l');
    return P;
  }
  function bars(g,Bx,names,values,colors,opts={}) {
    const P=axes(g,Bx,{yt:opts.yt||[0,.5,1],yf:opts.yf,key:opts.key||'b'});
    values.forEach((v,i)=>{
      const col=Array.isArray(colors)?colors[i]:colors;
      P.bars([i+1],[v],{color:col||'pred',width:.58});
      P.text([i+1,v],opts.format?opts.format(v):f(v),{dy:-9,size:18,color:col||'pred'});
      P.text([i+1,Bx.ylo],names[i],{dy:25,size:19,color:col||'ink'});
    });
    return P;
  }
  function foot(g,key,s,y=463){g.label(key,sm(s,17),[285,y],'c',{color:'#666'});}

  FIGS.scaleLimits={size:[1200,340],draw(g){
    // x is a log10 coordinate: one unit is a tenfold increase, not a fixed increment.
    // These positive residuals and exponents are schematic, not the Chinchilla fit.
    const specs=[
      {x:65,title:'Effect of Model Size',fixed:'Training data $D$ fixed',color:C.pred,
       ticks:['0.1B','1B','10B','100B'],axis:'Model parameters ($N$)',exponent:.45,
       caption:'More parameters → Lower loss'},
      {x:695,title:'Effect of Training Data',fixed:'Model size $N$ fixed',color:C.like,
       ticks:['1B','10B','100B','1T'],axis:'Training tokens ($D$)',exponent:.40,
       caption:'More training data → Lower loss'}
    ];
    specs.forEach((o,j)=>{
      const cx=o.x+242.5,bx=box2d(o.x,55,485,175,0,3,1.6,4.2),P=g.plot(bx);
      g.label('title'+j,sm('<b>'+o.title+'</b>',25),[cx,13],'c',{color:'#463C7D'});
      g.label('fixed'+j,sm(o.fixed,20),[cx,42],'c',{color:o.color});
      g.text([o.x-47,142.5],'L (nats/token)',{size:22,transform:`rotate(-90 ${o.x-47} 142.5)`});
      // Dotted minor gridlines at 2–9 show the nonuniform spacing within each decade.
      for(let decade=0;decade<3;decade++)for(const m of [2,3,4,5,6,7,8,9]){
        const x=decade+Math.log10(m);
        P.line([x,1.6],[x,4.2],{color:'#9898a0',w:.8,dash:'1.5 2.5'});
      }
      [0,1,2,3].forEach((x,k)=>{
        P.line([x,1.6],[x,4.2],{color:'#777780',w:1.2});
        P.line([x,1.6],[x,1.55],{color:C.axis,w:1.2});
        P.text([x,1.6],o.ticks[k],{dy:26,size:20});
      });
      [2,3,4].forEach(y=>{
        P.line([0,y],[3,y],{color:'#e0e0e5',w:1});
        P.text([0,y],String(y),{dx:-12,dy:6,anchor:'end',size:20});
      });
      P.line([0,1.6],[3,1.6],{color:C.axis,w:1.5});
      P.line([0,1.6],[0,4.2],{color:C.axis,w:1.5});
      P.curve(x=>2.1+1.6*10**(-o.exponent*x),{color:o.color,w:3.5,from:0,to:3});
      g.label('x-axis'+j,sm(o.axis,22),[cx,277],'c');
      g.label('caption'+j,sm(o.caption+' (with diminishing returns).',20),[cx,302],'c',{color:o.color});
    });
    g.label('schematic',sm('Schematic trends; not measured training runs.',17),[600,330],'c',{color:'#666'});
  }};
  FIGS.powerLawAxes={size:[640,550],draw(g,p){
    const phase=p.phase??0,alpha=.35,x0=88,W=510,cx=x0+W/2;
    const drawPlot=log=>{
      const y0=log?330:40,H=log?155:150,j=log?1:0;
      const bx=box2d(x0,y0,W,H,log?0:1,log?2:100,log?-1:0,log?.05:1.05),P=g.plot(bx);
      const color=log?C.like:C.prior;
      g.label('kind'+j,sm('<b>'+(log?'Log–log axes':'Ordinary axes')+'</b>',23),[cx,log?302:12],'c',{color:'#463C7D'});
      const xt=log?[0,1,2]:[1,25,50,75,100],yt=log?[-1,0]:[0,.5,1];
      xt.forEach(x=>{
        P.line([x,bx.ylo],[x,bx.yhi],{color:'#dddde4',w:1});
        P.line([x,bx.ylo],[x,bx.ylo-(bx.yhi-bx.ylo)*.025],{color:C.axis,w:1});
        P.text([x,bx.ylo],String(x),{dy:24,size:19});
      });
      yt.forEach(y=>{
        P.line([bx.xlo,y],[bx.xhi,y],{color:'#e3e3e8',w:1});
        P.text([bx.xlo,y],String(y),{dx:-10,dy:6,anchor:'end',size:19});
      });
      P.line([bx.xlo,bx.ylo],[bx.xhi,bx.ylo],{color:C.axis,w:1.5});
      P.line([bx.xlo,bx.ylo],[bx.xlo,bx.yhi],{color:C.axis,w:1.5});
      P.curve(x=>log?-alpha*x:x**(-alpha),{color,w:3.5});
      const ym=y0+H/2;
      g.text([30,ym],log?'log₁₀ f(N)':'f(N)',{size:22,transform:`rotate(-90 30 ${ym})`});
      g.label('xlabel'+j,sm(log?'$\\log_{10}N$':'Model size $N$ (relative units)',21),[cx,log?533:238],'c');
      g.label('caption'+j,sm(log?'The same power law becomes a straight line in log–log coordinates.':'Model-size contribution to excess loss: diminishing returns.',18),[cx,log?560:264],'c',{color});
      if(log)P.label('slope',sm('slope $-\\alpha=-0.35$',20),[1.15,-.17],'c',{color});
    };
    drawPlot(false);
    if(phase>=.5)drawPlot(true);
  }};
  FIGS.chinchillaTerms={size:[540,450],draw(g,p){
    const N=10**p.ln,D=10**p.ld,v=terms(N,D),compare=p.compare||0,isData=compare>=1.5;
    const baseline=isData?terms(N,1e10):terms(1e9,D);
    const totalChange=100*(loss(N,D)/baseline.reduce((sum,value)=>sum+value,0)-1);
    const heading=compare>0
      ? isData ? `$N=${short(N)}\\;\\text{(fixed)},\\quad D=10.0B\\to${short(D)}$`
        : `$N=1.0B\\to${short(N)},\\quad D=${short(D)}\\;\\text{(fixed)}$`
      : `$N=${short(N)},\\quad D=${short(D)}$`;
    const term=isData?'Data':'Model',j=isData?2:1;
    g.label('nd',sm(heading,21),[285,25],'c');
    g.label('doubling',sm(`${term} term ×${f(v[j]/baseline[j],3)}; total loss ${totalChange<0?'−':'+'}${f(Math.abs(totalChange))}%`,18),[285,63],'c',{color:isData?C.like:C.prior,opacity:Math.min(1,compare)});
    const total=v.reduce((sum,value)=>sum+value,0),ymax=Math.max(3,Math.ceil(total));
    const colors=['mle','prior','like'];
    const P=bars(g,box2d(70,95,420,250,.5,4.5,0,ymax),['floor','model','data'],v,colors,
      {yt:Array.from({length:ymax+1},(_,j)=>j),key:'term'});
    let base=0;
    v.forEach((value,j)=>{
      // Each segment spans its own contribution, above the cumulative base.
      P.bars([4],[base+value],{base,color:colors[j],width:.58});
      base+=value;
    });
    P.text([4,total],f(total),{dy:-9,size:18,color:C.rose});
    P.text([4,0],'total loss',{dy:25,size:19});
    g.label('total',`$L\\approx${v.map(x=>f(x)).join('+')}\\approx${f(loss(N,D))}$`,[285,399],'c',{color:C.rose});
    foot(g,'fit','Published fit, evaluated at the chosen N and D.',441);
  }};
  FIGS.computeBalance={size:[720,380],draw(g,p){
    const phase=p.phase??0,N=10**p.ln,D=K/N;
    const isOptimal=phase>2.5&&Math.abs(p.ln-Math.log10(optN))<1e-8;
    const pointColor=isOptimal?C.like:C.rose;
    const human=v=>v>=1e12?f(v/1e12,1)+'T':v>=1e11?f(v/1e9,0)+'B':v>=1e9?f(v/1e9,1)+'B':f(v/1e6,0)+'M';
    const slide=g.root.closest('section');
    if(slide){
      const values={choice:isOptimal?'Optimal (green)':'Selected (red)',
        N:human(N),D:human(D),L:f(loss(N,D)),'slider-N':human(N)+' parameters'};
      const row=slide.querySelector('[data-compute-row]');
      if(row)row.className=isOptimal?'compute-opt-row':'compute-selected-row';
      const output=slide.querySelector('[data-compute="slider-N"]');
      if(output)output.style.color=pointColor;
      for(const [key,value] of Object.entries(values)){
        const cell=slide.querySelector(`[data-compute="${key}"]`);if(cell)cell.textContent=value;
      }
      const input=slide.querySelector('#compute-model-size');
      if(input){
        input.value=p.ln;
        input.setAttribute('aria-valuetext',values['slider-N']);
        if(!PRINT&&!g.root._computeControlBound){
          g.root._computeControlBound=true;
          input.addEventListener('input',()=>{
            const st=live.get(g.root)||{};cancelAnimationFrame(st.raf);
            const next={...(st.p||stateFor(g.root)),ln:+input.value};
            FIGS.computeBalance.render(g.root,next);st.p=next;live.set(g.root,st);
          });
          input.addEventListener('keydown',e=>e.stopPropagation());
        }
      }
    }
    g.label('budget',sm('$C=6\\times10^{22}\\;\\text{FLOPs}$',22),[375,18],'c',{color:'#463C7D'});
    if(phase<.5)return;
    const bx=box2d(75,68,600,220,8,12,1.8,3.2),P=g.plot(bx);
    const xt=[8,9,10,11,12],yt=[2,2.5,3];
    xt.forEach((x,j)=>{
      P.line([x,1.8],[x,3.2],{color:'#e2e2e8',w:1});
      P.text([x,1.8],['0.1B','1B','10B','100B','1T'][j],{dy:25,size:20});
    });
    yt.forEach(y=>{
      P.line([8,y],[12,y],{color:'#e2e2e8',w:1});
      P.text([8,y],String(y),{dx:-12,dy:6,anchor:'end',size:20});
    });
    P.line([8,1.8],[12,1.8],{color:C.axis,w:1.5});
    P.line([8,1.8],[8,3.2],{color:C.axis,w:1.5});
    g.label('ylabel',sm('Predicted validation loss $L$ (nats/token)',20),[375,46],'c');
    g.label('xlabel',sm('Model parameters $N$ (log scale)',22),[375,337],'c');
    P.curve(x=>loss(10**x,K/10**x),{color:'pred',w:3.5});
    P.label('capacity',sm('Capacity-limited',20),[8.85,2.97],'c',{color:C.prior});
    P.label('data',sm('Data-limited',20),[11.2,2.97],'c',{color:C.like});
    P.dot([p.ln,loss(N,D)],{color:pointColor,r:8});
    P.label('choice',sm(isOptimal?'Optimal':'Selected',19),[p.ln,loss(N,D)],isOptimal?'b':p.ln>11?'r':'l',
      {dx:isOptimal?0:p.ln>11?-12:12,dy:isOptimal?-13:-19,color:pointColor});

  }};
  FIGS.gopherChinchilla={size:[540,535],draw(g,p){
    const phase=p.phase??0,x=155,W=285;
    const charts=[
      {title:'Parameters (billions)',y:28,max:280,values:[280,70],labels:['280B','70B'],ticks:[0,140,280]},
      {title:'Training tokens (billions)',y:206,max:1400,values:[300,1400],labels:['300B','1,400B'],ticks:[0,700,1400]},
      {title:'MMLU accuracy (%) · 5-shot',y:386,max:100,values:[60,67.5],labels:['60.0%','67.5%'],ticks:[0,50,100]}
    ];
    charts.forEach((c,j)=>{
      if(phase<j-.5)return;
      g.label('title'+j,sm(c.title,23),[28,c.y],'l',{color:'#463C7D'});
      [['Gopher',C.prior],['Chinchilla',C.like]].forEach(([name,color],k)=>{
        const y=c.y+38+k*40,v=c.values[k];
        g.label('name'+j+k,sm(name,20),[28,y],'l',{color});
        g.el('rect',{x,y:y-12,width:W*v/c.max,height:24,fill:color,'fill-opacity':.55});
        g.label('value'+j+k,sm(c.labels[k],20),[x+W*v/c.max+10,y],'l',{color});
      });
      const axis=c.y+96;
      g.line([x,axis],[x+W,axis],{color:'#b5b5be',w:1});
      c.ticks.forEach(v=>{
        const xx=x+W*v/c.max;
        g.line([xx,axis],[xx,axis+4],{color:'#b5b5be',w:1});
        g.text([xx,axis+23],String(v)+(j===2?'%':''),{size:16,color:'#666'});
      });
    });
  }};

  FIGS.exactMatch={size:[540,465],duration:2500,linear:true,draw(g,p){
    const len=Math.max(1,Math.round(p.len)),b=box2d(70,60,420,260,.5,1,0,1),P=axes(g,b,{xt:[.5,.6,.7,.8,.9,1],yt:[0,.5,1],x:'Per-step correctness $p$',y:'Whole-task success probability'});
    P.curve(x=>x,{color:'mle',dash:true,w:2});P.curve(x=>x**len,{color:'rose'});
    [.9,.95,.98].forEach((x,i)=>{P.dot([x,x**len],{color:'rose',r:5});P.label('n'+i,sm(f(x**len,3),17),[x,x**len],i===0?'r':'l',{dx:i===0?-9:8,dy:i===1?17:-13,color:C.rose});});
    g.label('which',`$\\ell=${len}:\\quad P(\\text{success})=p^{${len}}$`,[285,410],'c',{color:C.rose});
    foot(g,'dash','Dashed: one-step accuracy. Solid: all steps correct.',453);
  }};
  // Fixed-length, fully normalized toy tree; no empirical model outputs.
  FIGS.greedyBeam={size:[700,490],draw(g,p){
    const phase=p.phase??0,beam=phase>=.5,compare=phase>=1.5;
    g.label('fixed',sm('Two-token sequences (fixed length)',21),[350,20],'c',{color:'#463C7D'});
    const node=(key,x,y,s,color)=>token(g,key,x,y,s,{w:s==='start'?86:60,h:40,color,active:true});
    const edge=(x1,y1,x2,y2,color,w=2)=>g.arrow([x1,y1],[x2,y2],{color,w,head:8});
    edge(113,235,253,130,C.prior,3);edge(113,235,253,350,beam?C.like:'#aaa',beam?3:1.5);
    edge(315,130,490,65,C.prior,3);edge(315,130,490,185,'#aaa',1.5);
    g.label('pa','$P(A)=0.6$',[180,125],'c',{color:C.prior});
    g.label('pb','$P(B)=0.4$',[180,360],'c',{color:beam?C.like:'#777'});
    g.label('ax','$0.55$',[399,82],'c',{color:C.prior});g.label('az','$0.45$',[399,173],'c',{color:'#777'});
    node('root',70,235,'start',C.mle);node('a',285,130,'A',C.prior);node('b',285,350,'B',beam?C.like:'#999');
    node('x',520,65,'X',C.prior);node('z',520,185,'Z','#999');
    if(beam){
      edge(315,350,490,300,C.like,3);edge(315,350,490,430,'#aaa',1.5);
      g.label('by','$0.95$',[399,308],'c',{color:C.like});g.label('bw','$0.05$',[399,412],'c',{color:'#777'});
      node('y',520,300,'Y',C.like);node('w',520,430,'W','#999');
    }
    const paths=[['AX',.33,65,C.prior],['AZ',.27,185,'#777'],['BY',.38,300,C.like],['BW',.02,430,'#777']];
    paths.forEach(([name,prob,y,color],i)=>{if(i>1&&!beam)return;g.label('score'+i,compare?sm(`$P(${name})=${f(prob)}$`,22):sm(name,22),[565,y],'l',{color});});
    g.label('status',sm(compare?'Beam finds BY: 0.38 > 0.33':beam?'Beam width b = 2 retains both A and B':'Greedy follows A → X',22),[350,478],'c',{color:compare?C.like:C.prior});
  }};

  const tz=[Math.log(.5),Math.log(.3),Math.log(.2)];
  FIGS.temperatureDemo={size:[600,470],draw(g,p){
    const q=softmaxT(tz,p.temp),bx=box2d(75,85,470,250,.5,3.5,0,1),P=axes(g,bx,{yt:[0,.5,1],y:'Probability'});
    g.label('temp',sm(`Sampling distribution: $T=${f(p.temp)}$`,25),[310,25],'c',{color:C.pred});
    q.forEach((v,i)=>{P.bars([i+1],[v],{color:'pred',width:.58});P.text([i+1,v],f(v,3),{dy:-10,size:23,color:C.pred});P.text([i+1,0],['rain','snow','clear'][i],{dy:30,size:23});});
    g.label('logits',sm('Fixed logits: $(\\log 0.5,\\;\\log 0.3,\\;\\log 0.2)$',21),[310,407],'c',{color:'#555'});
    g.label('fixed',sm('Changing T does not update neural weights.',21),[310,450],'c',{color:'#463C7D'});
  }};
  const original=[.40,.25,.15,.10,.06,.04];
  function truncate(k,p){
    let n=0,s=0;while(n<original.length&&s<p-1e-12)s+=original[n++];
    const normal=m=>{const z=original.slice(0,m).reduce((a,b)=>a+b,0);return original.map((v,i)=>i<m?v/z:0);};
    return{topk:normal(k),topp:normal(n),n,mass:s,kmass:original.slice(0,k).reduce((a,b)=>a+b,0)};
  }
  FIGS.truncationDemo={size:[620,475],draw(g,p){
    const k=Math.max(1,Math.min(6,Math.round(p.k))),q=truncate(k,p.nucleus),nucleus=p.mode>=.5;
    const n=nucleus?q.n:k,mass=nucleus?q.mass:q.kmass,prob=nucleus?q.topp:q.topk;
    const title=nucleus?`Nucleus $p=${f(p.nucleus)}$`:`Top-$k$: $k=${k}$`;
    g.label('mode',sm(title,26),[310,22],'c',{color:nucleus?C.like:C.prior});
    g.label('retained',sm('Retained',20),[235,60],'c',{color:nucleus?C.like:C.prior});
    g.label('excluded',sm('Excluded',20),[390,60],'c',{color:'#999'});
    const b=box2d(75,105,480,185,.5,6.5,0,.55),P=axes(g,b,{yt:[0,.25,.5]});
    original.forEach((v,i)=>{
      const color=i<n?(nucleus?C.like:C.prior):'#b9b9bf';
      P.bars([i+1],[v],{color,width:.62});P.text([i+1,v],f(v),{dy:-9,size:21,color});
      P.text([i+1,0],String.fromCharCode(65+i),{dy:28,size:23,color});
    });
    if(n<6)P.line([n+.5,0],[n+.5,.55],{color:nucleus?C.like:C.prior,w:2,dash:'5 4'});
    if(nucleus){
      let cum=0;g.label('cum-title',sm('Cum.',18),[65,347],'r',{color:C.like});
      original.forEach((v,i)=>{cum+=v;g.text([115+80*i,347],f(cum),{size:20,color:i<n?C.like:'#999'});});
    }
    g.label('renormalize',sm('Zero excluded tokens, renormalize, then sample.',21),[310,380],'c',{color:'#463C7D'});
    g.label('q-title','$q_i$',[65,418],'r',{color:C.pred});
    prob.forEach((v,i)=>g.text([115+80*i,418],f(v,3),{size:21,color:i<n?C.pred:'#aaa'}));
    g.label('mass',sm(`${n} candidates; retained original mass ${f(mass)}; $\\sum_iq_i=1$.`,20),[310,463],'c',{color:'#555'});
  }};
  function choose(n,k){let x=1;for(let j=1;j<=k;j++)x=x*(n-j+1)/j;return x;}
  const coinPMF=k=>choose(100,k)*.1**k*.9**(100-k);
  FIGS.coinTypicality={size:[680,500],draw(g,p){
    const phase=p.phase??0,typical=phase>=.5,tails=new Set([3,17,24,36,45,59,63,72,88,95]);
    g.label('colors',sm('Each dot is one flip: blue H, pink T.',20),[340,18],'c',{color:'#555'});
    const grid=(cx,tailSet)=>{for(let i=0;i<100;i++)g.el('circle',{cx:cx-81+(i%10)*18,cy:90+Math.floor(i/10)*18,r:6.4,fill:tailSet.has(i)?C.rose:C.prior});};
    g.label('mode-title',sm('<b>100 H, 0 T</b>',25),[175,59],'c',{color:C.prior});grid(175,new Set());
    g.label('mode-prob','$\\begin{gathered}P(H^{100})=0.9^{100}\\\\\\approx2.66\\times10^{-5}\\end{gathered}$',[175,305],'c',{color:C.prior});
    if(typical){
      g.label('typ-title',sm('<b>90 H, 10 T</b>',25),[510,59],'c',{color:C.like});grid(510,tails);
      g.label('single-prob',sm('$\\begin{gathered}P(\\text{this sequence})=0.9^{90}0.1^{10}\\\\\\approx7.62\\times10^{-15}\\end{gathered}$',20),[510,305],'c',{color:C.like});
      g.label('many',sm('$\\binom{100}{10}\\approx1.73\\times10^{13}$ distinct sequences with 10 tails',22),[340,380],'c',{color:C.like});
      g.label('event',sm('$P(K=10)=\\binom{100}{10}(0.1)^{10}(0.9)^{90}\\approx0.132$',23),[340,430],'c',{color:C.pred});
      g.label('sum',sm('An event probability sums over all these sequences.',21),[340,480],'c',{color:'#555'});
    }
  }};

  FIGS.fixedWeights={size:[540,470],draw(g){
    g.label('context','Context',[60,35],'l',{color:C.prior});
    token(g,'x',130,85,'query x',{w:140});token(g,'dx',350,85,'D + query x',{w:210});
    g.arrow([130,115],[210,170],{color:C.prior,w:2});g.arrow([350,115],[300,170],{color:C.prior,w:2});
    box(g,'fixed',65,180,410,110,'The same transformer','neural weights $\\theta$ stay fixed',C.postC);
    g.arrow([205,300],[150,352],{color:C.pred,w:2});g.arrow([315,300],[385,352],{color:C.pred,w:2});
    g.label('p0','$p_\\theta(y\\mid x)$',[145,385],'c',{color:C.pred});g.label('pd','$p_\\theta(y\\mid\\mathcal D,x)$',[380,385],'c',{color:C.pred});
    foot(g,'different','Different context → different activations and predictions.',450);
  }};
  FIGS.bayesTask={size:[540,460],draw(g){
    const ys=[40,170,300],titles=['Prior over tasks','Posterior over tasks','Posterior predictive'],math=['$p(\\Theta)$','$p(\\Theta\\mid\\mathcal D)$','$p(y\\mid x,\\mathcal D)$'],cols=[C.prior,C.post,C.pred];
    ys.forEach((y,i)=>{box(g,'task'+i,65,y,410,85,titles[i],math[i],cols[i]);if(i<2)g.arrow([270,y+91],[270,y+122],{color:cols[i+1],w:2});});
    foot(g,'distinction','Task uncertainty changes; the inference rule can stay fixed.',439);
  }};
  const logFactorial=n=>{let s=0;for(let i=2;i<=n;i++)s+=Math.log(i);return s;};
  function betaPDF(x,a,b){if(x<=0)return a===1?b:0;if(x>=1)return b===1?a:0;return Math.exp((a-1)*Math.log(x)+(b-1)*Math.log1p(-x)+logFactorial(a+b-1)-logFactorial(a-1)-logFactorial(b-1));}
  function betaPlot(g,a,b,opts={}){
    const max=Math.max(1,...Array.from({length:201},(_,i)=>betaPDF(i/200,a,b))), ymax=opts.ymax||Math.ceil(max*1.2*2)/2;
    const bx=box2d(70,opts.y||100,420,opts.h||250,0,1,0,ymax),P=axes(g,bx,{xt:[0,.25,.5,.75,1],yt:[0,ymax/2,ymax],yf:v=>f(v,1),x:'task parameter Θ = probability of heads',y:'probability density',key:'beta'});
    P.curve(x=>1,{color:'prior',dash:true,w:2});
    if(opts.posterior!==false)P.curve(x=>betaPDF(x,a,b),{color:'post',w:3.5});
    return {P,bx,ymax};
  }
  FIGS.betaPosterior={size:[540,490],draw(g,p){
    ['H','H','T','H'].forEach((s,i)=>token(g,'coin'+i,140+85*i,30,s,{w:58,color:s==='H'?C.prior:C.rose}));
    const op=clamp(p.s||0);const {P}=betaPlot(g,4,2,{y:140,h:230,ymax:2.6,posterior:false});
    P.curve(x=>betaPDF(x,4,2),{color:'post',w:3.5,opacity:op});
    g.label('prior',sm('prior: Beta(1,1)',19),[150,80],'c',{color:C.prior});
    g.label('posterior',sm('posterior: Beta(4,2)',19),[365,80],'c',{color:C.post,opacity:op});
    foot(g,'onecoin','All four observations come from the same unknown coin.',461);
  }};
  FIGS.betaPredictive={size:[540,450],draw(g,p){
    const h=Math.round(p.heads),t=Math.round(p.tails),a=1+h,b=1+t,mean=a/(a+b);
    g.label('post',`$\\Theta\\mid\\mathcal D\\sim\\operatorname{Beta}(${a},${b})$`,[285,28],'c',{color:C.post});
    const {P,ymax}=betaPlot(g,a,b,{y:88,h:200});
    P.line([mean,0],[mean,ymax],{color:'pred',dash:true,w:1.5});
    g.label('mean',sm(`predictive heads probability = ${f(mean,3)}`,19),[285,362],'c',{color:C.pred});
    g.el('rect',{x:75,y:390,width:420*mean,height:30,fill:C.prior});
    g.el('rect',{x:75+420*mean,y:390,width:420*(1-mean),height:30,fill:C.rose});
    g.text([75+210*mean,411],'H',{color:'#fff',size:19});g.text([75+420*mean+210*(1-mean),411],'T',{color:'#fff',size:19});
  }};
  FIGS.learnedInference={size:[540,480],draw(g){
    g.label('many','Pretraining: many tasks',[285,25],'c',{color:C.prior});
    [['coin 1','H H H T H'],['coin 2','T T H T T'],['coin 3','H T H T H']].forEach(([a,b],i)=>{g.label('c'+i,sm(a,19),[55,75+i*42],'l');g.text([330,82+i*42],b,{color:C.prior,size:21,'font-family':MONO});});
    g.arrow([285,185],[285,220],{color:C.postC,w:2});
    box(g,'rule',65,235,410,100,'Learn a shared predictor','parameters $\\theta$',C.postC);
    g.label('new',sm('New context: H H T H → next flip?',21),[285,383],'c');
    g.label('pred',sm('Idealized Bayes prediction: 2/3 heads',21),[285,432],'c',{color:C.pred});
  }};
  FIGS.ambiguousRule={size:[540,470],draw(g){
    const bx=box2d(70,75,420,255,0,3.3,0,10),P=axes(g,bx,{xt:[0,1,2,3],yt:[0,2,4,6,8,10],x:'input x',y:'predicted output'});
    P.curve(x=>2*x,{color:'prior'});P.curve(x=>x*x-x+2,{color:'rose'});
    [[1,2],[2,4]].forEach(pt=>P.dot(pt,{color:'ink',r:7}));
    P.dot([3,6],{color:'prior',r:6});P.dot([3,8],{color:'rose',r:6});
    P.label('six','$6$',[3,6],'l',{dx:10,color:C.prior});P.label('eight','$8$',[3,8],'l',{dx:10,color:C.rose});
    g.label('f','$f(x)=2x$',[155,420],'c',{color:C.prior});g.label('g','$g(x)=x^2-x+2$',[380,420],'c',{color:C.rose});
    foot(g,'given','Black points: demonstrations; colored points: query predictions.',460);
  }};

  FIGS.goodTuring={size:[540,510],draw(g){
    g.label('title',sm('Frequency of frequencies',23),[285,32],'c');
    g.label('rh',sm('times seen r',19),[140,96],'c');g.label('nh',sm('number of symbols Nᵣ',19),[365,96],'c');
    [[1,120],[2,80],[3,60],[10,54]].forEach(([r,n],i)=>{
      const y=145+51*i,col=i===0?C.rose:C.ink;
      g.text([140,y],r,{size:23,color:col});g.text([365,y],n,{size:23,color:col});
    });
    g.line([70,321],[490,321],{color:C.axis});
    g.label('total','$n=120+160+180+540=1000$',[285,354],'c');
    g.label('unseen','$\\widehat P(\\text{unseen})=120/1000=0.12$',[285,410],'c',{color:C.rose});
    g.label('interpretation',sm('Approximately 12% of the probability mass is estimated<br>to lie on previously unseen symbols.',19),[285,461],'c',{color:C.rose});
    foot(g,'iid','Constructed frequency table for a discrete IID sample.',506);
  }};
  // Historical headline retrieval rates from Berglund et al., §2.2;
  // reverse evaluation is conditioned on the forward-retrieved pairs.
  FIGS.reversalAccuracy={size:[540,545],draw(g){
    g.label('title',sm('<b>Historical GPT-4 celebrity experiment</b>',22),[285,25],'c',{color:'#463C7D'});
    g.label('historical',sm('Berglund et al. (2023/2024), §2.2',19),[285,55],'c',{color:'#666'});
    const P=axes(g,box2d(70,110,420,245,.3,2.7,0,100),{
      yt:[0,20,40,60,80,100],yf:v=>v+'%',y:'Reported accuracy (%)',key:'reversal'
    });
    [[1,79,C.prior,'Forward','Celebrity → parent'],[2,33,C.rose,'Reverse','Parent → celebrity']].forEach(([x,v,col,name,direction],i)=>{
      P.bars([x],[v],{color:col,width:.62});
      P.text([x,v],v+'%',{dy:-12,size:28,color:col});
      P.text([x,0],name,{dy:30,size:23,color:col});
      P.label('direction'+i,sm(direction,19),[x,0],'c',{dy:62,color:col});
    });
    g.label('protocol',sm('Reverse: ≥1 success in 10 attempts on forward-retrieved pairs.',16),[285,448],'c',{color:'#666'});
    g.label('dated',sm('Historical findings; not current GPT-4 performance.',17),[285,479],'c',{color:'#666'});
    g.label('recreated',sm('Recreated from Berglund et al. (2024), Section 2.2;<br>not an original paper figure.',17),[285,521],'c',{color:'#666'});
  }};

  // ICL scientific narrative: conceptual diagrams and exact Bayesian example.
  // Published experimental plots remain separate, unchanged paper assets.
  FIGS.iclDiscovery={size:[600,430],draw(g,p){
    const phase=p.phase??0;
    box(g,'context',35,20,305,90,'Prompt examples',phase>=1?'$\\mathcal D_k$':'Loved it. → POS',C.prior);
    box(g,'query',370,20,195,90,'New query',phase>=1?'$x_*$':'delightful film',C.like);
    g.label('contexts',sm(phase>=1?'$\\mathcal D_k$':'Loved it. → POS',22),[187.5,87],'c',{color:C.prior});
    g.label('querys',sm(phase>=1?'$x_*$':'delightful film',22),[467.5,87],'c',{color:C.like});
    g.arrow([187,115],[245,178],{color:C.prior,w:2.5});g.arrow([467,115],[360,178],{color:C.like,w:2.5});
    box(g,'predictor',85,185,430,100,'Pretrained transformer',phase>=1?'$F_\\theta$':'next-token predictions',C.pred);
    g.label('predictors',sm(phase>=1?'$F_\\theta$':'next-token predictions',22),[300,257],'c',{color:C.pred});
    g.arrow([300,292],[300,330],{color:C.pred,w:2.5});
    g.label('answer',sm(phase>=1?'Predicted answer: $\\hat y_*=$ POS':'Predicted answer: POS',26),[300,360],'c',{color:C.pred});
    if(phase>=1.5)g.label('fixed',sm('Fixed $\\theta$: no gradient updates',25),[300,414],'c',{color:C.pred});
  }};
  FIGS.iclLatentConcept={size:[1200,270],draw(g,p){
    const phase=p.phase??0;
    g.label('pretrain',sm('During pretraining',26),[300,18],'c',{color:C.postC});
    box(g,'concept',15,66,190,78,'Underlying topic','biography',C.prior);
    g.arrow([211,105],[252,105],{color:C.prior,w:2.5});
    g.el('rect',{x:260,y:55,width:330,height:145,rx:9,fill:C.prior,'fill-opacity':.045,stroke:C.prior,'stroke-width':1.5});
    g.label('doc',sm('One coherent document',23),[425,80],'c',{color:C.prior});
    g.label('line1',sm('Ada Lovelace was British.',22),[425,126],'c');
    g.label('line2',sm('Her notes described a program ...',21),[425,166],'c');
    g.label('predict',sm('Earlier text helps predict later tokens.',23),[305,246],'c',{color:C.postC});
    if(phase>=1.5){
      g.label('prompt',sm('During few-shot prompting',26),[910,18],'c',{color:C.pred});
      box(g,'shared',640,66,170,78,'Underlying task','name → nationality',C.like);
      g.arrow([815,105],[855,105],{color:C.like,w:2.5});
      g.label('demo1',sm('Ada Lovelace → British',23),[1015,80],'c');
      g.label('demo2',sm('Niels Bohr → Danish',23),[1015,125],'c');
      g.label('query',sm('Marie Curie → ?',23),[1015,170],'c',{color:C.like});
      g.label('infer',sm('Use the shared task to predict a continuation.',22),[910,246],'c',{color:C.pred});
    }
  }};
  FIGS.iclBayesianCoin={size:[640,400],draw(g,p){
    const phase=p.phase??0,h=Math.round(p.heads),t=Math.round(p.tails),a=h+1,b=t+1,mean=a/(a+b);
    g.label('counts',sm(phase<.5?'Before observations':`Context: ${h} head${h===1?'':'s'}, ${t} tail${t===1?'':'s'}`,24),[335,20],'c');
    const max=phase<.5?1:Math.max(1,...Array.from({length:201},(_,i)=>betaPDF(i/200,a,b))),ymax=Math.ceil(max*1.15*2)/2;
    const bx=box2d(72,105,530,195,0,1,0,ymax),P=axes(g,bx,{xt:[0,.25,.5,.75,1],yt:[0,ymax/2,ymax],yf:v=>f(v,2).replace(/\.?0+$/,''),x:"Coin's heads probability Θ"});
    P.curve(x=>1,{color:'prior',dash:true,w:2});
    g.text([22,220],'Probability density',{size:18,color:'#555',transform:'rotate(-90 22 220)'});
    g.label('prior',sm('Prior: Beta(1,1)',22),[190,70],'c',{color:C.prior});
    if(phase>=.5){P.curve(x=>betaPDF(x,a,b),{color:'post',w:3.5});g.label('posterior',sm(`Posterior: Beta(${a},${b})`,22),[460,70],'c',{color:C.post});}
    if(phase>=1.5){P.line([mean,0],[mean,ymax],{color:'pred',dash:true,w:2});g.label('predictive',sm(`$P(H_{\\rm next}\\mid\\mathcal D)=(${h}+1)/(${h+t}+2)\\approx${f(mean,3)}$`,23),[335,385],'c',{color:C.pred});}
  }};
  FIGS.iclAttentionComputation={size:[700,230],draw(g){
    g.label('examples',sm('Examples',24),[98,28],'c',{color:C.prior});
    g.label('data',sm('$(x_i,y_i)$',25),[98,74],'c',{color:C.prior});
    g.label('query',sm('Query $x_*$',24),[98,178],'c',{color:C.like});
    g.arrow([183,74],[257,117],{color:C.prior,w:2.5});g.arrow([183,178],[257,132],{color:C.like,w:2.5});
    box(g,'linear',265,75,240,100,'Linear attention','compare, weight, add',C.pred);
    g.arrow([514,125],[571,125],{color:C.pred,w:2.5});
    g.label('prediction',sm('Prediction',24),[635,87],'c',{color:C.pred});
    g.label('output',sm('$\\hat y_*$',28),[635,138],'c',{color:C.pred});
    g.label('mapping',sm('query $x_*$ · keys $x_i$ · values $\\eta y_i/k$',23),[350,222],'c',{color:C.pred});
  }};
  FIGS.iclMechanismSynthesis={size:[1200,235],draw(g){
    g.label('input',sm('Examples in the prompt',25),[600,12],'c',{color:C.postC});
    const xs=[210,600,990],cs=[C.prior,C.like,C.pred],names=['Task recognition','Statistical inference','Implicit optimization'],refs=['Min (2022); Pan (2023)','Xie (2022); Riechers (2025)','von Oswald (2023); Akyürek (2023)'];
    xs.forEach((x,i)=>{
      g.arrow([600+(i-1)*70,39],[x,74],{color:cs[i],w:2});
      g.label('name'+i,sm(names[i],25),[x,101],'c',{color:cs[i]});
      g.label('ref'+i,sm(refs[i],18),[x,139],'c',{color:'#666'});
      g.arrow([x,162],[600+(i-1)*180,195],{color:cs[i],w:2});
    });
    g.label('output',sm('Context-dependent predictions with fixed pretrained weights',25),[600,222],'c',{color:C.postC});
  }};

  // Expose the explicit math for numerical review and reproducible figures.
  window.PRETRAINING_MATH={terms,loss,optN,computeBudget:budget,softmaxT,truncate,coinPMF,betaPDF,choose};
})();
