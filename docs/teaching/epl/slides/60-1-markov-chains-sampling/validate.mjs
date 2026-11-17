// Deterministic mathematical checks for the actual figure models.
// Run: node html-slides/60-1-markov-chains-sampling/validate.mjs
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const here=new URL('.',import.meta.url);
const html=readFileSync(new URL('index.html',here),'utf8');
assert.equal((html.match(/<section\b/g)||[]).length,27);
assert.equal([...html.matchAll(/data-minutes="(\d+)"/g)].reduce((s,m)=>s+Number(m[1]),0),87);
assert.equal((html.match(/class="source-note"/g)||[]).length,0);
const context=vm.createContext({C:{},FIGS:{},globalThis:{},mulberry32(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}});
vm.runInContext(readFileSync(new URL('figs.js',here),'utf8'),context);
const M=context.globalThis.SAMPLING_MODELS;
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
const balance=(P,pi)=>{
 P.forEach(row=>{near(row.reduce((a,b)=>a+b,0),1);row.forEach(v=>assert.ok(v>=0&&v<=1));});
 M.multiply(pi,P).forEach((v,j)=>near(v,pi[j]));
 P.forEach((row,i)=>row.forEach((v,j)=>near(pi[i]*v,pi[j]*P[j][i])));
};
balance(M.patient,[5/7,2/7]);balance(M.activity,[1/8,2/8,5/8]);
near(M.multiply(M.multiply([1,0],M.patient),M.patient)[0],.74);
const five=M.stationary(M.five);M.multiply(five,M.five).forEach((v,j)=>near(v,five[j]));
const simulation=M.simulate(M.five,100000,8,2);
assert.equal(simulation.states.length,100000);simulation.freq.forEach((v,j)=>near(v,five[j],.015));
const activity=M.simulate(M.activity,100000,51);activity.freq.forEach((v,j)=>near(v,[1/8,2/8,5/8][j],.015));
const mh=(qa,qb,jab,jba)=>Math.min(1,qb*jba/(qa*jab));
near(mh(1,3,.8,.2),.75);near(mh(3,1,.2,.8),1);
balance([[.4,.6],[.2,.8]],[.25,.75]);
const weights=[1,2,5],J=[[.5,.5,0],[.5,0,.5],[0,.5,.5]];
const computed=J.map((row,i)=>row.map((j,k)=>i===k?0:j*Math.min(1,weights[k]/weights[i])));
computed.forEach((row,i)=>row[i]=1-row.reduce((a,b)=>a+b,0));
computed.forEach((row,i)=>row.forEach((v,j)=>near(v,M.activity[i][j])));
for(let k=0;k<=1000;k++){const x=k/1000;assert.ok(x*x*(1-x)<=.125*2*x+1e-14);}
near((1/12)/.125,2/3); // Rejection rate with normalized g=2x.
for(const scale of [.125,.25,.5]){const r=M.rejection(30000,scale,45);near(r.accepted/30000,r.expected,.01);r.points.forEach(p=>{assert.ok(p.alpha>=0&&p.alpha<=1+1e-12);assert.equal(p.accepted,p.y<=p.x*p.x*(1-p.x));});}
const normal=M.metropolis(100000,121),samples=normal.history.slice(1);
assert.equal(samples.length,100000);
normal.moves.forEach((move,i)=>{assert.ok(move.alpha>=0&&move.alpha<=1);if(!move.accepted)near(normal.history[i+1],normal.history[i]);});
near(samples.reduce((s,x)=>s+x,0)/samples.length,0,.025);
near(samples.reduce((s,x)=>s+x*x,0)/samples.length,1,.04);
const beta=M.beta(20000,14);near(beta.reduce((s,x)=>s+x,0)/beta.length,.6,.01);
console.log('Passed: 27 slides, 87 minutes, no visible source references, stationarity, detailed balance, MH correction, activity matrix, chain frequencies, rejection envelope, recorded rejections, and target moments.');

// New application slide: verify the actual models used by the animations.
context.PRINT=true;
vm.runInContext(readFileSync(new URL('practice.js',here),'utf8'),context);
const apps=context.globalThis.PRACTICE_MODELS;
const pageP=apps.probabilities();
pageP.forEach((row,i)=>{near(row.reduce((a,b)=>a+b,0),1);row.forEach((v,j)=>{assert.ok(v>0);near(v,.15/9+(apps.links[i].includes(j)?.85/apps.links[i].length:0));});});
const app=apps.create(),target=M.stationary(pageP);let dnaChanges=0,jumps=0;
for(let i=0;i<50000;i++){
 const old=app.snapshot(),next=app.step();
 assert.equal(next.n,i+1);assert.equal(next.counts.reduce((a,b)=>a+b,0),next.n+1);
 assert.ok(next.page>=0&&next.page<9);
 if(!next.last.jump)assert.ok(apps.links[old.page].includes(next.page));else jumps++;
 assert.equal(Math.abs(next.particle[0]-old.particle[0])+Math.abs(next.particle[1]-old.particle[1]),1);
 assert.ok(next.particle.every(x=>x>=0&&x<5));assert.ok(next.nucleotide>=0&&next.nucleotide<4);
 if(old.nucleotide!==next.nucleotide)dnaChanges++;
}
near(jumps/50000,.15,.01);near(dnaChanges/50000,.2,.01);
app.snapshot().counts.forEach((v,i)=>near(v/50001,target[i],.015));
const freshA=apps.create(),freshB=apps.create();for(let i=0;i<20;i++)assert.equal(JSON.stringify(freshA.step()),JSON.stringify(freshB.step()));
console.log('Passed: PageRank probabilities and visit accounting, link/teleport choices, grid neighbors, mutation rates, long-run frequencies, and deterministic reset.');

vm.runInContext(readFileSync(new URL('convergence-cases.js',here),'utf8'),context);
const cases=context.globalThis.CONVERGENCE_CASE_MODELS;
cases.matrices.forEach(P=>P.forEach(row=>near(row.reduce((a,b)=>a+b,0),1)));
for(const start of [0,1])for(let t=0;t<=20;t++){
 const disconnected=cases.distribution(0,start,t),periodic=cases.distribution(1,start,t),patient=cases.distribution(2,start,t);
 near(disconnected[start],1);near(periodic[(start+t)%2],1);
 near(patient[0],5/7+((start?0:1)-5/7)*.3**t);
 for(const v of [disconnected,periodic,patient]){near(v.reduce((a,b)=>a+b,0),1);v.forEach(x=>assert.ok(x>=0&&x<=1));}
}
near(M.multiply([.5,.5],cases.matrices[1])[0],.5);
assert.ok(cases.matrices[2].every(row=>row.every(x=>x>0)));
console.log('Passed: disconnected limits, periodic oscillation and stationarity, and regular patient-chain convergence from both starts.');

vm.runInContext(readFileSync(new URL('frequency-trajectory.js',here),'utf8'),context);
const frequencies=context.globalThis.FREQUENCY_MODELS;
frequencies.stationary.forEach((v,j)=>near(v,[1/12,1/2,1/12,1/4,1/12][j]));
for(const n of [10,100,1000,10000]){
 const f=frequencies.snapshot(n,8),reference=M.simulate(M.five,n,8,2);
 assert.equal(f.counts.reduce((a,b)=>a+b,0),n);
 assert.equal(JSON.stringify(f.counts),JSON.stringify(reference.counts));
 assert.equal(f.current,reference.states[n-1]);assert.equal(f.history.at(-1),f.current);
 assert.equal(JSON.stringify(f.history),JSON.stringify(reference.states.slice(-20)));
 f.freq.forEach((v,j)=>near(v,f.counts[j]/n));
}
for(let n=10;n<100;n++){
 const a=frequencies.snapshot(n,8),b=frequencies.snapshot(n+1,8);
 assert.ok(M.five[a.current][b.current]>0);
 b.counts.forEach((v,j)=>assert.equal(v-a.counts[j],Number(j===b.current)));
}
assert.notEqual(JSON.stringify(frequencies.snapshot(100,8).history),JSON.stringify(frequencies.snapshot(100,9).history));
console.log('Passed: trajectory prefixes, valid transitions, visit windows, exact count accounting, empirical bars, stationary values, and new-run seeds.');

vm.runInContext(readFileSync(new URL('sampling-methods.js',here),'utf8'),context);
const B=context.globalThis.BASIC_SAMPLING_MODELS;
near(B.grid(40,2).estimate,.6,.0002);
assert.equal(B.grid(10,10).cost,'10000000000');
assert.equal(B.grid(40,10).cost,'10485760000000000');
for(let i=0;i<=100;i++)near(B.cdf(B.inverse(i/100)),i/100);
for(const scale of [.25,.5,1]){
 const b=B.rejection(30000,scale,45),normalized=M.rejection(30000,scale/2,45);
 assert.equal(b.accepted,normalized.accepted);near(b.expected,(1/12)/(scale*.5));
 b.points.forEach(x=>{assert.ok(x.alpha>=0&&x.alpha<=1);near(x.y,x.u*scale*x.x);assert.equal(x.accepted,x.y<=x.x*x.x*(1-x.x));});
 near(b.accepted/30000,b.expected,.01);near(b.samples.reduce((s,x)=>s+x,0)/b.samples.length,.6,.015);
}
const importance=B.importance(10000,16);
near(importance.estimate,.6,.01);near(importance.unweighted,2/3,.01);
importance.draws.forEach(x=>{near(x.theta*x.theta,x.u);near(x.w,x.theta*(1-x.theta));near(x.h,x.theta);assert.ok(x.theta>=0&&x.theta<=1);});
near(importance.estimate,importance.numerator/importance.denominator);
near(importance.estimate,importance.draws.reduce((s,x)=>s+6*x.w*x.theta,0)/importance.draws.reduce((s,x)=>s+6*x.w,0));
for(const n of [5,30,200]){
 const prefix=B.importance(n,16);assert.equal(prefix.draws.length,n);
 assert.equal(JSON.stringify(prefix.draws),JSON.stringify(importance.draws.slice(0,n)));
 near(prefix.unweighted,prefix.draws.reduce((s,x)=>s+x.theta,0)/n);
 near(prefix.estimate,prefix.draws.reduce((s,x)=>s+x.w*x.theta,0)/prefix.draws.reduce((s,x)=>s+x.w,0));
}
console.log('Passed: grid quadrature and dimensional cost, inverse-CDF transform, proposal normalization equivalence, rejection envelope and accepted target, and self-normalized importance estimator.');

vm.runInContext(readFileSync(new URL('mcmc-six-state.js',here),'utf8'),context);
const six=context.globalThis.SIX_STATE_MODELS;
for(let target=0;target<3;target++){
 const P=six.matrix(target),p=six.targets[target].p;
 balance(P,p);assert.ok(P.every((row,i)=>row[i]>=.5));
 P.forEach((row,i)=>row.forEach((prob,j)=>{const f=six.fraction(target,i,j);near(f.numerator/f.denominator,prob);}));
 const chain=six.create(target);let stays=0;
 for(let n=1;n<=1000;n++){
  const before=chain.snapshot(),after=chain.step();assert.ok(P[before.current][after.current]>0);
  assert.equal(after.n,n);assert.equal(after.counts.reduce((a,b)=>a+b,0),n);assert.equal(after.tail.at(-1),after.current);
  after.counts.forEach((count,j)=>assert.equal(count-before.counts[j],Number(j===after.current)));
  if(before.current===after.current)stays++;
 }
 assert.ok(stays>0);
 const long=six.create(target).run(200000);long.frequencies.forEach((v,j)=>near(v,p[j],.015));
 const a=six.create(target),b=six.create(target);assert.equal(JSON.stringify(a.run(1000)),JSON.stringify(b.run(1000)));
}
console.log('Passed: all three six-state targets, row sums, detailed balance, exact edge fractions, counted self-transitions, deterministic reset, and empirical convergence.');

vm.runInContext(readFileSync(new URL('metropolis-demo.js',here),'utf8'),context);
const metro=context.globalThis.METROPOLIS_DEMO_MODELS;
const staged=metro.create();let rejected=0;
for(let n=0;n<100;n++){
 const before=staged.snapshot(),proposed=staged.next();
 assert.equal(proposed.stage,1);assert.equal(proposed.n,n);assert.equal(proposed.current,before.current);
 assert.ok(Math.abs(proposed.move.proposal-before.current)<=1);
 assert.equal(proposed.move.alpha,null);assert.equal(proposed.move.u,null);
 const calculated=staged.next();assert.equal(calculated.stage,2);assert.equal(calculated.n,n);assert.equal(calculated.move.u,null);
 near(calculated.move.alpha,Math.min(1,Math.exp(-(calculated.move.proposal**2)/2)/Math.exp(-(before.current**2)/2)));
 const decided=staged.next();assert.equal(decided.stage,3);assert.equal(decided.n,n);
 assert.equal(decided.move.accepted,decided.move.u<=decided.move.alpha);
 const updated=staged.next();assert.equal(updated.stage,4);assert.equal(updated.n,n+1);assert.equal(updated.samples.at(-1),updated.current);
 assert.equal(updated.current,decided.move.accepted?decided.move.proposal:before.current);
 if(!decided.move.accepted){rejected++;assert.equal(updated.samples.at(-1),before.current);}
}
assert.ok(rejected>0);
const batched=metro.create().run(100);
assert.equal(JSON.stringify(staged.snapshot()),JSON.stringify(batched));
for(const phase of [0,1,2,3]){
 const partial=metro.create();for(let i=0;i<phase;i++)partial.next();
 assert.equal(JSON.stringify(partial.iteration()),JSON.stringify(metro.create().iteration()));
}
const longMetro=metro.create().run(200000),mean=longMetro.samples.reduce((a,b)=>a+b,0)/longMetro.n;
near(mean,0,.035);near(longMetro.samples.reduce((a,b)=>a+b*b,0)/longMetro.n,1,.045);
for(const values of [[2],[2,2,2],[-9.2,-1,.25,.25,0,10.7],longMetro.samples]){
 const h=metro.histogram(values,2,2.5);assert.equal(h.counts.reduce((a,b)=>a+b,0),values.length);
 near(h.heights.reduce((a,b)=>a+b*h.width,0),1);assert.ok(Math.max(...h.heights)<=h.ymax);
 assert.ok(h.lo<=values.reduce((a,b)=>Math.min(a,b),Infinity)&&h.hi>=values.reduce((a,b)=>Math.max(a,b),-Infinity));
}
for(let x=-3;x<=3;x+=.25)for(const delta of [-.9,-.25,.25,.9]){
 const xp=x+delta;near(metro.density(x)*.5*metro.acceptance(x,xp),metro.density(xp)*.5*metro.acceptance(xp,x));
}
console.log('Passed: staged uniform proposals, delayed acceptance draws, recorded rejections, staged/batch equivalence, normalized histograms, target moments, and continuous detailed balance.');

const transition=context.globalThis.TRANSITION_MODELS;
for(const direction of [0,1]){
 const t=transition.comparison(direction);assert.ok(Math.abs(t.to-t.from)<1);
 near(t.jump,.5);near(t.ratio,Math.exp((t.from*t.from-t.to*t.to)/2));
 near(t.alpha,direction?Math.exp(-1.28):1);near(t.density,t.jump*t.alpha);
 near(transition.density(t.from,t.from-1.01),0);near(transition.density(t.from,t.from+1.01),0);
 let mass=0;
 for(let i=0;i<10000;i++)mass+=transition.density(t.from,t.from-1+(i+.5)*2/10000)*2/10000;
 assert.ok(mass>0&&mass<1); // Remaining mass is a self-transition, not a density height.
}
for(let x=-3;x<=3;x+=.2)for(const delta of [-1.1,-.8,-.3,.3,.8,1.1]){
 const xp=x+delta;
 near(Math.exp(-x*x/2)*transition.density(x,xp),Math.exp(-xp*xp/2)*transition.density(xp,x));
}
console.log('Passed: valid comparison moves, acceptance ratios, transition densities, bounded jump support, rejection mass, and balanced flows.');

vm.runInContext(readFileSync(new URL('mh-correction.js',here),'utf8'),context);
const hastings=context.globalThis.MH_CORRECTION_MODELS;
for(const bias of [0,1])for(const corrected of [false,true]){
 const example=hastings.comparison(bias,corrected),[forward,reverse]=example.rows;
 near(forward.jump,bias?.75:.5);near(reverse.jump,bias?.25:.5);
 near(forward.alpha,bias&&corrected?1/3:1);near(reverse.alpha,1);
 if(corrected||!bias)near(forward.flow,reverse.flow);else near(forward.flow/reverse.flow,3);
}
for(const bias of [0,1]){
 let integral=0;
 for(let i=0;i<10000;i++)integral+=hastings.jump(.8,-.2+(i+.5)*2/10000,bias)*2/10000;
 near(integral,1);
 for(let from=-3;from<=3;from+=.2)for(const delta of [-1.2,-.8,-.3,.3,.8,1.2]){
  const to=from+delta,jf=hastings.jump(from,to,bias),jr=hastings.jump(to,from,bias),af=hastings.acceptance(from,to,bias),ar=hastings.acceptance(to,from,bias);
  assert.ok(af>=0&&af<=1);assert.ok(ar>=0&&ar<=1);
  const flowF=Math.exp(-from*from/2)*jf*af,flowR=Math.exp(-to*to/2)*jr*ar;
  near(flowF,flowR);near(flowF,Math.min(Math.exp(-from*from/2)*jf,Math.exp(-to*to/2)*jr));
  if(!bias&&jf)near(af,metro.acceptance(from,to));
 }
}
console.log('Passed: normalized biased proposals, ordinary-Metropolis imbalance, Hastings correction, symmetric reduction, and minimum-flow detailed balance.');

vm.runInContext(readFileSync(new URL('mh-example.js',here),'utf8'),context);
const worked=context.globalThis.MH_EXAMPLE_MODELS;
near(worked.alpha[0][1],.75);near(worked.alpha[1][0],1);
[[.4,.6],[.2,.8]].forEach((row,i)=>row.forEach((v,j)=>near(v,worked.P[i][j])));
balance(worked.P,[.25,.75]);near(worked.P[0][0],worked.J[0][0]+worked.J[0][1]*(1-worked.alpha[0][1]));
near(worked.q[0]*worked.P[0][1],worked.q[1]*worked.P[1][0]);
const workedRun=worked.create();let repeated=0;
for(let n=1;n<=1000;n++){
 const a=workedRun.snapshot(),b=workedRun.step();assert.equal(b.n,n);assert.equal(b.counts.reduce((x,y)=>x+y,0),n);
 assert.ok(worked.P[a.current][b.current]>0);if(a.current===b.current)repeated++;
 assert.equal(b.repeats,repeated);assert.equal(b.history.at(-1).state,b.current);
 assert.equal(b.history.at(-1).repeat,a.current===b.current);assert.equal(b.history.length,Math.min(n,12));
 b.counts.forEach((v,j)=>assert.equal(v-a.counts[j],Number(j===b.current)));
 b.frequencies.forEach((v,j)=>near(v,b.counts[j]/n));
}
assert.ok(repeated>0);assert.equal(JSON.stringify(workedRun.snapshot()),JSON.stringify(worked.create().run(1000)));
const workedLong=worked.create().run(100000);workedLong.frequencies.forEach((v,j)=>near(v,[.25,.75][j],.01));
console.log('Passed: worked MH construction, rejection mass, detailed balance using q, recorded repeats, history, batch equivalence, deterministic reset, and sampled frequencies.');
