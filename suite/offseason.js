/* Suite offseason Home S2/S4 — presentation only (W16).
   This module never chooses a season, fetches data, or infers that a
   schedule has been announced. Claude/controller supplies its explicit
   model after TeamOS.season.phase has classified it.

   Suite.offseason.hero({
     phase: TeamOS.season.phase(...) with state awaiting-postseason|complete,
     record: {text:"11-1", season:2026, kind:"regular"|"final"},
     ranking: {rank:6, source:"CFP", season:2026, final:false|true},
     last: normalized Game with opponent, score and provider stage,
     calendar: TeamOS.season.calendar(...) result,
     nextSchedule: {outcome:"loading"|"empty"|"failed"|"retained"|"unknown",
                    opener: normalized Game|null}
   }) -> markup. Other phase states return "" and retain existing Game hero.
   Never pass fixture values, assumed ranks or an unverified opener.
   Suite.home accepts this as m.offseason; the controller's source/state
   wiring remains Claude's W16 handoff. */
var Suite = Suite || {};
Suite.offseason = (function(){
  "use strict";
  function esc(s){return Suite.ui.esc(String(s));}
  function number(n){return (typeof n==="number"||typeof n==="string") && String(n).trim()!=="" && isFinite(Number(n)) ? Number(n) : null;}
  function safeSeason(n){return Number.isInteger(Number(n))&&Number(n)>=2000&&Number(n)<2200?Number(n):null;}
  function record(m,phase){
    var r=m.record;
    if(!r||r.season!==phase.season||(phase.state==="awaiting-postseason"&&r.kind!=="regular")||(phase.state==="complete"&&r.kind!=="final"))return "";
    if(typeof r.text!=="string"||!/^[0-9]{1,2}[-–][0-9]{1,2}(-[0-9]{1,2})?$/.test(r.text))return "";
    return esc(r.text);
  }
  function ranking(m,phase){
    var r=m.ranking,rank=r&&number(r.rank);
    if(!r||r.season!==phase.season||!r.source||rank===null||rank<=0||rank%1!==0)return null;
    if(phase.state==="awaiting-postseason"&&r.source!=="CFP")return null;
    if(phase.state==="complete"&&r.final!==true)return null;
    return {value:"#"+rank,label:(phase.state==="complete"?"Final ":"")+String(r.source)+" ranking"};
  }
  function result(g){
    if(!g||(g.status!=="final"&&g.state!=="post")||!g.oppName)return "";
    var us=number(g.us),them=number(g.them),hasScores=us!==null&&them!==null&&us>=0&&them>=0,score="Final";
    if(hasScores){
      score=(us>them?"W ":us<them?"L ":"T ")+us+"–"+them;
    }
    var where=g.home||g.neutral?"vs":"at", stage="";
    if(typeof g.stage==="string")stage=g.stage;
    else if(g.stage&&typeof g.stage.name==="string")stage=g.stage.name;
    else if(g.stage&&typeof g.stage.label==="string")stage=g.stage.label;
    return '<div class="os-result"><strong class="os-result-score">'+esc(score)+'</strong>'+
      '<div class="os-result-details"><span>Last result</span><b>'+esc(where+" "+g.oppName)+'</b>'+
      (stage?'<span>'+esc(stage)+'</span>':"")+'</div></div>';
  }
  function localDate(raw,timeSet){
    if(!raw||!isFinite(Date.parse(raw)))return "";
    var d=new Date(raw);
    if(timeSet===false)return d.toLocaleDateString([], {weekday:"long",month:"long",day:"numeric"})+" · Time TBD";
    return d.toLocaleString([], {weekday:"long",month:"long",day:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"});
  }
  function whatsNext(m,phase){
    if(phase.state==="awaiting-postseason"){
      var sel=m.calendar&&m.calendar.selection;
      return '<div class="os-next"><h3>Bowl and playoff selections</h3>'+
        (sel&&localDate(sel.start)?'<p>'+(sel.live?"On now":esc(localDate(sel.start)))+(sel.on?' · '+esc(sel.on):"")+'</p>':
        '<p>Selection details will appear when confirmed.</p>')+'</div>';
    }
    var next=safeSeason(phase.nextSeason),label=next?next+" schedule":"next season's schedule";
    var n=m.nextSchedule||{},o=n.outcome||"unknown",op=n.opener;
    var text="";
    if(op&&op.oppName&&(o==="retained"||o==="ready")){
      // A retained opener may be shown with a separate freshness warning.
      var date=localDate(op.date,op.timeSet);
      text=(op.home||op.neutral?"vs ":"at ")+op.oppName+(date?" · "+date:" · Time TBD");
    } else if(o==="loading")text="Checking the "+label+"…";
    else if(o==="failed")text="The "+label+" couldn’t load. We’ll try again when the connection returns.";
    else if(o==="empty")text="The "+label+" is not available yet.";
    else text="Next season’s schedule information is not available yet.";
    return '<div class="os-next"><h3>Next season</h3><p>'+esc(text)+'</p></div>';
  }
  function hero(m){
    if(!m||!m.phase||["awaiting-postseason","complete"].indexOf(m.phase.state)<0)return "";
    var phase=m.phase,season=safeSeason(phase.season),rec=record(m,phase),rank=ranking(m,phase),awaiting=phase.state==="awaiting-postseason";
    // If the opener is confirmed this is S5; do not silently show S4.
    if(!awaiting&&phase.opener)return "";
    var metrics=[];
    if(rec)metrics.push('<div><dd>'+rec+'</dd><dt>'+(awaiting?"Regular-season record":"Final record")+'</dt></div>');
    if(rank)metrics.push('<div><dd>'+esc(rank.value)+'</dd><dt>'+esc(rank.label)+'</dt></div>');
    var last=result(m.last), metricsHtml=metrics.length?'<dl class="os-totals">'+metrics.join("")+'</dl>':"";
    return '<section class="os-hero" aria-labelledby="os-title"><p class="os-eyebrow">'+
      (season?esc(season)+" ":"")+(awaiting?"regular season":"season")+'</p>'+
      '<h2 id="os-title">'+(awaiting?"Regular season complete":"Season complete")+'</h2>'+
      metricsHtml+last+whatsNext(m,phase)+
      '<a class="os-results" href="#schedule/results">View season results <span aria-hidden="true">›</span></a></section>';
  }
  return {hero:hero};
})();
