import * as sdk from '@netlify/identity';
import { createAuthController } from './auth-controller.mjs';
const status=document.querySelector('[role=status]'),login=document.querySelector('#sign-in'),password=document.querySelector('#set-password'),providers=document.querySelector('#providers');
const controller=createAuthController(sdk,{
 authorize:async()=>{const r=await fetch('/investors/api/me',{cache:'no-store'});if(!r.ok)throw Error('Access not approved');},
 navigate:path=>location.assign(path),cleanLocation:()=>history.replaceState(null,'','/investors/login'),
 show:(type,value)=>{
  if(type==='settings'){providers.replaceChildren();login.hidden=!value.email;for(const provider of value.providers){const b=document.createElement('button');b.type='button';b.textContent=`Continue with ${provider}`;b.onclick=()=>run(()=>controller.provider(provider));providers.append(b);}}
  if(type==='password'){login.hidden=true;providers.hidden=true;password.hidden=false;document.querySelector('#password-title').textContent=value==='invite'?'Accept your invitation':'Choose a new password';}
  if(type==='login'){password.hidden=true;login.hidden=false;providers.hidden=false;if(value)login.elements.email.value=value;status.textContent='Use the email address that received your invitation.';}
  if(type==='notice'||type==='error')status.textContent=value;
 }
});
async function run(fn){const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);try{await fn();}catch(error){status.textContent=error.publicMessage||'Unable to complete this action. Check your details or contact the owner for access.';status.focus();}finally{buttons.forEach(b=>b.disabled=false);document.querySelectorAll('input[type=password]').forEach(e=>e.value='');}}
login.addEventListener('submit',e=>{e.preventDefault();run(()=>controller.login(login.elements.email.value,login.elements.password.value));});
password.addEventListener('submit',e=>{e.preventDefault();if(password.elements.password.value!==password.elements.confirm.value){status.textContent='Passwords must match.';return;}run(()=>controller.password(password.elements.password.value));});
document.querySelector('#back-to-sign-in').onclick=()=>controller.signIn();
document.querySelector('#recover').onclick=()=>run(()=>controller.recovery(login.elements.email.value));
const permittedOrigin=location.origin==='https://suenos.ca'||location.hostname==='127.0.0.1';
if(permittedOrigin){
 window.addEventListener('hashchange',()=>{if(/^#(?:invite_token|confirmation_token|recovery_token|email_change_token|access_token)=/.test(location.hash))controller.initialize();});
 controller.initialize();
}else{
 history.replaceState(null,'','/investors/login');
 status.textContent='Investor sign-in is unavailable on preview domains. Use suenos.ca.';
}
