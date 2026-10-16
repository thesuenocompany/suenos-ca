// Local inventory only: no uploads, credentials, provider initialization or network.
import { readFile,writeFile,realpath,mkdir } from 'node:fs/promises';
import { resolve,dirname,sep } from 'node:path';
import { createHash } from 'node:crypto';
import { privateManifest } from '../../lib/investor/asset-manifest.mjs';
const source=await realpath(process.argv[2]||'../tequila-investor/dist');
const output=resolve(process.argv[3]||'../netlify-investor-prep/evidence/local-portal/private-asset-manifest.json');
const checkout=await realpath('.');
if(source===checkout||source.startsWith(checkout+sep)||output===checkout||output.startsWith(checkout+sep))throw Error('Private source and inventory must remain outside the checkout');
const files=[];
for(const name of [...privateManifest].sort()){
 const path=await realpath(resolve(source,name));if(!path.startsWith(source+sep))throw Error('Private asset escaped source');
 const bytes=await readFile(path);
 files.push({path:name,key:`partner-october-2026-v2/${name}`,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await mkdir(dirname(output),{recursive:true});
await writeFile(output,JSON.stringify({siteId:'0c7a4a0c-375e-4b11-9d6f-571c7ac18953',store:'investor-private-assets',region:'us-east-2',edition:'partner-october-2026-v2',source,files,totalBytes:files.reduce((n,f)=>n+f.bytes,0)},null,2),{mode:0o600});
console.log(`Prepared ${files.length} private asset checksums (${files.reduce((n,f)=>n+f.bytes,0)} bytes); no files uploaded.`);
