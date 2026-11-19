load('html-slides/60-2-sampling/models.js');
function assert(v,s){if(!v)throw new Error(s);}
function close(x,y,t,s){assert(Math.abs(x-y)<t,s+': '+x+' vs '+y);}
for(const rho of [-.9,0,.8,.95]){
 const g=S2.gibbs({rho}).run(105000),gs=S2.summary(g.history.slice(5000));
 close(gs.mean[0],0,.06,'Gibbs mean');close(gs.variance[0],1,.08,'Gibbs variance');close(gs.covariance,rho,.08,'Gibbs covariance');
 const m=S2.metropolis({rho,tau:.6}).run(110000),ms=S2.summary(m.history.slice(10000));close(ms.mean[0],0,.09,'Metropolis mean');close(ms.variance[0],1,.1,'Metropolis variance');close(ms.covariance,rho,.1,'Metropolis covariance');
 print('Gaussian rho='+rho+' Gibbs '+JSON.stringify(gs)+' Metropolis '+JSON.stringify(ms));
}
const q=[1.1,-.3],p=[.7,1.6],h=S2.H(q,p);
for(let t=0;t<20;t+=.07){const s=S2.exact(q,p,t);close(S2.H(s.q,s.p),h,1e-12,'Exact energy');}
for(const eps of [.02,.2,.8]){let a={q:q.slice(),p:p.slice()};for(let i=0;i<20;i++)a=S2.leap(a.q,a.p,eps);a.p=a.p.map(x=>-x);for(let i=0;i<20;i++)a=S2.leap(a.q,a.p,eps);a.q.forEach((x,j)=>close(x,q[j],1e-10,'Leapfrog reversibility'));a.p.forEach((x,j)=>close(x,-p[j],1e-10,'Momentum reversibility'));}
for(const epsilon of [.25,.85]){const m=S2.hmc({epsilon}).run(80000),s=S2.summary(m.history.slice(1000));close(s.mean[0],0,.04,'HMC mean');close(s.variance[0],1,.06,'HMC variance');close(s.covariance,.8,.06,'HMC covariance');close(m.last.H0,S2.H(m.last.from,m.last.p0),1e-12,'Fresh momentum');print('HMC epsilon='+epsilon+' '+JSON.stringify(s)+' acceptance='+m.accepted/m.history.length);}
const lm=S2.metropolis({start:[-1.6,1.1],tau:.12,logp:S2.logPosterior}).run(50000),ls=S2.summary(lm.history.slice(2000));close(ls.mean[1],1.887542446,.015,'Logistic grid mean');assert(S2.data.length===1000,'Fixed data size');
assert(lm.moves.every((m,i)=>m.accepted||JSON.stringify(lm.history[i])===JSON.stringify(m.from)),'Rejections recorded');print('Logistic '+JSON.stringify(ls));print('ALL NUMERICAL CHECKS PASSED');
