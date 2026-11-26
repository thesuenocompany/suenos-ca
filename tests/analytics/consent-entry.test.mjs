import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const js=readFileSync(new URL('../../assets/js/consent-bootstrap.js',import.meta.url),'utf8');
const entry='https://suenos.ca/en-ca/find-a-bottle/?utm_campaign=suenos_holiday_2026&utm_content=Kelowna';
function start(stored={}) {
  const inserted=[],listeners=new Map(),window={location:{href:entry}},document={
    title:'Find a Bottle',
    addEventListener:(name,cb)=>listeners.set(name,cb),
    querySelector:()=>null,
    createElement:()=>({dataset:{}}),
    head:{appendChild:s=>inserted.push(s)}
  };
  const context={window,document,localStorage:{getItem:k=>stored[k]||null}};
  const events=()=>window.dataLayer.map(command=>Array.from(command));
  const pages=()=>events().filter(([a,b])=>a==='event'&&b==='page_view');
  const choose=analytics=>{
    window.gtag('consent','update',{analytics_storage:analytics?'granted':'denied'});
    window.SuenosConsent={preferences:{analytics}};
    listeners.get('suenos:consent-changed')();
  };
  runInNewContext(js,context);
  return {window,events,pages,choose,rerun:()=>runInNewContext(js,context),inserted};
}
test('first entry waits, then counts once with original market URL after consent update',()=>{
  const t=start();
  assert.equal(t.events()[0][2].analytics_storage,'denied');
  assert.equal(t.events().find(x=>x[0]==='config')[2].send_page_view,false);
  assert.equal(t.pages().length,0);
  t.window.location.href='https://suenos.ca/en-ca/find-a-bottle/';
  t.choose(true);t.choose(false);t.choose(true);t.rerun();
  assert.equal(t.pages().length,1);
  assert.equal(t.pages()[0][2].page_location,entry);
  assert.ok(t.events().findIndex(x=>x[1]==='update')<t.events().findIndex(x=>x[1]==='page_view'));
  assert.equal(t.inserted.length,1);
});
test('declining or ignoring gives zero GA page views',()=>{
  const t=start();t.choose(false);assert.equal(t.pages().length,0);
});
test('a saved denial is resilient to an older granted key',()=>{
  const t=start({'Suenos-cookie-consent-v1':'{"analytics":false,"marketing":false}','suenos-cookie-consent-v1':'{"analytics":true,"marketing":true}'});
  assert.equal(t.events()[0][2].analytics_storage,'denied');assert.equal(t.pages().length,0);
});
for(const key of ['Suenos-cookie-consent-v1','suenos-cookie-consent-v1'])test('saved analytics permission is immediate, without granting advertising: '+key,()=>{
  const t=start({[key]:'{"analytics":true,"marketing":false}'});
  assert.equal(t.events()[0][2].analytics_storage,'granted');
  assert.equal(t.events()[0][2].ad_storage,'denied');
  assert.equal(t.pages().length,1);
  t.choose(true);
  assert.equal(t.pages().length,1);
});
test('malformed preferences do not imply consent',()=>{
  const t=start({'Suenos-cookie-consent-v1':'{bad'});assert.equal(t.pages().length,0);
});
