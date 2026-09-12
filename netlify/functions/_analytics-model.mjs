// Analytics schema: deliberately excludes customer form values and raw query strings.
export const EVENT_LABELS={page_view:'Page views',session_start:'Session starts',engagement:'Active time',age_gate_confirmed:'Age confirmations',find_bottle_click:'Find a Bottle clicks',retailer_locator_view:'Locator views',recipe_view:'Recipe views',print_recipe:'Recipe prints',outbound_click:'Outbound clicks',language_switch:'Language switches',contact_form_submit:'Contact inquiries',contact_form_error:'Contact errors',trade_form_step_view:'Trade form steps',trade_form_submit_success:'Trade inquiries',trade_form_submit_error:'Trade errors',trade_form_duplicate:'Duplicate trade inquiries',newsletter_signup_open:'Society form opens',newsletter_signup_submit:'Society signup attempts',where_next_submit:'Where Next requests',where_next_error:'Where Next errors',houseboat_form_start:'Houseboat form starts',houseboat_form_complete:'Houseboat inquiries',houseboat_dates_available:'Available date searches',houseboat_dates_unavailable:'Unavailable date searches',houseboat_details_revealed:'Houseboat details opened',houseboat_cta_click:'Houseboat clicks',form_start:'Form starts',scroll_depth:'Scroll depth',file_download:'Downloads',email_click:'Email clicks',phone_click:'Phone clicks',contest_entry_success:'Contest entries'};
export const KEY_EVENTS=['find_bottle_click','contact_form_submit','trade_form_submit_success','where_next_submit','houseboat_form_complete','contest_entry_success'];
export const clean=(v,max=120)=>String(v??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max);
export const safeTag=v=>/@|%40/i.test(String(v))?'(redacted)':clean(v);
export function safePath(v){try{const p=new URL(String(v||'/'),'https://suenos.ca').pathname.replace(/\/index\.html$/,'/');return /@|%40/i.test(p)?'/(redacted)':clean(p,300);}catch{return '/';}}
const id=v=>/^[a-zA-Z0-9-]{16,64}$/.test(v||'')?v:'';
export function normaliseEvent(body,geo={},now=new Date()){
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('Invalid event.');
  const event=body.event||'page_view';if(!Object.hasOwn(EVENT_LABELS,event))throw new Error('Unknown event.');
  const consent=['granted','denied','unselected'].includes(body.consent)?body.consent:'unselected';
  if(event!=='page_view'&&consent!=='granted')return null;
  const path=safePath(body.path);if(/^\/(admin|api)(\/|$)/.test(path))return null;
  const source=safeTag(body.utm_source||body.source||(body.fbclid?'facebook':body.referrerHost)||'direct').toLowerCase();
  return {version:2,id:id(body.id),at:now.toISOString(),event,path,source,medium:safeTag(body.utm_medium||body.medium).toLowerCase(),campaign:safeTag(body.utm_campaign||body.campaign),content:safeTag(body.utm_content||body.content),referrerHost:clean(body.referrerHost).replace(/[^a-z0-9.:-]/gi,''),metaLanding:!!(body.fbclid||/facebook|instagram|meta/i.test(source)),consent,gaStatus:body.gaStatus==='queued'?'queued':'not_initialized',visitor:consent==='granted'?id(body.visitor):'',session:consent==='granted'?id(body.session):'',returning:consent==='granted'&&body.returning===true,country:clean(geo.country?.code||(typeof geo.country==='string'?geo.country:''),8),province:clean(geo.subdivision?.name||geo.subdivision?.code,80),city:clean(geo.city,100),device:['mobile','tablet','desktop'].includes(body.device)?body.device:'unknown',language:clean(body.language,16),browser:clean(body.browser,24),overlayId:safeTag(body.overlayId),market:safeTag(body.market),form:['trade','contact','society','where-next','houseboat','contest'].includes(body.form)?body.form:'',step:Math.max(0,Math.min(10,Number(body.step)||0)),depth:[25,50,75,100].includes(Number(body.depth))?Number(body.depth):0,activeSeconds:event==='engagement'?Math.max(0,Math.min(30,Number(body.activeSeconds)||0)):0,destination:body.destination?safePath(body.destination):''};
}
export const localDay=(value,timeZone='America/Vancouver')=>new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
export const shiftDay=(date,delta)=>new Date(Date.parse(date+'T12:00:00Z')+delta*86400000).toISOString().slice(0,10);
export function reportRange(params,now=new Date()){
  const timeZone=params.get('timezone')||'America/Vancouver';
  if(!['America/Vancouver','America/Edmonton','America/Regina','America/Winnipeg','America/Toronto','UTC'].includes(timeZone))throw new Error('Choose a supported time zone.');
  const today=localDay(now,timeZone),days=Number(params.get('days')||30);
  if(!Number.isInteger(days)||days<1||days>90)throw new Error('Choose 1–90 days.');
  const end=params.get('end')||today,start=params.get('start')||shiftDay(end,-(days-1));
  const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!isNaN(Date.parse(d))&&new Date(d).toISOString().slice(0,10)===d;
  if(!valid(start)||!valid(end))throw new Error('Use valid start and end dates.');
  const length=Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;
  if(length<1||length>90||end>today)throw new Error('Choose 1–90 days ending today or earlier.');
  return {start,end,days:length,timeZone,today,previousStart:shiftDay(start,-length),previousEnd:shiftDay(start,-1)};
}
export function channelFor(r){
  const source=(r.source||'direct').toLowerCase(),medium=(r.medium||'').toLowerCase();
  if(/email|newsletter/.test(medium))return 'Email';if(/qr|print|offline/.test(medium))return 'QR / print';
  const social=/facebook|instagram|meta|tiktok|linkedin|pinterest/.test(source);
  if(/paid|cpc|ppc|cpm|display/.test(medium))return social?'Paid social':'Paid search / display';
  if(social)return 'Social (unclassified)';if(/google|bing|duckduckgo|yahoo/.test(source))return 'Organic search';return source==='direct'?'Direct':'Referral';
}
function metrics(rows){
  const views=rows.filter(r=>r.event==='page_view'),sessions=new Map(),visitors=new Set();
  for(const r of rows){if(r.visitor)visitors.add(r.visitor);if(!r.session)continue;const s=sessions.get(r.session)||{views:0,seconds:0,key:false,returning:false};s.views+=Number(r.event==='page_view');s.seconds+=r.activeSeconds||0;s.key||=KEY_EVENTS.includes(r.event);s.returning||=!!r.returning;sessions.set(r.session,s);}
  const values=[...sessions.values()],engaged=values.filter(s=>s.seconds>=10||s.views>=2||s.key).length,keySessions=values.filter(s=>s.key).length;
  return {pageviews:views.length,visitors:visitors.size,sessions:sessions.size,engagedSessions:engaged,engagementRate:values.length?engaged/values.length:null,conversionRate:values.length?keySessions/values.length:null,keyEvents:rows.filter(r=>KEY_EVENTS.includes(r.event)).length,keySessions,avgActiveSeconds:values.length?values.reduce((n,s)=>n+s.seconds,0)/values.length:null,returningSessions:values.filter(s=>s.returning).length,metaPageviews:views.filter(r=>r.metaLanding).length,consentedPageviews:views.filter(r=>r.consent==='granted').length,gaQueued:views.filter(r=>r.gaStatus==='queued').length,legacyPageviews:views.filter(r=>r.version!==2).length};
}
function group(rows,key){const groups=new Map();for(const r of rows){const name=key(r)||'(not set)';if(!groups.has(name))groups.set(name,[]);groups.get(name).push(r);}return [...groups].map(([name,items])=>({name,...metrics(items)})).sort((a,b)=>b.pageviews-a.pageviews||b.keyEvents-a.keyEvents).slice(0,100);}
export function buildReport(raw,range,filters={}){
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:range.timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  const seen=new Set();const all=raw.filter(r=>r&&Number.isFinite(Date.parse(r.at))).map(r=>({...r,path:safePath(r.path),event:r.event||'page_view',day:formatter.format(new Date(r.at))})).filter(r=>{if(r.id){if(seen.has(r.id))return false;seen.add(r.id);}return r.day>=range.previousStart&&r.day<=range.end;});
  const matches=r=>Object.entries(filters).every(([key,value])=>!value||(key==='channel'?channelFor(r):r[key])===value);
  const current=all.filter(r=>r.day>=range.start&&matches(r)),previous=all.filter(r=>r.day<=range.previousEnd&&matches(r));
  const counts=new Map();for(const r of current){if(['page_view','session_start','engagement'].includes(r.event))continue;const e=counts.get(r.event)||{event:r.event,name:EVENT_LABELS[r.event]||r.event,count:0,sessions:new Set()};e.count++;if(r.session)e.sessions.add(r.session);counts.set(r.event,e);}
  const events=[...counts.values()].map(e=>({...e,sessions:e.sessions.size})).sort((a,b)=>b.count-a.count);
  const series=[];for(let i=0;i<range.days;i++){const day=shiftDay(range.start,i),prev=shiftDay(range.previousStart,i);series.push({day,...metrics(current.filter(r=>r.day===day)),previousPageviews:previous.filter(r=>r.day===prev&&r.event==='page_view').length});}
  const sessionRows=new Map();for(const r of current){if(!r.session)continue;if(!sessionRows.has(r.session))sessionRows.set(r.session,[]);sessionRows.get(r.session).push(r);}
  const ordered=[...sessionRows.values()].map(rows=>rows.sort((a,b)=>a.at.localeCompare(b.at)));
  const funnel=(name,steps)=>({name,steps:steps.map((step,i)=>({name:step.name,sessions:ordered.filter(rows=>{let position=-1;for(const s of steps.slice(0,i+1)){const next=rows.findIndex((r,j)=>j>position&&s.events.includes(r.event));if(next<0)return false;position=next;}return true;}).length}))});
  const firstViews=ordered.map(rows=>rows.find(r=>r.event==='page_view'||r.event==='session_start')).filter(Boolean);
  return {ok:true,range,filters,totals:metrics(current),previous:metrics(previous),series,events,channels:group(current,channelFor),sources:group(current,r=>`${r.source||'direct'} / ${r.medium||'(none)'}`),campaigns:group(current,r=>[r.source||'direct',r.campaign||'(not set)',r.content||'(not set)'].join(' / ')),pages:group(current,r=>r.path),landingPages:group(firstViews,r=>r.path),countries:group(current,r=>r.country||'Unknown'),provinces:group(current,r=>r.province||'Unknown'),cities:group(current,r=>[r.city,r.province].filter(Boolean).join(', ')||'Unknown'),devices:group(current,r=>r.device||'unknown'),browsers:group(current,r=>r.browser||'unknown'),languages:group(current,r=>r.language||'unknown'),funnels:[funnel('Find a Bottle',[{name:'Find a Bottle clicked',events:['find_bottle_click']},{name:'Locator viewed',events:['retailer_locator_view']}]),funnel('Trade inquiry',[{name:'Trade form opened',events:['trade_form_step_view']},{name:'Inquiry accepted',events:['trade_form_submit_success']}]),funnel('Sueños Society',[{name:'Signup form opened',events:['newsletter_signup_open']},{name:'Signup attempted',events:['newsletter_signup_submit']}])],options:Object.fromEntries(['source','campaign','province','country','device'].map(key=>[key,[...new Set(all.filter(r=>r.day>=range.start).map(r=>r[key]).filter(Boolean))].sort()])),recent:current.filter(r=>!['engagement','session_start'].includes(r.event)).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,50).map(r=>({at:r.at,event:r.event,path:r.path,source:r.source,campaign:r.campaign,city:r.city,province:r.province,consent:r.consent})),generatedAt:new Date().toISOString()};
}
