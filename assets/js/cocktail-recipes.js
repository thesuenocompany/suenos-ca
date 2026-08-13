(function(){
  const indexGrid=document.querySelector('[data-cocktail-index]');
  const detailMain=document.querySelector('[data-cocktail-detail]');
  if(!indexGrid&&!detailMain)return;

  document.documentElement.dataset.recipeManaged='true';
  const lang=(document.documentElement.lang||'').toLowerCase().startsWith('es')?'es':'en';
  const isSpanish=lang==='es';
  const base=isSpanish?'/es-mx/cocteles/':'/en-ca/cocktails/';
  const otherBase=isSpanish?'/en-ca/cocktails/':'/es-mx/cocteles/';
  const copy=isSpanish?{
    view:'Ver receta →',back:'← Todos los Cócteles',ingredients:'Ingredientes',how:'Cómo Prepararlo',glassware:'Vaso',difficulty:'Dificultad',time:'Tiempo',garnish:'Decoración',serves:'Rinde',details:'Detalles',print:'Imprimir Receta',find:'Encuentra una Botella',about:'Sobre Sueños Blanco',more:'Más Cócteles',responsible:'Para adultos con edad legal para beber. Disfruta con responsabilidad.',tip:'Tip',byline:'Receta original de Sueños Tequila.',unavailableTitle:'Esta receta ya no está disponible.',unavailableBody:'Explora las recetas actuales de Sueños.',loadingError:'No se pudo cargar esta receta.'
  }:{
    view:'View Recipe →',back:'← All Cocktails',ingredients:'Ingredients',how:'How to Make It',glassware:'Glassware',difficulty:'Difficulty',time:'Time',garnish:'Garnish',serves:'Serves',details:'Details',print:'Print Recipe',find:'Find a Bottle',about:'About Sueños Blanco',more:'More Cocktails',responsible:'For adults of legal drinking age. Enjoy responsibly.',tip:'Tip',byline:'Original recipe by Sueños Tequila.',unavailableTitle:'This recipe is no longer available.',unavailableBody:'Explore the current Sueños cocktail collection.',loadingError:'This recipe could not be loaded.'
  };

  const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const absolute=value=>{try{return new URL(value,location.origin).href}catch{return value}};
  const setMeta=(selector,attribute,value)=>{const node=document.querySelector(selector);if(node&&value)node.setAttribute(attribute,value);};
  const dateLabel=value=>{
    try{return new Intl.DateTimeFormat(isSpanish?'es-MX':'en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));}
    catch{return value||''}
  };
  const recipeSlug=()=>{
    if(detailMain?.dataset.cocktailSlug)return detailMain.dataset.cocktailSlug;
    const query=new URLSearchParams(location.search).get('slug');
    if(query)return query;
    const parts=location.pathname.split('/').filter(Boolean);
    return parts.at(-1)==='recipe'?'':parts.at(-1)||'';
  };
  const pathFor=(recipe,language=lang)=>(language==='es'?'/es-mx/cocteles/':'/en-ca/cocktails/')+recipe.slug+'/';

  const updateMetadata=recipe=>{
    const data=recipe[lang];
    const url=absolute(pathFor(recipe));
    const otherUrl=absolute(pathFor(recipe,isSpanish?'en':'es'));
    const image=absolute(recipe.image);
    document.title=data.pageTitle||data.name;
    setMeta('meta[name="description"]','content',data.metaDescription||data.intro);
    setMeta('meta[name="robots"]','content','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
    setMeta('link[rel="canonical"]','href',url);
    const alternates=[...document.querySelectorAll('link[rel="alternate"][hreflang]')];
    alternates.forEach(link=>{
      const code=(link.getAttribute('hreflang')||'').toLowerCase();
      if(code==='en-ca')link.href=absolute(pathFor(recipe,'en'));
      if(code==='es-mx')link.href=absolute(pathFor(recipe,'es'));
      if(code==='x-default')link.href=absolute(pathFor(recipe,'en'));
    });
    setMeta('meta[property="og:title"]','content',data.pageTitle||data.name);
    setMeta('meta[property="og:description"]','content',data.metaDescription||data.intro);
    setMeta('meta[property="og:url"]','content',url);
    setMeta('meta[property="og:image"]','content',image);
    setMeta('meta[name="twitter:title"]','content',data.pageTitle||data.name);
    setMeta('meta[name="twitter:description"]','content',data.metaDescription||data.intro);
    setMeta('meta[name="twitter:image"]','content',image);
    const switchLink=document.querySelector('a.switch');
    if(switchLink)switchLink.href=otherUrl;

    const retained=[];
    const retainedIds=new Set();
    const isDynamicType=node=>{
      const types=Array.isArray(node?.['@type'])?node['@type']:[node?.['@type']];
      return types.some(type=>['WebPage','BreadcrumbList','Recipe'].includes(type));
    };
    document.querySelectorAll('script[type="application/ld+json"]').forEach(script=>{
      try{
        const parsed=JSON.parse(script.textContent||'{}');
        const graph=Array.isArray(parsed?.['@graph'])?parsed['@graph']:[parsed];
        if(!graph.some(node=>{const types=Array.isArray(node?.['@type'])?node['@type']:[node?.['@type']];return types.includes('Recipe');}))return;
        graph.filter(node=>node&&!isDynamicType(node)).forEach(node=>{
          const id=node['@id']||JSON.stringify(node);
          if(!retainedIds.has(id)){retainedIds.add(id);retained.push(node);}
        });
        script.remove();
      }catch{}
    });
    const organizationId='https://www.suenos.ca/#organization';
    const brandId='https://www.suenos.ca/#brand';
    const websiteId='https://www.suenos.ca/#website';
    const foundation=retained.length?retained:[
      {'@type':'Organization','@id':organizationId,name:'Sueños Tequila',alternateName:['Suenos Tequila','Sueños Artisan Tequila'],url:'https://www.suenos.ca/en-ca/',logo:{'@type':'ImageObject',url:'https://www.suenos.ca/assets/images/logo.webp'},email:'sales@suenos.ca',founder:{'@id':'https://www.suenos.ca/#gord-erickson'},foundingLocation:{'@type':'Place',name:'British Columbia, Canada',address:{'@type':'PostalAddress',addressRegion:'British Columbia',addressCountry:'CA'}},sameAs:['https://www.instagram.com/suenostequila','https://www.facebook.com/suenostequila/'],owns:{'@id':brandId}},
      {'@type':'Person','@id':'https://www.suenos.ca/#gord-erickson',name:'Gord Erickson',url:'https://www.gorderickson.com/',founderOf:{'@id':organizationId}},
      {'@type':'Brand','@id':brandId,name:'Sueños Tequila',alternateName:['Suenos Tequila','Sueños Artisan Tequila'],slogan:'Paradise Is a State of Sueños',logo:'https://www.suenos.ca/assets/images/logo.webp',url:'https://www.suenos.ca/en-ca/'},
      {'@type':'WebSite','@id':websiteId,url:'https://www.suenos.ca/',name:'Sueños Tequila',alternateName:'Suenos Tequila',publisher:{'@id':organizationId},inLanguage:['en-CA','es-MX']}
    ];
    const minutes=Number.parseInt(String(data.time||'').match(/\d+/)?.[0]||'',10);
    const webPage={'@type':'WebPage','@id':`${url}#webpage`,url,name:data.pageTitle||data.name,description:data.metaDescription||data.intro,isPartOf:{'@id':websiteId},about:{'@id':brandId},publisher:{'@id':organizationId},inLanguage:isSpanish?'es-MX':'en-CA',dateModified:data.lastReviewed,breadcrumb:{'@id':`${url}#breadcrumb`},mainEntity:{'@id':`${url}#recipe`}};
    const breadcrumb={'@type':'BreadcrumbList','@id':`${url}#breadcrumb`,itemListElement:[
      {'@type':'ListItem',position:1,name:isSpanish?'Inicio':'Home',item:absolute(isSpanish?'/es-mx/':'/en-ca/')},
      {'@type':'ListItem',position:2,name:isSpanish?'Cócteles':'Cocktails',item:absolute(base)},
      {'@type':'ListItem',position:3,name:data.name,item:url}
    ]};
    const recipeNode={'@type':'Recipe','@id':`${url}#recipe`,name:data.name,description:data.metaDescription||data.intro,image:[image],author:{'@id':organizationId},publisher:{'@id':organizationId},dateModified:data.lastReviewed,recipeYield:data.serves,recipeCategory:isSpanish?'Cóctel':'Cocktail',recipeIngredient:data.ingredients,recipeInstructions:data.steps.map((text,index)=>({'@type':'HowToStep',position:index+1,text})),inLanguage:isSpanish?'es-MX':'en-CA',mainEntityOfPage:{'@id':`${url}#webpage`}};
    if(Number.isFinite(minutes)&&minutes>0)recipeNode.prepTime=`PT${minutes}M`;
    const jsonLd={'@context':'https://schema.org','@graph':[...foundation,webPage,breadcrumb,recipeNode]};
    const script=document.createElement('script');script.type='application/ld+json';script.id='cocktail-dynamic-jsonld';script.textContent=JSON.stringify(jsonLd);document.head.append(script);
  };

  const renderIndex=recipes=>{
    indexGrid.replaceChildren();
    recipes.forEach((recipe,index)=>{
      const data=recipe[lang];
      const link=document.createElement('a');link.className='card recipe-card-link';link.href=pathFor(recipe);
      const image=document.createElement('img');image.src=recipe.image;image.alt=data.imageAlt||data.name;image.decoding='async';image.loading=index===0?'eager':'lazy';image.width=1254;image.height=1254;
      const body=document.createElement('div');body.className='card-body';
      if(data.cardEyebrow){const eyebrow=document.createElement('div');eyebrow.className='eyebrow';eyebrow.textContent=data.cardEyebrow;body.append(eyebrow);}
      const title=document.createElement('h3');title.textContent=data.name;
      const summary=document.createElement('p');summary.textContent=data.cardSummary||data.intro;
      const label=document.createElement('span');label.className='recipe-link-label';label.textContent=copy.view;
      body.append(title,summary,label);
      if(data.cardExtraLabel){const extra=document.createElement('span');extra.className='recipe-link-label recipe-card-extra-label';extra.textContent=data.cardExtraLabel;body.append(extra);}
      link.append(image,body);indexGrid.append(link);
    });
  };

  const renderUnavailable=message=>{
    detailMain.innerHTML=`<section class="page-hero"><div class="small inner"><div class="kicker">${escapeHTML(isSpanish?'CÓCTELES':'COCKTAILS')}</div><h1>${escapeHTML(copy.unavailableTitle)}</h1><p>${escapeHTML(message||copy.unavailableBody)}</p><a class="orange-btn" href="${base}">${escapeHTML(isSpanish?'Ver Cócteles':'View Cocktails')}</a></div></section>`;
    document.title=copy.unavailableTitle;
    setMeta('meta[name="robots"]','content','noindex,follow');
  };

  const renderDetail=(recipe,recipes)=>{
    const data=recipe[lang];
    const others=recipes.filter(item=>item.slug!==recipe.slug);
    const start=Math.max(0,recipes.findIndex(item=>item.slug===recipe.slug));
    const more=[];
    for(let i=1;i<=others.length&&more.length<2;i++){
      const candidate=recipes[(start+i)%recipes.length];
      if(candidate&&candidate.slug!==recipe.slug&&!more.some(item=>item.slug===candidate.slug))more.push(candidate);
    }
    const byline=`${copy.byline} ${isSpanish?'Última revisión':'Last reviewed'} ${dateLabel(data.lastReviewed)}.`;
    const extraAction=data.extraActionLabel&&data.extraActionHref?`<a class="text-button" href="${escapeHTML(data.extraActionHref)}">${escapeHTML(data.extraActionLabel)}</a>`:'';
    const moreLinks=more.map(item=>`<a href="${pathFor(item)}">${escapeHTML(item[lang].name)}</a>`).join(' • ');
    detailMain.innerHTML=`
<section class="recipe-showcase"><div class="container"><a class="recipe-back-crumb" href="${base}">${escapeHTML(copy.back)}</a><div class="recipe-showcase-grid">
<div class="recipe-showcase-copy"><div class="recipe-eyebrow">${escapeHTML(data.eyebrow)}</div><h1>${escapeHTML(data.name)}</h1><p class="recipe-tagline">${escapeHTML(data.tagline)}</p><p class="recipe-intro">${escapeHTML(data.intro)}</p><div class="recipe-mini-meta"><span>${escapeHTML(data.glassware)}</span><span>${escapeHTML(data.difficulty)}</span><span>${escapeHTML(data.time)}</span><span>${escapeHTML(data.garnish)}</span></div></div>
<div class="recipe-showcase-stage"><img alt="" aria-hidden="true" class="recipe-showcase-note" decoding="async" height="316" loading="eager" src="/assets/images/hero-note.png" width="776"/><div class="recipe-stage-bg"></div><div class="recipe-cocktail-shot"><img alt="${escapeHTML(data.imageAlt||data.name)}" decoding="async" height="1254" loading="eager" src="${escapeHTML(recipe.image)}" width="1254"/></div><img alt="${escapeHTML(isSpanish?'Botella de Sueños Blanco':'Sueños Blanco bottle')}" class="recipe-bottle-shot" decoding="async" height="1536" loading="eager" src="/assets/images/bottle-exact.png" width="501"/></div>
</div></div></section>
<section class="recipe-build-section section"><div class="container"><div class="recipe-build-grid">
<article class="recipe-card-paper"><h2>${escapeHTML(copy.ingredients)}</h2><ul class="recipe-list-new">${data.ingredients.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul></article>
<article class="recipe-card-dark"><h2>${escapeHTML(copy.how)}</h2><ol class="recipe-steps-new">${data.steps.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ol></article>
<aside class="recipe-side-stack"><div class="recipe-side-card">
${[[copy.glassware,data.glassware],[copy.difficulty,data.difficulty],[copy.time,data.time],[copy.garnish,data.garnish],[copy.serves,data.serves]].map(([label,value])=>`<div class="recipe-side-item"><span class="recipe-side-label">${escapeHTML(label)}</span><p>${escapeHTML(value)}</p></div>`).join('')}
</div><div class="recipe-card-dark"><h2>${escapeHTML(copy.details)}</h2><p class="recipe-byline-note">${escapeHTML(byline)}</p><div class="recipe-actions"><button class="orange-btn" data-print-recipe type="button">${escapeHTML(copy.print)}</button><a class="text-button" data-find-bottle href="${isSpanish?'/es-mx/encuentra-una-botella/':'/en-ca/find-a-bottle/'}">${escapeHTML(copy.find)}</a><a class="text-button" href="${isSpanish?'/es-mx/nuestro-tequila/':'/en-ca/our-tequila/'}">${escapeHTML(copy.about)}</a>${extraAction}</div><div class="recipe-side-item recipe-more-cocktails"><span class="recipe-side-label">${escapeHTML(copy.more)}</span><p>${moreLinks}</p></div><p class="recipe-byline-note recipe-responsible">${escapeHTML(copy.responsible)}</p></div></aside>
</div>${data.tip?`<div class="recipe-tip-banner"><strong>${escapeHTML(copy.tip)}</strong><p>${escapeHTML(data.tip)}</p><span aria-hidden="true">→</span></div>`:''}</div></section>`;
    updateMetadata(recipe);
    detailMain.querySelector('[data-print-recipe]')?.addEventListener('click',()=>{
      if(typeof window.gtag==='function')window.gtag('event','print_recipe',{recipe_name:data.name,language:document.documentElement.lang||'unknown'});
      window.print();
    });
    detailMain.querySelector('[data-find-bottle]')?.addEventListener('click',event=>{
      if(typeof window.gtag==='function')window.gtag('event','find_bottle_click',{link_url:event.currentTarget.href,link_text:event.currentTarget.textContent.trim()});
    });
    if(typeof window.gtag==='function')window.gtag('event','recipe_view',{recipe_name:data.name,recipe_slug:recipe.slug,language:document.documentElement.lang||'unknown'});
  };

  const init=async()=>{
    try{
      const response=await fetch('/api/cocktail-recipes',{headers:{accept:'application/json'},cache:'no-store'});
      const result=await response.json();
      if(!response.ok||!result.ok)throw new Error(result.message||'Unable to load recipes.');
      const recipes=(result.content?.recipes||[]).filter(recipe=>recipe.published!==false).sort((a,b)=>(a.order||0)-(b.order||0));
      if(indexGrid)renderIndex(recipes);
      if(detailMain){
        const slug=recipeSlug();
        const recipe=recipes.find(item=>item.slug===slug);
        if(recipe)renderDetail(recipe,recipes);
        else if(result.source==='admin')renderUnavailable(copy.unavailableBody);
        else if(detailMain.dataset.cocktailDynamic==='true')renderUnavailable(copy.loadingError);
      }
    }catch(error){
      console.error('Unable to load cocktail recipes.',error);
      if(detailMain?.dataset.cocktailDynamic==='true')renderUnavailable(copy.loadingError);
    }
  };
  init();
})();
