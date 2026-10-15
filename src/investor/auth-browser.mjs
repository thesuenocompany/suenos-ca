import * as sdk from '@netlify/identity';
import { createAuthController } from './auth-controller.mjs';
const status=document.querySelector('[role=status]'),login=document.querySelector('#sign-in'),password=document.querySelector('#set-password'),providers=document.querySelector('#providers');
const pinLogin=document.querySelector('#pin-sign-in'),pinEnroll=document.querySelector('#pin-enroll');
let enrollment;
const api=async(path,data)=>{const r=await fetch('/investors/api/pin/'+path,{method:data?'POST':'GET',headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined,cache:'no-store'});const value=await r.json();if(!r.ok){const error=Error('PIN request failed');error.publicMessage=path==='login'?'Unable to sign in. Check your email and PIN, or wait 30 minutes if you have tried several times.':path==='enroll'?'Could not save the PIN. It may already be set; try PIN sign-in.':'Verify your invited account to set up your PIN.';throw error;}return value;};
function showEnrollment(){login.hidden=true;password.hidden=true;providers.hidden=true;pinLogin.hidden=true;pinEnroll.hidden=!!enrollment.enrolled;if(enrollment.enrolled){pinLogin.hidden=false;pinLogin.elements.email.value=enrollment.email;status.textContent='Your PIN is already set. Sign in with it below.';}else{document.querySelector('#enrollment-account').textContent=enrollment.email;status.textContent='Account verified. Choose a PIN that you will use for future visits.';}}
const controller=createAuthController(sdk,{
 authorize:async()=>{enrollment=await api('setup');},
 navigate:path=>path==='/investors/'?showEnrollment():location.assign(path),cleanLocation:()=>history.replaceState(null,'','/investors/setup'),
 show:(type,value)=>{
  if(type==='settings'){providers.replaceChildren();login.hidden=!value.email;for(const provider of value.providers){const b=document.createElement('button');b.type='button';b.textContent=`Continue with ${provider}`;b.onclick=()=>run(()=>controller.provider(provider));providers.append(b);}}
  if(type==='password'){login.hidden=true;providers.hidden=true;password.hidden=false;document.querySelector('#password-title').textContent=value==='invite'?'Accept your invitation':'Choose a new password';}
  if(type==='login'){password.hidden=true;login.hidden=false;providers.hidden=false;if(value)login.elements.email.value=value;status.textContent='One-time PIN setup: verify the email and password from your accepted invitation.';}
  if(type==='notice'||type==='error')status.textContent=value;
 }
});
async function run(fn){const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await fn();}catch(error){status.textContent=error.publicMessage||'Unable to complete this action. Check your details or contact the owner for access.';status.focus();}finally{buttons.forEach(b=>b.disabled=false);document.querySelectorAll('input[type=password]').forEach(e=>e.value='');}}
login.addEventListener('submit',e=>{e.preventDefault();run(()=>controller.login(login.elements.email.value,login.elements.password.value));});
password.addEventListener('submit',e=>{e.preventDefault();if(password.elements.password.value!==password.elements.confirm.value){status.textContent='Passwords must match.';return;}run(()=>controller.password(password.elements.password.value));});
document.querySelector('#back-to-sign-in').onclick=()=>controller.signIn();
document.querySelector('#recover').onclick=()=>run(()=>controller.recovery(login.elements.email.value));
const permittedOrigin=location.origin==='https://suenos.ca'||location.hostname==='127.0.0.1';
pinLogin.addEventListener('submit',e=>{e.preventDefault();run(async()=>{await api('login',{email:pinLogin.elements.email.value,pin:pinLogin.elements.pin.value});location.assign('/investors/');});});
pinEnroll.addEventListener('submit',e=>{e.preventDefault();if(pinEnroll.elements.pin.value!==pinEnroll.elements.confirm.value){status.textContent='PINs must match.';return;}run(async()=>{const pin=pinEnroll.elements.pin.value;await api('enroll',{pin});pinEnroll.hidden=true;pinLogin.hidden=false;pinLogin.elements.email.value=enrollment.email;status.textContent='PIN saved. Signing you in…';try{await api('login',{email:enrollment.email,pin});location.assign('/investors/');}catch{const error=Error('PIN session failed');error.publicMessage='Your PIN was saved. Sign in below with it, or wait 30 minutes if you have tried several times.';throw error;}});});
if(permittedOrigin){
 const callback=()=>/^#(?:invite_token|confirmation_token|recovery_token|email_change_token|access_token)=/.test(location.hash);
 const setup=async()=>{pinLogin.hidden=true;document.querySelector('#auth-intro').textContent='First verify your invited account, then choose your personal four-digit PIN.';if(callback())return controller.initialize();try{enrollment=await api('setup');showEnrollment();}catch{controller.initialize();}};
 window.addEventListener('hashchange',()=>{if(callback())setup();});
 if(callback()||location.pathname.startsWith('/investors/setup'))setup();
 else{pinLogin.hidden=false;status.textContent='Use the email address that received your invitation and your PIN.';}
}else{
 history.replaceState(null,'','/investors/login');status.textContent='Investor sign-in is unavailable on preview domains. Use suenos.ca.';
}
