// Provider-backed email verification for first PIN enrollment. A recovery token
// creates a session through the SDK. New invites use a disposable random provider
// password solely to accept the email token; users choose only their portal PIN.
export function createPinSetupController(sdk,{authorize,showEnrollment,showEmail,showStatus,cleanLocation}){
 async function ready(){const enrollment=await authorize();showEnrollment(enrollment);}
 return {
  async initialize(){
   try{
    const callback=await sdk.handleAuthCallback();cleanLocation();
    if(callback?.type==='invite'){
     const password=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
     const user=await sdk.acceptInvite(callback.token,password);
     // acceptInvite alone does not write the server cookies in SDK 2.0.0.
     await sdk.login(user.email,password);await ready();return;
    }
    if(callback){await ready();return;}
    if(!callback){try{await ready();return;}catch{/* email proof required */}}
    const settings=await sdk.getSettings();if(!settings.providers.email)throw Error('Email verification unavailable');
    showEmail();showStatus('Enter your invited email address. We will email a link so you can choose your PIN. No existing password is needed.');
   }catch{cleanLocation();showEmail();showStatus('This link could not be verified or has expired. Request a new setup link below.');}
  },
  async requestLink(email){
   try{await sdk.requestPasswordRecovery(email);showStatus('If this email has an invited account, check your inbox for Netlify’s account-recovery email. Open its link to choose your PIN. You do not need to enter or change your old password.');}
   catch{showStatus('We could not confirm the email request. Check your connection and try again shortly. If a recovery email arrives, its link will take you to PIN setup.');}
  }
 };
}
