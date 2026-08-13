(function(){
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const PREVIEW_KEY='suenos-campaign-overlay-preview-v1';
  const params=new URLSearchParams(location.search);
  const isPreview=params.get('campaign-preview')==='1'||params.get('sunfest-preview')==='1';
  const previewId=params.get('campaign-id')||'';
  const lang=document.documentElement.lang?.toLowerCase().startsWith('es')?'es':'en';
  const isHome=/^\/(en-ca|es-mx)\/?$/.test(location.pathname);
  function decodePreviewDraft(value){
    if(!value)return null;
    try{
      const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
      const padded=normalized+'='.repeat((4-normalized.length%4)%4);
      const binary=atob(padded);
      const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    }catch{return null;}
  }
  const hashParams=new URLSearchParams(location.hash.replace(/^#/,''));
  let token=isPreview?sessionStorage.getItem(TOKEN_KEY):'';
  let previewDraft=isPreview?decodePreviewDraft(hashParams.get('campaign-preview-draft')):null;
  if(isPreview){
    const hashToken=hashParams.get('campaign-admin-token')||hashParams.get('sunfest-admin-token');
    if(hashToken){try{token=hashToken;sessionStorage.setItem(TOKEN_KEY,token);}catch{}}
    if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  }
  const headers={accept:'application/json'};if(token)headers.authorization=`Bearer ${token}`;
  if(previewDraft&&previewId&&previewDraft.id!==previewId)previewDraft=null;
  if(isPreview&&previewId&&!previewDraft){
    try{
      const saved=JSON.parse(localStorage.getItem(`${PREVIEW_KEY}:${previewId}`)||localStorage.getItem(PREVIEW_KEY)||'null');
      if(saved&&saved.id===previewId&&saved.overlay&&(Date.now()-Number(saved.createdAt||0))<30*60*1000)previewDraft=saved.overlay;
    }catch{}
  }
  fetch('/api/campaign-overlays',{headers,cache:'no-store'})
    .then(async r=>{const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.message||'Unable to load campaign overlay.');return data;})
    .then(data=>{
      const overlay=isPreview
        ? previewDraft||((data.overlays||[]).find(item=>item.id===previewId)||null)
        : data.overlay;
      if(!overlay){if(isPreview)showPreviewError(`The requested overlay “${previewId||'unknown'}” was not found. Return to Admin and click Preview again.`);return;}
      const copy=overlay[lang]||overlay.en;
      const assets=overlay.assets||{};
      document.body.classList.add('sunfest-overlay-active',isHome?'sunfest-home-overlay':'sunfest-interior-overlay');
      document.body.dataset.campaignOverlay=overlay.id;
      if(isPreview)document.body.classList.add('sunfest-overlay-preview');
      applyTheme(overlay.theme||{});
      renderPartnerBar(overlay,copy,assets);
      document.querySelector('.site-header')?.classList.add('sunfest-site-header');
      renderFooterTakeover(overlay,copy,assets);
      if(isHome)renderHeroTakeover(overlay,copy,assets);else renderInteriorBadge(overlay,copy,assets);
      bindSunfestMapButtons(overlay,copy);
    }).catch(error=>{if(isPreview)showPreviewError(error.message||'The preview could not be loaded.');});

  function applyTheme(theme){
    const root=document.documentElement;
    root.style.setProperty('--campaign-bar-bg',theme.barBackground||'#D9A238');
    root.style.setProperty('--campaign-bar-text',theme.barText||'#111111');
    root.style.setProperty('--campaign-primary',theme.primaryButton||'#111111');
    root.style.setProperty('--campaign-primary-text',theme.primaryButtonText||'#F7F1E6');
  }
  function renderPartnerBar(config,copy,assets){
    const locator=lang==='es'?'/es-mx/encuentra-una-botella/':'/en-ca/find-a-bottle/';
    const bar=document.createElement('aside');bar.className='sunfest-partner-bar';bar.setAttribute('aria-label',copy.announcement||config.name);
    bar.innerHTML=`<div class="sunfest-partner-frame" aria-hidden="true"></div><div class="container sunfest-partner-bar-inner"><div class="sunfest-partner-message"><span class="sunfest-partner-eyebrow">${escapeHTML(copy.eyebrow||'FEATURED CAMPAIGN')}</span><strong class="sunfest-partner-title">${escapeHTML(config.name)}</strong></div><div class="sunfest-partner-lockup"><span class="sunfest-partner-star" aria-hidden="true">★</span>${assets.partnerLogo?`<img src="${escapeAttr(assets.partnerLogo)}" alt="${escapeAttr(config.name)}" class="sunfest-partner-logo"/>`:''}<span class="sunfest-partner-star" aria-hidden="true">★</span><span class="sunfest-partner-date">${escapeHTML(copy.announcement||'')}</span></div><div class="sunfest-partner-actions"><a class="sunfest-partner-button sunfest-partner-button-primary" href="${escapeAttr(config.linkUrl)}" target="_blank" rel="noopener">${escapeHTML(copy.primaryLabel||'Learn More')}</a><a class="sunfest-partner-button" href="${locator}">${lang==='es'?'Encuentra una botella':'Find a Bottle'}</a></div></div>`;
    document.body.prepend(bar);
  }
  function renderHeroTakeover(config,copy,assets){
    const original=document.querySelector('.hero-poster');if(!original)return;original.classList.add('sunfest-original-hero');
    const locator=lang==='es'?'/es-mx/encuentra-una-botella/':'/en-ca/find-a-bottle/';
    const cocktails=lang==='es'?'/es-mx/cocteles/':'/en-ca/cocktails/';
    const hero=document.createElement('section');hero.className='sunfest-hero-takeover sunfest-hero-graphic-mode';hero.setAttribute('aria-label',copy.headline||config.name);
    hero.innerHTML=`<div class="sunfest-hero-graphic-wrap"><picture class="sunfest-hero-artwork"><source media="(max-width:720px)" srcset="${escapeAttr(assets.heroMobile)}"><img src="${escapeAttr(assets.heroDesktop)}" alt="${escapeAttr(copy.headline||config.name)}"></picture><div class="sunfest-hero-cta-layer"><a class="sunfest-primary" href="${escapeAttr(config.linkUrl)}" target="_blank" rel="noopener">${escapeHTML(copy.primaryLabel||'Learn More')}</a><a class="sunfest-secondary" href="${locator}">${lang==='es'?'Encuentra una botella':'Find a Bottle'}</a><a class="sunfest-tertiary" href="${cocktails}">${escapeHTML(copy.secondaryLabel||(lang==='es'?'Explorar cócteles':'Explore Cocktails'))}</a></div><div class="sr-only"><h1>${escapeHTML(copy.headline||config.name)}</h1><p>${escapeHTML(copy.body||'')}</p></div></div>`;
    original.insertAdjacentElement('beforebegin',hero);
  }
  function renderFooterTakeover(config,copy,assets){
    const footer=document.querySelector('.footer');if(!footer||footer.querySelector('.sunfest-footer-banner'))return;footer.classList.add('sunfest-site-footer');
    const banner=document.createElement('section');banner.className='sunfest-footer-banner';banner.innerHTML=`<div class="container sunfest-footer-banner-inner"><div class="sunfest-footer-copy"><p class="sunfest-footer-kicker">${escapeHTML(copy.eyebrow||'FEATURED CAMPAIGN')}</p><h2>${escapeHTML(config.name)}</h2><p>${escapeHTML(copy.body||'')}</p></div><div class="sunfest-footer-branding">${assets.partnerLogo?`<img src="${escapeAttr(assets.partnerLogo)}" alt="${escapeAttr(config.name)}">`:''}<a class="sunfest-footer-button" href="${escapeAttr(config.linkUrl)}" target="_blank" rel="noopener">${escapeHTML(copy.primaryLabel||'Learn More')}</a></div></div>`;footer.prepend(banner);
  }
  function renderInteriorBadge(config,copy,assets){if(!assets.partnerLogo)return;const badge=document.createElement('a');badge.className='sunfest-partner-badge';badge.href=config.linkUrl;badge.target='_blank';badge.rel='noopener';badge.setAttribute('aria-label',copy.announcement||config.name);badge.innerHTML=`<span>${escapeHTML(copy.eyebrow||config.name)}</span><img src="${escapeAttr(assets.partnerLogo)}" alt="${escapeAttr(config.name)}">`;document.body.append(badge);}

  function bindSunfestMapButtons(config,copy){
    const label=String(copy.primaryLabel||'').toLowerCase();
    const name=String(config.name||'').toLowerCase();
    if(!name.includes('sunfest')||!label.includes('find us'))return;
    const selectors=['.sunfest-partner-button-primary','.sunfest-primary','.sunfest-footer-button'];
    document.querySelectorAll(selectors.join(',')).forEach(link=>{
      link.removeAttribute('target');
      link.removeAttribute('rel');
      link.setAttribute('href','#sunfest-map');
      link.setAttribute('aria-haspopup','dialog');
      link.addEventListener('click',event=>{
        event.preventDefault();
        openSunfestMap();
      });
    });
  }
  function openSunfestMap(){
    let modal=document.querySelector('.sunfest-map-modal');
    if(!modal){
      modal=document.createElement('div');
      modal.className='sunfest-map-modal';
      modal.setAttribute('role','dialog');
      modal.setAttribute('aria-modal','true');
      modal.setAttribute('aria-label','Find Sueños at Sunfest');
      modal.innerHTML=`<div class="sunfest-map-backdrop" data-close-map></div><div class="sunfest-map-panel"><button class="sunfest-map-close" type="button" aria-label="Close Sunfest map" data-close-map>×</button><div class="sunfest-map-heading"><span>FIND US AT SUNFEST</span><strong>Sueños is beside The Lawn</strong></div><img src="/assets/images/find-us-sunfest-map.png" alt="Sunfest site map showing the Sueños location beside The Lawn" loading="eager"><p class="sunfest-map-note">Look for the Sueños logo beside <strong>The Lawn</strong>, near the main stage area.</p></div>`;
      document.body.append(modal);
      modal.querySelectorAll('[data-close-map]').forEach(el=>el.addEventListener('click',closeSunfestMap));
      modal.addEventListener('keydown',event=>{if(event.key==='Escape')closeSunfestMap();});
    }
    modal.classList.add('is-open');
    document.body.classList.add('sunfest-map-open');
    modal.querySelector('.sunfest-map-close')?.focus();
  }
  function closeSunfestMap(){
    document.querySelector('.sunfest-map-modal')?.classList.remove('is-open');
    document.body.classList.remove('sunfest-map-open');
  }

  function showPreviewError(message){const notice=document.createElement('div');notice.className='sunfest-preview-error';notice.textContent=message;document.body.prepend(notice);}
  function escapeHTML(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function escapeAttr(value=''){return escapeHTML(value);}
})();
