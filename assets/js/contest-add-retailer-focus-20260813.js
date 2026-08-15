(()=>{
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
  const slugify=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const modal=document.createElement('div');
  modal.className='ar-modal';
  modal.hidden=true;
  modal.innerHTML=`<div class="ar-backdrop" data-ar-close></div>
    <section class="ar-dialog" role="dialog" aria-modal="true" aria-labelledby="ar-title">
      <div class="ar-head">
        <div><p class="ar-kicker">Add retailer</p><h2 id="ar-title">Create a retailer page</h2><p id="ar-campaign" class="ar-campaign"></p></div>
        <button type="button" class="ar-close" data-ar-close aria-label="Close">×</button>
      </div>
      <div class="ar-body">
        <div class="ar-step"><span>1</span><div><strong>Name the location</strong><p>This is the only thing required to create the page.</p></div></div>
        <label class="ar-field"><span>Retailer name</span><input id="ar-name" autocomplete="organization" placeholder="e.g. Lighthouse Liquor Store"></label>
        <details class="ar-advanced"><summary>Advanced</summary><label class="ar-field"><span>Retailer code</span><input id="ar-code" placeholder="lighthouse-liquor"><small>Generated automatically. Only change it when you have a reason.</small></label></details>
        <div class="ar-inherits"><strong>Already handled by the master</strong><div class="ar-inherit-grid"><span>✓ Hero images</span><span>✓ Prize & rules</span><span>✓ Social creative</span><span>✓ 8 × 12 + 11 × 17 posters</span><span>✓ Receipt defaults</span><span>✓ Campaign setup</span></div></div>
        <div class="ar-next"><span>2</span><div><strong>Then finish the retailer details</strong><p>After creation, we’ll take you directly to that retailer page to add its logo/address, confirm dates and turn it public when ready.</p></div></div>
        <div id="ar-error" class="ar-error" role="alert"></div>
      </div>
      <div class="ar-actions"><button type="button" class="admin-btn admin-btn-secondary" data-ar-close>Cancel</button><button type="button" class="admin-btn admin-btn-primary" id="ar-create">Create retailer page</button></div>
    </section>`;
  document.body.appendChild(modal);

  let master=null;
  const nameInput=modal.querySelector('#ar-name'),codeInput=modal.querySelector('#ar-code'),createBtn=modal.querySelector('#ar-create'),err=modal.querySelector('#ar-error');
  let codeTouched=false;
  codeInput.addEventListener('input',()=>codeTouched=true);
  nameInput.addEventListener('input',()=>{if(!codeTouched)codeInput.value=slugify(nameInput.value)});
  const close=()=>{modal.hidden=true;document.body.classList.remove('ar-open');master=null;err.textContent='';};
  modal.addEventListener('click',e=>{if(e.target.closest('[data-ar-close]'))close()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)close()});

  const open=async id=>{
    err.textContent='';codeTouched=false;nameInput.value='';codeInput.value='';
    try{
      const r=await fetch('/api/contest-admin?action=list',{headers:{authorization:`Bearer ${token()}`},cache:'no-store'});
      const d=await r.json();if(!r.ok)throw new Error(d.message||'Could not load campaign.');
      master=(d.contests||[]).find(c=>c.id===id);
      if(!master)throw new Error('Retail campaign could not be found.');
      modal.querySelector('#ar-campaign').textContent=`Adding to ${master.internal_name||master.public_name||'retail campaign'}`;
      modal.hidden=false;document.body.classList.add('ar-open');setTimeout(()=>nameInput.focus(),40);
    }catch(error){alert(error.message)}
  };

  document.addEventListener('click',e=>{
    const b=e.target.closest('button[data-retail-copy]');
    if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();
    open(b.dataset.retailCopy);
  },true);

  createBtn.addEventListener('click',async()=>{
    if(!master)return;
    const retailerName=nameInput.value.trim(),retailerCode=(codeInput.value.trim()||slugify(retailerName));
    if(!retailerName){err.textContent='Enter the retailer name first.';nameInput.focus();return}
    const original=createBtn.textContent;createBtn.disabled=true;createBtn.classList.add('is-busy');createBtn.textContent='Creating…';err.textContent='';
    try{
      const r=await fetch(`/api/contest-admin?action=retail-duplicate&id=${encodeURIComponent(master.id)}`,{method:'POST',headers:{authorization:`Bearer ${token()}`,'content-type':'application/json'},body:JSON.stringify({retailerName,retailerCode})});
      const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Retailer page could not be created.');
      sessionStorage.setItem('suenos-open-contest-after-reload',d.contest?.id||'');
      sessionStorage.setItem('suenos-admin-toast-after-reload',`${retailerName} created. Finish the retailer details, then turn it public when ready.`);
      location.reload();
    }catch(error){err.textContent=error.message;createBtn.disabled=false;createBtn.classList.remove('is-busy');createBtn.textContent=original;}
  });

  const target=sessionStorage.getItem('suenos-open-contest-after-reload');
  if(target){
    sessionStorage.removeItem('suenos-open-contest-after-reload');
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      const manage=document.querySelector(`button[data-edit="${CSS.escape(target)}"]`);
      if(manage){clearInterval(timer);manage.click();setTimeout(()=>{
        const retailTab=document.querySelector('[data-contest-step="retail"],button[data-step="retail"]');
        retailTab?.click();
      },150);}
      else if(attempts>80)clearInterval(timer);
    },100);
  }
})();

import('/assets/js/retail-poster-formats-20260814.js?v=20260814d').catch(error=>console.error('retail poster formats',error));
import('/assets/js/retail-poster-upload-fix-20260814.js?v=20260814a').catch(error=>console.error('retail poster upload fix',error));
import('/assets/js/retail-receipt-allowed-items-20260814.js?v=20260814a').catch(error=>console.error('retailer receipt exceptions',error));
import('/assets/js/retail-poster-download-actions-20260814.js?v=20260814b').catch(error=>console.error('retailer poster downloads',error));
