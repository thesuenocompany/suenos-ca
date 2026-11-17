import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => readFileSync(path, 'utf8');
test('public SEO declarations consistently use the primary non-www host', () => {
  let declarations=0;
  for(const {path} of JSON.parse(read('config/public-manifest.json')).files.filter(f=>f.path.endsWith('.html'))){
    for(const tag of read(path).match(/<link\b[^>]*>/gi)||[]){
      if(!/rel=["'](?:canonical|alternate)["']/i.test(tag))continue;
      const href=tag.match(/href=["']([^"']+)/i)?.[1];
      if(!href?.includes('suenos.ca'))continue;
      assert.equal(new URL(href).origin,'https://suenos.ca',path);
      declarations++;
    }
  }
  assert.ok(declarations>40,'Expected to inspect the public locale pages');
  for(const path of ['sitemap.xml','image-sitemap.xml','robots.txt','data/brand-facts.json']){
    assert.ok(read(path).includes('https://suenos.ca'),path);
    assert.ok(!read(path).includes('https://www.suenos.ca'),path);
  }
});
test('public manifest hashes match the reviewed files', () => {
  for (const file of JSON.parse(read('config/public-manifest.json')).files) assert.equal(createHash('sha256').update(readFileSync(file.path)).digest('hex'), file.sha256, file.path);
});
test('finder retains its interactive map and bundles both server-rendering templates', () => {
  const current=read('locator/index.html');
  assert.match(read('en-ca/find-a-bottle/index.html'),/<iframe[^>]+src="\/locator\/"/);
  assert.match(current,/id="search"/);
  assert.match(current,/fetch\('\/api\/public-stockists'/);
  assert.match(read('netlify.toml'),/\[functions.public-stockists\]\s+included_files = \["en-ca\/find-a-bottle\/index.html", "locator\/index.html"\]/);
});
