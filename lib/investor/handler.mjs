import { PortalError, sameOrigin, deny } from './policy.mjs';
export const securityHeaders = {
  'Cache-Control':'private, no-store, max-age=0', 'Netlify-CDN-Cache-Control':'no-store',
  'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer', 'X-Robots-Tag':'noindex, nofollow, noarchive',
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
const json = (value,status=200) => new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
async function body(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) deny(415,'JSON required.');
  const reader=request.body?.getReader(); let size=0, chunks=[];
  if(!reader) deny(400,'Request body required.');
  for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.length; if(size>32768){await reader.cancel();deny(413,'Request too large.');} chunks.push(value); }
  try { const value=JSON.parse(Buffer.concat(chunks).toString()); if(!value || Array.isArray(value)||typeof value!=='object') throw Error(); return value; } catch { deny(400,'Invalid JSON.'); }
}
export function createPortalHandler({auth,service,assets,ui,origin,sessionScript=false}) {
 return async request => {
  let response;
  try {
   const url=new URL(request.url), path=url.pathname;
   if(url.origin!==origin) deny(403,'Host not allowed.');
   if(!['GET','HEAD','POST'].includes(request.method)) deny(405,'Method not allowed.');
   if(request.method==='POST') sameOrigin(request,origin);
   if((path==='/investors/login'||path==='/investors/login/') && ['GET','HEAD'].includes(request.method)) response=await ui('auth.html');
   else if(path.startsWith('/investors/ui/') && ['GET','HEAD'].includes(request.method)) response=await ui(path.slice(14));
   else {
    const identity=await auth.authenticate(request);
    await service.authorize(identity, path==='/investors/dashboard' || path==='/investors/api/report' || path==='/investors/api/revoke');
    if(path.startsWith('/investors/api/')) {
     const route=path.slice(15), data=request.method==='POST'?await body(request):{};
     if(route==='me' && request.method==='GET') response=json(await service.me(identity));
     else if(route==='report' && request.method==='GET') response=json(await service.report(identity));
     else if(route==='consent' && request.method==='POST') response=json(await service.consent(identity,data.granted,data.version));
     else if(route==='session' && request.method==='POST') response=json(await service.session(identity));
     else if(route==='events' && request.method==='POST') response=json(await service.events(identity,data.sessionId,data.revision,data.events));
     else if(route==='revoke' && request.method==='POST') response=json(await service.revoke(identity,data.id));
     else deny(404,'Not found.');
    } else if(request.method==='POST') deny(405,'Method not allowed.');
    else if(path==='/investors/dashboard') response=await ui('dashboard.html');
    else if(path==='/investors' || path==='/investors/' || path==='/investors/index.html') {
     const original=await assets('index.html'); if(!original.ok) deny(503,'Presentation unavailable.');
     let html=(await original.text()).replace('<head>','<head><base href="/investors/"><link rel="stylesheet" href="ui/portal.css"><script src="ui/portal.js" defer></script>');
     if(sessionScript)html=html.replace('</head>','<script src="/investors/ui/session-bundle.js" defer></script></head>');
     response=new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
    } else if(path.startsWith('/investors/')) response=await assets(path.slice(11));
    else deny(404,'Not found.');
   }
  } catch(error) {
   response=json({error:error instanceof PortalError?error.message:'Portal unavailable. Please try again later.'},error instanceof PortalError?error.status:503);
   if(sessionScript && error instanceof PortalError && error.status===401 && ['/investors','/investors/'].includes(new URL(request.url).pathname) && ['GET','HEAD'].includes(request.method)) {
    try { const login=await ui('auth.html');response=new Response(login.body,{status:401,headers:login.headers}); } catch { /* Keep fail-closed JSON response. */ }
   }
  }
  const headers=new Headers(response.headers); for(const [k,v] of Object.entries(securityHeaders)) headers.set(k,v);
  return new Response(request.method==='HEAD'?null:response.body,{status:response.status,headers});
 };
}
