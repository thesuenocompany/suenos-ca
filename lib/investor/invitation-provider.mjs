// The installed SDK exposes admin reads but not GoTrue's documented POST /invite.
// Operator credentials come only from the platform's server-side SDK context.
export function invitationProvider(identity,{fetchImpl=fetch}={}){
 const emailOf=s=>String(s||'').toLowerCase();
 async function users(){const all=[];for(let page=1;page<=100;page++){const batch=await identity.admin.listUsers({page,perPage:100});all.push(...batch);if(batch.length<100)return all;}throw Error('Identity listing limit');}
 return {
  findApproved:async emails=>(await users()).filter(u=>emails.some(e=>emailOf(e)===emailOf(u.email))),
  async invite({email,name}){
   const existing=(await users()).filter(u=>emailOf(u.email)===email);
   if(existing.length>1)throw Error('Ambiguous account');
   const config=identity.getIdentityConfig();
   if(!config?.token||!config.url)throw Error('Identity admin unavailable');
   const url=new URL(config.url);if(url.protocol!=='https:'||!['suenos.ca','astounding-clafoutis-a7673f.netlify.app'].includes(url.hostname)||url.pathname.replace(/\/$/,'')!=='/.netlify/identity')throw Error('Unexpected Identity endpoint');
   const result=await fetchImpl(`${url.href.replace(/\/$/,'')}/${existing.length?'recover':'invite'}`,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${config.token}`},body:JSON.stringify(existing.length?{email}:{email,data:{full_name:name}})});
   if(!result.ok)throw Error('Identity delivery not confirmed');
   const user=existing[0]||await result.json();return {id:user.id,email:user.email};
  }
 };
}
