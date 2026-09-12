import { getBearerToken,verifyAdminToken } from './_hotline-auth.mjs';
import { jsonResponse } from './_hotline-http.mjs';
import { reportRange,buildReport,shiftDay } from './_analytics-model.mjs';
import { analyticsStore,readEvents } from './_analytics-store.mjs';
export default async request=>{
  if(request.method!=='GET')return jsonResponse(405,{ok:false,message:'Method not allowed.'},{allow:'GET'});
  if(!verifyAdminToken(getBearerToken(request),Netlify.env.get('HOTLINE_ADMIN_SECRET')))return jsonResponse(401,{ok:false,message:'Your admin session has expired. Log in again to view analytics.'});
  const params=new URL(request.url).searchParams;let range;try{range=reportRange(params);}catch(e){return jsonResponse(400,{ok:false,message:e.message});}
  const filters=Object.fromEntries(['source','campaign','province','country','device','channel'].map(k=>[k,params.get(k)||'']));
  try{const {records,...coverage}=await readEvents(analyticsStore(),shiftDay(range.previousStart,-1),shiftDay(range.end,1));return jsonResponse(200,{...buildReport(records,range,filters),coverage});}
  catch(error){console.error('Analytics report failed',error.name);return jsonResponse(503,{ok:false,message:'The report could not be loaded. Try a shorter date range or refresh.'});}
};
export const config={path:'/api/analytics-report'};
