import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes}from'node:crypto';import{pinService,sessionCookie}from'../../lib/investor/pin-service.mjs';
function setup(){let now=100000;const state={members:{a:{email:'a@example.invalid',active:true,owner:true},b:{email:'b@example.invalid',active:true,owner:false}}};let queue=Promise.resolve();const store={transaction:fn=>{const p=queue.then(()=>fn(state));queue=p.catch(()=>{});return p;}};return {state,service:pinService({store,pepper:randomBytes(32),clock:()=>now}),advance:n=>now+=n};}
test('verified enrollment, hashed credentials, named session and immediate revocation',async()=>{const{state,service}=setup();assert.equal((await service.enroll({proof:{id:'a',email:'a@example.invalid',verified:false},pin:'1234'})).ok,false);assert.equal((await service.enroll({proof:{id:'a',email:'a@example.invalid',verified:true},pin:'1234'})).ok,true);assert.ok(!JSON.stringify(state.pin.credentials).includes('1234'));const r=await service.login({email:'A@example.invalid',pin:'1234',clientNetwork:'trusted-test-network'});assert.equal(r.ok,true);assert.equal((await service.authenticate(r.token)).owner,true);assert.ok(!JSON.stringify(state.pin.sessions).includes(r.token));assert.match(sessionCookie(r.token),/Secure; HttpOnly; SameSite=Strict/);state.members.a.active=false;assert.equal(await service.authenticate(r.token),null);});
test('five guesses per account, rotating networks cannot bypass lock, expiry releases it',async()=>{const{service,advance}=setup();await service.enroll({proof:{id:'b',email:'b@example.invalid',verified:true},pin:'0123'});const results=await Promise.all(Array.from({length:6},(_,i)=>service.login({email:'b@example.invalid',pin:'9999',clientNetwork:'network'+i})));assert.ok(results.every(x=>!x.ok));assert.equal((await service.login({email:'b@example.invalid',pin:'0123',clientNetwork:'new-network'})).ok,false);advance(31*60e3);const r=await service.login({email:'b@example.invalid',pin:'0123',clientNetwork:'new-network'});assert.equal(r.ok,true);assert.equal((await service.authenticate(r.token)).owner,false);advance(31*60e3);assert.equal(await service.authenticate(r.token),null);});
test('existing enrollment cannot be overwritten and logout invalidates only session',async()=>{const{service}=setup();const proof={id:'a',email:'a@example.invalid',verified:true};await service.enroll({proof,pin:'4321'});assert.equal((await service.enroll({proof,pin:'0000'})).ok,false);const r=await service.login({email:proof.email,pin:'4321',clientNetwork:'net'});await service.logout(r.token);assert.equal(await service.authenticate(r.token),null);});

import {MemoryStore} from '../../tools/investor/memory-store.mjs';
import {createService} from '../../lib/investor/service.mjs';
import {pinHTTP,sessionToken} from '../../lib/investor/pin-http.mjs';
import {createPortalHandler} from '../../lib/investor/handler.mjs';
test('PIN HTTP enrollment requires verified membership; session access, CSRF, consent, logout and revocation',async()=>{
 const store=new MemoryStore();store.state.members.a={email:'a@example.invalid',active:true,owner:true};store.state.members.b={email:'b@example.invalid',active:true,owner:false};
 const pins=pinService({store,pepper:randomBytes(32)}),service=createService(store);let proof=null,assets=0;
 const protectedHandler=createPortalHandler({auth:{authenticate:req=>pins.authenticate(sessionToken(req))},service,assets:async()=>{assets++;return new Response('synthetic');},ui:async()=>new Response('generic'),origin:'https://suenos.ca'});
 const handler=pinHTTP({pins,service,identityAuth:{authenticate:async()=>proof},protectedHandler,clientNetwork:'trusted-network'});
 const req=(path,body,cookie,origin='https://suenos.ca')=>new Request('https://suenos.ca/investors/'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify(body):undefined});
 assert.equal((await handler(req('api/pin/enroll',{pin:'4567'}))).status,401);assert.equal(assets,0);
 proof={id:'b',email:'b@example.invalid',verified:false};assert.equal((await handler(req('api/pin/enroll',{pin:'4567'}))).status,401);
 proof.verified=true;assert.equal((await handler(req('api/pin/enroll',{pin:'4567'},null,'https://evil.invalid'))).status,403);
 assert.equal((await handler(req('api/pin/enroll',{pin:'4567',owner:true}))).status,400);
 assert.equal((await handler(req('api/pin/enroll',{pin:'4567'}))).status,200);
 const login=await handler(req('api/pin/login',{email:proof.email,pin:'4567'}));assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.deepEqual(await login.json(),{ok:true});
 assert.equal((await handler(req('content.js',null,cookie))).status,200);assert.equal((await handler(req('dashboard',null,cookie))).status,403);
 assert.equal((await handler(req('api/consent',{granted:false,version:'investor-engagement-v1'},cookie))).status,200);assert.equal((await handler(req('content.js',null,cookie))).status,200);
 assert.equal((await handler(req('api/pin/logout',{},cookie))).status,200);assert.equal((await handler(req('content.js',null,cookie))).status,401);
 const again=await handler(req('api/pin/login',{email:proof.email,pin:'4567'}));const cookie2=again.headers.get('set-cookie').split(';')[0];await service.revoke({id:'a',email:'a@example.invalid',verified:true},'b');assert.equal((await handler(req('content.js',null,cookie2))).status,401);
});
test('account limits commit with rollback-capable store; network, global and absolute expiry remain enforced',async()=>{
 let now=100;const store=new MemoryStore();store.state.members.a={email:'a@example.invalid',active:true,owner:true};const service=pinService({store,pepper:randomBytes(32),clock:()=>now});
 await service.enroll({proof:{id:'a',email:'a@example.invalid',verified:true},pin:'0101'});
 for(let i=0;i<5;i++)assert.equal((await service.login({email:'a@example.invalid',pin:'9999',clientNetwork:'n'+i})).ok,false);
 assert.equal((await service.login({email:'a@example.invalid',pin:'0101',clientNetwork:'rotated'})).ok,false);assert.ok(Object.values(store.state.pin.limits).some(x=>x.lockedUntil>now));
 now+=31*60e3;const result=await service.login({email:'a@example.invalid',pin:'0101',clientNetwork:'n'});assert.equal(result.ok,true);
 for(let i=0;i<16;i++){now+=29*60e3;assert.ok(await service.authenticate(result.token));}now+=17*60e3;assert.equal(await service.authenticate(result.token),null);
 for(let i=0;i<21;i++)await service.login({email:'unknown'+i+'@example.invalid',pin:'1111',clientNetwork:'shared'});
 assert.ok(Object.entries(store.state.pin.limits).some(([k,v])=>k.startsWith('network:')&&v.lockedUntil>now));
 for(let i=0;i<125;i++)await service.login({email:'rotate'+i+'@example.invalid',pin:'1111',clientNetwork:'rotate'+i});assert.ok(store.state.pin.limits.global.lockedUntil>now);
});
