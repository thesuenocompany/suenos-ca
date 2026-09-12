(()=>{
  if(window.SuenosAnalytics||/^\/(admin|api)(\/|$)/.test(location.pathname))return;
  const supported=new Set(["page_view", "session_start", "engagement", "age_gate_confirmed", "find_bottle_click", "retailer_locator_view", "recipe_view", "print_recipe", "outbound_click", "language_switch", "contact_form_submit", "contact_form_error", "trade_form_step_view", "trade_form_submit_success", "trade_form_submit_error", "trade_form_duplicate", "newsletter_signup_open", "newsletter_signup_submit", "where_next_submit", "where_next_error", "houseboat_form_start", "houseboat_form_complete", "houseboat_dates_available", "houseboat_dates_unavailable", "houseboat_details_revealed", "houseboat_cta_click", "form_start", "scroll_depth", "file_download", "email_click", "phone_click", "contest_entry_success"]);
  const VISITOR='suenos-analytics-visitor-v2',SESSION='suenos-analytics-session-v2';
  const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
  const write=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  const remove=k=>{try{localStorage.removeItem(k)}catch{}};
  const uid=()=>crypto.randomUUID();
  const prefs=()=>read('Suenos-cookie-consent-v1')||read('suenos-cookie-consent-v1');
  const allowed=()=>prefs()?.analytics===true;
  const params=new URLSearchParams(location.search);
  const referrer=(()=>{try{const h=new URL(document.referrer).hostname;return h===location.hostname?'':h}catch{return ''}})();
  const tag=v=>/@|%40/.test(v||'')?'(redacted)':String(v||'').slice(0,120);
  const attribution={source:tag(params.get('utm_source')||(params.has('fbclid')?'facebook':referrer)||'direct').toLowerCase(),medium:tag(params.get('utm_medium')).toLowerCase(),campaign:tag(params.get('utm_campaign')),content:tag(params.get('utm_content')),referrerHost:referrer,fbclid:params.has('fbclid')};
  let queue=[],timer,visitor,session,active=0,lastTick=performance.now(),lastActivity=Date.now(),consented=allowed(),pageviewSent=false,wasVisible=document.visibilityState==='visible';
  function identity(){
    if(!allowed())return {};
    visitor=read(VISITOR)||visitor;
    if(!visitor||Date.now()-(visitor.created||0)>365*86400000){visitor={id:uid(),created:Date.now()};write(VISITOR,visitor);}
    session=read(SESSION)||session;
    if(!session||Date.now()-session.last>30*60000){session={id:uid(),last:Date.now(),attribution,returning:Date.now()-visitor.created>30*60000};}
    session.last=Date.now();write(SESSION,session);
    return {visitor:visitor.id,session:session.id,returning:session.returning,...session.attribution};
  }
  const ua=navigator.userAgent;
  const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Other';
  const device=/iPad|Tablet/i.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1)?'tablet':/Mobi|Android/i.test(ua)?'mobile':'desktop';
  function record(event,extra={}){
    if(!supported.has(event))return;
    if(event!=='page_view'&&!allowed())return;
    // A very small allowlist of metadata; never copy arbitrary event parameters.
    const data={id:uid(),event,path:location.pathname,...attribution,...identity(),consent:allowed()?'granted':prefs()?.analytics===false?'denied':'unselected',gaStatus:window.SuenosConsentBootstrap?.initialized?'queued':'not_initialized',device,browser,language:document.documentElement.lang||'',overlayId:document.body?.dataset.campaignOverlay||window.SuenosActiveCampaign?.id||'',market:document.body?.dataset.campaignMarket||'',step:Number(extra.step)||0,depth:Number(extra.depth)||0,activeSeconds:Number(extra.activeSeconds)||0,form:extra.form||'',destination:extra.destination||''};
    queue.push(data);if(queue.length>=20)flush();else if(!timer)timer=setTimeout(flush,1500);
  }
  function flush(){
    clearTimeout(timer);timer=null;if(!queue.length)return;
    const events=queue.splice(0,20),payload=JSON.stringify({batchId:uid(),events});
    if(document.visibilityState==='hidden'&&navigator.sendBeacon){if(navigator.sendBeacon('/api/analytics-diagnostics',new Blob([payload],{type:'application/json'})))return;}
    fetch('/api/analytics-diagnostics',{method:'POST',headers:{'content-type':'application/json'},body:payload,keepalive:true}).catch(()=>{});
    if(queue.length)timer=setTimeout(flush,100);
  }
  function pageview(){if(pageviewSent)return;pageviewSent=true;record('page_view');}
  window.SuenosAnalytics={track:record};
  // Included before app.js so early page and recipe events retain their ordering.
  pageview();
  const consentChanged=()=>{
    const now=allowed();if(now===consented)return;consented=now;
    if(now){record('session_start');if(document.querySelector('iframe[src*="suenos-locator.netlify.app"]'))record('retailer_locator_view');if(/\/(cocktails|cocteles)\/[^/]+\/?$/.test(location.pathname))record('recipe_view');}
    else{queue=queue.filter(r=>r.event==='page_view'&&!r.session);remove(VISITOR);remove(SESSION);visitor=null;session=null;active=0;}
  };
  document.addEventListener('suenos:consent-changed',consentChanged);
  window.addEventListener('storage',consentChanged);
  function tick(){const now=performance.now(),delta=Math.min(2,(now-lastTick)/1000);lastTick=now;if(allowed()&&wasVisible&&Date.now()-lastActivity<60000)active+=delta;if(active>=15){record('engagement',{activeSeconds:Math.floor(active)});active=0;}}
  setInterval(tick,1000);
  function finish(){tick();if(active>=1&&allowed()){record('engagement',{activeSeconds:Math.floor(active)});active=0;}flush();}
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')finish();else lastTick=performance.now();wasVisible=document.visibilityState==='visible';});
  window.addEventListener('pagehide',finish);
  ['pointerdown','keydown','touchstart','scroll'].forEach(name=>document.addEventListener(name,()=>{lastActivity=Date.now();},{passive:true}));
  const depths=new Set();window.addEventListener('scroll',()=>{if(!allowed())return;const total=document.documentElement.scrollHeight-innerHeight;if(total<=0)return;const depth=Math.min(100,Math.round(scrollY/total*100));for(const n of [25,50,75,100])if(depth>=n&&!depths.has(n)){depths.add(n);record('scroll_depth',{depth:n});}},{passive:true});
  const starts=new WeakSet();
  document.addEventListener('focusin',event=>{const f=event.target.closest?.('form');if(!f||starts.has(f)||!allowed())return;starts.add(f);const form=f.matches('[data-society-form]')?'society':f.matches('[data-contact-form]')?'contact':/trade/.test(location.pathname)?'trade':/where-next/.test(location.pathname)?'where-next':/houseboat/.test(location.pathname)?'houseboat':'contest';record('form_start',{form});});
  document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a)return;const href=a.getAttribute('href')||'';if(/^mailto:/i.test(href))record('email_click');else if(/^tel:/i.test(href))record('phone_click');else if(/\.(pdf|zip|docx?|xlsx?)(\?|$)/i.test(href)){record('file_download',{destination:a.href});}});
})();
