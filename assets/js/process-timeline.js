(()=>{
  const root=document.querySelector('[data-process-root]');
  if(!root)return;
  const milestones=[...root.querySelectorAll('[data-process-milestone]')];
  const navLinks=[...root.querySelectorAll('[data-process-nav]')];
  const progress=root.querySelector('[data-process-progress]');
  const nav=root.querySelector('.process-milestone-nav');

  const setActive=id=>{
    navLinks.forEach(link=>{
      const active=link.dataset.processNav===id;
      link.classList.toggle('is-active',active);
      if(active){
        link.setAttribute('aria-current','step');
        if(window.matchMedia('(max-width:980px)').matches){
          link.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'});
        }
      }else link.removeAttribute('aria-current');
    });
    const index=Math.max(0,milestones.findIndex(item=>item.dataset.processMilestone===id));
    const percent=milestones.length>1?(index/(milestones.length-1))*100:100;
    root.style.setProperty('--process-progress',`${percent}%`);
    if(progress)progress.style.height=`${percent}%`;
  };

  navLinks.forEach(link=>link.addEventListener('click',event=>{
    const target=document.querySelector(link.getAttribute('href'));
    if(!target)return;
    event.preventDefault();
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }));

  if(!('IntersectionObserver' in window)){
    milestones.forEach(item=>item.classList.add('is-visible'));
    setActive(milestones[0]?.dataset.processMilestone||'01');
    return;
  }

  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting)entry.target.classList.add('is-visible');
    });
  },{threshold:.18});

  const activeObserver=new IntersectionObserver(entries=>{
    const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible)setActive(visible.target.dataset.processMilestone);
  },{rootMargin:'-30% 0px -45% 0px',threshold:[0,.15,.3,.5,.75]});

  milestones.forEach(item=>{revealObserver.observe(item);activeObserver.observe(item)});
  milestones[0]?.classList.add('is-visible');
  setActive(milestones[0]?.dataset.processMilestone||'01');
})();
