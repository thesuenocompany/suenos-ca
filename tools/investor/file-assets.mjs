// Local-only adapter. Confidential files remain outside the checkout and publish root.
import { realpath, readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.ttf':'font/ttf','.pdf':'application/pdf','.pptx':'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
export function fileAssets(root,allowlist) { return async name => {
 if(!allowlist.has(name)) return new Response('Not found',{status:404});
 const base=await realpath(root), target=await realpath(resolve(base,name));
 if(!target.startsWith(base+sep)) throw Error('Asset escaped private directory');
 const ext=target.slice(target.lastIndexOf('.'));
 return new Response(await readFile(target),{headers:{'Content-Type':types[ext]||'application/octet-stream',...(ext==='.pdf'||ext==='.pptx'?{'Content-Disposition':`attachment; filename="${name.split('/').pop()}"`}:{})}});
}; }
export { privateManifest } from '../../lib/investor/asset-manifest.mjs';
