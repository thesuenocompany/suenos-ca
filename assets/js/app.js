(()=>{
  const AGE_STORAGE_KEY='suenos-age-confirmed';

  const Consent=(()=>{
    const STORAGE_KEY='Suenos-cookie-consent-v1';
    const LEGACY_STORAGE_KEY='suenos-cookie-consent-v1';
    const META_ID='1026457833470254';
    const isSpanish=(document.documentElement.lang||'').toLowerCase().startsWith('es');
    const copy=isSpanish?{
      eyebrow:'TU PRIVACIDAD',
      title:'Elige tus cookies',
      intro:'Usamos almacenamiento esencial para que el sitio funcione. Con tu permiso, también usamos analítica y publicidad para entender qué funciona y mejorar Sueños.',
      accept:'Aceptar Todo',
      reject:'Rechazar No Esenciales',
      manage:'Administrar Preferencias',
      modalTitle:'Preferencias de Cookies',
      modalIntro:'Controla qué tecnologías no esenciales pueden funcionar en este sitio. Puedes cambiar tu selección en cualquier momento desde el pie de página.',
      essential:'Esenciales',
      essentialDesc:'Necesarias para funciones como la verificación de edad y para recordar tus preferencias. Siempre activas.',
      analytics:'Analítica',
      analyticsDesc:'Ayuda a medir visitas y uso del sitio mediante Google Analytics.',
      marketing:'Publicidad',
      marketingDesc:'Permite medir campañas y actividad publicitaria mediante Meta Pixel.',
      always:'Siempre activas',
      save:'Guardar Preferencias',
      close:'Cerrar preferencias de cookies',
      policy:'Política de Privacidad',
      ageMark:'EDAD<br>LEGAL'
    }:{
      eyebrow:'YOUR PRIVACY',
      title:'Choose Your Cookies',
      intro:'We use essential storage to make the site work. With your permission, we also use analytics and advertising tools to understand what is working and improve Sueños.',
      accept:'Accept All',
      reject:'Reject Non-Essential',
      manage:'Manage Preferences',
      modalTitle:'Cookie Preferences',
      modalIntro:'Control which non-essential technologies may run on this site. You can change your selection at any time from the footer.',
      essential:'Essential',
      essentialDesc:'Required for features such as age verification and remembering your preferences. Always active.',
      analytics:'Analytics',
      analyticsDesc:'Helps measure visits and site use through Google Analytics.',
      marketing:'Advertising',
      marketingDesc:'Allows campaign and advertising measurement through Meta Pixel.',
      always:'Always active',
      save:'Save Preferences',
      close:'Close cookie preferences',
      policy:'Privacy Policy',
      ageMark:'LEGAL<br>AGE'
    };

    let current=null;
    let lastFocus=null;
    let metaInitialized=false;
    let metaPageViewSent=false;

    const normalize=value=>{
      if(value&&typeof value.analytics==='boolean'&&typeof value.marketing==='boolean'){
        return{
          analytics:value.analytics,
          marketing:value.marketing,
          updatedAt:value.updatedAt||null,
          version:value.version||1
        };
      }
      return null;
    };

    const readKey=key=>{
      try{return normalize(JSON.parse(localStorage.getItem(key)||'null'))}
      catch(error){return null}
    };

    const read=()=>{
      const stored=readKey(STORAGE_KEY);
      if(stored)return stored;
      const legacy=readKey(LEGACY_STORAGE_KEY);
      if(legacy){
        try{localStorage.setItem(STORAGE_KEY,JSON.stringify(legacy))}catch(error){}
        return legacy;
      }
      return null;
    };

    const eraseCookie=name=>{
      const host=location.hostname.replace(/^www\./,'');
      const domains=['',location.hostname,host,'.'+host];
      domains.forEach(domain=>{
        const domainPart=domain?`; domain=${domain}`:'';
        document.cookie=`${name}=; Max-Age=0; path=/${domainPart}; SameSite=Lax`;
      });
    };

    const storedCookieNames=()=>{
      try{return document.cookie.split(';').map(item=>item.split('=')[0].trim()).filter(Boolean)}
      catch(error){return []}
    };
    const eraseAnalyticsCookies=()=>storedCookieNames().forEach(name=>{
      if(/^_ga(?:_|$)|^_gid$|^_gat/i.test(name))eraseCookie(name);
    });
    const eraseMarketingCookies=()=>storedCookieNames().forEach(name=>{
      if(/^_fbp$|^_fbc$/i.test(name))eraseCookie(name);
    });

    const updateGoogleConsent=preferences=>{
      if(typeof window.gtag!=='function')return;
      window.gtag('consent','update',{
        analytics_storage:preferences.analytics?'granted':'denied',
        ad_storage:preferences.marketing?'granted':'denied',
        ad_user_data:preferences.marketing?'granted':'denied',
        ad_personalization:preferences.marketing?'granted':'denied'
      });
    };

    const ensureMeta=()=>{
      if(!metaInitialized){
        metaInitialized=true;
        !function(f,b,e,v,n,t,s){
          if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];
          t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);
        }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('consent','grant');
        window.fbq('init',META_ID);
      }else{
        window.fbq('consent','grant');
      }
      if(!metaPageViewSent){
        metaPageViewSent=true;
        window.fbq('track','PageView');
      }
    };

    const apply=preferences=>{
      updateGoogleConsent(preferences);
      if(preferences.marketing)ensureMeta();
      else if(typeof window.fbq==='function')window.fbq('consent','revoke');
      if(!preferences.analytics)eraseAnalyticsCookies();
      if(!preferences.marketing)eraseMarketingCookies();
    };

    const policyHref=()=>{
      const link=document.querySelector('a.footer-legal-link[href*="privacy"],a[href*="privacy-policy"],a[href*="politica-de-privacidad"]');
      return link?.getAttribute('href')||'#';
    };

    const inject=()=>{
      if(document.querySelector('[data-cookie-banner]'))return;
      document.body.insertAdjacentHTML('beforeend',`
        <section class="cookie-banner" data-cookie-banner hidden aria-label="${copy.title}">
          <div class="cookie-banner-mark" aria-hidden="true">${copy.ageMark}</div>
          <div class="cookie-banner-copy">
            <span class="cookie-eyebrow">${copy.eyebrow}</span>
            <h2>${copy.title}</h2>
            <p>${copy.intro} <a href="${policyHref()}">${copy.policy}</a></p>
          </div>
          <div class="cookie-banner-actions">
            <button class="cookie-btn cookie-btn-primary" type="button" data-cookie-accept>${copy.accept}</button>
            <button class="cookie-btn" type="button" data-cookie-reject>${copy.reject}</button>
            <button class="cookie-link-btn" type="button" data-cookie-manage>${copy.manage}</button>
          </div>
        </section>
        <div class="cookie-modal" data-cookie-modal hidden aria-hidden="true">
          <button class="cookie-modal-backdrop" type="button" data-cookie-close aria-label="${copy.close}"></button>
          <section class="cookie-preferences-card" role="dialog" aria-modal="true" aria-labelledby="cookie-preferences-title">
            <button class="cookie-modal-close" type="button" data-cookie-close aria-label="${copy.close}">×</button>
            <span class="cookie-eyebrow">${copy.eyebrow}</span>
            <h2 id="cookie-preferences-title">${copy.modalTitle}</h2>
            <p class="cookie-preferences-intro">${copy.modalIntro}</p>
            <div class="cookie-category is-essential">
              <div><h3>${copy.essential}</h3><p>${copy.essentialDesc}</p></div>
              <span class="cookie-always">${copy.always}</span>
            </div>
            <label class="cookie-category" for="cookie-analytics">
              <div><h3>${copy.analytics}</h3><p>${copy.analyticsDesc}</p></div>
              <span class="cookie-toggle"><input id="cookie-analytics" type="checkbox" data-cookie-analytics><span aria-hidden="true"></span></span>
            </label>
            <label class="cookie-category" for="cookie-marketing">
              <div><h3>${copy.marketing}</h3><p>${copy.marketingDesc}</p></div>
              <span class="cookie-toggle"><input id="cookie-marketing" type="checkbox" data-cookie-marketing><span aria-hidden="true"></span></span>
            </label>
            <div class="cookie-preferences-actions">
              <button class="cookie-btn cookie-btn-primary" type="button" data-cookie-save>${copy.save}</button>
              <a class="cookie-policy-link" href="${policyHref()}">${copy.policy}</a>
            </div>
          </section>
        </div>`);
    };

    const banner=()=>document.querySelector('[data-cookie-banner]');
    const modal=()=>document.querySelector('[data-cookie-modal]');
    const showBanner=()=>{const el=banner();if(el)el.hidden=false};
    const hideBanner=()=>{const el=banner();if(el)el.hidden=true};
    const showBannerIfNeeded=()=>{if(!current)showBanner()};

    const openPreferences=()=>{
      const el=modal();
      if(!el)return;
      lastFocus=document.activeElement;
      const prefs=current||{analytics:false,marketing:false};
      const analytics=el.querySelector('[data-cookie-analytics]');
      const marketing=el.querySelector('[data-cookie-marketing]');
      if(analytics)analytics.checked=!!prefs.analytics;
      if(marketing)marketing.checked=!!prefs.marketing;
      el.hidden=false;
      el.setAttribute('aria-hidden','false');
      document.body.classList.add('cookie-lock');
      setTimeout(()=>el.querySelector('[data-cookie-analytics]')?.focus(),40);
    };

    const closePreferences=()=>{
      const el=modal();
      if(!el)return;
      el.hidden=true;
      el.setAttribute('aria-hidden','true');
      document.body.classList.remove('cookie-lock');
      lastFocus?.focus?.();
    };

    const save=preferences=>{
      current={
        analytics:!!preferences.analytics,
        marketing:!!preferences.marketing,
        updatedAt:new Date().toISOString(),
        version:1
      };
      try{
        localStorage.setItem(STORAGE_KEY,JSON.stringify(current));
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      }catch(error){}
      hideBanner();
      closePreferences();
      apply(current);
    };

    const bind=()=>{
      document.querySelectorAll('[data-cookie-accept]').forEach(button=>button.addEventListener('click',()=>save({analytics:true,marketing:true})));
      document.querySelectorAll('[data-cookie-reject]').forEach(button=>button.addEventListener('click',()=>save({analytics:false,marketing:false})));
      document.querySelectorAll('[data-cookie-manage],[data-cookie-preferences]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();openPreferences()}));
      document.querySelectorAll('[data-cookie-close]').forEach(button=>button.addEventListener('click',closePreferences));
      document.querySelectorAll('[data-cookie-save]').forEach(button=>button.addEventListener('click',()=>{
        const el=modal();
        save({analytics:!!el?.querySelector('[data-cookie-analytics]')?.checked,marketing:!!el?.querySelector('[data-cookie-marketing]')?.checked});
      }));
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal()&&!modal().hidden)closePreferences()});
    };

    const init=({showBannerOnInit=true}={})=>{
      inject();
      bind();
      current=read();
      if(current)apply(current);
      else{
        updateGoogleConsent({analytics:false,marketing:false});
        if(showBannerOnInit)showBanner();
      }
    };

    const trackMeta=(eventName,parameters)=>{
      if(!current?.marketing||!metaInitialized||typeof window.fbq!=='function')return false;
      if(parameters===undefined)window.fbq('track',eventName);
      else window.fbq('track',eventName,parameters);
      return true;
    };

    return{
      init,
      get preferences(){return current},
      get advertisingAllowed(){return !!current?.marketing},
      openPreferences,
      showBannerIfNeeded,
      trackMeta
    };
  })();

  const key=AGE_STORAGE_KEY;
  const gate=document.getElementById('age-gate');
  const toast=document.getElementById('toast');
  const show=m=>{if(!toast)return;toast.textContent=m;toast.style.display='block';setTimeout(()=>toast.style.display='none',2300)};
  const track=(name,params={})=>{if(typeof window.gtag==='function')window.gtag('event',name,params)};
  const ageAlreadyConfirmed=!!localStorage.getItem(key);

  Consent.init({showBannerOnInit:!gate||ageAlreadyConfirmed});
  window.SuenosConsent=Consent;

  if(gate&&!ageAlreadyConfirmed){
    gate.style.display='flex';
    document.body.classList.add('age-lock');
  }

  document.querySelectorAll('[data-enter]').forEach(button=>button.addEventListener('click',()=>{
    localStorage.setItem(key,'1');
    if(gate)gate.style.display='none';
    document.body.classList.remove('age-lock');
    Consent.showBannerIfNeeded();
    track('age_gate_confirmed',{language:document.documentElement.lang||'unknown'});
  }));

  document.querySelectorAll('form[data-contact-form]').forEach(form=>{
    const startedAtField=form.querySelector('[name="formStartedAt"]');
    const stampStartTime=()=>{if(startedAtField)startedAtField.value=String(Date.now());};
    const resetTurnstile=()=>{try{if(window.turnstile?.reset)window.turnstile.reset();}catch(error){/* Widget will refresh on reload. */}};
    stampStartTime();

    form.addEventListener('submit',async event=>{
      event.preventDefault();
      const button=form.querySelector('button[type="submit"]');
      const status=form.querySelector('[data-contact-status]');
      const originalButtonText=button?.textContent||'';
      const endpoint=form.dataset.endpoint||'/api/contact';
      const sendingText=form.dataset.sending||'Sending…';
      const successText=form.dataset.success||'Thanks. Your message has been sent to Sueños.';
      const errorText=form.dataset.error||'Your message could not be sent. Please try again or email sales@suenos.ca.';
      const verificationText=form.dataset.verification||'Please complete the spam-protection check.';
      const rateLimitText=form.dataset.rateLimit||'Too many messages were submitted. Please wait before trying again.';
      const token=form.querySelector('[name="cf-turnstile-response"]')?.value?.trim()||'';

      if(status){status.textContent='';status.className='contact-status';}
      if(!token){
        if(status){status.textContent=verificationText;status.classList.add('is-error');}
        show(verificationText);
        return;
      }
      if(button){button.disabled=true;button.textContent=sendingText;}

      const data=Object.fromEntries(new FormData(form).entries());
      data.language=document.documentElement.lang||'unknown';
      data.pageUrl=window.location.href;

      try{
        const response=await fetch(endpoint,{
          method:'POST',
          headers:{'content-type':'application/json','accept':'application/json'},
          body:JSON.stringify(data)
        });
        const result=await response.json().catch(()=>({}));
        if(response.status===429)throw new Error(rateLimitText);
        if(!response.ok||!result.ok)throw new Error(result.message||errorText);

        form.reset();
        resetTurnstile();
        stampStartTime();
        if(status){status.textContent=result.message||successText;status.classList.add('is-success');}
        show(result.message||successText);
        track('contact_form_submit',{page_location:window.location.href,language:document.documentElement.lang||'unknown',delivery_method:'server_function'});
        Consent.trackMeta('Contact');
      }catch(error){
        const message=error?.message||errorText;
        resetTurnstile();
        if(status){status.textContent=message;status.classList.add('is-error');}
        show(message);
        track('contact_form_error',{page_location:window.location.href,language:document.documentElement.lang||'unknown'});
      }finally{
        if(button){button.disabled=false;button.textContent=originalButtonText;}
      }
    });
  });

  document.querySelectorAll('.recipe-actions button').forEach(button=>button.addEventListener('click',()=>{
    const title=document.querySelector('h1')?.textContent?.trim()||document.title;
    track('print_recipe',{recipe_name:title,language:document.documentElement.lang||'unknown'});
  }));

  document.querySelectorAll('a.switch').forEach(link=>link.addEventListener('click',()=>{
    track('language_switch',{from_language:document.documentElement.lang||'unknown',destination:link.href});
  }));

  document.querySelectorAll('a[href]').forEach(link=>link.addEventListener('click',()=>{
    const href=link.getAttribute('href')||'';
    if(href.includes('find-a-bottle')||href.includes('encuentra-una-botella')){
      track('find_bottle_click',{link_url:link.href,link_text:(link.textContent||link.getAttribute('aria-label')||'').trim()});
    }
    if(/^https?:/i.test(href)){
      try{
        const url=new URL(link.href);
        if(url.hostname!==window.location.hostname){
          track('outbound_click',{link_url:link.href,link_domain:url.hostname,link_text:(link.textContent||'').trim()});
        }
      }catch(error){}
    }
  }));

  const path=window.location.pathname;
  if(/\/(cocktails|cocteles)\/[^/]+\/?$/.test(path)&&document.documentElement.dataset.recipeManaged!=='true'){
    const title=document.querySelector('h1')?.textContent?.trim()||document.title;
    track('recipe_view',{recipe_name:title,language:document.documentElement.lang||'unknown'});
  }

  if(document.querySelector('iframe[src*="suenos-locator.netlify.app"]')){
    track('retailer_locator_view',{page_location:window.location.href,language:document.documentElement.lang||'unknown'});
  }

  document.querySelectorAll('[data-random-cocktails]').forEach(grid=>{
    const cards=[...grid.querySelectorAll('.recipe-card-link')];
    const requested=Number.parseInt(grid.dataset.randomCount||'4',10);
    const visibleCount=Number.isFinite(requested)?Math.max(1,Math.min(requested,cards.length)):Math.min(4,cards.length);
    if(cards.length<=visibleCount)return;
    const fixed=cards.find(card=>card.dataset.cocktailFixed==='true')||cards[0];
    const pool=cards.filter(card=>card!==fixed);
    for(let i=pool.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [pool[i],pool[j]]=[pool[j],pool[i]];
    }
    const selected=[fixed,...pool.slice(0,Math.max(0,visibleCount-1))];
    const remaining=pool.slice(Math.max(0,visibleCount-1));
    grid.replaceChildren(...selected,...remaining);
  });

  const societyModal=document.querySelector('[data-society-modal]');
  const societyForm=document.querySelector('[data-society-form]');
  const societyFormWrap=societyModal?.querySelector('.society-form-wrap');
  const societyIsSpanish=(document.documentElement.lang||'').toLowerCase().startsWith('es');
  const societyThanksCopy=societyIsSpanish?{
    eyebrow:'BIENVENIDO A SUEÑOS SOCIETY',
    title:'Gracias por acompañarnos.',
    body:'Sueños nació para acercar un poco de paraíso a los días de todos los días, y nos alegra de verdad que estés aquí. Revisa tu correo para confirmar tu suscripción. Después te mantendremos al tanto de nuevos lanzamientos, recetas de cócteles, eventos y lugares donde encontrar Sueños.',
    signoff:'Con gratitud,',
    brand:'Sueños',
    cta:'Encuentra una botella cerca de ti',
    aria:'Registro enviado. Gracias por unirte a Sueños Society.'
  }:{
    eyebrow:'WELCOME TO THE SUEÑOS SOCIETY',
    title:'Thank you for joining us.',
    body:'Sueños was created to bring a little more paradise into ordinary days, and we are genuinely glad you are here. Check your inbox to confirm your subscription. After that, we will keep you close to new releases, cocktail recipes, events and the places carrying Sueños.',
    signoff:'With gratitude,',
    brand:'Sueños',
    cta:'Find a Bottle Near You',
    aria:'Signup submitted. Thank you for joining the Sueños Society.'
  };
  let societyLastFocus=null;
  let societySubmitted=false;

  const findBottleHref=()=>{
    const selector=societyIsSpanish?'a[href*="encuentra-una-botella"]':'a[href*="find-a-bottle"]';
    return document.querySelector(selector)?.getAttribute('href')||(societyIsSpanish?'/es-mx/encuentra-una-botella/':'/en-ca/find-a-bottle/');
  };

  const ensureMailchimpFrame=()=>{
    if(document.querySelector('iframe[name="suenos-mailchimp-submit"]'))return;
    const frame=document.createElement('iframe');
    frame.name='suenos-mailchimp-submit';
    frame.title='Mailchimp signup response';
    frame.hidden=true;
    frame.tabIndex=-1;
    frame.setAttribute('aria-hidden','true');
    document.body.appendChild(frame);
  };

  const renderSocietyThanks=()=>{
    if(!societyFormWrap)return;
    societySubmitted=true;
    societyFormWrap.classList.add('is-thank-you');
    societyModal?.querySelector('.society-card')?.classList.add('is-thank-you');
    societyFormWrap.innerHTML=`
      <div class="society-thanks" role="status" aria-live="polite" aria-label="${societyThanksCopy.aria}">
        <div class="society-thanks-sun" aria-hidden="true">✺</div>
        <span class="society-thanks-eyebrow">${societyThanksCopy.eyebrow}</span>
        <h2 tabindex="-1">${societyThanksCopy.title}</h2>
        <p>${societyThanksCopy.body}</p>
        <div class="society-thanks-signoff"><span>${societyThanksCopy.signoff}</span><strong>${societyThanksCopy.brand}</strong></div>
        <a class="society-thanks-cta" href="${findBottleHref()}"><span>${societyThanksCopy.cta}</span><span aria-hidden="true">→</span></a>
        <div class="society-thanks-tagline">${societyIsSpanish?'El Paraíso Es Un Estado de Sueños.':'Paradise Is A State of Sueños.'}</div>
      </div>`;
    setTimeout(()=>societyFormWrap.querySelector('h2')?.focus(),80);
  };

  const openSociety=()=>{
    if(!societyModal)return;
    societyLastFocus=document.activeElement;
    societyModal.hidden=false;
    societyModal.setAttribute('aria-hidden','false');
    document.body.classList.add('society-lock');
    track('newsletter_signup_open',{language:document.documentElement.lang||'unknown',page_location:window.location.href});
    setTimeout(()=>{
      if(societySubmitted)societyModal.querySelector('.society-thanks-cta')?.focus();
      else societyModal.querySelector('input[type="email"]')?.focus();
    },60);
  };
  const closeSociety=()=>{
    if(!societyModal)return;
    societyModal.hidden=true;
    societyModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('society-lock');
    societyLastFocus?.focus?.();
  };

  ensureMailchimpFrame();
  if(societyForm)societyForm.target='suenos-mailchimp-submit';

  document.querySelectorAll('[data-society-open]').forEach(button=>button.addEventListener('click',openSociety));
  document.querySelectorAll('[data-society-close]').forEach(button=>button.addEventListener('click',closeSociety));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&societyModal&&!societyModal.hidden)closeSociety()});

  societyForm?.addEventListener('submit',()=>{
    const language=document.documentElement.lang||'unknown';
    track('newsletter_signup_submit',{language,page_location:window.location.href,form_name:'Suenos Society'});
    Consent.trackMeta('Lead',{content_name:'Suenos Society'});
    const submitButton=societyForm.querySelector('button[type="submit"]');
    if(submitButton){submitButton.disabled=true;submitButton.setAttribute('aria-busy','true');}
    setTimeout(renderSocietyThanks,420);
  });
})();
