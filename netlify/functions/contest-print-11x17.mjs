import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';
import { jsonResponse, originAllowed } from './_hotline-http.mjs';

const base=()=>String(process.env.SUPABASE_URL||'https://dowfjjthshbbgnvwxzjv.supabase.co').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const headers=(extra={})=>({apikey:key(),authorization:`Bearer ${key()}`,'content-type':'application/json',...extra});
const clean=(v,n=1200)=>String(v??'').trim().slice(0,n);
const auth=request=>verifyAdminToken(getBearerToken(request),process.env.HOTLINE_ADMIN_SECRET);
const clamp01=v=>Math.max(0,Math.min(1,Number(v)||0));
const normalizeQrBox=value=>{const v=value&&typeof value==='object'?value:{};let x=clamp01(v.x),y=clamp01(v.y),width=clamp01(v.width),height=clamp01(v.height);width=Math.max(.03,Math.min(width,1-x));height=Math.max(.03,Math.min(height,1-y));return{x,y,width,height};};

async function sb(path,options={}){
  if(!key())throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
  const r=await fetch(`${base()}/rest/v1/${path}`,{...options,headers:headers(options.headers)});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const e=new Error(data?.message||'Database request failed.');e.status=r.status;throw e}
  return data;
}

async function audit(contestId,action,details={}){
  await sb('contest_audit_log',{method:'POST',body:JSON.stringify({contest_id:contestId,action,actor:'Sueños admin',details})}).catch(()=>null);
}

export default async request=>{
  if(!originAllowed(request))return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
  if(!auth(request))return jsonResponse(401,{ok:false,message:'Admin session expired.'});
  const url=new URL(request.url),id=clean(url.searchParams.get('id'),80);
  if(!id)return jsonResponse(400,{ok:false,message:'Contest ID is required.'});

  try{
    if(request.method==='GET'){
      const row=(await sb(`contests?id=eq.${id}&select=id,contest_type,retail_is_master,retail_parent_id,internal_name,retailer_name,retailer_code,slug,retail_print_11x17_poster_url,retail_print_11x17_poster_name,retail_print_11x17_qr_box,retail_print_11x17_updated_at&limit=1`))?.[0];
      if(!row)return jsonResponse(404,{ok:false,message:'Contest not found.'});
      if(row.contest_type!=='retail')return jsonResponse(400,{ok:false,message:'11 × 17 posters are only available for retail contests.'});
      let source=row,inherited=false;
      if(!row.retail_is_master){
        if(!row.retail_parent_id)return jsonResponse(409,{ok:false,message:'This retailer page is not connected to a master campaign.'});
        source=(await sb(`contests?id=eq.${row.retail_parent_id}&select=id,internal_name,retail_print_11x17_poster_url,retail_print_11x17_poster_name,retail_print_11x17_qr_box,retail_print_11x17_updated_at&limit=1`))?.[0];
        if(!source)return jsonResponse(404,{ok:false,message:'The master retail campaign could not be found.'});
        inherited=true;
      }
      return jsonResponse(200,{ok:true,config:{...source,width_in:11,height_in:17,source_contest_id:source.id,source_internal_name:source.internal_name,inherited,request_contest_id:row.id,request_retailer_name:row.retailer_name||null,request_retailer_code:row.retailer_code||null,request_slug:row.slug}});
    }

    if(request.method==='POST'){
      const body=await request.json().catch(()=>({}));
      const c=(await sb(`contests?id=eq.${id}&select=id,contest_type,retail_is_master,internal_name&limit=1`))?.[0];
      if(!c)return jsonResponse(404,{ok:false,message:'Contest not found.'});
      if(c.contest_type!=='retail')return jsonResponse(400,{ok:false,message:'11 × 17 posters are only available for retail contests.'});
      if(!c.retail_is_master)return jsonResponse(409,{ok:false,message:'11 × 17 poster artwork and QR placement must be edited on the master retail campaign.'});
      const posterUrl=clean(body.posterUrl,1200);
      if(posterUrl&&!posterUrl.startsWith('/api/contest-assets/')&&!posterUrl.startsWith('/assets/templates/'))return jsonResponse(400,{ok:false,message:'Use an uploaded contest JPG or an included Sueños template.'});
      const patch={
        retail_print_11x17_poster_url:posterUrl||null,
        retail_print_11x17_poster_name:clean(body.posterName,240)||null,
        retail_print_11x17_qr_box:body.qrBox?normalizeQrBox(body.qrBox):null,
        retail_print_11x17_updated_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      };
      const rows=await sb(`contests?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});
      await audit(id,'retail_print_11x17_master_updated',{posterUrl:patch.retail_print_11x17_poster_url,qrBox:patch.retail_print_11x17_qr_box});
      return jsonResponse(200,{ok:true,config:{...rows[0],width_in:11,height_in:17,source_contest_id:id,source_internal_name:c.internal_name,inherited:false}});
    }

    return jsonResponse(405,{ok:false,message:'Method not allowed.'});
  }catch(error){
    console.error('contest-print-11x17',error);
    return jsonResponse(error.status||500,{ok:false,message:error.message||'11 × 17 poster settings could not be saved.'});
  }
};

export const config={path:'/api/contest-print-11x17'};
