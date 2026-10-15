// Loopback development only. Never deploy this server or its synthetic identity adapter.
import http from 'node:http';
import { resolve } from 'node:path';
import { createPortalHandler,securityHeaders } from '../../lib/investor/handler.mjs';
import { createService } from '../../lib/investor/service.mjs';
import { MemoryStore,emptyState } from './memory-store.mjs';
import { fileAssets,privateManifest } from './file-assets.mjs';
const port=Number(process.env.PORT||4317),origin=`http://127.0.0.1:${port}`;
const state=emptyState();for(const id of ['owner','investor','unverified'])state.members[id]={name:`Test ${id}`,email:`${id}@example.invalid`,active:true,owner:id==='owner'};
const store=new MemoryStore(state),service=createService(store);
const auth={authenticate:async request=>{const id=request.headers.get('cookie')?.match(/(?:^|; )local_demo=(owner|investor|unverified)(?:;|$)/)?.[1];return id?{id,email:state.members[id].email,verified:id!=='unverified'}:null;}};
const root=resolve(process.env.PRIVATE_DECK_DIR||'../tequila-investor/dist');
if(root.startsWith(resolve('.')+'/'))throw Error('Private deck must be outside repository');
const handler=createPortalHandler({auth,service,origin,assets:fileAssets(root,privateManifest),ui:fileAssets(resolve('assets/investor-ui'),new Set(['login.js','portal.js','portal.css','dashboard.js','dashboard.html']))});
http.createServer(async(req,res)=>{try{
 if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);return res.end('Host denied');}
 const url=new URL(req.url,origin);
 if(url.pathname==='/local-login'&&req.method==='GET'){res.writeHead(200,{...securityHeaders,'Content-Type':'text/html'});return res.end('<!doctype html><html lang="en"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local investor preview</title><script src="/investors/ui/login.js" defer></script><link rel="stylesheet" href="/investors/ui/portal.css"><body class="portal-dashboard"><main><p>LOCAL TEST ONLY · NO REAL ACCOUNTS</p><h1>Private investor preview</h1><p>Choose a synthetic account. This loopback demo does not authenticate real investors.</p><form method="post" action="/local-login"><button name="account" value="owner">Test owner</button> <button name="account" value="investor">Test investor</button> <button name="account" value="unverified">Test unverified</button></form></main></body></html>');}
 if(url.pathname==='/local-login'&&req.method==='POST'){if(req.headers.origin!==origin){res.writeHead(403);return res.end();}let data='';for await(const chunk of req){data+=chunk;if(data.length>128)throw Error();}const id=new URLSearchParams(data).get('account');if(!state.members[id])throw Error();res.writeHead(303,{...securityHeaders,Location:'/investors/','Set-Cookie':`local_demo=${id}; HttpOnly; SameSite=Strict; Path=/`});return res.end();}
 if(url.pathname==='/local-logout'){res.writeHead(303,{...securityHeaders,Location:'/local-login','Set-Cookie':'local_demo=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/'});return res.end();}
 const request=new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});
 const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(503,securityHeaders);res.end('Local preview unavailable');}}).listen(port,'127.0.0.1',()=>console.log(`Local-only preview: ${origin}/local-login`));
