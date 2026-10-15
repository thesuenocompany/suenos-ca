import {randomBytes,createHmac,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback),WINDOW=15*60e3,LOCK=30*60e3;
// Store serializes access and commits returned denials so attempt limits persist.
// proof and clientNetwork must come from trusted server adapters, never JSON input.
export function pinService({store,pepper,clock=Date.now}){
 if(!Buffer.isBuffer(pepper)||pepper.length<32)throw Error('A separately provisioned 256-bit server pepper is required');
 const digest=v=>createHmac('sha256',pepper).update(v).digest('hex');
 const derive=async(pin,salt)=>Buffer.from(await scrypt(digest('pin:'+pin),salt,32,{N:16384,r:8,p:1,maxmem:64*1024*1024}));
 const emailKey=email=>digest('email:'+String(email).trim().toLowerCase());
 const identityMember=(s,id)=>s.members[id]?.active?s.members[id]:null;
 const cleanup=(s,now)=>{s.pin??={credentials:{},sessions:{},limits:{}};for(const[k,v]of Object.entries(s.pin.limits))if(v.until<=now)delete s.pin.limits[k];for(const[k,v]of Object.entries(s.pin.sessions))if(v.expires<=now||v.idle<=now)delete s.pin.sessions[k];};
 function take(s,key,max,now){let v=s.pin.limits[key];if(v?.lockedUntil>now)return false;if(!v||v.until<=now)v=s.pin.limits[key]={count:0,until:now+WINDOW};if(v.count>=max){v.lockedUntil=now+LOCK;v.until=v.lockedUntil;return false;}v.count++;return true;}
 return {
  async enrolled(id){return store.transaction(s=>{cleanup(s,clock());return !!s.pin.credentials[id];});},
  async enroll({proof,pin}){
   if(!proof?.verified||!proof.id||(typeof pin!=='string'||!/^\d{4}$/.test(pin)))return {ok:false};
   const salt=randomBytes(16).toString('hex'),hash=(await derive(pin,salt)).toString('hex');
   return store.transaction(s=>{cleanup(s,clock());const m=identityMember(s,proof.id);if(!m||m.email.toLowerCase()!==proof.email?.toLowerCase()||s.pin.credentials[proof.id])return {ok:false};s.pin.credentials[proof.id]={salt,hash,revision:1,emailKey:emailKey(m.email)};return {ok:true};});
  },
  async login({email,pin,clientNetwork}){
   if(typeof email!=='string'||email.length>254||(typeof pin!=='string'||!/^\d{4}$/.test(pin))||!clientNetwork)return {ok:false};
   const key=emailKey(email),now=clock();
   // Reserve before expensive hash work; rejected guesses are committed, including
   // unknown accounts, and cannot be evaded by rotating network addresses.
   const candidate=await store.transaction(s=>{cleanup(s,now);if(Object.keys(s.pin.limits).length>2048)return null;
    if(!take(s,'global',120,now)||!take(s,'network:'+digest(clientNetwork),20,now)||!take(s,'account:'+key,5,now))return null;
    const pair=Object.entries(s.pin.credentials).find(([id,c])=>c.emailKey===key&&identityMember(s,id));return pair?{id:pair[0],...pair[1]}:{id:null,salt:'synthetic-constant-salt',hash:'0'.repeat(64)};});
   if(!candidate)return {ok:false};const hash=await derive(pin,candidate.salt);
   if(!timingSafeEqual(hash,Buffer.from(candidate.hash,'hex'))||!candidate.id)return {ok:false};
   const token=randomBytes(32).toString('base64url');
   return store.transaction(s=>{cleanup(s,clock());const c=s.pin.credentials[candidate.id];if(!identityMember(s,candidate.id)||c?.revision!==candidate.revision)return {ok:false};
    const own=Object.entries(s.pin.sessions).filter(([,v])=>v.id===candidate.id);if(own.length>=5)delete s.pin.sessions[own.sort((a,b)=>a[1].created-b[1].created)[0][0]];
    s.pin.sessions[digest('session:'+token)]={id:candidate.id,revision:c.revision,created:clock(),expires:clock()+8*3600e3,idle:clock()+30*60e3};return {ok:true,token};});
  },
  async authenticate(token){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;return store.transaction(s=>{cleanup(s,clock());const session=s.pin.sessions[digest('session:'+token)];if(!session)return null;const member=identityMember(s,session.id);if(!member||s.pin.credentials[session.id]?.revision!==session.revision)return null;session.idle=Math.min(session.expires,clock()+30*60e3);return {id:session.id,email:member.email,verified:true,owner:!!member.owner};});},
  async logout(token){return store.transaction(s=>{cleanup(s,clock());delete s.pin.sessions[digest('session:'+String(token))];return {ok:true};});}
 };
}
export const sessionCookie=token=>`__Host-investor_session=${token}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=28800`;
