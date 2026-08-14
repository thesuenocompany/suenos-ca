(()=>{
  const MODULE_URL='/assets/js/retail-print-poster-11x17-20260814.js?v=20260814d';
  let loading11x17=false;

  const setText=(element,text)=>{if(element&&element.textContent!==text)element.textContent=text;};

  function addStyles(){
    if(document.getElementById('retail-poster-format-styles'))return;
    const style=document.createElement('style');
    style.id='retail-poster-format-styles';
    style.textContent=`
      .retail-poster-formats{margin:14px 0 18px;padding:16px;border:1px solid #d8dedc;border-radius:12px;background:#f7f9f8}
      .retail-poster-formats-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:12px}
      .retail-poster-formats-head h4{margin:0 0 4px;font-size:17px;color:#17211f}
      .retail-poster-formats-head p{margin:0;color:#5c6865;font-size:13px;line-height:1.45}
      .retail-poster-format-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .retail-poster-format-card{display:flex;flex-direction:column;gap:10px;min-height:145px;padding:16px;border:1px solid #d7dddb;border-radius:10px;background:#fff}
      .retail-poster-format-card.is-primary{border-color:#f26522;box-shadow:0 0 0 1px rgba(242,101,34,.08)}
      .retail-poster-format-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .retail-poster-format-size{font-size:20px;font-weight:800;line-height:1;color:#17211f}
      .retail-poster-format-label{margin-top:5px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#66726f}
      .retail-poster-format-card p{margin:0;color:#5c6865;font-size:13px;line-height:1.45;flex:1}
      .retail-poster-format-status{display:inline-flex;align-items:center;padding:4px 7px;border-radius:999px;background:#eef2f1;color:#53605d;font-size:11px;font-weight:800;white-space:nowrap}
      .retail-poster-format-status.is-ready{background:#e7f4ee;color:#176543}
      .retail-poster-format-card .admin-btn{align-self:flex-start}
      @media(max-width:760px){.retail-poster-format-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function isRetailMaster(){
    return document.getElementById('contest-type')?.value==='retail'&&Boolean(document.getElementById('contest-retail-master')?.checked);
  }

  function relabelEightByTwelve(){
    if(!isRetailMaster())return;
    setText(document.getElementById('retail-print-title'),'8 × 12 Poster & QR');
    setText(document.getElementById('retail-print-description'),'Your current 8 × 12 poster. Upload or replace the artwork here and set its QR placement.');
    setText(document.querySelector('label[for="retail-print-poster-file"]'),'8 × 12 poster JPG');
    setText(document.getElementById('retail-print-upload'),'Upload / Replace 8 × 12 Poster');
    setText(document.getElementById('retail-print-save'),'Save 8 × 12 Poster & Placement');
  }

  function ensurePicker(){
    const panel=document.getElementById('retail-print-designer');
    if(!panel)return;
    addStyles();
    let picker=document.getElementById('retail-poster-format-picker');
    if(!picker){
      picker=document.createElement('section');
      picker.id='retail-poster-format-picker';
      picker.className='retail-poster-formats';
      picker.innerHTML=`
        <div class="retail-poster-formats-head">
          <div><h4>Poster formats</h4><p>The master can hold both poster sizes. Each size has its own artwork and QR placement, and every retailer page inherits both.</p></div>
        </div>
        <div class="retail-poster-format-grid">
          <article class="retail-poster-format-card">
            <div class="retail-poster-format-top"><div><div class="retail-poster-format-size">8 × 12</div><div class="retail-poster-format-label">Current poster</div></div><span id="retail-poster-8x12-status" class="retail-poster-format-status">Checking…</span></div>
            <p>The original retail poster format. Its existing artwork and QR box remain exactly as configured.</p>
            <button type="button" class="admin-btn admin-btn-secondary" id="retail-poster-open-8x12">Edit 8 × 12</button>
          </article>
          <article class="retail-poster-format-card is-primary">
            <div class="retail-poster-format-top"><div><div class="retail-poster-format-size">11 × 17</div><div class="retail-poster-format-label">Second poster size</div></div><span id="retail-poster-11x17-status" class="retail-poster-format-status">Optional</span></div>
            <p>Upload a separate 11 × 17 poster and draw its own QR box. Existing retailer contests will inherit it automatically.</p>
            <button type="button" class="admin-btn admin-btn-primary" id="retail-poster-open-11x17">Set up 11 × 17</button>
          </article>
        </div>`;
      const heading=panel.querySelector('.retail-print-heading');
      if(heading)heading.insertAdjacentElement('afterend',picker);else panel.prepend(picker);
      picker.querySelector('#retail-poster-open-8x12')?.addEventListener('click',()=>{
        document.getElementById('retail-print-master-controls')?.scrollIntoView({behavior:'smooth',block:'start'});
      });
      picker.querySelector('#retail-poster-open-11x17')?.addEventListener('click',open11x17);
    }
    picker.hidden=!isRetailMaster();
    if(!picker.hidden){relabelEightByTwelve();updateStatus();}
  }

  function updateStatus(){
    const s8=document.getElementById('retail-poster-8x12-status');
    if(s8){
      const ready=Boolean(document.getElementById('retail-print-poster-url')?.value);
      setText(s8,ready?'Configured':'Not configured');
      s8.classList.toggle('is-ready',ready);
    }
    const s11=document.getElementById('retail-poster-11x17-status');
    const panel11=document.getElementById('retail-print-11x17-designer');
    const url11=document.getElementById('retail-print-11x17-url')?.value||'';
    if(s11){
      if(url11){setText(s11,'Configured');s11.classList.add('is-ready');}
      else if(panel11){setText(s11,'Ready to configure');s11.classList.remove('is-ready');}
      else{setText(s11,'Optional');s11.classList.remove('is-ready');}
    }
  }

  async function open11x17(){
    if(loading11x17)return;
    const button=document.getElementById('retail-poster-open-11x17');
    const original=button?.textContent||'Set up 11 × 17';
    loading11x17=true;
    if(button){button.disabled=true;button.textContent='Opening 11 × 17…';}
    try{
      await import(MODULE_URL);
      let panel=null;
      for(let i=0;i<20&&!panel;i++){
        panel=document.getElementById('retail-print-11x17-designer');
        if(!panel)await new Promise(resolve=>setTimeout(resolve,75));
      }
      if(!panel)throw new Error('The 11 × 17 poster editor did not open. Refresh Admin and try again.');
      panel.hidden=false;
      panel.scrollIntoView({behavior:'smooth',block:'start'});
      updateStatus();
      if(button)button.textContent='Open 11 × 17 Setup';
    }catch(error){
      console.error('11x17 poster setup',error);
      alert(error.message||'The 11 × 17 poster editor could not be opened.');
      if(button)button.textContent=original;
    }finally{
      loading11x17=false;
      if(button)button.disabled=false;
    }
  }

  const refreshSoon=()=>setTimeout(()=>{ensurePicker();updateStatus();},120);
  document.addEventListener('change',event=>{
    if(event.target?.id==='contest-type'||event.target?.id==='contest-retail-master')refreshSoon();
  });
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-edit],[data-retail-summary-edit],[data-contest-step="retail"],button[data-step="retail"]'))refreshSoon();
  });
  setInterval(()=>{ensurePicker();updateStatus();},1200);
  ensurePicker();
})();
