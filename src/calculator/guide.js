import './workspace.js';
import {steps,stepNumber,costStatus,guideIssues} from './guide-model.js';
const api=window.suenosWorkspace,$=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const main=document.querySelector('main');
const guide=document.createElement('section');guide.id='guide';guide.innerHTML=`<div class="guide-heading"><div><div class="eyebrow">YOUR PRODUCTION PLAN</div><h1>Let’s build your mix.</h1><p>Cans, kegs and bottled mixto. One step at a time.</p></div><button id="guide-expert" class="btn subtle">Advanced RTD comparison</button></div><nav class="guide-steps" aria-label="Production planning steps">${steps.map((s,i)=>`<button data-guide-step="${i+1}"><span>${i+1}</span>${s}</button>`).join('')}</nav><div class="guide-utilities"></div><div class="guide-step-heading"><span id="guide-progress" class="eyebrow"></span><h2 id="guide-title" tabindex="-1"></h2><p id="guide-help"></p></div><div id="guide-status" role="status" aria-live="polite"></div><div id="guide-start"></div><div id="guide-assignments" class="panel"></div><div id="guide-cost-note" class="notice"></div><div id="guide-review-note" class="notice"></div>`;
main.prepend(guide);const migration=document.createElement('p');migration.className='notice';migration.textContent='Moving from the original calculator? Export Backup JSON there, then use Import JSON here to bring your saved mix and suppliers across. Browser saves do not transfer between website addresses. This unlisted link is accessible to anyone who has it.';guide.querySelector('.guide-utilities').after(migration);
const footer=document.createElement('div');footer.className='guide-navigation';footer.innerHTML='<button id="guide-back" class="btn">← Back</button><span id="guide-count"></span><button id="guide-next" class="btn primary">Next →</button>';main.append(footer);
const backToGuide=document.createElement('button');backToGuide.className='btn guide-return';backToGuide.textContent='← Return to guided plan';main.prepend(backToGuide);
const mix=$('calculator-mix');$('guide-start').append(mix);mix.querySelector('h2').textContent='What would you like to make?';mix.querySelector(':scope > p').textContent='Add each package you need. Mix RTDs and bottled tequila in the same plan; you can adjust every row in the next step.';
$('edit-mix').textContent='Edit quantities →';$('edit-mix').addEventListener('click',()=>go(2));
mix.querySelector(':scope > .hint').textContent='New rows use planning assumptions: 3% loss, 35% producer margin and 30% retailer margin. All production cost inputs start unquoted at zero and remain flagged until you review them. Supplier quotes and FX are historical; verify them in step 3.';
$('mix-quantity').value='';$('mix-quantity').placeholder='e.g. 100';
$('mix-supply').closest('label').classList.add('guide-mix-supply');
const actions=document.querySelector('.plan-actions');document.querySelector('.guide-utilities').append(actions);
$('export-backup').textContent='Backup JSON';$('import-backup').textContent='Import JSON';
const tax=$('tax-section'),taxHome=document.createComment('RTD tax home');tax.before(taxHome);tax.classList.add('guide-rtd-tax');tax.querySelector('summary').innerHTML='Advanced RTD & keg taxes <span class="tag amber">Separate from bottled spirits</span>'; 
const costNote=$('guide-cost-note');costNote.textContent='Enter your quotes in CAD. Zero means no cost only after you review the row. Unreviewed rows are incomplete estimates. Loss and margin values are planning assumptions, not supplier quotes. Advanced tax settings retain your saved values.';
const descriptions=[
 'Choose a package, strength and number of containers, then add it. Repeat for every product you want in this batch.',
 'Check the size, finished alcohol strength and container count for each row. Adding another product keeps existing rows and their costs intact.',
 'Select each product’s tequila source, then review the source quote and planned stock below. Source strength must be at least the finished strength. Historical quotes and FX need confirmation.',
 'Enter packaging, filling and other costs for each product. Open advanced taxes only when needed. Blank or unreviewed costs must be resolved before treating prices as complete.',
 'Review quantities, supply usage, costs and open assumptions together. Prices are estimates; unverified inputs are highlighted below.'
];
let step=stepNumber(location.hash||api.get().guideStep||1),expert=false;
// A genuinely new browser starts with an empty mix. Existing saved rows are never reset.
if(!api.hadSavedWorkspace){api.get().products=[];api.get().guideStep=1;api.commit();step=1;}
function decorate(){
 document.querySelectorAll('#product-list [data-product]').forEach(card=>{
  if(card.dataset.guidePrepared)return;card.dataset.guidePrepared='true';
  const p=api.get().products.find(p=>p.id===card.dataset.product);if(!p)return;
  const line=card.querySelector('[data-field="productLine"]');line.closest('label').classList.add('guide-product-line');
  const supply=card.querySelector('[data-field="supplyId"]');supply.closest('label').classList.add('guide-source-field');
  // Within a guided row, only equivalent formats are offered. Changing product type means adding a row.
  const format=card.querySelector('[data-field="format"]');const kind=api.isBottle(p.format)?'bottle':['355','473'].includes(p.format)?'can':'keg';
  [...format.options].forEach(o=>{const k=api.isBottle(o.value)?'bottle':['355','473'].includes(o.value)?'can':'keg';o.disabled=!expert&&kind!==k;});
  const facts=document.createElement('p');facts.className='guide-product-facts';facts.textContent=`${api.formats.find(f=>f[0]===p.format)?.[1]||p.format} · ${p.format==='custom'?p.customLitres+' L · ':''}${p.abv}% ABV · ${p.quantity} containers · ${api.get().supplies.find(s=>s.id===p.supplyId)?.name||'Choose supply'}`;card.querySelector('.product-heading').after(facts);
  const costs=card.querySelector('.product-costs');costs.open=true;
  const acknowledgement=document.createElement('label');acknowledgement.className='check guide-cost-ack';acknowledgement.innerHTML=`<input type="checkbox" data-field="guideCostReviewed" ${p.guideCostReviewed?'checked':''}><span>I reviewed every cost and margin for this product. Any zero is intentional, not a missing quote.</span>`;costs.append(acknowledgement);
  const banner=document.createElement('p');banner.className='guide-cost-state';banner.textContent=p.guideCostReviewed?'Costs reviewed by you · pricing assumptions still apply':'Incomplete estimate — costs have not been reviewed; zeros may be missing quotes.';card.querySelector('.product-results').before(banner);
  const name=card.querySelector('.product-heading input');name.setAttribute('aria-label','Product name');
  card.querySelectorAll('input[type="number"]').forEach(el=>{el.required=true;el.inputMode=el.dataset.field==='quantity'?'numeric':'decimal';if(el.dataset.field==='quantity')el.step='1';});
  card.querySelector('.product-costs summary').innerHTML='Packaging, other costs & margins <span>All amounts CAD · enter quotes or intentional zeros</span>';
 });
 const supplierEditor=$('supplier-editor');if(!supplierEditor.querySelector('.guide-supplier-extra')){const extra=document.createElement('details');extra.className='guide-supplier-extra';extra.innerHTML='<summary>Optional contact details & quote reference</summary><div class="supplier-fields"></div>';supplierEditor.append(extra);for(const k of ['contact','email','phone','quoteDate','sourceUrl']){const input=supplierEditor.querySelector(`[data-field="${k}"]`);if(input)extra.lastElementChild.append(input.closest('label'));}}
 document.querySelectorAll('#supplier-editor input[type="number"]').forEach(el=>{el.required=true;el.inputMode='decimal';});
}
function status(){
 const w=api.get(),plan=api.compute(),issues=guideIssues(w,plan,step),missing=[...costStatus(w.products),...w.supplies.filter(s=>w.products.some(p=>p.supplyId===s.id)&&!(Number(s.price)>0)).map(s=>s.name+' (source price missing)')];
 const liveInvalid=[...document.querySelectorAll('body.guided input[type="number"]')].filter(e=>e.id!=='mix-quantity'&&e.offsetParent!==null&&!e.validity.valid);
 const fxIssues=w.supplies.filter(s=>s.guideFxReview&&w.products.some(p=>p.supplyId===s.id)).map(s=>s.name+': currency changed; enter the correct FX rate in step 3.');const list=[...issues,...fxIssues,...(liveInvalid.length?['Complete the highlighted numeric fields with valid values.']:[])];
 $('guide-status').innerHTML=list.length?`<div class="plan-error">${list.map(esc).join('<br>')}</div>`:'';
 $('guide-next').disabled=step<5&&(list.length>0);
 $('guide-count').textContent=`${w.products.length} product${w.products.length===1?'':'s'} · saved in this browser`;
 $('guide-review-note').innerHTML=`<strong>${missing.length?'Incomplete cost estimate':'Review your assumptions'}</strong><p>${missing.length?esc(missing.join(', '))+': costs not reviewed. Zero entries may be missing quotes. Return to step 4 before relying on prices.':'You marked product costs reviewed. This does not verify the quotes or tax route.'}</p><p>Supplier terms, quote units, FX, source strength and licensed excise treatment require confirmation. Each product draws from its own source; no supplier stock is pooled. Shared overhead is allocated once.</p>${w.products.some(p=>api.isBottle(p.format))?'<p><strong>BC spirits markup is an editable historical reference, not verified current. Confirm the graduated tiers and eligibility of every bottle size with LDB.</strong> Federal excise is selected separately; do not add duty again when already included in the quote.</p>':''}<button class="text-button" id="guide-sources">View source audit & effective dates ↗</button>`;
 $('guide-sources').onclick=()=>$('sources-top').click();
 $('guide-next').textContent=step===5?'Save plan':step===4&&missing.length?'Review incomplete estimate →':'Next →';
}
function show(focus=false){
 document.body.classList.toggle('guided',!expert);document.body.dataset.guideStep=step;
 guide.hidden=expert;footer.hidden=expert;backToGuide.hidden=!expert;
 if(expert){tax.hidden=false;taxHome.after(tax);api.switchTab('calculator');return;}
 api.switchTab(step===3?'suppliers':'production');
 document.querySelector('#pane-production .plan-tools').after(tax);tax.open=false;tax.hidden=api.get().products.length>0&&api.get().products.every(p=>api.isBottle(p.format));
 $('guide-title').textContent=steps[step-1];$('guide-progress').textContent=`STEP ${step} OF 5`;$('guide-help').textContent=descriptions[step-1];
 document.querySelectorAll('[data-guide-step]').forEach(b=>{b.setAttribute('aria-current',Number(b.dataset.guideStep)===step?'step':'false');});
 $('guide-start').hidden=step!==1;$('guide-assignments').hidden=step!==3;if(step===3){$('guide-assignments').innerHTML='<h3>Which source supplies each product?</h3><div class="supplier-fields">'+api.get().products.map(p=>`<label>${esc(p.name)}<select data-guide-supply="${esc(p.id)}">${api.get().supplies.map(s=>`<option value="${esc(s.id)}" ${s.id===p.supplyId?'selected':''}>${esc(s.name)} · ${s.abv}% ABV</option>`).join('')}</select></label>`).join('')+'</div><p class="hint">Select a quote below to edit its available litres, alcohol strength, price basis, currency, FX and landed costs. Changing a source updates every row assigned to it.</p>';}costNote.hidden=step!==4;$('guide-review-note').hidden=step!==5;
 $('guide-back').disabled=step===1;decorate();status();
 if(focus){$('guide-title').focus({preventScroll:true});guide.scrollIntoView({behavior:'auto',block:'start'});}
}
function go(n){step=stepNumber(n);api.get().guideStep=step;api.commit();history.pushState(null,'',`#step-${step}`);show(true);}
$('guide-assignments').addEventListener('change',e=>{const p=api.get().products.find(p=>p.id===e.target.dataset.guideSupply);if(p){p.supplyId=e.target.value;api.commit();status();}});
window.addEventListener('popstate',()=>{step=stepNumber(location.hash);show(true);});
window.addEventListener('hashchange',()=>{step=stepNumber(location.hash);show();});
$('guide-back').onclick=()=>go(step-1);$('guide-next').onclick=()=>step===5?$('save-workspace').click():go(step+1);
document.querySelectorAll('[data-guide-step]').forEach(b=>b.onclick=()=>go(Number(b.dataset.guideStep)));
$('guide-expert').onclick=()=>{expert=true;show();};backToGuide.onclick=()=>{expert=false;show();};
// Use the original shared workspace and exports; no separate guide scenario is created.
$('add-to-mix').addEventListener('click',e=>{
 e.stopImmediatePropagation();const quantity=Number($('mix-quantity').value),format=$('mix-format').value,abv=Number($('mix-abv').value);
 if(!Number.isInteger(quantity)||quantity<=0){$('mix-quantity').reportValidity();$('mix-quantity').focus();return;}
 const p={...api.defaults,...(api.isBottle(format)?api.bottleDefaults:{}),id:api.uid('product'),name:api.formats.find(f=>f[0]===format)[1],format,abv,quantity,supplyId:api.get().supplies[0]?.id||'',guideCostReviewed:false};
 for(const k of ['juicePerL','blendPerL','can','lid','bottle','closure','label','carton','fill','kegCost','storage','otherFixed','otherPerUnit'])p[k]=0;
 api.get().products.push(p);api.commit();decorate();status();$('mix-quantity').value='';
},true);
// Save while typing without replacing the focused field or moving the mobile keyboard.
function productEdit(e){
 if(expert)return false;const k=e.target.dataset.field,card=e.target.closest('[data-product]');if(!card||!k)return false;
 const p=api.get().products.find(p=>p.id===card.dataset.product);if(!p)return false;
 if(k==='abvPreset')p.abv=Number(e.target.value);
 else p[k]=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'||k==='abv'?(e.target.value===''?'':Number(e.target.value)):e.target.value;
 if(k!=='guideCostReviewed')p.guideCostReviewed=false;
 api.saveOnly();return true;
}
$('product-list').addEventListener('change',e=>{
 if(!productEdit(e))return;e.stopImmediatePropagation();
 if(e.target.tagName==='SELECT'||e.target.type==='checkbox'){api.refresh();}else status();
},true);
document.addEventListener('input',e=>{
 if(expert)return;
 productEdit(e);supplyEdit(e);if(e.target.id==='plan-overhead'){api.get().planOverhead=e.target.value===''?'':Number(e.target.value);api.saveOnly();}
 if(e.target.type==='number')e.target.setAttribute('aria-invalid',String(!e.target.validity.valid));
 status();
});
const observer=new MutationObserver(()=>{decorate();if(!expert)status();});observer.observe($('product-list'),{childList:true});
new MutationObserver(()=>{decorate();if(!expert){document.querySelectorAll('[data-guide-supply]').forEach(el=>{const p=api.get().products.find(p=>p.id===el.dataset.guideSupply);el.innerHTML=api.get().supplies.map(s=>`<option value="${esc(s.id)}" ${s.id===p?.supplyId?'selected':''}>${esc(s.name)} · ${s.abv}% ABV</option>`).join('');});status();}}).observe($('supplier-editor'),{childList:true});
function supplyEdit(e){
 if(expert||!e.target.closest('#supplier-editor'))return false;
 const k=e.target.dataset.field;if(!k)return false;
 const active=document.querySelector('#supplier-list [data-supply].active');
 const s=api.get().supplies.find(s=>s.id===active?.dataset.supply);if(!s)return false;
 s[k]=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value;
 if(k==='currency')s.guideFxReview=true;if(k==='fx')s.guideFxReview=false;
 api.saveOnly();return true;
}
$('supplier-editor').addEventListener('change',e=>{
 if(!supplyEdit(e))return;e.stopImmediatePropagation();
 if(e.target.tagName==='SELECT'||e.target.type==='checkbox')api.refresh();status();
},true);
// Print a full plan regardless of the step being edited. CSS reveals the complete shared plan.
window.addEventListener('beforeprint',()=>{document.body.classList.add('guide-print');document.querySelectorAll('#pane-production details').forEach(d=>d.open=true);});
window.addEventListener('afterprint',()=>{document.body.classList.remove('guide-print');document.querySelectorAll('.bottle-tax').forEach(d=>d.open=false);});
show();
