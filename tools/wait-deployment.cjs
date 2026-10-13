#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),{verify}=require("./verify-deployment.cjs");
(async()=>{
 const [url,environment,commitSHA,manifest]=process.argv.slice(2),expected=JSON.parse(fs.readFileSync(manifest,"utf8"));
 const headers={};
 if(environment!=="production") {
  if(process.env.CF_ACCESS_CLIENT_ID)headers["CF-Access-Client-Id"]=process.env.CF_ACCESS_CLIENT_ID;
  if(process.env.CF_ACCESS_CLIENT_SECRET)headers["CF-Access-Client-Secret"]=process.env.CF_ACCESS_CLIENT_SECRET;
 }
 let last="";
 for(let n=0;n<30;n++) {
  try{const result=await verify({url,environment,commitSHA,expected,headers});console.log(JSON.stringify(result));return;}
  catch(e){last=e.message;if(n<29)await new Promise(r=>setTimeout(r,10000));}
 }
 throw Error("Deployment did not verify within the promotion window: "+last);
})().catch(e=>{console.error("RELEASE INCOMPLETE: "+e.message);process.exitCode=1;});
