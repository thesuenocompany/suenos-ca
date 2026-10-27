import test from 'node:test';import assert from 'node:assert/strict';import {calculatePlan,defaultProduct,defaults,calculate,spiritsMarkup} from '../../src/calculator/model.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const a={id:'a',name:'A',volume:5000,abv:55,price:4.65,currency:'USD',fx:1.4097,unit:'litre',unitConfirmed:false,freight:1000,brokerage:200,tote:0,customs:0,other:0};
const b={...a,id:'b',name:'B',volume:1000,abv:50};
const products=[{...defaultProduct,id:'c',name:'Cans',supplyId:'a',quantity:10000},{...defaultProduct,id:'k',name:'Kegs',supplyId:'a',format:'20',quantity:10,fill:3,label:0}];
test('quantity plan uses source once with process loss',()=>{const r=calculatePlan([a],products,{...defaults,planOverhead:1000});assert.equal(r.valid,true);close(r.totals.bulkL,351.4526710402999);close(r.inventory[0].remaining,4648.5473289597);close(r.totals.sharedOverhead,1000);close(r.inventory[0].remainingCost+r.inventory[0].consumedCost,r.inventory[0].landed);assert.ok(r.rows.every(x=>x.unitUnconfirmed));});
test('separate supplies have separate balances',()=>{const r=calculatePlan([a,b],[products[0],{...products[1],supplyId:'b'}],defaults);close(r.inventory[0].consumed,3550*.05/.55/.97);close(r.inventory[1].consumed,200*.05/.50/.97);});
test('spare supply cannot offset another supply shortfall',()=>{const r=calculatePlan([{...a,volume:5},b],products,defaults);assert.equal(r.valid,false);assert.equal(r.inventory[0].overallocated,true);assert.equal(r.inventory[1].overallocated,false);});
test('source cost/ABV edits flow to linked products',()=>{const r=calculatePlan([a],products,defaults),s=calculatePlan([{...a,abv:50,price:10}],products,defaults);assert.ok(s.rows[0].bulkL>r.rows[0].bulkL);assert.ok(s.rows[0].tequila>r.rows[0].tequila);});
test('different strengths use separate pure-alcohol mass',()=>{const r=calculatePlan([a],[products[0],{...products[1],abv:7}],defaults);close(r.rows[1].bulkL,200*.07/.55/.97);close(r.rows[1].duty,200*.358);});
test('invalid settings and zero quantities block plan',()=>{for(const settings of [{gstPct:-5},{exciseLow:-1},{planOverhead:-100}])assert.equal(calculatePlan([a],products,{...defaults,...settings}).valid,false);assert.equal(calculatePlan([a],[{...products[0],quantity:0,storage:100}],defaults).valid,false);});
test('source missing and invalid quantity block',()=>{for(const row of [{...products[0],supplyId:'missing'},{...products[0],quantity:-1},{...products[0],quantity:1.5},{...products[0],producerMargin:100}])assert.equal(calculatePlan([a],[row],defaults).valid,false);});
test('refillable keg <=10L uses5deposit not30',()=>{const r=calculatePlan([a],[{...products[0],format:'custom',customLitres:5,quantity:10}],{...defaults,kegRateMode:'manual'});close(r.rows[0].deposit,5);});
test('invalid calculator margins and negative costs blocked; reference fixed15',()=>{assert.equal(calculate({...defaults,producerMargin:100}).valid,false);assert.equal(calculate({...defaults,quotePrice:-1}).valid,false);assert.equal(calculate({...defaults,customKeg:0}).valid,false);close(calculate({...defaults,kegRateMode:'reference',kegMarkup:73}).formats[3].markupPct,15);});
test('below quoted tier creates explicit price warning',()=>{const r=calculatePlan([{...a,volume:1000,moq:5000}],products,defaults);assert.ok(r.warnings.some(x=>x.includes('quoted tier')));assert.equal(r.inventory[0].belowTier,true);});

for(const [format,volume] of [['b750',.75],['b1140',1.14],['b1750',1.75]])for(const abv of [38.5,40])test(`bottled ${format} at ${abv}%: mass, duty, packaging, BC tax`,()=>{
 const bottle={...defaultProduct,format,abv,id:format,supplyId:'a',quantity:100,lossPct:4,bottle:1.2,closure:.3,label:.2,carton:.15,fill:.6,juicePerL:0,blendPerL:0};
 const result=calculatePlan([a],[bottle],{...defaults,dutyAdjustment:999,kegRateMode:'manual'}),r=result.rows[0];
 assert.equal(result.valid,true);close(r.finishedL,100*volume);close(r.bulkL,100*volume/.96*(abv/100)/.55);close(r.packaging,245);close(r.duty,r.consumedLaa*14.117);assert.equal(r.kegPriceAvailable,true);close(r.crf,.13);close(r.deposit,.1);close(r.gst,r.retailPreTax*.05);close(r.pst,r.retailPreTax*.1);close(r.retail,r.retailPreTax*1.15+.1);close(r.wholesale,r.supplierPrice+r.ldb+.13);assert.ok(result.warnings.some(w=>w.includes('LDB confirmation')));
 const restored=JSON.parse(JSON.stringify({supplies:[a],products:[bottle]}));assert.deepEqual(calculatePlan(restored.supplies,restored.products,defaults),calculatePlan([a],[bottle],defaults));
 for(const invalid of [{abv:7},{abv:60},{abv:'x'},{quantity:1.5},{bottle:-1},{closure:-1},{bottleExcise:-1},{bottlePst:-1}])assert.equal(calculatePlan([a],[{...bottle,...invalid}],defaults).valid,false);
 for(const [mode,expected] of [['packaged',r.packagedLaa*14.117],['included',0],['manual',0]])close(calculatePlan([a],[{...bottle,bottleDutyMode:mode}],defaults).rows[0].duty,expected);
 close(calculatePlan([a],[{...bottle,bottleDutyMode:'included',bottleDutyAdjustment:123}],defaults).rows[0].duty,123);
});
test('mixed plan isolates RTD duty and allocates overhead once',()=>{
 const bottle={...defaultProduct,id:'bottle',format:'b1140',abv:40,supplyId:'a',quantity:100};
 const before=calculatePlan([a],products,{...defaults,dutyAdjustment:100}),mixed=calculatePlan([a],[...products,bottle],{...defaults,dutyAdjustment:100,planOverhead:1000});
 close(mixed.totals.duty,before.totals.duty+mixed.rows[2].duty);close(mixed.totals.sharedOverhead,1000);assert.deepEqual(mixed.rows.slice(0,2).map(r=>r.duty),before.rows.map(r=>r.duty));
});
test('historical spirits tiers apply marginally per litre and allow flat override',()=>{
 for(const [cost,expected] of [[10,12.4],[21,26.04],[29.2,33.666],[37.4,38.75],[40,39.868]])close(spiritsMarkup(cost,defaultProduct),expected);
 close(spiritsMarkup(40,{...defaultProduct,bottleMarkupMode:'flat',bottleFlatRate:120}),48);
});
