import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { getStore } from '@netlify/blobs';
import { jsonResponse, originAllowed } from './_hotline-http.mjs';

const store=()=>getStore('contest-entry-receipts',{consistency:'strong'});
const detectMime=buffer=>{
  if(buffer[0]===0xff&&buffer[1]===0xd8)return'image/jpeg';
  if(buffer[0]===0x89&&buffer[1]===0x50&&buffer[2]===0x4e&&buffer[3]===0x47)return'image/png';
  if(String.fromCharCode(...buffer.slice(0,4))==='RIFF'&&String.fromCharCode(...buffer.slice(8,12))==='WEBP')return'image/webp';
  return'';
};

export default async request=>{
  if(!originAllowed(request))return jsonResponse(403,{ok:false,message:'Origin not allowed.'});
  if(request.method!=='POST')return jsonResponse(405,{ok:false,message:'Method not allowed.'});
  try{
    const form=await request.formData();
    const file=form.get('receipt');
    if(!(file instanceof File))return jsonResponse(400,{ok:false,message:'Choose a receipt image.'});
    if(file.size>12*1024*1024)return jsonResponse(413,{ok:false,message:'Receipt image must be 12 MB or smaller.'});
    const input=Buffer.from(await file.arrayBuffer());
    const detected=detectMime(input);
    if(!detected)return jsonResponse(400,{ok:false,message:'Use a JPG, PNG or WebP receipt image.'});
    const output=await sharp(input,{limitInputPixels:60000000}).rotate().resize({width:2200,height:2200,fit:'inside',withoutEnlargement:true}).jpeg({quality:88,mozjpeg:true}).toBuffer();
    const imageHash=createHash('sha256').update(output).digest('hex');
    const key=`receipts/${new Date().toISOString().slice(0,10)}/${randomUUID()}.jpg`;
    await store().set(key,output,{metadata:{contentType:'image/jpeg',originalName:file.name||'receipt.jpg',originalSize:file.size,processedSize:output.length,imageHash}});
    return jsonResponse(201,{ok:true,key,mime:'image/jpeg',size:output.length,imageHash,originalName:file.name||'receipt.jpg'});
  }catch(error){
    console.error('contest-entry-receipt',error);
    return jsonResponse(500,{ok:false,message:'The receipt image could not be processed. Please try another image.'});
  }
};

export const config={path:'/api/contest-entry-receipt'};
