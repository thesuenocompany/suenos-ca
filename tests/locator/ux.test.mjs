import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actionsFor, category, countryFor, matchesSearch, visibleStores } from '../../assets/js/locator-rules.js';
import { renderDirectory } from '../../lib/stockists.mjs';
const store = {id:'brothers',name:'Brothers Liquor Store',type:'Private Liquor Store',city:'Salmon Arm',province:'BC',address:'1191 10 Avenue SW, Salmon Arm, BC V1E 1E4',phone:'250-555-1234',lat:50.7,lng:-119.3};
const par = {...store,id:'par',name:'Par-Tee Putt',city:'Vancouver',address:'670 Smithe St, Vancouver, BC'};
const franco = {...store,id:'franco',name:'SUPER FRANCO',city:'San Patricio',province:'Jalisco',address:'Av. Test 123, Jalisco, México'};
const other = {...store,id:'unknown',name:'Unknown venue',type:'Other'};
const noDetails = {...store,id:'empty',name:'Name-only retailer',address:'',phone:'',website:''};
const read = path => readFileSync(path,'utf8');
test('spaces, punctuation, accents and Canadian postal variants match the same listing',()=>{
  for(const text of ['Salmon Arm BC','Salmon Arm, BC',' salmon    arm  ,bc! ','V1E1E4','V1E 1E4','v1e-1e4','Salmon Arm V1E1E4'])assert.equal(matchesSearch(store,text),true,text);
  assert.equal(matchesSearch({...store,address:'Salmon Arm, BC V1E1E4'},'V1E 1E4'),true);
  assert.equal(matchesSearch(franco,'MEXICO'),true);
  assert.equal(matchesSearch(store,'V1E1E5'),false);
});
test('filter exact country scope and known venue types without changing CRM semantics',()=>{
  const source=[store,par,franco,other,noDetails];
  assert.deepEqual(visibleStores(source).map(s=>s.id),['brothers']);
  assert.deepEqual(visibleStores(source,{country:'ca',type:'hospitality'}).map(s=>s.id),['par']);
  assert.deepEqual(visibleStores(source,{country:'mx',type:'retail'}).map(s=>s.id),['franco']);
  assert.equal(category(other),null);
  assert.equal(category({...other,type:'Event Organizer'}),null);
  assert.equal(par.type,'Private Liquor Store');
  assert.equal(category({...par,address:'Wrong row'}),'retail');
  assert.equal(countryFor({province:'BC',address:'Somewhere, México'}),null);
  assert.equal(countryFor({address:'No country information here'}),null);
});
test('actionable results with no pin can still navigate; name-only rows are removed',()=>{
  const listing={...store,lat:null,lng:null,website:'example.invalid'};
  const links=actionsFor(listing);
  assert.equal(new URL(links.directions).searchParams.get('destination'),listing.name+', '+listing.address);
  assert.equal(links.call,'tel:2505551234');
  assert.equal(links.website,'https://example.invalid/');
  assert.deepEqual(actionsFor({...noDetails,website:'javascript:alert(1)',phone:'abc2505551234'}),{directions:'',call:'',website:''});
  const directory=renderDirectory([listing,par,franco,noDetails,other],'2026-11-21T00:00:00Z');
  assert.match(directory,/Brothers Liquor Store/);
  assert.match(directory,/>Directions<[\s\S]*?>Call<.*?>Website</);
  assert.doesNotMatch(directory,/Par-Tee Putt|SUPER FRANCO|Name-only retailer|Unknown venue/);
});
test('home and dedicated finder share an embed by market with geolocation and analytics intact',()=>{
  for (const path of ['en-ca/index.html','en-ca/find-a-bottle/index.html']) {
    assert.match(read(path),/<iframe[^>]*allow="geolocation"[^>]*src="\/locator\/"/,path);
    assert.equal((read(path).match(/Confirm stock or menu availability/g)||[]).length,1);
  }
  for (const path of ['es-mx/index.html','es-mx/encuentra-una-botella/index.html'])
    assert.match(read(path),/<iframe[^>]*allow="geolocation"[^>]*src="\/locator\/\?market=mx"/,path);
  for (const path of ['assets/js/app.js','assets/js/analytics-diagnostics.js'])
    assert.match(read(path),/iframe\[src\^="\/locator\/"\][\s\S]*?retailer_locator_view/,path);
  const loc=read('locator/index.html');
  assert.match(loc,/id="count-label" role="status"/);
  assert.match(loc,/id="map-toggle" aria-controls="map" aria-expanded="false"/);
  assert.match(loc,/\.locator-actions a \{ min-height:44px/);
  assert.match(loc,/#wrap\.mobile-map #map/);
  assert.match(loc,/data-retailer-action/);
  assert.match(loc,/locator-actions\.js/);
});

test('locator runtime switches modes, normalizes searches, shows useful empty state, and drops unlisted refreshes',async()=>{
  const html=read('locator/index.html');
  const script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^\s*import[^\n]+\n/,'');
  const node=()=>({value:'',textContent:'',style:{},hidden:false,events:{},attributes:{},children:[],
    setAttribute(key,value){this.attributes[key]=value;},
    addEventListener(type,handler){this.events[type]=handler;},
    set innerHTML(value){this.markup=value;this.children=[];},
    get innerHTML(){return this.markup;},
    appendChild(el){this.children.push(el);},
    focus(){this.focused=true;},
    classList:{add(){},toggle(){return true;}}
  });
  const ids=new Map();
  const get=id=>{if(!ids.has(id))ids.set(id,node());return ids.get(id);};
  const typeChips=['retail','hospitality'].map(cat=>({...node(),dataset:{cat}}));
  const document={
    getElementById:get,querySelector:sel=>typeChips.find(x=>sel.includes(x.dataset.cat)),
    querySelectorAll:()=>typeChips,addEventListener(){},documentElement:{},createElement:node
  };
  let records=[store,par,franco,other,noDetails],refresh;
  const vm=await import('node:vm');
  vm.runInNewContext(script,{
    actionsFor,category,visibleStores,normalizeSearch:(await import('../../assets/js/locator-rules.js')).normalizeSearch,
    hasPin:(await import('../../assets/js/locator-rules.js')).hasPin,
    document,window:{addEventListener(){}},location:{search:''},URLSearchParams,AbortSignal,
    fetch:async()=>({ok:true,json:async()=>({stores:records})}),
    setInterval(fn){refresh=fn;},clearTimeout(){},setTimeout(){},
  });
  await new Promise(setImmediate);
  const text=()=>get('store-list').children.map(child=>child.markup).join(' ');
  const q=value=>{get('search').value=value;get('search').events.input({target:get('search')});};
  assert.match(text(),/Brothers Liquor Store/);
  assert.doesNotMatch(text(),/Par-Tee|SUPER FRANCO|Unknown venue|Name-only/);
  for(const query of ['Salmon Arm, BC','Salmon Arm BC','V1E1E4','V1E 1E4']){
    q(query);assert.match(text(),/data-retailer-action="directions".*data-retailer-action="call"/);
  }
  q('nonexistent');
  assert.match(get('empty-message').textContent,/Try a nearby city/);
  assert.equal(get('clear-search').hidden,false);
  get('clear-search').events.click();
  assert.equal(get('search').focused,true);
  typeChips[1].events.click();
  assert.match(text(),/Par-Tee Putt/);
  assert.doesNotMatch(text(),/Brothers Liquor Store/);
  assert.equal(typeChips[1].attributes['aria-pressed'],'true');
  records=[];
  refresh();
  await new Promise(setImmediate);
  assert.equal(text(),'');
  assert.match(get('count-label').textContent,/^0 locations in Canada$/);
});
