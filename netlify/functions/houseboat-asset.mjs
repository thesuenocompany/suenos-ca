import { getStore } from '@netlify/blobs';
export default async request=>{const url=new URL(request.url);const key=decodeURIComponent(url.pathname.replace(/^\/api\/houseboat-assets\/?/,''));if(!key)return new Response('Not found',{status:404});const store=getStore('suenos-houseboat-assets');const blob=await store.get(key,{type:'blob'});if(!blob)return new Response('Not found',{status:404});return new Response(blob,{headers:{'content-type':blob.type||'application/octet-stream','cache-control':'public,max-age=31536000,immutable'}});};
export const config={path:'/api/houseboat-assets/*'};
