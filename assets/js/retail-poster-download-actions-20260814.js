(()=>{
  const TOKEN_KEY='suenos-hotline-admin-token-v3';
  const token=()=>sessionStorage.getItem(TOKEN_KEY)||'';
  const clamp=(v,min=0,max=1)=>Math.max(min,Math.min(max,Number(v)||0));
  const slugify=v=>String(v||'retailer').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'retailer';

  function enhanceRows(){
    document.querySelectorAll('button[data-download-poster]').forEach(button=>{
      if(button.textContent.trim()==='Poster')button.textContent='8 × 12';
      const id=button.dataset.downloadPoster;
      if(!id||button.parentElement?.querySelector(`button[data-download-poster-11x17="${CSS.escape(id)}"]`))return;
      const second=document.createElement('button');
      second.type='button';
      second.className='admin-btn admin-btn-secondary';
      second.dataset.downloadPoster11x17=id;
      second.textContent='11 × 17';
      second.title='Download this retailer’s 11 × 17 poster with its unique QR code';
      button.insertAdjacentElement('afterend',second);
    });
  }

  async function configFor(id){
    const response=await fetch(`/api/contest-print-11x17?id=${encodeURIComponent(id)}`,{
      headers:{authorization:`Bearer ${token()}`},
      cache:'no-store'
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.message||'Could not load the 11 × 17 poster configuration.');
    return data.config||{};
  }

  function targetUrl(c){
    const slug=String(c.request_slug||'').trim();
    if(!slug)return'';
    const code=String(c.request_retailer_code||slug).trim()||slug;
    return `${location.origin}/en-ca/contests/${encodeURIComponent(slug)}/?utm_source=retailer_qr&utm_medium=offline&utm_campaign=retail_contest&utm_content=${encodeURIComponent(code)}`;
  }

  async function build11x17(id){
    if(!window.PDFLib||typeof window.qrcode!=='function')throw new Error('The PDF or QR library is unavailable. Refresh Admin and try again.');
    const c=await configFor(id);
    const posterUrl=c.retail_print_11x17_poster_url||'';
    const box=c.retail_print_11x17_qr_box||null;
    if(!posterUrl)throw new Error('The master campaign does not have an 11 × 17 poster configured yet.');
    if(!box)throw new Error('The master campaign does not have an 11 × 17 QR placement configured yet.');
    const url=targetUrl(c);
    if(!url)throw new Error('This retailer page does not have a usable contest URL yet.');

    const imageResponse=await fetch(posterUrl,{cache:'no-store'});
    if(!imageResponse.ok)throw new Error('The inherited 11 × 17 poster could not be downloaded.');
    const bytes=await imageResponse.arrayBuffer();
    const {PDFDocument,rgb}=window.PDFLib;
    const doc=await PDFDocument.create();
    const width=11*72,height=17*72;
    const page=doc.addPage([width,height]);
    const poster=await doc.embedJpg(bytes);
    page.drawImage(poster,{x:0,y:0,width,height});

    const x=clamp(box.x),y=clamp(box.y),w=clamp(box.width,.03,1-x),h=clamp(box.height,.03,1-y);
    const regionW=w*width,regionH=h*height,size=Math.min(regionW,regionH);
    if(size/72<1.25)throw new Error('The master 11 × 17 QR placement is too small for reliable print scanning.');
    const left=x*width+(regionW-size)/2;
    const bottom=height-(y*height+regionH)+(regionH-size)/2;
    const qr=window.qrcode(0,'M');
    qr.addData(url);qr.make();
    const modules=qr.getModuleCount(),quiet=4,total=modules+quiet*2,module=size/total;
    page.drawRectangle({x:left,y:bottom,width:size,height:size,color:rgb(1,1,1)});
    for(let row=0;row<modules;row++)for(let col=0;col<modules;col++)if(qr.isDark(row,col))page.drawRectangle({x:left+(col+quiet)*module,y:bottom+size-(row+quiet+1)*module,width:module+.02,height:module+.02,color:rgb(0,0,0)});

    const retailer=String(c.request_retailer_name||'Sueños Retailer').trim()||'Sueños Retailer';
    doc.setTitle(`${retailer} 11 × 17 Contest Poster`);
    doc.setSubject(`Retail contest QR poster for ${url}`);
    doc.setCreator('Sueños Retail Contest Admin');
    const output=await doc.save({useObjectStreams:false});
    const blob=new Blob([output],{type:'application/pdf'}),a=document.createElement('a'),objectUrl=URL.createObjectURL(blob);
    a.href=objectUrl;
    a.download=`suenos-${slugify(retailer)}-contest-poster-11x17.pdf`;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(objectUrl),1500);
  }

  document.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-download-poster-11x17]');
    if(!button)return;
    event.preventDefault();
    event.stopPropagation();
    const original=button.textContent;
    button.disabled=true;
    button.textContent='Building…';
    try{await build11x17(button.dataset.downloadPoster11x17);}
    catch(error){alert(error.message||'11 × 17 poster download failed.');}
    finally{button.disabled=false;button.textContent=original;}
  },true);

  document.addEventListener('suenos:admin-authenticated',()=>setTimeout(enhanceRows,300));
  document.addEventListener('suenos:admin-section',event=>{if(event.detail?.section==='contests')setTimeout(enhanceRows,300);});
  document.addEventListener('click',event=>{if(event.target.closest('[data-admin-tab="contests"],#contest-editor-close'))setTimeout(enhanceRows,350);});
  setInterval(enhanceRows,1200);
  enhanceRows();
})();
