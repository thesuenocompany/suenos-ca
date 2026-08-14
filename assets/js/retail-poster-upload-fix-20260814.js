(()=>{
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const SAFE_BYTES=Math.floor(3.8*1024*1024);
  const REOPEN_KEY='suenos-reopen-11x17-after-upload';
  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const mb=bytes=>`${(bytes/1024/1024).toFixed(1)} MB`;
  const $=id=>document.getElementById(id);

  function status(message,error=false){
    const el=$('retail-print-11x17-status');
    if(!el)return;
    el.textContent=message||'';
    el.classList.toggle('is-error',Boolean(error));
  }

  async function decodeImage(file){
    if(typeof createImageBitmap==='function'){
      const bitmap=await createImageBitmap(file);
      return{source:bitmap,width:bitmap.width,height:bitmap.height,cleanup:()=>bitmap.close?.()};
    }
    const url=URL.createObjectURL(file);
    try{
      const image=await new Promise((resolve,reject)=>{
        const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('The JPG could not be read in the browser.'));img.src=url;
      });
      return{source:image,width:image.naturalWidth,height:image.naturalHeight,cleanup:()=>URL.revokeObjectURL(url)};
    }catch(error){URL.revokeObjectURL(url);throw error;}
  }

  function encodeJpeg(source,width,height,quality){
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw new Error('Your browser could not prepare the poster image.');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(source,0,0,width,height);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('The poster could not be compressed.')),'image/jpeg',quality));
  }

  async function preparePoster(file){
    if(file.size<=SAFE_BYTES)return{blob:file,changed:false,width:0,height:0};
    status(`Optimizing ${mb(file.size)} poster for upload…`);
    const decoded=await decodeImage(file);
    try{
      let width=decoded.width,height=decoded.height;
      const portrait=height>=width;
      const maxWidth=portrait?3300:5100;
      const maxHeight=portrait?5100:3300;
      const scale=Math.min(1,maxWidth/width,maxHeight/height);
      width=Math.max(1,Math.round(width*scale));
      height=Math.max(1,Math.round(height*scale));

      let blob=null;
      for(const quality of [.92,.88,.84,.80,.76,.72,.68,.64,.60]){
        blob=await encodeJpeg(decoded.source,width,height,quality);
        if(blob.size<=SAFE_BYTES)break;
      }
      let passes=0;
      while(blob&&blob.size>SAFE_BYTES&&passes<5){
        const shrink=Math.min(.92,Math.max(.76,Math.sqrt(SAFE_BYTES/blob.size)*.94));
        width=Math.max(1200,Math.round(width*shrink));
        height=Math.max(1200,Math.round(height*shrink));
        blob=await encodeJpeg(decoded.source,width,height,.72);
        passes++;
      }
      if(!blob||blob.size>SAFE_BYTES)throw new Error(`This poster is still too large after optimization (${mb(blob?.size||file.size)}). Export it as a JPG under 4 MB and try again.`);
      return{blob,changed:true,width,height};
    }finally{decoded.cleanup?.();}
  }

  async function parseResponse(response){
    const text=await response.text();
    let data={};
    try{data=text?JSON.parse(text):{};}catch{}
    if(response.ok)return data;
    if(response.status===413)throw new Error('The poster is larger than Netlify can accept in one upload. Admin will optimize JPGs automatically, but this file is still too large.');
    if(response.status===401)throw new Error('Admin session expired. Log in again, then retry the poster upload.');
    throw new Error(data.message||`Poster upload failed (${response.status}).`);
  }

  async function upload11x17(button){
    const id=$('contest-id')?.value||'';
    const master=$('contest-type')?.value==='retail'&&Boolean($('contest-retail-master')?.checked);
    if(!master)throw new Error('Open the retail master campaign to upload the 11 × 17 poster.');
    if(!id)throw new Error('Save the master campaign before uploading the poster.');
    const file=$('retail-print-11x17-file')?.files?.[0];
    if(!file)throw new Error('Choose an 11 × 17 JPG first.');
    if(file.type!=='image/jpeg'&&!/\.jpe?g$/i.test(file.name))throw new Error('Upload a JPG file.');

    const original=button.textContent;
    button.disabled=true;
    try{
      const prepared=await preparePoster(file);
      button.textContent='Uploading…';
      status(prepared.changed?`Uploading optimized ${mb(prepared.blob.size)} JPG${prepared.width?` (${prepared.width} × ${prepared.height}px)`:''}…`:`Uploading ${mb(file.size)} JPG…`);
      const upload=await fetch('/api/contest-assets',{
        method:'POST',
        headers:{authorization:`Bearer ${token()}`,'content-type':'image/jpeg'},
        body:prepared.blob
      });
      const uploaded=await parseResponse(upload);
      if(!uploaded.url)throw new Error('The upload completed but did not return a poster URL.');

      button.textContent='Saving…';
      status('Poster uploaded. Saving it to the master campaign…');
      const save=await fetch(`/api/contest-print-11x17?id=${encodeURIComponent(id)}`,{
        method:'POST',
        headers:{authorization:`Bearer ${token()}`,'content-type':'application/json'},
        body:JSON.stringify({posterUrl:uploaded.url,posterName:file.name,qrBox:null}),
        cache:'no-store'
      });
      await parseResponse(save);
      status('11 × 17 poster saved. Reopening the editor so you can place the QR box…');
      sessionStorage.setItem('suenos-open-contest-after-reload',id);
      sessionStorage.setItem(REOPEN_KEY,id);
      setTimeout(()=>location.reload(),350);
    }catch(error){
      status(error.message||'Poster upload failed.',true);
      button.disabled=false;button.textContent=original;
    }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('#retail-print-11x17-upload');
    if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    upload11x17(button);
  },true);

  const reopenId=sessionStorage.getItem(REOPEN_KEY);
  if(reopenId){
    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      const current=$('contest-id')?.value||'';
      const button=$('retail-poster-open-11x17');
      if(current===reopenId&&button&&!button.disabled){
        clearInterval(timer);sessionStorage.removeItem(REOPEN_KEY);button.click();
      }else if(attempts>100){clearInterval(timer);sessionStorage.removeItem(REOPEN_KEY);}
    },120);
  }

  document.addEventListener('click',event=>{
    if(!event.target.closest('#retail-poster-open-11x17'))return;
    setTimeout(()=>{
      const note=document.querySelector('label[for="retail-print-11x17-file"] + input + small, #retail-print-11x17-file + small');
      if(note)note.textContent='JPG only. Large files are automatically optimized to fit Netlify’s upload limit while preserving print quality.';
    },250);
  });
})();