import { privateManifest } from './asset-manifest.mjs';
const types={html:'text/html; charset=utf-8',css:'text/css',js:'text/javascript',png:'image/png',jpg:'image/jpeg',ttf:'font/ttf',pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
// Only called AFTER authorization. Never exposes raw keys, URLs, tokens or redirects.
export function blobAssets(store,{edition='teal-gold-v2'}={}) {
 if(!/^[a-z0-9-]{1,48}$/.test(edition))throw Error('Invalid edition');
 return async name=>{
  if(!privateManifest.has(name))return new Response('Not found',{status:404});
  const stream=await store.get(`${edition}/${name}`,{type:'stream',consistency:'strong'});
  if(!stream)return new Response('Presentation asset unavailable',{status:503});
  const ext=name.split('.').pop();
  return new Response(stream,{headers:{'Content-Type':types[ext]||'application/octet-stream','Cache-Control':'private, no-store','Netlify-CDN-Cache-Control':'no-store',...(ext==='pdf'||ext==='pptx'?{'Content-Disposition':`attachment; filename="${name.split('/').pop()}"`}:{})}});
 };
}
