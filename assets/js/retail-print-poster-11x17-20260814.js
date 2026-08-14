const TOKEN_KEY='suenos-hotline-admin-token-v3';
const $=id=>document.getElementById(id);
const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number(v)||0));
const slugify=v=>String(v||'retailer').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'retailer';

let activeId='';
let config={posterUrl:'',posterName:'',qrBox:null,sourceName:'',inherited:false,retailerName:'',retailerCode:'',slug:''};
let posterImage=null;
let drawStart=null;
let loadSeq=0;

const isRetail=()=> $('contest-type')?.value==='retail';
const isMaster=()=> isRetail()&&Boolean($('contest-retail-master')?.checked);
const isChild=()=> isRetail()&&!Boolean($('contest-retail-master')?.checked);
const currentId=()=> $('contest-id')?.value||'';

function normalizedBox(box){
  if(!box)return null;
  const x=clamp(box.x),y=clamp(box.y),width=clamp(box.width,.03,1-x),height=clamp(box.height,.03,1-y);
  return{x,y,width,height};
}

async function api(id,{method='GET',body}={}){
  const r=await fetch(`/api/contest-print-11x17?id=${encodeURIComponent(id)}`,{
    method,
    headers:{authorization:`Bearer ${token()}`,...(body?{'content-type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
    cache:'no-store'
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(d.message||'11 × 17 poster request failed.');e.status=r.status;throw e;}
  return d;
}

function installPanel(){
  if($('retail-print-11x17-designer'))return $('retail-print-11x17-designer');
  const settings=$('contest-retail-settings');
  if(!settings)throw new Error('Retail contest settings are not available.');
  const panel=document.createElement('section');
  panel.id='retail-print-11x17-designer';
  panel.className='retail-print-designer retail-print-11x17-designer';
  panel.innerHTML=`
    <div class="retail-print-heading">
      <div>
        <h4>11 × 17 Poster & QR</h4>
        <p id="retail-print-11x17-description">Upload a separate 11 × 17 poster and set its QR placement. Every retailer page inherits the master version.</p>
      </div>
      <span class="retail-print-badge">11 × 17</span>
    </div>
    <div id="retail-print-11x17-master-controls" class="retail-print-controls">
      <div class="admin-field retail-print-file-field">
        <label for="retail-print-11x17-file">11 × 17 poster JPG</label>
        <input id="retail-print-11x17-file" type="file" accept="image/jpeg,.jpg,.jpeg">
        <small>JPG only, maximum 12 MB. This is separate from the 8 × 12 artwork.</small>
      </div>
      <div class="admin-actions retail-print-upload-actions">
        <button class="admin-btn admin-btn-primary" id="retail-print-11x17-upload" type="button">Upload / Replace 11 × 17 Poster</button>
      </div>
      <div class="admin-field">
        <label for="retail-print-11x17-url">Poster URL</label>
        <input id="retail-print-11x17-url" readonly>
      </div>
    </div>
    <div id="retail-print-11x17-child-summary" class="retail-print-child-summary" hidden>
      <strong>Inherited from master campaign</strong>
      <span id="retail-print-11x17-source-name"></span>
      <p>This retailer automatically uses the master 11 × 17 artwork and QR placement.</p>
    </div>
    <div class="retail-print-workspace" id="retail-print-11x17-workspace" hidden>
      <div class="retail-print-instructions" id="retail-print-11x17-instructions"><strong>Draw the QR box:</strong> drag over the blank area where each retailer’s unique QR code belongs.</div>
      <div class="retail-print-canvas-shell" id="retail-print-11x17-canvas-shell">
        <img id="retail-print-11x17-preview" alt="11 by 17 retail contest poster preview">
        <div id="retail-print-11x17-selection" class="retail-print-selection" hidden><div id="retail-print-11x17-qr-preview" class="retail-print-qr-preview"></div><span>QR placement</span></div>
      </div>
      <div class="retail-print-readout" id="retail-print-11x17-readout"></div>
      <div class="admin-actions retail-print-actions">
        <button class="admin-btn admin-btn-secondary" id="retail-print-11x17-clear" type="button">Clear Placement</button>
        <button class="admin-btn admin-btn-secondary" id="retail-print-11x17-save" type="button">Save 11 × 17 Poster & Placement</button>
        <button class="admin-btn admin-btn-primary" id="retail-print-11x17-generate" type="button">Download 11 × 17 PDF</button>
      </div>
    </div>
    <div class="admin-status retail-print-status" id="retail-print-11x17-status" role="status"></div>`;
  const existing=$('retail-print-designer');
  if(existing)existing.insertAdjacentElement('afterend',panel);else settings.appendChild(panel);
  bindPanel();
  return panel;
}

function setStatus(message,error=false){
  const el=$('retail-print-11x17-status');
  if(!el)return;
  el.textContent=message||'';
  el.classList.toggle('is-error',Boolean(error));
}

function entryUrl(){
  const direct=$('contest-retail-page-url')?.value?.trim();
  if(direct)return direct;
  const slug=$('contest-slug')?.value?.trim()||config.slug;
  const code=$('contest-retailer-code')?.value?.trim()||config.retailerCode||slug;
  return slug?`${location.origin}/en-ca/contests/${encodeURIComponent(slug)}/?utm_source=retailer_qr&utm_medium=offline&utm_campaign=retail_contest&utm_content=${encodeURIComponent(code)}`:'';
}

function applyConfig(c={}){
  config={
    posterUrl:c.retail_print_11x17_poster_url||'',
    posterName:c.retail_print_11x17_poster_name||'',
    qrBox:normalizedBox(c.retail_print_11x17_qr_box),
    sourceName:c.source_internal_name||c.internal_name||'',
    inherited:Boolean(c.inherited),
    retailerName:c.request_retailer_name||$('contest-retailer-name')?.value||'',
    retailerCode:c.request_retailer_code||$('contest-retailer-code')?.value||'',
    slug:c.request_slug||$('contest-slug')?.value||''
  };
  if($('retail-print-11x17-url'))$('retail-print-11x17-url').value=config.posterUrl;
  if($('retail-print-11x17-source-name'))$('retail-print-11x17-source-name').textContent=config.sourceName||'Master retail campaign';
}

function updateMode(){
  const panel=$('retail-print-11x17-designer');
  if(!panel)return;
  panel.hidden=!isRetail()||Boolean($('contest-editor')?.hidden);
  if(panel.hidden)return;
  const master=isMaster(),child=isChild();
  $('retail-print-11x17-master-controls').hidden=!master;
  $('retail-print-11x17-child-summary').hidden=!child;
  $('retail-print-11x17-clear').hidden=!master;
  $('retail-print-11x17-save').hidden=!master;
  $('retail-print-11x17-generate').hidden=!child;
  $('retail-print-11x17-instructions').hidden=!master;
  $('retail-print-11x17-canvas-shell').classList.toggle('is-read-only',!master);
  $('retail-print-11x17-description').textContent=master
    ?'This is the second poster size. Upload separate 11 × 17 artwork and set its QR placement once.'
    :'This retailer uses the current 11 × 17 poster and QR placement from the master campaign.';
}

function setSelection(box){
  config.qrBox=normalizedBox(box);
  const selection=$('retail-print-11x17-selection'),shell=$('retail-print-11x17-canvas-shell');
  if(!selection||!shell||!config.qrBox){if(selection)selection.hidden=true;updateReadout();return;}
  const b=config.qrBox;
  selection.hidden=false;
  selection.style.left=`${b.x*100}%`;
  selection.style.top=`${b.y*100}%`;
  selection.style.width=`${b.width*100}%`;
  selection.style.height=`${b.height*100}%`;
  renderQrPreview();
  updateReadout();
}

function renderQrPreview(){
  const target=$('retail-print-11x17-qr-preview');
  if(!target||typeof window.qrcode!=='function')return;
  const url=entryUrl()||'https://suenos.ca/en-ca/contests/retailer-preview/';
  try{
    const qr=window.qrcode(0,'M');qr.addData(url);qr.make();target.innerHTML=qr.createSvgTag(5,4);
    const svg=target.querySelector('svg');if(svg){svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('preserveAspectRatio','xMidYMid meet');}
  }catch{target.innerHTML='<span>QR</span>';}
}

function updateReadout(){
  const el=$('retail-print-11x17-readout');if(!el)return;
  if(!posterImage||!config.posterUrl){el.textContent='Upload an 11 × 17 poster JPG.';return;}
  const dpi=Math.min(posterImage.naturalWidth/11,posterImage.naturalHeight/17);
  let text=`Print PDF: 11 × 17 in · Poster: ${posterImage.naturalWidth} × ${posterImage.naturalHeight}px · ${Math.round(dpi)} effective DPI`;
  if(config.qrBox)text+=` · QR: ${Math.min(config.qrBox.width*11,config.qrBox.height*17).toFixed(2)} in square`;
  else text+=' · QR placement not set';
  el.textContent=text;
}

async function renderPoster(){
  const workspace=$('retail-print-11x17-workspace'),img=$('retail-print-11x17-preview'),shell=$('retail-print-11x17-canvas-shell');
  if(!config.posterUrl){workspace.hidden=true;posterImage=null;updateReadout();return;}
  setStatus('Loading 11 × 17 poster…');
  try{
    posterImage=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('The 11 × 17 poster could not be loaded.'));image.src=`${config.posterUrl}${config.posterUrl.includes('?')?'&':'?'}v=${Date.now()}`;});
    img.src=posterImage.src;
    shell.style.aspectRatio=`${posterImage.naturalWidth}/${posterImage.naturalHeight}`;
    workspace.hidden=false;
    setSelection(config.qrBox);
    setStatus(isMaster()?'11 × 17 poster ready. Draw or adjust the QR box, then save.':'Inherited 11 × 17 poster ready.');
  }catch(error){workspace.hidden=true;setStatus(error.message,true);}
}

async function loadCurrent(){
  const id=currentId();
  updateMode();
  if(!id||!isRetail())return;
  const seq=++loadSeq;
  activeId=id;
  setStatus('Loading 11 × 17 settings…');
  try{
    const d=await api(id);
    if(seq!==loadSeq)return;
    applyConfig(d.config||{});
    updateMode();
    if(config.posterUrl)await renderPoster();
    else{posterImage=null;$('retail-print-11x17-workspace').hidden=true;setStatus(isMaster()?'No 11 × 17 poster yet. Choose a JPG above to set it up.':'The master campaign does not have an 11 × 17 poster yet.');}
  }catch(error){
    if(seq!==loadSeq)return;
    setStatus(error.message||'11 × 17 settings could not load.',true);
  }
}

async function saveConfig(showMessage=true){
  const id=currentId();
  if(!id||!isMaster())throw new Error('Open the master retail campaign to edit the 11 × 17 poster.');
  const d=await api(id,{method:'POST',body:{posterUrl:config.posterUrl,posterName:config.posterName,qrBox:config.qrBox}});
  applyConfig(d.config||{});
  if(showMessage)setStatus('11 × 17 poster and QR placement saved. Existing retailer pages now inherit it.');
}

async function uploadPoster(){
  if(!isMaster())throw new Error('Upload the 11 × 17 poster on the master campaign.');
  const file=$('retail-print-11x17-file')?.files?.[0];
  if(!file)throw new Error('Choose an 11 × 17 JPG first.');
  if(file.type!=='image/jpeg'&&!/\.jpe?g$/i.test(file.name))throw new Error('Upload a JPG file.');
  if(file.size>12*1024*1024)throw new Error('The JPG exceeds the 12 MB upload limit.');
  setStatus('Uploading 11 × 17 poster…');
  const r=await fetch('/api/contest-assets',{method:'POST',headers:{authorization:`Bearer ${token()}`,'content-type':'image/jpeg'},body:file});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.message||'Poster upload failed.');
  config.posterUrl=d.url;config.posterName=file.name;config.qrBox=null;
  $('retail-print-11x17-url').value=config.posterUrl;
  await saveConfig(false);
  await renderPoster();
  setStatus('11 × 17 poster uploaded. Draw the QR placement box, then save.');
}

function pointerPosition(event){
  const r=$('retail-print-11x17-canvas-shell').getBoundingClientRect();
  return{x:clamp((event.clientX-r.left)/r.width),y:clamp((event.clientY-r.top)/r.height)};
}

function bindDrawing(){
  const shell=$('retail-print-11x17-canvas-shell');
  shell.addEventListener('pointerdown',event=>{
    if(!isMaster()||event.button!==0||!config.posterUrl)return;
    drawStart=pointerPosition(event);shell.setPointerCapture(event.pointerId);setSelection({x:drawStart.x,y:drawStart.y,width:.03,height:.03});event.preventDefault();
  });
  shell.addEventListener('pointermove',event=>{
    if(!drawStart||!isMaster())return;
    const p=pointerPosition(event),x=Math.min(drawStart.x,p.x),y=Math.min(drawStart.y,p.y);
    setSelection({x,y,width:Math.max(.03,Math.abs(p.x-drawStart.x)),height:Math.max(.03,Math.abs(p.y-drawStart.y))});
  });
  const finish=event=>{if(!drawStart)return;drawStart=null;try{shell.releasePointerCapture(event.pointerId)}catch{};updateReadout();};
  shell.addEventListener('pointerup',finish);shell.addEventListener('pointercancel',finish);
}

async function buildPdf(){
  if(!isChild())throw new Error('Open a retailer page to generate its unique 11 × 17 PDF.');
  if(!config.posterUrl)throw new Error('The master campaign does not have an 11 × 17 poster yet.');
  if(!config.qrBox)throw new Error('The master campaign does not have an 11 × 17 QR box yet.');
  const targetUrl=entryUrl();
  if(!targetUrl)throw new Error('This retailer page does not have an entry URL yet.');
  if(!window.PDFLib||typeof window.qrcode!=='function')throw new Error('The PDF or QR library is unavailable. Refresh Admin and try again.');
  const response=await fetch(config.posterUrl,{cache:'no-store'});if(!response.ok)throw new Error('The 11 × 17 poster could not be downloaded.');
  const bytes=await response.arrayBuffer();
  const {PDFDocument,rgb}=window.PDFLib,doc=await PDFDocument.create(),width=11*72,height=17*72,page=doc.addPage([width,height]),poster=await doc.embedJpg(bytes);
  page.drawImage(poster,{x:0,y:0,width,height});
  const b=config.qrBox,regionW=b.width*width,regionH=b.height*height,size=Math.min(regionW,regionH);
  if(size/72<1.25)throw new Error('The QR placement must be at least 1.25 inches square.');
  const left=b.x*width+(regionW-size)/2,bottom=height-(b.y*height+regionH)+(regionH-size)/2;
  const qr=window.qrcode(0,'M');qr.addData(targetUrl);qr.make();const modules=qr.getModuleCount(),quiet=4,total=modules+quiet*2,module=size/total;
  page.drawRectangle({x:left,y:bottom,width:size,height:size,color:rgb(1,1,1)});
  for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))page.drawRectangle({x:left+(col+quiet)*module,y:bottom+size-(row+quiet+1)*module,width:module+.02,height:module+.02,color:rgb(0,0,0)});
  const output=await doc.save({useObjectStreams:false}),blob=new Blob([output],{type:'application/pdf'}),a=document.createElement('a'),u=URL.createObjectURL(blob);
  const name=$('contest-retailer-name')?.value||config.retailerName||'retailer';
  a.href=u;a.download=`suenos-${slugify(name)}-contest-poster-11x17.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);
  setStatus('11 × 17 PDF downloaded.');
}

function bindPanel(){
  bindDrawing();
  $('retail-print-11x17-upload').addEventListener('click',()=>uploadPoster().catch(e=>setStatus(e.message,true)));
  $('retail-print-11x17-clear').addEventListener('click',()=>{setSelection(null);setStatus('QR placement cleared. Draw a new box.');});
  $('retail-print-11x17-save').addEventListener('click',()=>saveConfig().catch(e=>setStatus(e.message,true)));
  $('retail-print-11x17-generate').addEventListener('click',()=>buildPdf().catch(e=>setStatus(e.message,true)));
  window.addEventListener('resize',()=>{if(config.qrBox)setSelection(config.qrBox);});
}

installPanel();
updateMode();
loadCurrent();

document.addEventListener('click',event=>{
  if(event.target.closest('[data-edit],[data-retail-summary-edit]'))setTimeout(loadCurrent,140);
});
document.addEventListener('suenos:admin-authenticated',()=>setTimeout(loadCurrent,50));
