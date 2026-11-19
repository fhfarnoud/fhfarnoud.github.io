// Each section overview is an actual navigation stop, like Sampling I.
document.addEventListener('click',event=>{
 const link=event.target.closest('.s2-section-card');if(!link)return;
 const id=link.getAttribute('href').slice(2),section=document.getElementById(id);
 if(section){event.preventDefault();Reveal.slide([...document.querySelectorAll('.slides>section')].indexOf(section),0,-1);}
});
