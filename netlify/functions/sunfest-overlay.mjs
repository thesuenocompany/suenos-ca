import { getStore } from "@netlify/blobs";
import { getBearerToken, verifyAdminToken } from "./_hotline-auth.mjs";
import { jsonResponse, originAllowed } from "./_hotline-http.mjs";
import { sunfestDefaults } from "./_sunfest-defaults.mjs";

const STORE_NAME="suenos-content";
const KEY="sunfest-overlay";
const text=(value,max=500)=>String(value??"").trim().slice(0,max);
const validate=input=>{
  const mode=["off","manual","scheduled"].includes(input?.mode)?input.mode:"off";
  const output={
    enabled:mode!=="off", mode,
    startAt:text(input?.startAt,40), endAt:text(input?.endAt,40),
    logo:text(input?.logo,300)||sunfestDefaults.logo,
    linkUrl:text(input?.linkUrl,500)||sunfestDefaults.linkUrl,
    en:{}, es:{}
  };
  for(const lang of ["en","es"]){
    const source=input?.[lang]||{}; const fallback=sunfestDefaults[lang];
    output[lang]={
      announcement:text(source.announcement,180)||fallback.announcement,
      eyebrow:text(source.eyebrow,100)||fallback.eyebrow,
      headline:text(source.headline,140)||fallback.headline,
      body:text(source.body,360)||fallback.body,
      primaryLabel:text(source.primaryLabel,60)||fallback.primaryLabel,
      secondaryLabel:text(source.secondaryLabel,60)||fallback.secondaryLabel
    };
  }
  if(output.mode==="scheduled"&&(!Date.parse(output.startAt)||!Date.parse(output.endAt)||Date.parse(output.endAt)<=Date.parse(output.startAt))) throw new Error("Scheduled mode requires a valid start and end time.");
  if(!/^https:\/\//i.test(output.linkUrl)) throw new Error("The Sunfest link must use https://.");
  return output;
};
const read=async()=>{
  const store=getStore(STORE_NAME,{consistency:"strong"});
  const saved=await store.get(KEY,{type:"json"});
  return saved?.config? saved:{config:sunfestDefaults,updatedAt:null,source:"defaults"};
};
const active=config=>{
  if(config.mode==="off")return false;
  if(config.mode==="manual")return true;
  const now=Date.now(); return now>=Date.parse(config.startAt)&&now<Date.parse(config.endAt);
};
export default async request=>{
  if(!originAllowed(request))return jsonResponse(403,{ok:false,message:"Origin not allowed."});
  const authorized=verifyAdminToken(getBearerToken(request),process.env.HOTLINE_ADMIN_SECRET);
  if(request.method==="GET"){
    try{
      const record=await read();
      if(authorized)return jsonResponse(200,{ok:true,...record,active:active(record.config)},{"cache-control":"no-store"});
      return jsonResponse(200,{ok:true,active:active(record.config),config:active(record.config)?record.config:null,updatedAt:record.updatedAt},{"cache-control":"public, max-age=30, stale-while-revalidate=60"});
    }catch(error){console.error(error);return jsonResponse(200,{ok:true,active:false,config:null,source:"fallback"});}
  }
  if(!authorized)return jsonResponse(401,{ok:false,message:"Your admin session has expired. Please log in again."});
  const store=getStore(STORE_NAME,{consistency:"strong"});
  if(request.method==="PUT"){
    let body;try{body=await request.json();}catch{return jsonResponse(400,{ok:false,message:"Invalid JSON."});}
    try{
      const config=validate(body?.config??body);const record={config,updatedAt:new Date().toISOString(),source:"admin"};
      await store.setJSON(KEY,record);return jsonResponse(200,{ok:true,...record,active:active(config)});
    }catch(error){return jsonResponse(400,{ok:false,message:error.message||"Invalid overlay settings."});}
  }
  if(request.method==="DELETE"){
    await store.delete(KEY);return jsonResponse(200,{ok:true,config:sunfestDefaults,updatedAt:null,source:"defaults",active:false});
  }
  return jsonResponse(405,{ok:false,message:"Method not allowed."},{allow:"GET, PUT, DELETE"});
};

export const config = { path: "/api/sunfest-overlay" };
