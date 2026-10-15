// Official SDK is injected so callback sequencing can be tested without accounts/network.
export function createAuthController(sdk, { authorize, navigate, show, cleanLocation }) {
  let pendingInvite = null, mode = 'login';
  const enter = async () => { await authorize(); navigate('/investors/'); };
  return {
    async initialize() {
      // Process all supported token types before revealing a sign-in/account action.
      try {
        const callback = await sdk.handleAuthCallback();
        cleanLocation();
        const settings = await sdk.getSettings();
        show('settings', { email: !!settings.providers.email, providers: Object.entries(settings.providers).filter(([id,on])=>on && id!=='email').map(([id])=>id) });
        if (callback?.type === 'invite') { if(!callback.token)throw Error('Invalid invitation'); pendingInvite=callback.token;mode='invite';show('password',mode);return; }
        if (callback?.type === 'recovery') { mode='recovery';show('password',mode);return; }
        if (callback) { await enter(); return; }
        show('login');
      } catch { cleanLocation();show('error','Sign-in is unavailable or this link has expired. Request a fresh invitation or recovery link.'); }
    },
    async login(email,password) { await sdk.login(email,password); await enter(); },
    async password(password) {
      if(mode==='invite' && pendingInvite) { await sdk.acceptInvite(pendingInvite,password);pendingInvite=null; }
      else if(mode==='recovery') { await sdk.hydrateSession();await sdk.updateUser({password}); }
      else throw Error('No active password action');
      mode='login';await enter();
    },
    async recovery(email) { try { await sdk.requestPasswordRecovery(email); } catch { /* Keep account existence private. */ } finally { show('notice','If this address has an account, recovery instructions will be sent.'); } },
    async provider(provider) { const settings=await sdk.getSettings();if(!settings.providers[provider] || provider==='email')throw Error('Provider unavailable');sdk.oauthLogin(provider); },
    async logout() { pendingInvite=null;await sdk.logout();navigate('/investors/login'); }
  };
}
