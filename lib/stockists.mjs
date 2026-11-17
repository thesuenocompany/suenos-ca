// Jason confirmed: CRM status Listed means the account carries Sueños tequila.
// Use public anonymous access only. No orders, contacts, notes or private fields.
export const PUBLIC_ACCOUNT_COLUMNS = 'id,name,type,address,lat,lng,phone,website,logo_url,city,province,status,deleted_at';
export const NO_CACHE = {'Cache-Control':'no-store', 'Netlify-CDN-Cache-Control':'no-store'};
const text = value => typeof value === 'string' ? value.trim() : '';
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeUrl(value) {
  if (!text(value)) return '';
  try { const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`); return ['https:','http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function category(store) { return /liquor|store|retail|grocery/i.test(store.type) ? 'retail' : 'hospitality'; }
export function publicAccounts(rows) {
  const ids = new Set();
  return rows.flatMap(row => {
    if (!row || typeof row.status !== 'string' || !Object.hasOwn(row,'deleted_at')) throw Error('Invalid account response');
    if (row.status !== 'Listed' || row.deleted_at !== null) return [];
    if (!text(row.id) || !text(row.name) || ids.has(row.id)) throw Error('Invalid account identity');
    ids.add(row.id);
    const number = (value, limit) => value !== null && value !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= limit ? Number(value) : null;
    // Reconstruct the response explicitly; never spread a database record.
    return [{id:row.id,name:text(row.name),type:text(row.type),address:text(row.address),lat:number(row.lat,90),lng:number(row.lng,180),phone:text(row.phone),website:safeUrl(row.website),logo_url:safeUrl(row.logo_url),city:text(row.city),province:text(row.province)}];
  }).sort((a,b)=>a.name.localeCompare(b.name));
}
export async function loadStockists({url,key,fetcher=fetch,timeout=8000}) {
  const abort = new AbortController(); const timer = setTimeout(()=>abort.abort(),timeout);
  try {
    const rows=[]; let expected;
    for (let offset=0; offset<10000; offset+=500) {
      const endpoint = new URL('/rest/v1/accounts',url);
      for (const [name,value] of Object.entries({select:PUBLIC_ACCOUNT_COLUMNS,status:'eq.Listed',deleted_at:'is.null',order:'id',offset:String(offset),limit:'500'})) endpoint.searchParams.set(name,value);
      const response=await fetcher(endpoint,{headers:{apikey:key,Authorization:`Bearer ${key}`,Prefer:'count=exact','Cache-Control':'no-cache'},cache:'no-store',signal:abort.signal});
      if (!response.ok) throw Error('Stockist source unavailable');
      const range=response.headers.get('content-range')?.match(/^(?:\d+-\d+|\*)\/(\d+)$/);
      if (!range) throw Error('Incomplete stockist response');
      const total=Number(range[1]); if (total>10000 || (expected!==undefined && total!==expected)) throw Error('Stockist source changed during read');
      expected=total; const page=await response.json();
      if (!Array.isArray(page) || page.length>500) throw Error('Invalid stockist response');
      rows.push(...page);
      if (rows.length===expected) return publicAccounts(rows);
      if (page.length!==500 || rows.length>expected) throw Error('Incomplete stockist response');
    }
    throw Error('Stockist response limit exceeded');
  } finally { clearTimeout(timer); }
}
export function renderDirectory(stores,checkedAt) {
  const groups=new Map();
  for (const store of stores.filter(s=>category(s)==='retail')) {
    // Missing CRM cities stay uncategorized; do not invent cities from addresses.
    const city=store.city ? [store.city,store.province].filter(Boolean).join(', ') : 'Other listed retailers';
    if(!groups.has(city)) groups.set(city,[]); groups.get(city).push(store);
  }
  const sections=[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([city,rows])=>`<h3>${escape(city)}</h3><ul style="list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:1rem">${rows.map(s=>`<li style="padding:1rem;border:1px solid #343434"><h4>${escape(s.name)}</h4><p>${escape(s.address)}</p>${s.website?`<p><a href="${escape(s.website)}" rel="noopener noreferrer">Retailer website</a></p>`:''}${/^[+\d\s().-]+$/.test(s.phone)?`<p><a href="tel:${escape(s.phone.replace(/[^+\d]/g,''))}">${escape(s.phone)}</a></p>`:''}</li>`).join('')}</ul>`).join('');
  return `<section class="panel stockist-directory" aria-labelledby="stockist-heading" style="margin-top:2rem;position:relative;background:#101010;border-top:3px solid var(--teal)"><h2 id="stockist-heading">Listed Sueños tequila retailers</h2><p>These retailers are currently listed by Sueños. Product availability can change; contact the retailer before travelling. The map also includes bars and restaurants.</p><p>Source: Sueños retailer records. Checked <time datetime="${escape(checkedAt)}">${escape(checkedAt.slice(0,10))}</time>. This is not live inventory.</p>${sections||'<p>No retailers are currently listed. Please contact Sueños for help finding a bottle.</p>'}</section>`;
}
export function createStockistHandler({load,template,now=()=>new Date()}) {
  return async request => {
    const json=new URL(request.url).pathname==='/api/public-stockists';
    const headers={...NO_CACHE,'Content-Type':json?'application/json; charset=utf-8':'text/html; charset=utf-8'};
    if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:{...NO_CACHE,Allow:'GET, HEAD'}});
    let body,status=200;
    try {
      const stores=await load(); const checkedAt=now().toISOString();
      body=json?JSON.stringify({stores,checkedAt}):template.replace(/<!-- stockists:start -->[\s\S]*?<!-- stockists:end -->/,`<!-- stockists:start -->${renderDirectory(stores,checkedAt)}<!-- stockists:end -->`);
      if(!json && !template.includes('<!-- stockists:start -->')) throw Error('Directory template missing');
    } catch {
      status=503; headers['Retry-After']='60';
      body=json?JSON.stringify({error:'Retailer information is temporarily unavailable.'}):template.replace(/<!-- stockists:start -->[\s\S]*?<!-- stockists:end -->/,'<!-- stockists:start --><section class="panel stockist-directory" style="margin-top:2rem"><h2>Retailer information is temporarily unavailable</h2><p>Please try again shortly or contact Sueños. We could not check the current retailer list.</p></section><!-- stockists:end -->');
    }
    return new Response(request.method==='HEAD'?null:body,{status,headers});
  };
}
