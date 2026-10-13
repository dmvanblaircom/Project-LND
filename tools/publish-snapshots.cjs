#!/usr/bin/env node
"use strict";
// Publishes only the producer-success paths already staged by odds.yml.
// The application checkout is never committed or pushed after cutover.
const fs=require("node:fs"),path=require("node:path"),cp=require("node:child_process");
function git(cwd,...args){return cp.execFileSync("git",args,{cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();}
function publish(source,target) {
 source=path.resolve(source);target=path.resolve(target);
 if(git(target,"branch","--show-current")!=="data-live")throw Error("Snapshot checkout must be data-live");
 const files=git(source,"diff","--cached","--name-only","--diff-filter=ACM").split("\n").filter(Boolean);
 if(!files.length)return false;
 for(const file of files) {
  if(!/^data\/[a-z0-9-]+\/[a-z0-9-]+\.json$/.test(file))throw Error("Non-snapshot path refused: "+file);
  if(fs.lstatSync(path.join(source,file)).isSymbolicLink())throw Error("Snapshot symlink refused");
  JSON.parse(fs.readFileSync(path.join(source,file),"utf8"));
 }
 for(const file of files){const dest=path.join(target,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,file),dest);}
 git(target,"add","--",...files);
 try{cp.execFileSync("git",["diff","--cached","--quiet"],{cwd:target,stdio:"ignore"});return false;}catch(e){}
 git(target,"config","user.name","github-actions[bot]");
 git(target,"config","user.email","41898282+github-actions[bot]@users.noreply.github.com");
 git(target,"commit","-m","Refresh snapshots: "+files.map(f=>f.replace(/^data\//,"")).join(", "));
 // Concurrent refresh writers are serialized by odds.yml; code changes never
 // share this branch. Non-force push rejects unexpected branch changes.
 git(target,"push","origin","HEAD:refs/heads/data-live");
 return true;
}
if(require.main===module) {
 try{if(process.env.SUITE_DATA_PIPELINE_ENABLED!=="true")throw Error("Snapshot cutover is disabled");
 console.log(publish(process.cwd(),process.argv[2])?"Published to data-live; main unchanged":"Snapshots unchanged");}
 catch(e){console.error("SNAPSHOT PUBLICATION BLOCKED: "+e.message);process.exitCode=1;}
}
module.exports={publish};
