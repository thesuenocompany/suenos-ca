import { createHash, randomUUID } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { jsonResponse, originAllowed } from './_hotline-http.mjs';
import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';

const base=()=>String(process.env.SUPABASE_URL||'https://dowfjjthshbbgnvwxzjv.supabase.co').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const headers=(extra={})=>({apikey:key(),authorization:`Bearer ${key()}`,'content-type':'application/json',...extra});
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);
const emailNorm=v=>clean(v,254).toLowerCase();
const receiptStore=()=>getStore('contest-entry-receipts',{consistency:'strong'});

const parseDateOnly=value=>{const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(value,10));if(!match)return null;const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]),date=new Date(Date.UTC(y,m-1,d));if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)return null;return{iso:`${match[1]}-${match[2]}-${match[3]}`,y,m,d};};
const todayInTimeZone=timezone=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone||'America/Vancouver',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=type=>Number(parts.find(part=>part.type===type)?.value||0);return{y:get('year'),m:get('month'),d:get('day')};};
const ageOnDate=(birth,today)=>{let age=today.y-birth.y;if(today.m<birth.m||(today.m===birth.m&&today.d<birth.d))age-=1;return age;};
const LEGAL_DRINKING_AGE=Object.freeze({AB:18,MB:18,QC:18,BC:19,SK:19,ON:19,NB:19,NS:19,PE:19,NL:19,YT:19,NT:19,NU:19});
const regionalLegalAge=province=>LEGAL_DRINKING_AGE[String(province||'').toUpperCase()]||19;
const requiredAgeFor=(contest,province)=>contest.age_requirement_mode==='regional'?regionalLegalAge(province):Math.max(1,Number(contest.minimum_age)||19);
const stateOf=c=>{const now=Date.now(),start=new Date(c.start_at).getTime(),close=new Date(c.close_at).getTime();if(c.contest_type==='retail'&&c.retail_is_master)return 'hidden';if(c.status!=='published')return 'hidden';if(now<start)return 'scheduled';if(now>close)return 'closed';return 'live';};
const publicFields='id,contest_type,public_name,slug,status,featured,show_before_start,eyebrow,headline,intro_copy,description_html,desktop_hero_url,mobile_hero_url,hero_alt,hero_object_position,prize_title,prize_description,prize_value,winner_count,included_items,excluded_items,redemption_restrictions,prize_expiry,prize_image_urls,start_at,close_at,draw_at,timezone,minimum_age,eligible_provinces,eligible_regions,phone_enabled,phone_required,city_required,postal_required,province_required,custom_question_enabled,custom_question_label,custom_question_type,custom_question_options,marketing_enabled,marketing_consent_text,marketing_consent_version,abbreviated_rules,full_rules_html,external_rules_url,rules_pdf_url,rules_version,confirmation_heading,confirmation_message,confirmation_cta_label,confirmation_cta_url,publish_winner,published_winner_name,published_winner_city,layout_style,photo_entries_enabled,written_entries_enabled,festival_start_at,festival_end_at,event_location,privacy_contact_name,privacy_contact_email,legal_sponsor_name,legal_sponsor_address,platform_disclaimer,photo_rights_text,photo_rights_version,alcohol_excluded,prize_image_url,gallery_heading,gallery_subheading,retail_parent_id,retail_is_master,retailer_name,retailer_code,retailer_logo_url,retailer_display_address,retail_require_address,age_requirement_mode,receipt_bonus_enabled,receipt_bonus_per_item,receipt_bonus_max_per_receipt,receipt_bonus_help_text,receipt_bonus_auto_approve_confidence,receipt_bonus_no_purchase_method,receipt_bonus_override';
async function sb(path,options={}){if(!key())throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');const r=await fetch(`${base()}/rest/v1/${path}`,{...options,headers:headers(options.headers)});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok){const e=new Error(data?.message||'Database request failed.');e.status=r.status;throw e}return data;}
async function verifyTurnstile(token,remoteIp=''){
  const secrets=[process.env.TURNSTILE_SECRET_KEY,process.env.CONTACT_TURNSTILE_SECRET_KEY,process.env.CONTEST_TURNSTILE_SECRET_KEY].map(v=>String(v||'').trim()).filter((v,i,a)=>v&&a.indexOf(v)===i);
  if(!secrets.length)return{success:false,configurationError:true,reason:'missing-secret',errors:['missing-input-secret']};
  if(!token)return{success:false,configurationError:false,reason:'missing-token',errors:['missing-input-response']};
  let last={success:false,configurationError:false,reason:'verification-failed',errors:[]};
  for(const secret of secrets){
    const params={secret,response:token,idempotency_key:randomUUID()};
    if(remoteIp)params.remoteip=remoteIp;
    const body=new URLSearchParams(params);
    const r=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
    const d=await r.json().catch(()=>({}));
    const errors=Array.isArray(d['error-codes'])?d['error-codes']:[];
    const hostname=String(d.hostname||'').toLowerCase();
    const action=String(d.action||'');
    const hostAllowed=!d.success||hostname==='suenos.ca'||hostname==='www.suenos.ca'||hostname.endsWith('.netlify.app');
    if(d.success&&hostAllowed)return{success:true,configurationError:false,reason:'ok',errors,hostname,action};
    const configurationError=errors.some(x=>['missing-input-secret','invalid-input-secret','missing-secret'].includes(x));
    last={success:false,configurationError,reason:d.success&&!hostAllowed?'hostname-mismatch':'verification-failed',errors,hostname,action};
    if(!configurationError)break;
  }
  return last;
}
const safeContest=c=>({...c,state:stateOf(c),full_rules_html:clean(c.full_rules_html,50000),description_html:clean(c.description_html,20000)});
const resolveRetailMasterSettings=async c=>{
  if(c.contest_type!=='retail'||c.retail_is_master||!c.retail_parent_id)return c;
  const parent=(await sb(`contests?id=eq.${c.retail_parent_id}&select=desktop_hero_url,mobile_hero_url,hero_alt,hero_object_position,receipt_bonus_enabled,receipt_bonus_per_item,receipt_bonus_max_per_receipt,receipt_bonus_help_text,receipt_bonus_auto_approve_confidence,receipt_bonus_no_purchase_method&limit=1`).catch(()=>[]))?.[0];
  if(!parent)return c;

  // Retail hero artwork is master-controlled. Updating the master immediately updates every retailer page.
  c.desktop_hero_url=parent.desktop_hero_url||null;
  c.mobile_hero_url=parent.mobile_hero_url||null;
  c.hero_alt=parent.hero_alt||c.hero_alt||c.public_name||'Sueños contest';
  c.hero_object_position=parent.hero_object_position||'50% 50%';

  const override=c.receipt_bonus_override;
  c.receipt_bonus_enabled=override===true?true:override===false?false:Boolean(parent.receipt_bonus_enabled);
  c.receipt_bonus_per_item=Number(parent.receipt_bonus_per_item)||1;
  c.receipt_bonus_max_per_receipt=Number(parent.receipt_bonus_max_per_receipt)||10;
  c.receipt_bonus_help_text=parent.receipt_bonus_help_text||c.receipt_bonus_help_text||null;
  c.receipt_bonus_auto_approve_confidence=Number(parent.receipt_bonus_auto_approve_confidence)||0.85;
  c.receipt_bonus_no_purchase_method=parent.receipt_bonus_no_purchase_method||c.receipt_bonus_no_purchase_method||null;
  return c;
};

const sha256=v=>createHash('sha256').update(v).digest('hex');
const merchantTokens=value=>clean(value,200).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]+/g,' ').split(/\s+/).filter(x=>x&&!['the','store','liquor','lrs','shop','ltd','limited','inc','corporation','corp','restaurant','bar','pub','tavern','public','house'].includes(x));
const merchantMatch=(detected,expected)=>{const a=merchantTokens(detected),b=merchantTokens(expected);if(!a.length||!b.length)return null;const common=a.filter(x=>b.includes(x));return common.length>=Math.min(2,b.length)||common.length/Math.max(1,b.length)>=0.6;};
const parseNumberMaybe=v=>{const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null;};
const receiptMimeForKey=key=>key?.endsWith('.png')?'image/png':key?.endsWith('.webp')?'image/webp':'image/jpeg';
const normalizeAllowedReceiptItems=value=>{const raw=Array.isArray(value)?value:[],seen=new Set(),items=[];for(const v of raw){const item=clean(v,120);if(!item)continue;const k=item.toLowerCase();if(seen.has(k))continue;seen.add(k);items.push(item);if(items.length>=30)break;}return items;};

async function analyzeReceiptWithAI(buffer,mime='image/jpeg',expectedRetailer='',allowedItems=[]){
  const apiKey=process.env.CONTEST_RECEIPT_OPENAI_API_KEY||process.env.OPENAI_API_KEY||'';
  const model=process.env.CONTEST_RECEIPT_OPENAI_MODEL||'gpt-4.1-mini';
  if(!apiKey)return{status:'pending',reason:'missing_ai_key',publicMessage:'Your receipt was received and is pending manual review for bonus entries.'};
  const allowed=normalizeAllowedReceiptItems(allowedItems);
  const allowedRule=allowed.length?`For THIS retailer only, the following menu or POS item names also count as eligible Sueños purchases even if the printed receipt line does not contain the word Sueños: ${allowed.map(x=>JSON.stringify(x)).join(', ')}. Accept obvious case, punctuation, OCR and reasonable POS abbreviation variants of these configured names, but do not invent additional qualifying items.`:'There are no retailer-specific qualifying aliases configured for this receipt.';
  const prompt=`You are validating a retail receipt image for a contest. The expected retailer for this contest is: ${expectedRetailer||'unknown'}. ${allowedRule} Read the receipt carefully and return ONLY JSON with these keys: is_full_receipt_visible (boolean), has_suenos_purchase (boolean), suenos_quantity (integer, direct Sueños-labelled eligible units only), custom_allowed_quantity (integer, eligible units matched only because of the retailer-specific configured item list), eligible_quantity (integer, total eligible units after de-duplicating any line that could qualify both ways), receipt_number (string or null), retailer_name (string or null), retailer_matches_expected (boolean or null), purchase_date_iso (YYYY-MM-DD or null), total_amount (number or null), confidence (0 to 1), matched_lines (array of strings), matched_allowed_items (array of configured item names that matched), notes (string). Count quantities shown on a line and multiple eligible lines. Never double-count the same purchased unit. Treat OCR variations like SUENOS, SUEÑOS, SUEÑOS TEQUILA, SUENOS MARGARITA, DON TERRY, SUENOS PALOMA, or abbreviated store POS line items as valid only if they clearly refer to Sueños products or cocktails, unless the line matches one of the retailer-specific configured items above. has_suenos_purchase should be true when eligible_quantity is greater than zero. Compare the merchant/store identity on the receipt to the expected retailer. Small formatting differences, abbreviations, 'Liquor Store' vs 'Liquor', or legal suffixes may still be a match. If the receipt is clearly from a different merchant, retailer_matches_expected must be false. If the image is partial, blurry, or the whole receipt is not visible, set is_full_receipt_visible false.`;
  const dataUrl=`data:${mime};base64,${buffer.toString('base64')}`;
  const response=await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},
    body:JSON.stringify({
      model,
      response_format:{type:'json_object'},
      messages:[
        {role:'system',content:'Return JSON only.'},
        {role:'user',content:[{type:'text',text:prompt},{type:'image_url',image_url:{url:dataUrl}}]}
      ],
      max_tokens:650
    })
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(result?.error?.message||'AI receipt review failed.');
  const content=result?.choices?.[0]?.message?.content||'{}';
  let parsed={};
  try{parsed=JSON.parse(content)}catch{parsed={}};
  const directQty=Math.max(0,parseInt(parsed.suenos_quantity||0,10)||0);
  const customQty=Math.max(0,parseInt(parsed.custom_allowed_quantity||0,10)||0);
  const reportedEligible=Math.max(0,parseInt(parsed.eligible_quantity||0,10)||0);
  const eligibleQty=Math.max(reportedEligible,directQty+customQty);
  return {
    status:'ok',
    parsed:{
      is_full_receipt_visible:Boolean(parsed.is_full_receipt_visible),
      has_suenos_purchase:Boolean(parsed.has_suenos_purchase)||eligibleQty>0,
      suenos_quantity:directQty,
      custom_allowed_quantity:customQty,
      eligible_quantity:eligibleQty,
      receipt_number:clean(parsed.receipt_number,120)||null,
      retailer_name:clean(parsed.retailer_name,160)||null,
      retailer_matches_expected:parsed.retailer_matches_expected===true?true:parsed.retailer_matches_expected===false?false:null,
      purchase_date_iso:/^\d{4}-\d{2}-\d{2}$/.test(String(parsed.purchase_date_iso||''))?String(parsed.purchase_date_iso):null,
      total_amount:parseNumberMaybe(parsed.total_amount),
      confidence:Math.max(0,Math.min(1,Number(parsed.confidence)||0)),
      matched_lines:Array.isArray(parsed.matched_lines)?parsed.matched_lines.map(v=>clean(v,200)).filter(Boolean).slice(0,20):[],
      matched_allowed_items:Array.isArray(parsed.matched_allowed_items)?parsed.matched_allowed_items.map(v=>clean(v,120)).filter(Boolean).slice(0,30):[],
      allowed_items_applied:allowed,
      notes:clean(parsed.notes,1000)
    }
  };
}

async function syncEntryBonus(entryId){
  const claims=await sb(`contest_receipt_claims?entry_id=eq.${entryId}&select=status,bonus_entries_awarded,bonus_entries_requested`);
  const awarded=claims.filter(c=>c.status==='approved').reduce((sum,c)=>sum+Math.max(0,Number(c.bonus_entries_awarded)||0),0);
  const pending=claims.filter(c=>c.status==='pending').reduce((sum,c)=>sum+Math.max(0,Number(c.bonus_entries_requested)||0),0);
  await sb(`contest_entries?id=eq.${entryId}`,{method:'PATCH',body:JSON.stringify({bonus_entries_awarded:awarded,bonus_entries_pending:pending})});
  return {awarded,pending};
}

async function processReceiptClaim({contest,entry,body}){
  const assetKey=clean(body.receiptAssetKey,500);
  if(!assetKey)return null;
  const scopeId=contest.retail_parent_id||contest.id;
  let buffer;
  try{buffer=await receiptStore().get(assetKey,{type:'arrayBuffer'});}catch{}
  if(!buffer)throw new Error('Receipt upload could not be found.');
  const imageBuffer=Buffer.from(buffer);
  const imageHash=clean(body.receiptImageHash,128)||sha256(imageBuffer);
  const duplicateImageBeforeAi=(await sb(`contest_receipt_claims?receipt_scope_id=eq.${scopeId}&image_hash=eq.${imageHash}&select=id,entry_id,status&limit=1`).catch(()=>[]))?.[0]||null;
  if(duplicateImageBeforeAi){
    const payload={contest_id:contest.id,receipt_scope_id:scopeId,entry_id:entry.id,normalized_email:entry.normalized_email,asset_key:assetKey,asset_mime:clean(body.receiptMime,80)||receiptMimeForKey(assetKey),asset_size:Number(body.receiptSize||0)||null,image_hash:imageHash,status:'duplicate',duplicate_of_receipt_id:duplicateImageBeforeAi.id,bonus_entries_requested:0,bonus_entries_awarded:0,ai_provider:null,ai_model:null,ai_confidence:0,parsed_payload:{},rejection_reason:'Duplicate receipt image detected.',reviewed_at:new Date().toISOString(),reviewed_by:'automatic'};
    const created=await sb('contest_receipt_claims',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)}).catch(()=>[]);
    await syncEntryBonus(entry.id).catch(()=>null);
    return {claimId:created?.[0]?.id||null,status:'duplicate',requested:0,awarded:0,pending:0,publicMessage:'Your base entry is in, but bonus entries were not added because this receipt has already been submitted.'};
  }
  const ai=await analyzeReceiptWithAI(imageBuffer,receiptMimeForKey(assetKey),contest.retailer_name||'',contest.receipt_bonus_allowed_items||[]).catch(error=>({status:'error',error:error.message}));
  const parsed=ai.parsed||{};
  if(parsed.retailer_matches_expected===null||parsed.retailer_matches_expected===undefined){parsed.retailer_matches_expected=merchantMatch(parsed.retailer_name,contest.retailer_name);}
  const eligibleQuantity=Math.max(0,Number(parsed.eligible_quantity??parsed.suenos_quantity)||0);
  parsed.eligible_quantity=eligibleQuantity;
  parsed.has_suenos_purchase=Boolean(parsed.has_suenos_purchase)||eligibleQuantity>0;
  const requested=Math.min(Math.max(0,eligibleQuantity*Math.max(1,Number(contest.receipt_bonus_per_item)||1)),Math.max(1,Number(contest.receipt_bonus_max_per_receipt)||10));
  const fingerprintInput=[scopeId,clean(parsed.retailer_name,160).toLowerCase(),clean(parsed.receipt_number,120).toLowerCase(),clean(parsed.purchase_date_iso,10),String(parsed.total_amount??''),String(eligibleQuantity)].join('|');
  const receiptFingerprint=fingerprintInput.replace(/\|+/g,'|').replace(/^\||\|$/g,'')?sha256(fingerprintInput):null;
  const duplicateByImage=(await sb(`contest_receipt_claims?receipt_scope_id=eq.${scopeId}&image_hash=eq.${imageHash}&select=id,entry_id,status&limit=1`).catch(()=>[]))?.[0]||null;
  const duplicateByFingerprint=receiptFingerprint?(await sb(`contest_receipt_claims?receipt_scope_id=eq.${scopeId}&receipt_fingerprint=eq.${receiptFingerprint}&select=id,entry_id,status&limit=1`).catch(()=>[]))?.[0]||null:null;
  let status='pending',publicMessage='Your receipt was received and is pending manual review for bonus entries.',rejectionReason=null,duplicateOf=null,awarded=0;
  if(duplicateByImage||duplicateByFingerprint){
    status='duplicate';
    duplicateOf=(duplicateByImage||duplicateByFingerprint)?.id||null;
    rejectionReason='Duplicate receipt detected.';
    publicMessage='Your base entry is in, but bonus entries were not added because this receipt has already been submitted.';
  }else if(ai.status==='error'){
    status='pending';
    rejectionReason=`AI review error: ${clean(ai.error,500)}`;
    publicMessage='Your base entry is in. We saved your receipt for manual review.';
  }else if(ai.status==='pending'){
    status='pending';
    rejectionReason=clean(ai.reason,500)||'AI review unavailable.';
    publicMessage=rejectionReason==='missing_ai_key'?'Your base entry is in. Automatic receipt verification is not currently available, so this receipt has been queued for manual review.':'Your base entry is in. This receipt needs manual review before bonus entries can be added.';
  }else if(parsed.retailer_matches_expected===false){
    status='rejected';
    const detectedRetailer=clean(parsed.retailer_name,160)||'another retailer';
    const expectedRetailer=clean(contest.retailer_name,160)||'this participating retailer';
    rejectionReason=`Wrong retailer: receipt appears to be from ${detectedRetailer}, but this contest entry is for ${expectedRetailer}.`;
    publicMessage=`Your base entry is in, but this receipt was not eligible for bonus entries because it appears to be from ${detectedRetailer}, not ${expectedRetailer}.`;
  }else if(parsed.retailer_matches_expected!==true){
    status='pending';
    rejectionReason=`Retailer could not be confidently matched to ${clean(contest.retailer_name,160)||'the participating retailer'}.`;
    publicMessage=`Your base entry is in. We could not confidently verify that this receipt is from ${clean(contest.retailer_name,160)||'the participating retailer'}, so it is pending manual review.`;
  }else if(eligibleQuantity<1||requested<1){
    status='rejected';
    rejectionReason='No eligible Sueños purchase or retailer-approved Sueños item was detected on the receipt.';
    publicMessage='Your base entry is in. This receipt did not show an eligible Sueños purchase, so no bonus entries were added.';
  }else{
    const threshold=Math.max(0.5,Math.min(0.99,Number(contest.receipt_bonus_auto_approve_confidence)||0.85));
    const purchaseTime=parsed.purchase_date_iso?new Date(`${parsed.purchase_date_iso}T12:00:00Z`).getTime():null;
    const contestStart=new Date(contest.start_at).getTime(),contestClose=new Date(contest.close_at).getTime();
    if(purchaseTime&&Number.isFinite(purchaseTime)&&(purchaseTime<contestStart-86400000||purchaseTime>contestClose+86400000)){
      status='rejected';
      rejectionReason='Receipt date is outside the contest period.';
      publicMessage='Your base entry is in. This receipt is outside the eligible contest period, so no bonus entries were added.';
    }else if(Number(parsed.confidence||0)>=threshold&&!parsed.is_full_receipt_visible){
      status='rejected';
      rejectionReason='The complete receipt was not visible.';
      publicMessage='Your base entry is in. Bonus entries were not added because the complete receipt was not visible.';
    }else if(!parsed.is_full_receipt_visible||Number(parsed.confidence||0)<threshold){
      status='pending';
      publicMessage='Your base entry is in. Your receipt is pending a quick manual review before bonus entries are added.';
    }else{
      status='approved';
      awarded=requested;
      publicMessage=`Your receipt was approved for ${awarded} bonus entr${awarded===1?'y':'ies'}.`;
    }
  }
  if(status==='approved'&&awarded===0){awarded=requested;}

  const payload={
    contest_id:contest.id,
    receipt_scope_id:scopeId,
    entry_id:entry.id,
    normalized_email:entry.normalized_email,
    asset_key:assetKey,
    asset_mime:clean(body.receiptMime,80)||receiptMimeForKey(assetKey),
    asset_size:Number(body.receiptSize||0)||null,
    image_hash:imageHash,
    receipt_number:clean(parsed.receipt_number,120)||null,
    retailer_name:clean(parsed.retailer_name,160)||contest.retailer_name||null,
    purchase_date:parsed.purchase_date_iso||null,
    total_amount:parsed.total_amount,
    suenos_quantity:eligibleQuantity,
    bonus_entries_requested:requested,
    bonus_entries_awarded:awarded,
    status,
    duplicate_of_receipt_id:duplicateOf,
    receipt_fingerprint:receiptFingerprint,
    ai_provider:'openai',
    ai_model:process.env.CONTEST_RECEIPT_OPENAI_MODEL||'gpt-4.1-mini',
    ai_confidence:Number(parsed.confidence||0),
    parsed_payload:parsed,
    moderation_notes:clean(parsed.notes||rejectionReason,2000)||null,
    rejection_reason:rejectionReason,
    reviewed_at:status==='pending'?null:new Date().toISOString(),
    reviewed_by:status==='pending'?null:'automatic'
  };
  const created=await sb('contest_receipt_claims',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(payload)}).catch(async error=>{
    console.error('contest receipt claim',error);
    const fallback={...payload,status:'pending',bonus_entries_awarded:0,rejection_reason:'Receipt claim saved for manual review.'};
    const inserted=await sb('contest_receipt_claims',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(fallback)});
    return inserted;
  });
  const totals=await syncEntryBonus(entry.id).catch(()=>({awarded, pending:status==='pending'?requested:0}));
  return {claimId:created?.[0]?.id||null,status,requested,awarded:totals.awarded??awarded,pending:totals.pending??0,publicMessage};
}

export default async (request,context)=>{
  if(!originAllowed(request))return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
  const url=new URL(request.url);
  try{
    if(request.method==='GET'){
      const slug=clean(url.searchParams.get('slug'),120);
      if(slug){
        const rows=await sb(`contests?slug=eq.${encodeURIComponent(slug)}&select=${publicFields}&limit=1`);
        if(!rows?.length)return jsonResponse(404,{ok:false,message:'Contest not found.'});
        const preview=url.searchParams.get('preview')==='1';
        const previewAllowed=preview&&verifyAdminToken(getBearerToken(request),process.env.HOTLINE_ADMIN_SECRET);
        const c=safeContest(await resolveRetailMasterSettings(rows[0]));
        if(c.state==='hidden'&&!previewAllowed)return jsonResponse(404,{ok:false,message:'Contest not found.'});
        if(previewAllowed)c.admin_preview=true;
        return jsonResponse(200,{ok:true,contest:c});
      }
      const rows=await sb(`contests?status=eq.published&select=${publicFields}&order=featured.desc,start_at.desc`);
      const visible=(rows||[]).map(safeContest).filter(c=>c.state==='live'||c.state==='closed'||(c.state==='scheduled'&&c.show_before_start));
      return jsonResponse(200,{ok:true,contests:visible});
    }
    if(request.method==='POST'){
      let body;try{body=await request.json()}catch{return jsonResponse(400,{ok:false,message:'Please check the required fields and try again.'})}
      if(clean(body.website,100))return jsonResponse(202,{ok:true});
      const slug=clean(body.slug,120);const rows=await sb(`contests?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`);if(!rows?.length)return jsonResponse(404,{ok:false,message:'Contest not found.'});
      const c=await resolveRetailMasterSettings(rows[0]),state=stateOf(c);
      if(state==='scheduled')return jsonResponse(409,{ok:false,code:'not_open',message:'This contest has not opened yet.'});
      if(state!=='live')return jsonResponse(409,{ok:false,code:'closed',message:'This contest is now closed.'});
      const started=Number(body.formStartedAt||0);if(!started||Date.now()-started<1800)return jsonResponse(400,{ok:false,message:'Please wait a moment, then try submitting again.'});
      const first=clean(body.firstName,100),last=clean(body.lastName,100),email=emailNorm(body.email),province=clean(body.province,50).toUpperCase();
      const birthDate=parseDateOnly(body.birthDate);
      if(!first||!last||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!birthDate||!body.ageConfirmed||!body.rulesConfirmed)return jsonResponse(400,{ok:false,code:'validation',message:'Please check the required fields and try again.'});
      const requiredAge=requiredAgeFor(c,province);const entrantAge=ageOnDate(birthDate,todayInTimeZone(c.timezone));
      if(entrantAge<requiredAge){await sb('contest_age_blocks',{method:'POST',body:JSON.stringify({contest_id:c.id,province:province||null,required_age:requiredAge})}).catch(()=>null);return jsonResponse(400,{ok:false,code:'age',requiredAge,message:`You must be at least ${requiredAge} years old to enter in ${province||'your province or territory'}.`});}
      if(c.city_required&&!clean(body.city,120)||c.postal_required&&!clean(body.postalCode,20)||c.province_required&&!province)return jsonResponse(400,{ok:false,message:'Please check the required fields and try again.'});
      if(c.phone_required&&!clean(body.phone,40))return jsonResponse(400,{ok:false,code:'validation',message:'Phone number is required.'});
      if(c.contest_type==='retail'&&c.retail_require_address&&!clean(body.addressLine1,240))return jsonResponse(400,{ok:false,code:'validation',message:'Street address is required.'});
      if(c.contest_type==='retail'&&c.retail_is_master)return jsonResponse(409,{ok:false,code:'master_template',message:'This retail campaign is a template and is not open for entries.'});
      if(Array.isArray(c.eligible_provinces)&&c.eligible_provinces.length&&!c.eligible_provinces.map(x=>String(x).toUpperCase()).includes(province))return jsonResponse(400,{ok:false,message:'This contest is not available in your province or territory.'});
      const entryType=clean(body.entryType,20)||'standard';
      if(entryType==='photo'&&!c.photo_entries_enabled)return jsonResponse(400,{ok:false,message:'Photo entries are not enabled for this contest.'});
      if(entryType==='written'&&!c.written_entries_enabled)return jsonResponse(400,{ok:false,message:'Written entries are not enabled for this contest.'});
      if(entryType==='photo'&&(!clean(body.photoAssetKey,500)||!body.photoRightsConfirmed))return jsonResponse(400,{ok:false,message:'Choose a photo and confirm the photo permissions.'});
      if((entryType==='photo'||entryType==='written')&&!clean(body.memoryText,2000))return jsonResponse(400,{ok:false,code:'validation',message:'Please share a caption or festival memory.'});
      const ip=context?.ip||request.headers.get('x-nf-client-connection-ip')||'';
      const turnstileResult=await verifyTurnstile(clean(body.turnstileToken,2048),ip);
      let antiAbuseResult='turnstile_pass';
      if(!turnstileResult.success){
        const turnstileError=turnstileResult.errors[0]||turnstileResult.reason||'verification-failed';
        console.warn('contest-turnstile-failed',{reason:turnstileResult.reason,errors:turnstileResult.errors,hostname:turnstileResult.hostname,action:turnstileResult.action,configurationError:turnstileResult.configurationError});
        if(turnstileResult.configurationError){antiAbuseResult='turnstile_config_fallback';}
        else{const message=turnstileError==='timeout-or-duplicate'?'Verification expired. Tap Submit Entry again.':turnstileError==='missing-input-response'?'Verification did not reach the server. Tap Submit Entry again.':'Verification was rejected by Cloudflare. Tap Submit Entry again.';return jsonResponse(400,{ok:false,code:'turnstile',turnstileError,message});}
      }
      const ipHash=sha256(`${process.env.CONTEST_IP_SALT||process.env.HOTLINE_ADMIN_SECRET||'suenos'}|${ip}`);
      const record={contest_id:c.id,first_name:first,last_name:last,email,normalized_email:email,birth_date:birthDate.iso,phone:c.phone_enabled?clean(body.phone,40):null,address_line1:c.contest_type==='retail'?clean(body.addressLine1,240):null,address_line2:c.contest_type==='retail'?clean(body.addressLine2,240):null,city:clean(body.city,120),postal_code:clean(body.postalCode,20).toUpperCase(),province,legal_age_required:requiredAge,age_confirmed:true,rules_confirmed:true,rules_version:c.rules_version,marketing_consent:Boolean(c.marketing_enabled&&body.marketingConsent),marketing_consent_at:c.marketing_enabled&&body.marketingConsent?new Date().toISOString():null,marketing_consent_text:c.marketing_enabled&&body.marketingConsent?c.marketing_consent_text:null,marketing_consent_version:c.marketing_enabled&&body.marketingConsent?c.marketing_consent_version:null,custom_response:c.custom_question_enabled?clean(body.customResponse,1000):null,utm_source:clean(body.utmSource,120),utm_medium:clean(body.utmMedium,120),utm_campaign:clean(body.utmCampaign,160),utm_content:clean(body.utmContent,160),referrer:clean(body.referrer,500),anti_abuse_result:antiAbuseResult,ip_hash:ipHash,entry_type:entryType,memory_text:clean(body.memoryText,2000),photo_asset_key:entryType==='photo'?clean(body.photoAssetKey,500):null,photo_mime:entryType==='photo'?clean(body.photoMime,80):null,photo_size:entryType==='photo'?Number(body.photoSize||0):null,photo_rights_confirmed:entryType==='photo'&&Boolean(body.photoRightsConfirmed),photo_rights_version:entryType==='photo'?clean(body.photoRightsVersion,80):null,public_display_name:clean(body.publicDisplayName,80),public_caption:clean(body.memoryText,500),gallery_status:'pending',bonus_entries_awarded:0,bonus_entries_pending:0};
      try{
        const existing=(await sb(`contest_entries?contest_id=eq.${c.id}&normalized_email=eq.${encodeURIComponent(email)}&select=*&limit=1`).catch(()=>[]))?.[0]||null;
        if(existing){
          if(!(c.contest_type==='retail'&&c.receipt_bonus_enabled&&clean(body.receiptAssetKey,500))){
            return jsonResponse(409,{ok:false,code:'duplicate',message:'An entry has already been received for this email address. You can still submit another unique receipt for bonus entries.'});
          }
          const receipt=await processReceiptClaim({contest:c,entry:existing,body}).catch(error=>{console.error('processReceiptClaim existing entry',error);return{status:'pending',requested:0,awarded:0,pending:0,publicMessage:'Your existing contest entry remains valid. We saved this receipt for manual review.'};});
          return jsonResponse(200,{ok:true,entryId:existing.id,existingEntry:true,receipt,confirmation:{heading:'Receipt received',message:'Your original contest entry remains in place. This receipt was checked separately for bonus entries.',ctaLabel:c.confirmation_cta_label,ctaUrl:c.confirmation_cta_url}});
        }
        const created=(await sb('contest_entries',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(record)}))?.[0];
        let receipt=null;
        if(c.contest_type==='retail'&&c.receipt_bonus_enabled&&clean(body.receiptAssetKey,500)){
          receipt=await processReceiptClaim({contest:c,entry:created,body}).catch(error=>{console.error('processReceiptClaim',error);return{status:'pending',requested:0,awarded:0,pending:0,publicMessage:'Your base entry is in. We saved your receipt for manual review.'};});
        }
        return jsonResponse(201,{ok:true,entryId:created?.id,receipt,confirmation:{heading:c.confirmation_heading,message:c.confirmation_message,ctaLabel:c.confirmation_cta_label,ctaUrl:c.confirmation_cta_url}});
      }catch(e){if(e.status===409||/duplicate|unique/i.test(e.message))return jsonResponse(409,{ok:false,code:'duplicate',message:'An entry has already been received for this email address. You can still submit another unique receipt for bonus entries.'});throw e}
    }
    return jsonResponse(405,{ok:false,message:'Method not allowed.'});
  }catch(e){console.error('contest-public',e);return jsonResponse(500,{ok:false,message:'The contest service is temporarily unavailable.'});}
};
export const config={path:'/api/contests'};
