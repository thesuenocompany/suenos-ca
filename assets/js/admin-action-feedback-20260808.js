(()=>{
  const originalFetch=window.fetch.bind(window);
  let currentAction=null;
  const tracked=new Map();
  const isActionButton=button=>{
    if(!button||button.dataset.noBusy==='1')return false;
    const text=(button.textContent||'').trim().toLowerCase();
    const id=(button.id||'').toLowerCase();
    return /(^|\s)(save|upload|replace)(\s|$)/.test(text)||id.includes('save')||id.includes('upload')||button.hasAttribute('data-social-upload');
  };
  const start=button=>{
    if(!button||button.classList.contains('is-admin-busy'))return;
    const original=button.dataset.busyOriginal||button.textContent.trim();
    button.dataset.busyOriginal=original;
    button.classList.add('is-admin-busy');
    button.setAttribute('aria-busy','true');
    currentAction={button,started:Date.now(),requests:0,windowUntil:Date.now()+1500};
    tracked.set(button,{requests:0,started:Date.now()});
  };
  const finish=button=>{
    if(!button)return;
    const state=tracked.get(button);
    const elapsed=Date.now()-(state?.started||Date.now());
    const wait=Math.max(0,450-elapsed);
    setTimeout(()=>{
      button.classList.remove('is-admin-busy');
      button.removeAttribute('aria-busy');
      tracked.delete(button);
      if(currentAction?.button===button)currentAction=null;
    },wait);
  };
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!isActionButton(button)||button.disabled)return;
    start(button);
    setTimeout(()=>{
      const state=tracked.get(button);
      if(state&&state.requests===0)finish(button);
    },900);
  },true);
  window.fetch=(...args)=>{
    const action=currentAction&&Date.now()<=currentAction.windowUntil?currentAction:null;
    if(action){
      const state=tracked.get(action.button)||{requests:0,started:Date.now()};
      state.requests++;
      tracked.set(action.button,state);
    }
    const promise=originalFetch(...args);
    if(action){
      promise.finally(()=>{
        const state=tracked.get(action.button);
        if(!state)return;
        state.requests=Math.max(0,state.requests-1);
        if(state.requests===0)finish(action.button);
      });
    }
    return promise;
  };
})();
