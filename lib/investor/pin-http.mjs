import {securityHeaders} from './handler.mjs';
import {sameOrigin,PortalError} from './policy.mjs';
import {sessionCookie} from './pin-service.mjs';
export function sessionToken(request){const parts=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('__Host-investor_session='));return parts.length===1?parts[0].slice('__Host-investor_session='.length):null;}
async function input(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new PortalError(415,'JSON required.');
 const reader=request.body?.getReader();if(!reader)throw new PortalError(400,'Request required.');let bytes=0,chunks=[];
 for(;;){const{done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2048){await reader.cancel();throw new PortalError(413,'Request too large.');}chunks.push(value);}
 try{const d=JSON.parse(Buffer.concat(chunks).toString());if(!d||Array.isArray(d)||typeof d!=='object')throw Error();return d;}catch{throw new PortalError(400,'Invalid request.');}
}
export function pinHTTP({pins,identityAuth,service,protectedHandler,clientNetwork}){
 return async request=>{
  const path=new URL(request.url).pathname;if(!path.startsWith('/investors/api/pin/'))return protectedHandler(request);
  let response;const json=(data,status=200)=>Response.json(data,{status});
  try{
   if(new URL(request.url).origin!=='https://suenos.ca')throw new PortalError(403,'Host not allowed.');
   if(request.method==='POST')sameOrigin(request,'https://suenos.ca');
   if(path==='/investors/api/pin/setup'&&request.method==='GET'){
    const identity=await identityAuth.authenticate(request);await service.authorize(identity);
    response=json({email:identity.email,enrolled:await pins.enrolled(identity.id)});
   }else if(path==='/investors/api/pin/enroll'&&request.method==='POST'){
    const identity=await identityAuth.authenticate(request);await service.authorize(identity);const data=await input(request);
    if(Object.keys(data).some(k=>k!=='pin'))throw new PortalError(400,'Invalid request.');
    const result=await pins.enroll({proof:identity,pin:data.pin});response=json({ok:result.ok},result.ok?200:409);
   }else if(path==='/investors/api/pin/login'&&request.method==='POST'){
    const data=await input(request);if(Object.keys(data).some(k=>!['email','pin'].includes(k)))throw new PortalError(400,'Invalid request.');
    if(!clientNetwork)throw new PortalError(503,'Sign-in temporarily unavailable.');
    const result=await pins.login({email:data.email,pin:data.pin,clientNetwork});
    response=json(result.ok?{ok:true}:{error:'Unable to sign in. Check your email and PIN, or wait 30 minutes if you have tried several times.'},result.ok?200:401);
    if(result.ok)response.headers.append('Set-Cookie',sessionCookie(result.token));
   }else if(path==='/investors/api/pin/logout'&&request.method==='POST'){
    await pins.logout(sessionToken(request));response=json({ok:true});
    for(const name of ['__Host-investor_session','nf_jwt','nf_refresh'])response.headers.append('Set-Cookie',`${name}=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0`);
   }else response=json({error:'Not found'},404);
  }catch(error){response=json({error:error instanceof PortalError?error.message:'Sign-in temporarily unavailable.'},error instanceof PortalError?error.status:503);}
  for(const[k,v]of Object.entries(securityHeaders))response.headers.set(k,v);return response;
 };
}
