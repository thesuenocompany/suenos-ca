(function(){
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const gate=document.getElementById('admin-gate');
  const panel=document.getElementById('admin-panel');
  if(!gate||!panel)return;

  const loginStatus=document.getElementById('admin-status');
  const liveStatus=document.getElementById('admin-status-live');
  const loginButton=document.getElementById('admin-login');
  const passwordInput=document.getElementById('admin-password');
  const saveButton=document.getElementById('admin-save');
  const resetButton=document.getElementById('admin-reset');
  const exportButton=document.getElementById('admin-export');
  const logoutButton=document.getElementById('admin-logout');
  const defaults=window.SuenosHotlineDefaults||{};
  const loadAdminShell=()=>{};

  const fields={};
  ['en','es'].forEach(lang=>{
    fields[lang]={
      title:document.getElementById(`title-${lang}`),kicker:document.getElementById(`kicker-${lang}`),subtitle:document.getElementById(`subtitle-${lang}`),intro:document.getElementById(`intro-${lang}`),
      p1:document.getElementById(`prompt1-${lang}`),p2:document.getElementById(`prompt2-${lang}`),p3:document.getElementById(`prompt3-${lang}`),
      welcome:document.getElementById(`welcome-${lang}`),
      r1:document.getElementById(`responses1-${lang}`),r2:document.getElementById(`responses2-${lang}`),r3:document.getElementById(`responses3-${lang}`)
    };
  });
  let currentContent=structuredClone(defaults);

  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const setBusy=(button,busy,label)=>{
    if(!button)return;
    if(busy){button.dataset.originalText=button.textContent;button.textContent=label;button.disabled=true;}
    else{button.textContent=button.dataset.originalText||button.textContent;button.disabled=false;}
  };
  const showLogin=message=>{
    document.body.classList.add('admin-login-mode');
    sessionStorage.removeItem(TOKEN_KEY);panel.hidden=true;gate.hidden=false;
    if(message)loginStatus.textContent=message;
    passwordInput.focus();
  };
  const showPanel=()=>{document.body.classList.remove('admin-login-mode');gate.hidden=true;panel.hidden=false;loginStatus.textContent='';loadAdminShell();document.dispatchEvent(new CustomEvent('suenos:admin-authenticated'));};
  const lines=value=>Array.isArray(value)?value:[];
  const sourceGroup=(source,key)=>lines(source[key]).length?lines(source[key]):lines(source.advice);

  const hydrate=content=>{
    currentContent={en:{...(defaults.en||{}),...(content?.en||{})},es:{...(defaults.es||{}),...(content?.es||{})}};
    ['en','es'].forEach(lang=>{
      const source=currentContent[lang];
      fields[lang].title.value=source.title||'';
      fields[lang].kicker.value=source.kicker||'';
      fields[lang].subtitle.value=source.subtitle||'';
      fields[lang].intro.value=source.intro||'';
      fields[lang].welcome.value=sourceGroup(source,'welcomeMessages').join('\n');
      const welcomeCount=document.getElementById(`count-${lang}-welcome`);
      if(welcomeCount)welcomeCount.textContent=`${sourceGroup(source,'welcomeMessages').length} messages`;
      fields[lang].p1.value=source.prompt1||'';
      fields[lang].p2.value=source.prompt2||'';
      fields[lang].p3.value=source.prompt3||'';
      fields[lang].r1.value=sourceGroup(source,'responses1').join('\n');
      fields[lang].r2.value=sourceGroup(source,'responses2').join('\n');
      fields[lang].r3.value=sourceGroup(source,'responses3').join('\n');
      for(let option=1;option<=3;option++){
        const count=document.getElementById(`count-${lang}-${option}`);
        if(count)count.textContent=`${sourceGroup(source,`responses${option}`).length} responses`;
      }
    });
  };

  const parse=text=>text.split(/\n+/).map(item=>item.trim()).filter(Boolean);
  const collect=()=>{
    const output={};
    ['en','es'].forEach(lang=>{
      const fallback=defaults[lang]||{};
      output[lang]={
        title:fields[lang].title.value.trim(),kicker:fields[lang].kicker.value.trim(),subtitle:fields[lang].subtitle.value.trim(),intro:fields[lang].intro.value.trim(),
        prompt1:fields[lang].p1.value.trim(),prompt2:fields[lang].p2.value.trim(),prompt3:fields[lang].p3.value.trim(),
        adviceLabel:fallback.adviceLabel,callLabel:fallback.callLabel,callNote:fallback.callNote,nextLabel:fallback.nextLabel,welcomeLabel:fallback.welcomeLabel,
        welcomeMessages:parse(fields[lang].welcome.value),responses1:parse(fields[lang].r1.value),responses2:parse(fields[lang].r2.value),responses3:parse(fields[lang].r3.value)
      };
    });
    return output;
  };

  const request=async(url,options={})=>{
    const response=await fetch(url,{...options,headers:{accept:'application/json',...(options.body?{'content-type':'application/json'}:{}),...(options.headers||{})},cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){const error=new Error(result.message||'The request failed.');error.status=response.status;throw error;}
    return result;
  };
  const loadContent=async()=>{
    const result=await request('/api/hotline-content');
    hydrate(result.content||defaults);
    liveStatus.textContent=result.updatedAt?`Live content loaded. Last updated ${new Date(result.updatedAt).toLocaleString()}.`:'Default content loaded. No live edits have been saved yet.';
  };
  const login=async()=>{
    setBusy(loginButton,true,'Checking…');loginStatus.textContent='';
    try{const result=await request('/api/hotline-auth',{method:'POST',body:JSON.stringify({password:passwordInput.value})});sessionStorage.setItem(TOKEN_KEY,result.token);passwordInput.value='';showPanel();await loadContent();}
    catch(error){loginStatus.textContent=error.message;}
    finally{setBusy(loginButton,false);}
  };
  loginButton.addEventListener('click',login);
  passwordInput.addEventListener('keydown',event=>{if(event.key==='Enter')login();});
  saveButton.addEventListener('click',async()=>{
    setBusy(saveButton,true,'Saving…');liveStatus.textContent='';
    try{const content=collect();const result=await request('/api/hotline-content',{method:'PUT',headers:{authorization:`Bearer ${token()}`},body:JSON.stringify({content})});hydrate(result.content);liveStatus.textContent=`Saved the welcome messages and all three response banks for every visitor at ${new Date(result.updatedAt).toLocaleString()}.`;}
    catch(error){if(error.status===401)showLogin(error.message);else liveStatus.textContent=error.message;}
    finally{setBusy(saveButton,false);}
  });
  resetButton.addEventListener('click',async()=>{
    if(!confirm('Reset the live welcome messages and all three response banks to the original Sueños content?'))return;
    setBusy(resetButton,true,'Resetting…');
    try{const result=await request('/api/hotline-content',{method:'DELETE',headers:{authorization:`Bearer ${token()}`}});hydrate(result.content||defaults);liveStatus.textContent='Live content reset to the original defaults.';}
    catch(error){if(error.status===401)showLogin(error.message);else liveStatus.textContent=error.message;}
    finally{setBusy(resetButton,false);}
  });
  exportButton.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='suenos-don-terry-hotline-content.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),300);liveStatus.textContent='Exported the welcome messages and all three response banks as JSON.';
  });
  logoutButton.addEventListener('click',()=>showLogin('Logged out.'));
  document.body.classList.toggle('admin-login-mode',!token());
  if(token()){showPanel();loadContent().catch(error=>{liveStatus.textContent=error.message;if(error.status===401)showLogin(error.message);});}
})();
