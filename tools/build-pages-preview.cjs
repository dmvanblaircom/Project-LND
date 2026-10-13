#!/usr/bin/env node
"use strict";
// Cloudflare supplies the branch to the build process, not the browser.
const cp=require("node:child_process"),path=require("node:path");
const branch=process.env.CF_PAGES_BRANCH;
if(!branch || branch==="main" || /^(scan|probe)\//.test(branch) || branch==="data-live") {
  console.error("This Pages project accepts private Lab/DEV/feature builds only.");process.exit(1);
}
const environment=branch==="lab"?"lab":branch==="dev"?"dev":"preview";
const result=cp.spawnSync(process.execPath,[path.join(__dirname,"build-environment.cjs"),
  "--environment",environment,"--branch",branch,"--out",path.resolve(__dirname,"../artifacts/pages"),
  "--api",process.env.SUITE_NONPROD_API_BASE || ""],{stdio:"inherit"});
process.exit(result.status === null ? 1 : result.status);
