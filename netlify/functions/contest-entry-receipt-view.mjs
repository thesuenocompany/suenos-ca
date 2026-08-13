import { getStore } from '@netlify/blobs';
import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';
import { originAllowed } from './_hotline-http.mjs';

const store=()=>getStore('contest-entry-receipts',{consistency:'strong'});
const clean=(v,n=500)=>String(v??'').trim().slice(0,n);

export default async request=>{
  if(!originAllowed(request))return new Response('Origin not allowed.',{status:403});
  if(!verifyAdminToken(getBearerToken(request),process.env.HOTLINE_ADMIN_SECRET))return new Response('Unauthorized.',{status:401});
  if(request.method!=='GET')return new Response('Method not allowed.',{status:405});
  const url=new URL(request.url),key=clean(url.searchParams.get('key'),500);
  if(!key)return new Response('Missing key.',{status:400});
  try{
    const blob=await store().get(key,{type:'arrayBuffer'});
    if(!blob)return new Response('Not found.',{status:404});
    return new Response(blob,{status:200,headers:{'content-type':'image/jpeg','cache-control':'private, max-age=0, must-revalidate'}});
  }catch(error){
    console.error('contest-entry-receipt-view',error);
    return new Response('Receipt not found.',{status:404});
  }
};

export const config={path:'/api/contest-entry-receipt-view'};
