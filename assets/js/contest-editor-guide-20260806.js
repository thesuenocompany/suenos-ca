(()=>{
  const $=id=>document.getElementById(id);
  const editor=$('contest-editor');
  if(!editor||editor.dataset.guided==='1')return;
  editor.dataset.guided='1';
  editor.classList.add('contest-editor-guided');

  const originalPanels=[...editor.querySelectorAll(':scope > .admin-panels')];
  const originalActions=editor.querySelector(':scope > .admin-actions');

  const shell=document.createElement('div');shell.className='ce-editor-shell';
  const sidebar=document.createElement('aside');sidebar.className='ce-step-sidebar';
  sidebar.innerHTML='<h3>Contest setup</h3><p>Complete one section at a time. Only fields relevant to the selected contest type are shown.</p><nav class="ce-step-nav" aria-label="Contest editor steps"></nav><div class="ce-sidebar-summary"><strong id="ce-summary-name">New contest</strong><span id="ce-summary-state">Draft setup</span></div>';
  const content=document.createElement('main');content.className='ce-step-content';
  shell.append(sidebar,content);
  originalPanels[0]?.before(shell);

  const defs=[
    {key:'start',label:'Start',short:'Type and identity',title:'Start with the essentials',desc:'Choose the contest format, give it a clear internal and public name, and set its publishing state.'},
    {key:'retail',label:'Retail setup',short:'Master and stores',title:'Configure the retail campaign',desc:'Create the master campaign, retailer-specific pages, QR codes and print poster. This step only appears for retail contests.',retail:true},
    {key:'page',label:'Page',short:'Copy and graphics',title:'Build the public contest page',desc:'Add the main message and the desktop and mobile artwork visitors will see.'},
    {key:'prize',label:'Prize & dates',short:'Offer and schedule',title:'Define the prize and timing',desc:'Be precise about what is included, what is excluded, and when entries open, close and draw.'},
    {key:'entry',label:'Entry form',short:'Eligibility and consent',title:'Configure the entry form',desc:'Choose eligibility, age validation, contact fields and optional marketing consent.'},
    {key:'rules',label:'Rules',short:'Legal and confirmation',title:'Generate the rules and confirmation',desc:'Use the Sueños rules template, then set the message entrants receive after submitting.'},
    {key:'review',label:'Review',short:'Check and publish',title:'Review before publishing',desc:'Confirm the important details, resolve missing information, save, then preview the public page.'}
  ];
  const nav=sidebar.querySelector('.ce-step-nav');
  const panels={};
  defs.forEach((d,i)=>{
    const b=document.createElement('button');b.type='button';b.className='ce-step-button';b.dataset.step=d.key;b.innerHTML=`<span class="ce-step-number">${i+1}</span><span class="ce-step-label"><strong>${d.label}</strong><small>${d.short}</small></span><span class="ce-step-state" aria-hidden="true"></span>`;nav.appendChild(b);
    const p=document.createElement('section');p.className='ce-step-panel';p.dataset.stepPanel=d.key;p.innerHTML=`<div class="ce-step-heading"><span class="ce-big-number">${String(i+1).padStart(2,'0')}</span><div><h3>${d.title}</h3><p>${d.desc}</p></div></div>`;content.appendChild(p);panels[d.key]=p;
  });

  function card(step,title,desc){const c=document.createElement('section');c.className='ce-card';c.innerHTML=`<header class="ce-card-header"><h4>${title}</h4>${desc?`<p>${desc}</p>`:''}</header>`;panels[step].appendChild(c);return c;}
  const cards={
    type:card('start','Contest format','Choose the workflow that matches what you are building.'),
    identity:card('start','Names and URL','The internal name keeps Admin organized. The public name and slug appear to entrants.'),
    publishing:card('start','Publishing','Keep new contests in Draft until the page, prize and rules have been reviewed.'),
    retail:card('retail','Retail campaign setup','The master holds shared settings. Each retailer page gets its own entry URL, entries and QR code.'),
    copy:card('page','Public message','Keep the headline direct. The intro should explain the action and reason to enter.'),
    images:card('page','Hero artwork','Use separate desktop and mobile graphics so the page is designed for both screens.'),
    photo:card('page','Photo-contest settings','These options only appear for a photo story contest.'),
    prize:card('prize','Prize details','State exactly what the winner receives and the approximate retail value.'),
    schedule:card('prize','Contest schedule','All dates use the time zone selected in Start.'),
    eligibility:card('entry','Eligibility and age','Retail contests should use legal drinking age by province or territory.'),
    form:card('entry','Entry fields','Collect only what is required to administer the contest.'),
    consent:card('entry','Consent and privacy','Marketing consent remains optional and separate from contest entry.'),
    rules:card('rules','Official Rules','The fixed Sueños legal text is generated from the choices below.'),
    confirmation:card('rules','Entry confirmation','This is shown after a successful entry.'),
    review:card('review','Contest summary','Review the key settings before publishing.')
  };

  const typeSelect=$('contest-type');
  const typeUnit=typeSelect?.closest('.admin-field');
  if(typeUnit){typeUnit.classList.add('ce-type-select-field');cards.type.appendChild(typeUnit)}
  const picker=document.createElement('div');picker.className='ce-type-picker';picker.innerHTML=`
    <button type="button" class="ce-type-card" data-contest-type="standard"><em></em><strong>Standard giveaway</strong><span>A simple entry form, prize and winner draw.</span></button>
    <button type="button" class="ce-type-card" data-contest-type="photo_scrapbook"><em></em><strong>Photo contest</strong><span>Photo upload, moderation and public gallery.</span></button>
    <button type="button" class="ce-type-card" data-contest-type="retail"><em></em><strong>Retail campaign</strong><span>One master campaign with retailer pages, QR codes and print posters.</span></button>`;
  cards.type.appendChild(picker);

  const moved=new Set();
  function unit(id){
    const el=$(id);if(!el)return null;
    // These are already self-contained editor groups. Never climb to the
    // outer #contest-editor <section>, or the editor would be appended into
    // one of its own descendant cards and the setup script would abort.
    if(id==='contest-retail-settings'||id==='contest-rules-template-fields')return el;
    if(el.type==='hidden')return el;
    return el.closest('.admin-field-grid,.admin-upload-row,.admin-check,.admin-field,details,.admin-note')||el;
  }
  function move(ids,target,extraClass=''){
    ids.forEach(id=>{
      const u=unit(id);
      if(!u||u===editor||u===shell||u.contains(target)||moved.has(u))return;
      moved.add(u);
      if(extraClass)u.classList.add(extraClass);
      target.appendChild(u);
    });
  }

  move(['contest-id'],cards.identity);
  move(['contest-internal','contest-public','contest-slug'],cards.identity);
  move(['contest-status-field','contest-timezone'],cards.publishing);
  move(['contest-retail-settings'],cards.retail,'ce-retail-section');
  move(['contest-eyebrow','contest-headline','contest-intro'],cards.copy);
  move(['contest-hero','contest-hero-file','contest-mobile-hero','contest-mobile-file','contest-alt','contest-focal'],cards.images);
  move(['contest-layout-style','contest-photo-enabled','contest-written-enabled','contest-festival-start','contest-event-location'],cards.photo,'ce-photo-only');
  move(['contest-prize-title','contest-prize-desc','contest-value','contest-included','contest-excluded','contest-prize-image','contest-prize-file','contest-alcohol-excluded'],cards.prize);
  move(['contest-start','contest-close','contest-draw'],cards.schedule);
  move(['contest-provinces','contest-age-mode','contest-min-age'],cards.eligibility);
  move(['contest-phone-enabled','contest-phone-required'],cards.form);
  move(['contest-marketing-enabled','contest-marketing-text','contest-photo-rights','contest-privacy-name','contest-platform-disclaimer'],cards.consent);
  move(['contest-rules-template-enabled','contest-rules-template-fields','contest-short-rules'],cards.rules);
  const rulesNote=editor.querySelector('.contest-rules-template-note');if(rulesNote&&!moved.has(rulesNote)){moved.add(rulesNote);cards.rules.insertBefore(rulesNote,cards.rules.children[1]||null)}
  const advanced=editor.querySelector('.admin-advanced-rules');if(advanced&&!moved.has(advanced)){moved.add(advanced);cards.rules.appendChild(advanced)}
  move(['contest-confirm-heading','contest-confirm-message'],cards.confirmation);

  // Helpful field notes.
  const help={
    'contest-internal':'Only your team sees this name in Admin.',
    'contest-public':'Shown on the contest page and in the generated rules.',
    'contest-slug':'Creates the URL: suenos.ca/en-ca/contests/your-slug/',
    'contest-status-field':'Use Draft while building. Published makes the contest publicly available.',
    'contest-hero':'Recommended: wide landscape artwork for desktop.',
    'contest-mobile-hero':'Recommended: dedicated vertical artwork for phones.',
    'contest-value':'Enter the approximate retail value in Canadian dollars.',
    'contest-provinces':'Use province abbreviations separated by commas, such as BC, AB.',
    'contest-marketing-enabled':'Entrants can still enter when they decline marketing.'
  };
  Object.entries(help).forEach(([id,text])=>{const el=$(id),wrap=el?.closest('.admin-field,.admin-check');if(!wrap||wrap.querySelector('.ce-help'))return;const h=document.createElement('div');h.className='ce-help';h.textContent=text;wrap.appendChild(h)});

  // Review content.
  cards.review.insertAdjacentHTML('beforeend','<div class="ce-review-grid" id="ce-review-grid"></div><div class="ce-review-checklist" id="ce-review-checklist"></div>');

  // Step navigation controls.
  defs.forEach((d,i)=>{
    const footer=document.createElement('div');footer.className='ce-step-actions';
    if(i>0)footer.innerHTML+='<button type="button" class="admin-btn admin-btn-secondary ce-back">Back</button>';
    if(i<defs.length-1)footer.innerHTML+='<button type="button" class="admin-btn admin-btn-primary ce-next">Continue</button>';
    else footer.innerHTML+='<button type="button" class="admin-btn admin-btn-primary ce-go-save">Save Contest</button>';
    panels[d.key].appendChild(footer);
  });

  const sticky=document.createElement('div');sticky.className='ce-sticky-actions';
  if(originalActions){[...originalActions.children].forEach(x=>sticky.appendChild(x));originalActions.remove()}
  editor.appendChild(sticky);

  let current='start';
  const visibleDefs=()=>defs.filter(d=>!(d.retail&&typeSelect?.value!=='retail'));
  function activate(key,scroll=true){
    const allowed=visibleDefs().map(x=>x.key);if(!allowed.includes(key))key=allowed[0]||'start';current=key;
    panels && Object.entries(panels).forEach(([k,p])=>p.classList.toggle('is-active',k===key));
    nav.querySelectorAll('.ce-step-button').forEach(b=>b.classList.toggle('is-active',b.dataset.step===key));
    if(scroll)editor.querySelector(':scope > .admin-section-heading')?.scrollIntoView({behavior:'smooth',block:'start'});
    refresh();
  }
  function next(delta){const a=visibleDefs(),i=a.findIndex(x=>x.key===current),n=a[Math.max(0,Math.min(a.length-1,i+delta))];if(n)activate(n.key)}

  function updateType(){
    const type=typeSelect?.value||'standard';
    picker.querySelectorAll('.ce-type-card').forEach(b=>b.classList.toggle('is-selected',b.dataset.contestType===type));
    nav.querySelector('[data-step="retail"]').hidden=type!=='retail';
    cards.photo.hidden=type!=='photo_scrapbook';
    const photoRights=$('contest-photo-rights')?.closest('.admin-field');if(photoRights)photoRights.hidden=type!=='photo_scrapbook';
    if(type!=='retail'&&current==='retail')activate('page',false);
  }
  function fmtDate(v){if(!v)return'Not set';const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleString()}
  function value(id,fallback='Not set'){const e=$(id);if(!e)return fallback;return e.type==='checkbox'?(e.checked?'Yes':'No'):(e.value||fallback)}
  function completion(){
    const type=value('contest-type','standard');
    const checks={
      start:Boolean(value('contest-internal','')&&value('contest-public','')&&value('contest-slug','')),
      retail:type!=='retail'||Boolean($('contest-retail-master')?.checked||value('contest-retailer-name','')),
      page:Boolean(value('contest-headline','')||value('contest-hero','')),
      prize:Boolean(value('contest-prize-title','')&&value('contest-start','')&&value('contest-close','')&&value('contest-draw','')),
      entry:Boolean(value('contest-provinces','')&&value('contest-min-age','')),
      rules:Boolean($('contest-rules-template-enabled')?.checked||value('contest-rules-html','')),
      review:false
    };
    checks.review=Object.entries(checks).filter(([k])=>k!=='review'&&!(k==='retail'&&type!=='retail')).every(([,v])=>v);
    return checks;
  }
  function review(){
    const grid=$('ce-review-grid'),list=$('ce-review-checklist');if(!grid||!list)return;
    const typeLabels={standard:'Standard giveaway',photo_scrapbook:'Photo contest',retail:'Retail campaign'};
    const url=value('contest-slug','your-slug');
    grid.innerHTML=[
      ['Contest',value('contest-public')],['Type',typeLabels[value('contest-type','standard')]||value('contest-type')],
      ['Status',value('contest-status-field')],['Entry URL',`/en-ca/contests/${url}/`],
      ['Prize',value('contest-prize-title')],['Value',value('contest-value')!=='Not set'?`$${value('contest-value')} CAD`:'Not set'],
      ['Opens',fmtDate(value('contest-start',''))],['Closes',fmtDate(value('contest-close',''))],
      ['Eligibility',value('contest-provinces')],['Marketing consent',value('contest-marketing-enabled')]
    ].map(([a,b])=>`<div class="ce-review-item"><span>${a}</span><strong>${b}</strong></div>`).join('');
    const c=completion();
    const items=[['start','Names and URL are complete'],['page','Public page has a headline or hero'],['prize','Prize and all three dates are set'],['entry','Eligibility and age requirements are set'],['rules','Official Rules are configured']];
    if(value('contest-type')==='retail')items.splice(1,0,['retail','Retail campaign settings are complete']);
    list.innerHTML=items.map(([k,label])=>`<div class="ce-review-check ${c[k]?'':'is-missing'}"><span>${c[k]?label:`Missing: ${label}`}</span>${c[k]?'':`<button type="button" data-go-step="${k}">Fix</button>`}</div>`).join('');
  }
  function refresh(){
    updateType();review();
    const c=completion();nav.querySelectorAll('.ce-step-button').forEach(b=>b.classList.toggle('is-complete',Boolean(c[b.dataset.step])));
    const name=$('ce-summary-name'),state=$('ce-summary-state');if(name)name.textContent=value('contest-internal','New contest');if(state)state.textContent=`${value('contest-status-field','Draft')} · ${value('contest-public','Public name not set')}`;
  }

  picker.addEventListener('click',e=>{const b=e.target.closest('[data-contest-type]');if(!b||!typeSelect)return;typeSelect.value=b.dataset.contestType;typeSelect.dispatchEvent(new Event('change',{bubbles:true}));refresh()});
  nav.addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b&&!b.hidden)activate(b.dataset.step)});
  content.addEventListener('click',e=>{if(e.target.closest('.ce-next'))next(1);if(e.target.closest('.ce-back'))next(-1);const go=e.target.closest('[data-go-step]');if(go)activate(go.dataset.goStep);if(e.target.closest('.ce-go-save'))$('contest-save')?.click()});
  editor.addEventListener('input',refresh);editor.addEventListener('change',refresh);

  const observer=new MutationObserver(()=>{if(!editor.hidden){setTimeout(()=>{refresh();activate('start',false)},0)}});
  observer.observe(editor,{attributes:true,attributeFilter:['hidden']});
  typeSelect?.addEventListener('change',refresh);

  // Clear out the obsolete layout containers after moving all controls.
  originalPanels.forEach(p=>p.hidden=true);
  activate('start',false);refresh();
  editor.dataset.guidedReady='1';
})();
