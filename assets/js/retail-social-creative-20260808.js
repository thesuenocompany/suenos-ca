const TOKEN_KEY='suenos-hotline-admin-token-v3';
const $=id=>document.getElementById(id);
const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number(v)||0));
const slugify=v=>String(v||'retailer').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'retailer';
let activeId='';
let config={creatives:[],sourceContestId:'',sourceName:'',inherited:false,retailerName:'',retailerCode:'',retailerLogoUrl:'',slug:''};
let selected=0,drawStart=null,loadingId='';

async function api(action,{method='GET',body,id}={}){
  const contestId=id||$('contest-id')?.value||activeId;
  const r=await fetch(`/api/contest-admin?action=${encodeURIComponent(action)}&id=${encodeURIComponent(contestId)}`,{method,headers:{authorization:`Bearer ${token()}`,...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.message||'Request failed.');
  return d;
}
const isRetail=()=> $('contest-type')?.value==='retail';
const isMaster=()=>isRetail()&&Boolean($('contest-retail-master')?.checked);
const isChild=()=>isRetail()&&!Boolean($('contest-retail-master')?.checked);
const blankCreative=i=>({url:'',name:`Social creative ${i+1}`,box:null});
function normalizeCreative(item,i){return{url:String(item?.url||''),name:String(item?.name||`Social creative ${i+1}`),box:item?.box?{x:clamp(item.box.x),y:clamp(item.box.y),width:clamp(item.box.width,.03,1),height:clamp(item.box.height,.03,1)}:null};}
function ensureFour(items=[]){return Array.from({length:4},(_,i)=>normalizeCreative(items[i]||blankCreative(i),i));}
function setStatus(msg,error=false){const e=$('retail-social-status');if(!e)return;e.textContent=msg||'';e.classList.toggle('is-error',Boolean(error));}

function installPanel(){
 const settings=$('contest-retail-settings'); if(!settings||$('retail-social-designer'))return;
 const panel=document.createElement('section');panel.id='retail-social-designer';panel.className='retail-social-designer';panel.hidden=true;
 panel.innerHTML=`<div class="retail-social-heading"><div><h4 id="retail-social-title">Retail social creative pack</h4><p id="retail-social-description">Upload up to four social graphics on the master campaign, then draw the retailer-brand area on each one.</p></div><span class="retail-social-badge">Master-controlled</span></div>
 <div id="retail-social-master-controls">
   <div class="retail-social-slots" id="retail-social-slots"></div>
   <p class="admin-note">Select a creative, then drag a box over the exact area where the retailer logo or fallback retailer name should appear. The original artwork is never edited.</p>
 </div>
 <div id="retail-social-child-summary" class="retail-social-child-summary" hidden><strong>Inherited from retail master</strong><span id="retail-social-source-name"></span><p>The four base graphics and placement boxes are controlled by the master campaign. This retailer's logo or name is added only when files are generated.</p></div>
 <div class="retail-social-workspace" id="retail-social-workspace" hidden>
   <div class="retail-social-canvas-shell" id="retail-social-canvas-shell"><img id="retail-social-image" alt="Social creative preview"><div id="retail-social-selection" class="retail-social-selection" hidden><span>Retailer brand area</span></div></div>
   <div class="retail-social-readout" id="retail-social-readout"></div>
   <div class="admin-actions" id="retail-social-master-actions"><button class="admin-btn admin-btn-secondary" id="retail-social-clear" type="button">Clear Placement</button><button class="admin-btn admin-btn-primary" id="retail-social-save" type="button">Save Social Pack</button></div>
   <div class="retail-social-downloads" id="retail-social-downloads" hidden><h4>Download retailer social files</h4><p id="retail-social-retailer-label"></p><div class="admin-actions" id="retail-social-download-buttons"></div><button class="admin-btn admin-btn-primary" id="retail-social-download-zip" type="button">Download All 4 as ZIP</button></div>
 </div>
 <div class="admin-status retail-social-status" id="retail-social-status" role="status"></div>`;
 const print=$('retail-print-designer'); if(print)print.insertAdjacentElement('afterend',panel); else settings.appendChild(panel);
 bindPanel();renderSlots();
}

function renderSlots(){
 const target=$('retail-social-slots');if(!target)return;
 target.innerHTML=ensureFour(config.creatives).map((c,i)=>`<article class="retail-social-slot ${i===selected?'is-selected':''}" data-social-slot="${i}"><div class="retail-social-slot-preview">${c.url?`<img src="${c.url}" alt="Creative ${i+1}">`:`<span>${i+1}</span>`}</div><div><strong>Creative ${i+1}</strong><small>${c.url?(c.name||'Uploaded image'):'No image uploaded'}</small>${isMaster()?`<input type="file" accept="image/jpeg,image/png,image/webp" id="retail-social-file-${i}"><button class="admin-btn admin-btn-secondary" data-social-upload="${i}" type="button">${c.url?'Replace':'Upload'} Image</button>`:''}</div></article>`).join('');
}

function updatePanelVisibility(){
 const panel=$('retail-social-designer');if(!panel)return;
 const editor=$('contest-editor');panel.hidden=Boolean(editor?.hidden)||!isRetail();if(panel.hidden)return;
 $('retail-social-master-controls').hidden=!isMaster();$('retail-social-child-summary').hidden=!isChild();$('retail-social-master-actions').hidden=!isMaster();$('retail-social-downloads').hidden=!isChild();
 $('retail-social-title').textContent=isMaster()?'Master social creative pack':'Retailer social creative pack';
 $('retail-social-description').textContent=isMaster()?'Upload four finished social graphics and define one retailer-brand placement box on each.':'Generate this retailer’s four branded social graphics from the master artwork.';
 $('retail-social-source-name').textContent=config.sourceName||'Retail master';
 $('retail-social-retailer-label').textContent=config.retailerName?`Generating files for ${config.retailerName}.`:'';
 if(!($('contest-id')?.value||''))setStatus('Save the contest first.');
}

async function uploadCreative(index){
 if(!isMaster())throw new Error('Social artwork can only be uploaded on the retail master.');
 const input=$(`retail-social-file-${index}`),file=input?.files?.[0];if(!file)throw new Error('Choose an image first.');
 if(!/^image\/(jpeg|png|webp)$/.test(file.type))throw new Error('Use JPG, PNG or WebP.');
 if(file.size>12*1024*1024)throw new Error('Image exceeds the 12 MB limit.');
 setStatus(`Uploading creative ${index+1}…`);
 const r=await fetch('/api/contest-assets',{method:'POST',headers:{authorization:`Bearer ${token()}`,'content-type':file.type},body:file});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Upload failed.');
 config.creatives=ensureFour(config.creatives);config.creatives[index]={url:d.url,name:file.name,box:null};selected=index;renderSlots();await showSelected();await saveConfig(false);setStatus(`Creative ${index+1} uploaded. Draw its retailer-brand box, then save.`);
}

async function loadImage(url){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Image could not load.'));img.crossOrigin='anonymous';img.src=`${url}${url.includes('?')?'&':'?'}v=${Date.now()}`;});}
async function showSelected(){
 const c=ensureFour(config.creatives)[selected],workspace=$('retail-social-workspace'),img=$('retail-social-image'),shell=$('retail-social-canvas-shell');
 if(!c.url){workspace.hidden=true;return;}try{const source=await loadImage(c.url);img.src=source.src;shell.style.aspectRatio=`${source.naturalWidth}/${source.naturalHeight}`;workspace.hidden=false;setSelection(c.box);updateReadout(source);renderDownloads();}catch(e){workspace.hidden=true;setStatus(e.message,true);}
}
function setSelection(box){
 config.creatives=ensureFour(config.creatives);config.creatives[selected].box=box?{x:clamp(box.x),y:clamp(box.y),width:clamp(box.width,.03,1-clamp(box.x)),height:clamp(box.height,.03,1-clamp(box.y))}:null;
 const sel=$('retail-social-selection');if(!sel)return;const b=config.creatives[selected].box;if(!b){sel.hidden=true;return;}sel.hidden=false;sel.style.left=`${b.x*100}%`;sel.style.top=`${b.y*100}%`;sel.style.width=`${b.width*100}%`;sel.style.height=`${b.height*100}%`;
}
function updateReadout(image){const e=$('retail-social-readout');if(!e)return;const c=ensureFour(config.creatives)[selected],box=c.box;e.textContent=`Creative ${selected+1}: ${image?.naturalWidth||0} × ${image?.naturalHeight||0}px${box?' · retailer brand area set':' · draw retailer brand area'}`;}
function pointerPos(ev){const r=$('retail-social-canvas-shell').getBoundingClientRect();return{x:clamp((ev.clientX-r.left)/r.width),y:clamp((ev.clientY-r.top)/r.height)};}
function bindDrawing(){const shell=$('retail-social-canvas-shell');shell.addEventListener('pointerdown',e=>{if(!isMaster()||e.button!==0||!ensureFour(config.creatives)[selected].url)return;drawStart=pointerPos(e);shell.setPointerCapture(e.pointerId);setSelection({x:drawStart.x,y:drawStart.y,width:.03,height:.03});e.preventDefault();});shell.addEventListener('pointermove',e=>{if(!drawStart||!isMaster())return;const p=pointerPos(e),x=Math.min(drawStart.x,p.x),y=Math.min(drawStart.y,p.y);setSelection({x,y,width:Math.max(.03,Math.abs(p.x-drawStart.x)),height:Math.max(.03,Math.abs(p.y-drawStart.y))});});const done=e=>{if(!drawStart)return;drawStart=null;try{shell.releasePointerCapture(e.pointerId)}catch{}};shell.addEventListener('pointerup',done);shell.addEventListener('pointercancel',done);}
async function saveConfig(show=true){if(!isMaster())throw new Error('Edit social artwork on the retail master.');const d=await api('retail-social-config',{method:'POST',body:{creatives:ensureFour(config.creatives)}});applyConfig(d.config);if(show)setStatus('Master social creative pack saved. Retailer pages now inherit it.');}
function normalizeConfig(c={}){return{creatives:ensureFour(c.creatives||[]),sourceContestId:c.source_contest_id||'',sourceName:c.source_internal_name||'',inherited:Boolean(c.inherited),retailerName:c.request_retailer_name||$('contest-retailer-name')?.value||'',retailerCode:c.request_retailer_code||$('contest-retailer-code')?.value||'',retailerLogoUrl:c.request_retailer_logo_url||$('contest-retailer-logo')?.value||'',slug:c.request_slug||$('contest-slug')?.value||''};}
function applyConfig(c={}){config=normalizeConfig(c);renderSlots();}
async function loadConfig(id){if(!id||loadingId===id)return;loadingId=id;try{const d=await api('retail-social-config');applyConfig(d.config);selected=Math.min(selected,3);await showSelected();setStatus(isMaster()?'Upload images or select a creative to set its retailer-brand placement.':'Social pack inherited from the master. Download this retailer’s branded files below.');}catch(e){setStatus(e.message,true);}finally{loadingId='';}}

function avgLuminance(ctx,x,y,w,h){try{const data=ctx.getImageData(Math.max(0,x),Math.max(0,y),Math.max(1,w),Math.max(1,h)).data;let sum=0,count=0;for(let i=0;i<data.length;i+=Math.max(4,Math.floor(data.length/2500/4)*4)){sum+=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2]);count++;}return count?sum/count:128;}catch{return 128;}}
async function renderCreative(index,sourceConfig=config){
 const c=ensureFour(sourceConfig.creatives)[index];if(!c.url)throw new Error(`Creative ${index+1} has no image.`);if(!c.box)throw new Error(`Creative ${index+1} needs a retailer-brand placement box on the master.`);
 const base=await loadImage(c.url);const canvas=document.createElement('canvas');canvas.width=base.naturalWidth;canvas.height=base.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(base,0,0);
 const b=c.box,x=b.x*canvas.width,y=b.y*canvas.height,w=b.width*canvas.width,h=b.height*canvas.height;
 const logoUrl=sourceConfig.retailerLogoUrl||$('contest-retailer-logo')?.value||'';
 if(logoUrl){
   try{const logo=await loadImage(logoUrl);const pad=Math.max(6,Math.min(w,h)*.06),maxW=w-pad*2,maxH=h-pad*2,scale=Math.min(maxW/logo.naturalWidth,maxH/logo.naturalHeight,1e6),dw=logo.naturalWidth*scale,dh=logo.naturalHeight*scale;ctx.drawImage(logo,x+(w-dw)/2,y+(h-dh)/2,dw,dh);}catch{await drawName(ctx,x,y,w,h,sourceConfig);}
 }else await drawName(ctx,x,y,w,h,sourceConfig);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not render image.')),'image/png',1));
}
async function drawName(ctx,x,y,w,h,sourceConfig=config){
 const name=String(sourceConfig.retailerName||$('contest-retailer-name')?.value||'RETAILER').toUpperCase();const lum=avgLuminance(ctx,Math.floor(x),Math.floor(y),Math.floor(w),Math.floor(h));const fill=lum>145?'#111111':'#FFFFFF',stroke=lum>145?'rgba(255,255,255,.6)':'rgba(0,0,0,.55)';let size=Math.floor(Math.min(h*.48,w/Math.max(5,name.length)*1.65));size=Math.max(18,size);ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${size}px Arial, Helvetica, sans-serif`;while(ctx.measureText(name).width>w*.9&&size>14){size-=2;ctx.font=`900 ${size}px Arial, Helvetica, sans-serif`;}ctx.lineWidth=Math.max(2,size*.08);ctx.strokeStyle=stroke;ctx.fillStyle=fill;ctx.strokeText(name,x+w/2,y+h/2,w*.92);ctx.fillText(name,x+w/2,y+h/2,w*.92);ctx.restore();}
function filename(index,sourceConfig=config){const c=ensureFour(sourceConfig.creatives)[index];return `suenos-${slugify(sourceConfig.retailerName||sourceConfig.slug)}-${slugify(c.name||`social-${index+1}`)}.png`;}
function saveBlob(blob,name){const a=document.createElement('a'),u=URL.createObjectURL(blob);a.href=u;a.download=name;a.hidden=true;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000);}
async function downloadOne(index){setStatus(`Generating creative ${index+1}…`);const blob=await renderCreative(index);saveBlob(blob,filename(index));setStatus(`Creative ${index+1} downloaded for ${config.retailerName}.`);}
function crcTable(){const t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;}const CRCT=crcTable();function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=CRCT[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0;}function le16(v){return new Uint8Array([v&255,(v>>>8)&255]);}function le32(v){return new Uint8Array([v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255]);}function concat(parts){const len=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(len);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
async function makeZip(files){const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;for(const f of files){const name=enc.encode(f.name),data=new Uint8Array(await f.blob.arrayBuffer()),crc=crc32(data),local=concat([le32(0x04034b50),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),name,data]);locals.push(local);const central=concat([le32(0x02014b50),le16(20),le16(20),le16(0),le16(0),le16(0),le16(0),le32(crc),le32(data.length),le32(data.length),le16(name.length),le16(0),le16(0),le16(0),le16(0),le32(0),le32(offset),name]);centrals.push(central);offset+=local.length;}const central=concat(centrals),end=concat([le32(0x06054b50),le16(0),le16(0),le16(files.length),le16(files.length),le32(central.length),le32(offset),le16(0)]);return new Blob([concat([...locals,central,end])],{type:'application/zip'});}
async function downloadZip(){setStatus('Generating retailer social ZIP…');const files=[];for(let i=0;i<4;i++){if(!ensureFour(config.creatives)[i].url)continue;files.push({name:filename(i),blob:await renderCreative(i)});}if(!files.length)throw new Error('The master campaign has no social creatives yet.');saveBlob(await makeZip(files),`suenos-${slugify(config.retailerName||config.slug)}-social-pack.zip`);setStatus(`Social pack downloaded for ${config.retailerName}.`);}
async function downloadForContest(contest,index=null){
 if(!contest?.id)throw new Error('Retailer contest is missing its ID.');
 const d=await api('retail-social-config',{id:contest.id}),sourceConfig=normalizeConfig({...d.config,request_retailer_name:contest.retailerName||d.config?.request_retailer_name,request_slug:contest.slug||d.config?.request_slug});
 if(Number.isInteger(index)){
  const blob=await renderCreative(index,sourceConfig);saveBlob(blob,filename(index,sourceConfig));return;
 }
 const files=[];for(let i=0;i<4;i++){if(!ensureFour(sourceConfig.creatives)[i].url)continue;files.push({name:filename(i,sourceConfig),blob:await renderCreative(i,sourceConfig)});}
 if(!files.length)throw new Error('No social creatives have been uploaded on the master yet.');
 saveBlob(await makeZip(files),`suenos-${slugify(sourceConfig.retailerName||sourceConfig.slug)}-social-pack.zip`);
}
window.SuenosRetailSocial={...(window.SuenosRetailSocial||{}),downloadForContest};
function renderDownloads(){const box=$('retail-social-download-buttons');if(!box)return;box.innerHTML=ensureFour(config.creatives).map((c,i)=>c.url?`<button class="admin-btn admin-btn-secondary" type="button" data-social-download="${i}">Download ${i+1}</button>`:'').join('');}
function bindPanel(){bindDrawing();$('retail-social-slots').addEventListener('click',e=>{if(e.target.closest('input[type="file"]'))return;const upload=e.target.closest('[data-social-upload]');if(upload){uploadCreative(Number(upload.dataset.socialUpload)).catch(err=>setStatus(err.message,true));return;}const card=e.target.closest('[data-social-slot]');if(card){const next=Number(card.dataset.socialSlot);if(next===selected)return;selected=next;renderSlots();showSelected();}});$('retail-social-clear').addEventListener('click',()=>{setSelection(null);setStatus('Placement cleared. Draw a new retailer-brand box.');});$('retail-social-save').addEventListener('click',()=>saveConfig().catch(e=>setStatus(e.message,true)));$('retail-social-download-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-social-download]');if(b)downloadOne(Number(b.dataset.socialDownload)).catch(err=>setStatus(err.message,true));});$('retail-social-download-zip').addEventListener('click',()=>downloadZip().catch(e=>setStatus(e.message,true)));}
function reset(){config={creatives:ensureFour([]),sourceContestId:'',sourceName:'',inherited:false,retailerName:'',retailerCode:'',retailerLogoUrl:'',slug:''};selected=0;const w=$('retail-social-workspace');if(w)w.hidden=true;renderSlots();}
function refreshSocialContext(){
 updatePanelVisibility();
 const editor=$('contest-editor'),id=$('contest-id')?.value||'',retail=isRetail();
 if(!editor?.hidden&&retail&&id&&id!==activeId){activeId=id;reset();loadConfig(id);return;}
 if(!editor?.hidden&&retail&&id){showSelected();return;}
 if(!id&&activeId){activeId='';reset();}
}
function bindContextEvents(){
 document.addEventListener('click',e=>{
  if(e.target.closest('[data-edit],[data-retail-summary-edit],#contest-add,#contest-create-retailer,#contest-save,#contest-preview,[data-admin-tab="contests"]'))setTimeout(refreshSocialContext,120);
 });
 ['contest-type','contest-retail-master','contest-retailer-name','contest-retailer-logo'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(refreshSocialContext,0)));
 $('contest-editor-close')?.addEventListener('click',()=>setTimeout(refreshSocialContext,0));
}
installPanel();bindContextEvents();setTimeout(refreshSocialContext,0);
