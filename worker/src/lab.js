/* Read-only API for DEV/Lab/feature previews. Production configuration is
   deliberately not inherited. No subscription store or scheduler exists. */
import production, { VERSION } from "./index.js";

function headers(origin, env) {
  const allowed = String(env && env.SUITE_ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);
  const h = {"content-type":"application/json; charset=utf-8", "cache-control":"no-store", "vary":"Origin"};
  if(origin && origin !== "https://dmvanblaircom.github.io" && allowed.includes(origin)) h["access-control-allow-origin"]=origin;
  return h;
}
function reply(body,status,origin,env) {return new Response(JSON.stringify(body),{status,headers:headers(origin,env)});}
export default {
  async fetch(request, env, ctx) {
    const url=new URL(request.url), origin=request.headers.get("origin"), h=headers(origin,env);
    if(!env || env.SUITE_ENVIRONMENT!=="lab") return reply({error:"Lab environment not configured"},503,origin,env);
    if(url.pathname==="/v1/health" && request.method==="GET")
      return reply({ok:true,environment:"lab",version:VERSION,push:false,clock:false},200,origin,env);
    if(!h["access-control-allow-origin"]) return reply({error:"Origin not allowed"},403,origin,env);
    if(url.pathname.startsWith("/v1/push/")) return reply({error:"Game alerts are disabled in Lab"},403,origin,env);
    if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{...h,
      "access-control-allow-methods":"GET", "access-control-allow-headers":"content-type"}});
    if(request.method!=="GET") return reply({error:"Lab is read-only"},405,origin,env);
    if(!["/v1/cfbd/season","/v1/probe/espn"].includes(url.pathname)) return reply({error:"No such Lab route"},404,origin,env);
    // Allowlist only the inputs the read-only provider routes need. Accidentally
    // provisioned production bindings/tokens cannot be forwarded to them.
    const isolated = {CFBD_API_KEY:env.CFBD_API_KEY};
    if (env.CFBD_API_KEY) isolated.CACHE = await caches.open("suite-lab-provider-v1");
    const result=await production.fetch(request,isolated,ctx);
    const responseHeaders=new Headers(result.headers);
    for(const [key,value] of Object.entries(h)) responseHeaders.set(key,value);
    return new Response(result.body,{status:result.status,headers:responseHeaders});
  }
};
