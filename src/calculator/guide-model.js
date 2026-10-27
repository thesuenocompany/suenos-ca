// Guide metadata is additive. Pricing remains exclusively in model.js.
export const steps=['Choose products','Formats & quantities','Tequila supply','Costs & taxes','Review plan'];
export function stepNumber(value){const n=Number(String(value).replace('#step-',''));return Number.isInteger(n)&&n>=1&&n<=5?n:1;}
export function costStatus(products){return products.filter(p=>!p.guideCostReviewed||Object.values(p).some(v=>v==='')).map(p=>p.name||'Unnamed product');}
export function guideIssues(workspace,plan,step){
 if(!workspace.products.length)return ['Add at least one product to your mix.'];
 if(step===2){return workspace.products.flatMap(p=>{
 const problems=[];const prefix=(p.name||'Product')+': ';
 if(!Number.isInteger(Number(p.quantity))||Number(p.quantity)<=0)problems.push(prefix+'enter a positive whole number of containers.');
 if(!(Number(p.abv)>0&&Number(p.abv)<=100))problems.push(prefix+'enter a finished ABV between 0 and 100%.');
 if(String(p.format).startsWith('b')?Number(p.abv)<=7:![5,7].includes(Number(p.abv)))problems.push(prefix+'use a supported strength (bottles above 7%; RTDs 5% or 7%).');
 if(p.lossPct===''||!(Number(p.lossPct)>=0&&Number(p.lossPct)<100))problems.push(prefix+'loss must be 0% to less than 100%.');
 if(p.format==='custom'&&!(Number(p.customLitres)>0))problems.push(prefix+'enter the custom keg capacity in litres.');
 return problems;
 });}
 const dilution=workspace.products.flatMap(p=>{const s=workspace.supplies?.find(s=>s.id===p.supplyId);return s&&Number(s.abv)<Number(p.abv)?[`${p.name}: source strength (${s.abv}%) must be at least the finished strength (${p.abv}%). Choose a stronger source or lower finished ABV.`]:[];});
 return step>=3?[...dilution,...plan.errors]:[];
}
