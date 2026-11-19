load('html-slides/60-2-sampling/models.js');
load('html-slides/60-2-sampling/chain-sampling.js');
function assert(v,s){if(!v)throw Error(s);}
function close(a,b,t,s){assert(Math.abs(a-b)<t,s+': '+a+' vs '+b);}
const chain=S2_CHAIN.create();let previous=[];
for(const [shown,burn,thin] of [[1000,100,1],[1000,100,10],[1000,0,1],[1000,0,20],[10000,100,20],[100,100,1],[100,0,20]]){
 const lengthBefore=chain.history.length;
 const selected=S2_CHAIN.select(chain,burn,thin,shown),count=Math.max(0,Math.floor((shown-burn)/thin));
 assert(selected.values.length===count&&selected.iterations.length===count,'Correct retained count');
 assert(selected.shown===shown,'Independent visible iterations');
 assert(chain.history.length===Math.max(lengthBefore,shown),'Only t extends history');
 assert(selected.iterations.every((t,i)=>t===burn+(i+1)*thin&&t<=shown&&selected.values[i]===chain.history[t-1]),'Correct selected indices');
 assert(previous.every((x,i)=>x===chain.history[i]),'Old chain prefix unchanged');
 previous=chain.history.slice();
 print('t='+shown+' B='+burn+' m='+thin+' generated='+chain.history.length+' retained='+count);
}
const before=JSON.stringify(chain.history),size=chain.history.length;chain.run(1000);assert(chain.history.length===size+1000,'Batch generation');assert(JSON.stringify(chain.history.slice(0,size))===before,'Batch preserves prefix');
const reset=S2_CHAIN.create().ensure(200);assert(reset.history.every((x,i)=>x===chain.history[i]),'Reset repeats initial seeded experiment');
chain.moves.forEach((move,i)=>{const alpha=Math.min(1,S2_CHAIN.density(move.proposal)/S2_CHAIN.density(move.from));close(move.alpha,alpha,2e-14,'Acceptance ratio');assert(move.accepted===(move.u<=move.alpha),'Acceptance decision');assert(chain.history[i]===(move.accepted?move.proposal:move.from),'Record accepted and rejected states');});
let area=0,second=0;const dx=.001;for(let x=-10;x<10;x+=dx){const mass=S2_CHAIN.density(x)*dx;area+=mass;second+=x*x*mass;close(S2_CHAIN.density(x),S2_CHAIN.density(-x),1e-15,'Target symmetry');}close(area,1,1e-10,'Normalized mixture');close(second,4.25,1e-10,'Mixture variance');
const long=S2_CHAIN.create().run(300000),samples=long.history.slice(2000);const mean=samples.reduce((a,x)=>a+x,0)/samples.length,variance=samples.reduce((a,x)=>a+(x-mean)**2,0)/samples.length;let transitions=0;for(let i=1;i<samples.length;i++)if((samples[i]<0)!==(samples[i-1]<0))transitions++;close(mean,0,.5,'Long-run mean');close(variance,4.25,.3,'Long-run variance');assert(transitions>10,'Observable genuine mode crossings over a long run');print('Long run: mean='+mean+' variance='+variance+' sign changes='+transitions+' acceptance='+long.accepted/long.history.length);print('ALL SLIDE 2 NUMERICAL CHECKS PASSED');

const early=S2_CHAIN.create().run(500),retained=early.history.slice(100);
const left=retained.filter(x=>x<0).length,right=retained.length-left;
assert(left>=100&&right>=100,'Both modes substantially visited by iteration 500');
print('Through iteration 500 after burn-in 100: left='+left+' right='+right+' acceptance='+early.accepted/500);
