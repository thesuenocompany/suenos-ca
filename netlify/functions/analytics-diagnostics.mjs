import { randomUUID } from 'node:crypto';
import { jsonResponse } from './_hotline-http.mjs';
import { normaliseEvent } from './_analytics-model.mjs';
import { analyticsStore } from './_analytics-store.mjs';
export default async (request,context)=>{
  if(request.method!=='POST')return jsonResponse(405,{ok:false,message:'Use the analytics report endpoint for reports.'},{allow:'POST'});
  const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
  if(/bot|crawler|spider|headless|facebookexternalhit|preview/i.test(request.headers.get('user-agent')||''))return new Response(null,{status:204});
  if(Number(request.headers.get('content-length'))>24000)return jsonResponse(413,{ok:false,message:'Payload too large.'});
  try{
    const raw=await request.text();if(raw.length>24000)return jsonResponse(413,{ok:false,message:'Payload too large.'});
    let body;try{body=JSON.parse(raw);}catch{return jsonResponse(400,{ok:false,message:'Invalid JSON.'});}
    const batch=Array.isArray(body?.events)?body.events:[body];if(batch.length<1||batch.length>20)return jsonResponse(400,{ok:false,message:'Send 1–20 events.'});
    const now=new Date();let events;try{events=batch.map(r=>normaliseEvent(r,context?.geo,now)).filter(Boolean);}catch(e){return jsonResponse(400,{ok:false,message:e.message});}
    if(events.length){const batchId=/^[a-zA-Z0-9-]{16,64}$/.test(body.batchId||'')?body.batchId:randomUUID();await analyticsStore().setJSON(`events/${now.toISOString().slice(0,10)}/${batchId}.json`,{version:2,events});}
    return jsonResponse(202,{ok:true});
  }catch(error){console.error('Analytics collection failed',error.name);return jsonResponse(503,{ok:false,message:'Analytics is temporarily unavailable.'});}
};
export const config={path:'/api/analytics-diagnostics',rateLimit:{windowLimit:120,windowSize:60,aggregateBy:['ip','domain']}};
