#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),crypto=require("node:crypto");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
function must(test,message){if(!test)throw Error(message);}
async function verify({url,environment,commitSHA,expected,headers={}}) {
  must(["production","dev","lab","preview"].includes(environment),"Unknown environment");
  must(/^[0-9a-f]{40}$/.test(commitSHA||""),"Full expected SHA required");
  const base=new URL(url.endsWith("/")?url:url+"/");
  must(base.protocol==="https:" || (base.protocol==="http:" && ["localhost","127.0.0.1"].includes(base.hostname)),"HTTPS deployment required");
  must(!base.username&&!base.password&&!base.search&&!base.hash,"Deployment URL must not contain credentials or query strings");
  async function get(file) {
    const r=await fetch(new URL(file,base),{headers,redirect:"error",signal:AbortSignal.timeout(20000),cache:"no-store"});
    must(r.ok,"Deployment did not serve "+file+": HTTP "+r.status);
    return Buffer.from(await r.arrayBuffer());
  }
  const actual=JSON.parse(await get("build.json"));
  must(actual.environment===environment,"Wrong deployed environment");
  must(actual.commitSHA===commitSHA,"Wrong deployed commit SHA");
  must(actual.schema===1&&Array.isArray(actual.files),"Invalid deployment manifest");
  must(expected&&actual.codeDigest===expected.codeDigest,"Deployed code differs from the approved source artifact");
  must(actual.artifactDigest===hash(JSON.stringify(actual.files)),"Manifest digest is inconsistent");
  const byPath=new Map(actual.files.map(e=>[e.path,e]));
  // Match locally built code, not only a digest claimed by the remote manifest.
  for (const e of expected.files || []) {
    if(e.path.startsWith("data/")) continue; // independent live content pipeline
    const deployed=byPath.get(e.path);
    must(deployed && deployed.sha256===e.sha256 && deployed.bytes===e.bytes,"Approved asset differs: "+e.path);
  }
  for(const name of ["index.html","app.js","app.css","sw.js","env-config.js","suite/environment.js","manifest.json"])
    must(byPath.has(name),"Required asset absent: "+name);
  // A fetched manifest cannot authorize traversal or leaking internal files.
  for(const entry of actual.files) must(/^(?:index\.html|app\.js|app\.css|chooser\.js|sw\.js|env-config\.js|manifest\.json|_headers|(?:suite|teamos|teams|leagues|assets|data)\/[A-Za-z0-9_./-]+)$/.test(entry.path)
    && !entry.path.split("/").includes(".."),"Invalid artifact path");
  // Cloudflare's _headers is consumed by hosting rather than served as an asset.
  const list=actual.files.filter(e=>e.path!=="_headers");
  let next=0;
  await Promise.all(Array.from({length:8},async()=>{
    while(next<list.length) {
      const e=list[next++],bytes=await get(e.path);
      must(hash(bytes)===e.sha256&&bytes.length===e.bytes,"Asset revision mismatch: "+e.path);
    }
  }));
  const config=await get("env-config.js");
  must(config.toString().includes('"environment": "'+environment+'"'),"Browser environment metadata mismatch");
  if(environment!=="production") must(!config.toString().includes('"apiBase": "https://suite-api.dmvanblaircom.workers.dev"'),"Nonproduction uses production API");
  const manifest=JSON.parse(await get("manifest.json"));
  must(manifest.name===(environment==="production"?"Suite":environment==="lab"?"Suite Lab":environment==="dev"?"Suite DEV":"Suite Preview"),"Install identity mismatch");
  const again=JSON.parse(await get("build.json"));
  must(again.artifactDigest===actual.artifactDigest&&again.commitSHA===commitSHA,"Deployment changed during smoke verification");
  return {environment,commitSHA,codeDigest:actual.codeDigest,artifactDigest:actual.artifactDigest,verifiedAssets:list.length};
}
if(require.main===module) {
  const [url,environment,commitSHA,expectedPath]=process.argv.slice(2);
  const headers={};
  if(environment!=="production") {
    if(process.env.CF_ACCESS_CLIENT_ID) headers["CF-Access-Client-Id"]=process.env.CF_ACCESS_CLIENT_ID;
    if(process.env.CF_ACCESS_CLIENT_SECRET) headers["CF-Access-Client-Secret"]=process.env.CF_ACCESS_CLIENT_SECRET;
  }
  Promise.resolve().then(()=>verify({url,environment,commitSHA,expected:JSON.parse(fs.readFileSync(expectedPath,"utf8")),headers}))
    .then(result=>console.log(JSON.stringify(result)))
    .catch(e=>{console.error("DEPLOYMENT BLOCKED: "+e.message);process.exitCode=1;});
}
module.exports={verify};
