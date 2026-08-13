(function(){
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const PREVIEW_KEY='suenos-campaign-overlay-preview-v1';
  const section=document.getElementById('admin-section-sunfest');
  if(!section)return;
  const $=id=>document.getElementById(id);
  const status=$('campaign-status'),editorStatus=$('campaign-editor-status'),list=$('campaign-list'),editor=$('campaign-editor');
  const marketList=$('market-list'),marketEditor=$('market-editor'),marketStatus=$('market-status');
  let overlays=[],markets=[],currentIndex=-1,currentMarketIndex=-1,loaded=false;
  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const request=async(options={})=>{const r=await fetch('/api/campaign-overlays',{...options,headers:{accept:'application/json',authorization:`Bearer ${token()}`,...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})},cache:'no-store'});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||'Request failed.');return j;};
  const toLocal=v=>{if(!v)return'';const d=new Date(v);const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`};
  const slug=value=>String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const clone=value=>JSON.parse(JSON.stringify(value));
  const split=value=>[...new Set(String(value||'').split(/[\n,]+/).map(v=>v.trim()).filter(Boolean))];
  const join=value=>(Array.isArray(value)?value:[]).join(', ');
  const blankMarket=()=>({id:'',name:'New Market',countries:['CA'],provinces:[],cities:[],postalPrefixes:[]});
  const blank=()=>({id:'',name:'New Campaign',mode:'off',priority:0,startAt:'',endAt:'',linkUrl:'https://',targeting:{mode:'everyone',marketIds:[],countries:[],provinces:[],cities:[],postalPrefixes:[]},assets:{partnerLogo:'',heroDesktop:'',heroMobile:''},theme:{barBackground:'#D9A238',barText:'#111111',primaryButton:'#111111',primaryButtonText:'#F7F1E6'},en:{announcement:'',eyebrow:'',headline:'',body:'',primaryLabel:'Learn More',secondaryLabel:'Explore Cocktails'},es:{announcement:'',eyebrow:'',headline:'',body:'',primaryLabel:'Más información',secondaryLabel:'Explorar cócteles'}});
  const fields=['announcement','eyebrow','headline','body','primaryLabel','secondaryLabel'];

  function render(){
    list.innerHTML='';
    overlays.forEach((o,i)=>{
      const card=document.createElement('article');card.className='admin-recipe-row';
      const state=o.mode==='manual'?'ON NOW':o.mode==='scheduled'?'SCHEDULED':'OFF';
      const target=targetSummary(o.targeting);
      card.innerHTML=`<div class="admin-recipe-row-main"><strong>${escapeHTML(o.name)}</strong><small>${escapeHTML(o.id)} · Priority ${Number(o.priority)||0} · ${escapeHTML(target)}</small><span class="admin-recipe-state">${state}</span></div><div class="admin-recipe-row-actions"><button class="admin-btn admin-btn-secondary" data-edit="${i}" type="button">Edit</button><button class="admin-btn admin-btn-secondary" data-preview="${i}" type="button">Preview</button></div>`;
      list.append(card);
    });
    if(!overlays.length)list.innerHTML='<p class="admin-note">No overlays are saved yet. Add one to begin.</p>';
    refreshMarketOptions();
  }

  function renderMarkets(){
    marketList.innerHTML='';
    markets.forEach((market,i)=>{
      const card=document.createElement('article');card.className='admin-recipe-row';
      const details=[market.provinces?.join(', '),market.cities?.length?`${market.cities.length} cities`:'',market.postalPrefixes?.length?`${market.postalPrefixes.length} postal prefixes`:''].filter(Boolean).join(' · ');
      card.innerHTML=`<div class="admin-recipe-row-main"><strong>${escapeHTML(market.name)}</strong><small>${escapeHTML(market.id)}${details?` · ${escapeHTML(details)}`:''}</small></div><div class="admin-recipe-row-actions"><button class="admin-btn admin-btn-secondary" data-market-edit="${i}" type="button">Edit</button></div>`;
      marketList.append(card);
    });
    if(!markets.length)marketList.innerHTML='<p class="admin-note">No named markets yet.</p>';
    refreshMarketOptions();
  }

  function targetSummary(targeting={}){
    if(targeting.mode==='markets')return `${(targeting.marketIds||[]).length} named market${(targeting.marketIds||[]).length===1?'':'s'}`;
    if(targeting.mode==='custom')return 'Custom locations';
    return 'Everyone';
  }

  function refreshMarketOptions(){
    const select=$('campaign-marketIds');if(!select)return;
    const selected=new Set([...select.selectedOptions].map(option=>option.value));
    select.innerHTML=markets.map(m=>`<option value="${escapeHTML(m.id)}">${escapeHTML(m.name)}</option>`).join('');
    [...select.options].forEach(option=>{option.selected=selected.has(option.value);});
  }

  function hydrate(o){
    $('campaign-name').value=o.name||'';$('campaign-id').value=o.id||'';$('campaign-mode').value=o.mode||'off';$('campaign-priority').value=o.priority||0;$('campaign-startAt').value=toLocal(o.startAt);$('campaign-endAt').value=toLocal(o.endAt);$('campaign-linkUrl').value=o.linkUrl||'';
    const targeting=o.targeting||blank().targeting;
    $('campaign-targeting-mode').value=targeting.mode||'everyone';
    refreshMarketOptions();
    const selected=new Set(targeting.marketIds||[]);[...$('campaign-marketIds').options].forEach(option=>option.selected=selected.has(option.value));
    $('campaign-target-countries').value=join(targeting.countries);$('campaign-target-provinces').value=join(targeting.provinces);$('campaign-target-cities').value=join(targeting.cities);$('campaign-target-postalPrefixes').value=join(targeting.postalPrefixes);
    toggleTargetingFields();
    for(const key of ['heroDesktop','heroMobile','partnerLogo'])$(`campaign-${key}`).value=o.assets?.[key]||'';
    for(const key of ['barBackground','barText','primaryButton','primaryButtonText'])$(`campaign-${key}`).value=o.theme?.[key]||blank().theme[key];
    for(const lang of ['en','es'])for(const key of fields)$(`campaign-${lang}-${key}`).value=o[lang]?.[key]||'';
    $('campaign-editor-title').textContent=currentIndex<0?'Add Overlay':`Edit ${o.name}`;editor.hidden=false;editor.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function collect(){
    const id=slug($('campaign-id').value||$('campaign-name').value);
    return {id,name:$('campaign-name').value.trim()||'Untitled Campaign',mode:$('campaign-mode').value,priority:Number($('campaign-priority').value)||0,startAt:$('campaign-startAt').value?$('campaign-startAt').value+'-07:00':'',endAt:$('campaign-endAt').value?$('campaign-endAt').value+'-07:00':'',linkUrl:$('campaign-linkUrl').value.trim(),targeting:{mode:$('campaign-targeting-mode').value,marketIds:[...$('campaign-marketIds').selectedOptions].map(o=>o.value),countries:split($('campaign-target-countries').value),provinces:split($('campaign-target-provinces').value),cities:split($('campaign-target-cities').value),postalPrefixes:split($('campaign-target-postalPrefixes').value)},assets:Object.fromEntries(['heroDesktop','heroMobile','partnerLogo'].map(k=>[k,$(`campaign-${k}`).value.trim()])),theme:Object.fromEntries(['barBackground','barText','primaryButton','primaryButtonText'].map(k=>[k,$(`campaign-${k}`).value])),en:Object.fromEntries(fields.map(k=>[k,$(`campaign-en-${k}`).value.trim()])),es:Object.fromEntries(fields.map(k=>[k,$(`campaign-es-${k}`).value.trim()]))};
  }

  function toggleTargetingFields(){
    const mode=$('campaign-targeting-mode').value;
    $('campaign-market-targeting').hidden=mode!=='markets';
    $('campaign-custom-targeting').hidden=mode!=='custom';
  }

  function hydrateMarket(market){
    $('market-name').value=market.name||'';$('market-id').value=market.id||'';$('market-countries').value=join(market.countries);$('market-provinces').value=join(market.provinces);$('market-cities').value=join(market.cities);$('market-postalPrefixes').value=join(market.postalPrefixes);
    $('market-editor-title').textContent=currentMarketIndex<0?'Add Market':`Edit ${market.name}`;marketEditor.hidden=false;marketEditor.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function collectMarket(){
    return {id:slug($('market-id').value||$('market-name').value),name:$('market-name').value.trim()||'Untitled Market',countries:split($('market-countries').value),provinces:split($('market-provinces').value),cities:split($('market-cities').value),postalPrefixes:split($('market-postalPrefixes').value)};
  }

  async function load(){try{const r=await request();overlays=clone(r.overlays||[]);markets=clone(r.markets||[]);render();renderMarkets();const loc=r.detectedLocation||{};const detected=[loc.city,loc.provinceCode||loc.provinceName,loc.postalCode].filter(Boolean).join(', ');status.textContent=`Loaded ${overlays.length} overlay${overlays.length===1?'':'s'} and ${markets.length} market${markets.length===1?'':'s'}. ${r.activeOverlay?`Active here: ${r.activeOverlay.name}.`:'No overlay is active for this location.'}${detected?` Detected admin location: ${detected}.`:''}`;loaded=true;}catch(e){status.textContent=e.message;}}
  document.querySelector('[data-admin-tab="sunfest"]')?.addEventListener('click',()=>{if(!loaded)load();});
  $('campaign-targeting-mode').addEventListener('change',toggleTargetingFields);
  $('campaign-add').addEventListener('click',()=>{currentIndex=-1;hydrate(blank());});
  $('campaign-editor-close').addEventListener('click',()=>{editor.hidden=true;currentIndex=-1;});
  list.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),preview=e.target.closest('[data-preview]');if(edit){currentIndex=Number(edit.dataset.edit);hydrate(clone(overlays[currentIndex]));}if(preview)openPreview(overlays[Number(preview.dataset.preview)]?.id);});
  $('campaign-apply').addEventListener('click',()=>{try{const item=collect();if(!item.id)throw new Error('Campaign ID is required.');if(item.targeting.mode==='markets'&&!item.targeting.marketIds.length)throw new Error('Select at least one named market.');if(currentIndex<0)overlays.push(item);else overlays[currentIndex]=item;render();editor.hidden=true;currentIndex=-1;status.textContent='Changes applied locally. Click Save All Overlays Live to publish.';}catch(e){editorStatus.textContent=e.message;}});
  $('campaign-delete').addEventListener('click',()=>{if(currentIndex<0){editor.hidden=true;return;}if(!confirm(`Delete ${overlays[currentIndex].name}?`))return;overlays.splice(currentIndex,1);currentIndex=-1;editor.hidden=true;render();status.textContent='Overlay removed locally. Save all overlays to publish the deletion.';});
  $('campaign-preview').addEventListener('click',()=>{const item=collect();if(currentIndex<0){overlays.push(item);currentIndex=overlays.length-1;}else overlays[currentIndex]=item;openPreview(item.id);});

  $('market-add').addEventListener('click',()=>{currentMarketIndex=-1;hydrateMarket(blankMarket());});
  $('market-editor-close').addEventListener('click',()=>{marketEditor.hidden=true;currentMarketIndex=-1;});
  marketList.addEventListener('click',e=>{const edit=e.target.closest('[data-market-edit]');if(!edit)return;currentMarketIndex=Number(edit.dataset.marketEdit);hydrateMarket(clone(markets[currentMarketIndex]));});
  $('market-apply').addEventListener('click',()=>{try{const market=collectMarket();if(!market.id)throw new Error('Market ID is required.');if(![market.countries,market.provinces,market.cities,market.postalPrefixes].some(items=>items.length))throw new Error('Add at least one location to the market.');if(currentMarketIndex<0)markets.push(market);else markets[currentMarketIndex]=market;renderMarkets();marketEditor.hidden=true;currentMarketIndex=-1;marketStatus.textContent='Market changes applied locally. Save all overlays to publish.';}catch(e){marketStatus.textContent=e.message;}});
  $('market-delete').addEventListener('click',()=>{if(currentMarketIndex<0){marketEditor.hidden=true;return;}const market=markets[currentMarketIndex];const usedBy=overlays.filter(o=>(o.targeting?.marketIds||[]).includes(market.id));if(usedBy.length){marketStatus.textContent=`This market is used by: ${usedBy.map(o=>o.name).join(', ')}. Remove it from those overlays first.`;return;}if(!confirm(`Delete ${market.name}?`))return;markets.splice(currentMarketIndex,1);currentMarketIndex=-1;marketEditor.hidden=true;renderMarkets();marketStatus.textContent='Market removed locally. Save all overlays to publish.';});

  $('campaign-save-live').addEventListener('click',async()=>{status.textContent='Saving overlays and markets…';try{const r=await request({method:'PUT',body:JSON.stringify({overlays,markets})});overlays=clone(r.overlays||[]);markets=clone(r.markets||[]);render();renderMarkets();status.textContent=`Saved ${overlays.length} overlay${overlays.length===1?'':'s'} and ${markets.length} market${markets.length===1?'':'s'}. ${r.activeOverlay?`Active here: ${r.activeOverlay.name}.`:'No overlay is active for this location.'}`;}catch(e){status.textContent=e.message;}});
  $('campaign-reset').addEventListener('click',async()=>{if(!confirm('Reset the overlay and market library to the defaults?'))return;try{const r=await request({method:'DELETE'});overlays=clone(r.overlays||[]);markets=clone(r.markets||[]);render();renderMarkets();status.textContent='Overlay and market libraries reset. All overlays are off.';}catch(e){status.textContent=e.message;}});
  document.querySelectorAll('[data-campaign-upload]').forEach(button=>button.addEventListener('click',()=>uploadAsset(button.dataset.campaignUpload,button)));

  async function uploadAsset(kind,button){
    const file=$(`campaign-${kind}-file`).files?.[0];if(!file){editorStatus.textContent='Choose an image first.';return;}
    const id=slug($('campaign-id').value||$('campaign-name').value)||'campaign';const form=new FormData();form.append('file',file);form.append('kind',kind);form.append('campaign',id);button.disabled=true;editorStatus.textContent='Uploading…';
    try{const r=await fetch('/api/campaign-assets',{method:'POST',headers:{authorization:`Bearer ${token()}`},body:form});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.message||'Upload failed.');$(`campaign-${kind}`).value=j.url;editorStatus.textContent='Image uploaded.';}catch(e){editorStatus.textContent=e.message;}finally{button.disabled=false;}
  }
  function encodePreviewDraft(value){
    const bytes=new TextEncoder().encode(JSON.stringify(value));
    let binary='';
    for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function openPreview(id){
    const adminToken=token();
    if(!adminToken){status.textContent='Your admin session has expired. Please log in again.';return;}
    const overlay=overlays.find(item=>item.id===id);
    if(!overlay){status.textContent='That overlay is not available to preview.';return;}
    let encodedDraft='';
    try{
      encodedDraft=encodePreviewDraft(overlay);
      const stored=JSON.stringify({id,overlay,createdAt:Date.now()});
      localStorage.setItem(PREVIEW_KEY,stored);
      localStorage.setItem(`${PREVIEW_KEY}:${id}`,stored);
    }catch(error){
      status.textContent='The preview draft could not be prepared in this browser.';
      return;
    }
    const hash=new URLSearchParams({
      'campaign-admin-token':adminToken,
      'campaign-preview-draft':encodedDraft
    });
    window.open(`/en-ca/?campaign-preview=1&campaign-id=${encodeURIComponent(id)}#${hash.toString()}`,'_blank');
  }
  function escapeHTML(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
})();
