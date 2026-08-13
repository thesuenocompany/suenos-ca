(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmtDate=(v,tz='America/Vancouver',opts={dateStyle:'long'})=>v?new Intl.DateTimeFormat('en-CA',{...opts,timeZone:tz}).format(new Date(v)):'';
const money=v=>v?new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD',maximumFractionDigits:0}).format(v):'';
const ASSET='/assets/images/contest-scrapbook/';
const exactLogo=ASSET+'suenos-logo-exact.png';
const exactSunfest=ASSET+'sunfest-logo-exact.png';
const realCooler=ASSET+'emergency-cooler-real.png';
const paperBg=ASSET+'photo-story-background.png';
const finalHero=ASSET+'sunfest-contest-hero-final.png';
const TURNSTILE_SITE_KEY='0x4AAAAAAD9MP21ca7C8BGsS';
const prizePanel=ASSET+'prize-panel-premium.png';

async function uploadPhoto(file,status){
  const fd=new FormData(); fd.append('photo',file); status.textContent='Uploading photo…';
  const r=await fetch('/api/contest-entry-photo',{method:'POST',body:fd});
  const d=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.message||'Photo upload failed.');
  status.textContent='Photo ready.';
  return d;
}
function gallery(entries){
  if(!entries.length) return `<div class="ps-empty"><div class="ps-empty-frames" aria-hidden="true"><span></span><span></span><span></span></div><h3>The first pages are waiting.</h3><p>Approved Sunfest memories will appear here after moderation.</p></div>`;
  return entries.map((e,i)=>`<figure class="ps-photo ps-photo-${i%6}"><span class="ps-tack"></span><img loading="lazy" src="/api/contest-gallery-image?id=${encodeURIComponent(e.id)}" alt="${esc(e.public_alt_text||'Approved Sunfest contest memory')}"><figcaption>${esc(e.public_caption||e.memory_text||'Sunfest memory')}${e.public_display_name?`<small>${esc(e.public_display_name)}</small>`:''}</figcaption></figure>`).join('');
}

window.renderPhotoStoryContest=async function(page,c,track){
  document.body.classList.add('photo-story-contest-page');
  const active=c.state==='live', coming=c.state==='scheduled';
  let entries=[];
  try{const r=await fetch(`/api/contest-gallery?slug=${encodeURIComponent(c.slug)}`,{cache:'no-store'});if(r.ok)entries=(await r.json()).entries||[];}catch{}
  const hero=c.desktop_hero_url||'/assets/images/sunfest-hero-desktop-graphic.png';
  const mobile=c.mobile_hero_url||hero;
  const prize=c.prize_image_url||realCooler;
  const festivalStart=c.festival_start_at?fmtDate(c.festival_start_at,c.timezone,{month:'long',day:'numeric'}):'July 30';
  const festivalEnd=c.festival_end_at?fmtDate(c.festival_end_at,c.timezone,{month:'long',day:'numeric',year:'numeric'}):'August 2, 2026';

  page.className='contest-page photo-story-page';
  page.innerHTML=`<article class="ps-shell" style="--ps-paper:url('${paperBg}')">
    <section class="ps-hero ps-hero-final">
      <a class="ps-hero-link" href="#enter" aria-label="Enter the Sunfest photo contest">
        <img class="ps-hero-final-image" src="${finalHero}" alt="Sueños x Sunfest Photo Contest. Win a Sueños Margarita Emergency Cooler.">
      </a>
    </section>

    <section id="prize" class="ps-prize">
      <div class="ps-prize-art">
        <img src="${prizePanel}" alt="Win a Sueños Margarita Emergency Cooler">
      </div>
      <div class="ps-prize-notes">
        <div class="ps-prize-card">
          <p class="ps-kicker">Prize details</p>
          <h3>${esc(c.prize_title||'Sueños Margarita Emergency Cooler')}</h3>
          <p>${esc(c.prize_description||'A custom Sueños cooler built for margarita emergencies, festival weekends and backyard gatherings.')}</p>
          <div class="ps-prize-meta"><strong>${money(c.prize_value)||'$200'} approximate retail value</strong><span>Alcohol, festival admission, transportation and accommodation are not included.</span></div>
          <div class="ps-prize-actions">
            <a class="ps-prize-button" href="#enter">Enter to win</a>
            <a class="ps-prize-link" href="#rules">Official Rules</a>
          </div>
        </div>
      </div>
    </section>

    <section id="enter" class="ps-entry"><div class="ps-entry-intro"><p class="ps-kicker">ENTER TO WIN</p><h2>Put your memory in the album.</h2><p>${esc(c.intro_copy||'Upload a favourite Sunfest photo and tell us what was happening.')}</p><ul><li>Photo entries are reviewed before appearing publicly.</li><li>Your email is never shown in the gallery.</li><li>No purchase or festival ticket is required.</li></ul>${!active?`<div class="ps-status">${coming?`Entries open ${esc(fmtDate(c.start_at,c.timezone,{dateStyle:'long',timeStyle:'short'}))}.`:'Entries are closed.'}</div>`:''}</div>
      <div class="ps-entry-form">${active?`<div id="ps-errors" class="ps-errors" role="alert"></div><form id="ps-form" novalidate>
        <div><label for="ps-first">First name</label><input id="ps-first" name="firstName" autocomplete="given-name" required></div><div><label for="ps-last">Last name</label><input id="ps-last" name="lastName" autocomplete="family-name" required></div>
        <div class="full"><label for="ps-email">Email</label><input id="ps-email" name="email" type="email" autocomplete="email" required></div>
        <div class="full"><label for="ps-display">Public display name or handle</label><input id="ps-display" name="publicDisplayName" maxlength="80" placeholder="Optional"></div>
        <div class="full"><label for="ps-memory">Caption or memory</label><textarea id="ps-memory" name="memoryText" required placeholder="Tell us about the moment…"></textarea></div>
        <div class="full"><label for="ps-photo">Photo</label><div id="ps-drop" class="ps-drop"><input id="ps-photo" type="file" accept="image/jpeg,image/png,image/webp"><p>Choose a photo from your library, take a new photo, or browse files. JPG, PNG or WebP up to 10 MB.</p><img id="ps-preview" alt="Selected photo preview"><button id="ps-remove" type="button" hidden>Remove photo</button></div></div>
        <div><label for="ps-city">City</label><input id="ps-city" name="city" required></div><div><label for="ps-postal">Postal code</label><input id="ps-postal" name="postalCode" required></div>
        <div class="full"><label for="ps-province">Province or territory</label><select id="ps-province" name="province" required><option value="">Select</option>${['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU'].map(x=>`<option>${x}</option>`).join('')}</select></div>
        <label class="ps-check full"><input type="checkbox" name="rulesConfirmed" required><span>I confirm I am eligible and agree to the Official Rules.</span></label>
        <label class="ps-check full"><input type="checkbox" name="photoRightsConfirmed" required><span>${esc(c.photo_rights_text||'I confirm that I took or own this photo and have permission from every identifiable person shown. I grant Sueños permission to display the approved submission as described in the Official Rules.')}</span></label>
        ${c.marketing_enabled?`<label class="ps-check full"><input type="checkbox" name="marketingConsent"><span>${esc(c.marketing_consent_text)}</span></label>`:''}
        <div class="full ps-verification-wrap"><label>Verification</label><div id="ps-turnstile"></div><p id="ps-turnstile-help" class="ps-turnstile-help">Complete the verification before submitting.</p></div><input class="ps-hidden" name="website" tabindex="-1" autocomplete="off"><input type="hidden" name="entryType" value="photo"><input type="hidden" name="formStartedAt" value="${Date.now()}">
        <button class="ps-submit full" type="submit">Submit entry</button><p id="ps-status" class="full" aria-live="polite"></p><p class="ps-small full">${esc(c.abbreviated_rules||'No purchase necessary. Open to eligible Canadian residents aged 19 or older. A skill-testing question is required.')}</p>
      </form>`:`<div class="ps-status">${coming?'Coming soon.':'Contest closed.'}</div>`}</div>
    </section>

    <section id="memories" class="ps-gallery">
      <div class="ps-gallery-header">
        <p class="ps-kicker">THE PUBLIC ALBUM</p>
        <h2>${esc(c.gallery_heading||'Sunfest Memories')}</h2>
        <p>${esc(c.gallery_subheading||'Approved photos from the Sueños community.')}</p>
      </div>
      <div class="ps-gallery-stage">
        <div class="ps-gallery-grid">${gallery(entries)}</div>
      </div>
    </section>

    <section id="rules" class="ps-bottom"><div><h2>FAQ</h2><details><summary>Will every photo appear publicly?</summary><p>No. Entries are moderated before being added to the album.</p></details><details><summary>Is alcohol included in the prize?</summary><p>No. Alcohol and other beverages are excluded.</p></details><details><summary>Do I need to attend Sunfest?</summary><p>No. See the Official Rules for complete entry and eligibility details.</p></details></div><div><h2>Official Rules</h2><div class="ps-rules">${c.full_rules_html||'<p>Official Rules will be published before entries open.</p>'}</div></div></section>

  </article>`;

  const form=document.getElementById('ps-form'); if(!form)return;
  const file=document.getElementById('ps-photo');
  const preview=document.getElementById('ps-preview');
  const remove=document.getElementById('ps-remove');
  const drop=document.getElementById('ps-drop');
  const status=document.getElementById('ps-status');
  const turnstileHelp=document.getElementById('ps-turnstile-help');
  const button=form.querySelector('button[type=submit]');
  let uploaded=null;
  let uploadPromise=null;
  let turnstileWidgetId=null;
  let turnstileAttempts=0;
  let pendingSubmit=false;
  let submitRetries=0;

  const setStatus=message=>{if(status)status.textContent=message||'';};
  const resetTurnstile=message=>{
    pendingSubmit=false;
    if(turnstileHelp)turnstileHelp.textContent=message||'Verification will run when you submit.';
    try{if(window.turnstile&&turnstileWidgetId!==null)window.turnstile.reset(turnstileWidgetId);}catch{}
  };

  const postEntry=async token=>{
    try{
      const fd=new FormData(form),p=new URLSearchParams(location.search),payload=Object.fromEntries(fd.entries());
      Object.assign(payload,{slug:c.slug,entryType:'photo',photoAssetKey:uploaded.key,photoMime:uploaded.mime,photoSize:uploaded.size,photoRightsConfirmed:fd.get('photoRightsConfirmed')==='on',photoRightsVersion:c.photo_rights_version||'1.0',ageConfirmed:true,rulesConfirmed:fd.get('rulesConfirmed')==='on',marketingConsent:fd.get('marketingConsent')==='on',turnstileToken:token,utmSource:p.get('utm_source'),utmMedium:p.get('utm_medium'),utmCampaign:p.get('utm_campaign'),utmContent:p.get('utm_content'),referrer:document.referrer});
      setStatus('Saving your entry…');
      const r=await fetch('/api/contests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw Object.assign(new Error(d.message||'Entry could not be submitted.'),{code:d.code||'',turnstileError:d.turnstileError||''});
      if(typeof track==='function')track('contest_entry_success',c);
      form.outerHTML=`<div class="ps-success"><h2>${esc(d.confirmation?.heading||'You’re in.')}</h2><p>${esc(d.confirmation?.message||'Your memory has been received and is awaiting moderation.')}</p><p class="ps-success-note">Your photo is pending approval before it appears in the public album.</p></div>`;
    }catch(err){
      button.disabled=false;
      pendingSubmit=false;
      const retryable=err.code==='turnstile'&&(err.turnstileError==='timeout-or-duplicate'||err.turnstileError==='invalid-input-response');
      resetTurnstile(retryable?'Verification refreshed. Tap Submit Entry once more.':'Verification will run again when you retry.');
      if(retryable&&submitRetries<1){
        submitRetries+=1;
        setStatus('Verification expired while the photo was processing. Tap Submit Entry once more. Your photo is already uploaded.');
      }else{
        const detail=err.turnstileError?` (${err.turnstileError})`:'';
        setStatus((err.message||'Entry could not be submitted.')+detail);
      }
    }
  };

  const renderTurnstile=()=>{
    if(turnstileWidgetId!==null)return;
    if(!window.turnstile?.render){
      turnstileAttempts+=1;
      if(turnstileAttempts<120){setTimeout(renderTurnstile,100);return;}
      if(turnstileHelp)turnstileHelp.textContent='Verification could not load. Refresh the page and try again.';
      return;
    }
    try{
      turnstileWidgetId=window.turnstile.render('#ps-turnstile',{
        sitekey:TURNSTILE_SITE_KEY,
        action:'contest-photo',
        execution:'execute',
        appearance:'interaction-only',
        'refresh-expired':'auto',
        callback:token=>{
          if(turnstileHelp)turnstileHelp.textContent='Verification complete. Finishing your entry…';
          if(pendingSubmit)postEntry(token);
        },
        'expired-callback':()=>{
          if(turnstileHelp)turnstileHelp.textContent='Verification expired. Tap Submit Entry again.';
          pendingSubmit=false;
          button.disabled=false;
        },
        'error-callback':code=>{
          if(turnstileHelp)turnstileHelp.textContent='Verification could not be completed. Tap Submit Entry again.';
          pendingSubmit=false;
          button.disabled=false;
          setStatus(code?`Verification error ${code}. Please try again.`:'Verification could not be completed. Please try again.');
          return true;
        }
      });
      if(turnstileHelp)turnstileHelp.textContent='Verification will run when you submit.';
    }catch{
      if(turnstileHelp)turnstileHelp.textContent='Verification could not load. Refresh the page and try again.';
    }
  };
  renderTurnstile();

  const beginUpload=async f=>{
    if(!f)return null;
    if(f.size>10*1024*1024)throw new Error('Photo must be 10 MB or smaller.');
    if(!['image/jpeg','image/png','image/webp'].includes(f.type))throw new Error('Use a JPG, PNG or WebP image.');
    uploaded=null;
    setStatus('Uploading photo…');
    const result=await uploadPhoto(f,status);
    uploaded=result;
    setStatus('Photo ready. Complete the form and submit.');
    return result;
  };

  const show=f=>{
    if(!f)return;
    if(f.size>10*1024*1024){setStatus('Photo must be 10 MB or smaller.');file.value='';return;}
    if(!['image/jpeg','image/png','image/webp'].includes(f.type)){setStatus('Use a JPG, PNG or WebP image.');file.value='';return;}
    preview.src=URL.createObjectURL(f);
    preview.style.display='block';
    remove.hidden=false;
    uploadPromise=beginUpload(f).catch(err=>{uploaded=null;setStatus(err.message);throw err;});
  };

  file.addEventListener('change',()=>show(file.files[0]));
  remove.addEventListener('click',()=>{
    file.value='';preview.removeAttribute('src');preview.style.display='none';remove.hidden=true;uploaded=null;uploadPromise=null;setStatus('');
  });
  ['dragenter','dragover'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('drag')}));
  ['dragleave','drop'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('drag')}));
  drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f){const d=new DataTransfer();d.items.add(f);file.files=d.files;show(f)}});

  form.addEventListener('submit',async e=>{
    e.preventDefault();
    const errors=[];
    if(!file.files[0])errors.push('Choose a photo.');
    if(!form.reportValidity())errors.push('Complete the required fields.');
    const box=document.getElementById('ps-errors');
    if(errors.length){
      box.style.display='block';
      box.innerHTML='<strong>Please correct:</strong><ul>'+errors.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
      box.scrollIntoView({behavior:'smooth',block:'center'});
      return;
    }
    box.style.display='none';
    button.disabled=true;
    pendingSubmit=false;
    try{
      if(uploadPromise)await uploadPromise;
      if(!uploaded)uploaded=await beginUpload(file.files[0]);
      if(turnstileWidgetId===null||!window.turnstile?.execute)throw new Error('Verification is not ready. Refresh the page and try again.');
      pendingSubmit=true;
      setStatus('Verifying and submitting…');
      window.turnstile.execute(turnstileWidgetId);
    }catch(err){
      pendingSubmit=false;
      button.disabled=false;
      setStatus(err.message||'Entry could not be submitted.');
    }
  });

};
})();
