(()=>{
'use strict';
const $=id=>document.getElementById(id);
const section=$('admin-section-contests');
const editor=$('contest-editor');
const entries=$('contest-entries-panel');
const list=$('contest-admin-list');
if(!section||!editor||!list)return;

let mode='list';
function setMode(next){
  mode=next;
  section.classList.remove('contest-mode-list','contest-mode-edit','contest-mode-entries');
  section.classList.add(`contest-mode-${next}`);
  if(next==='list'){
    editor.hidden=true;
    if(entries)entries.hidden=true;
    section.querySelector(':scope > .admin-section-heading')?.scrollIntoView({block:'start'});
  }else if(next==='edit'){
    editor.hidden=false;
    if(entries)entries.hidden=true;
    requestAnimationFrame(()=>editor.scrollIntoView({block:'start'}));
    setTimeout(updateContext,0);
  }else if(next==='entries'){
    editor.hidden=true;
    if(entries)entries.hidden=false;
    requestAnimationFrame(()=>entries?.scrollIntoView({block:'start'}));
  }
}

function isRetailChild(){return $('contest-type')?.value==='retail'&&!$('contest-retail-master')?.checked&&Boolean($('contest-retail-parent-id')?.value)}
function isRetailMaster(){return $('contest-type')?.value==='retail'&&Boolean($('contest-retail-master')?.checked)}
function updateContext(){
  let ctx=editor.querySelector('.contest-workspace-context');
  if(!ctx){ctx=document.createElement('div');ctx.className='contest-workspace-context';editor.querySelector('.contest-editor-nav')?.insertAdjacentElement('beforebegin',ctx)}
  const child=isRetailChild(),master=isRetailMaster();
  editor.classList.toggle('is-retail-child',child);
  editor.classList.toggle('is-retail-master',master);
  const publicName=$('contest-public')?.value||'Untitled contest';
  const retailer=$('contest-retailer-name')?.value||'Retailer';
  const parent=$('contest-retail-parent-id')?.value||'';
  const eyebrow=child?'Retailer page':master?'Retail master':'Contest';
  const title=child?retailer:publicName;
  const sub=child?`${publicName} · Retailer-specific setup`:master?'Shared campaign settings and assets':'Contest setup';
  ctx.innerHTML=`<div><span class="cwc-eyebrow">${eyebrow}</span><strong>${escapeHtml(title)}</strong><p>${escapeHtml(sub)}</p></div>${child&&parent?`<button class="admin-btn admin-btn-secondary" type="button" data-clean-open-master="${escapeHtml(parent)}">Open master campaign</button>`:''}`;

  const nav=editor.querySelector('.contest-editor-nav');
  if(nav){
    const retailButton=nav.querySelector('[data-contest-section="retail"]');
    if(retailButton)retailButton.textContent=child?'Retailer':master?'Retailers':'Retailers';
    nav.querySelectorAll('[data-contest-section]').forEach(b=>{
      const k=b.dataset.contestSection;
      if(child)b.hidden=!['retail','dates','entry','review'].includes(k);
      else if(master)b.hidden=false;
      else b.hidden=k==='retail';
    });
    if(child&&!nav.querySelector('[data-contest-section].is-active:not([hidden])'))retailButton?.click();
  }
}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

document.addEventListener('click',e=>{
  const edit=e.target.closest('#contest-admin-list [data-edit], #contest-add');
  if(edit){setTimeout(()=>setMode('edit'),0);return;}
  const ent=e.target.closest('#contest-admin-list [data-entries]');
  if(ent){setTimeout(()=>setMode('entries'),0);return;}
  if(e.target.closest('#contest-editor-close')){setTimeout(()=>setMode('list'),0);return;}
  if(e.target.closest('#contest-entries-close')){setTimeout(()=>setMode('list'),0);return;}
  const master=e.target.closest('[data-clean-open-master]');
  if(master){
    setMode('list');
    setTimeout(()=>document.querySelector(`#contest-admin-list [data-edit="${CSS.escape(master.dataset.cleanOpenMaster)}"]`)?.click(),0);
    return;
  }
},true);

['contest-type','contest-retail-master','contest-retailer-name','contest-public'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(updateContext,0)));
$('contest-retailer-name')?.addEventListener('input',updateContext);
$('contest-public')?.addEventListener('input',updateContext);

const oldPanels=editor.querySelector(':scope > .admin-panels');if(oldPanels){oldPanels.hidden=true;oldPanels.style.setProperty('display','none','important')}
editor.querySelectorAll('.ce-editor-shell,.ce-sticky-actions').forEach(el=>el.style.setProperty('display','none','important'));

setMode(editor.hidden?'list':'edit');
})();
