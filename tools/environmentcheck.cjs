#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const {build,PROD_API}=require("./build-environment.cjs");
const root=path.resolve(__dirname,".."),temp=fs.mkdtempSync(path.join(os.tmpdir(),"suite-env-"));
const sha="1".repeat(40),read=(dir,name)=>fs.readFileSync(path.join(dir,name),"utf8");
function environment(config) {
 const badge={hidden:true},window={SUITE_BUILD:config},context={window,Object,Suite:{},document:{readyState:"complete",getElementById:()=>badge}};
 vm.runInNewContext(read(root,"suite/environment.js"),context);
 return {value:context.Suite.environment,badge};
}
try {
 const records={};
 for(const kind of ["production","dev","lab","preview"]) {
   const out=path.join(temp,kind),branch=kind==="production"?"main":kind==="preview"?"feat/example":kind;
   records[kind]=build({root,out,environment:kind,commitSHA:sha,branch,apiBase:kind==="production"?PROD_API:""});
   assert.ok(records[kind].files.length>50);
   for(const entry of records[kind].files) assert.ok(!/^(docs|tools|worker|\.github|\.git)\//.test(entry.path));
   assert.ok(!fs.existsSync(path.join(out,"package.json")));
   assert.equal(JSON.parse(read(out,"manifest.json")).name,kind==="production"?"Suite":kind==="lab"?"Suite Lab":kind==="dev"?"Suite DEV":"Suite Preview");
   const config={window:{}};vm.runInNewContext(read(out,"env-config.js"),config);
   const e=environment(config.window.SUITE_BUILD);
   assert.equal(e.value.pushEnabled,kind==="production");assert.equal(e.badge.hidden,kind==="production");
   assert.equal(e.value.apiBase,kind==="production"?PROD_API:"");
   if(kind!=="production") assert.ok(read(out,"_headers").includes("noindex"));
   assert.equal(records[kind].codeDigest,records.production.codeDigest,"Environment metadata cannot alter the common source digest");
 }
 assert.equal(records.dev.dataDigest,records.lab.dataDigest);
 assert.notEqual(records.production.artifactDigest,records.lab.artifactDigest,"Environment output is intentionally distinguished");
 for(const kind of ["dev","lab","preview"]) {
  assert.throws(()=>build({root,out:path.join(temp,"bad-"+kind),environment:kind,commitSHA:sha,branch:kind==="preview"?"feat/test":kind,apiBase:PROD_API}),/Nonproduction/);
  const e=environment({environment:kind,apiBase:PROD_API,commitSHA:sha});
  assert.equal(e.value.apiBase,"");assert.equal(e.value.pushEnabled,false);
 }
 assert.equal(environment().value.pushEnabled,false,"Missing metadata fails closed");
 assert.equal(environment({environment:"lab",apiBase:"https://suite-api-lab.dmvanblaircom.workers.dev"}).value.apiBase,"https://suite-api-lab.dmvanblaircom.workers.dev");
 assert.throws(()=>build({root,out:path.join(temp,"wrong"),environment:"production",commitSHA:sha,branch:"lab",apiBase:PROD_API}),/main/);
 assert.throws(()=>build({root,out:path.join(temp,"badsha"),environment:"lab",commitSHA:"main",branch:"lab"}),/SHA/);
 assert.throws(()=>build({root,out:root,environment:"lab",commitSHA:sha,branch:"lab"}),/Output/);
 const app=read(root,"app.js");
 assert.ok(!app.includes('var EDGE="https://suite-api.'));
 assert.ok(/function postEdge\(path, body\)\{\s*if\(!ENVIRONMENT.pushEnabled/.test(app));
 assert.ok(/function alertsTurnOn\(\)\{\s*if\(!ENVIRONMENT.pushEnabled/.test(app));
 console.log("Environment packaging: all four builds complete; common code digest, private app identity, API isolation, and missing-config rejection passed.");
} finally {fs.rmSync(temp,{recursive:true,force:true});}
