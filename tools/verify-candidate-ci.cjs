#!/usr/bin/env node
"use strict";
(async()=>{
 const sha=process.argv[2],branch=process.argv[3],repo=process.env.GITHUB_REPOSITORY;
 if(!/^[0-9a-f]{40}$/.test(sha||"") || !["dev","lab"].includes(branch) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo||""))throw Error("Pinned candidate, source branch and repository required");
 const r=await fetch("https://api.github.com/repos/"+repo+"/actions/workflows/check.yml/runs?head_sha="+sha+"&event=push&per_page=100",{
   headers:{accept:"application/vnd.github+json",authorization:"Bearer "+process.env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28"},signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("Cannot verify candidate CI: HTTP "+r.status);
 const runs=(await r.json()).workflow_runs.filter(run=>run.head_sha===sha && run.head_branch===branch).sort((a,b)=>b.id-a.id);
 if(!runs.length || runs[0].status!=="completed" || runs[0].conclusion!=="success")throw Error("Current source-branch CI is missing, unfinished, or failed");
 console.log("Candidate CI passed: "+sha+" on "+branch+" (run "+runs[0].id+")");
})().catch(e=>{console.error("PROMOTION BLOCKED: "+e.message);process.exitCode=1;});
