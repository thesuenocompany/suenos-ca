import {createHash} from 'node:crypto';
// Exact approved addresses, encoded to avoid publishing contact addresses in source.
// Authentication and current membership are supplied by trusted server adapters only.
const approved=new Set(["534e39b3bd73c4fc6bb9ff531503ba31b285191c93c2723b54c7e003fc910358", "09f38f9e757d28699cc0918c1ac3f215f6a573fa5e1910fa47286323157c964c", "585881aca91c5cc6e9b47a138e844bbf72869c4d9d7c824d0e3cbd8a84ea4254"]);
export const archivePaths=new Set(['assets/suenos-investor-deck-blue-orange-archive.pdf','assets/suenos-investor-deck-blue-orange-archive.pptx']);
export function archiveAllowed(identity,member){
 return !!(identity?.verified&&identity.id&&member?.active&&typeof identity.email==='string'&&typeof member.email==='string'&&identity.email.toLowerCase()===member.email.toLowerCase()&&approved.has(createHash('sha256').update(member.email.toLowerCase()).digest('hex')));
}
export function withoutArchiveLinks(html){
 // Remove the complete archived-edition footer row before sending HTML to ordinary members.
 return html.replace(/<p\b[^>]*>\s*Prior blue\/orange edition:[\s\S]*?<\/p>/gi,'').replace(/<a\b[^>]*href=["'][^"']*suenos-investor-deck-blue-orange-archive\.(?:pdf|pptx)[^"']*["'][^>]*>[\s\S]*?<\/a>/gi,'');
}
