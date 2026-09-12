import { getStore,getDeployStore } from '@netlify/blobs';
export function analyticsStore(){return Netlify.env.get('CONTEXT')==='production'?getStore('analytics-diagnostics'):getDeployStore('analytics-diagnostics');}
export async function readEvents(store,start,end,maxBlobs=6000){
  const dates=[];for(let d=Date.parse(start+'T00:00:00Z');d<=Date.parse(end+'T00:00:00Z');d+=86400000)dates.push(new Date(d).toISOString().slice(0,10));
  const keys=[];for(let i=0;i<dates.length;i+=10){const lists=await Promise.all(dates.slice(i,i+10).map(d=>store.list({prefix:`events/${d}/`})));for(const list of lists)keys.push(...list.blobs.map(b=>b.key));}
  // Fail closed if any read fails. Partial reports must never look like complete totals.
  const selected=keys.sort().slice(-maxBlobs),records=[];
  for(let i=0;i<selected.length;i+=60){const values=await Promise.all(selected.slice(i,i+60).map(key=>store.get(key,{type:'json'})));for(const value of values){if(value?.events)records.push(...value.events);else if(value?.at)records.push(value);}}
  return {records,limited:keys.length>maxBlobs,blobCount:keys.length,readCount:selected.length};
}
