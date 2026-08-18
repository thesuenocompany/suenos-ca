import { jsonResponse, originAllowed } from './_hotline-http.mjs';
import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';
const base=()=>String(process.env.SUPABASE_URL||'https://dowfjjthshbbgnvwxzjv.supabase.co').replace(/\/$/,'');
const key=()=>process.env.SUPABASE_SERVICE_ROLE_KEY||'';
const headers=(extra={})=>({apikey:key(),authorization:`Bearer ${key()}`,'content-type':'application/json',...extra});
async function sb(path,options={}){const r=await fetch(`${base()}/rest/v1/${path}`,{...options,headers:headers(options.headers)});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok)throw Object.assign(new Error(data?.message||'Database request failed.'),{status:r.status});return data;}
const clean=(v,n=3000)=>String(v??'').trim().slice(0,n);
export default async request=>{
 if(!originAllowed(request))return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
 if(!verifyAdminToken(getBearerToken(request),process.env.HOTLINE_ADMIN_SECRET))return jsonResponse(401,{ok:false,message:'Admin session expired.'});
 const url=new URL(request.url),action=url.searchParams.get('action')||'list';
 try{
  if(request.method==='GET'&&action==='list'){const status=clean(url.searchParams.get('status'),40),q=clean(url.searchParams.get('q'),120);let path='houseboat_inquiries?select=*&order=created_at.desc&limit=200';if(status)path+=`&status=eq.${encodeURIComponent(status)}`;if(q)path+=`&or=(first_name.ilike.*${encodeURIComponent(q)}*,last_name.ilike.*${encodeURIComponent(q)}*,email.ilike.*${encodeURIComponent(q)}*,trip_type.ilike.*${encodeURIComponent(q)}*)`;return jsonResponse(200,{ok:true,inquiries:await sb(path)});}
  if(request.method==='POST'&&action==='update'){const body=await request.json().catch(()=>({}));const id=clean(body.id,80);if(!id)return jsonResponse(400,{ok:false,message:'Inquiry ID required.'});const patch={};if(body.status!==undefined)patch.status=clean(body.status,80);if(body.internalNotes!==undefined)patch.internal_notes=clean(body.internalNotes,5000);patch.updated_at=new Date().toISOString();const saved=await sb(`houseboat_inquiries?id=eq.${id}`,{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(patch)});return jsonResponse(200,{ok:true,inquiry:saved?.[0]});}
  return jsonResponse(405,{ok:false,message:'Unsupported action.'});
 }catch(error){console.error('houseboat-admin',error);return jsonResponse(error.status||500,{ok:false,message:'Houseboat admin request failed.'});}
};
export const config={path:'/api/houseboat-admin'};
