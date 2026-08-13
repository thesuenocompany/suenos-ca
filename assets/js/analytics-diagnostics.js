(()=>{
  const params=new URLSearchParams(location.search);
  const stored=(()=>{try{return JSON.parse(localStorage.getItem('Suenos-cookie-consent-v1')||localStorage.getItem('suenos-cookie-consent-v1')||'null')}catch{return null}})();
  const referrerHost=(()=>{try{return document.referrer?new URL(document.referrer).hostname:''}catch{return ''}})();
  const payload={
    path:location.pathname+location.search,title:document.title,
    utm_source:params.get('utm_source')||'',utm_medium:params.get('utm_medium')||'',utm_campaign:params.get('utm_campaign')||'',utm_content:params.get('utm_content')||'',
    fbclid:params.has('fbclid'),referrerHost,
    consent:stored?.analytics===true?'granted':stored?.analytics===false?'denied':'unselected',
    gaStatus:window.SuenosConsentBootstrap?.initialized&&typeof window.gtag==='function'?'queued':'not_initialized',
    overlayId:document.body?.dataset?.campaignOverlay||window.SuenosActiveCampaign?.id||'',
    market:document.body?.dataset?.campaignMarket||window.SuenosActiveCampaign?.market||'',
    device:matchMedia('(max-width: 720px)').matches?'mobile':'desktop',language:document.documentElement.lang||''
  };
  const send=()=>{payload.overlayId=document.body?.dataset?.campaignOverlay||window.SuenosActiveCampaign?.id||payload.overlayId;return fetch('/api/analytics-diagnostics',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});};
  setTimeout(send,800);
  if(payload.fbclid||/facebook|instagram|meta/i.test(`${payload.utm_source} ${payload.utm_medium}`)){
    window.gtag?.('event','meta_ad_landing',{campaign_name:payload.utm_campaign||'(not set)',page_location:location.href,transport_type:'beacon'});
  }
})();
