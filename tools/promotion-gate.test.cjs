#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process"),assert=require("node:assert/strict");
const root=fs.mkdtempSync(path.join(os.tmpdir(),"suite-promotion-")),remote=path.join(root,"remote.git"),work=path.join(root,"work");
const gate=path.join(__dirname,"promotion-gate.cjs");
function cmd(dir,exe,args,env){
 const r=cp.spawnSync(exe,args,{cwd:dir,encoding:"utf8",env:{...process.env,...(env||{})}});
 return {status:r.status,output:(r.stdout||"")+(r.stderr||"")};
}
function git(dir,...args){const r=cmd(dir,"git",args);assert.equal(r.status,0,r.output);return r.output.trim();}
function go(args,env){return cmd(work,process.execPath,[gate,...args],{SUITE_PROMOTION_ENABLED:"true",GITHUB_REF:"refs/heads/main",GITHUB_OUTPUT:"",...env});}
let passed=0;function ok(test,msg){assert.ok(test,msg);passed++;}
try {
 git(root,"init","--bare",remote);
 git(root,"clone",remote,work);
 git(work,"config","user.email","suite-ci@example.invalid");
 git(work,"config","user.name","Suite CI");
 git(work,"checkout","-b","main");
 fs.writeFileSync(path.join(work,"release.txt"),"baseline");
 git(work,"add","release.txt");git(work,"commit","-m","baseline");
 git(work,"push","-u","origin","main");
 const first=git(work,"rev-parse","HEAD");
 git(work,"branch","lab");git(work,"branch","dev");
 git(work,"push","origin","lab","dev");
 ok(go(["plan","lab"]).status===0,"healthy lineage permits DEV to Lab planning");
 git(work,"checkout","dev");
 fs.writeFileSync(path.join(work,"release.txt"),"feature");
 git(work,"add","release.txt");git(work,"commit","-m","new feature");
 git(work,"push","origin","dev");
 const feature=git(work,"rev-parse","HEAD");
 let result=go(["apply","lab",feature,first]);
 ok(result.status===0,result.output);
 ok(git(work,"ls-remote","origin","refs/heads/lab").startsWith(feature),"Lab advanced to exact feature SHA");
 result=go(["apply","main",feature,first]);
 ok(result.status===0,result.output);
 ok(git(work,"ls-remote","origin","refs/heads/main").startsWith(feature),"Production advanced to exact Lab SHA");
 result=go(["apply","main",first,feature]);
 ok(result.status!==0,"backwards promotion refused");
 result=go(["plan","lab"],{SUITE_PROMOTION_ENABLED:"false"});
 ok(result.status!==0,"promotion disabled by default");
 git(work,"checkout","main");
 git(work,"pull","--ff-only","origin","main");
 fs.writeFileSync(path.join(work,"release.txt"),"rogue direct production change");
 git(work,"add","release.txt");git(work,"commit","-m","rogue prod edit");
 git(work,"push","origin","main");
 result=go(["plan","lab"]);
 ok(result.status!==0&&/DRIFT/.test(result.output),"production drift is blocked");
 console.log(passed+" promotion safety checks passed");
}finally{fs.rmSync(root,{recursive:true,force:true});}
