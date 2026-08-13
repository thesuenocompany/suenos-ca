(()=>{
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const section=document.getElementById('admin-section-analytics');
  if(!section)return;
  const status=document.getElementById('analytics-status');
  const range=document.getElementById('analytics-days');
  const refresh=document.getElementById('analytics-refresh');
  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const list=(id,items)=>{const el=document.getElementById(id);el.innerHTML=(items||[]).length?(items.map(x=>`<div class="analytics-row"><span>${esc(x.name||'Unknown')}</span><strong>${x.count}</strong></div>`).join('')):'<p class="admin-note">No data yet.</p>';};
  const load=async()=>{
    refresh.disabled=true;status.textContent='Loading first-party landing data…';
    try{
      const res=await fetch(`/api/analytics-diagnostics?days=${encodeURIComponent(range.value)}`,{headers:{authorization:`Bearer ${token()}`},cache:'no-store'});
      const data=await res.json();if(!res.ok)throw new Error(data.message||'Could not load analytics.');
      const t=data.totals||{};
      document.getElementById('metric-landings').textContent=t.landings||0;
      document.getElementById('metric-meta').textContent=t.metaLandings||0;
      document.getElementById('metric-ga').textContent=t.gaQueued||0;
      document.getElementById('metric-consent').textContent=t.analyticsGranted||0;
      list('analytics-sources',data.bySource);list('analytics-campaigns',data.byCampaign);list('analytics-pages',data.byPage);list('analytics-markets',data.byCity);
      const tbody=document.getElementById('analytics-recent');
      tbody.innerHTML=(data.recent||[]).map(r=>`<tr><td>${esc(new Date(r.at).toLocaleString())}</td><td>${esc(r.source)}</td><td>${esc(r.campaign||'')}</td><td>${esc(r.path)}</td><td>${esc([r.city,r.province].filter(Boolean).join(', '))}</td><td>${esc(r.consent)}</td><td>${esc(r.gaStatus)}</td></tr>`).join('')||'<tr><td colspan="7">No landings recorded yet.</td></tr>';
      status.textContent=`Showing actual site landings recorded during the last ${data.days} days. This is first-party diagnostic data, not a replacement for GA4.`;
    }catch(e){status.textContent=e.message;}finally{refresh.disabled=false;}
  };
  refresh.addEventListener('click',load);range.addEventListener('change',load);
  document.querySelector('[data-admin-tab="analytics"]')?.addEventListener('click',load);
})();
