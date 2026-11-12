// Locator actions use the embedding site's consent and GA session, never a second tag.
(()=>{
  if(window.SuenosLocatorTracking)return;
  const actions=new Set(['website','call','directions']);
  let lastKey='',lastAt=0;
  function track(action,retailerId,venueType){
    if(!actions.has(action)||!['retail','hospitality'].includes(venueType)||
       !/^[a-zA-Z0-9_-]{1,80}$/.test(String(retailerId)))return false;
    try{
      const host=window.parent;
      // Only the owned, same-origin embed may use the parent's measurement context.
      if(host===window||host.location.origin!==window.location.origin||
         host.SuenosConsent?.preferences?.analytics!==true||
         host.SuenosConsentBootstrap?.gaId!=='G-WX9XT6TEYG'||typeof host.gtag!=='function')return false;
      const key=[action,retailerId].join(':');
      const now=Date.now();
      if(key===lastKey&&now-lastAt<1000)return false;
      lastKey=key;lastAt=now;
      host.gtag('event','retailer_action',{
        send_to:'G-WX9XT6TEYG',action,retailer_id:String(retailerId),venue_type:venueType,
        locator_path:window.location.pathname,transport_type:'beacon'
      });
      return true;
    }catch{return false;}
  }
  document.addEventListener('click',event=>{
    if(!event.isTrusted)return;
    const link=event.target.closest?.('a[data-retailer-action]');
    if(!link)return;
    track(link.dataset.retailerAction,link.dataset.retailerId,link.dataset.venueType);
  });
  window.SuenosLocatorTracking={track};
})();
