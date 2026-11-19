/* Pure numerical models. The presentation never regenerates a model on redraw. */
const S2 = (() => {
 const rng = seed => {let a=seed; return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};};
 const normalPair = r => {const a=Math.sqrt(-2*Math.log(1-r())),t=2*Math.PI*r();return [a*Math.cos(t),a*Math.sin(t)];};
 const copy = q=>q.slice(), grad=(q,rho=.8)=>[(q[0]-rho*q[1])/(1-rho*rho),(q[1]-rho*q[0])/(1-rho*rho)];
 const E=(q,rho=.8)=>{const g=grad(q,rho);return (q[0]*g[0]+q[1]*g[1])/2;};
 const K=p=>(p[0]*p[0]+p[1]*p[1])/2, H=(q,p,rho=.8)=>E(q,rho)+K(p);
 function logisticData(){const r=rng(20261119),out=[];for(let i=0;i<60;i++){const x=-2+4*i/59;out.push({x,y:r()<1/(1+Math.exp(1-2*x))?1:0});}for(let i=0;i<940;i++){const x=-2+4*i/939;out.push({x,y:r()<1/(1+Math.exp(1-2*x))?1:0});}return out;}
 const data=logisticData();
 const logPosterior=q=>{let v=-(q[0]*q[0]+q[1]*q[1])/50;for(const {x,y} of data){const z=q[0]+q[1]*x;v+=y*z-Math.max(z,0)-Math.log1p(Math.exp(-Math.abs(z)));}return v;};
 function metropolis({rho=.8,tau=.6,start=[2.5,-2.5],seed=121,logp}={}){
  const r=rng(seed),target=logp|| (q=>-E(q,rho));
  const m={q:copy(start),history:[],moves:[],accepted:0,distance:0,rho,tau,start:copy(start)};let lp=target(m.q);
  m.step=()=>{const from=copy(m.q),z=normalPair(r),proposal=from.map((x,j)=>x+m.tau*z[j]),next=target(proposal),logAlpha=Math.min(0,next-lp),u=r(),accepted=Number.isFinite(next)&&Math.log(u)<=logAlpha;
   if(accepted){m.q=copy(proposal);lp=next;m.accepted++;m.distance+=(proposal[0]-from[0])**2+(proposal[1]-from[1])**2;}
   const move={from,proposal,to:copy(m.q),accepted,alpha:Math.exp(logAlpha),u};m.moves.push(move);m.history.push(copy(m.q));m.last=move;return move;};
  m.run=n=>{for(let i=0;i<n;i++)m.step();return m;};return m;
 }
 function gibbs({rho=.8,start=[2.5,-2.5],seed=321}={}){
  const r=rng(seed),m={rho,q:copy(start),start:copy(start),history:[],path:[copy(start)],coordinates:0,sweeps:0,next:0};
  m.step=()=>{const j=m.next,from=copy(m.q),z=normalPair(r)[0];m.q[j]=m.rho*m.q[1-j]+Math.sqrt(1-m.rho*m.rho)*z;m.next=1-j;m.coordinates++;m.last={from,to:copy(m.q),j};m.path.push(copy(m.q));if(m.next===0){m.sweeps++;m.history.push(copy(m.q));}return m.last;};
  m.sweep=()=>{do{m.step();}while(m.next!==0);};m.run=n=>{for(let i=0;i<n;i++)m.sweep();return m;};return m;
 }
 function leap(q,p,epsilon,rho=.8){q=copy(q);p=copy(p);let g=grad(q,rho);p=p.map((x,j)=>x-epsilon*g[j]/2);q=q.map((x,j)=>x+epsilon*p[j]);g=grad(q,rho);p=p.map((x,j)=>x-epsilon*g[j]/2);return {q,p};}
 function leapEngine({epsilon=.2,rho=.8,q=[-1.5,-1],p=[1.2,.2]}={}){
  const m={q:copy(q),p:copy(p),epsilon,rho,phase:0,steps:0,path:[copy(q)],H0:H(q,p,rho)};
  m.substep=()=>{const phase=m.phase;if(phase===1){m.q=m.q.map((x,j)=>x+m.epsilon*m.p[j]);m.path.push(copy(m.q));}else {const g=grad(m.q,rho);m.p=m.p.map((x,j)=>x-m.epsilon*g[j]/2);}m.phase=(phase+1)%3;if(m.phase===0)m.steps++;return m;};
  m.step=()=>{do{m.substep();}while(m.phase!==0);return m;};return m;
 }
 function exact(q0,p0,t,rho=.8){const s=Math.SQRT1_2,qs=[s*(q0[0]+q0[1]),s*(q0[0]-q0[1])],ps=[s*(p0[0]+p0[1]),s*(p0[0]-p0[1])],q=[],p=[];for(let j=0;j<2;j++){const w=1/Math.sqrt(1+(j===0?rho:-rho)),c=Math.cos(w*t),sn=Math.sin(w*t);q.push(qs[j]*c+ps[j]*sn/w);p.push(ps[j]*c-w*qs[j]*sn);}return {q:[s*(q[0]+q[1]),s*(q[0]-q[1])],p:[s*(p[0]+p[1]),s*(p[0]-p[1])]};}
 function hmc({epsilon=.25,L=12,rho=.8,start=[2.5,-2.5],seed=987}={}){
  const r=rng(seed),m={epsilon,L,rho,q:copy(start),start:copy(start),history:[],accepted:0,acceptedPoints:[],rejectedPoints:[]};
  m.begin=()=>{
   const from=copy(m.q),p0=normalPair(r);
   return {from,p0,H0:H(from,p0,m.rho),q:copy(from),p:copy(p0),path:[copy(from)]};
  };
  m.generate=trajectory=>{
   for(let i=0;i<m.L;i++){
    const next=leap(trajectory.q,trajectory.p,m.epsilon,m.rho);
    trajectory.q=next.q;
    trajectory.p=next.p;
    trajectory.path.push(copy(next.q));
   }
  };
  m.decide=({from,p0,H0,q,p,path})=>{
   const H1=H(q,p,m.rho),delta=H1-H0;
   const logAlpha=Number.isFinite(delta)?Math.min(0,-delta):-Infinity;
   const u=r(),accepted=Number.isFinite(delta)&&Math.log(u)<=logAlpha;
   return {from,p0,H0,H1,delta,alpha:Math.exp(logAlpha),u,accepted,proposal:q,pEnd:p,path};
  };
  m.record=result=>{
   if(result.accepted){
    m.q=copy(result.proposal);
    m.accepted++;
    m.acceptedPoints.push(m.q);
   }else if(result.proposal.every(Number.isFinite))m.rejectedPoints.push(result.proposal);
   m.history.push(copy(m.q));
   m.last=result;
   return result;
  };
  m.step=()=>{
   const trajectory=m.begin();
   m.generate(trajectory);
   return m.record(m.decide(trajectory));
  };
  m.run=n=>{for(let i=0;i<n;i++)m.step();return m;};return m;
 }
 function summary(history){const n=history.length;if(!n)return {n,mean:[NaN,NaN],variance:[NaN,NaN],covariance:NaN};const mean=[0,0];history.forEach(q=>q.forEach((x,j)=>mean[j]+=x/n));const variance=[0,0];let covariance=0;history.forEach(q=>{q.forEach((x,j)=>variance[j]+=(x-mean[j])**2/n);covariance+=(q[0]-mean[0])*(q[1]-mean[1])/n;});return {n,mean,variance,covariance};}
 // Fixed spatial cells retain their first sample. New samples only add displayed dots.
 function dots(history,width=.075,limit=2200){const seen=new Set(),out=[];for(const q of history){const key=q.map(x=>Math.floor(x/width)).join(',');if(!seen.has(key)){seen.add(key);out.push(q);if(out.length>=limit)break;}}return out;}
 return {rng,normalPair,data,logPosterior,grad,E,K,H,metropolis,gibbs,leap,leapEngine,exact,hmc,summary,dots};
})();
