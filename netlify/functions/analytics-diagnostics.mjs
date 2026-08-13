import { getStore, getDeployStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { getBearerToken, verifyAdminToken } from './_hotline-auth.mjs';
import { jsonResponse, originAllowed } from './_hotline-http.mjs';

const storeForContext = () => {
  const isProduction = process.env.CONTEXT === 'production';
  return isProduction ? getStore('analytics-diagnostics') : getDeployStore('analytics-diagnostics');
};
const clean = (value, max=240) => String(value ?? '').trim().slice(0,max);
const dayKey = date => date.toISOString().slice(0,10);
const sourceFrom = payload => clean(payload.utm_source || (payload.fbclid ? 'facebook' : payload.referrerHost) || 'direct',80).toLowerCase();

export default async (request, context) => {
  if (!originAllowed(request)) return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
  const store = storeForContext();

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return jsonResponse(400,{ok:false,message:'Invalid request.'}); }
    const now = new Date();
    const geo = context?.geo || {};
    const record = {
      at: now.toISOString(),
      path: clean(body.path,300) || '/',
      title: clean(body.title,180),
      source: sourceFrom(body),
      medium: clean(body.utm_medium,80).toLowerCase(),
      campaign: clean(body.utm_campaign,120),
      content: clean(body.utm_content,120),
      fbclid: Boolean(body.fbclid),
      metaLanding: Boolean(body.fbclid || /facebook|instagram|meta/i.test(`${body.utm_source||''} ${body.utm_medium||''}`)),
      referrerHost: clean(body.referrerHost,120).toLowerCase(),
      consent: clean(body.consent,30) || 'unknown',
      gaStatus: clean(body.gaStatus,30) || 'unknown',
      overlayId: clean(body.overlayId,100),
      market: clean(body.market,100),
      country: clean(geo.country?.code || geo.country || body.country,8).toUpperCase(),
      province: clean(geo.subdivision?.code || geo.subdivision?.name || body.province,80),
      city: clean(geo.city || body.city,100),
      postalPrefix: clean(geo.postalCode || body.postalCode,3).replace(/\s/g,'').toUpperCase(),
      device: clean(body.device,20),
      language: clean(body.language,20),
      engaged: false
    };
    const key = `events/${dayKey(now)}/${now.getTime()}-${randomUUID()}.json`;
    await store.setJSON(key,record);
    return jsonResponse(202,{ok:true});
  }

  if (request.method === 'GET') {
    const secret = process.env.HOTLINE_ADMIN_SECRET;
    if (!verifyAdminToken(getBearerToken(request),secret)) return jsonResponse(401,{ok:false,message:'Admin session expired.'});
    const url = new URL(request.url);
    const days = Math.min(90,Math.max(1,Number(url.searchParams.get('days'))||7));
    const cutoff = Date.now() - days*86400000;
    const listed = await store.list({prefix:'events/'});
    const recentKeys = listed.blobs.filter(item=>{
      const m=item.key.match(/events\/(\d{4}-\d{2}-\d{2})\//);
      return m && new Date(`${m[1]}T23:59:59Z`).getTime() >= cutoff;
    }).slice(-10000);
    const records=[];
    for (let i=0;i<recentKeys.length;i+=50) {
      const batch=recentKeys.slice(i,i+50);
      const values=await Promise.all(batch.map(item=>store.get(item.key,{type:'json'}).catch(()=>null)));
      records.push(...values.filter(Boolean).filter(r=>new Date(r.at).getTime()>=cutoff));
    }
    records.sort((a,b)=>String(b.at).localeCompare(String(a.at)));
    const countBy = field => Object.entries(records.reduce((acc,r)=>{const k=r[field]||'Unknown';acc[k]=(acc[k]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([name,count])=>({name,count}));
    const uniqueLandingKeys = new Set(records.map(r=>`${r.at?.slice(0,16)}|${r.path}|${r.city}|${r.source}`));
    return jsonResponse(200,{
      ok:true,days,
      totals:{landings:records.length,estimatedUnique:uniqueLandingKeys.size,metaLandings:records.filter(r=>r.metaLanding).length,gaQueued:records.filter(r=>r.gaStatus==='queued').length,analyticsGranted:records.filter(r=>r.consent==='granted').length},
      bySource:countBy('source'),byCampaign:countBy('campaign'),byPage:countBy('path'),byCity:countBy('city'),byProvince:countBy('province'),byOverlay:countBy('overlayId'),byConsent:countBy('consent'),
      recent:records.slice(0,100)
    });
  }
  return jsonResponse(405,{ok:false,message:'Method not allowed.'});
};

export const config={path:'/api/analytics-diagnostics'};
