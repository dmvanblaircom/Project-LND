#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),path=require("node:path"),os=require("node:os"),assert=require("node:assert/strict");
const {build}=require("./build-environment.cjs"),{verify}=require("./verify-deployment.cjs");
const serve=require("./lib/serve"),temp=fs.mkdtempSync(path.join(os.tmpdir(),"suite-deploy-")),out=path.join(temp,"lab"),sha="2".repeat(40);
(async()=>{
 const expected=build({out,environment:"lab",commitSHA:sha,branch:"lab"});
 const server=serve(out);await new Promise(r=>server.listen(0,"127.0.0.1",r));
 const url="http://127.0.0.1:"+server.address().port;
 try{
  const result=await verify({url,environment:"lab",commitSHA:sha,expected});
  assert.ok(result.verifiedAssets>50);
  await assert.rejects(verify({url,environment:"dev",commitSHA:sha,expected}),/environment/);
  await assert.rejects(verify({url,environment:"lab",commitSHA:"3".repeat(40),expected}),/commit SHA/);
  await assert.rejects(verify({url,environment:"lab",commitSHA:sha,expected:{codeDigest:"different"}}),/code differs/);
  fs.appendFileSync(path.join(out,"app.js"),"\n//wrong version\n");
  await assert.rejects(verify({url,environment:"lab",commitSHA:sha,expected}),/Asset revision mismatch/);
  console.log("Deployment smoke: every served asset verified; wrong SHA, environment, source digest and mixed revisions refused.");
 }finally{await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
