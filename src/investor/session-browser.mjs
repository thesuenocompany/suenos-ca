import { getUser,onAuthChange,logout } from '@netlify/identity';
// Keep the official SDK refresh lifecycle active on the protected presentation.
getUser().then(user=>{if(!user)location.replace('/investors/login');}).catch(()=>location.replace('/investors/login'));
onAuthChange(event=>{if(event==='logout')location.replace('/investors/login');});
document.addEventListener('click',event=>{if(event.target.closest('[data-investor-signout]')){event.preventDefault();logout().then(()=>location.replace('/investors/login')).catch(()=>{event.target.textContent='Sign-out failed; retry';});}});
