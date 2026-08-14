const TOKEN_KEY='suenos-hotline-admin-token-v3';
const $=id=>document.getElementById(id);
const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number(v)||0));
const slugify=v=>String(v||'retailer').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'retailer';

let activeId='';
let loadingId='';
let posterImage=null;
let drawStart=null;
let lastQrPreviewUrl='';
let config={posterUrl:'',posterName:'',qrBox:null,sourceContestId:'',sourceName:'',inherited:false,requestRetailerName:'',requestRetailerCode:'',requestSlug:''};

function isRetailMaster(){return $('contest-type')?.value==='retail'&&Boolean($('contest-retail-master')?.checked);}
function isRetailChild(){return $('contest-type')?.value==='retail'&&!Boolean($('contest-retail-master')?.checked);}
function normalizedBox(box){
  if(!box)return null;
  const x=clamp(box.x),y=clamp(box.y),width=clamp(box.width,.03,1-x),height=clamp(box.height,.03,1-y);
  return{x,y,width,height};
}
function entryUrl(){
  const direct=$('contest-retail-page-url')?.value?.trim();
  if(direct)return direct;
  const slug=$('contest-slug')?.value?.trim()||config.requestSlug;
  const code=$('contest-retailer-code')?.value?.trim()||config.requestRetailerCode||slug;
  return slug?`${location.origin}/en-ca/contests/${encodeURIComponent(slug)}/?utm_source=retailer_qr&utm_medium=offline&utm_campaign=retail_contest&utm_content=${encodeURIComponent(code)}`:'';
}
function entryUrlFromConfig(c){
  const slug=c.request_slug||'';
  const code=c.request_retailer_code||slug;
  return slug?`${location.origin}/en-ca/contests/${encodeURIComponent(slug)}/?utm_source=retailer_qr&utm_medium=offline&utm_campaign=retail_contest&utm_content=${encodeURIComponent(code)}`:'';
}

async function api(id,{method='GET',body}={}){
  const r=await fetch(`/api/contest-print-11x17?id=${encodeURIComponent(id)}`,{
    method,
    headers:{authorization:`Bearer ${token()}`,...(body?{'content-type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
    cache:'no-store'
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.message||'11 × 17 poster request failed.');
  return d;
}

function installPanel(){
  const settings=$('contest-retail-settings');
  if(!settings||$('retail-print-11x17-designer'))return;
  const panel=document.createElement('section');
  panel.id='retail-print-11x17-designer';
  panel.className='retail-print-designer retail-print-11x17-designer';
  panel.hidden=true;
  panel.innerHTML=`
    <div class="retail-print-heading">
      <div>
        <h4 id="retail-print-11x17-title">11 × 17 Poster & QR</h4>
        <p id="retail-print-11x17-description">Upload the 11 × 17 poster to the master campaign and draw its QR location once. Every retailer page inherits it.</p>
      </div>
      <span class="retail-print-badge">11 × 17</span>
    </div>
    <div id="retail-print-11x17-master-controls" class="retail-print-controls">
      <div class="admin-field retail-print-file-field">
        <label for="retail-print-11x17-file">11 × 17 poster JPG</label>
        <input id="retail-print-11x17-file" type="file" accept="image/jpeg,.jpg,.jpeg">
        <small>JPG only, maximum 12 MB. Use artwork sized for 11 × 17 inches, ideally near 300 DPI.</small>
      </div>
      <div class="admin-actions retail-print-upload-actions">
        <button class="admin-btn admin-btn-primary" id="retail-print-11x17-upload" type="button">Upload 11 × 17 Poster</button>
      </div>
      <div class="admin-field">
        <label for="retail-print-11x17-url">Poster URL</label>
        <input id="retail-print-11x17-url" readonly>
      </div>
    </div>
    <div id="retail-print-11x17-child-summary" class="retail-print-child-summary" hidden>
      <strong>Inherited 11 × 17 poster</strong>
      <span id="retail-print-11x17-source-name"></span>
      <p>This retailer automatically uses the current 11 × 17 artwork and QR placement from its master campaign.</p>
    </div>
    <div class="retail-print-workspace" hidden id="retail-print-11x17-workspace">
      <div class="retail-print-instructions" id="retail-print-11x17-instructions"><strong>Draw the QR box:</strong> drag across the blank area where the retailer QR should appear. The code stays square and centred inside the box.</div>
      <div class="retail-print-canvas-shell" id="retail-print-11x17-canvas-shell">
        <img id="retail-print-11x17-preview" alt="11 by 17 retail contest poster preview">
        <div id="retail-print-11x17-selection" class="retail-print-selection" hidden><div id="retail-print-11x17-qr-preview" class="retail-print-qr-preview"></div><span>QR placement</span></div>
      </div>
      <div class="retail-print-readout" id="retail-print-11x17-readout">Upload an 11 × 17 poster JPG.</div>
      <div class="admin-actions retail-print-actions">
        <button class="admin-btn admin-btn-secondary" id="retail-print-11x17-clear" type="button">Clear Placement</button>
        <button class="admin-btn admin-btn-secondary" id="retail-print-11x17-save" type="button">Save 11 × 17 Poster & Placement</button>
        <button class="admin-btn admin-btn-primary" id="retail-print-11x17-generate" type="button">Download 11 × 17 PDF</button>
      </div>
    </div>
    <div class="admin-status retail-print-status" id="retail-print-11x17-status" role="status"></div>`;
  const existing=$('retail-print-designer');
  if(existing)existing.insertAdjacentElement('afterend',panel);
  else settings.appendChild(panel);
  bindPanel();
}

function setStatus(message,isError=false){
  const el=$('retail-print-11x17-status');if(!el)return;
  el.textContent=message||'';
  el.classList.toggle('is-error',Boolean(isError));
}
function updatePanelVisibility(){
  const panel=$('retail-print-11x17-designer');if(!panel)return;
  const editor=$('contest-editor'),isRetail=$('contest-type')?.value==='retail';
  panel.hidden=Boolean(editor?.hidden)||!isRetail;
  if(panel.hidden)return;
  const master=isRetailMaster(),child=isRetailChild();
  $('retail-print-11x17-master-controls').hidden=!master;
  $('retail-print-11x17-child-summary').hidden=!child;
  $('retail-print-11x17-clear').hidden=!master;
  $('retail-print-11x17-save').hidden=!master;
  $('retail-print-11x17-generate').hidden=!child;
  $('retail-print-11x17-instructions').hidden=!master;
  $('retail-print-11x17-canvas-shell').classList.toggle('is-read-only',!master);
  $('retail-print-11x17-description').textContent=master
    ?'Upload the 11 × 17 poster and set its QR location once. Every retailer page inherits the latest version.'
    :'This retailer uses the 11 × 17 poster and QR placement from its master campaign.';
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
  const qrPreview=$('retail-print-11x17-qr-preview');
  if(qrPreview){const size=Math.min(b.width*shell.clientWidth,b.height*shell.clientHeight);qrPreview.style.width=`${Math.max(10,size)}px`;qrPreview.style.height=`${Math.max(10,size)}px`;}
  renderQrPreview();updateReadout();
}
function renderQrPreview(){
  const target=$('retail-print-11x17-qr-preview');if(!target||typeof window.qrcode!=='function')return;
  const url=entryUrl()||'https://suenos.ca/en-ca/contests/retailer-preview/';
  if(url===lastQrPreviewUrl&&target.querySelector('svg'))return;
  lastQrPreviewUrl=url;
  try{const qr=window.qrcode(0,'M');qr.addData(url);qr.make();target.innerHTML=qr.createSvgTag(5,4);const svg=target.querySelector('svg');if(svg){svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('preserveAspectRatio','xMidYMid meet');}}
  catch{target.innerHTML='<span>QR</span>';}
}
function updateReadout(){
  const el=$('retail-print-11x17-readout');if(!el)return;
  if(!posterImage||!config.posterUrl){el.textContent='Upload an 11 × 17 poster JPG on the master campaign.';return;}
  const dpi=Math.min(posterImage.naturalWidth/11,posterImage.naturalHeight/17);
  let text=`Print PDF: 11 × 17 in · Poster: ${posterImage.naturalWidth} × ${posterImage.naturalHeight}px · ${Math.round(dpi)} effective DPI`;
  if(config.qrBox){const qrIn=Math.min(config.qrBox.width*11,config.qrBox.height*17);text+=` · QR: ${qrIn.toFixed(2)} in square`;}
  else text+=' · Draw the QR placement box.';
  el.textContent=text;
  el.classList.toggle('is-warning',dpi<200||Boolean(config.qrBox&&Math.min(config.qrBox.width*11,config.qrBox.height*17)<1.25));
}
async function renderPoster(){
  const workspace=$('retail-print-11x17-workspace'),img=$('retail-print-11x17-preview'),shell=$('retail-print-11x17-canvas-shell');
  if(!config.posterUrl||!workspace||!img||!shell){if(workspace)workspace.hidden=true;return;}
  setStatus('Loading 11 × 17 poster preview…');
  try{
    posterImage=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('The 11 × 17 poster JPG could not be loaded.'));image.src=`${config.posterUrl}${config.posterUrl.includes('?')?'&':'?'}v=${Date.now()}`;});
    img.src=posterImage.src;img.style.aspectRatio=`${posterImage.naturalWidth}/${posterImage.naturalHeight}`;shell.style.aspectRatio=`${posterImage.naturalWidth}/${posterImage.naturalHeight}`;
    workspace.hidden=false;setSelection(config.qrBox);
    setStatus(isRetailMaster()?'11 × 17 poster loaded. Draw or adjust the QR placement box.':'Inherited 11 × 17 poster loaded.');
  }catch(error){workspace.hidden=true;setStatus(error.message||'11 × 17 poster preview could not load.',true);}
}
function applyServerConfig(c={}){
  config={posterUrl:c.retail_print_11x17_poster_url||'',posterName:c.retail_print_11x17_poster_name||'',qrBox:c.retail_print_11x17_qr_box||null,sourceContestId:c.source_contest_id||c.id||'',sourceName:c.source_internal_name||c.internal_name||'',inherited:Boolean(c.inherited),requestRetailerName:c.request_retailer_name||'',requestRetailerCode:c.request_retailer_code||'',requestSlug:c.request_slug||''};
  $('retail-print-11x17-url').value=config.posterUrl;
  $('retail-print-11x17-source-name').textContent=config.sourceName||'Master retail campaign';
}
async function loadConfig(id){
  if(!id||loadingId===id)return;
  loadingId=id;setStatus('Loading 11 × 17 poster…');
  try{const d=await api(id);applyServerConfig(d.config);if(config.posterUrl)await renderPoster();else{$('retail-print-11x17-workspace').hidden=true;setStatus(isRetailMaster()?'Upload an 11 × 17 poster JPG.':'The master campaign does not have an 11 × 17 poster yet.');}}
  catch(error){setStatus(error.message||'11 × 17 poster could not load.',true);}finally{loadingId='';}
}
async function saveConfig(showMessage=true){
  const id=$('contest-id')?.value;if(!id)throw new Error('Save the master contest before saving the 11 × 17 poster.');
  if(!isRetailMaster())throw new Error('11 × 17 poster settings are controlled by the master retail campaign.');
  const d=await api(id,{method:'POST',body:{posterUrl:config.posterUrl,posterName:config.posterName,qrBox:config.qrBox}});applyServerConfig(d.config);
  if(showMessage)setStatus('11 × 17 master poster and QR placement saved. Existing retailer pages now inherit it.');
}
async function uploadPoster(){
  if(!isRetailMaster())throw new Error('Upload the 11 × 17 poster on the master retail campaign.');
  const file=$('retail-print-11x17-file')?.files?.[0];if(!file)throw new Error('Choose an 11 × 17 JPG first.');
  if(file.type!=='image/jpeg'&&!/\.jpe?g$/i.test(file.name))throw new Error('Upload a JPG file.');
  if(file.size>12*1024*1024)throw new Error('The JPG exceeds the 12 MB upload limit.');
  setStatus('Uploading 11 × 17 poster…');
  const r=await fetch('/api/contest-assets',{method:'POST',headers:{authorization:`Bearer ${token()}`,'content-type':'image/jpeg'},body:file});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Poster upload failed.');
  config.posterUrl=d.url;config.posterName=file.name;config.qrBox=null;$('retail-print-11x17-url').value=config.posterUrl;
  await saveConfig(false);await renderPoster();setStatus('11 × 17 poster uploaded. Draw the QR box, then save the placement.');
}

async function buildRetailPdf({posterUrl,qrBox,targetUrl,retailerName,slug}){
  if(!posterUrl)throw new Error('The master campaign does not have an 11 × 17 poster yet.');
  if(!qrBox)throw new Error('The master campaign does not have an 11 × 17 QR placement box yet.');
  if(!targetUrl)throw new Error('This retailer page does not have an entry URL yet.');
  if(!window.PDFLib)throw new Error('The PDF production library did not load. Refresh Admin and try again.');
  if(typeof window.qrcode!=='function')throw new Error('The QR generator did not load. Refresh Admin and try again.');
  const response=await fetch(posterUrl,{cache:'no-store'});if(!response.ok)throw new Error('The master 11 × 17 poster could not be downloaded.');
  const bytes=await response.arrayBuffer();
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib,doc=await PDFDocument.create(),width=11*72,height=17*72,page=doc.addPage([width,height]),poster=await doc.embedJpg(bytes),labelFont=await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawImage(poster,{x:0,y:0,width,height});
  const b=normalizedBox(qrBox),regionW=b.width*width,regionH=b.height*height,size=Math.min(regionW,regionH);
  if(size/72<1.25)throw new Error('The 11 × 17 QR placement is too small for reliable print scanning. Make it at least 1.25 inches square.');
  const left=b.x*width+(regionW-size)/2,bottom=height-(b.y*height+regionH)+(regionH-size)/2;
  const qr=window.qrcode(0,'M');qr.addData(targetUrl);qr.make();const modules=qr.getModuleCount(),quiet=4,total=modules+quiet*2,module=size/total;
  page.drawRectangle({x:left,y:bottom,width:size,height:size,color:rgb(1,1,1)});
  for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))page.drawRectangle({x:left+(col+quiet)*module,y:bottom+size-(row+quiet+1)*module,width:module+0.02,height:module+0.02,color:rgb(0,0,0)});
  const cleaned=String(retailerName||'Sueños Retailer').trim()||'Sueños Retailer',margin=Math.max(12,width*.02),padX=8,padY=5,maxWidth=Math.min(width*.5,width-margin*2);let fontSize=Math.max(8,Math.min(12,width/55)),label=cleaned;
  const fits=()=>labelFont.widthOfTextAtSize(label,fontSize)<=Math.max(32,maxWidth-padX*2);while(fontSize>8&&!fits())fontSize-=.5;if(!fits())while(label.length>3&&!fits())label=`${label.slice(0,-2).trim()}…`;
  const textWidth=Math.min(labelFont.widthOfTextAtSize(label,fontSize),maxWidth-padX*2),labelWidth=Math.min(maxWidth,textWidth+padX*2),labelHeight=fontSize+padY*2;
  page.drawRectangle({x:margin,y:margin,width:labelWidth,height:labelHeight,color:rgb(1,1,1),opacity:.88,borderWidth:.75,borderColor:rgb(.82,.82,.82)});page.drawText(label,{x:margin+padX,y:margin+padY,size:fontSize,font:labelFont,color:rgb(.12,.12,.12)});
  doc.setTitle(`${cleaned} Contest Poster 11 × 17`);doc.setSubject(`Retail contest QR poster for ${targetUrl}`);doc.setCreator('Sueños Retail Contest Admin');
  const output=await doc.save({useObjectStreams:false,addDefaultPage:false}),blob=new Blob([output],{type:'application/pdf'}),a=document.createElement('a'),objectUrl=URL.createObjectURL(blob);a.href=objectUrl;a.download=`suenos-${slugify(cleaned||slug)}-contest-poster-11x17.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
}
async function generatePdf(){
  if(!isRetailChild())throw new Error('Open a retailer page to generate its unique 11 × 17 PDF.');
  setStatus('Building this retailer’s 11 × 17 PDF…');
  await buildRetailPdf({posterUrl:config.posterUrl,qrBox:config.qrBox,targetUrl:entryUrl(),retailerName:$('contest-retailer-name')?.value||config.requestRetailerName,slug:$('contest-slug')?.value||config.requestSlug});
  setStatus('11 × 17 print-ready PDF downloaded.');
}
async function downloadForContest(id){
  const d=await api(id),c=d.config||{};
  await buildRetailPdf({posterUrl:c.retail_print_11x17_poster_url,qrBox:c.retail_print_11x17_qr_box,targetUrl:entryUrlFromConfig(c),retailerName:c.request_retailer_name,slug:c.request_slug});
}

function pointerPosition(event){const shell=$('retail-print-11x17-canvas-shell'),r=shell.getBoundingClientRect();return{x:clamp((event.clientX-r.left)/r.width),y:clamp((event.clientY-r.top)/r.height)};}
function bindDrawing(){
  const shell=$('retail-print-11x17-canvas-shell');
  shell.addEventListener('pointerdown',e=>{if(!isRetailMaster()||e.button!==0||!config.posterUrl)return;drawStart=pointerPosition(e);shell.setPointerCapture(e.pointerId);setSelection({x:drawStart.x,y:drawStart.y,width:.03,height:.03});e.preventDefault();});
  shell.addEventListener('pointermove',e=>{if(!drawStart||!isRetailMaster())return;const p=pointerPosition(e),x=Math.min(drawStart.x,p.x),y=Math.min(drawStart.y,p.y),width=Math.abs(p.x-drawStart.x),height=Math.abs(p.y-drawStart.y);setSelection({x,y,width:Math.max(.03,width),height:Math.max(.03,height)});});
  const finish=e=>{if(!drawStart)return;drawStart=null;try{shell.releasePointerCapture(e.pointerId)}catch{};updateReadout();};shell.addEventListener('pointerup',finish);shell.addEventListener('pointercancel',finish);
}
function bindPanel(){
  bindDrawing();
  $('retail-print-11x17-upload').addEventListener('click',()=>uploadPoster().catch(e=>setStatus(e.message,true)));
  $('retail-print-11x17-clear').addEventListener('click',()=>{config.qrBox=null;setSelection(null);setStatus('11 × 17 placement cleared. Draw a new QR box.');});
  $('retail-print-11x17-save').addEventListener('click',()=>saveConfig().catch(e=>setStatus(e.message,true)));
  $('retail-print-11x17-generate').addEventListener('click',()=>generatePdf().catch(e=>setStatus(e.message,true)));
  window.addEventListener('resize',()=>setSelection(config.qrBox));
}
function resetState(){config={posterUrl:'',posterName:'',qrBox:null,sourceContestId:'',sourceName:'',inherited:false,requestRetailerName:'',requestRetailerCode:'',requestSlug:''};posterImage=null;const workspace=$('retail-print-11x17-workspace');if(workspace)workspace.hidden=true;}

function enhancePosterButtons(){
  document.querySelectorAll('button[data-download-poster]').forEach(button=>{
    button.textContent='8 × 12';
    const id=button.dataset.downloadPoster;
    if(!id||button.parentElement?.querySelector(`button[data-download-poster-11x17="${CSS.escape(id)}"]`))return;
    const extra=document.createElement('button');extra.type='button';extra.className='admin-btn admin-btn-secondary';extra.dataset.downloadPoster11x17=id;extra.textContent='11 × 17';button.insertAdjacentElement('afterend',extra);
  });
}
document.addEventListener('click',e=>{
  const button=e.target.closest('button[data-download-poster-11x17]');if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  const original=button.textContent;button.disabled=true;button.textContent='Building…';
  downloadForContest(button.dataset.downloadPoster11x17).catch(error=>alert(error.message)).finally(()=>{button.disabled=false;button.textContent=original;});
},true);

function watchEditor(){
  const list=$('contest-admin-list');if(list)new MutationObserver(enhancePosterButtons).observe(list,{childList:true,subtree:true});enhancePosterButtons();
  setInterval(()=>{
    updatePanelVisibility();enhancePosterButtons();
    const editor=$('contest-editor'),id=$('contest-id')?.value||'',isRetail=$('contest-type')?.value==='retail';
    if(!editor?.hidden&&isRetail&&id&&id!==activeId){activeId=id;resetState();loadConfig(id);}
    if(id!==activeId&&!id){activeId='';resetState();}
    renderQrPreview();
  },350);
}

installPanel();watchEditor();
