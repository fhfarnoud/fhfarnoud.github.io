/* Deck-local controls. The shared engine owns math, layout, fragment states,
   keyboard navigation, speaker notes, and PDF export. */
MACROS['\\independent']='\\perp\\!\\!\\!\\perp';

function samplingControl(event){
  const button=event.target.closest('[data-action]');
  if(!button)return;
  const group=button.closest('.demo-controls');
  const root=group?group.closest('section').querySelector(`.fig[data-fig="${group.dataset.for}"]`):button.closest('.fig');
  if(!root)return;
  const old=Object.assign({},(live.get(root)||{}).p||stateFor(root)),p=Object.assign({},old),action=button.dataset.action,value=Number(button.dataset.value);
  if(action==='select')p.selected=value;
  if(action==='start')p.a=value;
  if(root.dataset.fig==='convergence'){
    if(action==='start')p.compare=0;
    if(action==='compare')p.compare=p.compare?0:1;
  }
  if(action==='advance')p.t=Math.min(15,Math.round(p.t||0)+1);
  if(action==='count')p.n=value;
  if(action==='rerun')p.seed=Math.round(p.seed||0)+1;
  if(action==='direction')p.direction=value;
  if(action==='add'){p.n=Math.min(20000,Math.round(p.n||0)+value);p.phase=0;}
  if(action==='reset'){p.n=0;p.phase=0;}
  if(action==='step'){p.n=Math.min(20000,Math.round(p.n||0)+1);p.phase=0;}
  if(action==='phase'){
    const phase=Math.round(p.phase||0);
    if(phase<2)p.phase=phase+1;
    else{p.phase=0;p.n=Math.min(20000,Math.round(p.n||0)+1);}
  }
  const current=root.querySelector('[data-current-dot]');
  const previous=current?{x:Number(current.getAttribute('cx')),y:Number(current.getAttribute('cy'))}:null;
  const state=live.get(root)||{};cancelAnimationFrame(state.raf);
  FIGS[root.dataset.fig].render(root,p);state.p=p;live.set(root,state);syncKnobs(root,p);
  syncSamplingControls(root,p);
  const next=root.querySelector('[data-current-dot]');
  if(previous&&next&&p.n!==old.n&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
    next.animate([{transform:`translate(${previous.x-Number(next.getAttribute('cx'))}px,${previous.y-Number(next.getAttribute('cy'))}px)`},{transform:'translate(0,0)'}],{duration:450,easing:'ease-in-out'});
  }
  event.preventDefault();event.stopPropagation();
}
function syncSamplingControls(root,p){
  const section=root.closest('section'),group=section.querySelector(`.demo-controls[data-for="${root.dataset.fig}"]`);
  if(!group)return;
  group.querySelectorAll('[data-action]').forEach(b=>{
    let selected=null;
    if(b.dataset.action==='select')selected=Number(b.dataset.value)===Math.round(p.selected||0);
    if(b.dataset.action==='count')selected=Number(b.dataset.value)===Math.round(p.n||0);
    if(b.dataset.action==='direction')selected=Number(b.dataset.value)===Math.round(p.direction||0);
    if(root.dataset.fig==='convergence'){
      if(b.dataset.action==='start')selected=!p.compare&&Number(b.dataset.value)===p.a;
      if(b.dataset.action==='compare')selected=Boolean(p.compare);
    }
    if(selected!==null)b.setAttribute('aria-pressed',String(selected));
    if(b.dataset.action==='phase')b.textContent=['Propose','Decide','Record'][Math.round(p.phase||0)];
  });
}
document.addEventListener('click',samplingControl);
// Moving the initial-distribution slider returns to the selected single start.
document.addEventListener('input',event=>{
  if(!event.target.matches('#convergence input[data-param="a"]'))return;
  const root=document.querySelector('#convergence .fig'),state=live.get(root);
  if(state?.p)state.p.compare=0;
},true);
document.addEventListener('keydown',event=>{
  if(event.target.matches('.state-hit')&&(event.key==='Enter'||event.key===' '))samplingControl(event);
});
Reveal.on('ready',()=>{
  document.querySelectorAll('.fig[data-fig]').forEach(root=>syncSamplingControls(root,stateFor(root)));
  document.querySelectorAll('.demo-controls').forEach(group=>{
    group.setAttribute('role','group');group.setAttribute('aria-label',`${group.closest('section').querySelector('h2').textContent} controls`);
  });

});
if(document.querySelectorAll('.slides > section').length!==27)throw Error('Sampling I must contain exactly 27 slides.');
// Make the brief speaker notes available through the shared T transcript drawer.
document.querySelectorAll('.slides > section > notes').forEach(notes=>{
  const narration=document.createElement('narration'),say=document.createElement('say');
  say.textContent=notes.textContent;narration.appendChild(say);notes.after(narration);
});
const numberedSlides=[...document.querySelectorAll('.slides > section')].slice(2);
numberedSlides.forEach((slide,i)=>{ slide.dataset.contentNumber=String(i+1); });
slideLabel=slide=>slide?.dataset.contentNumber ? [slide.dataset.contentNumber,'/',numberedSlides.length] : [''];
startDeck();
