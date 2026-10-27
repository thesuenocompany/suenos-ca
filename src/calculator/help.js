import {getHelp,getOutputHelp,tooltipPosition,helpClickState} from './help-content.js';
const bubble=document.createElement('div');bubble.id='field-help-tooltip';bubble.className='field-help-tooltip';bubble.setAttribute('role','tooltip');bubble.hidden=true;document.body.append(bubble);
let active=null,pinned=false,hideTimer=null,serial=0;
function position(){if(!active||bubble.hidden)return;const rect=active.getBoundingClientRect();bubble.style.width=Math.min(340,window.innerWidth-24)+'px';const b=bubble.getBoundingClientRect();const point=tooltipPosition(rect,b.height,window.innerWidth,window.innerHeight);bubble.style.left=point.left+'px';bubble.style.top=point.top+'px';}
function close(){clearTimeout(hideTimer);if(active){active.setAttribute('aria-expanded','false');active.removeAttribute('aria-describedby');}active=null;pinned=false;bubble.hidden=true;}
function show(button){clearTimeout(hideTimer);if(active!==button)pinned=false;if(active&&active!==button){active.setAttribute('aria-expanded','false');active.removeAttribute('aria-describedby');}active=button;const [title,body]=JSON.parse(button.dataset.help);bubble.replaceChildren();const strong=document.createElement('strong'),p=document.createElement('p'),hint=document.createElement('small');strong.textContent=title;p.textContent=body;hint.textContent='Press Esc, or tap the info icon again or outside, to close.';bubble.append(strong,p,hint);bubble.hidden=false;button.setAttribute('aria-expanded','true');button.setAttribute('aria-describedby',bubble.id);position();}
function scheduleClose(){clearTimeout(hideTimer);hideTimer=setTimeout(()=>{if(!pinned&&!bubble.matches(':hover')&&active!==document.activeElement)close();},160);}
function addButton(host,help,control=null){if(host.dataset.helpEnhanced==='true')return;host.dataset.helpEnhanced='true';const button=document.createElement('button');button.type='button';button.className='help-info';button.dataset.help=JSON.stringify(help);button.textContent='i';button.setAttribute('aria-label','Explain '+help[0]);button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls',bubble.id);button.id='help-info-'+(++serial);
 if(control&&!control.getAttribute('aria-label')){const text=help[0];control.setAttribute('aria-label',text);}
 const firstText=[...host.childNodes].find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
 if(firstText){firstText.after(button);}else{const span=[...host.children].find(e=>e.tagName==='SPAN'&&!e.classList.contains('help-info'));if(span)span.append(button);else host.append(button);}
 button.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')show(button);});button.addEventListener('pointerleave',scheduleClose);button.addEventListener('focus',()=>show(button));button.addEventListener('blur',scheduleClose);
 button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const next=helpClickState({active,pinned},button);if(!next.active){close();}else{show(button);pinned=next.pinned;}});
}
function enhance(){
 document.querySelectorAll('label:not([data-help-enhanced])').forEach(label=>{const control=label.querySelector('input:not([type=file]),select,textarea')||(label.htmlFor?document.getElementById(label.htmlFor):null);if(!control)return;const key=control.dataset.field||control.id||(control.dataset.alloc?'allocation':'');const context=control.closest('#supplier-editor')?'supply':control.closest('[data-product]')?'product':'common';const help=getHelp(context,key);if(help)addButton(label,help,control);});
 document.querySelectorAll('#scenario-name,#selected,[data-product] .product-heading>input').forEach(control=>{if(control.dataset.helpEnhanced)return;const help=control.closest('[data-product]')?getHelp('product','name'):getHelp('common',control.id);if(help){const wrap=document.createElement('span');wrap.className='standalone-help';control.after(wrap);addButton(wrap,help);control.dataset.helpEnhanced='true';}});
 const abvTitle=document.querySelector('.hero-controls .field-label');if(abvTitle&&!abvTitle.dataset.helpEnhanced)addButton(abvTitle,getHelp('product','abv'));
 const outputs='#cost-legend>div>span,.waterfall .row>span,.can-prices label,.product-results span,.product-cost-totals span,.plan-total-grid span,.reference-metrics div>span,.metric>span';
 document.querySelectorAll(outputs).forEach(host=>{if(host.dataset.helpEnhanced)return;const help=getOutputHelp(host.textContent.trim());if(help)addButton(host,help);});
 if(active&&!active.isConnected)close();
}
let queued=false;new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;enhance();});}}).observe(document.body,{childList:true,subtree:true});
bubble.addEventListener('pointerenter',()=>clearTimeout(hideTimer));bubble.addEventListener('pointerleave',scheduleClose);
document.addEventListener('pointerdown',e=>{if(active&&!active.contains(e.target)&&!bubble.contains(e.target))close();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();close();}});
window.addEventListener('resize',position);window.addEventListener('scroll',()=>{if(active)position();},true);
enhance();
