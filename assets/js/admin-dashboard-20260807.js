(()=>{
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const panel=document.getElementById('admin-panel');
  if(!panel)return;
  const tabs=document.querySelector('.admin-tabs');
  if(!tabs)return;

  const labels={
    contests:'Contests',sunfest:'Campaigns & Overlays',recipes:'Cocktails',hotline:'Don Terry Hotline',analytics:'Analytics','archived-contests':'Contest Archive'
  };
  Object.entries(labels).forEach(([key,label])=>{const b=document.querySelector(`[data-admin-tab="${key}"]`);if(b)b.textContent=label;});

  // Dashboard section and tab.
  let dashboard=document.getElementById('admin-section-dashboard');
  if(!dashboard){
    dashboard=document.createElement('section');
    dashboard.id='admin-section-dashboard';
    dashboard.className='admin-content-section';
    dashboard.dataset.adminSection='dashboard';
    dashboard.setAttribute('role','tabpanel');
    dashboard.innerHTML=`
      <div class="admin-dashboard-hero">
        <div class="admin-dashboard-welcome"><div class="kicker">WEBSITE OPERATIONS</div><h2>What do you need to manage?</h2><p>Choose the job, then work inside that tool. Nothing else should be fighting for your attention.</p></div>
        <div class="admin-dashboard-status"><small>Contest status</small><strong id="admin-dashboard-contest-summary">Loading…</strong><p id="admin-dashboard-contest-detail">Checking current campaigns.</p></div>
      </div>
      <div class="admin-dashboard-grid">
        <article class="admin-dashboard-card"><span class="admin-dashboard-card-tag">Promotions</span><h3>Contests</h3><p>Create giveaways, retail campaigns, retailer QR pages, receipt bonus entries and winner draws.</p><div id="admin-dashboard-contest-metric" class="admin-dashboard-metric"></div><div class="admin-dashboard-card-actions"><button class="admin-btn admin-btn-primary" data-dashboard-open="contests">Open Contests</button><button class="admin-btn admin-btn-secondary" data-dashboard-action="new-contest">New Contest</button></div></article>
        <article class="admin-dashboard-card"><span class="admin-dashboard-card-tag">Promotions</span><h3>Campaigns & Overlays</h3><p>Manage temporary homepage creative, regional campaign targeting and scheduled overlays.</p><div class="admin-dashboard-card-actions"><button class="admin-btn admin-btn-primary" data-dashboard-open="sunfest">Open Campaigns</button></div></article>
        <article class="admin-dashboard-card"><span class="admin-dashboard-card-tag">Website content</span><h3>Cocktails</h3><p>Edit recipes, images, descriptions and publishing order without touching the website source.</p><div class="admin-dashboard-card-actions"><button class="admin-btn admin-btn-primary" data-dashboard-open="recipes">Open Cocktails</button></div></article>
        <article class="admin-dashboard-card"><span class="admin-dashboard-card-tag">Website content</span><h3>Don Terry Hotline</h3><p>Manage the Hotline copy and rotating response library. It is now a tool, not the entire admin system.</p><div class="admin-dashboard-card-actions"><button class="admin-btn admin-btn-primary" data-dashboard-open="hotline">Open Hotline</button></div></article>
        <article class="admin-dashboard-card"><span class="admin-dashboard-card-tag">Reporting</span><h3>Analytics</h3><p>Review first-party landings, campaign traffic and measurement diagnostics.</p><div class="admin-dashboard-card-actions"><button class="admin-btn admin-btn-primary" data-dashboard-open="analytics">Open Analytics</button></div></article>
        <article class="admin-dashboard-card"><span class="admin-dashboard-card-tag">Archive</span><h3>Archived Contests</h3><p>Keep inactive campaigns out of the working list while retaining their entries and history.</p><div class="admin-dashboard-card-actions"><button class="admin-btn admin-btn-secondary" data-dashboard-open="archived-contests">Open Archive</button></div></article>
      </div>
      <div class="admin-dashboard-note">Changes in these tools affect the live Sueños website. Draft and preview states remain available where supported.</div>`;
  }
  let dashButton=document.querySelector('[data-admin-tab="dashboard"]');
  if(!dashButton){
    dashButton=document.createElement('button');
    dashButton.type='button';dashButton.className='admin-tab';dashButton.dataset.adminTab='dashboard';dashButton.id='admin-tab-dashboard';dashButton.setAttribute('role','tab');dashButton.setAttribute('aria-controls','admin-section-dashboard');dashButton.textContent='Dashboard';
    tabs.prepend(dashButton);
  }

  // Create a proper application shell without changing tool IDs or backend behaviour.
  let layout=panel.querySelector('.admin-app-layout');
  if(!layout){
    layout=document.createElement('div');layout.className='admin-app-layout';
    const navigation=document.createElement('aside');navigation.className='admin-navigation';navigation.setAttribute('aria-label','Admin navigation');
    const workspace=document.createElement('main');workspace.className='admin-workspace';
    const heading=panel.querySelector('.admin-app-heading');
    heading?.insertAdjacentElement('afterend',layout);layout.append(navigation,workspace);
    navigation.innerHTML='<div class="admin-navigation-label">Overview</div>';
    navigation.appendChild(tabs);
    const ordered=['dashboard','contests','sunfest','recipes','hotline','analytics','archived-contests'];
    ordered.forEach(name=>{const b=tabs.querySelector(`[data-admin-tab="${name}"]`);if(b)tabs.appendChild(b)});
    const groups=[['dashboard','Overview'],['contests','Promotions'],['recipes','Website content'],['analytics','Reporting'],['archived-contests','Archive']];
    groups.forEach(([before,label])=>{const b=tabs.querySelector(`[data-admin-tab="${before}"]`);if(!b)return;const tag=document.createElement('div');tag.className='admin-nav-group';tag.textContent=label;b.before(tag)});
    panel.querySelectorAll(':scope > [data-admin-section]').forEach(s=>workspace.appendChild(s));
    workspace.prepend(dashboard);
    const globalActions=panel.querySelector(':scope > .admin-global-actions');if(globalActions){globalActions.classList.add('admin-navigation-actions');navigation.appendChild(globalActions)}
  }

  const setSection=(name,{resetContest=false}={})=>{
    if(resetContest&&name==='contests'){
      const editor=document.getElementById('contest-editor'),entries=document.getElementById('contest-entries-panel'),section=document.getElementById('admin-section-contests');
      if(editor)editor.hidden=true;if(entries)entries.hidden=true;section?.classList.remove('is-editing');
    }
    document.querySelectorAll('[data-admin-tab]').forEach(button=>{
      const active=button.dataset.adminTab===name;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));
    });
    document.querySelectorAll('[data-admin-section]').forEach(section=>section.hidden=section.dataset.adminSection!==name);
    try{sessionStorage.setItem('suenos-admin-last-section',name)}catch{}
    document.querySelector('.admin-workspace')?.scrollIntoView({block:'start'});
  };

  // Capture makes navigation reliable even if an individual tool throws an error later.
  panel.addEventListener('click',event=>{
    const tab=event.target.closest('[data-admin-tab]');
    if(tab){setSection(tab.dataset.adminTab,{resetContest:tab.dataset.adminTab==='contests'});return;}
    const open=event.target.closest('[data-dashboard-open]');
    if(open){document.querySelector(`[data-admin-tab="${open.dataset.dashboardOpen}"]`)?.click();return;}
    const action=event.target.closest('[data-dashboard-action="new-contest"]');
    if(action){setSection('contests',{resetContest:true});setTimeout(()=>document.getElementById('contest-add')?.click(),40);}
  },true);

  async function loadDashboard(){
    const token=sessionStorage.getItem(TOKEN_KEY)||'';if(!token)return;
    try{
      const r=await fetch('/api/contest-admin?action=list',{headers:{authorization:`Bearer ${token}`},cache:'no-store'});const d=await r.json();if(!r.ok)return;
      const contests=(d.contests||[]).filter(c=>c.status!=='archived');const now=Date.now();
      const live=contests.filter(c=>c.status==='published'&&!(c.contest_type==='retail'&&c.retail_is_master)&&now>=new Date(c.start_at).getTime()&&now<=new Date(c.close_at).getTime()).length;
      const scheduled=contests.filter(c=>c.status==='published'&&now<new Date(c.start_at).getTime()).length;
      const drafts=contests.filter(c=>c.status==='draft').length;
      const summary=document.getElementById('admin-dashboard-contest-summary'),detail=document.getElementById('admin-dashboard-contest-detail'),metric=document.getElementById('admin-dashboard-contest-metric');
      if(summary)summary.textContent=`${live} live · ${drafts} draft`;
      if(detail)detail.textContent=scheduled?`${scheduled} scheduled contest${scheduled===1?'':'s'} waiting to open.`:'No scheduled contests waiting to open.';
      if(metric)metric.innerHTML=`<span class="admin-dashboard-dot ${live?'live':''}"></span>${live} public now${scheduled?` · <span class="admin-dashboard-dot scheduled"></span>${scheduled} scheduled`:''}`;
    }catch{}
  }

  const observer=new MutationObserver(()=>{
    if(!panel.hidden){const remembered=sessionStorage.getItem('suenos-admin-last-section');setSection(remembered&&document.querySelector(`[data-admin-section="${remembered}"]`)?remembered:'dashboard',{resetContest:false});loadDashboard();observer.disconnect();}
  });
  if(panel.hidden)observer.observe(panel,{attributes:true,attributeFilter:['hidden']});
  else{setSection('dashboard');loadDashboard();}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadDashboard()});
})();
