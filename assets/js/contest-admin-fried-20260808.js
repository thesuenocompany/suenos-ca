(()=>{
const TOKEN_KEY='suenos-hotline-admin-token-v3';
const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
const $=id=>document.getElementById(id);
const slugify=v=>String(v||'retailer').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'retailer';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number(v)||0));
const ensureFour=items=>Array.from({length:4},(_,i)=>{const x=Array.isArray(items)?items[i]:null;return{x:String(x?.url||''),name:String(x?.name||`social-${i+1}`),box:x?.box?{x:clamp(x.box.x),y:clamp(x.box.y),width:clamp(x.box.width,.03,1),height:clamp(x.box.height,.03,1)}:null}});
async function api(action,id){const r=await fetch(`/api/contest-admin?action=${encodeURIComponent(action)}&id=${encodeURIComponent(id)}`,{headers:{authorization:`Bearer ${token()}`},cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Request failed.');return d;}
function status(msg,error=false){const s=$('contest-admin-status');if(s){s.textContent=msg;s.classList.toggle('is-error',error)}}
async function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Campaign image could not be loaded.'));img.src=`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`;});}
function avgLuminance(ctx,x,y,w,h){try{const data=ctx.getImageData(Math.max(0,x),Math.max(0,y),Math.max(1,w),Math.max(1,h)).data;let sum=0,count=0,step=Math.max(4,Math.floor(data.length/2500/4)*4);for(let i=0;i<data.length;i+=step){sum+=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);count++;}return count?sum/count:128}catch{return 128}}
async function drawName(ctx,name,x,y,w,h){name=String(name||'RETAILER').toUpperCase();const lum=avgLuminance(ctx,Math.floor(x),Math.floor(y),Math.floor(w),Math.floor(h));const fill=lum>145?'#111111':'#FFFFFF',stroke=lum>145?'rgba(255,255,255,.6)':'rgba(0,0,0,.55)';let size=Math.max(18,Math.floor(Math.min(h*.48,w/Math.max(5,name.length)*1.65)));ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${size}px Arial, Helvetica, sans-serif`;while(ctx.measureText(name).width>w*.9&&size>14){size-=2;ctx.font=`900 ${size}px Arial, Helvetica, sans-serif`;}ctx.lineWidth=Math.max(2,size*.08);ctx.strokeStyle=stroke;ctx.fillStyle=fill;ctx.strokeText(name,x+w/2,y+h/2,w*.92);ctx.fillText(name,x+w/2,y+h/2,w*.92);ctx.restore();}
async function renderCreative(conf,index){const creatives=ensureFour(conf.creatives),c=creatives[index];if(!c.url)throw new Error(`Social creative ${index+1} has not been uploaded on the master.`);if(!c.box)throw new Error(`Social creative ${index+1} still needs its retailer placement box on the master.`);const base=await loadImage(c.url),canvas=document.createElement('canvas');canvas.width=base.naturalWidth;canvas.height=base.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(base,0,0);const b=c.box,x=b.x*canvas.width,y=b.y*canvas.height,w=b.width*canvas.width,h=b.height*canvas.height,logoUrl=conf.request_retailer_logo_url||'';if(logoUrl){try{const logo=await loadImage(logoUrl),pad=Math.max(6,Math.min(w,h)*.06),scale=Math.min((w-pad*2)/logo.naturalWidth,(h-pad*2)/logo.naturalHeight),dw=logo.naturalWidth*scale,dh=logo.naturalHeight*scale;ctx.drawImage(logo,x+(w-dw)/2,y+(h-dh)/2,dw,dh)}catch{await drawName(ctx,conf.request_retailer_name,x,y,w,h)}}else await drawName(ctx,conf.request_retailer_name,x,y,w,h);return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not render social file.')),'image/png',1));}
function saveBlob(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200)}
function crcTable(){const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t}const CRCT=crcTable();function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRCT[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}function le16(v){return new Uint8Array([v&255,(v>>>8)&255])}function le32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255])}function concat(parts){const len=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length}return out}
async function makeZip(files){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const f of files){const name=enc.encode(f.name),data=new Uint8Array(await f.blob.arrayBuffer()),crc=crc32(data),local=concat([le32(0x04034b50),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name,data]);locals.push(local);const central=concat([le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]);centrals.push(central);offset+=local.length}const central=concat(centrals),end=concat([le32(0x06054b50),le16(0),le16(0),le16(files.length),le16(files.length),le32(central.length),le32(offset),le16(0)]);return new Blob([concat([...locals,central,end])],{type:'application/zip'})}
async function downloadSocial(id,index){status(`Building social creative ${index+1}…`);const d=await api('retail-social-config',id),conf=d.config||{},blob=await renderCreative(conf,index),creative=ensureFour(conf.creatives)[index],name=`suenos-${slugify(conf.request_retailer_name||conf.request_slug)}-${slugify(creative.name||`social-${index+1}`)}.png`;saveBlob(blob,name);status(`Social creative ${index+1} downloaded for ${conf.request_retailer_name||'retailer'}.`)}
async function downloadSocialZip(id){status('Building social pack…');const d=await api('retail-social-config',id),conf=d.config||{},files=[];for(let i=0;i<4;i++){const c=ensureFour(conf.creatives)[i];if(!c.url)continue;files.push({name:`suenos-${slugify(conf.request_retailer_name||conf.request_slug)}-${slugify(c.name||`social-${i+1}`)}.png`,blob:await renderCreative(conf,i)})}if(!files.length)throw new Error('No social creatives have been uploaded on the master yet.');saveBlob(await makeZip(files),`suenos-${slugify(conf.request_retailer_name||conf.request_slug)}-social-pack.zip`);status(`Social ZIP downloaded for ${conf.request_retailer_name||'retailer'}.`)}

function syncEditorContext(){const editor=$('contest-editor'),section=$('admin-section-contests');if(!editor||editor.hidden){section?.classList.remove('jf-editing');return}section?.classList.add('jf-editing');const type=$('contest-type')?.value,parentId=$('contest-retail-parent-id')?.value||'',master=$('contest-retail-master')?.checked,child=type==='retail'&&!master&&Boolean(parentId);editor.classList.toggle('jf-retail-child',child);let box=editor.querySelector('.jf-editor-context');if(!box){box=document.createElement('div');box.className='jf-editor-context';editor.querySelector(':scope > .admin-section-heading')?.insertAdjacentElement('afterend',box)}if(child){const retailer=$('contest-retailer-name')?.value||$('contest-internal')?.value||'Retailer';box.innerHTML=`<div><strong>Retailer page · ${retailer.replace(/[&<>]/g,'')}</strong><span>Only store-specific controls are shown here. Campaign creative and shared setup stay on the master.</span></div><button class="admin-btn admin-btn-secondary" type="button" data-jf-open-master="${parentId}">Open master campaign</button>`;setTimeout(()=>editor.querySelector('.ce-step-button[data-step="retail"]')?.click(),0)}else if(type==='retail'&&master){box.innerHTML='<div><strong>Retail master campaign</strong><span>Shared creative, receipt settings, poster, social files and retailer creation live here once.</span></div>'}else{box.innerHTML='<div><strong>Contest setup</strong><span>Shared contest settings and public page.</span></div>'}}

document.addEventListener('click',e=>{
  const one=e.target.closest('[data-card-social]');if(one){const id=one.dataset.cardSocial,index=Number(one.dataset.socialIndex);one.disabled=true;downloadSocial(id,index).catch(err=>status(err.message,true)).finally(()=>one.disabled=false);return}
  const zip=e.target.closest('[data-card-social-zip]');if(zip){const id=zip.dataset.cardSocialZip;zip.disabled=true;const old=zip.textContent;zip.textContent='Building…';downloadSocialZip(id).catch(err=>status(err.message,true)).finally(()=>{zip.disabled=false;zip.textContent=old});return}
  const master=e.target.closest('[data-jf-open-master]');if(master){const b=document.querySelector(`#contest-admin-list [data-edit="${CSS.escape(master.dataset.jfOpenMaster)}"]`);b?.click();setTimeout(syncEditorContext,20);return}
  if(e.target.closest('[data-edit],#contest-add'))setTimeout(syncEditorContext,20);
  if(e.target.closest('#contest-editor-close'))setTimeout(syncEditorContext,20);
});
document.addEventListener('change',e=>{if(e.target.matches('#contest-type,#contest-retail-master'))setTimeout(syncEditorContext,0)});
document.addEventListener('suenos:admin-section',e=>{if(e.detail?.section==='contests')setTimeout(syncEditorContext,20)});
})();

;(()=>{
  function forceRetailEditorOpen(){
    const editor=document.getElementById('contest-editor');
    if(!editor||editor.hidden)return;
    const type=document.getElementById('contest-type')?.value;
    const master=document.getElementById('contest-retail-master')?.checked;
    const parent=document.getElementById('contest-retail-parent-id')?.value||'';
    if(type==='retail'&&!master&&parent){
      editor.classList.add('jf-retail-child');
      const retail=editor.querySelector('.ce-step-panel[data-step-panel="retail"]');
      const timing=editor.querySelector('.ce-step-panel[data-step-panel="timing"]');
      retail?.classList.add('is-active');
      timing?.classList.add('is-active');
      editor.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('#contest-admin-list [data-edit]')){
      setTimeout(forceRetailEditorOpen,40);
      setTimeout(forceRetailEditorOpen,180);
    }
  });
})();
