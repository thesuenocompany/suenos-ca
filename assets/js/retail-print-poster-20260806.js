const TOKEN_KEY='suenos-hotline-admin-token-v3';
const INCLUDED_TEMPLATE='/assets/templates/suenos-retail-cooler-contest-poster.jpg';
const INCLUDED_BOX={x:0.544,y:0.676,width:0.396,height:0.265};
const $=id=>document.getElementById(id);
const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number(v)||0));
const slugify=v=>String(v||'retailer').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'retailer';

let activeId='';
let config={posterUrl:'',posterName:'',widthIn:8,heightIn:12,qrBox:null,sourceContestId:'',sourceName:'',inherited:false};
let posterImage=null;
let drawStart=null;
let loadingId='';
let lastQrPreviewUrl='';

async function api(action,{method='GET',body}={}){
  const id=$('contest-id')?.value||activeId;
  const r=await fetch(`/api/contest-admin?action=${encodeURIComponent(action)}&id=${encodeURIComponent(id)}`,{
    method,
    headers:{authorization:`Bearer ${token()}`,...(body?{'content-type':'application/json'}:{})},
    body:body?JSON.stringify(body):undefined,
    cache:'no-store'
  });
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d.message||'Request failed.');
  return d;
}

function entryUrl(){
  const direct=$('contest-retail-page-url')?.value?.trim();
  if(direct)return direct;
  const slug=$('contest-slug')?.value?.trim();
  return slug?`${location.origin}/en-ca/contests/${slug}/?utm_source=qr&utm_medium=retail_print&utm_campaign=${encodeURIComponent($('contest-retailer-code')?.value||slug)}`:'';
}

function isRetailMaster(){return $('contest-type')?.value==='retail'&&Boolean($('contest-retail-master')?.checked);}
function isRetailChild(){return $('contest-type')?.value==='retail'&&!Boolean($('contest-retail-master')?.checked);}

function installPanel(){
  const settings=$('contest-retail-settings');
  if(!settings||$('retail-print-designer'))return;
  const panel=document.createElement('section');
  panel.id='retail-print-designer';
  panel.className='retail-print-designer';
  panel.hidden=true;
  panel.innerHTML=`
    <div class="retail-print-heading">
      <div>
        <h4 id="retail-print-title">Retail poster & QR</h4>
        <p id="retail-print-description">Upload the poster JPG to the master campaign, draw the QR location once, and every retailer page will produce its own print-ready PDF.</p>
      </div>
      <span class="retail-print-badge">Master-controlled</span>
    </div>

    <div id="retail-print-master-controls" class="retail-print-controls">
      <div class="admin-field retail-print-file-field">
        <label for="retail-print-poster-file">Poster JPG</label>
        <input id="retail-print-poster-file" type="file" accept="image/jpeg,.jpg,.jpeg">
        <small>JPG only, maximum 12 MB. For sharp printing, use artwork near 300 DPI at the final size.</small>
      </div>
      <div class="admin-actions retail-print-upload-actions">
        <button class="admin-btn admin-btn-primary" id="retail-print-upload" type="button">Upload Poster JPG</button>
        <button class="admin-btn admin-btn-secondary" id="retail-print-use-sample" type="button">Use Included Cooler Poster</button>
      </div>
      <div class="admin-field-grid retail-print-meta-row">
        <div class="admin-field"><label for="retail-print-poster-url">Poster URL</label><input id="retail-print-poster-url" readonly></div>
        <div class="admin-field"><label for="retail-print-width">PDF width (inches)</label><input id="retail-print-width" type="number" min="1" max="60" step="0.01" value="8"></div>
        <div class="admin-field"><label for="retail-print-height">PDF height (inches)</label><input id="retail-print-height" type="number" min="1" max="60" step="0.01" value="12"></div>
      </div>
    </div>

    <div id="retail-print-child-summary" class="retail-print-child-summary" hidden>
      <strong>Inherited from master campaign</strong>
      <span id="retail-print-source-name"></span>
      <p>Change the poster or QR placement on the master campaign. This retailer page automatically uses the latest master version.</p>
    </div>

    <div class="retail-print-workspace" hidden id="retail-print-workspace">
      <div class="retail-print-instructions" id="retail-print-instructions"><strong>Draw the QR box:</strong> drag across the blank area where the code should appear. The QR remains square and is centred inside the box.</div>
      <div class="retail-print-canvas-shell" id="retail-print-canvas-shell">
        <img id="retail-print-poster-preview" alt="Retail contest poster preview">
        <div id="retail-print-selection" class="retail-print-selection" hidden><div id="retail-print-qr-preview" class="retail-print-qr-preview"></div><span>QR placement</span></div>
      </div>
      <div class="retail-print-readout" id="retail-print-readout">Upload a poster JPG.</div>
      <div class="admin-actions retail-print-actions">
        <button class="admin-btn admin-btn-secondary" id="retail-print-clear" type="button">Clear Placement</button>
        <button class="admin-btn admin-btn-secondary" id="retail-print-save" type="button">Save Master Poster & Placement</button>
        <button class="admin-btn admin-btn-primary" id="retail-print-generate" type="button">Download Retailer Print PDF</button>
      </div>
    </div>
    <div class="admin-status retail-print-status" id="retail-print-status" role="status"></div>`;
  const qrTools=$('contest-retail-qr-tools');
  if(qrTools)qrTools.insertAdjacentElement('afterend',panel);else settings.appendChild(panel);
  bindPanel();
}

function setStatus(message,isError=false){
  const el=$('retail-print-status');if(!el)return;
  el.textContent=message||'';
  el.classList.toggle('is-error',Boolean(isError));
}

function updatePanelVisibility(){
  const panel=$('retail-print-designer');
  if(!panel)return;
  const editor=$('contest-editor');
  const isRetail=$('contest-type')?.value==='retail';
  panel.hidden=Boolean(editor?.hidden)||!isRetail;
  if(panel.hidden)return;

  const id=$('contest-id')?.value||'';
  const master=isRetailMaster();
  const child=isRetailChild();
  $('retail-print-master-controls').hidden=!master;
  $('retail-print-child-summary').hidden=!child;
  $('retail-print-clear').hidden=!master;
  $('retail-print-save').hidden=!master;
  $('retail-print-generate').hidden=!child;
  $('retail-print-instructions').hidden=!master;
  $('retail-print-canvas-shell').classList.toggle('is-read-only',!master);
  $('retail-print-title').textContent=master?'Master poster & QR placement':'Retailer print poster';
  $('retail-print-description').textContent=master
    ?'Upload one poster JPG and draw the QR location once. Every retailer page inherits this design.'
    :'This retailer page uses the poster and QR placement from its master campaign.';

  if(!id)setStatus(master?'Save the master retail campaign first, then upload its poster JPG.':'Save the retailer page first.');
}

function normalizedBox(box){
  if(!box)return null;
  const x=clamp(box.x),y=clamp(box.y),width=clamp(box.width,.03,1-x),height=clamp(box.height,.03,1-y);
  return{x,y,width,height};
}

function setSelection(box){
  config.qrBox=normalizedBox(box);
  const selection=$('retail-print-selection'),shell=$('retail-print-canvas-shell');
  if(!selection||!shell||!config.qrBox){if(selection)selection.hidden=true;updateReadout();return;}
  const b=config.qrBox;
  selection.hidden=false;
  selection.style.left=`${b.x*100}%`;
  selection.style.top=`${b.y*100}%`;
  selection.style.width=`${b.width*100}%`;
  selection.style.height=`${b.height*100}%`;
  const qrPreview=$('retail-print-qr-preview');
  if(qrPreview){
    const size=Math.min(b.width*shell.clientWidth,b.height*shell.clientHeight);
    qrPreview.style.width=`${Math.max(10,size)}px`;
    qrPreview.style.height=`${Math.max(10,size)}px`;
  }
  renderQrPreview();
  updateReadout();
}

function renderQrPreview(){
  const target=$('retail-print-qr-preview');
  if(!target||typeof window.qrcode!=='function')return;
  const url=entryUrl()||'https://suenos.ca/en-ca/contests/retailer-preview/';
  if(url===lastQrPreviewUrl&&target.querySelector('svg'))return;
  lastQrPreviewUrl=url;
  try{
    const qr=window.qrcode(0,'M');qr.addData(url);qr.make();target.innerHTML=qr.createSvgTag(5,4);
    const svg=target.querySelector('svg');
    if(svg){svg.removeAttribute('width');svg.removeAttribute('height');svg.setAttribute('preserveAspectRatio','xMidYMid meet');}
  }catch{target.innerHTML='<span>QR</span>';}
}

function printDimensions(){
  const width=clamp($('retail-print-width')?.value||config.widthIn,1,60);
  const height=clamp($('retail-print-height')?.value||config.heightIn,1,60);
  return{width,height};
}

function updateReadout(){
  const el=$('retail-print-readout');if(!el)return;
  if(!posterImage||!config.posterUrl){el.textContent='Upload a poster JPG on the master campaign.';return;}
  const {width,height}=printDimensions();
  const dpi=Math.min(posterImage.naturalWidth/width,posterImage.naturalHeight/height);
  let text=`Print PDF: ${width.toFixed(2)} × ${height.toFixed(2)} in · Poster: ${posterImage.naturalWidth} × ${posterImage.naturalHeight}px · ${Math.round(dpi)} effective DPI`;
  if(config.qrBox){
    const qrIn=Math.min(config.qrBox.width*width,config.qrBox.height*height);
    text+=` · QR: ${qrIn.toFixed(2)} in square`;
  }else{text+=' · Draw the QR placement box.';}
  el.textContent=text;
  el.classList.toggle('is-warning',dpi<200||Boolean(config.qrBox&&Math.min(config.qrBox.width*width,config.qrBox.height*height)<1.25));
}

async function renderPoster(){
  const workspace=$('retail-print-workspace'),img=$('retail-print-poster-preview'),shell=$('retail-print-canvas-shell');
  if(!config.posterUrl||!workspace||!img||!shell){if(workspace)workspace.hidden=true;return;}
  setStatus('Loading poster preview…');
  try{
    posterImage=await new Promise((resolve,reject)=>{
      const image=new Image();
      image.onload=()=>resolve(image);
      image.onerror=()=>reject(new Error('The poster JPG could not be loaded.'));
      image.src=`${config.posterUrl}${config.posterUrl.includes('?')?'&':'?'}v=${Date.now()}`;
    });
    img.src=posterImage.src;
    img.style.aspectRatio=`${posterImage.naturalWidth}/${posterImage.naturalHeight}`;
    shell.style.aspectRatio=`${posterImage.naturalWidth}/${posterImage.naturalHeight}`;
    workspace.hidden=false;
    setSelection(config.qrBox);
    setStatus(isRetailMaster()?'Poster loaded. Draw or adjust the QR placement box.':'Master poster loaded. Download this retailer’s print PDF when ready.');
  }catch(e){workspace.hidden=true;setStatus(e.message||'Poster preview could not load.',true);}
}

async function saveConfig(showMessage=true){
  const id=$('contest-id')?.value;if(!id)throw new Error('Save the master contest before saving the poster.');
  if(!isRetailMaster())throw new Error('Poster settings are controlled by the master retail campaign.');
  const {width,height}=printDimensions();
  const d=await api('retail-print-config',{method:'POST',body:{posterUrl:config.posterUrl,posterName:config.posterName,widthIn:width,heightIn:height,qrBox:config.qrBox}});
  applyServerConfig(d.config);
  if(showMessage)setStatus('Master poster and QR placement saved. All retailer pages now inherit it.');
  return d;
}

function applyServerConfig(c={}){
  config={
    posterUrl:c.retail_print_poster_url||'',
    posterName:c.retail_print_poster_name||'',
    widthIn:Number(c.retail_print_width_in)||8,
    heightIn:Number(c.retail_print_height_in)||12,
    qrBox:c.retail_print_qr_box||null,
    sourceContestId:c.source_contest_id||c.id||'',
    sourceName:c.source_internal_name||c.internal_name||'',
    inherited:Boolean(c.inherited)
  };
  $('retail-print-poster-url').value=config.posterUrl;
  $('retail-print-width').value=String(config.widthIn);
  $('retail-print-height').value=String(config.heightIn);
  $('retail-print-source-name').textContent=config.sourceName||'Master retail campaign';
}

async function loadConfig(id){
  if(!id||loadingId===id)return;
  loadingId=id;setStatus('Loading retail poster…');
  try{
    const d=await api('retail-print-config');
    applyServerConfig(d.config);
    if(config.posterUrl)await renderPoster();
    else{$('retail-print-workspace').hidden=true;setStatus(isRetailMaster()?'Upload a poster JPG or use the included cooler poster.':'The master campaign does not have a poster yet.');}
  }catch(e){setStatus(e.message||'Retail poster could not load.',true);}finally{loadingId='';}
}

async function uploadPoster(){
  if(!isRetailMaster())throw new Error('Upload the poster on the master retail campaign.');
  const file=$('retail-print-poster-file')?.files?.[0];
  if(!file)throw new Error('Choose a JPG first.');
  if(file.type!=='image/jpeg'&&!/\.jpe?g$/i.test(file.name))throw new Error('Upload a JPG file.');
  if(file.size>12*1024*1024)throw new Error('The JPG exceeds the 12 MB upload limit.');
  setStatus('Uploading poster JPG…');
  const r=await fetch('/api/contest-assets',{method:'POST',headers:{authorization:`Bearer ${token()}`,'content-type':'image/jpeg'},body:file});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Poster upload failed.');
  config.posterUrl=d.url;config.posterName=file.name;config.qrBox=null;
  $('retail-print-poster-url').value=config.posterUrl;
  await saveConfig(false);await renderPoster();
}

async function useIncluded(){
  if(!isRetailMaster())throw new Error('Select the master retail campaign to change its poster.');
  config.posterUrl=INCLUDED_TEMPLATE;
  config.posterName='Sueños Cooler Contest Poster - 8 × 12 in';
  config.widthIn=8;config.heightIn=12;config.qrBox={...INCLUDED_BOX};
  $('retail-print-poster-url').value=config.posterUrl;
  $('retail-print-width').value='8';$('retail-print-height').value='12';
  await saveConfig(false);await renderPoster();
  setStatus('Included 8 × 12 poster loaded. Adjust the QR box if needed, then save.');
}

async function buildRetailPdf({posterUrl,widthIn,heightIn,qrBox,entryUrl:targetUrl,retailerName,slug}){
  if(!posterUrl)throw new Error('The master campaign does not have a poster JPG yet.');
  if(!qrBox)throw new Error('The master campaign does not have a QR placement box yet.');
  if(!targetUrl)throw new Error('This retailer page does not have an entry URL yet.');
  if(!window.PDFLib)throw new Error('The PDF production library did not load. Refresh Admin and try again.');
  if(typeof window.qrcode!=='function')throw new Error('The QR generator did not load. Refresh Admin and try again.');
  const response=await fetch(posterUrl,{cache:'no-store'});if(!response.ok)throw new Error('The master poster JPG could not be downloaded.');
  const bytes=await response.arrayBuffer();
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
  const doc=await PDFDocument.create();
  const width=Math.max(72,(Number(widthIn)||8)*72),height=Math.max(72,(Number(heightIn)||12)*72);
  const page=doc.addPage([width,height]);
  const poster=await doc.embedJpg(bytes);
  const labelFont=await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawImage(poster,{x:0,y:0,width,height});
  const b=normalizedBox(qrBox),regionW=b.width*width,regionH=b.height*height,size=Math.min(regionW,regionH);
  if(size/72<1.25)throw new Error('The master QR placement is too small for reliable print scanning. Make it at least 1.25 inches square.');
  const left=b.x*width+(regionW-size)/2,bottom=height-(b.y*height+regionH)+(regionH-size)/2;
  const qr=window.qrcode(0,'M');qr.addData(targetUrl);qr.make();
  const modules=qr.getModuleCount(),quiet=4,total=modules+quiet*2,module=size/total;
  page.drawRectangle({x:left,y:bottom,width:size,height:size,color:rgb(1,1,1)});
  for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))page.drawRectangle({x:left+(col+quiet)*module,y:bottom+size-(row+quiet+1)*module,width:module+0.02,height:module+0.02,color:rgb(0,0,0)});
  const cleanedRetailer=String(retailerName||'Sueños Retailer').trim()||'Sueños Retailer';
  const labelMargin=Math.max(12,width*0.02),labelPaddingX=8,labelPaddingY=5,labelBottom=labelMargin,labelMaxWidth=Math.min(width*0.5,width-labelMargin*2);
  let labelSize=Math.max(8,Math.min(12,width/55)),labelText=cleanedRetailer;
  const fitLabel=()=>labelFont.widthOfTextAtSize(labelText,labelSize)<=Math.max(32,labelMaxWidth-labelPaddingX*2);
  while(labelSize>8&&!fitLabel())labelSize-=0.5;
  if(!fitLabel())while(labelText.length>3&&!fitLabel())labelText=`${labelText.slice(0,-2).trim()}…`;
  const labelTextWidth=Math.min(labelFont.widthOfTextAtSize(labelText,labelSize),labelMaxWidth-labelPaddingX*2),labelWidth=Math.min(labelMaxWidth,labelTextWidth+labelPaddingX*2),labelHeight=labelSize+labelPaddingY*2;
  page.drawRectangle({x:labelMargin,y:labelBottom,width:labelWidth,height:labelHeight,color:rgb(1,1,1),opacity:0.88,borderWidth:0.75,borderColor:rgb(0.82,0.82,0.82)});
  page.drawText(labelText,{x:labelMargin+labelPaddingX,y:labelBottom+labelPaddingY,size:labelSize,font:labelFont,color:rgb(0.12,0.12,0.12)});
  doc.setTitle(`${cleanedRetailer} Contest Poster`);doc.setSubject(`Retail contest QR poster for ${targetUrl}`);doc.setCreator('Sueños Retail Contest Admin');
  const output=await doc.save({useObjectStreams:false,addDefaultPage:false});
  const blob=new Blob([output],{type:'application/pdf'}),download=document.createElement('a'),objectUrl=URL.createObjectURL(blob);
  download.href=objectUrl;download.download=`suenos-${slugify(cleanedRetailer||slug)}-contest-poster-print.pdf`;download.click();setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
}

async function downloadForContest(contest){
  if(!contest?.id)throw new Error('Retailer contest is missing its ID.');
  const r=await fetch(`/api/contest-admin?action=retail-print-config&id=${encodeURIComponent(contest.id)}`,{headers:{authorization:`Bearer ${token()}`},cache:'no-store'});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Could not load the master poster configuration.');
  const c=d.config||{};
  return buildRetailPdf({posterUrl:c.retail_print_poster_url,widthIn:c.retail_print_width_in,heightIn:c.retail_print_height_in,qrBox:c.retail_print_qr_box,entryUrl:contest.entryUrl,retailerName:contest.retailerName||c.request_retailer_name,slug:contest.slug||c.request_slug});
}
window.SuenosRetailPoster={...(window.SuenosRetailPoster||{}),downloadForContest};

async function generatePdf(){
  if(!isRetailChild())throw new Error('Open a retailer sub-contest to generate its unique print PDF.');
  if(!config.posterUrl)throw new Error('The master campaign does not have a poster JPG yet.');
  if(!config.qrBox)throw new Error('The master campaign does not have a QR placement box yet.');
  const url=entryUrl();if(!url)throw new Error('Save the retailer page so its unique entry URL is available.');
  if(!window.PDFLib)throw new Error('The PDF production library did not load. Refresh Admin and try again.');
  if(typeof window.qrcode!=='function')throw new Error('The QR generator did not load. Refresh Admin and try again.');
  setStatus('Building this retailer’s full-size print PDF…');

  const response=await fetch(config.posterUrl,{cache:'no-store'});if(!response.ok)throw new Error('The master poster JPG could not be downloaded.');
  const bytes=await response.arrayBuffer();
  const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
  const doc=await PDFDocument.create();
  const width=Math.max(72,config.widthIn*72),height=Math.max(72,config.heightIn*72);
  const page=doc.addPage([width,height]);
  const poster=await doc.embedJpg(bytes);
  const labelFont=await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawImage(poster,{x:0,y:0,width,height});

  const b=normalizedBox(config.qrBox),regionW=b.width*width,regionH=b.height*height,size=Math.min(regionW,regionH);
  if(size/72<1.25)throw new Error('The master QR placement is too small for reliable print scanning. Make it at least 1.25 inches square.');
  const left=b.x*width+(regionW-size)/2;
  const bottom=height-(b.y*height+regionH)+(regionH-size)/2;
  const qr=window.qrcode(0,'M');qr.addData(url);qr.make();
  const modules=qr.getModuleCount(),quiet=4,total=modules+quiet*2,module=size/total;
  page.drawRectangle({x:left,y:bottom,width:size,height:size,color:rgb(1,1,1)});
  for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))page.drawRectangle({x:left+(col+quiet)*module,y:bottom+size-(row+quiet+1)*module,width:module+0.02,height:module+0.02,color:rgb(0,0,0)});

  const retailer=$('contest-retailer-name')?.value||'Sueños Retailer';
  const cleanedRetailer=String(retailer||'').trim()||'Sueños Retailer';
  const labelMargin=Math.max(12,width*0.02);
  const labelPaddingX=8;
  const labelPaddingY=5;
  const labelBottom=labelMargin;
  const labelMaxWidth=Math.min(width*0.5,width-labelMargin*2);
  let labelSize=Math.max(8,Math.min(12,width/55));
  let labelText=cleanedRetailer;
  const fitLabel=()=>labelFont.widthOfTextAtSize(labelText,labelSize)<=Math.max(32,labelMaxWidth-labelPaddingX*2);
  while(labelSize>8&&!fitLabel())labelSize-=0.5;
  if(!fitLabel()){
    while(labelText.length>3&&!fitLabel())labelText=`${labelText.slice(0,-2).trim()}…`;
  }
  const labelTextWidth=Math.min(labelFont.widthOfTextAtSize(labelText,labelSize),labelMaxWidth-labelPaddingX*2);
  const labelWidth=Math.min(labelMaxWidth,labelTextWidth+labelPaddingX*2);
  const labelHeight=labelSize+labelPaddingY*2;
  page.drawRectangle({x:labelMargin,y:labelBottom,width:labelWidth,height:labelHeight,color:rgb(1,1,1),opacity:0.88,borderWidth:0.75,borderColor:rgb(0.82,0.82,0.82)});
  page.drawText(labelText,{x:labelMargin+labelPaddingX,y:labelBottom+labelPaddingY,width:labelWidth-labelPaddingX*2,height:labelSize,size:labelSize,font:labelFont,color:rgb(0.12,0.12,0.12)});

  doc.setTitle(`${cleanedRetailer} Contest Poster`);
  doc.setSubject(`Retail contest QR poster for ${url}`);
  doc.setCreator('Sueños Retail Contest Admin');
  const output=await doc.save({useObjectStreams:false,addDefaultPage:false});
  const blob=new Blob([output],{type:'application/pdf'}),download=document.createElement('a'),objectUrl=URL.createObjectURL(blob);
  download.href=objectUrl;
  download.download=`suenos-${slugify(retailer||$('contest-slug')?.value)}-contest-poster-print.pdf`;
  download.click();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
  setStatus(`Print-ready PDF downloaded for ${retailer}.`);
}

function pointerPosition(event){
  const shell=$('retail-print-canvas-shell'),r=shell.getBoundingClientRect();
  return{x:clamp((event.clientX-r.left)/r.width),y:clamp((event.clientY-r.top)/r.height)};
}

function bindDrawing(){
  const shell=$('retail-print-canvas-shell');
  shell.addEventListener('pointerdown',e=>{
    if(!isRetailMaster()||e.button!==0||!config.posterUrl)return;
    drawStart=pointerPosition(e);shell.setPointerCapture(e.pointerId);
    setSelection({x:drawStart.x,y:drawStart.y,width:.03,height:.03});e.preventDefault();
  });
  shell.addEventListener('pointermove',e=>{
    if(!drawStart||!isRetailMaster())return;
    const p=pointerPosition(e),x=Math.min(drawStart.x,p.x),y=Math.min(drawStart.y,p.y),width=Math.abs(p.x-drawStart.x),height=Math.abs(p.y-drawStart.y);
    setSelection({x,y,width:Math.max(.03,width),height:Math.max(.03,height)});
  });
  const finish=e=>{if(!drawStart)return;drawStart=null;try{shell.releasePointerCapture(e.pointerId)}catch{};updateReadout();};
  shell.addEventListener('pointerup',finish);shell.addEventListener('pointercancel',finish);
}

function bindPanel(){
  bindDrawing();
  $('retail-print-upload').addEventListener('click',()=>uploadPoster().catch(e=>setStatus(e.message,true)));
  $('retail-print-use-sample').addEventListener('click',()=>useIncluded().catch(e=>setStatus(e.message,true)));
  $('retail-print-width').addEventListener('input',()=>{config.widthIn=printDimensions().width;updateReadout();});
  $('retail-print-height').addEventListener('input',()=>{config.heightIn=printDimensions().height;updateReadout();});
  $('retail-print-clear').addEventListener('click',()=>{config.qrBox=null;setSelection(null);setStatus('Placement cleared. Draw a new QR box.');});
  $('retail-print-save').addEventListener('click',()=>saveConfig().catch(e=>setStatus(e.message,true)));
  $('retail-print-generate').addEventListener('click',()=>generatePdf().catch(e=>setStatus(e.message,true)));
  window.addEventListener('resize',()=>{setSelection(config.qrBox);});
}

function resetState(){
  config={posterUrl:'',posterName:'',widthIn:8,heightIn:12,qrBox:null,sourceContestId:'',sourceName:'',inherited:false};
  posterImage=null;
  const workspace=$('retail-print-workspace');if(workspace)workspace.hidden=true;
}

function watchEditor(){
  setInterval(()=>{
    updatePanelVisibility();
    const editor=$('contest-editor'),id=$('contest-id')?.value||'',isRetail=$('contest-type')?.value==='retail';
    if(!editor?.hidden&&isRetail&&id&&id!==activeId){activeId=id;resetState();loadConfig(id);}
    if(id!==activeId&&!id){activeId='';resetState();}
    renderQrPreview();
  },350);
}

installPanel();watchEditor();
