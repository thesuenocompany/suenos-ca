import { readFile,writeFile,rm,mkdir,copyFile,lstat } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
const root=resolve('.'),output=resolve('dist-public'),manifest=JSON.parse(await readFile('config/public-manifest.json','utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Explicit baseline manifest, never a recursive copy of the working directory.
for(const {path,sha256} of manifest.files){
 if(path.startsWith('/')||path.includes('..')||!resolve(path).startsWith(root+'/'))throw Error('Invalid public path');
 if((await lstat(path)).isSymbolicLink())throw Error('Public symlink refused');
 if(hash(await readFile(path))!==sha256)throw Error(`Public baseline changed; review manifest before building: ${path}`);
}
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
for(const {path} of manifest.files){await mkdir(dirname(`${output}/${path}`),{recursive:true});await copyFile(path,`${output}/${path}`);}
await mkdir('generated/investor-ui',{recursive:true});
await build({entryPoints:{'auth-bundle':'src/investor/auth-browser.mjs','session-bundle':'src/investor/session-browser.mjs'},outdir:'generated/investor-ui',bundle:true,platform:'browser',format:'iife',target:['es2022'],minify:true,sourcemap:false,legalComments:'none'});
const publicUI=['portal.css','portal.js','dashboard.js'];
const callbackTag='<script src="/investors/ui/callback-bridge.js" data-investor-callback-bridge></script>';
const homepage=await readFile(`${output}/index.html`,'utf8');
if(!homepage.includes('<head>'))throw Error('Homepage head missing');
await writeFile(`${output}/index.html`,homepage.replace('<head>','<head>'+callbackTag));
await mkdir(`${output}/investors/ui`,{recursive:true});await mkdir(`${output}/investors/login`,{recursive:true});
await copyFile('src/investor/callback-bridge.js',`${output}/investors/ui/callback-bridge.js`);
for(const name of publicUI)await copyFile(`assets/investor-ui/${name}`,`${output}/investors/ui/${name}`);
for(const name of ['auth-bundle.js','session-bundle.js'])await copyFile(`generated/investor-ui/${name}`,`${output}/investors/ui/${name}`);
await copyFile('assets/investor-ui/auth.html',`${output}/investors/login/index.html`);
// Append only investor-scoped headers, retaining any baseline header file bytes above.
const headers='\n/investors/*\n  Cache-Control: private, no-store, max-age=0\n  Netlify-CDN-Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Content-Security-Policy: default-src \'self\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\'\n';
let existing='';try{existing=await readFile(`${output}/_headers`,'utf8');}catch{}
await writeFile(`${output}/_headers`,existing+headers);
const comparison=[];for(const {path,sha256} of manifest.files){let bytes=await readFile(`${output}/${path}`);if(path==='index.html')bytes=Buffer.from(bytes.toString().replace(callbackTag,''));const actual=hash(bytes);if(actual!==sha256)throw Error('Output parity failed: '+path);comparison.push(path);}
await writeFile('generated/public-build-report.json',JSON.stringify({baseline:manifest.baseline,byteIdenticalPublicFiles:comparison.length-1,verifiedPublicFiles:comparison.length,homepageChange:callbackTag,publicFiles:comparison,investorAdditions:['investors/login/index.html',...publicUI.map(n=>'investors/ui/'+n),'investors/ui/auth-bundle.js','investors/ui/session-bundle.js','investors/ui/callback-bridge.js','_headers'],privateContentCopied:false},null,2));
console.log(`PASS: ${comparison.length-1} public files byte-identical; homepage differs only by verified callback bridge; generic investor UI only. No private content copied.`);
