import { createPortalHandler,securityHeaders } from './handler.mjs';
import { netlifyIdentityAdapter } from './identity-adapter.mjs';
import { PostgresStore } from './postgres-store.mjs';
import { createService } from './service.mjs';
import {pinService} from './pin-service.mjs';
import {pinHTTP,sessionToken} from './pin-http.mjs';
import {invitationService} from './invitations.mjs';
import {invitationProvider} from './invitation-provider.mjs';
import { blobAssets } from './blob-assets.mjs';
export const SITE_ID='0c7a4a0c-375e-4b11-9d6f-571c7ac18953';
export function productionSite(env,request){return env.CONTEXT==='production'&&env.SITE_ID===SITE_ID&&!!request&&new URL(request.url).origin==='https://suenos.ca';}
export function enabledProduction(env,request){return env.INVESTOR_PORTAL_ENABLED==='true'&&productionSite(env,request);}
export function createRuntime({env,identity,pool,assetsStore,ui,fetchUser,clientNetwork}) {
 const store=new PostgresStore(pool),service=createService(store,{bootstrapOwnerEmail:env.INVESTOR_OWNER_EMAIL||''}),identityAuth=netlifyIdentityAdapter(identity,{fetchUser});
 const invitations=invitationService({store,provider:invitationProvider(identity),approvedInviters:(env.INVESTOR_APPROVED_INVITERS||'').split(',').map(e=>e.trim().toLowerCase()).filter(Boolean)});
 const pins=env.INVESTOR_PIN_ENABLED==='true'?pinService({store,pepper:Buffer.from(env.INVESTOR_PIN_PEPPER||'','hex')}):null;
 const protectedHandler=createPortalHandler({auth:pins?{authenticate:request=>pins.authenticate(sessionToken(request))}:identityAuth,service,invitations,assets:blobAssets(assetsStore),ui,origin:'https://suenos.ca',sessionScript:true});
 const handler=pins?pinHTTP({pins,identityAuth,service,invitations,protectedHandler,clientNetwork}):protectedHandler;
 return async request=>enabledProduction(env,request)?handler(request):new Response('Investor portal is not activated.',{status:503,headers:securityHeaders});
}
