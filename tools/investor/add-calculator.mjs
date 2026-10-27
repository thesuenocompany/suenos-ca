import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export const calculatorFiles=['index.html','app.js','model.js','workspace.js','guide.js','guide-model.js','help.js','help-content.js','style.css'];
export async function addCalculator(root=resolve('.'),output=resolve('dist-public')){
 await mkdir(`${output}/calc`,{recursive:true});
 for(const file of calculatorFiles)await copyFile(`${root}/src/calculator/${file}`,`${output}/calc/${file}`);
 const headers='\n# Unlisted calculator: indexing exclusions apply to HTML and every asset.\n/calc\n  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n/calc/*\n  X-Robots-Tag: noindex, nofollow, noarchive, nosnippet\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n  X-Content-Type-Options: nosniff\n';
 await writeFile(`${output}/_headers`,await readFile(`${output}/_headers`,'utf8')+headers);
 // Crawlers must read the entry page to see noindex. Block calculator assets,
 // while allowing only the entry documents; never disallow the noindex itself.
 const rules='\n# Calculator assets are not crawlable. Entry pages expose noindex.\nDisallow: /calc/\nAllow: /calc/$\nAllow: /calc/index.html$\n';
 const robots=await readFile(`${output}/robots.txt`,'utf8');
 await writeFile(`${output}/robots.txt`,robots.replace(/(User-agent:[^\n]+\n)/gi,'$1'+rules));
 console.log('Added unlisted /calc with noindex responses, crawler asset exclusions and no navigation/sitemap links.');
}
