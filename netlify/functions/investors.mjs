import { readFile } from 'node:fs/promises';
import { createRuntime,enabledProduction,productionSite } from '../../lib/investor/runtime.mjs';
import { securityHeaders } from '../../lib/investor/handler.mjs';
const generic=new Set(['portal.js','portal.css','dashboard.js','dashboard.html','auth.html','callback-bridge.js']);
const bundles=new Set(['auth-bundle.js','session-bundle.js']);
async function ui(name){
 if(!generic.has(name)&&!bundles.has(name))return new Response('Not found',{status:404});
 const root=name==='callback-bridge.js'?'src/investor':bundles.has(name)?'generated/investor-ui':'assets/investor-ui';
 const content=await readFile(`${root}/${name}`);
 return new Response(content,{headers:{'Content-Type':name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css':'text/javascript'}});
}
let pool;
export default async (request,context)=>{
 const runtimeEnv={CONTEXT:context?.deploy?.context,SITE_ID:context?.site?.id,INVESTOR_PORTAL_ENABLED:process.env.INVESTOR_PORTAL_ENABLED,INVESTOR_OWNER_EMAIL:process.env.INVESTOR_OWNER_EMAIL};
 // Generic callback/UI responses require no storage and contain no private content.
 if(productionSite(runtimeEnv,request)&&['GET','HEAD'].includes(request.method)){
  const path=new URL(request.url).pathname;
  const name=(path==='/investors/login'||path==='/investors/login/')?'auth.html':path.startsWith('/investors/ui/')?path.slice(14):null;
  if(name&&(generic.has(name)||bundles.has(name))){try{const response=await ui(name);const headers=new Headers(response.headers);for(const [key,value]of Object.entries(securityHeaders))headers.set(key,value);return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});}catch{return new Response('Sign-in temporarily unavailable.',{status:503,headers:securityHeaders});}}
 }
 // Fail before loading provider clients in all previews and unconfigured deployments.
 if(!enabledProduction(runtimeEnv,request))return new Response('Investor portal is not activated.',{status:503,headers:securityHeaders});
 try {
  if(process.env.INVESTOR_ASSETS_READY!=='true')throw Error('Storage not approved/configured');
  const [identity,{getDatabase},{getStore}]=await Promise.all([import('@netlify/identity'),import('@netlify/database'),import('@netlify/blobs')]);
  // Platform-managed connection only: never read, copy, log or return its URL.
  pool??=getDatabase().pool;
  const assetsStore=getStore({name:'investor-private-assets',region:'us-east-2',consistency:'strong'});
  return createRuntime({env:runtimeEnv,identity,pool,assetsStore,ui})(request);
 }catch{return new Response('Investor portal unavailable.',{status:503,headers:securityHeaders});}
};
export const config={path:['/investors','/investors/*']};
