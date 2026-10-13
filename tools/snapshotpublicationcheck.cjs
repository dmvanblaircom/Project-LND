#!/usr/bin/env node
"use strict";
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),cp=require("node:child_process"),assert=require("node:assert/strict");
const {publish}=require("./publish-snapshots.cjs");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"suite-snapshots-"));
function git(dir,...args){return cp.execFileSync("git",args,{cwd:dir,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();}
try {
 const remote=path.join(temp,"remote.git"),source=path.join(temp,"source"),target=path.join(temp,"target");
 git(temp,"init","--bare",remote);git(temp,"clone",remote,source);
 git(source,"config","user.name","Test");git(source,"config","user.email","test@example.invalid");git(source,"switch","-c","main");
 fs.mkdirSync(path.join(source,"data/league"),{recursive:true});fs.writeFileSync(path.join(source,"data/league/fpi.json"),'{"edition":1}');
 fs.writeFileSync(path.join(source,"app.js"),"baseline");git(source,"add",".");git(source,"commit","-m","baseline");git(source,"push","origin","main");
 const baseline=git(source,"rev-parse","HEAD");git(source,"branch","data-live");git(source,"push","origin","data-live");
 git(temp,"clone","--branch","data-live",remote,target);
 fs.writeFileSync(path.join(source,"data/league/fpi.json"),'{"edition":2}');git(source,"add","data/league/fpi.json");
 assert.equal(publish(source,target),true);
 assert.equal(JSON.parse(fs.readFileSync(path.join(target,"data/league/fpi.json"))).edition,2);
 assert.ok(git(source,"ls-remote","origin","refs/heads/main").startsWith(baseline),"App main never changed");
 assert.equal(git(source,"rev-parse","HEAD"),baseline,"Producer checkout never committed");
 fs.writeFileSync(path.join(source,"app.js"),"rogue code");git(source,"add","app.js");
 const before=git(target,"rev-parse","HEAD");assert.throws(()=>publish(source,target),/Non-snapshot/);
 assert.equal(git(target,"rev-parse","HEAD"),before,"Unsafe code publication makes no commit");
 git(source,"reset","app.js");fs.writeFileSync(path.join(source,"data/league/fpi.json"),'broken');git(source,"add","data/league/fpi.json");
 assert.throws(()=>publish(source,target));assert.equal(git(target,"rev-parse","HEAD"),before);
 console.log("Snapshot publication: data-live advances, main stays unchanged; code and invalid JSON are refused.");
}finally{fs.rmSync(temp,{recursive:true,force:true});}
