const clean=(v,n=20000)=>String(v??'').trim().slice(0,n);
const esc=v=>clean(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const tzLabel=tz=>({
  'America/Vancouver':'Pacific Time',
  'America/Edmonton':'Mountain Time',
  'America/Winnipeg':'Central Time',
  'America/Toronto':'Eastern Time',
  'America/Halifax':'Atlantic Time',
  'America/St_Johns':'Newfoundland Time'
}[tz]||clean(tz,80)||'Pacific Time');
const datePart=(value,tz)=>value?new Intl.DateTimeFormat('en-CA',{dateStyle:'long',timeZone:tz}).format(new Date(value)):'[DATE]';
const timePart=(value,tz)=>value?new Intl.DateTimeFormat('en-CA',{hour:'numeric',minute:'2-digit',timeZone:tz}).format(new Date(value)):'[TIME]';
const provinceNames={BC:'British Columbia',AB:'Alberta',SK:'Saskatchewan',MB:'Manitoba',ON:'Ontario',QC:'Quebec',NB:'New Brunswick',NS:'Nova Scotia',PE:'Prince Edward Island',NL:'Newfoundland and Labrador',YT:'Yukon',NT:'Northwest Territories',NU:'Nunavut'};
const allExcludingQuebec=['BC','AB','SK','MB','ON','NB','NS','PE','NL','YT','NT','NU'];
const listText=items=>items.length<2?(items[0]||''):items.length===2?`${items[0]} and ${items[1]}`:`${items.slice(0,-1).join(', ')}, and ${items.at(-1)}`;
const defaultConfig={
  eligibility_scope:'canada_excluding_quebec',
  entry_method:'online_form',
  free_entry_method:'same_online_form',
  response_window:'48_hours',
  delivery_method:'shipped',
  content_terms:'include',
  social_disclaimer:'include'
};
export const normalizeRulesConfig=value=>({...defaultConfig,...((value&&typeof value==='object'&&!Array.isArray(value))?value:{})});
const contestUrl=c=>`https://suenos.ca/en-ca/contests/${encodeURIComponent(clean(c.slug,120))}/`;
const eligibilityText=(c,cfg)=>{
  if(cfg.eligibility_scope==='bc_only')return 'legal residents of British Columbia who have reached the legal drinking age in British Columbia at the time of entry';
  if(cfg.eligibility_scope==='alberta_only')return 'legal residents of Alberta who have reached the legal drinking age in Alberta at the time of entry';
  if(cfg.eligibility_scope==='bc_alberta')return 'legal residents of British Columbia and Alberta who have reached the legal drinking age in their province of residence at the time of entry';
  if(cfg.eligibility_scope==='custom'){
    const codes=(Array.isArray(c.eligible_provinces)?c.eligible_provinces:[]).map(x=>String(x).toUpperCase()).filter(Boolean);
    const names=codes.map(x=>provinceNames[x]||x);
    return `legal residents of ${esc(listText(names)||'the eligible provinces and territories identified on the Contest page')} who have reached the legal drinking age in their province or territory of residence at the time of entry`;
  }
  return 'legal residents of Canada, excluding Quebec, who have reached the legal drinking age in their province or territory of residence at the time of entry';
};
const entryMethod=(c,cfg)=>{
  if(cfg.entry_method==='in_person')return 'complete and submit an official Contest ballot at the participating location identified on the Contest page';
  if(cfg.entry_method==='social_media')return 'follow the entry instructions published in the Sponsor’s designated social-media Contest post';
  if(cfg.entry_method==='custom')return clean(cfg.custom_entry_method,1500)||'follow the entry instructions displayed on the Contest page';
  return `complete and submit the entry form at <a href="${contestUrl(c)}">${esc(contestUrl(c))}</a>`;
};
const freeEntryMethod=(c,cfg)=>{
  if(cfg.free_entry_method==='email')return `send an email to <a href="mailto:sales@suenos.ca">sales@suenos.ca</a> with “${esc(c.public_name||'Contest')} Entry” in the subject line and include their full name, date of birth, province or territory, telephone number and email address`;
  if(cfg.free_entry_method==='mail')return 'mail a handwritten entry containing their full name, date of birth, province or territory, telephone number and email address to the Sponsor at the address listed in section 1, with the Contest name written on the envelope';
  if(cfg.free_entry_method==='custom')return clean(cfg.custom_free_entry_method,1500)||'use the free alternative entry method displayed on the Contest page';
  return 'complete the same online entry form; no purchase is required at any stage of entry';
};
const responseWindow=cfg=>({
  '24_hours':'24 hours',
  '48_hours':'48 hours',
  '72_hours':'72 hours',
  '5_days':'five days',
  '7_days':'seven days'
}[cfg.response_window]||'48 hours');
const deliveryText=cfg=>({
  shipped:'shipped',
  collected:'collected from the participating retailer or another location designated by the Sponsor',
  delivered:'delivered by the Sponsor or its designated representative',
  arranged:'provided using a delivery or collection method arranged directly with the confirmed winner'
}[cfg.delivery_method]||'shipped');
const prizeDescription=c=>{
  const pieces=[];
  if(c.prize_description)pieces.push(esc(c.prize_description));
  if(c.included_items)pieces.push(`<strong>Included:</strong> ${esc(c.included_items)}`);
  if(c.excluded_items)pieces.push(`<strong>Excluded:</strong> ${esc(c.excluded_items)}`);
  return pieces.length?pieces.join('<br>'):esc(c.prize_title||'the prize described on the Contest page');
};
const contentSections=(c,cfg)=>cfg.content_terms==='include'||(cfg.content_terms==='auto'&&(c.contest_type==='photo_scrapbook'||c.photo_entries_enabled));
export function buildOfficialRulesHtml(contest){
  const c=contest||{},cfg=normalizeRulesConfig(c.rules_config),tz=clean(c.timezone,80)||'America/Vancouver';
  const name=esc(c.public_name||'Sueños Contest');
  const winners=Math.max(1,Number(c.winner_count)||1);
  const value=Number(c.prize_value||0).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2});
  const drawDate=c.draw_at?datePart(c.draw_at,tz):'a date selected by the Sponsor after the Contest closes';
  const limit=c.contest_type==='retail'?'one entry per person for each participating retailer page':'one entry per person during the Contest Period';
  const content=contentSections(c,cfg);
  const sections=[];
  sections.push(`<section><h3>1. Contest period</h3><p>The ${name} (the “Contest”) begins on ${esc(datePart(c.start_at,tz))} at ${esc(timePart(c.start_at,tz))} ${esc(tzLabel(tz))} and ends on ${esc(datePart(c.close_at,tz))} at ${esc(timePart(c.close_at,tz))} ${esc(tzLabel(tz))} (the “Contest Period”).</p><p>The Contest is sponsored and administered by:</p><address><strong>Sueños Spirits</strong><br>973 Lakeshore Drive<br>Salmon Arm, British Columbia<br>V1E 1E4<br>Email: <a href="mailto:sales@suenos.ca">sales@suenos.ca</a></address><p>(the “Sponsor”).</p></section>`);
  sections.push(`<section><h3>2. Eligibility</h3><p>The Contest is open to ${eligibilityText(c,cfg)}.</p><p>Employees, representatives, agents, officers and directors of the Sponsor, its affiliated companies, advertising and promotional agencies, prize suppliers, and members of their immediate families or households are not eligible to enter.</p><p>“Immediate family” includes a spouse, parent, child, sibling and their respective spouses, regardless of where they reside.</p></section>`);
  if(c.contest_type==='retail'&&c.receipt_bonus_enabled){
    const bonusPerItem=Math.max(1,Number(c.receipt_bonus_per_item)||1),bonusMax=Math.max(1,Number(c.receipt_bonus_max_per_receipt)||10);
    const noPurchaseBonus=clean(c.receipt_bonus_no_purchase_method,2000)||'email sales@suenos.ca during the Contest Period with the Contest name, their full name and the words “Bonus Entry Request” in the subject line, and follow the no-purchase bonus-entry instructions provided by the Sponsor';
    sections.push(`<section><h3>3. No purchase necessary</h3><p>No purchase is necessary to enter or win. Eligible entrants may receive the base Contest entry without making a purchase. The Contest also offers optional bonus entries connected to eligible Sueños purchases, with an equivalent no-purchase method described below so that a purchase is not required to obtain the same number of bonus entries.</p></section>`);
    sections.push(`<section><h3>4. How to enter</h3><p>During the Contest Period, eligible entrants may enter by: ${entryMethod(c,cfg)}.</p><p>Limit of ${esc(limit)}, unless otherwise stated. Entries generated by automated means, scripts, bots or other unauthorized methods are prohibited.</p><p><strong>Receipt bonus entries:</strong> An entrant who makes an eligible Sueños purchase may upload one or more unique complete receipts through the Contest page. Each receipt must be from the participating retailer identified on that retailer-specific Contest page. Subject to validation, the entrant will receive ${bonusPerItem} bonus entr${bonusPerItem===1?'y':'ies'} for each eligible Sueños item shown on the receipt, to a maximum of ${bonusMax} bonus entries per receipt. Receipts may be reviewed automatically and/or manually. Receipts from a different retailer, duplicate receipts, incomplete receipts, altered receipts, unreadable receipts or otherwise ineligible receipts may be rejected.</p><p><strong>Equivalent no-purchase bonus method:</strong> To receive equivalent bonus entries without making a purchase, an eligible entrant may ${esc(noPurchaseBonus)}. No-purchase bonus entries receive the same consideration as receipt-based bonus entries.</p><p>To enter without making a purchase, an eligible entrant may also ${freeEntryMethod(c,cfg)} for the base Contest entry.</p><p>All entries and bonus-entry requests must be received before the end of the Contest Period. The Sponsor is not responsible for entries that are late, lost, incomplete, misdirected, corrupted or not received for any reason.</p></section>`);
  }else{
    sections.push(`<section><h3>3. No purchase necessary</h3><p>No purchase is necessary to enter or win. Making a purchase will not increase an entrant’s chances of winning.</p></section>`);
    sections.push(`<section><h3>4. How to enter</h3><p>During the Contest Period, eligible entrants may enter by: ${entryMethod(c,cfg)}.</p><p>Limit of ${esc(limit)}, unless otherwise stated. Entries generated by automated means, scripts, bots or other unauthorized methods are prohibited.</p><p>To enter without making a purchase, an eligible entrant may ${freeEntryMethod(c,cfg)}. A no-purchase entry will receive the same consideration and have the same odds of winning as any other eligible entry.</p><p>All entries must be received before the end of the Contest Period. The Sponsor is not responsible for entries that are late, lost, incomplete, misdirected, corrupted or not received for any reason.</p></section>`);
  }
  sections.push(`<section><h3>5. Prize</h3><p>There ${winners===1?'is':'are'} ${winners} prize${winners===1?'':'s'} available to be won, consisting of:</p><p>${prizeDescription(c)}</p><p>The approximate retail value of ${winners===1?'the prize':'each prize'} is $${esc(value)} CAD.</p><p>The prize must be accepted as awarded and cannot be transferred, substituted or redeemed for cash, except at the Sponsor’s discretion. The Sponsor may substitute a prize or prize component with another item of equal or greater retail value if the advertised prize becomes unavailable.</p><p>Any costs or expenses not specifically identified as part of the prize are the winner’s responsibility.</p><p>Alcohol is not included unless expressly stated and legally permitted.</p></section>`);
  sections.push(`<section><h3>6. Winner selection and odds</h3><p>On or about ${esc(drawDate)}, the Sponsor will conduct a random draw from all eligible entries received during the Contest Period.</p><p>The odds of winning depend on the number of eligible entries received.</p><p>The selected entrant will be contacted using the email address, telephone number, social-media account or other contact information provided with their entry. The selected entrant must respond within ${esc(responseWindow(cfg))} after the Sponsor’s first contact attempt.</p><p>Before being confirmed as the winner, the selected entrant must:</p><ul><li>correctly answer, without assistance, a time-limited mathematical skill-testing question;</li><li>confirm their eligibility;</li><li>provide proof of age and Canadian residency if requested; and</li><li>sign and return any declaration, release or prize-acceptance documents reasonably required by the Sponsor.</li></ul><p>If a selected entrant cannot be contacted, does not respond within the required period, answers the skill-testing question incorrectly, fails to provide the required documents or otherwise does not comply with these rules, they will be disqualified. The Sponsor may then select another entrant by random draw.</p></section>`);
  sections.push(`<section><h3>7. Prize delivery</h3><p>The Sponsor will arrange for the prize to be ${esc(deliveryText(cfg))} within a reasonable period after the winner has been confirmed.</p><p>The winner is responsible for providing accurate delivery or collection information. The Sponsor is not responsible for a prize that cannot be delivered because of incorrect information supplied by the winner or the winner’s failure to claim or accept it.</p></section>`);
  sections.push(`<section><h3>8. Personal information and marketing consent</h3><p>Personal information collected in connection with the Contest will be used to administer the Contest, verify eligibility, contact selected entrants, deliver the prize and comply with applicable legal requirements.</p><p>Personal information will be handled in accordance with the Sponsor’s <a href="https://suenos.ca/en-ca/privacy-policy/" target="_blank" rel="noopener">Privacy Policy</a>.</p><p>Entering the Contest does not automatically subscribe an entrant to promotional emails or text messages. Any consent to receive marketing communications must be requested separately and may be withdrawn at any time.</p></section>`);
  sections.push(`<section><h3>9. Publicity</h3><p>Where permitted by law, the confirmed winner agrees that the Sponsor may publish their first name, last initial, city or community of residence and a reasonable photograph relating to the prize or Contest, without additional compensation.</p><p>Any broader use of the winner’s name, image, voice, likeness or submitted content will be subject to the permissions stated at the time of entry or in a separate release.</p></section>`);
  if(content){
    sections.push(`<section><h3>10. Submitted content</h3><p>If the Contest requires entrants to submit a photograph, video, caption, story or other content, each entrant confirms that:</p><ul><li>the submission is their original work or they have permission to use it;</li><li>the submission does not violate another person’s copyright, trademark, privacy, publicity or other rights;</li><li>every identifiable person appearing in the submission has consented to its submission and permitted use;</li><li>the submission does not contain unlawful, hateful, threatening, obscene or misleading material; and</li><li>the submission does not promote irresponsible or underage alcohol consumption.</li></ul><p>The entrant retains ownership of their submission. By entering, the entrant grants the Sponsor a non-exclusive, royalty-free licence to reproduce, display and share the submission for Contest administration, winner announcements and related Sueños marketing, subject to applicable law and any additional permissions stated at entry.</p></section>`);
    sections.push(`<section><h3>11. Responsible alcohol depiction</h3><p>Where alcohol appears in an entry, all individuals shown consuming or handling alcohol must be of legal drinking age in the location where the content was created.</p><p>Entries must not depict excessive or irresponsible consumption, impaired driving, dangerous activities involving alcohol, underage drinking, or alcohol consumption as contributing to social, professional, athletic or sexual success.</p></section>`);
  }
  const n=content?12:10;
  sections.push(`<section><h3>${n}. General conditions</h3><p>The Sponsor reserves the right to disqualify any entrant who:</p><ul><li>violates these rules;</li><li>provides false or misleading information;</li><li>tampers with the entry process;</li><li>attempts to obtain entries through fraud, automation or manipulation;</li><li>interferes with the operation of the Contest; or</li><li>behaves in a way that threatens, abuses or harasses the Sponsor, its representatives or other entrants.</li></ul><p>If fraud, technical failure, platform interruption, unauthorized intervention or another event beyond the Sponsor’s reasonable control affects the proper administration of the Contest, the Sponsor may cancel, suspend, extend or modify the Contest, subject to applicable law.</p><p>The Sponsor’s decisions concerning the administration of the Contest are final, subject to applicable law.</p></section>`);
  sections.push(`<section><h3>${n+1}. Release and limitation of liability</h3><p>By entering, each entrant agrees to release and hold harmless the Sponsor, its affiliates, prize suppliers, advertising and promotional agencies, and their respective directors, officers, employees, representatives and agents from claims arising from participation in the Contest or the acceptance, use or misuse of a prize, except where such a release is prohibited by law.</p><p>The Sponsor is not responsible for technical failures, interrupted communications, website errors, platform outages, unauthorized access, lost entries, incorrect entry information or other circumstances beyond its reasonable control.</p><p>Nothing in these rules limits any rights or remedies that cannot legally be excluded.</p></section>`);
  if(cfg.social_disclaimer!=='omit')sections.push(`<section><h3>${n+2}. Social-media disclaimer</h3><p>If the Contest is promoted or administered through Instagram, Facebook, TikTok or another social-media platform, the Contest is not sponsored, endorsed, administered by or associated with that platform.</p><p>Entrants release the applicable platform from responsibility relating to the Contest. Questions and comments concerning the Contest should be directed to Sueños Spirits and not to the social-media platform.</p></section>`);
  const governingNumber=n+(cfg.social_disclaimer!=='omit'?3:2);
  sections.push(`<section><h3>${governingNumber}. Governing law</h3><p>The Contest and these rules are governed by the laws of the Province of British Columbia and the applicable federal laws of Canada.</p><p>Any dispute relating to the Contest will be submitted to the courts of British Columbia unless applicable law requires otherwise.</p></section>`);
  sections.push(`<section><h3>${governingNumber+1}. Rules and winner information</h3><p>A copy of these Official Contest Rules may be obtained by contacting <a href="mailto:sales@suenos.ca">sales@suenos.ca</a>.</p><p>The confirmed winner’s first name, last initial and city or community of residence may be made available following the Contest, subject to applicable privacy law.</p></section>`);
  return `<div class="contest-rules-document"><h2>Sueños Spirits — Official Contest Rules</h2>${sections.join('')}</div>`;
}
export function buildAbbreviatedRules(contest){
  const c=contest||{},cfg=normalizeRulesConfig(c.rules_config);
  const geography=cfg.eligibility_scope==='bc_only'?'British Columbia':cfg.eligibility_scope==='alberta_only'?'Alberta':cfg.eligibility_scope==='bc_alberta'?'British Columbia and Alberta':'Canada excluding Quebec';
  const bonus=c.contest_type==='retail'&&c.receipt_bonus_enabled?' Optional receipt-based bonus entries are available with an equivalent no-purchase bonus-entry method; see Full Rules.':'';
  return `No purchase necessary. Open to eligible residents of ${geography} who have reached the legal drinking age in their province or territory. ${Math.max(1,Number(c.winner_count)||1)} prize${Math.max(1,Number(c.winner_count)||1)===1?'':'s'} available.${bonus} Odds depend on the number of eligible entries received, including approved bonus entries. A skill-testing question is required.`;
}
export const rulesConfigDefaults=defaultConfig;
