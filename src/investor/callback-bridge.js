// Default Identity emails land at the site root. Move only authentication fragments.
(()=>{const fragment=location.hash;if(!/^#(?:invite_token|confirmation_token|recovery_token|email_change_token|access_token)=/.test(fragment))return;history.replaceState(null,'',location.pathname+location.search);location.replace('/investors/login'+fragment);})();
