(()=>{
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const logo='/assets/images/contest-scrapbook/suenos-logo-exact.png';
const sunfest='/assets/images/contest-scrapbook/sunfest-logo-exact.png';
const journalBg='/assets/images/contest-scrapbook/journal-bg.png';
const noteCard='/assets/images/contest-scrapbook/note-card.png';
const prizeTicket='/assets/images/contest-scrapbook/prize-ticket.png';
const ribbonMemories='/assets/images/contest-scrapbook/ribbon-memories.png';
const ribbonMargarita='/assets/images/contest-scrapbook/ribbon-margarita.png';
const ribbonFavourites='/assets/images/contest-scrapbook/ribbon-favourites.png';
const ribbonCowboy='/assets/images/contest-scrapbook/ribbon-cowboy.png';
const memoriesCollage='/assets/images/contest-scrapbook/memories-collage.png';

const dateTime=(v,tz='America/Vancouver')=>v?new Intl.DateTimeFormat('en-CA',{dateStyle:'long',timeStyle:'short',timeZone:tz}).format(new Date(v)):'';
const money=v=>v?new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(v):'';
const dateRange=(start,end,tz='America/Vancouver')=>{
  if(!start||!end) return '';
  const s=new Date(start), e=new Date(end);
  const sameYear=s.getUTCFullYear()===e.getUTCFullYear();
  const sFmt=new Intl.DateTimeFormat('en-CA',{month:'long',day:'numeric',timeZone:tz}).format(s);
  const eFmt=new Intl.DateTimeFormat('en-CA',{month:'long',day:'numeric',timeZone:tz}).format(e);
  const yFmt=new Intl.DateTimeFormat('en-CA',{year:'numeric',timeZone:tz}).format(e);
  return `${sFmt} – ${eFmt}${sameYear?`, ${yFmt}`:''}`;
};

async function uploadPhoto(file,status){
 const fd=new FormData();fd.append('photo',file);status.textContent='Uploading photo…';
 const r=await fetch('/api/contest-entry-photo',{method:'POST',body:fd});
 const d=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(d.message||'Photo upload failed.');
 status.textContent='Photo ready.';
 return d;
}

function buildGallery(entries){
 if(!entries.length){
  return `<div class="sb-gallery-empty"><div class="sb-empty-polaroids" aria-hidden="true"><span></span><span></span><span></span></div><h3>The first pages are waiting.</h3><p>Approved Sunfest memories will appear here after moderation.</p></div>`;
 }
 return entries.map((e,i)=>`<figure class="sb-memory sb-memory-${i%7}"><span class="sb-pin sb-pin-${i%4}"></span><img loading="lazy" src="/api/contest-gallery-image?id=${encodeURIComponent(e.id)}" alt="${esc(e.public_alt_text||'Approved Sunfest contest memory')}"><figcaption>${esc(e.public_caption||e.memory_text||'Sunfest memory')}${e.public_display_name?`<br><small>${esc(e.public_display_name)}</small>`:''}</figcaption></figure>`).join('');
}

window.renderScrapbookContest=async function(page,c,track){
 document.body.classList.add('contest-page-scrapbook');
 const active=c.state==='live';
 const coming=c.state==='scheduled';
 let gallery=[];
 try{
   const r=await fetch(`/api/contest-gallery?slug=${encodeURIComponent(c.slug)}`,{cache:'no-store'});
   if(r.ok) gallery=(await r.json()).entries||[];
 }catch{}

 const img=c.desktop_hero_url||'/assets/images/sunfest-hero-desktop-graphic.png';
 const mobileImg=c.mobile_hero_url||img;
 const eventDates=dateRange(c.festival_start_at,c.festival_end_at,c.timezone);
 const closingText=c.end_at?dateTime(c.end_at,c.timezone):'';
 const openText=c.start_at?dateTime(c.start_at,c.timezone):'';

 page.className='contest-page scrapbook-page';
 page.innerHTML=`
 <article class="scrapbook-book">
  <nav class="sb-top-nav" aria-label="Contest sections">
    <a href="/en-ca/">Home</a>
    <a href="#sunfest-entry">Enter</a>
    <a href="#sunfest-gallery">Memories</a>
    <a href="#official-rules">Rules</a>
    <a href="#sunfest-faq">FAQ</a>
    <div class="sb-top-social">
      <a href="https://www.instagram.com/suenostequila/" target="_blank" rel="noopener" aria-label="Instagram">IG</a>
      <a href="https://www.facebook.com/" target="_blank" rel="noopener" aria-label="Facebook">f</a>
    </div>
  </nav>

  <div class="sb-stage" style="--sb-stage-bg:url('${esc(journalBg)}')">
    <section class="sb-hero">
      <div class="sb-hero-copy">
        <div class="sb-logo-lockup">
          <img class="suenos" src="${logo}" alt="Sueños Artisan Tequila">
          <b>×</b>
          <img class="sunfest" src="${sunfest}" alt="Sunfest Country Music Festival">
        </div>
        <div class="sb-dates">${eventDates?esc(eventDates):'July 30 – August 2, 2026'}</div>
        <h1 class="sb-display"><span>SUNFEST</span><span>PHOTO CONTEST</span></h1>
        <p class="sb-script">${esc(c.headline||'Share your Sueños × Sunfest memories.')}</p>
        <div class="sb-benefits">
          <div class="sb-benefit"><i class="sb-icon-camera" aria-hidden="true"></i><span>Share your<br>best shots</span></div>
          <div class="sb-benefit"><i class="sb-icon-star" aria-hidden="true">★</i><span>Selected approved<br>entries may be featured</span></div>
          <div class="sb-benefit"><i class="sb-icon-gift" aria-hidden="true">🎁</i><span>Win an epic<br>prize</span></div>
        </div>
      </div>

      <div class="sb-hero-visual">
        <figure class="sb-polaroid">
          <span class="sb-tape"></span>
          <picture>
            <source media="(max-width: 640px)" srcset="${esc(mobileImg)}">
            <img src="${esc(img)}" alt="${esc(c.hero_alt||'Sunfest festival memory')}">
          </picture>
          <figcaption>Paradise looks good at Sunfest.</figcaption>
        </figure>
        <img class="sb-note-graphic" src="${noteCard}" alt="Good times, Cold drinks, Country music, Perfect combo.">
      </div>

      <img class="sb-prize-graphic" src="${prizeTicket}" alt="Win a Sueños Margarita Emergency Cooler, approximate retail value $200.">

      <a class="sb-cta" href="#sunfest-entry"><span aria-hidden="true" class="sb-cta-camera"></span>Upload your Sunfest memory</a>
      <img class="sb-stamp-graphic" src="/assets/images/contest-scrapbook/agave-stamp.svg" alt="" aria-hidden="true">
    </section>

    <section id="sunfest-entry" class="sb-entry-wrap">
      <div class="sb-entry-intro">
        <h2>Enter to win</h2>
        <p>${esc(c.intro_copy||'Upload your favourite Sunfest moments featuring Sueños for a chance to win.')}</p>
        <ul class="sb-entry-points">
          <li>${esc(c.prize_title||'Sueños Margarita Emergency Cooler')}</li>
          <li>${money(c.prize_value)||'Approx. value shown in rules'}</li>
          ${closingText?`<li>Closes ${esc(closingText)}</li>`:''}
        </ul>
        <p><a href="#official-rules">Official Rules →</a></p>
        ${!active?`<div class="contest-status">${coming?`Coming soon. Entries open ${esc(openText)}.`:'Contest closed.'}</div>`:''}
      </div>

      <div class="sb-entry-card">
        ${active?`<div id="sb-errors" class="sb-error-summary" role="alert"></div>
        <form id="sb-form" class="sb-photo-form" novalidate>
          <div><label for="sb-first">Name</label><input id="sb-first" name="firstName" autocomplete="given-name" placeholder="Your name" required></div>
          <div><label for="sb-email">Email</label><input id="sb-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required></div>
          <div class="full"><label for="sb-display">Public display name or social handle</label><input id="sb-display" name="publicDisplayName" maxlength="80" placeholder="Optional. Your email is never displayed."></div>
          <div class="full"><label for="sb-memory">Caption (optional)</label><textarea id="sb-memory" name="memoryText" placeholder="Tell us about your photo…"></textarea></div>
          <div id="sb-photo-fields" class="full">
            <label for="sb-photo">Upload photo</label>
            <div id="sb-drop" class="sb-upload"><div><input id="sb-photo" type="file" accept="image/jpeg,image/png,image/webp"><p>Choose from your photo library, take a photo, or browse files.<br>JPG, PNG, WebP up to 10 MB</p><img id="sb-preview" class="sb-upload-preview" alt="Selected photo preview"><button id="sb-remove" type="button" class="sb-link-button sb-hidden">Remove photo</button></div></div>
          </div>
          <div class="full sb-entry-metadata"><div><label for="sb-city">City</label><input id="sb-city" name="city" required></div><div><label for="sb-postal">Postal code</label><input id="sb-postal" name="postalCode" required></div><div><label for="sb-province">Province</label><select id="sb-province" name="province" required><option value="">Select</option>${['BC','AB','SK','MB','ON','QC','NB','NS','PE','NL','YT','NT','NU'].map(x=>`<option>${x}</option>`).join('')}</select></div></div>
          <div class="full"><label class="sb-check"><input type="checkbox" name="rulesConfirmed" required><span>I confirm that I am eligible to enter and agree to the Official Rules.</span></label></div>
          <div id="sb-photo-rights" class="full"><label class="sb-check"><input type="checkbox" name="photoRightsConfirmed" required><span>${esc(c.photo_rights_text||'I confirm that I took or own this photo and have permission from every identifiable person shown. I grant the contest sponsor a non-exclusive, royalty-free licence to display the submitted photo, caption and public display name for contest administration and promotional purposes, as described in the Official Rules.')}</span></label></div>
          ${c.marketing_enabled?`<div class="full"><label class="sb-check"><input type="checkbox" name="marketingConsent"><span>${esc(c.marketing_consent_text)}</span></label><small>Contest entry does not depend on subscribing.</small></div>`:''}
          <div class="full"><div class="cf-turnstile" data-sitekey="0x4AAAAAAD9MP21ca7C8BGsS" data-action="contest-photo"></div></div>
          <input type="text" name="website" tabindex="-1" autocomplete="off" class="sb-hidden">
          <input type="hidden" name="lastName" value="">
          <input type="hidden" name="entryType" value="photo">
          <input type="hidden" name="formStartedAt" value="${Date.now()}">
          <button class="sb-submit full" type="submit">Submit entry</button>
          <p id="sb-status" class="sb-status full" aria-live="polite"></p>
          <div class="sb-disclosure full">${esc(c.abbreviated_rules||'NO PURCHASE NECESSARY. Open to eligible Canadian residents aged 19 or older. Odds depend on the number of eligible entries received. A skill-testing question is required. Festival attendance, a ticket and a Sueños purchase are not required. Alcohol is not included.')}</div>
        </form>`:`<div class="sb-closed-card"><h3>${coming?'Coming soon':'Contest closed'}</h3><p>${coming?`Entries open ${esc(openText)}.`:'Thanks for the memories. Check back for the next contest.'}</p></div>`}
      </div>
    </section>

    <section id="sunfest-gallery" class="sb-gallery">
      <div class="sb-gallery-collage-wrap">
        <img class="sb-gallery-collage" src="${memoriesCollage}" alt="Sunfest memories scrapbook collage">
      </div>
      <div class="sb-gallery-grid">${buildGallery(gallery)}</div>
      ${c.event_location||eventDates?`<p class="sb-location-tag"><strong>${esc(c.event_location||'Cowichan Valley, BC')}</strong>${eventDates?`<span>${esc(eventDates)}</span>`:''}</p>`:''}
    </section>

    <footer class="sb-album-footer">
      <div><strong>THANK YOU FOR MAKING SUNFEST UNFORGETTABLE.</strong><div class="script">¡Salud to more memories!</div></div>
      <img src="${logo}" alt="Sueños Artisan Tequila">
      <div class="right">PROUD TEQUILA PARTNER OF<br>SUNFEST COUNTRY MUSIC FESTIVAL<br><a href="/en-ca/">SUEÑOS.CA</a></div>
    </footer>

    <section id="sunfest-faq" class="sb-faq">
      <div class="sb-faq-grid">
        <div><h3>How do I enter?</h3><p>Upload a Sunfest memory, complete the form and submit before the closing date.</p></div>
        <div><h3>What can I win?</h3><p>${esc(c.prize_title||'A Sueños Margarita Emergency Cooler')} plus any listed accessories in the Official Rules.</p></div>
        <div><h3>Will my photo appear publicly?</h3><p>Approved entries may be featured in the public scrapbook gallery after moderation.</p></div>
        <div><h3>Do I need a ticket or purchase?</h3><p>No. No purchase is necessary. See the Official Rules for complete eligibility details.</p></div>
      </div>
    </section>

    <section id="official-rules" class="sb-rules"><h2>Official Contest Rules</h2><div>${c.full_rules_html||'<p>Rules will be published before entries open.</p>'}</div></section>
  </div>
 </article>`;

 const form=document.getElementById('sb-form');
 if(!form) return;
 const file=document.getElementById('sb-photo');
 const preview=document.getElementById('sb-preview');
 const remove=document.getElementById('sb-remove');
 const drop=document.getElementById('sb-drop');
 const status=document.getElementById('sb-status');
 let uploaded=null;

 const show=f=>{
   if(!f) return;
   if(f.size>10*1024*1024){status.textContent='Photo must be 10 MB or smaller.'; file.value=''; return;}
   if(!['image/jpeg','image/png','image/webp'].includes(f.type)){status.textContent='Use a JPG, PNG or WebP image.'; file.value=''; return;}
   preview.src=URL.createObjectURL(f);
   preview.style.display='block';
   remove.classList.remove('sb-hidden');
   uploaded=null;
 };

 file?.addEventListener('change',()=>show(file.files[0]));
 remove?.addEventListener('click',()=>{
   file.value='';
   preview.removeAttribute('src');
   preview.style.display='none';
   remove.classList.add('sb-hidden');
   uploaded=null;
 });

 if(drop){
   ['dragenter','dragover'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('drag')}));
   ['dragleave','drop'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('drag')}));
   drop.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f){const d=new DataTransfer();d.items.add(f);file.files=d.files;show(f)}});
 }

 form.addEventListener('submit',async e=>{
   e.preventDefault();
   const errors=[];
   const rightsInput=document.querySelector('#sb-photo-rights input');
   if(!file.files[0]) errors.push('Choose a photo to submit.');
   if(rightsInput && !rightsInput.checked) errors.push('Confirm the photo rights and permissions.');
   if(!form.reportValidity()) errors.push('Complete the required fields.');
   const box=document.getElementById('sb-errors');
   if(errors.length){
     box.style.display='block';
     box.innerHTML='<strong>Please correct:</strong><ul>'+errors.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>';
     box.scrollIntoView({behavior:'smooth'});
     return;
   }
   box.style.display='none';
   const button=form.querySelector('button[type=submit]');
   button.disabled=true;
   try{
     if(!uploaded) uploaded=await uploadPhoto(file.files[0],status);
     const fd=new FormData(form), p=new URLSearchParams(location.search);
     const payload=Object.fromEntries(fd.entries());
     Object.assign(payload,{
       slug:c.slug,
       entryType:'photo',
       photoAssetKey:uploaded?.key||null,
       photoMime:uploaded?.mime||null,
       photoSize:uploaded?.size||null,
       photoRightsConfirmed:!!(rightsInput&&rightsInput.checked),
       photoRightsVersion:c.photo_rights_version||'1.0',
       ageConfirmed:true,
       rulesConfirmed:fd.get('rulesConfirmed')==='on',
       marketingConsent:fd.get('marketingConsent')==='on',
       turnstileToken:fd.get('cf-turnstile-response'),
       utmSource:p.get('utm_source'),
       utmMedium:p.get('utm_medium'),
       utmCampaign:p.get('utm_campaign'),
       utmContent:p.get('utm_content'),
       referrer:document.referrer
     });
     const r=await fetch('/api/contests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
     const d=await r.json().catch(()=>({}));
     if(!r.ok) throw new Error(d.message||'Entry could not be submitted.');
     if(typeof track==='function') track('contest_entry_success',c);
     form.outerHTML=`<div class="contest-success"><h2>${esc(d.confirmation?.heading||'You’re in. Paradise may be calling.')}</h2><p>${esc(d.confirmation?.message||'Your memory has been received and is awaiting moderation.')}</p></div>`;
   }catch(err){
     status.textContent=err.message;
     button.disabled=false;
   }
 });
};
})();
