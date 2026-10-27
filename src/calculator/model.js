export const presets = {
  aasj:{name:'AASJ · October 20 quote',bulkLitres:5000,bulkAbv:55,quotePrice:4.65,currency:'USD',fx:1.4097,moq:5000,quoteUnit:'litre',quoteIncludesFreight:true,note:'USD 4.65 “all-in” tequila, tote and freight to BC (DAP). The quote does not state a pricing unit. USD per bulk litre is UNCONFIRMED. Canadian customs clearance is excluded. Agave ratio is not confirmed.',date:'2026-10-20',status:'Unit unconfirmed'},
  sergio1000:{name:'Sergio · March · 1,000 L',bulkLitres:1000,bulkAbv:50,quotePrice:98,currency:'MXN',fx:.07645,moq:1000,quoteUnit:'litre',quoteIncludesFreight:false,note:'Historical liquid-only quote: MXN 98 per bulk litre at 1,000 L. Add tote, freight, clearance and all Canadian taxes. Agave ratio is not confirmed.',date:'2026-03-25',status:'Historical quote'},
  sergio3000:{name:'Sergio · March · 3,000 L',bulkLitres:3000,bulkAbv:50,quotePrice:92,currency:'MXN',fx:.07645,moq:3000,quoteUnit:'litre',quoteIncludesFreight:false,note:'Historical liquid-only quote: MXN 92 per bulk litre at 3,000 L. Add tote, freight, clearance and all Canadian taxes. Agave ratio is not confirmed.',date:'2026-03-25',status:'Historical quote'},
  sergio5000:{name:'Sergio · March · 5,000 L',bulkLitres:5000,bulkAbv:50,quotePrice:85,currency:'MXN',fx:.07645,moq:5000,quoteUnit:'litre',quoteIncludesFreight:false,note:'Historical liquid-only quote: MXN 85 per bulk litre at 5,000 L. Add tote, freight, clearance and all Canadian taxes. Agave ratio is not confirmed.',date:'2026-03-25',status:'Historical quote'},
  july:{name:'Sergio · July landed estimate',bulkLitres:1000,bulkAbv:50,quotePrice:12.68,currency:'CAD',fx:1,moq:1000,quoteUnit:'litre',quoteIncludesFreight:true,note:'Historical estimate: CAD 12.68 per bulk litre to the Canada border, excluding taxes. 50% ABV mixto; tote-line arithmetic is inconsistent. Not a current firm landed quote.',date:'2026-07-10',status:'Historical estimate'},
  custom:{name:'Custom supplier',note:'Enter a verified quote, delivery basis and the costs not included in it.',date:'',status:'Custom inputs'}
};
export const defaults={
  preset:'aasj',supplyUnitUnconfirmed:false,supplyNote:'',sourceName:'',...presets.aasj,abv:5,lossPct:3,freight:0,brokerage:0,tote:0,customs:0,otherBatch:0,
  ingredientPerL:.30,blendPerL:.15,overheadBatch:0,
  can355:.18,can473:.23,lid:.04,label:.10,fill:.12,carton:.05,keg20:8,keg30:9,keg50:11,kegCustom:11,kegFill:3,kegDeposit:30,customKeg:58.6,
  producerMargin:35,retailMargin:30,servicePerL:0,
  dutyMode:'finished',exciseLpa:14.117,exciseLow:.358,ldbPct:73,kegMarkup:15,kegRateMode:'unset',kegMarkupConfirmed:false,classificationConfirmed:false,taxReliefConfirmed:false,gstPct:5,pstPct:10,crf:.04,canDeposit:.10,importGstPct:5,importGstBase:0,dutyAdjustment:0,steward:'brccc',
  retailOverride:0,selected:'355',scenarioName:'First production run',ackUnit:false,fxDate:'2026-10-19',taxEffective:'2026-10-20',taxVerified:true,
  allocations:{'355':100,'473':0,'20':0,'30':0,'50':0,'custom':0}
};
const n=(x,f=0)=>{const v=Number(x);return Number.isFinite(v)?v:f;};
const nonneg=x=>Math.max(0,n(x));
export const divide=(a,b)=>b>0?a/b:0;
export const round=(x,d=2)=>Math.round((x+Number.EPSILON)*10**d)/10**d;
export function normalize(input={}){
  const s={...defaults,...input,allocations:{...defaults.allocations,...input.allocations}};
  for(const k of Object.keys(defaults)) if(typeof defaults[k]==='number')s[k]=nonneg(s[k]);
  s.bulkAbv=Math.min(100,s.bulkAbv);s.lossPct=Math.min(100,s.lossPct);s.producerMargin=Math.min(99,s.producerMargin);s.retailMargin=Math.min(99,s.retailMargin);
  s.abv=s.abv===7?7:5;s.fx=s.currency==='CAD'?1:s.fx;
  return s;
}
export function calculate(input){
 const s=normalize(input),warnings=[];
 const invalidFields=Object.keys(defaults).filter(k=>typeof defaults[k]==='number'&&(input[k]!==undefined)&&(!Number.isFinite(Number(input[k]))||Number(input[k])<0));
 if(Number(input.producerMargin)>=100)invalidFields.push('producerMargin');if(Number(input.retailMargin)>=100)invalidFields.push('retailMargin');if(Number(input.customKeg)<=0)invalidFields.push('customKeg');if(Number(input.bulkAbv)>100)invalidFields.push('bulkAbv');
 if(invalidFields.length)warnings.push('Correct invalid input(s): '+invalidFields.join(', ')+'. Prices are unavailable until corrected.');
 const lpa=s.bulkLitres*s.bulkAbv/100;
 const valid=invalidFields.length===0&&s.bulkLitres>0&&s.bulkAbv>=s.abv&&s.fx>0&&s.lossPct<100;
 const theoretical=valid?lpa/(s.abv/100):0;
 const saleable=theoretical*(1-s.lossPct/100);
 const dilution=Math.max(0,theoretical-s.bulkLitres);
 const quoteTotal=s.quotePrice*(s.quoteUnit==='lpa'?lpa:s.bulkLitres)*s.fx;
 const landed=quoteTotal+s.freight+s.brokerage+s.tote+s.customs+s.otherBatch;
 const grossBulkDuty=lpa*s.exciseLpa;
 const importExcise=0;
 const finishedExcise=s.dutyMode==='finished'?saleable*s.exciseLow:0;
 const duty=importExcise+finishedExcise+s.dutyAdjustment;
 const ingredients=theoretical*s.ingredientPerL,blending=theoretical*s.blendPerL;
 const baseBatch=landed+ingredients+blending+s.overheadBatch;
 const basePerL=divide(baseBatch,saleable);
 const importGst=s.importGstBase*s.importGstPct/100;
 const defs=[{id:'355',name:'355 mL can',volume:.355,kind:'can',pack:s.can355+s.lid+s.label+s.fill+s.carton},{id:'473',name:'473 mL can',volume:.473,kind:'can',pack:s.can473+s.lid+s.label+s.fill+s.carton},{id:'20',name:'20 L keg',volume:20,kind:'keg',pack:s.keg20+s.kegFill},{id:'30',name:'30 L keg',volume:30,kind:'keg',pack:s.keg30+s.kegFill},{id:'50',name:'50 L keg',volume:50,kind:'keg',pack:s.keg50+s.kegFill},{id:'custom',name:`${s.customKeg} L custom keg`,volume:s.customKeg,kind:'keg',pack:s.kegCustom+s.kegFill}];
 const formats=defs.map(f=>{
  const units=Math.floor(divide(saleable,f.volume)),remainder=Math.max(0,saleable-units*f.volume);
  const base=basePerL*f.volume,costExDuty=base+f.pack,dutyUnit=divide(duty,saleable)*f.volume,cost=costExDuty+dutyUnit,producer=divide(cost,1-s.producerMargin/100),producerExDuty=producer-dutyUnit,producerProfit=producer-cost;
  const markupPct=f.kind==='can'?s.ldbPct:s.kegRateMode==='reference'?15:s.kegMarkup;
  const ldb=producer*markupPct/100,service=s.servicePerL*f.volume;
  const crf=f.kind==='can'?s.crf:0,deposit=f.kind==='can'?s.canDeposit:s.kegDeposit;
  const wholesaleExCrf=producer+ldb+service,wholesale=wholesaleExCrf+crf;
  const shelf=divide(wholesaleExCrf,1-s.retailMargin/100);
  const taxable=shelf+crf,gst=taxable*s.gstPct/100,pst=taxable*s.pstPct/100,checkout=taxable+gst+pst+deposit;
  const components={spirit:divide(quoteTotal,saleable)*f.volume,logistics:divide(landed-quoteTotal,saleable)*f.volume,excise:divide(duty,saleable)*f.volume,ingredients:divide(ingredients,saleable)*f.volume,blending:divide(blending+s.overheadBatch,saleable)*f.volume,pack:f.pack};
  const kegPriceAvailable=f.kind==='can'||s.kegRateMode==='manual'||(s.kegRateMode==='reference'&&f.volume>20);
  return {...f,kegPriceAvailable,units,remainder,base,costExDuty,dutyUnit,producerExDuty,wholesaleExCrf,markupPct,taxable,cost,producer,producerProfit,ldb,service,wholesale,shelf,crf,deposit,gst,pst,checkout,components,pureAlcohol:f.volume*s.abv/100,costPerL:divide(cost,f.volume),batchCost:baseBatch+duty+f.pack*units,allocatedPct:nonneg(s.allocations[f.id]),allocatedUnits:Math.floor(divide(saleable*nonneg(s.allocations[f.id])/100,f.volume))};
 });
 const allocationTotal=formats.reduce((a,f)=>a+f.allocatedPct,0);
 if(!valid)warnings.push('Enter a positive bulk volume and FX rate, bulk ABV at least as high as finished ABV, and losses below 100%.');
 if((s.preset==='aasj'||s.supplyUnitUnconfirmed)&&!s.ackUnit)warnings.push('Selected supplier pricing unit is unconfirmed. All figures provisionally assume the selected quote unit.');
 if(s.bulkLitres<s.moq)warnings.push('Bulk volume is below this supplier preset’s quoted volume tier or MOQ; confirm current supplier terms.');
 if(!s.taxVerified)warnings.push('Tax configuration is pending verification. Do not use totals as a filing or final quote.');
 if(s.dutyMode==='finished'&&!s.taxReliefConfirmed)warnings.push('Reduced finished-product duty assumes an eligible licensed/bonded production path. Confirm treatment with your licensed co-packer and customs broker.');
 if(!s.classificationConfirmed)warnings.push('BC 73% can markup assumes LDB Refreshment Beverage classification for both 5% and 7%. Confirm your SKU category.');
 if(!s.kegMarkupConfirmed)warnings.push('Keg wholesale and retail need an explicit rate selection. The published 15% reference is only offered for formats over 20 L; applicability and basis still need LDB confirmation.');
 if(s.dutyMode==='included')warnings.push('Duty is assumed already included in the source cost. Verify evidence before relying on this setting.');
 if(s.quoteIncludesFreight&&s.freight>0)warnings.push('The source quote already includes freight to its stated destination. Extra freight must cover only additional transport.');
 if(s.customKeg<=10)warnings.push('Custom keg is 10 L or smaller. Current metal-keg deposit is normally $5; update the deposit assumption, which otherwise defaults to $30.');
 if(allocationTotal>100.00001)warnings.push('Production allocation exceeds 100% of this one batch. Reduce the split before using the plan.');
 return {s,valid,invalidFields,lpa,theoretical,saleable,dilution,quoteTotal,landed,duty,importExcise,finishedExcise,importGst,ingredients,blending,baseBatch,basePerL,grossBulkDuty,formats,allocationTotal,warnings,spiritPerLpa:divide(quoteTotal,lpa),landedPerLpa:divide(landed,lpa)};
}

export const bottleVolumes={'b750':.75,'b1140':1.14,'b1750':1.75};
export const isBottle=format=>Object.hasOwn(bottleVolumes,format);
export const bottleDefaults={abv:40,juicePerL:0,blendPerL:0,bottle:0,closure:0,label:0,fill:0,carton:0};
export const spiritsDefaults={bottleDutyMode:'bulk',bottleExcise:14.117,bottleDutyAdjustment:0,bottleMarkupMode:'tiered',bottleMarkupConfirmed:false,bottleTier1:21,bottleTier2:8.2,bottleTier3:8.2,bottleRate1:124,bottleRate2:93,bottleRate3:62,bottleRate4:43,bottleFlatRate:124,bottleServicePerL:0,bottleCrf:.13,bottleDeposit:.10,bottleGst:5,bottlePst:10};
export function spiritsMarkup(pricePerL,p){
 if(p.bottleMarkupMode==='flat')return pricePerL*Number(p.bottleFlatRate)/100;
 const first=Math.min(pricePerL,Number(p.bottleTier1));
 const second=Math.min(Math.max(0,pricePerL-Number(p.bottleTier1)),Number(p.bottleTier2));
 const third=Math.min(Math.max(0,pricePerL-Number(p.bottleTier1)-Number(p.bottleTier2)),Number(p.bottleTier3));
 const rest=Math.max(0,pricePerL-Number(p.bottleTier1)-Number(p.bottleTier2)-Number(p.bottleTier3));
 return (first*p.bottleRate1+second*p.bottleRate2+third*p.bottleRate3+rest*p.bottleRate4)/100;
}
export const defaultProduct={...spiritsDefaults,bottle:0,closure:0,name:'New beverage',supplyId:'aasj-oct26',format:'355',customLitres:58.6,quantity:1000,abv:5,lossPct:3,juicePerL:.30,blendPerL:.15,can:.18,lid:.04,label:.10,carton:.05,fill:.12,kegCost:8,storage:0,otherFixed:0,otherPerUnit:0,producerMargin:35,retailMargin:30};
export function calculatePlan(supplies,products,settings={}){
 const g={...defaults,...settings},errors=[],warnings=[];
 for(const k of ['planOverhead','dutyAdjustment','exciseLow','ldbPct','kegMarkup','servicePerL','gstPct','pstPct','crf','canDeposit','kegDeposit'])if(g[k]!==undefined&&(!Number.isFinite(Number(g[k]))||Number(g[k])<0))errors.push('Correct shared pricing setting: '+k+'.');
 const sourceMap=new Map();
 for(const source of supplies){const x={...source};const numeric=['volume','abv','price','fx','freight','brokerage','tote','customs','other'];x.valid=numeric.every(k=>Number.isFinite(Number(x[k]))&&Number(x[k])>=0)&&Number(x.volume)>0&&Number(x.abv)>0&&Number(x.abv)<=100&&(x.currency==='CAD'||Number(x.fx)>0);for(const k of numeric)x[k]=nonneg(x[k]);if(x.currency==='CAD')x.fx=1;x.totalQuote=x.price*(x.unit==='lpa'?x.volume*x.abv/100:x.volume)*x.fx;x.landed=x.totalQuote+x.freight+x.brokerage+x.tote+x.customs+x.other;x.perBulkL=divide(x.landed,x.volume);x.consumed=0;x.products=[];x.belowTier=Number(x.moq)>0&&x.volume<Number(x.moq);if(x.belowTier)warnings.push(x.name+': planned supply is below the quoted tier / MOQ. Confirm the price still applies.');sourceMap.set(x.id,x);}
 const rows=products.map(product=>{
  const p={...defaultProduct,...product},source=sourceMap.get(p.supplyId);const bottle=isBottle(p.format);const volume=bottle?bottleVolumes[p.format]:p.format==='355'?.355:p.format==='473'?.473:p.format==='custom'?Number(p.customLitres):Number(p.format);const numeric=['quantity','lossPct','juicePerL','blendPerL','can','lid','label','carton','fill','kegCost','storage','otherFixed','otherPerUnit','producerMargin','retailMargin',...(bottle?['bottle','closure',...Object.keys(spiritsDefaults).filter(k=>typeof spiritsDefaults[k]==='number')]:[])];
  const invalid=numeric.some(k=>!Number.isFinite(Number(p[k]))||Number(p[k])<0)||!Number.isInteger(Number(p.quantity))||Number(p.quantity)<=0||p.lossPct>=100||p.producerMargin>=100||p.retailMargin>=100||(bottle?(!Number.isFinite(Number(p.abv))||Number(p.abv)<=7||Number(p.abv)>100||!['bulk','packaged','included','manual'].includes(p.bottleDutyMode)||!['tiered','flat'].includes(p.bottleMarkupMode)):![5,7].includes(Number(p.abv)))||!Number.isFinite(volume)||volume<=0||!source?.valid||source.abv<p.abv;
  const valid=!invalid;const finishedL=valid?Number(p.quantity)*volume:0,prelossL=divide(finishedL,1-Number(p.lossPct)/100),bulkL=source?.abv?prelossL*Number(p.abv)/source.abv:0;
  if(!valid)errors.push(`${p.name||'Product'}: correct its source, quantity, volume, strength, loss or cost inputs.`);
  if(source){source.consumed+=bulkL;source.products.push(p.id);}
  const tequila=source?bulkL*source.perBulkL:0,juice=prelossL*nonneg(p.juicePerL),blend=prelossL*nonneg(p.blendPerL),kind=bottle?'bottle':['355','473'].includes(p.format)?'can':'keg';
  const packagingPerUnit=bottle?nonneg(p.bottle)+nonneg(p.closure)+nonneg(p.label)+nonneg(p.carton)+nonneg(p.fill)+nonneg(p.otherPerUnit):kind==='can'?nonneg(p.can)+nonneg(p.lid)+nonneg(p.label)+nonneg(p.carton)+nonneg(p.fill)+nonneg(p.otherPerUnit):nonneg(p.kegCost)+nonneg(p.fill)+nonneg(p.label)+nonneg(p.otherPerUnit);
  return {p,sourceId:p.supplyId,sourceName:source?.name||'Missing supply',valid,volume,finishedL,prelossL,bulkL,tequila,juice,blend,kind,packaging:packagingPerUnit*nonneg(p.quantity),storage:nonneg(p.storage),otherFixed:nonneg(p.otherFixed),unitUnconfirmed:source?.unitConfirmed===false};
 });
 const totalBasis=rows.reduce((a,r)=>a+(g.overheadBasis==='finished'?r.finishedL:r.bulkL),0);
 let manualDutyBasis=rows.reduce((a,r)=>a+(r.kind==='bottle'?0:r.finishedL),0);
 for(const r of rows){
  const p=r.p,bottle=r.kind==='bottle';
  r.sharedOverhead=divide(g.overheadBasis==='finished'?r.finishedL:r.bulkL,totalBasis)*nonneg(g.planOverhead);
  r.packagedLaa=r.finishedL*Number(p.abv)/100;
  r.consumedLaa=r.prelossL*Number(p.abv)/100;
  r.duty=bottle?((p.bottleDutyMode==='bulk'?r.consumedLaa:p.bottleDutyMode==='packaged'?r.packagedLaa:0)*nonneg(p.bottleExcise)+nonneg(p.bottleDutyAdjustment)):(g.dutyMode==='finished'?r.finishedL*nonneg(g.exciseLow):0)+divide(r.finishedL,manualDutyBasis)*nonneg(g.dutyAdjustment);
  r.totalCost=r.tequila+r.juice+r.blend+r.packaging+r.storage+r.otherFixed+r.sharedOverhead+r.duty;
  r.unitCost=divide(r.totalCost,nonneg(p.quantity));r.supplierPrice=divide(r.unitCost,1-Number(p.producerMargin)/100);r.grossProfit=r.supplierPrice-r.unitCost;
  r.markupPct=bottle?null:r.kind==='can'?nonneg(g.ldbPct):g.kegRateMode==='reference'?15:nonneg(g.kegMarkup);
  r.ldb=bottle?spiritsMarkup(divide(r.supplierPrice,r.volume),p)*r.volume:r.supplierPrice*r.markupPct/100;
  r.kegPriceAvailable=bottle||r.kind==='can'||g.kegRateMode==='manual'||(g.kegRateMode==='reference'&&r.volume>20);
  r.crf=bottle?nonneg(p.bottleCrf):r.kind==='can'?nonneg(g.crf):0;
  r.deposit=bottle?nonneg(p.bottleDeposit):r.kind==='can'?nonneg(g.canDeposit):r.volume<=10?5:nonneg(g.kegDeposit);
  r.service=(bottle?nonneg(p.bottleServicePerL):nonneg(g.servicePerL))*r.volume;
  r.wholesaleExCrf=r.supplierPrice+r.ldb+r.service;r.wholesale=r.wholesaleExCrf+r.crf;
  r.retailPreTax=divide(r.wholesaleExCrf,1-Number(p.retailMargin)/100)+r.crf;
  r.gst=r.retailPreTax*(bottle?nonneg(p.bottleGst):nonneg(g.gstPct))/100;
  r.pst=r.retailPreTax*(bottle?nonneg(p.bottlePst):nonneg(g.pstPct))/100;
  r.retail=r.retailPreTax+r.gst+r.pst+r.deposit;
  if(bottle){
   warnings.push(p.name+': bottled mixto composition, bottling eligibility and actual ABV need verification. Zero packaging inputs are unquoted. Spirits over 7% do not use RTD s.123 relief. Federal excise is counted once; do not add bulk and packaged duty together.');
   if(!p.bottleMarkupConfirmed)warnings.push(p.name+': BC spirits markup is a planning assumption requiring LDB confirmation. Historical 2015 graduated tiers are not verified current rates; multi-size high-price eligibility must be confirmed.');
   if(p.bottleDutyMode==='bulk')warnings.push(p.name+': excise uses consumed source alcohol including process loss; no loss relief assumed. Confirm actual import/production duty liability.');
   if(p.bottleDutyMode==='packaged')warnings.push(p.name+': packaged-alcohol duty basis assumes separately confirmed loss treatment under the licensed route; s.123 RTD relief does not apply.');
   if(p.bottleDutyMode==='included')warnings.push(p.name+': excise assumed included in source cost; verify supplier/broker evidence. Only the separate adjustment is added.');
   if(p.bottleDutyMode==='manual')warnings.push(p.name+': only the entered manual duty total is added. Confirm this full run liability with the broker/co-packer.');
  }
 }
 if(rows.some(r=>r.kind==='bottle')&&!rows.some(r=>r.kind!=='bottle')&&nonneg(g.dutyAdjustment)>0)warnings.push('Shared RTD duty adjustment is not allocated to bottles; use the separate bottle duty adjustment.');
 const inventory=[...sourceMap.values()].map(s=>({...s,remaining:s.volume-s.consumed,overallocated:s.consumed>s.volume+1e-7,consumedCost:s.perBulkL*s.consumed,remainingCost:s.perBulkL*Math.max(0,s.volume-s.consumed)}));
 inventory.filter(s=>s.overallocated).forEach(s=>errors.push(`${s.name}: overallocated by ${(s.consumed-s.volume).toFixed(2)} L of bulk tequila. Other supplies cannot cover this automatically.`));
 const totals={finishedL:rows.reduce((a,r)=>a+r.finishedL,0),bulkL:rows.reduce((a,r)=>a+r.bulkL,0),cost:rows.reduce((a,r)=>a+r.totalCost,0),duty:rows.reduce((a,r)=>a+r.duty,0),sharedOverhead:rows.reduce((a,r)=>a+r.sharedOverhead,0),supplierRevenue:rows.reduce((a,r)=>a+r.supplierPrice*r.p.quantity,0)};
 return {rows,inventory,totals,errors,warnings,valid:errors.length===0};
}
