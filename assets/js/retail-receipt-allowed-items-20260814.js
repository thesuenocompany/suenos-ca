(()=>{
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const $=id=>document.getElementById(id);
  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  let lastLoadedId='';
  let loading=false;

  const currentId=()=> $('contest-id')?.value||'';
  const isRetailChild=()=> $('contest-type')?.value==='retail'&&!Boolean($('contest-retail-master')?.checked)&&Boolean(currentId());
  const itemsFromText=value=>{
    const seen=new Set(),items=[];
    for(const line of String(value||'').split(/\r?\n/)){
      const item=line.trim().slice(0,120);
      if(!item)continue;
      const key=item.toLowerCase();
      if(seen.has(key))continue;
      seen.add(key);items.push(item);
      if(items.length>=30)break;
    }
    return items;
  };

  function install(){
    const settings=$('contest-receipt-bonus-settings');
    if(!settings||$('contest-receipt-allowed-items-wrap'))return;
    const wrap=document.createElement('div');
    wrap.id='contest-receipt-allowed-items-wrap';
    wrap.className='admin-field';
    wrap.hidden=true;
    wrap.innerHTML=`
      <label for="contest-receipt-allowed-items">Accepted receipt items for this retailer</label>
      <textarea id="contest-receipt-allowed-items" placeholder="Spicy Margarita\nSueños Paloma"></textarea>
      <small>One menu or POS item per line. Use this when an item contains Sueños but the receipt may print another name. These exceptions apply only to this retailer.</small>
      <div class="admin-actions" style="margin-top:10px">
        <button type="button" class="admin-btn admin-btn-secondary" id="contest-receipt-allowed-items-save">Save accepted items</button>
      </div>
      <div class="admin-status" id="contest-receipt-allowed-items-status" role="status"></div>`;
    const note=settings.querySelector('.admin-note');
    if(note)note.insertAdjacentElement('beforebegin',wrap);else settings.appendChild(wrap);
    $('contest-receipt-allowed-items-save')?.addEventListener('click',save);
  }

  function syncVisibility(){
    install();
    const wrap=$('contest-receipt-allowed-items-wrap');
    if(!wrap)return;
    wrap.hidden=!isRetailChild();
    if(wrap.hidden){lastLoadedId='';return;}
    const id=currentId();
    if(id&&id!==lastLoadedId)load(id);
  }

  async function request(id,options={}){
    const r=await fetch(`/api/contest-receipt-allowed-items?id=${encodeURIComponent(id)}`,{
      ...options,
      headers:{authorization:`Bearer ${token()}`,...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})},
      cache:'no-store'
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(d.message||'Accepted receipt items request failed.');e.status=r.status;throw e;}
    return d;
  }

  async function load(id=currentId()){
    if(!id||loading||!isRetailChild())return;
    loading=true;
    const status=$('contest-receipt-allowed-items-status');
    if(status)status.textContent='Loading retailer exceptions…';
    try{
      const d=await request(id);
      if(currentId()!==id)return;
      $('contest-receipt-allowed-items').value=(d.items||[]).join('\n');
      lastLoadedId=id;
      if(status)status.textContent=(d.items||[]).length?`${d.items.length} accepted item${d.items.length===1?'':'s'} saved for ${d.retailerName}.`:`No retailer-specific accepted items yet.`;
    }catch(error){
      if(status)status.textContent=error.message;
    }finally{loading=false;}
  }

  async function save(){
    const id=currentId(),status=$('contest-receipt-allowed-items-status'),button=$('contest-receipt-allowed-items-save');
    if(!id||!isRetailChild())return;
    const items=itemsFromText($('contest-receipt-allowed-items')?.value||'');
    const original=button?.textContent||'Save accepted items';
    if(button){button.disabled=true;button.textContent='Saving…';}
    if(status)status.textContent='Saving retailer exceptions…';
    try{
      const d=await request(id,{method:'POST',body:JSON.stringify({items})});
      $('contest-receipt-allowed-items').value=(d.items||[]).join('\n');
      lastLoadedId=id;
      if(status)status.textContent=(d.items||[]).length?`Saved ${(d.items||[]).length} accepted item${d.items.length===1?'':'s'} for ${d.retailerName}.`:'Retailer exceptions cleared.';
    }catch(error){
      if(status)status.textContent=error.message;
    }finally{
      if(button){button.disabled=false;button.textContent=original;}
    }
  }

  const refreshSoon=()=>setTimeout(syncVisibility,120);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-edit],[data-retail-summary-edit],[data-contest-step="retail"],button[data-step="retail"]'))refreshSoon();
  });
  document.addEventListener('change',event=>{
    if(event.target?.id==='contest-type'||event.target?.id==='contest-retail-master')refreshSoon();
  });
  document.addEventListener('suenos:admin-authenticated',()=>{lastLoadedId='';setTimeout(syncVisibility,100);});
  setInterval(syncVisibility,1200);
  syncVisibility();
})();
