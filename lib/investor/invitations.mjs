import {randomUUID,createHash} from 'node:crypto';
import {memberFor,ownerFor,deny} from './policy.mjs';
export function inviterFor(s,identity){const m=memberFor(s,identity);if(!m.owner&&!m.inviter)deny(403,'Invitation access required.');return m;}
const emailOf=value=>typeof value==='string'?value.trim().toLowerCase():'';
// Only the two explicitly approved recipients; no new email addresses in public source.
const noExpiryRecipients=new Set(["534e39b3bd73c4fc6bb9ff531503ba31b285191c93c2723b54c7e003fc910358", "09f38f9e757d28699cc0918c1ac3f215f6a573fa5e1910fa47286323157c964c"]);
const expiryEligible=r=>noExpiryRecipients.has(createHash("sha256").update(emailOf(r.email)).digest("hex"));
const publicRecord=r=>({id:r.id,name:r.name,email:r.email,inviterName:r.inviterName,inviterEmail:r.inviterEmail,created:r.created,expires:r.expires,status:r.status});
export function invitationService({store,provider,clock=Date.now,approvedInviters=[]}){
 const records=s=>(s.invitations??={});
 const expire=s=>{for(const r of Object.values(records(s)))if(r.status==='sent'&&r.expires!==null&&r.expires<=clock())r.status='expired';};
 return {
  authorize:identity=>store.transaction(s=>inviterFor(s,identity)),
  list:identity=>store.transaction(s=>{const m=inviterFor(s,identity);expire(s);return {owner:!!m.owner,invitations:Object.values(records(s)).filter(r=>m.owner||r.inviterId===identity.id).map(r=>({...publicRecord(r),canRemoveExpiry:!!m.owner&&expiryEligible(r)&&r.expires!==null&&['sent','expired','accepted'].includes(r.status)&&!!r.identityId}))};}),
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
  removeExpiry:(identity,data)=>store.transaction(s=>{
   ownerFor(s,identity);
   if(!data||Object.keys(data).length!==1||typeof data.id!=='string')deny(400,'Invitation ID required.');
   const r=records(s)[data.id];if(!r)deny(404,'Invitation not found.');
   if(!expiryEligible(r))deny(403,'No-expiry approval does not cover this recipient.');
   if(!r.identityId||!['sent','expired','accepted'].includes(r.status))deny(409,'Only a successfully sent or accepted invitation can be updated.');
   if(Object.values(records(s)).filter(other=>emailOf(other.email)===emailOf(r.email)).length!==1)deny(409,'Duplicate recipient records require review.');
   const sponsor=s.members[r.inviterId];if(!sponsor?.active||(!sponsor.owner&&!sponsor.inviter))deny(409,'The original inviter no longer has invitation permission.');
   const member=s.members[r.identityId];
   if(member&&(!member.active||emailOf(member.email)!==emailOf(r.email)))deny(409,'Revoked or mismatched membership requires review.');
   if(r.expires!==null){r.expiryChange={previousExpires:r.expires,previousStatus:r.status,changedAt:clock(),changedBy:identity.id};r.expires=null;}
   if(r.status==='expired')r.status='sent';
   // This changes the app deadline only. No account, role, PIN or email operation.
   return publicRecord(r);
  }),
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
