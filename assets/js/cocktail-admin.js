(function(){
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const recipeSection=document.getElementById('admin-section-recipes');
  const list=document.getElementById('recipe-list');
  const status=document.getElementById('recipe-status');
  const editor=document.getElementById('recipe-editor');
  if(!recipeSection||!list||!status||!editor)return;

  const addButton=document.getElementById('recipe-add');
  const saveLiveButton=document.getElementById('recipe-save-live');
  const resetButton=document.getElementById('recipe-reset');
  const exportButton=document.getElementById('recipe-export');
  const applyButton=document.getElementById('recipe-apply');
  const cancelButton=document.getElementById('recipe-cancel');
  const closeButton=document.getElementById('recipe-editor-close');
  const deleteEditorButton=document.getElementById('recipe-delete-editor');
  const editorTitle=document.getElementById('recipe-editor-title');
  const editorStatus=document.getElementById('recipe-editor-status');
  const slugInput=document.getElementById('recipe-slug');
  const publishedInput=document.getElementById('recipe-published');
  const imageInput=document.getElementById('recipe-image');
  const imageFile=document.getElementById('recipe-image-file');
  const imageUpload=document.getElementById('recipe-image-upload');
  const imagePreview=document.getElementById('recipe-image-preview');

  const localeFields={};
  const editableKeys=['name','cardSummary','tagline','intro','glassware','difficulty','time','garnish','serves','ingredients','steps','tip','pageTitle','metaDescription'];
  ['en','es'].forEach(lang=>{
    localeFields[lang]={};
    editableKeys.forEach(key=>localeFields[lang][key]=document.getElementById(`recipe-${lang}-${key}`));
  });

  let content={version:1,recipes:[]};
  let loaded=false;
  let dirty=false;
  let editorIndex=null;
  let editorBase=null;
  let slugTouched=false;

  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  const setBusy=(button,busy,label)=>{
    if(!button)return;
    if(busy){button.dataset.originalText=button.textContent;button.textContent=label;button.disabled=true;}
    else{button.textContent=button.dataset.originalText||button.textContent;button.disabled=false;}
  };
  const parseLines=value=>String(value||'').split(/\n+/).map(item=>item.trim()).filter(Boolean);
  const slugify=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80);
  const today=()=>new Date().toISOString().slice(0,10);

  const request=async(url,options={})=>{
    const response=await fetch(url,{...options,headers:{accept:'application/json',...(options.body&&!(options.body instanceof FormData)?{'content-type':'application/json'}:{}),...(options.headers||{})},cache:'no-store'});
    const result=await response.json().catch(()=>({}));
    if(!response.ok){const error=new Error(result.message||'The request failed.');error.status=response.status;throw error;}
    return result;
  };

  const handleError=(error,target=status)=>{
    target.textContent=error.message||'The request failed.';
    if(error.status===401)document.getElementById('admin-logout')?.click();
  };

  const setTab=name=>{
    document.querySelectorAll('[data-admin-tab]').forEach(button=>{
      const active=button.dataset.adminTab===name;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-selected',String(active));
    });
    document.querySelectorAll('[data-admin-section]').forEach(section=>section.hidden=section.dataset.adminSection!==name);
    if(name==='recipes'&&!loaded)loadRecipes();
  };
  document.querySelectorAll('[data-admin-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.adminTab)));

  const defaultLocale=lang=>({
    name:'',cardSummary:'',cardEyebrow:'',cardExtraLabel:'',pageTitle:'',metaDescription:'',
    eyebrow:lang==='es'?'Cóctel de Tequila':'Tequila Cocktail',tagline:'',intro:'',glassware:'',difficulty:lang==='es'?'Fácil':'Easy',time:lang==='es'?'3 minutos':'3 minutes',garnish:'',serves:lang==='es'?'1 cóctel':'1 cocktail',ingredients:[],steps:[],tip:'',imageAlt:'',lastReviewed:today(),extraActionLabel:'',extraActionHref:''
  });
  const blankRecipe=()=>({slug:'',published:true,system:false,order:content.recipes.length,image:'',en:defaultLocale('en'),es:defaultLocale('es')});

  const previewImage=()=>{
    const src=imageInput.value.trim();
    if(!src){imagePreview.hidden=true;imagePreview.removeAttribute('src');return;}
    imagePreview.src=src;
    imagePreview.hidden=false;
  };
  imageInput.addEventListener('input',previewImage);
  imagePreview.addEventListener('error',()=>{imagePreview.hidden=true;});

  const makeButton=(label,action,index,title='')=>{
    const button=document.createElement('button');
    button.type='button';button.className='admin-mini-btn';button.textContent=label;button.dataset.action=action;button.dataset.index=String(index);
    if(title)button.title=title;
    return button;
  };

  const renderList=()=>{
    list.replaceChildren();
    if(!content.recipes.length){
      const empty=document.createElement('div');empty.className='admin-note';empty.textContent='No cocktail recipes are currently configured.';list.append(empty);return;
    }
    content.recipes.forEach((recipe,index)=>{
      const row=document.createElement('article');
      row.className=`admin-recipe-row${recipe.published?'':' is-unpublished'}`;
      const image=document.createElement('img');image.className='admin-recipe-thumb';image.src=recipe.image;image.alt='';image.loading='lazy';
      const info=document.createElement('div');info.className='admin-recipe-info';
      const name=document.createElement('strong');name.textContent=recipe.en?.name||recipe.slug;
      const spanish=document.createElement('small');spanish.textContent=`${recipe.es?.name||'Spanish name missing'} · /${recipe.slug}/`;
      const state=document.createElement('span');state.className='admin-recipe-state';state.textContent=recipe.published?'Published':'Hidden';
      info.append(name,spanish,state);
      const actions=document.createElement('div');actions.className='admin-recipe-row-actions';
      actions.append(
        makeButton('Edit','edit',index),
        makeButton('↑','up',index,'Move up'),
        makeButton('↓','down',index,'Move down'),
        makeButton('Remove','remove',index)
      );
      row.append(image,info,actions);list.append(row);
    });
  };

  const setField=(field,value)=>{if(field)field.value=Array.isArray(value)?value.join('\n'):(value??'');};
  const openEditor=(index=null)=>{
    editorIndex=Number.isInteger(index)?index:null;
    editorBase=clone(editorIndex===null?blankRecipe():content.recipes[editorIndex]);
    slugTouched=editorIndex!==null;
    editorTitle.textContent=editorIndex===null?'Add Cocktail Recipe':`Edit ${editorBase.en?.name||editorBase.slug}`;
    slugInput.value=editorBase.slug||'';
    slugInput.readOnly=!!editorBase.system;
    publishedInput.checked=editorBase.published!==false;
    imageInput.value=editorBase.image||'';
    imageFile.value='';
    ['en','es'].forEach(lang=>editableKeys.forEach(key=>setField(localeFields[lang][key],editorBase[lang]?.[key])));
    editorStatus.textContent=editorBase.system?'This recipe’s URL slug is locked to preserve its existing public URL.':'';
    deleteEditorButton.hidden=editorIndex===null;
    editor.hidden=false;
    previewImage();
    editor.scrollIntoView({behavior:'smooth',block:'start'});
    localeFields.en.name.focus();
  };

  const closeEditor=()=>{
    editor.hidden=true;editorIndex=null;editorBase=null;editorStatus.textContent='';
  };

  slugInput.addEventListener('input',()=>{slugTouched=true;});
  localeFields.en.name.addEventListener('input',()=>{
    if(editorIndex===null&&!slugTouched)slugInput.value=slugify(localeFields.en.name.value);
  });

  const collectEditor=()=>{
    const recipe=clone(editorBase||blankRecipe());
    recipe.slug=slugInput.value.trim().toLowerCase();
    recipe.published=publishedInput.checked;
    recipe.image=imageInput.value.trim();
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(recipe.slug))throw new Error('Use a lowercase URL slug containing only letters, numbers and hyphens.');
    const duplicate=content.recipes.some((item,index)=>item.slug===recipe.slug&&index!==editorIndex);
    if(duplicate)throw new Error('That URL slug is already used by another recipe.');
    if(!recipe.image)throw new Error('Choose or upload a cocktail image.');

    ['en','es'].forEach(lang=>{
      const source={...(recipe[lang]||defaultLocale(lang))};
      editableKeys.forEach(key=>{
        const value=localeFields[lang][key]?.value||'';
        source[key]=(key==='ingredients'||key==='steps')?parseLines(value):value.trim();
      });
      if(!source.name)throw new Error(`${lang==='en'?'English':'Spanish'} recipe name is required.`);
      if(!source.intro)throw new Error(`${source.name} needs an introduction.`);
      if(!source.ingredients.length)throw new Error(`${source.name} needs at least one ingredient.`);
      if(!source.steps.length)throw new Error(`${source.name} needs at least one instruction step.`);
      source.imageAlt=source.imageAlt||source.name;
      source.eyebrow=source.eyebrow||(lang==='es'?'Cóctel de Tequila':'Tequila Cocktail');
      source.lastReviewed=today();
      source.pageTitle=source.pageTitle||`${source.name} | Sueños Tequila`;
      source.metaDescription=source.metaDescription||source.intro;
      recipe[lang]=source;
    });
    return recipe;
  };

  applyButton.addEventListener('click',()=>{
    editorStatus.textContent='';
    try{
      const recipe=collectEditor();
      if(editorIndex===null)content.recipes.push(recipe);else content.recipes[editorIndex]=recipe;
      content.recipes.forEach((item,index)=>item.order=index);
      dirty=true;renderList();closeEditor();status.textContent='Draft updated. Select “Save Recipes Live” to publish it.';
    }catch(error){editorStatus.textContent=error.message;}
  });
  [cancelButton,closeButton].forEach(button=>button.addEventListener('click',closeEditor));

  const removeRecipe=index=>{
    const recipe=content.recipes[index];
    if(!recipe)return;
    if(!confirm(`Remove “${recipe.en?.name||recipe.slug}” from the cocktail collection? This takes effect after you save recipes live.`))return;
    content.recipes.splice(index,1);content.recipes.forEach((item,i)=>item.order=i);dirty=true;renderList();
    if(editorIndex===index)closeEditor();
    status.textContent='Recipe removed from the draft. Save recipes live to publish the removal.';
  };
  deleteEditorButton.addEventListener('click',()=>{if(editorIndex!==null)removeRecipe(editorIndex);});

  list.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button)return;
    const index=Number(button.dataset.index);const action=button.dataset.action;
    if(action==='edit')openEditor(index);
    if(action==='remove')removeRecipe(index);
    if(action==='up'&&index>0){[content.recipes[index-1],content.recipes[index]]=[content.recipes[index],content.recipes[index-1]];dirty=true;renderList();status.textContent='Recipe order updated in the draft.';}
    if(action==='down'&&index<content.recipes.length-1){[content.recipes[index+1],content.recipes[index]]=[content.recipes[index],content.recipes[index+1]];dirty=true;renderList();status.textContent='Recipe order updated in the draft.';}
  });

  const hydrate=result=>{
    content=clone(result.content||{version:1,recipes:[]});
    content.recipes=(content.recipes||[]).sort((a,b)=>(a.order||0)-(b.order||0));
    dirty=false;loaded=true;renderList();
    status.textContent=result.updatedAt?`Live recipes loaded. Last updated ${new Date(result.updatedAt).toLocaleString()}.`:'Default recipes loaded. No live recipe edits have been saved yet.';
  };

  const loadRecipes=async()=>{
    status.textContent='Loading recipes…';
    try{hydrate(await request('/api/cocktail-recipes',{headers:{authorization:`Bearer ${token()}`}}));}
    catch(error){handleError(error);}
  };

  addButton.addEventListener('click',()=>openEditor(null));
  saveLiveButton.addEventListener('click',async()=>{
    if(!editor.hidden){status.textContent='Apply or cancel the open recipe editor before saving live.';return;}
    setBusy(saveLiveButton,true,'Saving…');status.textContent='';
    try{
      const result=await request('/api/cocktail-recipes',{method:'PUT',headers:{authorization:`Bearer ${token()}`},body:JSON.stringify({content})});
      hydrate(result);status.textContent=`Recipes published for every visitor at ${new Date(result.updatedAt).toLocaleString()}.`;
    }catch(error){handleError(error);}finally{setBusy(saveLiveButton,false);}
  });
  resetButton.addEventListener('click',async()=>{
    if(!confirm('Reset every cocktail recipe to the original deployed collection? This removes all added recipes and restores deleted recipes.'))return;
    setBusy(resetButton,true,'Resetting…');
    try{hydrate(await request('/api/cocktail-recipes',{method:'DELETE',headers:{authorization:`Bearer ${token()}`}}));status.textContent='Cocktail recipes reset to the original collection.';closeEditor();}
    catch(error){handleError(error);}finally{setBusy(resetButton,false);}
  });
  exportButton.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(content,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download='suenos-cocktail-recipes.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),300);status.textContent='Exported the current recipe draft as JSON.';
  });

  imageUpload.addEventListener('click',async()=>{
    const file=imageFile.files?.[0];
    if(!file){editorStatus.textContent='Choose a JPG, PNG or WebP image first.';return;}
    setBusy(imageUpload,true,'Uploading…');editorStatus.textContent='';
    try{
      const form=new FormData();form.append('file',file);
      const result=await request('/api/cocktail-images',{method:'POST',headers:{authorization:`Bearer ${token()}`},body:form});
      imageInput.value=result.url;previewImage();editorStatus.textContent='Image uploaded. Apply the recipe changes, then save recipes live.';
    }catch(error){handleError(error,editorStatus);}finally{setBusy(imageUpload,false);}
  });

  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
})();
