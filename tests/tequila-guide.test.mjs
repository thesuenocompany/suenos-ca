import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const base='https://suenos.ca';
const en='/en-ca/tequila-guide/', es='/es-mx/guia-del-tequila/';
const pairs=[[en,es],[en+'blanco-vs-reposado-vs-anejo/',es+'blanco-reposado-y-anejo/'],[en+'what-does-100-percent-agave-mean/',es+'que-significa-100-por-ciento-de-agave/']];
const read=p=>readFileSync(p.slice(1)+'index.html','utf8');
const siteMap=readFileSync('sitemap.xml','utf8');
test('guide pages are static, linked, canonical, localized, and in the sitemap',()=>{
 for(const routes of pairs) for(const route of routes){
  const html=read(route);
  assert.ok(html.includes('rel="canonical" href="'+base+route+'"'),route);
  assert.equal((html.match(/<h1>/g)||[]).length,1,route);
  assert.ok(html.includes('id="age-gate"'),route);
  assert.ok(siteMap.includes('<loc>'+base+route+'</loc>'),route);
  for(const alternate of routes)assert.ok(html.includes('href="'+base+alternate+'"'),route);
  for(const m of html.matchAll(/(?:src|href)="(\/assets\/(?:css|images\/tequila-guide)\/[^"]+)"/g)) assert.ok(existsSync(m[1].slice(1)),m[1]);
 }
 for(const [home,guide,product,process] of [['/en-ca/',en,'our-tequila/','how-its-made/'],['/es-mx/',es,'nuestro-tequila/','como-se-hace/']]){
  for(const page of [home,home+product,home+process]) assert.ok(read(page).includes('href="'+guide),page);
 }
});
test('both Margarita comparisons survive recipe hydration and preserve Recipe markup',()=>{
 for(const p of ['/en-ca/cocktails/suenos-margarita/','/es-mx/cocteles/suenos-margarita/']){
  const html=read(p);
  assert.equal((html.match(/id="blanco-or-reposado"/g)||[]).length,1,p);
  assert.match(html,/<main><div data-cocktail-detail="[\s\S]+?<\/div><section class="tg-callout tg-margarita" id="blanco-or-reposado">[\s\S]+?<\/section>\s*<\/main>/);
  assert.match(html,/"@type"\s*:\s*"Recipe"/);
  assert.match(html,/id="age-gate"/);
 }
});
