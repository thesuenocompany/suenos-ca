import { readFile } from 'node:fs/promises';
import { loadStockists, createStockistHandler } from '../../lib/stockists.mjs';

// Bundle only existing public templates. Reuse the locator's public anonymous
// configuration without introducing credentials or privileged database access.
const [template,locator]=await Promise.all([
  readFile('en-ca/find-a-bottle/index.html','utf8'),
  readFile('locator/index.html','utf8')
]);
const url=locator.match(/const SUPABASE_URL = '([^']+)'/)?.[1];
const key=locator.match(/const SUPABASE_KEY = '([^']+)'/)?.[1];
export default createStockistHandler({template,load:()=>loadStockists({url,key})});
export const config={path:['/api/public-stockists','/en-ca/find-a-bottle','/en-ca/find-a-bottle/','/en-ca/find-a-bottle/index.html'],preferStatic:false};
