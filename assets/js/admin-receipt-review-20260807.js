const TOKEN_KEY='suenos-hotline-admin-token-v3';
const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=async(url,options={})=>{const r=await fetch(url,{...options,headers:{authorization:`Bearer ${token()}`,...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})},cache:'no-store'});if(options.raw)return r;const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Request failed.');return d};
let claims=[];
function reasonFor(c){
  const raw=String(c.rejection_reason||c.moderation_notes||'').trim();
  if(raw==='missing_ai_key')return 'Automatic AI verification is not configured. Manual review required.';
  if(/wrong retailer/i.test(raw))return raw;
  if(/duplicate/i.test(raw))return raw;
  if(/full receipt|complete receipt/i.test(raw))return raw;
  if(/contest period/i.test(raw))return raw;
  if(/AI review/i.test(raw))return raw;
  return raw||'The receipt could not be confidently auto-approved. Manual review required.';
}
function render(){
  const alert=$('admin-receipt-review-alert'),count=$('admin-receipt-review-count'),list=$('admin-receipt-review-list');
  if(!alert||!count||!list)return;
  alert.hidden=claims.length===0;
  count.textContent=`${claims.length} RECEIPT${claims.length===1?'':'S'} NEED REVIEW`;
  list.innerHTML=claims.map(c=>`<article class="admin-receipt-review-card">
    <div><p class="admin-app-kicker">${esc(c.contest?.retailer_name||c.contest?.internal_name||'Retail contest')}</p><h3>${esc(c.entry?.first_name||'')} ${esc(c.entry?.last_name||'')}</h3><p>${esc(c.entry?.email||'')}</p><small>Submitted ${c.created_at?new Date(c.created_at).toLocaleString():'—'}</small></div>
    <div><div class="admin-receipt-reason"><strong>Why it needs review</strong><p>${esc(reasonFor(c))}</p></div><small>Detected retailer: ${esc(c.retailer_name||'Not read')}</small><small>Expected retailer: ${esc(c.contest?.retailer_name||'—')}</small><small>Sueños quantity: ${Number(c.suenos_quantity||0)} · AI confidence: ${Math.round(Number(c.ai_confidence||0)*100)}%</small>${c.receipt_number?`<small>Receipt #${esc(c.receipt_number)}</small>`:''}</div>
    <div class="admin-receipt-review-actions"><button class="admin-btn admin-btn-secondary" data-view="${esc(c.asset_key||'')}">View Receipt</button><button class="admin-btn admin-btn-primary" data-approve="${c.id}" data-contest="${c.contest_id}" data-bonus="${Number(c.bonus_entries_requested||0)}">Approve</button><button class="admin-btn admin-btn-danger" data-reject="${c.id}" data-contest="${c.contest_id}">Reject</button></div>
  </article>`).join('')||'<p>No receipts require review.</p>';
}
async function refresh(){if(!token())return;try{const d=await api('/api/contest-admin?action=receipt-review-summary');claims=d.claims||[];render()}catch(e){console.warn('receipt review summary',e)}}
$('admin-receipt-review-open')?.addEventListener('click',()=>{$('admin-receipt-review-panel').hidden=false;$('admin-receipt-review-panel').scrollIntoView({behavior:'smooth',block:'start'});});
$('admin-receipt-review-close')?.addEventListener('click',()=>{$('admin-receipt-review-panel').hidden=true;});
$('admin-receipt-review-list')?.addEventListener('click',async e=>{
  const view=e.target.closest('[data-view]'),approve=e.target.closest('[data-approve]'),reject=e.target.closest('[data-reject]');
  try{
    if(view){const r=await api(`/api/contest-entry-receipt-view?key=${encodeURIComponent(view.dataset.view)}`,{raw:true});if(!r.ok)throw new Error('Receipt image could not be opened.');const b=await r.blob(),u=URL.createObjectURL(b);window.open(u,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(u),60000);return;}
    if(approve){const suggested=Math.max(1,Number(approve.dataset.bonus)||1);const entered=prompt('Approved bonus entries:',String(suggested));if(entered===null)return;await api(`/api/contest-admin?action=receipt-status&id=${encodeURIComponent(approve.dataset.contest)}`,{method:'POST',body:JSON.stringify({claimId:approve.dataset.approve,status:'approved',bonusEntries:Math.max(0,Number(entered)||0)})});await refresh();return;}
    if(reject){const claim=claims.find(x=>x.id===reject.dataset.reject);const suggestion=reasonFor(claim||{});const reason=prompt('Reason for rejection:',suggestion)||'';if(!reason)return;await api(`/api/contest-admin?action=receipt-status&id=${encodeURIComponent(reject.dataset.contest)}`,{method:'POST',body:JSON.stringify({claimId:reject.dataset.reject,status:'rejected',reason})});await refresh();return;}
  }catch(err){alert(err.message||'Receipt action failed.');}
});
window.addEventListener('focus',refresh);
document.addEventListener('click',e=>{if(e.target.closest('#admin-login,[data-admin-tab], [data-dashboard-open]'))setTimeout(refresh,700)});
setInterval(refresh,30000);
setTimeout(refresh,900);
