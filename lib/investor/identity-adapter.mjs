// Inject the official @netlify/identity 2.0.0 module in an approved v2 runtime.
// SDK getUser verifies the session; never decode unverified browser JWTs here.
export function netlifyIdentityAdapter(sdk) {
  return {
    async authenticate() {
      const user = await sdk.getUser();
      if (!user) return null;
      const confirmed = Date.parse(user.confirmedAt || '');
      return { id: user.id, email: user.email, verified: Number.isFinite(confirmed) && confirmed <= Date.now() };
    },
    async login(request, email, password) {
      sdk.verifyRequestOrigin(request);
      return sdk.login(email, password);
    },
    async logout(request) { sdk.verifyRequestOrigin(request); await sdk.logout(); }
  };
}
