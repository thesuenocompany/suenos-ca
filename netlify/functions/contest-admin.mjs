import { randomInt } from 'node:crypto';
import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';
import { jsonResponse, originAllowed } from './_hotline-http.mjs';
import { buildOfficialRulesHtml, buildAbbreviatedRules, normalizeRulesConfig } from './_contest-rules-template.mjs';
const base=()=>String(process.env.SUPABASE_URL||'https://dowfjjthshbbgnvwxzjv.supabase.co').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const headers=(extra={})=>({apikey:key(),authorization:`Bearer ${key()}`,'content-type':'application/json',...extra});
async function sb(path,options={}){if(!key())throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');const r=await fetch(`${base()}/rest/v1/${path}`,{...options,headers:headers(options.headers)});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok){const e=new Error(data?.message||'Database request failed.');e.status=r.status;throw e}return data;}
const clean=(v,n=50000)=>String(v??'').trim().slice(0,n);
const escapeHtml=v=>clean(v,20000).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;').replaceAll("'",'&#039;');
const slugify=v=>clean(v,120).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const sanitizeHtml=v=>clean(v).replace(/<script[\s\S]*?<\/script>/gi,'').replace(/\son\w+\s*=\s*(["']).*?\1/gi,'').replace(/javascript:/gi,'');
const auth=request=>verifyAdminToken(getBearerToken(request),process.env.HOTLINE_ADMIN_SECRET);
const allowed=['contest_type','internal_name','public_name','slug','status','featured','show_before_start','eyebrow','headline','intro_copy','description_html','desktop_hero_url','mobile_hero_url','hero_alt','hero_object_position','prize_title','prize_description','prize_value','winner_count','included_items','excluded_items','redemption_restrictions','prize_expiry','prize_image_urls','start_at','close_at','draw_at','timezone','minimum_age','eligible_provinces','eligible_regions','excluded_people','entry_limit','phone_enabled','phone_required','city_required','postal_required','province_required','custom_question_enabled','custom_question_label','custom_question_type','custom_question_options','marketing_enabled','marketing_consent_text','marketing_consent_version','abbreviated_rules','full_rules_html','external_rules_url','rules_pdf_url','rules_version','confirmation_heading','confirmation_message','confirmation_cta_label','confirmation_cta_url','publish_winner','published_winner_name','published_winner_city','homepage_promotion_enabled','homepage_promotion_headline','homepage_promotion_image','homepage_promotion_cta','homepage_promotion_start_at','homepage_promotion_end_at','layout_style','photo_entries_enabled','written_entries_enabled','festival_start_at','festival_end_at','event_location','privacy_contact_name','privacy_contact_email','legal_sponsor_name','legal_sponsor_address','platform_disclaimer','photo_rights_text','photo_rights_version','alcohol_excluded','prize_image_url','gallery_heading','gallery_subheading','retail_parent_id','retail_is_master','retailer_name','retailer_code','retailer_logo_url','retailer_display_address','retail_require_address','age_requirement_mode','receipt_bonus_enabled','receipt_bonus_per_item','receipt_bonus_max_per_receipt','receipt_bonus_help_text','rules_template_enabled','rules_config','receipt_bonus_enabled','receipt_bonus_per_item','receipt_bonus_max_per_receipt','receipt_bonus_help_text','receipt_bonus_auto_approve_confidence','receipt_bonus_no_purchase_method','receipt_bonus_override'];
const pick=body=>Object.fromEntries(allowed.filter(k=>k in body).map(k=>[k,k.endsWith('_html')?sanitizeHtml(body[k]):k==='rules_config'?normalizeRulesConfig(body[k]):body[k]]));
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
const normalizeQrBox=value=>{const v=value&&typeof value==='object'?value:{};let x=clamp01(v.x),y=clamp01(v.y),width=clamp01(v.width),height=clamp01(v.height);width=Math.max(.03,Math.min(width,1-x));height=Math.max(.03,Math.min(height,1-y));return{x,y,width,height};};
const normalizePrintInches=value=>Math.max(1,Math.min(60,Number(value)||0));
async function audit(contest_id,action,details={}){await sb('contest_audit_log',{method:'POST',body:JSON.stringify({contest_id,action,actor:'Sueños admin',details})});}
export default async request=>{
 if(!originAllowed(request))return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
 if(!auth(request))return jsonResponse(401,{ok:false,message:'Admin session expired.'});
 const url=new URL(request.url),action=url.searchParams.get('action')||'list',id=clean(url.searchParams.get('id'),80);
 try{
  if(request.method==='GET'&&action==='list'){const contests=await sb('contests?select=*&order=updated_at.desc');for(const c of contests){const cnt=await sb(`contest_entries?contest_id=eq.${c.id}&status=eq.valid&select=id`,{headers:{Prefer:'count=exact'}}).catch(()=>[]);const blocks=await sb(`contest_age_blocks?contest_id=eq.${c.id}&select=id`,{headers:{Prefer:'count=exact'}}).catch(()=>[]);c.entry_count=cnt?.length||0;c.age_block_count=blocks?.length||0;}return jsonResponse(200,{ok:true,contests});}

  if(request.method==='GET'&&action==='receipt-review-summary'){
    const claims=await sb(`contest_receipt_claims?status=eq.pending&select=*&order=created_at.asc`).catch(()=>[]);
    const rows=[];
    for(const claim of claims){
      const contest=(await sb(`contests?id=eq.${claim.contest_id}&select=id,internal_name,public_name,retailer_name,slug&limit=1`).catch(()=>[]))?.[0]||{};
      const entry=(await sb(`contest_entries?id=eq.${claim.entry_id}&select=id,first_name,last_name,email,province,city&limit=1`).catch(()=>[]))?.[0]||{};
      rows.push({...claim,contest,entry});
    }
    return jsonResponse(200,{ok:true,count:rows.length,claims:rows});
  }
  if(request.method==='GET'&&action==='entries'){
    const q=clean(url.searchParams.get('q'),120),status=clean(url.searchParams.get('status'),30),page=Math.max(1,Number(url.searchParams.get('page'))||1),limit=50,offset=(page-1)*limit;
    let path=`contest_entries?contest_id=eq.${id}&select=*&order=created_at.desc&limit=${limit}&offset=${offset}`;
    if(status)path+=`&status=eq.${encodeURIComponent(status)}`;
    if(q)path+=`&or=(first_name.ilike.*${encodeURIComponent(q)}*,last_name.ilike.*${encodeURIComponent(q)}*,email.ilike.*${encodeURIComponent(q)}*,city.ilike.*${encodeURIComponent(q)}*)`;
    const entries=await sb(path);
    const claims=await sb(`contest_receipt_claims?contest_id=eq.${id}&select=*&order=created_at.desc`).catch(()=>[]);
    const claimByEntry={};
    for(const claim of claims){if(!claimByEntry[claim.entry_id])claimByEntry[claim.entry_id]=claim;}
    entries.forEach(entry=>{entry.receipt_claim=claimByEntry[entry.id]||null;});
    const winners=await sb(`contest_winner_selections?contest_id=eq.${id}&select=*&order=selected_at.desc`);
    const winnerEntries={};
    for(const w of winners){if(!winnerEntries[w.entry_id]){const row=(await sb(`contest_entries?id=eq.${w.entry_id}&select=id,first_name,last_name,email,phone,city,province,bonus_entries_awarded&limit=1`))?.[0];if(row)winnerEntries[w.entry_id]=row;}}
    return jsonResponse(200,{ok:true,entries,winners,winnerEntries});
  }
  if(request.method==='GET'&&action==='export'){
    const entries=await sb(`contest_entries?contest_id=eq.${id}&select=*&order=created_at.asc`);
    const cols=['created_at','first_name','last_name','email','birth_date','phone','address_line1','address_line2','city','postal_code','province','legal_age_required','rules_version','marketing_consent','marketing_consent_at','custom_response','utm_source','utm_medium','utm_campaign','utm_content','status','bonus_entries_awarded','bonus_entries_pending','disqualification_reason'];
    const esc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const csv=[cols.join(','),...entries.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');
    return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="contest-entries.csv"'}});
  }

  if(request.method==='GET'&&action==='retail-social-config'){
    const row=(await sb(`contests?id=eq.${id}&select=id,contest_type,retail_is_master,retail_parent_id,internal_name,retailer_name,retailer_code,retailer_logo_url,slug,retail_social_creatives&limit=1`))?.[0];
    if(!row)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(row.contest_type!=='retail')return jsonResponse(400,{ok:false,message:'Social creative packs are only available for retail contests.'});
    let source=row,inherited=false;
    if(!row.retail_is_master){
      if(!row.retail_parent_id)return jsonResponse(409,{ok:false,message:'This retailer page is not connected to a master campaign.'});
      source=(await sb(`contests?id=eq.${row.retail_parent_id}&select=id,internal_name,retail_social_creatives&limit=1`))?.[0];
      if(!source)return jsonResponse(404,{ok:false,message:'The master retail campaign could not be found.'});
      inherited=true;
    }
    return jsonResponse(200,{ok:true,config:{creatives:Array.isArray(source.retail_social_creatives)?source.retail_social_creatives:[],source_contest_id:source.id,source_internal_name:source.internal_name,inherited,request_contest_id:row.id,request_retailer_name:row.retailer_name||null,request_retailer_code:row.retailer_code||null,request_retailer_logo_url:row.retailer_logo_url||null,request_slug:row.slug}});
  }
  if(request.method==='POST'&&action==='retail-social-config'){
    const body=await request.json().catch(()=>({}));
    const c=(await sb(`contests?id=eq.${id}&select=id,contest_type,retail_is_master,internal_name&limit=1`))?.[0];
    if(!c)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(c.contest_type!=='retail')return jsonResponse(400,{ok:false,message:'Social creative packs are only available for retail contests.'});
    if(!c.retail_is_master)return jsonResponse(409,{ok:false,message:'Social artwork and placement must be edited on the master retail campaign.'});
    const items=(Array.isArray(body.creatives)?body.creatives:[]).slice(0,4).map((item,index)=>{
      const url=clean(item?.url,1200),name=clean(item?.name,240)||`Social creative ${index+1}`;
      if(url&&!url.startsWith('/api/contest-assets/'))throw Object.assign(new Error('Use an uploaded contest image for social creative artwork.'),{status:400});
      const box=item?.box?normalizeQrBox(item.box):null;
      return {url:url||'',name,box};
    });
    const patch={retail_social_creatives:items,updated_at:new Date().toISOString()};
    const rows=await sb(`contests?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
    await audit(id,'retail_social_creatives_updated',{count:items.filter(x=>x.url).length});
    return jsonResponse(200,{ok:true,config:{creatives:rows[0].retail_social_creatives||[],source_contest_id:id,source_internal_name:c.internal_name,inherited:false}});
  }
  if(request.method==='GET'&&action==='retail-print-config'){
    const row=(await sb(`contests?id=eq.${id}&select=id,contest_type,retail_is_master,retail_parent_id,internal_name,retailer_name,retailer_code,slug,retail_print_poster_url,retail_print_poster_name,retail_print_width_in,retail_print_height_in,retail_print_qr_box,retail_print_updated_at&limit=1`))?.[0];
    if(!row)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(row.contest_type!=='retail')return jsonResponse(400,{ok:false,message:'Print posters are only available for retail contests.'});
    let source=row;
    let inherited=false;
    if(!row.retail_is_master){
      if(!row.retail_parent_id)return jsonResponse(409,{ok:false,message:'This retailer page is not connected to a master campaign.'});
      source=(await sb(`contests?id=eq.${row.retail_parent_id}&select=id,contest_type,retail_is_master,internal_name,retail_print_poster_url,retail_print_poster_name,retail_print_width_in,retail_print_height_in,retail_print_qr_box,retail_print_updated_at&limit=1`))?.[0];
      if(!source)return jsonResponse(404,{ok:false,message:'The master retail campaign could not be found.'});
      inherited=true;
    }
    return jsonResponse(200,{ok:true,config:{...source,source_contest_id:source.id,source_internal_name:source.internal_name,inherited,request_contest_id:row.id,request_retailer_name:row.retailer_name||null,request_slug:row.slug}});
  }
  if(request.method==='POST'&&action==='retail-print-config'){
    const body=await request.json().catch(()=>({}));
    const c=(await sb(`contests?id=eq.${id}&select=id,contest_type,retail_is_master,internal_name&limit=1`))?.[0];
    if(!c)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(c.contest_type!=='retail')return jsonResponse(400,{ok:false,message:'Print posters are only available for retail contests.'});
    if(!c.retail_is_master)return jsonResponse(409,{ok:false,message:'Poster artwork and QR placement must be edited on the master retail campaign.'});
    const posterUrl=clean(body.posterUrl,1200);
    if(posterUrl&&!posterUrl.startsWith('/api/contest-assets/')&&!posterUrl.startsWith('/assets/templates/'))return jsonResponse(400,{ok:false,message:'Use an uploaded contest JPG or an included Sueños template.'});
    const widthIn=normalizePrintInches(body.widthIn||8),heightIn=normalizePrintInches(body.heightIn||12);
    const patch={retail_print_poster_url:posterUrl||null,retail_print_poster_name:clean(body.posterName,240)||null,retail_print_width_in:widthIn,retail_print_height_in:heightIn,retail_print_qr_box:body.qrBox?normalizeQrBox(body.qrBox):null,retail_print_updated_at:new Date().toISOString(),updated_at:new Date().toISOString()};
    const rows=await sb(`contests?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
    await audit(id,'retail_print_master_poster_updated',{posterUrl:patch.retail_print_poster_url,widthIn,heightIn,qrBox:patch.retail_print_qr_box});
    return jsonResponse(200,{ok:true,config:{...rows[0],source_contest_id:id,source_internal_name:c.internal_name,inherited:false}});
  }
  if(request.method==='POST'&&action==='save'){const body=await request.json();const data=pick(body);data.slug=slugify(data.slug||data.public_name||data.internal_name);data.updated_at=new Date().toISOString();if(data.rules_template_enabled!==false){data.rules_template_enabled=true;data.rules_config=normalizeRulesConfig(data.rules_config);const merged={...body,...data};data.full_rules_html=buildOfficialRulesHtml(merged);data.abbreviated_rules=buildAbbreviatedRules(merged);data.external_rules_url=null;data.rules_pdf_url=null;}if(body.id){const rows=await sb(`contests?id=eq.${body.id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});await audit(body.id,'contest_updated');return jsonResponse(200,{ok:true,contest:rows[0]});}const rows=await sb('contests',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});await audit(rows[0].id,'contest_created');return jsonResponse(201,{ok:true,contest:rows[0]});}
  if(request.method==='POST'&&action==='duplicate'){const rows=await sb(`contests?id=eq.${id}&select=*&limit=1`);if(!rows?.length)return jsonResponse(404,{ok:false,message:'Contest not found.'});const c={...rows[0]};delete c.id;delete c.created_at;delete c.updated_at;c.status='draft';c.internal_name=`${c.internal_name} Copy`;c.public_name=`${c.public_name} Copy`;c.slug=`${c.slug}-copy-${Date.now().toString().slice(-5)}`;c.start_at=new Date(Date.now()+86400000).toISOString();c.close_at=new Date(Date.now()+8*86400000).toISOString();c.draw_at=null;c.published_winner_name=null;c.published_winner_city=null;const made=await sb('contests',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(c)});await audit(made[0].id,'contest_duplicated',{source:id});return jsonResponse(201,{ok:true,contest:made[0]});}
  if(request.method==='POST'&&action==='retail-duplicate'){
    const body=await request.json().catch(()=>({}));
    const retailerName=clean(body.retailerName,160);
    const retailerCode=slugify(body.retailerCode||retailerName);
    if(!retailerName||!retailerCode)return jsonResponse(400,{ok:false,message:'Retailer name is required.'});
    const source=(await sb(`contests?id=eq.${id}&select=*&limit=1`))?.[0];
    if(!source)return jsonResponse(404,{ok:false,message:'Source contest not found.'});
    if(source.contest_type!=='retail')return jsonResponse(400,{ok:false,message:'Only retail contests can create retailer pages.'});
    const masterId=source.retail_parent_id||source.id;
    const master=(source.retail_parent_id?(await sb(`contests?id=eq.${source.retail_parent_id}&select=*&limit=1`))?.[0]:source)||source;
    const copy={...master};
    for(const k of ['id','created_at','updated_at','entry_count','age_block_count','retail_print_poster_url','retail_print_poster_name','retail_print_width_in','retail_print_height_in','retail_print_qr_box','retail_print_updated_at','retail_social_creatives','retail_print_pdf_url','retail_print_pdf_name','retail_print_page'])delete copy[k];
    copy.contest_type='retail';
    copy.retail_parent_id=masterId;
    copy.receipt_bonus_override=null;
    copy.retail_is_master=false;
    copy.retailer_name=retailerName;
    copy.retailer_code=retailerCode;
    copy.retailer_logo_url=clean(body.retailerLogoUrl,1000)||null;
    copy.retailer_display_address=clean(body.retailerDisplayAddress,500)||null;
    copy.retail_require_address=body.retailRequireAddress!==false;
    copy.age_requirement_mode='regional';
    copy.phone_enabled=true;
    copy.phone_required=true;
    copy.city_required=true;
    copy.postal_required=true;
    copy.province_required=true;
    copy.status='draft';
    copy.internal_name=`${master.internal_name} — ${retailerName}`;
    copy.public_name=master.public_name;
    const baseSlug=slugify(master.slug.replace(/-(master|template)$/,''));
    let requestedSlug=slugify(body.slug||`${baseSlug}-${retailerCode}`);
    if(!requestedSlug)requestedSlug=`retail-contest-${Date.now().toString().slice(-6)}`;
    const exists=await sb(`contests?slug=eq.${encodeURIComponent(requestedSlug)}&select=id&limit=1`).catch(()=>[]);
    copy.slug=exists?.length?`${requestedSlug}-${Date.now().toString().slice(-5)}`:requestedSlug;
    copy.start_at=master.start_at;
    copy.close_at=master.close_at;
    copy.draw_at=master.draw_at;
    copy.published_winner_name=null;
    copy.published_winner_city=null;
    const made=await sb('contests',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(copy)});
    await audit(made[0].id,'retail_contest_created',{source:id,masterId,retailerName,retailerCode});
    return jsonResponse(201,{ok:true,contest:made[0]});
  }
  if(request.method==='GET'&&action==='retail-summary'){
    const root=(await sb(`contests?id=eq.${id}&select=id,retail_parent_id&limit=1`))?.[0];
    if(!root)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    const masterId=root.retail_parent_id||root.id;
    const pages=await sb(`contests?or=(id.eq.${masterId},retail_parent_id.eq.${masterId})&select=id,internal_name,public_name,slug,status,retail_is_master,retailer_name,retailer_code,retailer_logo_url,retailer_display_address,start_at,close_at,updated_at&order=retailer_name.asc`);
    for(const page of pages){const entries=await sb(`contest_entries?contest_id=eq.${page.id}&status=eq.valid&select=id`).catch(()=>[]);const blocks=await sb(`contest_age_blocks?contest_id=eq.${page.id}&select=id`).catch(()=>[]);page.entry_count=entries?.length||0;page.age_block_count=blocks?.length||0;}
    return jsonResponse(200,{ok:true,masterId,pages});
  }
  if(request.method==='POST'&&action==='gallery-moderate'){const body=await request.json();if(!['approved','rejected','pending'].includes(body.galleryStatus))return jsonResponse(400,{ok:false,message:'Invalid gallery status.'});const patch={gallery_status:body.galleryStatus,public_caption:clean(body.publicCaption,500),public_display_name:clean(body.publicDisplayName,80),public_alt_text:clean(body.publicAltText,240),gallery_group:clean(body.galleryGroup,80)||'festival-favourites',moderation_note:clean(body.note,1000),moderated_at:new Date().toISOString(),moderated_by:'admin'};await sb(`contest_entries?id=eq.${body.entryId}&contest_id=eq.${id}`,{method:'PATCH',body:JSON.stringify(patch)});await audit(id,'gallery_entry_'+body.galleryStatus,{entryId:body.entryId,note:patch.moderation_note});return jsonResponse(200,{ok:true});}
  if(request.method==='POST'&&action==='entry-status'){const body=await request.json();if(!['valid','disqualified'].includes(body.status))return jsonResponse(400,{ok:false,message:'Invalid entry status.'});if(body.status==='disqualified'&&!clean(body.reason,500))return jsonResponse(400,{ok:false,message:'A disqualification reason is required.'});const patch={status:body.status,disqualification_reason:body.status==='disqualified'?clean(body.reason,500):null,disqualified_at:body.status==='disqualified'?new Date().toISOString():null};await sb(`contest_entries?id=eq.${body.entryId}`,{method:'PATCH',body:JSON.stringify(patch)});await audit(id,body.status==='disqualified'?'entry_disqualified':'entry_restored',{entryId:body.entryId,reason:patch.disqualification_reason});return jsonResponse(200,{ok:true});}
  if(request.method==='POST'&&action==='receipt-status'){
    const body=await request.json();
    if(!['approved','rejected','pending','duplicate'].includes(body.status))return jsonResponse(400,{ok:false,message:'Invalid receipt status.'});
    const claim=(await sb(`contest_receipt_claims?id=eq.${body.claimId}&contest_id=eq.${id}&select=*&limit=1`))?.[0];
    if(!claim)return jsonResponse(404,{ok:false,message:'Receipt claim not found.'});
    const patch={status:body.status,reviewed_at:new Date().toISOString(),reviewed_by:'admin',rejection_reason:body.status==='approved'?null:clean(body.reason,1000)||claim.rejection_reason||null,bonus_entries_awarded:body.status==='approved'?Math.max(0,Number(body.bonusEntries||claim.bonus_entries_requested||claim.bonus_entries_awarded||0)):0};
    await sb(`contest_receipt_claims?id=eq.${body.claimId}`,{method:'PATCH',body:JSON.stringify(patch)});
    const claims=await sb(`contest_receipt_claims?entry_id=eq.${claim.entry_id}&select=status,bonus_entries_awarded,bonus_entries_requested`);
    const awarded=claims.filter(x=>x.status==='approved').reduce((sum,x)=>sum+Math.max(0,Number(x.bonus_entries_awarded)||0),0);
    const pending=claims.filter(x=>x.status==='pending').reduce((sum,x)=>sum+Math.max(0,Number(x.bonus_entries_requested)||0),0);
    await sb(`contest_entries?id=eq.${claim.entry_id}`,{method:'PATCH',body:JSON.stringify({bonus_entries_awarded:awarded,bonus_entries_pending:pending})});
    await audit(id,'receipt_claim_'+body.status,{claimId:body.claimId,entryId:claim.entry_id,bonusEntries:patch.bonus_entries_awarded,reason:patch.rejection_reason});
    return jsonResponse(200,{ok:true});
  }
  if(request.method==='POST'&&action==='draw'){
    const body=await request.json().catch(()=>({}));
    const c=(await sb(`contests?id=eq.${id}&select=*&limit=1`))?.[0];
    if(!c)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(Date.now()<new Date(c.close_at).getTime())return jsonResponse(409,{ok:false,message:'Winner selection is unavailable until the contest closes.'});
    const prior=await sb(`contest_winner_selections?contest_id=eq.${id}&select=entry_id,winner_status,winner_position`);
    const excluded=new Set(prior.map(x=>x.entry_id));
    const activeStatuses=new Set(['potential_winner','contacted','confirmed']);
    const activeCount=prior.filter(x=>activeStatuses.has(x.winner_status)).length;
    const configured=Math.max(1,Number(c.winner_count)||1);
    const remainingSlots=Math.max(0,configured-activeCount);
    if(!remainingSlots)return jsonResponse(409,{ok:false,message:'All configured winner positions are already filled. Increase the contest winner count or mark an existing selection declined or disqualified before drawing a replacement.'});
    const pool=(await sb(`contest_entries?contest_id=eq.${id}&status=eq.valid&select=*`)).filter(x=>!excluded.has(x.id));
    const requested=Math.max(1,Math.min(50,Number(body.count)||1));
    const count=Math.min(requested,remainingSlots,pool.length);
    if(!count)return jsonResponse(409,{ok:false,message:'There are no eligible entries remaining.'});
    const weightedEntries=pool.map(entry=>({...entry,__tickets:Math.max(1,1+Math.max(0,Number(entry.bonus_entries_awarded)||0))}));
    const poolSize=weightedEntries.reduce((sum,entry)=>sum+entry.__tickets,0);
    const nextPosition=Math.max(0,...prior.map(x=>Number(x.winner_position)||0))+1;
    const selected=[];
    for(let i=0;i<count;i++){
      let draw=randomInt(Math.max(1,weightedEntries.reduce((sum,entry)=>sum+entry.__tickets,0)));
      let chosenIndex=0;
      for(let idx=0;idx<weightedEntries.length;idx+=1){draw-=weightedEntries[idx].__tickets;if(draw<0){chosenIndex=idx;break;}}
      selected.push(weightedEntries.splice(chosenIndex,1)[0]);
    }
    const records=selected.map((e,i)=>({contest_id:id,entry_id:e.id,winner_position:nextPosition+i,selected_by:'Sueños admin',eligible_pool_size:poolSize,selection_method:'node_crypto_weighted_random_v1',winner_status:'potential_winner'}));
    const saved=await sb('contest_winner_selections',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(records)});
    await audit(id,'winner_draw',{poolSize,winners:records.length,requested,remainingSlots,weighted:true});
    return jsonResponse(200,{ok:true,selections:saved,entries:selected.map(e=>({id:e.id,first_name:e.first_name,last_name:e.last_name,email:e.email,city:e.city,bonus_entries_awarded:e.bonus_entries_awarded||0}))});
  }

  if(request.method==='POST'&&action==='email-winner'){
    const body=await request.json();
    const selectionId=clean(body.selectionId,80),subject=clean(body.subject,180),message=clean(body.message,8000);
    if(!selectionId||!subject||!message)return jsonResponse(400,{ok:false,message:'Winner, subject and message are required.'});
    const selection=(await sb(`contest_winner_selections?id=eq.${selectionId}&contest_id=eq.${id}&select=*&limit=1`))?.[0];
    if(!selection)return jsonResponse(404,{ok:false,message:'Winner selection not found.'});
    const entry=(await sb(`contest_entries?id=eq.${selection.entry_id}&select=id,first_name,last_name,email,city&limit=1`))?.[0];
    const contest=(await sb(`contests?id=eq.${id}&select=id,public_name,prize_title,slug&limit=1`))?.[0];
    if(!entry||!contest)return jsonResponse(404,{ok:false,message:'Winner or contest record not found.'});
    const apiKey=process.env.RESEND_API_KEY,fromEmail=process.env.CONTACT_FROM_EMAIL||'Sueños Artisan Tequila <sales@suenos.ca>';
    if(!apiKey)return jsonResponse(500,{ok:false,message:'RESEND_API_KEY is not configured.'});
    const personalized=message.replaceAll('{{first_name}}',entry.first_name).replaceAll('{{contest_name}}',contest.public_name).replaceAll('{{prize_name}}',contest.prize_title||'the contest prize');
    const safeMessage=escapeHtml(personalized).replaceAll('\n','<br>');
    const html=`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#171717;max-width:680px;margin:auto"><div style="background:#07191b;padding:24px 28px;border-bottom:6px solid #d8a43b"><h1 style="margin:0;color:#fff;font-size:25px">Sueños Artisan Tequila</h1></div><div style="padding:28px;background:#fffaf0"><p>${safeMessage}</p><p style="margin-top:28px">Sueños Artisan Tequila<br><a href="https://suenos.ca">suenos.ca</a></p></div></div>`;
    try{
      const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from:fromEmail,to:[entry.email],reply_to:'sales@suenos.ca',subject,text:personalized,html,tags:[{name:'source',value:'contest-winner'},{name:'contest',value:clean(contest.slug,256)}]})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){await sb(`contest_winner_selections?id=eq.${selectionId}`,{method:'PATCH',body:JSON.stringify({contact_email_error:clean(result?.message||'Email delivery failed.',1000),contact_attempts:Number(selection.contact_attempts||0)+1})});throw Object.assign(new Error(result?.message||'Winner email could not be sent.'),{status:502});}
      const sentAt=new Date().toISOString();
      await sb(`contest_winner_selections?id=eq.${selectionId}`,{method:'PATCH',body:JSON.stringify({winner_status:'contacted',contact_email_sent_at:sentAt,contact_email_subject:subject,contact_email_message:personalized,contact_email_resend_id:result.id||null,contact_email_error:null,contact_attempts:Number(selection.contact_attempts||0)+1})});
      await audit(id,'winner_contact_email_sent',{selectionId,entryId:entry.id,resendId:result.id||null});
      return jsonResponse(200,{ok:true,message:`Email sent to ${entry.first_name} ${entry.last_name}.`,sentAt});
    }catch(e){if(!e.status)console.error('winner email',e);throw e;}
  }

  if(request.method==='POST'&&action==='update-dates'){
    const body=await request.json().catch(()=>({}));
    const startAt=new Date(body.startAt),closeAt=new Date(body.closeAt);
    if(Number.isNaN(startAt.getTime())||Number.isNaN(closeAt.getTime()))return jsonResponse(400,{ok:false,message:'Enter valid start and end dates.'});
    if(closeAt<=startAt)return jsonResponse(400,{ok:false,message:'End date must be after the start date.'});
    const row=(await sb(`contests?id=eq.${id}&select=id,internal_name,status,draw_at&limit=1`))?.[0];
    if(!row)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(row.status==='archived')return jsonResponse(409,{ok:false,message:'Restore this contest before changing its dates.'});
    if(row.draw_at&&new Date(row.draw_at).getTime()<closeAt.getTime())return jsonResponse(409,{ok:false,message:'The current draw date is before the new closing date. Open Manage and move the draw date first.'});
    const patch={start_at:startAt.toISOString(),close_at:closeAt.toISOString(),updated_at:new Date().toISOString()};
    const updated=(await sb(`contests?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)}))?.[0];
    await audit(id,'contest_dates_updated_from_card',{start_at:patch.start_at,close_at:patch.close_at});
    return jsonResponse(200,{ok:true,contest:updated});
  }
  if(request.method==='POST'&&action==='toggle-status'){
    const body=await request.json().catch(()=>({}));
    const next=body.enabled===true?'published':'draft';
    const row=(await sb(`contests?id=eq.${id}&select=id,status,contest_type,retail_is_master,internal_name&limit=1`))?.[0];
    if(!row)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(row.status==='archived')return jsonResponse(409,{ok:false,message:'Restore this contest before turning it on.'});
    const updated=(await sb(`contests?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({status:next,updated_at:new Date().toISOString()})}))?.[0];
    await audit(id,next==='published'?'contest_turned_on':'contest_turned_off',{previous_status:row.status,retail_master:Boolean(row.retail_is_master)});
    return jsonResponse(200,{ok:true,contest:updated});
  }
  if(request.method==='POST'&&action==='archive'){await sb(`contests?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status:'archived',updated_at:new Date().toISOString()})});await audit(id,'contest_archived');return jsonResponse(200,{ok:true});}
  if(request.method==='POST'&&action==='restore'){await sb(`contests?id=eq.${id}`,{method:'PATCH',body:JSON.stringify({status:'draft',updated_at:new Date().toISOString()})});await audit(id,'contest_restored',{restored_status:'draft'});return jsonResponse(200,{ok:true});}
  return jsonResponse(405,{ok:false,message:'Unsupported action.'});
 }catch(e){console.error('contest-admin',e);return jsonResponse(e.status||500,{ok:false,message:e.message||'Contest admin request failed.'});}
};
export const config={path:'/api/contest-admin'};
