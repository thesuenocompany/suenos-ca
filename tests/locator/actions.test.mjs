import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync('assets/js/locator-actions.js','utf8');
function setup({consent=true,origin='https://suenos.ca',id='G-WX9XT6TEYG',standalone=false}={}){
 const events=[],handlers={};
 const parent={location:{origin},SuenosConsent:{preferences:{analytics:consent}},SuenosConsentBootstrap:{gaId:id},gtag:(...args)=>events.push(args)};
 const window={parent,location:{origin:'https://suenos.ca',pathname:'/locator/'}};
 if(standalone)window.parent=window;
 vm.runInNewContext(source,{window,document:{addEventListener:(name,fn)=>handlers[name]=fn},Date});
 return {window,parent,events,handlers,track:window.SuenosLocatorTracking.track};
}
test('tracks explicit actions once without personal data or pageviews',()=>{
 const x=setup();
 for(const action of ['website','call','directions'])assert.equal(x.track(action,'retailer-123','retail'),true);
 assert.equal(x.events.length,3);
 assert.equal(x.events[0][1],'retailer_action');
 assert.deepEqual(Object.keys(x.events[0][2]).sort(),['action','locator_path','retailer_id','send_to','transport_type','venue_type']);
 assert.equal(x.track('directions','retailer-123','retail'),false);
});
test('no consent, foreign origin, wrong tag and standalone never emit',()=>{
 for(const opts of [{consent:false},{origin:'https://evil.test'},{id:'G-OTHER'},{standalone:true}]){
  const x=setup(opts);assert.equal(x.track('website','123','retail'),false);assert.equal(x.events.length,0);
 }
});
test('withdrawal is respected on next click; no replay',()=>{
 const x=setup({consent:false});x.track('call','123','retail');
 x.parent.SuenosConsent.preferences.analytics=true;
 assert.equal(x.events.length,0);assert.equal(x.track('call','123','retail'),true);
 x.parent.SuenosConsent.preferences.analytics=false;assert.equal(x.track('website','123','retail'),false);
});
test('no free text, unsupported actions, or synthetic clicks',()=>{
 const x=setup();
 for(const args of [['search','123','retail'],['website','person@example.com','retail'],['website','123','other']])assert.equal(x.track(...args),false);
 x.handlers.click({isTrusted:false,target:{closest:()=>({dataset:{retailerAction:'website',retailerId:'123',venueType:'retail'}})}});
 assert.equal(x.events.length,0);
});
test('delegated trusted clicks track hospitality distinctly',()=>{
 const x=setup();x.handlers.click({isTrusted:true,target:{closest:()=>({dataset:{retailerAction:'website',retailerId:'123',venueType:'hospitality'}})}});
 assert.equal(x.events[0][2].venue_type,'hospitality');
});
test('no initialization view event and correct HTML action wiring',()=>{
 const x=setup();assert.equal(x.events.length,0);
 const html=fs.readFileSync('locator/index.html','utf8');
 for(const action of ['website','call','directions'])assert.ok(html.includes(`data-retailer-action="${action}"`));
 assert.ok(html.includes('/assets/js/locator-actions.js'));
});
