import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';
import { jsonResponse, originAllowed } from './_hotline-http.mjs';

const base=()=>String(process.env.SUPABASE_URL||'https://dowfjjthshbbgnvwxzjv.supabase.co').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const headers=(extra={})=>({apikey:key(),authorization:`Bearer ${key()}`,'content-type':'application/json',...extra});
const clean=(v,n=200)=>String(v??'').trim().slice(0,n);
const auth=request=>verifyAdminToken(getBearerToken(request),process.env.HOTLINE_ADMIN_SECRET);

async function sb(path,options={}){
  if(!key())throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  const r=await fetch(`${base()}/rest/v1/${path}`,{...options,headers:headers(options.headers)});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const e=new Error(data?.message||'Database request failed.');e.status=r.status;throw e}
  return data;
}

function normalizeItems(value){
  const raw=Array.isArray(value)?value:[];
  const seen=new Set(),items=[];
  for(const item of raw){
    const cleaned=clean(item,120);
    if(!cleaned)continue;
    const key=cleaned.toLowerCase();
    if(seen.has(key))continue;
    seen.add(key);items.push(cleaned);
    if(items.length>=30)break;
  }
  return items;
}

async function audit(contestId,items){
  await sb('contest_audit_log',{method:'POST',body:JSON.stringify({contest_id:contestId,action:'retailer_receipt_allowed_items_updated',actor:'Sueños admin',details:{items}})}).catch(()=>null);
}

export default async request=>{
  if(!originAllowed(request))return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
  if(!auth(request))return jsonResponse(401,{ok:false,message:'Admin session expired.'});
  const url=new URL(request.url),id=clean(url.searchParams.get('id'),80);
  if(!id)return jsonResponse(400,{ok:false,message:'Contest ID is required.'});

  try{
    const contest=(await sb(`contests?id=eq.${id}&select=id,contest_type,retail_is_master,retail_parent_id,retailer_name,receipt_bonus_allowed_items&limit=1`))?.[0];
    if(!contest)return jsonResponse(404,{ok:false,message:'Contest not found.'});
    if(contest.contest_type!=='retail'||contest.retail_is_master)return jsonResponse(409,{ok:false,message:'Accepted receipt items are configured on individual retailer pages.'});

    if(request.method==='GET'){
      return jsonResponse(200,{ok:true,retailerName:contest.retailer_name||'Retailer',items:normalizeItems(contest.receipt_bonus_allowed_items)});
    }

    if(request.method==='POST'){
      const body=await request.json().catch(()=>({})),items=normalizeItems(body.items);
      const rows=await sb(`contests?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify({receipt_bonus_allowed_items:items,updated_at:new Date().toISOString()})});
      await audit(id,items);
      return jsonResponse(200,{ok:true,retailerName:rows?.[0]?.retailer_name||contest.retailer_name||'Retailer',items});
    }

    return jsonResponse(405,{ok:false,message:'Method not allowed.'});
  }catch(error){
    console.error('contest-receipt-allowed-items',error);
    return jsonResponse(error.status||500,{ok:false,message:error.message||'Accepted receipt items could not be saved.'});
  }
};

export const config={path:'/api/contest-receipt-allowed-items'};
