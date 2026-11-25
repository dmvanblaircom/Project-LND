#!/usr/bin/env node
/* Post tools/changesheet.js's result to its pull request (decision 0048).
   GitHub cannot attach an image to a comment through its API, so the sheets
   are committed to the `review-sheets` branch (pictures only, never merged)
   and the comment shows them from there. One comment per pull request,
   updated on each push.

     GITHUB_TOKEN=... GITHUB_REPOSITORY=owner/repo PR=123 SHA=<head> \
       node tools/postsheet.js artifacts/changes

   CI only: the check workflow's `changes` job runs it. */
"use strict";
var fs = require("fs"), path = require("path");
var dir = path.resolve(process.argv[2] || "artifacts/changes");
var REPO = process.env.GITHUB_REPOSITORY, PR = process.env.PR, SHA = (process.env.SHA || "").slice(0, 12), TOKEN = process.env.GITHUB_TOKEN;
var BRANCH = "review-sheets", MARK = "<!-- changesheet -->";
if (!REPO || !PR || !SHA || !TOKEN) { console.error("needs GITHUB_REPOSITORY, PR, SHA and GITHUB_TOKEN"); process.exit(2); }

async function gh(method, url, body) {
  var r = await fetch("https://api.github.com/repos/" + REPO + url, {
    method: method, body: body ? JSON.stringify(body) : undefined,
    headers: { authorization: "Bearer " + TOKEN, accept: "application/vnd.github+json", "content-type": "application/json", "x-github-api-version": "2022-11-28" }
  });
  if (r.status === 404 && method === "GET") return null;
  if (!r.ok) throw new Error(method + " " + url + ": " + r.status + " " + (await r.text()).slice(0, 300));
  return r.status === 204 ? null : r.json();
}

// One commit on review-sheets with this run's sheets, under pr-<n>/<sha>/
// (a new path each push, so no cached picture of an older sheet shows).
async function commit(files) {
  var tree = [];
  for (var f of files) {
    var blob = await gh("POST", "/git/blobs", { content: fs.readFileSync(path.join(dir, f)).toString("base64"), encoding: "base64" });
    tree.push({ path: "pr-" + PR + "/" + SHA + "/" + f, mode: "100644", type: "blob", sha: blob.sha });
  }
  for (var attempt = 1; ; attempt++) {
    var ref = await gh("GET", "/git/ref/heads/" + BRANCH);
    var parent = ref ? await gh("GET", "/git/commits/" + ref.object.sha) : null;
    var t = await gh("POST", "/git/trees", parent ? { base_tree: parent.tree.sha, tree: tree } :
      { tree: tree.concat([{ path: "README.md", mode: "100644", type: "blob",
          content: "Pictures for pull-request review (tools/changesheet.js, decision 0048). Never merged; safe to delete.\n" }]) });
    var c = await gh("POST", "/git/commits", { message: "Change sheet for #" + PR + " at " + SHA, tree: t.sha, parents: parent ? [parent.sha] : [] });
    try {
      if (ref) await gh("PATCH", "/git/refs/heads/" + BRANCH, { sha: c.sha, force: false });
      else await gh("POST", "/git/refs", { ref: "refs/heads/" + BRANCH, sha: c.sha });
      return;
    } catch (e) {
      // another pull request's sheet landed first: build on it
      if (attempt >= 4) throw e;
      await new Promise(function (r) { setTimeout(r, 1500 * attempt); });
    }
  }
}

(async function () {
  var summary = JSON.parse(fs.readFileSync(path.join(dir, "summary.json"), "utf8"));
  var md = fs.readFileSync(path.join(dir, "summary.md"), "utf8").trim();
  if (summary.sheets.length) await commit(summary.sheets);
  var pics = summary.sheets.map(function (f) {
    return "![" + f + "](https://github.com/" + REPO + "/blob/" + BRANCH + "/pr-" + PR + "/" + SHA + "/" + f + "?raw=true)";
  }).join("\n\n");
  var body = MARK + "\n### What changed on screen\n\n" + md + (pics ? "\n\n" + pics : "") +
    "\n\n<sub>At " + SHA.slice(0, 7) + ". Each sheet shows before (the base) and after (this PR), cropped to the change and ringed. For review, not a gate: tools/changesheet.js, decision 0048.</sub>";
  var comments = [];
  for (var page = 1; page < 10; page++) {
    var batch = await gh("GET", "/issues/" + PR + "/comments?per_page=100&page=" + page);
    comments = comments.concat(batch || []);
    if (!batch || batch.length < 100) break;
  }
  var mine = comments.filter(function (c) { return c.body && c.body.indexOf(MARK) === 0 && c.user && c.user.type === "Bot"; })[0];
  if (mine) await gh("PATCH", "/issues/comments/" + mine.id, { body: body });
  else await gh("POST", "/issues/" + PR + "/comments", { body: body });
  console.log((mine ? "updated" : "posted") + " the change sheet on #" + PR + " (" + summary.changed.length + " changed, " + summary.sheets.length + " sheet(s))");
})().catch(function (e) { console.error(e.message || e); process.exit(1); });
