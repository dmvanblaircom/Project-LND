#!/usr/bin/env node
/**
 * Suite's strictly forward-only code promotion gate.
 *
 * plan <lab|main>:
 *   validates current origin/main -> origin/lab -> origin/dev ancestry;
 *   emits candidate and expected target ref to GITHUB_OUTPUT.
 * apply <lab|main> <candidate-sha> <expected-old-sha>:
 *   checks the same rules again, then makes one non-forced fast-forward push.
 *
 * Does not deploy, grant approvals, or certify UAT. See docs/engineering/code-promotion.md.
 * Do not enable it until the production data writer has been decoupled.
 */
"use strict";
const cp = require("node:child_process");
const fs = require("node:fs");
const command = process.argv[2], target = process.argv[3];
if (!["plan","apply"].includes(command) || !["lab","main"].includes(target)) {
  console.error("Usage: node tools/promotion-gate.cjs plan <lab|main> | apply <lab|main> <40-char candidate SHA> <40-char old target SHA>");
  process.exit(2);
}
function git(...args) {
  return cp.execFileSync("git", args, {encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
}
function sha(s) {return typeof s === "string" && /^[0-9a-f]{40}$/.test(s);}
function must(p, msg) {if (!p) throw Error(msg);}
function ancestor(a, b) {
  try {cp.execFileSync("git", ["merge-base","--is-ancestor",a,b], {stdio:"ignore"});return true;}
  catch(e) {return false;}
}
function ref(branch) {return git("rev-parse","refs/remotes/origin/"+branch);}
function remote(branch) {
  const s=git("ls-remote","origin","refs/heads/"+branch);
  const m=s.match(/^([0-9a-f]{40})\s+refs\/heads\//);
  must(!!m,"Missing remote branch "+branch);
  return m[1];
}
function checkState(candidate, expectedOld) {
  git("fetch","--no-tags","origin",
    "+refs/heads/main:refs/remotes/origin/main",
    "+refs/heads/lab:refs/remotes/origin/lab",
    "+refs/heads/dev:refs/remotes/origin/dev");
  const main=ref("main"),lab=ref("lab"),dev=ref("dev");
  must(ancestor(main,lab),"DRIFT: production main is not contained in Lab. Fix before promoting.");
  must(ancestor(lab,dev),"DRIFT: Lab is not contained in DEV. Fix before promoting.");
  const source=target==="lab"?dev:lab;
  const old=target==="lab"?lab:main;
  must(!expectedOld||old===expectedOld,"Target moved after planning; abort, request a fresh promotion.");
  must(!candidate||sha(candidate),"Candidate must be a full 40-character commit SHA.");
  candidate=candidate||source;
  must(git("rev-parse",candidate+"^{commit}")===candidate,"Candidate must be an existing commit.");
  // Dev -> Lab may select an earlier, already-merged DEV commit.
  // Lab -> main promotes ONLY the current QA-approved Lab HEAD.
  must(ancestor(candidate,dev),"Candidate is not contained in current DEV.");
  must(target!=="main"||candidate===lab,
    "Production candidate must exactly match Lab HEAD; QA must retest after Lab changes.");
  must(ancestor(old,candidate),"Target is not ancestor of candidate; never rewind or merge branches.");
  must(ancestor(main,candidate),"Production is not contained in candidate.");
  return {candidate,old,main,lab,dev};
}
try {
  must(process.env.SUITE_PROMOTION_ENABLED==="true",
    "Promotion intentionally DISABLED. Complete infrastructure cutover and set repo variable SUITE_PROMOTION_ENABLED=true.");
  must(!process.env.GITHUB_REF||process.env.GITHUB_REF==="refs/heads/main",
    "The promotion workflow must run from the default main branch.");
  if(command==="plan") {
    const v=checkState(null,null);
    const lines=[
      "candidate="+v.candidate,
      "expected_target="+v.old,
      "source_branch="+(target==="lab"?"dev":"lab"),
      "target_branch="+target
    ];
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,lines.join("\n")+"\n");
    console.log("PROMOTION CANDIDATE "+(target==="lab"?"DEV → LAB":"LAB → PRODUCTION")+"\n"+lines.join("\n"));
    console.log("This is a plan only. Await protected GitHub Environment approval.");
  } else {
    const candidate=process.argv[4],expectedOld=process.argv[5];
    must(sha(candidate)&&sha(expectedOld),"apply requires candidate and expected prior HEAD.");
    const v=checkState(candidate,expectedOld);
    must(remote(target)===v.old,"Remote target moved since validation. Abort.");
    must(remote("main")===v.main&&remote("lab")===v.lab&&remote("dev")===v.dev,
      "One of the promotion branches moved since validation. Abort.");
    // A normal git push never allows a non-fast-forward update. No force flag.
    console.log("PROMOTING "+target+" "+v.old+" -> "+candidate);
    git("push","--porcelain","origin",candidate+":refs/heads/"+target);
    must(remote(target)===candidate,"Remote target did not land on the expected candidate SHA.");
    console.log("PROMOTED EXACT SHA "+candidate+". Verify deployment and site smoke separately.");
  }
} catch(e) {
  console.error("PROMOTION BLOCKED: "+String(e.message||e));
  process.exitCode=1;
}
