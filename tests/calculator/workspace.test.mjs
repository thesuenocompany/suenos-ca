import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {calculatePlan,defaultProduct,presets,isBottle,bottleDefaults,defaults} from '../../src/calculator/model.js';
const script=readFileSync(new URL('../../src/calculator/workspace.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function harness(saved){
 const elements=new Map(),storage=new Map(saved?[['suenos-rtd-workspace-v1',saved]]:[]),downloads=[];let printed=0,pricing={...defaults};
 const element=id=>{if(!elements.has(id))elements.set(id,{id,value:'',innerHTML:'',textContent:'',dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},events:{},addEventListener(e,f){this.events[e]=f;},click(){}});return elements.get(id);};
 const context={calculatePlan,defaultProduct,presets,isBottle,bottleDefaults,getPricingState:()=>pricing,restorePricing:s=>{pricing=s;},useSupply(){},document:{getElementById:element,querySelectorAll:()=>[],createElement:()=>({click(){}})},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},window:{addEventListener(){},print(){printed++;}},URL:{createObjectURL:b=>{downloads.push(b);return 'blob:test';},revokeObjectURL(){}},Blob,structuredClone,Intl,Date,Math,Number,JSON,Map,Set,console,confirm:()=>true,setTimeout:()=>0};
 vm.createContext(context);vm.runInContext(script,context);
 return {element,storage,downloads,get printed(){return printed;},context};
}
test('actual workspace export/import/print callbacks preserve RTD and six bottled runs',async()=>{
 const h=harness();const original=vm.runInContext('JSON.stringify(w)',h.context),seed=JSON.parse(original);
 seed.products.push(...['b750','b1140','b1750'].flatMap(format=>[38.5,40].map(abv=>({...defaultProduct,...bottleDefaults,id:format+'-'+abv,name:'Bottle '+format+' '+abv,supplyId:seed.supplies[0].id,format,abv,quantity:20,bottle:1.2,closure:.3,bottleMarkupConfirmed:false}))));
 const backup=JSON.stringify({schema:'suenos-rtd-workspace',...seed});
 await h.element('backup-file').events.change({target:{files:[{size:backup.length,text:async()=>backup}],value:'x'}});
 assert.equal(JSON.parse(h.storage.get('suenos-rtd-workspace-v1')).products.length,8);
 h.element('export-backup').events.click();const exported=JSON.parse(await h.downloads.at(-1).text());
 assert.deepEqual(exported.products,seed.products);assert.deepEqual(exported.supplies,seed.supplies);
 h.element('export-plan').events.click();const csv=await h.downloads.at(-1).text();assert.match(csv,/Excise rate CAD\/LAA/);assert.match(csv,/LDB CONFIRMATION REQUIRED/);assert.doesNotMatch(csv,/NOT MODELED/);for(const p of seed.products)assert.ok(csv.includes('"'+p.name+'"'));
 assert.equal((csv.match(/"14.117"/g)||[]).length,6);assert.ok(h.element('product-list').innerHTML.includes('38.5% ABV'));
 const reload=harness(h.storage.get('suenos-rtd-workspace-v1'));assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(w.products)',reload.context)),seed.products);
 reload.element('print-plan').events.click();assert.equal(reload.printed,1);assert.match(reload.element('product-list').innerHTML,/BC bottled spirits/);assert.match(reload.element('product-list').innerHTML,/LDB confirmation required/);
 // Import the freshly exported file through the actual handler again.
 const fresh=harness();const body=JSON.stringify(exported);await fresh.element('backup-file').events.change({target:{files:[{size:body.length,text:async()=>body}],value:'x'}});assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(w.products)',fresh.context)),seed.products);
});
test('legacy backup restores without adding or changing saved RTD products',async()=>{const h=harness();h.element('save-workspace').events.click();const before=JSON.parse(h.storage.get('suenos-rtd-workspace-v1'));const legacy={schema:'suenos-rtd-workspace',...before};for(const p of legacy.products)for(const k of Object.keys(p))if(k.startsWith('bottle'))delete p[k];const text=JSON.stringify(legacy);await h.element('backup-file').events.change({target:{files:[{size:text.length,text:async()=>text}],value:'x'}});assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(w.products)',h.context)),legacy.products);assert.ok(calculatePlan(legacy.supplies,legacy.products,defaults).valid);});
test('fresh and legacy workspaces add all formats from calculator mix without replacing rows',()=>{
 const fresh=harness();const legacy=JSON.parse(vm.runInContext('JSON.stringify(w)',fresh.context));legacy.version=1;legacy.products[0].name='My saved RTD';delete legacy.products[0].bottleExcise;
 for(const h of [fresh,harness(JSON.stringify(legacy))]){
 const before=JSON.parse(vm.runInContext('JSON.stringify(w.products)',h.context)),source=vm.runInContext('w.supplies[0].id',h.context);
 for(const format of ['355','473','20','30','50','custom','b750','b1140','b1750']){
 h.element('mix-format').value=format;h.element('mix-supply').value=source;h.element('mix-quantity').value='2';h.element('mix-abv').value=isBottle(format)?'38.5':'5';h.element('add-to-mix').events.click();
 }
 const w=JSON.parse(h.storage.get('suenos-rtd-workspace-v1'));assert.equal(w.version,2);assert.deepEqual(w.products.slice(0,before.length),before);assert.equal(w.products.length,before.length+9);
 const plan=calculatePlan(w.supplies,w.products,defaults);assert.ok(plan.valid);assert.equal(plan.rows.filter(r=>r.kind==='bottle').length,3);assert.equal(plan.inventory[0].consumed,plan.totals.bulkL);assert.ok(plan.totals.cost>0);
 for(const text of ['Bottled mixto · 750 mL','Bottled mixto · 1.14 L','Bottled mixto · 1.75 L','Mix production cost incl. duty'])assert.ok(h.element('calculator-mix-summary').innerHTML.includes(text));
 assert.ok(h.element('product-list').innerHTML.includes('<option value="b750"'));
 const reload=harness(h.storage.get('suenos-rtd-workspace-v1'));assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(w.products)',reload.context)),w.products);
 }
});
test('existing RTD row can choose bottle directly in common package selector',()=>{
 const h=harness();const id=vm.runInContext('w.products[0].id',h.context);
 const change=format=>h.element('product-list').events.change({target:{dataset:{field:'format'},value:format,type:'select-one',closest:()=>({dataset:{product:id}})}});
 change('b1140');let p=JSON.parse(vm.runInContext('JSON.stringify(w.products[0])',h.context));assert.equal(p.format,'b1140');assert.equal(p.abv,40);assert.equal(p.quantity,10000);assert.equal(p.bottle,0);assert.equal(p.label,0);
 change('473');p=JSON.parse(vm.runInContext('JSON.stringify(w.products[0])',h.context));assert.equal(p.abv,5);assert.equal(p.can,.23);assert.equal(p.quantity,10000);
});
