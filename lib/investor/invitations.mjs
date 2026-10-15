import {randomUUID} from 'node:crypto';
import {memberFor,ownerFor,deny} from './policy.mjs';
export function inviterFor(s,identity){const m=memberFor(s,identity);if(!m.owner&&!m.inviter)deny(403,'Invitation access required.');return m;}
const emailOf=value=>typeof value==='string'?value.trim().toLowerCase():'';
const publicRecord=r=>({id:r.id,name:r.name,email:r.email,inviterName:r.inviterName,inviterEmail:r.inviterEmail,created:r.created,expires:r.expires,status:r.status});
export function invitationService({store,provider,clock=Date.now,approvedInviters=[]}){
 const records=s=>(s.invitations??={});
 const expire=s=>{for(const r of Object.values(records(s)))if(r.status==='sent'&&r.expires<=clock())r.status='expired';};
 return {
  authorize:identity=>store.transaction(s=>inviterFor(s,identity)),
  list:identity=>store.transaction(s=>{const m=inviterFor(s,identity);expire(s);return {owner:!!m.owner,invitations:Object.values(records(s)).filter(r=>m.owner||r.inviterId===identity.id).map(publicRecord)};}),
  async send(identity,data){
   if(!data||Object.keys(data).some(k=>!['name','email','requestId'].includes(k)))deny(400,'Invalid invitation.');
   const name=typeof data.name==='string'?data.name.trim():'',email=emailOf(data.email);
   if(!name||name.length>100||/[\x00-\x1f]/.test(name)||email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||! /^[0-9a-f-]{36}$/i.test(data.requestId||''))deny(400,'Enter a name and valid email.');
   const reservation=await store.transaction(s=>{
    const m=inviterFor(s,identity);expire(s);const all=Object.values(records(s));
    const prior=all.find(r=>r.requestId===data.requestId&&r.inviterId===identity.id);
    if(prior){if(prior.name!==name||prior.email!==email)deny(409,'This request was already used.');return {record:publicRecord(prior),send:false};}
    if(Object.values(s.members).some(m=>emailOf(m.email)===email)||all.some(r=>r.email===email))deny(409,'This email already has a membership or invitation. Ask the owner to review its status.');
    if(all.filter(r=>r.created>clock()-86400000&&r.inviterId===identity.id).length>=20||all.filter(r=>r.created>clock()-86400000).length>=100)deny(429,'Daily invitation limit reached.');
    const r={id:randomUUID(),requestId:data.requestId,name,email,inviterId:identity.id,inviterName:m.name,inviterEmail:m.email,created:clock(),expires:clock()+7*86400000,status:'sending'};records(s)[r.id]=r;
    return {record:publicRecord(r),send:true};
   });
   if(!reservation.send)return reservation.record;
   let user;
   try{user=await provider.invite({email,name});if(!user?.id||emailOf(user.email)!==email)throw Error('Provider mismatch');}
   catch{return store.transaction(s=>{const r=records(s)[reservation.record.id];if(r.status==='sending')r.status='delivery uncertain';return publicRecord(r);});}
   return store.transaction(s=>{
    const r=records(s)[reservation.record.id];
    // Revocation may race the provider request. Never undo it or grant membership here.
    if(r.status==='sending'){try{inviterFor(s,identity);r.identityId=user.id;r.status='sent';}catch{r.status='revoked';}}
    return publicRecord(r);
   });
  },
  claim:identity=>store.transaction(s=>{
   if(!identity?.verified||!identity.id||!identity.email)deny(401,'Verified email required.');
   if(Object.hasOwn(s.members,identity.id))return memberFor(s,identity);
   expire(s);const r=Object.values(records(s)).find(r=>r.identityId===identity.id&&r.email===emailOf(identity.email)&&r.status==='sent');
   if(!r)deny(403,'No active invitation. Ask the owner to review your access.');
   const sponsor=s.members[r.inviterId];if(!sponsor?.active||(!sponsor.owner&&!sponsor.inviter))deny(403,'This invitation is no longer active.');
   if(Object.values(s.members).some(m=>emailOf(m.email)===r.email))deny(409,'Membership needs owner review.');
   s.members[identity.id]={name:r.name,email:r.email,active:true,owner:false,inviter:false,invitationId:r.id};r.status='accepted';r.accepted=clock();
   return structuredClone(s.members[identity.id]);
  }),
  revoke:(identity,id)=>store.transaction(s=>{ownerFor(s,identity);const r=records(s)[id];if(!r)deny(404,'Invitation not found.');r.status='revoked';r.revoked=clock();r.revokedBy=identity.id;if(r.identityId&&s.members[r.identityId]&&!s.members[r.identityId].owner)s.members[r.identityId].active=false;return {revoked:true};}),
  async verifyTeam(identity){
   await store.transaction(s=>ownerFor(s,identity));
   if(!approvedInviters.length)deny(503,'Approved inviter configuration is not activated. No roles changed.');
   const matches=await provider.findApproved(approvedInviters);
   return store.transaction(s=>{ownerFor(s,identity);s.inviterApprovals??={};return {accounts:approvedInviters.map(email=>{
    const users=matches.filter(u=>emailOf(u.email)===emailOf(email));const u=users.length===1?users[0]:null;
    if(!u?.id||!u.confirmedAt)return {email,status:'Existing verified Identity account required; no invitation sent.'};
    const previous=s.members[u.id];if(previous&&(!previous.active||emailOf(previous.email)!==emailOf(email)))return {email,status:'Existing membership requires owner review.'};
    if(!previous&&Object.values(s.members).some(m=>emailOf(m.email)===emailOf(email)))return {email,status:'Account mismatch; no grant.'};
    // Provision only the preapproved exact email + provider-confirmed ID, never client roles.
    s.members[u.id]??={name:u.name||email.split('@')[0],email:emailOf(email),active:true,owner:false};
    s.members[u.id].inviter=true;s.inviterApprovals[u.id]={email:emailOf(email),verifiedAt:clock(),approvedBy:identity.id};
    return {email,status:'Inviter active; owner reports remain restricted.'};
   })};});
  }
 };
}
