import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import lab from "../worker/src/lab.js";
const origin="https://suite-lab.example", env={SUITE_ENVIRONMENT:"lab",SUITE_ALLOWED_ORIGINS:origin,
  // If secrets/bindings are mistakenly present, no lab route may use them.
  REFRESH_CLOCK_TOKEN:"test",ALERTS:{get(){throw Error("Production store touched");}},
  FETCH(){throw Error("Unexpected network call");}};
const call=(method,path,site=origin,e=env)=>lab.fetch(new Request("https://lab.example"+path,{method,headers:{origin:site}}),e,{});
assert.equal(typeof lab.scheduled,"undefined");
assert.equal((await call("GET","/v1/health")).status,200);
const health=await (await call("GET","/v1/health")).json();
assert.equal(health.push,false);assert.equal(health.clock,false);assert.equal(health.environment,"lab");
for(const route of ["key","status","subscribe","unsubscribe"]) {
  assert.equal((await call("GET","/v1/push/"+route)).status,403);
  assert.equal((await call("POST","/v1/push/"+route)).status,403);
}
assert.equal((await call("POST","/v1/cfbd/season")).status,405);
assert.equal((await call("GET","/v1/probe/espn","https://dmvanblaircom.github.io")).status,403);
assert.equal((await call("GET","/v1/probe/espn","https://uninvited.example")).status,403);
assert.equal((await call("OPTIONS","/v1/cfbd/season")).headers.get("access-control-allow-methods"),"GET");
assert.equal((await call("GET","/v1/health",origin,{})).status,503);
assert.equal((await call("GET","/v1/cfbd/season?team=Notre%20Dame&year=2026")).status,503,"Missing Lab provider key must fail honestly");
const config=readFileSync(new URL("../worker/wrangler.lab.toml",import.meta.url),"utf8");
assert.ok(!/\[(triggers|durable_objects)|\[\[durable_objects|REFRESH_CLOCK_TOKEN\s*=/.test(config));
console.log("Lab API: no writes, cron, production origin, or production bindings; missing configuration fails closed.");
