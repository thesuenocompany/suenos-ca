import { createPortalHandler,securityHeaders } from './handler.mjs';
import { netlifyIdentityAdapter } from './identity-adapter.mjs';
import { PostgresStore } from './postgres-store.mjs';
import { createService } from './service.mjs';
import { blobAssets } from './blob-assets.mjs';
export const SITE_ID='0c7a4a0c-375e-4b11-9d6f-571c7ac18953';
export function productionSite(env,request){return env.CONTEXT==='production'&&env.SITE_ID===SITE_ID&&!!request&&new URL(request.url).origin==='https://suenos.ca';}
export function enabledProduction(env,request){return env.INVESTOR_PORTAL_ENABLED==='true'&&productionSite(env,request);}
export function createRuntime({env,identity,pool,assetsStore,ui,fetchUser}) {
 const handler=createPortalHandler({auth:netlifyIdentityAdapter(identity,{fetchUser}),service:createService(new PostgresStore(pool),{bootstrapOwnerEmail:env.INVESTOR_OWNER_EMAIL||''}),assets:blobAssets(assetsStore),ui,origin:'https://suenos.ca',sessionScript:true});
 return async request=>enabledProduction(env,request)?handler(request):new Response('Investor portal is not activated.',{status:503,headers:securityHeaders});
}
