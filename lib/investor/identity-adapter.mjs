// Validate the request's session with the provider; never trust decoded JWT claims
// or runtime identity metadata as proof of the caller's verified email.
export function netlifyIdentityAdapter(sdk, { fetchUser = globalThis.fetch } = {}) {
  return {
    async authenticate(request) {
      const cookies=(request?.headers.get('cookie')||'').split(';');
      const values=cookies.map(c=>c.trim()).filter(c=>c.startsWith('nf_jwt='));
      if(values.length!==1)return null;
      let token;try{token=decodeURIComponent(values[0].slice(7));}catch{return null;}
      if(!token||token.length>8192||/[\s\r\n]/.test(token))return null;
      // Use a fixed public Identity endpoint and this request's cookie. The
      // runtime Identity context token is not a substitute for the user cookie.
      const response=await fetchUser('https://suenos.ca/.netlify/identity/user',{
        headers:{Authorization:`Bearer ${token}`},redirect:'error',cache:'no-store',signal:AbortSignal.timeout(8000)
      });
      if(!response.ok)return null;
      const user=await response.json(),confirmed=Date.parse(user.confirmed_at||'');
      if(typeof user.id!=='string'||typeof user.email!=='string')return null;
      return {id:user.id,email:user.email,verified:Number.isFinite(confirmed)&&confirmed<=Date.now()};
    },
    async login(request, email, password) { sdk.verifyRequestOrigin(request);return sdk.login(email,password); },
    async logout(request) { sdk.verifyRequestOrigin(request);await sdk.logout(); }
  };
}
