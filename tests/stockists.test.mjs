import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadStockists,createStockistHandler,publicAccounts,renderDirectory,PUBLIC_ACCOUNT_COLUMNS} from '../lib/stockists.mjs';
const template=readFileSync('en-ca/find-a-bottle/index.html','utf8');
const record=(overrides={})=>({id:'test-retailer',name:'Synthetic Test Retailer',type:'Liquor Store',address:'1 Test Street',lat:48,lng:-123,city:'Test City',province:'BC',phone:'250-555-0100',website:'https://example.invalid',logo_url:null,status:'Listed',deleted_at:null,notes:'PRIVATE_SENTINEL',contact:'PRIVATE_SENTINEL',budget_total:777,...overrides});
const response=(rows,total=rows.length)=>new Response(JSON.stringify(rows),{headers:{'Content-Range':`${rows.length?'0-'+(rows.length-1):'*'}/${total}`}});
const req=(path='/en-ca/find-a-bottle/',method='GET')=>new Request(`https://suenos.ca${path}`,{method});
test('current status and deletions remove accounts from both uncached HTML and API',async()=>{
  let rows=[record()],calls=0;
  const fetcher=async(url,options)=>{calls++;assert.equal(url.searchParams.get('status'),'eq.Listed');assert.equal(url.searchParams.get('deleted_at'),'is.null');assert.equal(url.searchParams.get('select'),PUBLIC_ACCOUNT_COLUMNS);assert.equal(options.cache,'no-store');return response(rows);};
  const handler=createStockistHandler({template,load:()=>loadStockists({url:'https://example.invalid',key:'public-test',fetcher})});
  for(const state of ['listed','unlisted','relisted','soft-deleted','hard-deleted']){
    rows=state==='hard-deleted'?[]:[record({status:state==='unlisted'?'Not Listed':'Listed',deleted_at:state==='soft-deleted'?'2026-11-17T00:00:00Z':null})];
    const expected=['listed','relisted'].includes(state);
    for(const path of ['/api/public-stockists','/en-ca/find-a-bottle/']){
      const result=await handler(req(path));assert.equal(result.status,200);
      assert.equal(result.headers.get('cache-control'),'no-store');assert.equal(result.headers.get('netlify-cdn-cache-control'),'no-store');
      const body=await result.text();assert.equal(body.includes('Synthetic Test Retailer'),expected,state);assert.ok(!body.includes('PRIVATE_SENTINEL'));
    }
  }
  assert.equal(calls,10,'each request must read the current source');
});
test('source failure never reuses successful retailer data and differs from an empty list',async()=>{
  let fail=false;const handler=createStockistHandler({template,load:async()=>{if(fail)throw Error('PRIVATE_SENTINEL');return publicAccounts([record()]);}});
  assert.match(await (await handler(req())).text(),/Synthetic Test Retailer/);fail=true;
  for(const path of ['/api/public-stockists','/en-ca/find-a-bottle/']){const r=await handler(req(path));assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'60');assert.equal(r.headers.get('cache-control'),'no-store');const body=await r.text();assert.ok(!body.includes('Synthetic Test Retailer'));assert.ok(!body.includes('PRIVATE_SENTINEL'));assert.match(body,/temporarily unavailable/);}
});
test('crawler receives escaped retailer HTML without executing JavaScript; missing coordinates still appear in directory',async()=>{
  const handler=createStockistHandler({template,now:()=>new Date('2026-11-17T12:00:00Z'),load:async()=>publicAccounts([record({name:'<script>bad()</script>',lat:null,lng:null,website:'javascript:alert(1)'}),record({id:'bar',name:'Test Bar',type:'Restaurant'})])});
  const r=await handler(req());const html=await r.text();assert.equal(r.status,200);assert.match(html,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.ok(!html.includes('javascript:alert'));assert.match(html,/<h3>Test City, BC<\/h3>/);assert.equal((html.match(/Confirm stock or menu availability/g)||[]).length,1);assert.match(html,/2026-11-17T12:00:00.000Z/);assert.match(html,/href="https:\/\/suenos.ca\/en-ca\/find-a-bottle\/" rel="canonical"/);assert.match(html,/iframe[^>]*src="\/locator\/"/);assert.ok(!html.includes('<h4>Test Bar</h4>'));
  assert.deepEqual((await (await handler(req('/api/public-stockists'))).json()).stores.map(s=>s.id).sort(),['bar','test-retailer']);
});
test('public projection strips private fields and unsafe URLs, rejects unknown identity/status',()=>{
  const s=publicAccounts([record({website:'data:text/html,secret',logo_url:'https://user:pass@example.invalid/logo'})])[0];
  assert.deepEqual(Object.keys(s).sort(),['id','name','type','address','lat','lng','phone','website','logo_url','city','province'].sort());assert.equal(s.website,'');assert.equal(s.logo_url,'');
  assert.throws(()=>publicAccounts([{id:'x',name:'x'}]));assert.throws(()=>publicAccounts([record(),record()]));
  assert.match(renderDirectory(publicAccounts([record({city:null})]),'2026-11-17T00:00:00Z'),/Other listed retailers/);
});
test('pagination completes deterministically and incomplete/malformed/oversized sources fail',async()=>{
  let calls=0;
  const stores=await loadStockists({url:'https://example.invalid',key:'public',fetcher:async(url)=>{const offset=Number(url.searchParams.get('offset'));calls++;return response(Array.from({length:offset?1:500},(_,i)=>record({id:`test-${offset+i}`})),501);}});
  assert.equal(stores.length,501);assert.equal(calls,2);
  for(const fetcher of [async()=>response([record()],501),async()=>response([record()],10001),async()=>new Response('{}'),async()=>new Response('private',{status:500}),async()=>response({unexpected:true})])await assert.rejects(loadStockists({url:'https://example.invalid',key:'public',fetcher}));
});
test('timeout, HEAD and unsupported methods behave safely',async()=>{
  await assert.rejects(loadStockists({url:'https://example.invalid',key:'public',timeout:5,fetcher:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout'))))}));
  const h=createStockistHandler({template,load:async()=>[]});assert.equal(await (await h(req('/api/public-stockists','HEAD'))).text(),'');assert.equal((await h(req('/api/public-stockists','POST'))).status,405);
});
