// Local build inspection only. No Identity requests are proxied; no live service calls.
import http from 'node:http';import { readFile,realpath } from 'node:fs/promises';import { resolve } from 'node:path';
const root=resolve('dist-public'),port=4318;
http.createServer(async(req,res)=>{try{
 if(req.headers.host!==`127.0.0.1:${port}`){res.writeHead(403);return res.end();}
 const url=new URL(req.url,`http://127.0.0.1:${port}`);
 if(url.pathname.startsWith('/.netlify/')){res.writeHead(503);return res.end('Live services disabled in local build preview');}
 let path=decodeURIComponent(url.pathname);if(path.endsWith('/'))path+='index.html';if(path==='/investors/login')path+='/index.html';
 const file=await realpath(resolve(root,'.'+path));if(!file.startsWith(root+'/'))throw Error();
 const type=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':'application/octet-stream';
 res.writeHead(200,{'Content-Type':type});res.end(await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Public build inspection: http://127.0.0.1:${port}`));
