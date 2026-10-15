import { readdir,readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const paths=['lib/investor','tools/investor','tests/investor','assets/investor-ui','src/investor','config','netlify/database/migrations'];
async function walk(dir){for(const item of await readdir(dir,{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isSymbolicLink())throw Error('No symlinks in portal source');if(item.isDirectory())await walk(path);else {if(/\.(pdf|pptx|png|jpe?g|ttf)$/i.test(path))throw Error('Private assets must stay outside source: '+path);const text=await readFile(path,'utf8');if(/const DECK\s*=|const FINANCIALS\s*=/.test(text))throw Error('Deck data found in portal source: '+path);}}}
for(const path of paths)await walk(path);
const changed=execFileSync('git',['diff','--name-only','--diff-filter=MDR','25a0cc46afb3802cabe8ce8444a31cf7cbd9138b'],{encoding:'utf8'}).trim();const approved=new Set(['.gitignore','package.json','package-lock.json','netlify.toml']);const unexpected=changed.split('\n').filter(p=>p&&!approved.has(p));if(unexpected.length)throw Error('Unexpected existing-site modification: '+unexpected.join(', '));
const production=await readFile('netlify/functions/investors.mjs','utf8');if(/tools\/investor|PRIVATE_DECK_DIR/.test(production))throw Error('Development adapter imported into production');
console.log('PASS: existing public source untouched; local build/dependency configuration reviewed separately; portal source contains no financial assets or development production imports. Private source is a sibling directory.');
