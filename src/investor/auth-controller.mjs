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
      if(mode==='invite' && pendingInvite) {
        let user;
        try { user=await sdk.acceptInvite(pendingInvite,password); }
        catch { const error=Error('Invitation acceptance failed');error.publicMessage='The invitation could not be accepted. If you already saved a password, return to sign in and use it. Otherwise check your connection and retry, or ask the owner to check the invitation.';throw error; }
        pendingInvite=null;mode='login';
        // Identity 2.0.0 acceptInvite persists its browser session but does not set
        // the cookies used by server getUser. Official login establishes them.
        try { if(!user?.email)throw Error('Missing verified account email');await sdk.login(user.email,password); }
        catch { show('login',user?.email);const error=Error('Session handoff failed');error.publicMessage='Your invitation was accepted and your password was saved. Sign in below with that password to continue.';throw error; }
        try { await enter(); }
        catch { show('login',user.email);const error=Error('Portal authorization failed');error.publicMessage='Your password was saved, but portal access could not be confirmed. Sign in below to retry. If it still fails, contact the owner.';throw error; }
        return;
      }
      else if(mode==='recovery') { await sdk.hydrateSession();await sdk.updateUser({password}); }
      else throw Error('No active password action');
      mode='login';await enter();
    },
    signIn() { pendingInvite=null;mode='login';show('login'); },
    async recovery(email) { try { await sdk.requestPasswordRecovery(email); } catch { /* Keep account existence private. */ } finally { show('notice','If this address has an account, recovery instructions will be sent.'); } },
    async provider(provider) { const settings=await sdk.getSettings();if(!settings.providers[provider] || provider==='email')throw Error('Provider unavailable');sdk.oauthLogin(provider); },
    async logout() { pendingInvite=null;await sdk.logout();navigate('/investors/login'); }
  };
}
