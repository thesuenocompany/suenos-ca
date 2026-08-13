(()=>{
  const esc=s=>String(s??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  let lastFocus=null;
  const ensure=()=>{
    let modal=document.getElementById('contest-rules-modal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='contest-rules-modal';
    modal.className='contest-rules-modal';
    modal.hidden=true;
    modal.innerHTML=`<div class="contest-rules-backdrop" data-rules-close></div><section class="contest-rules-dialog" role="dialog" aria-modal="true" aria-labelledby="contest-rules-modal-title"><header><div><p>SUEÑOS SPIRITS</p><h2 id="contest-rules-modal-title">Official Contest Rules</h2></div><button type="button" class="contest-rules-close" data-rules-close aria-label="Close Official Contest Rules">×</button></header><div class="contest-rules-modal-body"></div><footer><button type="button" class="contest-rules-print">Print Rules</button><button type="button" class="contest-rules-done" data-rules-close>Close</button></footer></section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target.closest('[data-rules-close]'))close()});
    modal.querySelector('.contest-rules-print').addEventListener('click',()=>window.print());
    return modal;
  };
  const openHtml=(html,title='Official Contest Rules')=>{
    const modal=ensure();lastFocus=document.activeElement;
    modal.querySelector('#contest-rules-modal-title').textContent=title;
    modal.querySelector('.contest-rules-modal-body').innerHTML=html||'<p>Official Rules are not available yet.</p>';
    modal.hidden=false;document.documentElement.classList.add('contest-rules-open');
    requestAnimationFrame(()=>modal.querySelector('.contest-rules-close')?.focus());
  };
  const close=()=>{const modal=document.getElementById('contest-rules-modal');if(!modal||modal.hidden)return;modal.hidden=true;document.documentElement.classList.remove('contest-rules-open');lastFocus?.focus?.();};
  const triggerHtml=(c,label='Full Rules',className='contest-rules-trigger')=>{
    if(c?.external_rules_url)return `<a class="${esc(className)}" href="${esc(c.external_rules_url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
    if(c?.rules_pdf_url)return `<a class="${esc(className)}" href="${esc(c.rules_pdf_url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
    return `<button class="${esc(className)}" type="button" data-contest-rules-open>${esc(label)}</button>`;
  };
  const modalHtml=c=>`<template class="contest-rules-source">${c?.full_rules_html||'<p>Official Rules are not available yet.</p>'}</template>`;
  document.addEventListener('click',e=>{
    const trigger=e.target.closest('[data-contest-rules-open]');
    if(!trigger)return;
    e.preventDefault();
    const scope=trigger.closest('.contest-page,.retail-contest-page-main,.photo-story-page,.ps-shell,.rc-shell,main,body')||document;
    const source=scope.querySelector('.contest-rules-source')||document.querySelector('.contest-rules-source');
    openHtml(source?.innerHTML||'<p>Official Rules are not available yet.</p>');
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  window.ContestRulesModal={openHtml,close,triggerHtml,modalHtml};
})();
