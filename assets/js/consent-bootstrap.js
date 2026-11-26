(()=>{
  const GA_ID='G-WX9XT6TEYG';
  const STORAGE_KEYS=['Suenos-cookie-consent-v1','suenos-cookie-consent-v1'];

  if(window.SuenosConsentBootstrap?.gaId===GA_ID)return;

  const readStoredPreferences=()=>{
    for(const key of STORAGE_KEYS){
      try{
        const raw=localStorage.getItem(key);
        if(!raw)continue;
        const value=JSON.parse(raw);
        if(value&&typeof value.analytics==='boolean'&&typeof value.marketing==='boolean'){
          return{analytics:value.analytics,marketing:value.marketing};
        }
      }catch(error){}
    }
    return null;
  };

  const storedPreferences=readStoredPreferences();
  const entryUrl=window.location.href;
  let pageViewQueued=false;
  const consentDefaults={
    analytics_storage:storedPreferences?.analytics?'granted':'denied',
    ad_storage:storedPreferences?.marketing?'granted':'denied',
    ad_user_data:storedPreferences?.marketing?'granted':'denied',
    ad_personalization:storedPreferences?.marketing?'granted':'denied'
  };

  // Returning visitors start with their saved consent state before GA4 config runs.
  if(!storedPreferences)consentDefaults.wait_for_update=500;

  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};

  window.gtag('consent','default',consentDefaults);
  window.gtag('js',new Date());
  window.gtag('config',GA_ID,{anonymize_ip:true,send_page_view:false});
  const queuePageView=preferences=>{
    if(pageViewQueued||preferences?.analytics!==true)return;
    pageViewQueued=true;
    window.gtag('event','page_view',{page_location:entryUrl,page_title:document.title,transport_type:'beacon'});
  };

  // app.js dispatches this after updating Google's consent state. A new
  // visitor who opts in gets one attributed landing view on the same page.
  document.addEventListener('suenos:consent-changed',()=>{
    queuePageView(window.SuenosConsent?.preferences);
  });
  queuePageView(storedPreferences);

  if(!document.querySelector('script[data-suenos-google-tag]')){
    const script=document.createElement('script');
    script.async=true;
    script.src=`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
    script.dataset.suenosGoogleTag='true';
    document.head.appendChild(script);
  }

  window.SuenosConsentBootstrap={
    gaId:GA_ID,
    initialized:true,
    consentSource:storedPreferences?'stored':'default',
    initialConsent:{
      analytics:!!storedPreferences?.analytics,
      marketing:!!storedPreferences?.marketing
    }
  };
})();
