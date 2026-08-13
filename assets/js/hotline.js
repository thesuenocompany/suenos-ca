(function(){
  const INDEX_KEY='suenos-hotline-index-v4';
  const WELCOME_INTERVAL=5200;
  const PRESS_ROTATE_INTERVAL=1400;
  const root=document.querySelector('[data-hotline-page]');
  if(!root)return;

  const lang=(root.dataset.lang||'en').toLowerCase().startsWith('es')?'es':'en';
  const defaults=(window.SuenosHotlineDefaults||{})[lang]||{};
  let content={...defaults};
  let activeOption=null;
  let hasChosenOption=false;
  let indexes={1:0,2:0,3:0};
  let welcomeIndex=0;
  let welcomeTimer=null;
  let pressRotateTimer=null;
  let pressRotateIndex=0;

  try{
    const saved=JSON.parse(sessionStorage.getItem(INDEX_KEY)||'{}')||{};
    const langState=saved[lang]||{};
    indexes={1:Number(langState.indexes?.[1])||0,2:Number(langState.indexes?.[2])||0,3:Number(langState.indexes?.[3])||0};
  }catch(error){}

  const adviceEl=root.querySelector('[data-hotline-advice]');
  const adviceCard=root.querySelector('#hotline-advice');
  const nextButton=root.querySelector('[data-hotline-next]');
  const optionCards=Array.from(root.querySelectorAll('.hotline-option'));
  const optionsPanel=root.querySelector('.hotline-grid')||root.querySelector('.hotline-panel');

  const setText=(selector,value)=>{
    const el=root.querySelector(selector);
    if(el&&value!==undefined&&value!==null)el.textContent=value;
  };


  const setPressHighlight=cardIndex=>{
    optionCards.forEach((card,index)=>card.classList.toggle('is-press-focus', cardIndex!==null && index===cardIndex));
  };

  const stopPressRotation=()=>{
    if(pressRotateTimer){window.clearInterval(pressRotateTimer);pressRotateTimer=null;}
    setPressHighlight(null);
  };

  const startPressRotation=()=>{
    stopPressRotation();
  };

  const animateMessage=()=>{
    const bubble=root.querySelector('.hotline-bubble');
    if(bubble){
      bubble.classList.remove('is-refresh');
      requestAnimationFrame(()=>bubble.classList.add('is-refresh'));
    }
    if(adviceEl){
      adviceEl.classList.remove('is-message-swap');
      requestAnimationFrame(()=>adviceEl.classList.add('is-message-swap'));
    }
  };

  const groupFor=option=>{
    const key=`responses${option}`;
    const remote=content[key];
    if(Array.isArray(remote)&&remote.length)return remote;
    const fallback=defaults[key];
    if(Array.isArray(fallback)&&fallback.length)return fallback;
    if(Array.isArray(content.advice)&&content.advice.length)return content.advice;
    return [content.subtitle||''];
  };

  const welcomeGroup=()=>{
    if(Array.isArray(content.welcomeMessages)&&content.welcomeMessages.length)return content.welcomeMessages;
    if(Array.isArray(defaults.welcomeMessages)&&defaults.welcomeMessages.length)return defaults.welcomeMessages;
    return [lang==='es'?'Don Terry está en la línea. Elige una opción.':'Don Terry is on the line. Choose an option.'];
  };

  const promptFor=option=>content[`prompt${option}`]||defaults[`prompt${option}`]||`Option ${option}`;

  const saveState=()=>{
    try{
      const saved=JSON.parse(sessionStorage.getItem(INDEX_KEY)||'{}')||{};
      saved[lang]={indexes};
      sessionStorage.setItem(INDEX_KEY,JSON.stringify(saved));
    }catch(error){}
  };

  const renderCopy=()=>{
    setText('[data-hotline-title]',lang==='es'?'La Línea Don Terry':'The Don Terry Hotline');
    setText('[data-hotline-subtitle]',lang==='es'?'Consejos cuestionables. Excelente energía tequilera.':'Questionable advice. Excellent tequila energy.');
    setText('[data-hotline-intro]',lang==='es'?'Elige lo que necesitas. Don Terry ofrecerá el tipo de orientación que ninguna institución acreditada aprobaría.':'Choose what you need. Don Terry will provide the kind of guidance no accredited institution would approve.');
    setText('[data-hotline-prompt="1"]',lang==='es'?'Necesito un Escape':'I Need an Escape');
    setText('[data-hotline-prompt="2"]',lang==='es'?'Necesito Consejo':'I Need Advice');
    setText('[data-hotline-prompt="3"]',lang==='es'?'Sorpréndeme':'Surprise Me');
    if(hasChosenOption)setText('[data-hotline-next]',lang==='es'?'Otra Respuesta':'Another Answer');
  };

  const setOptionsActive=option=>{
    root.querySelectorAll('[data-hotline-option]').forEach(button=>{
      const selected=option!==null&&Number(button.dataset.hotlineOption)===option;
      button.setAttribute('aria-pressed',String(selected));
      button.closest('.hotline-option')?.classList.toggle('is-active',selected);
    });
  };

  const renderWelcome=(animate=true)=>{
    if(adviceEl)adviceEl.textContent=lang==='es'?'Elige una opción para recibir una respuesta.':'Choose an option to get an answer.';
    setText('[data-hotline-advice-label]',lang==='es'?'Don Terry Está en la Línea':'Don Terry Is on the Line');
    setOptionsActive(null);
    adviceCard?.classList.add('is-welcome');
    if(nextButton)nextButton.hidden=true;
    if(animate)animateMessage();
  };

  const renderAdvice=()=>{
    if(activeOption===null)return renderWelcome();
    const list=groupFor(activeOption);
    indexes[activeOption]=((indexes[activeOption]%list.length)+list.length)%list.length;
    if(adviceEl)adviceEl.textContent=list[indexes[activeOption]];
    setText('[data-hotline-counter]',`${indexes[activeOption]+1} / ${list.length}`);
    setText('[data-hotline-advice-label]',lang==='es'?'Don Terry Está en la Línea':'Don Terry Is on the Line');
    setOptionsActive(activeOption);
    setPressHighlight(null);
    adviceCard?.classList.remove('is-welcome');
    if(nextButton){nextButton.hidden=false;nextButton.textContent=lang==='es'?'Otra Respuesta':'Another Answer';}
    animateMessage();
    saveState();
  };

  const stopWelcomeRotation=()=>{
    if(welcomeTimer){window.clearInterval(welcomeTimer);welcomeTimer=null;}
  };

  const startWelcomeRotation=()=>{
    stopWelcomeRotation();
    renderWelcome(false);
  };

  const chooseOption=option=>{
    hasChosenOption=true;
    stopWelcomeRotation();
    stopPressRotation();
    activeOption=option;
    const list=groupFor(option);
    const previous=indexes[option]||0;
    if(list.length>1){
      let next=Math.floor(Math.random()*list.length);
      if(next===previous)next=(next+1)%list.length;
      indexes[option]=next;
    }else indexes[option]=0;
    renderAdvice();
    adviceCard?.scrollIntoView({behavior:'smooth',block:'center'});
  };

  const step=delta=>{
    if(!hasChosenOption||activeOption===null)return;
    const list=groupFor(activeOption);
    indexes[activeOption]=(indexes[activeOption]+delta+list.length)%list.length;
    renderAdvice();
  };

  const launchButton=root.querySelector('[data-hotline-launch]');
  if(launchButton){
    launchButton.addEventListener('click',event=>{
      event.preventDefault();
      const target=optionsPanel||adviceCard;
      if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
      if(adviceCard){
        adviceCard.classList.remove('is-ringing-target');
        requestAnimationFrame(()=>adviceCard.classList.add('is-ringing-target'));
        setTimeout(()=>adviceCard.classList.remove('is-ringing-target'),1300);
      }
    });
  }

  root.querySelectorAll('[data-hotline-option]').forEach(button=>button.addEventListener('click',()=>chooseOption(Number(button.dataset.hotlineOption)||1)));
  root.querySelectorAll('[data-hotline-poster-option]').forEach(button=>button.addEventListener('click',()=>chooseOption(Number(button.dataset.hotlinePosterOption)||1)));
  root.querySelectorAll('[data-hotline-cycle]').forEach(button=>button.addEventListener('click',()=>step(Number(button.dataset.hotlineCycle)||1)));

  renderCopy();
  startWelcomeRotation();
  startPressRotation();

  fetch('/api/hotline-content',{headers:{accept:'application/json'},cache:'no-store'})
    .then(response=>response.ok?response.json():Promise.reject(new Error('Unable to load hotline content.')))
    .then(result=>{
      const remote=result?.content?.[lang];
      if(!remote)return;
      content={...defaults,...remote};
      const hint=root.querySelector('[data-hotline-admin-hint]');
      if(hint)hint.hidden=result.source!=='admin';
      renderCopy();
      if(hasChosenOption)renderAdvice();else{startWelcomeRotation();startPressRotation();}
    })
    .catch(()=>{
      const hint=root.querySelector('[data-hotline-admin-hint]');
      if(hint)hint.hidden=true;
    });

  window.addEventListener('pagehide',()=>{stopWelcomeRotation();stopPressRotation();},{once:true});
})();
