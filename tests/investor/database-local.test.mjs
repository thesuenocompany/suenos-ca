import test from 'node:test';import assert from 'node:assert/strict';import { NetlifyDB } from '@netlify/database-dev';import pg from 'pg';import { PostgresStore } from '../../lib/investor/postgres-store.mjs';import { createService } from '../../lib/investor/service.mjs';
// Local in-memory PostgreSQL-compatible engine only; never reads a hosted connection.
test('real local migration, transaction rollback and consent lifecycle',{timeout:30000},async()=>{
 const db=new NetlifyDB({logger:()=>{}});let pool;
 try{
  const localConnection=await db.start();pool=new pg.Pool({connectionString:localConnection,max:1});
  const applied=await db.applyMigrations('netlify/database/migrations');assert.equal(applied.length,2);
  const store=new PostgresStore(pool);
  await store.transaction(s=>{s.members.owner={name:'Synthetic owner',email:'synthetic@example.invalid',active:true,owner:true};});
  await assert.rejects(store.transaction(s=>{s.members.owner.active=false;throw Error('rollback');}));
  const service=createService(store),identity={id:'owner',email:'synthetic@example.invalid',verified:true};
  assert.equal((await service.me(identity)).owner,true);
  await service.consent(identity,true,'investor-engagement-v1');assert.ok((await service.session(identity)).id);
  await service.consent(identity,false,'investor-engagement-v1');await assert.rejects(service.session(identity));
  const repeated=await db.applyMigrations('netlify/database/migrations');assert.equal(repeated.length,0);
 }finally{if(pool)await pool.end();await db.stop();}
});
