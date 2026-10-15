// Provider-backed email verification for first PIN enrollment. A recovery token
// creates a session through the SDK; this flow never updates an account password.
export function createPinSetupController(sdk,{authorize,showEnrollment,showEmail,showStatus,cleanLocation}){
 async function ready(){const enrollment=await authorize();showEnrollment(enrollment);}
 return {
  async initialize(){
   try{
    const callback=await sdk.handleAuthCallback();cleanLocation();
    if(callback&&callback.type!=='invite'){await ready();return;}
    // An invite token alone is not a verified session. Send the user through
    // mailbox verification instead of asking them to create an Identity password.
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
