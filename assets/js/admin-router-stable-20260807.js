(()=>{
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const panel=document.getElementById('admin-panel');
  if(!panel)return;
  const valid=name=>Boolean(panel.querySelector(`[data-admin-section="${CSS.escape(name)}"]`));
  function setSection(name,{resetContest=false}={}){
    if(!valid(name))name='dashboard';
    if(resetContest&&name==='contests'){
      const editor=document.getElementById('contest-editor');
      const entries=document.getElementById('contest-entries-panel');
      const section=document.getElementById('admin-section-contests');
      if(editor)editor.hidden=true;
      if(entries)entries.hidden=true;
      section?.classList.remove('is-editing');
    }
    panel.querySelectorAll('[data-admin-tab]').forEach(button=>{
      const active=button.dataset.adminTab===name;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-selected',String(active));
    });
    panel.querySelectorAll('[data-admin-section]').forEach(section=>section.hidden=section.dataset.adminSection!==name);
    try{sessionStorage.setItem('suenos-admin-last-section',name)}catch{}
    document.getElementById('admin-workspace')?.scrollTo?.({top:0,behavior:'instant'});
    window.scrollTo({top:0,behavior:'instant'});
    if(name==='dashboard')loadDashboard();
  }
  window.SuenosAdminNavigate=setSection;
  panel.querySelectorAll('[data-admin-tab]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();setSection(button.dataset.adminTab,{resetContest:button.dataset.adminTab==='contests'});document.dispatchEvent(new CustomEvent('suenos:admin-section',{detail:{section:button.dataset.adminTab}}));
  },true));
  panel.querySelectorAll('[data-dashboard-open]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();setSection(button.dataset.dashboardOpen,{resetContest:button.dataset.dashboardOpen==='contests'});document.dispatchEvent(new CustomEvent('suenos:admin-section',{detail:{section:button.dataset.dashboardOpen}}));
  },true));
  panel.querySelectorAll('[data-dashboard-action="new-contest"]').forEach(button=>button.addEventListener('click',event=>{
    event.preventDefault();setSection('contests',{resetContest:true});document.dispatchEvent(new CustomEvent('suenos:admin-section',{detail:{section:'contests'}}));setTimeout(()=>document.getElementById('contest-add')?.click(),20);
  },true));
  async function loadDashboard(){
    const token=sessionStorage.getItem(TOKEN_KEY)||'';if(!token)return;
    try{
      const r=await fetch('/api/contest-admin?action=list',{headers:{authorization:`Bearer ${token}`},cache:'no-store'});
      const d=await r.json().catch(()=>({}));if(!r.ok)return;
      const contests=(d.contests||[]).filter(c=>c.status!=='archived');const now=Date.now();
      const live=contests.filter(c=>c.status==='published'&&!(c.contest_type==='retail'&&c.retail_is_master)&&now>=new Date(c.start_at).getTime()&&now<=new Date(c.close_at).getTime()).length;
      const scheduled=contests.filter(c=>c.status==='published'&&!(c.contest_type==='retail'&&c.retail_is_master)&&now<new Date(c.start_at).getTime()).length;
      const drafts=contests.filter(c=>c.status==='draft').length;
      const summary=document.getElementById('admin-dashboard-contest-summary'),detail=document.getElementById('admin-dashboard-contest-detail'),metric=document.getElementById('admin-dashboard-contest-metric');
      if(summary)summary.textContent=`${live} live · ${drafts} draft`;
      if(detail)detail.textContent=scheduled?`${scheduled} scheduled contest${scheduled===1?'':'s'} waiting to open.`:'No scheduled contests waiting to open.';
      if(metric)metric.innerHTML=`<span class="admin-dashboard-dot ${live?'live':''}"></span>${live} public now${scheduled?` · <span class="admin-dashboard-dot scheduled"></span>${scheduled} scheduled`:''}`;
    }catch{}
  }
  function enter(){
    if(panel.hidden)return;
    const remembered=sessionStorage.getItem('suenos-admin-last-section');
    setSection(remembered&&valid(remembered)?remembered:'dashboard');
  }
  document.addEventListener('suenos:admin-authenticated',enter);
  if(!panel.hidden)enter();
})();
