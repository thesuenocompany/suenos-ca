import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {addCalculator,calculatorFiles} from '../../tools/investor/add-calculator.mjs';
test('calc build keeps existing headers and robots groups, excludes assets, exposes noindex entry',async()=>{
 const out=await mkdtemp(join(tmpdir(),'suenos-calc-test-'));
 try{
 await writeFile(join(out,'_headers'),'/existing\n  X-Test: retained\n');
 await writeFile(join(out,'robots.txt'),'User-agent: *\nAllow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nSitemap: https://suenos.ca/sitemap.xml\n');
 await addCalculator(resolve('.'),out);
 const headers=await readFile(join(out,'_headers'),'utf8'),robots=await readFile(join(out,'robots.txt'),'utf8'),html=await readFile(join(out,'calc/index.html'),'utf8');
 assert.match(headers,/X-Test: retained/);assert.equal((headers.match(/X-Robots-Tag: noindex/g)||[]).length,2);
 assert.equal((robots.match(/Disallow: \/calc\//g)||[]).length,2);assert.match(robots,/Allow: \/calc\/\$/);assert.match(robots,/Sitemap: https:\/\/suenos.ca\/sitemap.xml/);
 assert.match(html,/<base href="\/calc\/">/);assert.match(html,/<meta name="robots" content="noindex, nofollow, noarchive, nosnippet">/);assert.doesNotMatch(html,/PRIVATE WORKSPACE/);
 for(const f of calculatorFiles)assert.ok((await readFile(join(out,'calc',f))).length);
 }finally{await rm(out,{recursive:true,force:true});}
});
