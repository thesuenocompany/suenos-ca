(()=>{
'use strict';
const $=id=>document.getElementById(id);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];

function toast(message,type='success'){
  let region=q('.admin-toast-region');
  if(!region){region=document.createElement('div');region.className='admin-toast-region';region.setAttribute('aria-live','polite');document.body.appendChild(region);}
  const el=document.createElement('div');el.className=`admin-toast ${type}`;el.textContent=message;region.appendChild(el);setTimeout(()=>el.remove(),3200);
}
window.SuenosAdminToast=toast;

function groupNavigation(){
  const tabs=q('.admin-tabs');if(!tabs||tabs.dataset.grouped)return;tabs.dataset.grouped='1';
  const defs=[
    ['Overview',['dashboard','analytics']],
    ['Content',['recipes','hotline']],
    ['Marketing',['sunfest','contests','archived-contests']]
  ];
  const map=Object.fromEntries(qa('[data-admin-tab]',tabs).map(b=>[b.dataset.adminTab,b]));
  tabs.innerHTML='';
  defs.forEach(([title,keys])=>{const group=document.createElement('div');group.className='admin-nav-group';const h=document.createElement('div');h.className='admin-nav-group-title';h.textContent=title;group.appendChild(h);keys.forEach(k=>map[k]&&group.appendChild(map[k]));tabs.appendChild(group);});
}

function addPageContext(){
  const contexts={dashboard:['Overview','Dashboard'],analytics:['Overview','Analytics'],recipes:['Content','Cocktails'],hotline:['Content','Don Terry Hotline'],sunfest:['Marketing','Campaigns & Overlays'],contests:['Marketing','Contests'],'archived-contests':['Marketing','Contest Archive']};
  Object.entries(contexts).forEach(([key,[parent,current]])=>{const section=q(`[data-admin-section="${key}"]`);if(!section||q('.admin-breadcrumbs',section))return;const heading=q('.admin-section-heading',section)||section;const bc=document.createElement('div');bc.className='admin-breadcrumbs';bc.innerHTML=`<span>${parent}</span><span>›</span><span>${current}</span>`;heading.insertBefore(bc,heading.firstChild);});
}

function wrapperFor(el){
  if(!el)return null;
  if(el.matches('section,.retail-copy-tools,.retail-qr-tools,.admin-advanced-rules'))return el;
  return el.closest('.admin-field')||el.closest('.admin-check')||el.closest('.admin-upload-row')||el;
}
function moveIds(ids,target){const moved=new Set();ids.forEach(id=>{const el=$(id),w=wrapperFor(el);if(w&&!moved.has(w)){target.appendChild(w);moved.add(w);}});}
function section(title,description,key){const wrap=document.createElement('section');wrap.className='contest-ux-section';wrap.dataset.section=key;wrap.innerHTML=`<div class="admin-form-section"><div class="contest-section-head"><h3>${title}</h3>${description?`<p>${description}</p>`:''}</div><div class="contest-section-body"></div></div>`;return wrap;}

function buildContestEditor(){
  const editor=$('contest-editor');if(!editor||editor.dataset.uxBuilt)return;editor.dataset.uxBuilt='1';
  const oldPanels=q('.admin-panels',editor);if(!oldPanels)return;
  const oldActions=qa(':scope > .admin-actions',editor).pop();
  const sections=document.createElement('div');sections.className='contest-ux-sections';
  const defs=[
    ['start','Setup','Name the contest and control its saved/public state.'],
    ['retail','Retailers','Manage the retail campaign or the selected retailer page.'],
    ['page','Page','Public-facing copy and hero artwork.'],
    ['prize','Prize','Prize details shown to entrants and used in the rules.'],
    ['dates','Schedule','Opening, closing and draw timing.'],
    ['entry','Entry options','Eligibility, contact fields and optional entry settings.'],
    ['rules','Rules & confirmation','Official rules, privacy details and confirmation messaging.'],
    ['review','Review','Check the important settings before saving or previewing.']
  ];
  const sec={};defs.forEach(([k,t,d])=>{sec[k]=section(t,d,k);sections.appendChild(sec[k]);});
  editor.insertBefore(sections,oldPanels);const body=k=>q('.contest-section-body',sec[k]);

  moveIds(['contest-internal','contest-public','contest-type','contest-status-field'],body('start'));
  const adv=document.createElement('details');adv.className='admin-advanced';adv.innerHTML='<summary>Advanced settings</summary><div class="admin-advanced-body"></div>';body('start').appendChild(adv);moveIds(['contest-slug'],q('.admin-advanced-body',adv));
  const retail=$('contest-retail-settings');if(retail)body('retail').appendChild(retail);
  moveIds(['contest-eyebrow','contest-headline','contest-intro','contest-hero','contest-hero-file','contest-hero-upload','contest-mobile-hero','contest-mobile-file','contest-mobile-upload','contest-alt','contest-focal'],body('page'));
  moveIds(['contest-prize-title','contest-prize-desc','contest-value','contest-winners','contest-included','contest-excluded','contest-prize-image','contest-prize-file','contest-prize-upload','contest-alcohol-excluded'],body('prize'));
  moveIds(['contest-timezone','contest-start','contest-close','contest-draw'],body('dates'));
  moveIds(['contest-photo-enabled','contest-written-enabled','contest-festival-start','contest-festival-end','contest-event-location','contest-provinces','contest-age-mode','contest-min-age','contest-phone-enabled','contest-phone-required','contest-marketing-enabled','contest-marketing-text','contest-photo-rights'],body('entry'));
  moveIds(['contest-short-rules-wrap','contest-privacy-name','contest-privacy-email','contest-platform-disclaimer','contest-rules-template-enabled','contest-rules-template-fields','contest-rules-custom-entry-wrap','contest-rules-custom-free-wrap','contest-rules-version','contest-rules-preview','contest-rules-html','contest-rules-url','contest-confirm-heading','contest-confirm-message'],body('rules'));

  const review=document.createElement('div');review.className='contest-review-summary';review.innerHTML='<div class="admin-note"><strong>Ready to review</strong><p>Use the summary below to check public state, timing, retailer context and prize before saving.</p></div><div id="contest-review-live"></div>';body('review').appendChild(review);
  oldPanels.hidden=true;

  const nav=document.createElement('nav');nav.className='contest-editor-nav';nav.setAttribute('aria-label','Contest editor sections');
  defs.forEach(([k,t])=>{const b=document.createElement('button');b.type='button';b.dataset.contestSection=k;b.textContent=t;nav.appendChild(b);});
  const heading=q('.contest-editor-heading',editor);heading?.insertAdjacentElement('afterend',nav);

  const sticky=document.createElement('div');sticky.className='contest-sticky-actions';sticky.innerHTML='<span class="contest-save-state" id="contest-save-state">No unsaved changes</span>';
  if(oldActions){[...oldActions.children].forEach(c=>sticky.appendChild(c));oldActions.remove();}editor.appendChild(sticky);

  function openSection(key){qa('.contest-ux-section',editor).forEach(s=>s.classList.toggle('is-active',s.dataset.section===key));qa('[data-contest-section]',nav).forEach(b=>b.classList.toggle('is-active',b.dataset.contestSection===key));if(key==='review')updateReview();}
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-contest-section]');if(b)openSection(b.dataset.contestSection);});openSection('start');

  const tracked=qa('input,textarea,select',sections);tracked.forEach(el=>el.addEventListener('input',()=>{const state=$('contest-save-state');if(state)state.textContent='Unsaved changes';}));
  $('contest-save')?.addEventListener('click',()=>setTimeout(()=>{const state=$('contest-save-state');if(state)state.textContent='Saved';},250));
  function text(id,fallback='—'){const el=$(id);return (el?.value||fallback).trim?.()||fallback;}
  function updateReview(){const r=$('contest-review-live');if(!r)return;const retailer=text('contest-retailer-name','');const type=text('contest-type');const status=text('contest-status-field');r.innerHTML=`<dl class="contest-review-grid"><div><dt>Contest</dt><dd>${escapeHtml(text('contest-public'))}</dd></div><div><dt>Type</dt><dd>${escapeHtml(type==='retail'?(retailer?`Retailer page · ${retailer}`:'Retail campaign'):type)}</dd></div><div><dt>Saved state</dt><dd>${escapeHtml(status)}</dd></div><div><dt>Opens</dt><dd>${escapeHtml(text('contest-start'))}</dd></div><div><dt>Closes</dt><dd>${escapeHtml(text('contest-close'))}</dd></div><div><dt>Prize</dt><dd>${escapeHtml(text('contest-prize-title'))}</dd></div></dl>`;}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  // Retail context: hide shared sections when editing a child retailer.
  const applyRetailContext=()=>{const isRetail=$('contest-type')?.value==='retail';const isMaster=Boolean($('contest-retail-master')?.checked);const isChild=isRetail&&!isMaster&&Boolean($('contest-retail-parent-id')?.value);qa('[data-contest-section]',nav).forEach(b=>{if(isChild&&['page','prize','rules'].includes(b.dataset.contestSection))b.hidden=true;else b.hidden=false;});if(isChild){q('.contest-section-head h3',sec.retail).textContent=$('contest-retailer-name')?.value||'Retailer page';q('.contest-section-head p',sec.retail).textContent=`Shared campaign settings are managed in ${$('contest-public')?.value||'the retail master'}. This screen contains retailer-specific settings and materials.`;}else{q('.contest-section-head h3',sec.retail).textContent='Retailers';q('.contest-section-head p',sec.retail).textContent='Manage the retail campaign or the selected retailer page.';}};
  ['contest-type','contest-retail-master','contest-retail-parent-id','contest-retailer-name'].forEach(id=>$(id)?.addEventListener('change',applyRetailContext));
  editor.addEventListener('click',()=>setTimeout(applyRetailContext,0));applyRetailContext();
}

function fixSocialDesigner(){
  const shell=$('retail-social-canvas-shell');if(!shell)return; shell.style.touchAction='none';
  const img=$('retail-social-image');if(img)img.style.pointerEvents='none';
  // Make selection behaviour obvious.
  if(!q('.retail-social-draw-help',shell.parentElement)){const help=document.createElement('div');help.className='admin-note retail-social-draw-help';help.innerHTML='<strong>Set retailer brand area</strong><br>Choose a creative above, then click and drag directly across the preview to draw the box where the retailer logo or fallback retailer name should appear.';shell.parentElement.insertBefore(help,shell);}
}

function buttonFeedback(){
  document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled||b.dataset.noBusy==='1')return;const txt=(b.textContent||'').trim().toLowerCase();if(!/(save|upload|publish|archive|delete|create|generate|apply|refresh|send|select winner|restore|download)/.test(txt))return;const original=b.innerHTML;b.dataset.originalHtml=original;b.classList.add('is-busy');b.disabled=true;b.innerHTML='Working…';setTimeout(()=>{if(b.isConnected){b.disabled=false;b.classList.remove('is-busy');b.innerHTML=b.dataset.originalHtml||original;}},1800);},true);
}

function improveHeadings(){
  const replacements={
    'Don Terry Hotline Content':['Don Terry Hotline','Edit the page copy and response banks used by the Hotline.'],
    'Traffic Diagnostics':['Analytics','First-party traffic and campaign measurement diagnostics.']
  };
  Object.entries(replacements).forEach(([from,[to,sub]])=>{qa('.admin-content-section h2').filter(h=>h.textContent.trim()===from).forEach(h=>{h.textContent=to;const p=h.nextElementSibling;if(p?.classList.contains('admin-lede'))p.textContent=sub;});});
}

function init(){groupNavigation();addPageContext();improveHeadings();buildContestEditor();buttonFeedback();let socialTries=0;const waitForSocial=()=>{socialTries+=1;if(document.getElementById('retail-social-canvas-shell')){fixSocialDesigner();return}if(socialTries<80)setTimeout(waitForSocial,100)};waitForSocial();
  // Dashboard should be the default authenticated workspace.
  const dash=$('admin-tab-dashboard');if(dash&&!sessionStorage.getItem('suenos-admin-last-tab'))setTimeout(()=>dash.click(),50);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
