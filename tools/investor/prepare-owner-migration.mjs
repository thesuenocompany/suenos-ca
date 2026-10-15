// Generate reviewable DML from an explicitly approved, provider-verified identity.
// Does not look up users, send invitations, connect to a DB or apply migrations.
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: node tools/investor/prepare-owner-migration.mjs /private/approved-identity.json /private/20261015000200_bootstrap_investor_owner.sql');
if(resolve(output).startsWith(resolve('.')+'/'))throw Error('Owner data migration must be generated outside the public checkout');
const user=JSON.parse(await readFile(input,'utf8'));
if(user.approvedForOwner!==true||!/^[-a-zA-Z0-9]{8,128}$/.test(user.id||'')||!/^\S+@\S+\.\S+$/.test(user.email||'')||!Number.isFinite(Date.parse(user.confirmedAt))||Date.parse(user.confirmedAt)>Date.now())throw Error('Explicit owner approval and verified provider identity required');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const member=JSON.stringify({[user.id]:{name:user.name||'Owner',email:user.email.toLowerCase(),active:true,owner:true}});
let delimiter='$bootstrap$';let suffix=0;while(member.includes(delimiter))delimiter=`$bootstrap_${++suffix}$`;
const sql=`-- Private owner bootstrap. Review and apply ONLY through the approved migration flow.\n-- Stop rather than replace existing memberships or silently add a second owner.\nDO ${delimiter}\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM investor_portal.state WHERE id=1 AND payload->'members'='{}'::jsonb) THEN\n    RAISE EXCEPTION 'Owner bootstrap requires an empty membership map';\n  END IF;\n  UPDATE investor_portal.state SET payload=jsonb_set(payload,'{members}',${quote(member)}::jsonb) WHERE id=1;\nEND\n${delimiter};\n`;
await mkdir(dirname(resolve(output)),{recursive:true});await writeFile(output,sql,{mode:0o600,flag:'wx'});
console.log('Private owner migration prepared for review; no database action taken.');
