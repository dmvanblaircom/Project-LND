#!/usr/bin/env node
"use strict";
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), cp = require("node:child_process");
const ROOT = path.resolve(__dirname, "..");
const FILES = ["index.html", "app.js", "app.css", "chooser.js", "sw.js", "manifest.json", "env-config.js"];
const DIRECTORIES = { suite: /\.js$/, teamos: /\.js$/, teams: /\.js$/, leagues: /\.js$/,
  assets: /\.(png|svg|woff2)$/, data: /\.json$/ };
const PROD_API = "https://suite-api.dmvanblaircom.workers.dev";
const hash = data => crypto.createHash("sha256").update(data).digest("hex");
function must(test, message) { if (!test) throw Error(message); }
function enumerate(root, directory, extension) {
  const result = [];
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name,"en"))) {
      const name = relative + "/" + entry.name;
      must(!entry.isSymbolicLink(), "Symlink refused: " + name);
      if (entry.isDirectory()) visit(name);
      else if (entry.isFile() && extension.test(name)) result.push(name);
    }
  }
  visit(directory); return result;
}
function validate(o) {
  must(["production", "dev", "lab", "preview"].includes(o.environment), "Explicit environment required");
  must(/^[0-9a-f]{40}$/.test(o.commitSHA || ""), "Full immutable commit SHA required");
  must(typeof o.branch === "string" && o.branch.length > 0, "Branch required");
  must(!o.snapshotSHA || /^[0-9a-f]{40}$/.test(o.snapshotSHA), "Full snapshot SHA required");
  const api = o.apiBase || "";
  if (o.environment === "production") must(api === PROD_API, "Production must use the production API");
  else must(!api || /^https:\/\/suite-api-(lab|dev)\.dmvanblaircom\.workers\.dev$/.test(api), "Nonproduction must never use the production API");
  must(o.environment !== "production" || o.branch === "main", "Production builds must come from main");
  must(o.environment !== "dev" || o.branch === "dev", "DEV builds must come from dev");
  must(o.environment !== "lab" || o.branch === "lab", "Lab builds must come from lab");
  must(o.environment !== "preview" || !["main", "dev", "lab"].includes(o.branch), "Preview needs a feature branch");
}
function build(o) {
  validate(o);
  const root = path.resolve(o.root || ROOT), out = path.resolve(o.out);
  must(out !== root && !root.startsWith(out + path.sep), "Output cannot contain source checkout");
  must(!fs.existsSync(out), "Output must be a new directory: " + out);
  const dataRoot=path.resolve(o.dataRoot || root);
  const names = FILES.concat(Object.entries(DIRECTORIES).flatMap(([d,ext])=>enumerate(d==="data"?dataRoot:root,d,ext))).sort();
  const buffers = new Map(names.map(name=>[name, fs.readFileSync(path.join(name.startsWith("data/")?dataRoot:root,name))]));
  // The source digest includes the canonical manifest/config, before environment
  // metadata is supplied. Dynamic sports snapshots are a separate data digest.
  const codeFiles = names.filter(name=>!name.startsWith("data/"));
  const codeDigest = hash(codeFiles.map(name=>name+"\0"+hash(buffers.get(name))).join("\n"));
  const dataDigest = hash(names.filter(name=>name.startsWith("data/")).map(name=>name+"\0"+hash(buffers.get(name))).join("\n"));
  const config = {environment:o.environment, commitSHA:o.commitSHA, branch:o.branch, apiBase:o.apiBase || ""};
  buffers.set("env-config.js", Buffer.from("// Public deployment metadata; never credentials.\nwindow.SUITE_BUILD = "+JSON.stringify(config,null,2)+";\n"));
  const manifest = JSON.parse(buffers.get("manifest.json"));
  if(o.environment !== "production") {
    const label = o.environment === "lab" ? "Lab" : o.environment === "dev" ? "DEV" : "Preview";
    manifest.name = manifest.short_name = "Suite " + label;
    manifest.description = "Private Suite " + label + " testing environment.";
    manifest.id = "./";
    // Noindex is a search hint only. Cloudflare Access is still required.
    buffers.set("_headers", Buffer.from("/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n/env-config.js\n  Cache-Control: no-store\n/build.json\n  Cache-Control: no-store\n"));
    let html = buffers.get("index.html").toString("utf8");
    html = html.replace('<title>Suite</title>', '<title>Suite '+label+'</title>')
      .replace(/(<meta name="(?:application-name|apple-mobile-web-app-title)" content=")Suite("\s*\/?>)/g, '$1Suite '+label+'$2');
    buffers.set("index.html", Buffer.from(html));
  }
  buffers.set("manifest.json", Buffer.from(JSON.stringify(manifest,null,2)+"\n"));
  // Require every precached path and manifest icon in the allowlisted output.
  const sw = buffers.get("sw.js").toString("utf8");
  const shell = (sw.match(/var SHELL_FILES\s*=\s*\[([\s\S]*?)\];/) || [])[1];
  must(!!shell, "Service worker shell list missing");
  for (const q of shell.match(/"[^"]+"/g) || []) {
    const name = q.slice(1,-1).replace(/^\.\//, "") || "index.html";
    must(buffers.has(name), "Precached asset missing from output: " + name);
  }
  for(const icon of manifest.icons || []) must(buffers.has(icon.src), "Manifest icon missing: " + icon.src);
  const entries = [...buffers].sort(([a],[b])=>a.localeCompare(b,"en"))
    .map(([name,data])=>({path:name, bytes:data.length, sha256:hash(data)}));
  const record = {...config, snapshotSHA:o.snapshotSHA || null, schema:1, codeDigest, dataDigest, artifactDigest:hash(JSON.stringify(entries)), files:entries};
  fs.mkdirSync(out,{recursive:true});
  for(const [name,data] of buffers) {
    const dest=path.join(out,name); fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.writeFileSync(dest,data);
  }
  fs.writeFileSync(path.join(out,"build.json"),JSON.stringify(record,null,2)+"\n");
  return record;
}
if(require.main === module) {
  try {
    const options={};
    for(let i=2;i<process.argv.length;i+=2) {
      const key=process.argv[i], value=process.argv[i+1];
      must(["--environment","--out","--sha","--branch","--api","--data-root","--data-sha"].includes(key) && value !== undefined,"Usage: node tools/build-environment.cjs --environment <production|dev|lab|preview> --out <new directory> [--sha <SHA> --branch <branch> --api <isolated API>]");
      options[key.slice(2)]=value;
    }
    const git=(...args)=>cp.execFileSync("git",args,{cwd:ROOT,encoding:"utf8"}).trim();
    // Deployments must represent committed source, never an uncommitted edit.
    must(git("status","--porcelain","--untracked-files=no")==="","Commit source changes before packaging");
    // No newly added runtime file may escape the immutable source revision.
    const untracked=git("ls-files","--others","--exclude-standard").split("\n").filter(Boolean);
    must(!untracked.some(f=>FILES.includes(f)||/^(suite|teamos|teams|leagues|assets|data)\//.test(f)),"Untracked runtime file: commit it before packaging");
    const commitSHA=git("rev-parse","HEAD");
    must(!options.sha || options.sha===commitSHA,"Requested SHA does not match checkout");
    const record=build({root:ROOT,out:options.out || path.join(ROOT,"artifacts/site-"+options.environment),
      environment:options.environment, commitSHA, branch:options.branch || git("branch","--show-current"),
      dataRoot:options["data-root"], snapshotSHA:options["data-sha"],
      apiBase:options.api !== undefined ? options.api : options.environment === "production" ? PROD_API : ""});
    console.log(JSON.stringify({environment:record.environment,commitSHA,codeDigest:record.codeDigest,artifactDigest:record.artifactDigest,files:record.files.length}));
  } catch(e) { console.error("BUILD BLOCKED: "+e.message); process.exitCode=1; }
}
module.exports={build,validate,PROD_API};
