/* TeamOS - the wire: a team's status-change news, read from the stories
   Suite already has (docs/product/wire-brief.md, Phase 1; decision 0043).

   GROUNDWORK, NOT YET CONSUMED. Nothing in the page loads this file (it is
   not in index.html or sw.js), so it changes nothing a fan sees. It exists so
   the rule can be measured on the headlines Suite has kept
   (tools/wiremeasure.js) and checked (tools/wirecheck.js) before David and
   the Creative Director decide how the wire is shown.

   The taxonomy (David, 2026-11-09), one kind per headline:

     drafted       picked in the NFL Draft, or signed by an NFL team as an
                   undrafted free agent
     suspension    suspended, or reinstated from one
     coaching      hired, fired, resigned, left, promoted, named interim,
                   coordinator changes, contract extensions
     transfer      enters or withdraws from the portal; a transfer commits
     commitment    a recruit commits, decommits or flips
     availability  out, questionable, doubtful, ruled out, game-time
                   decision, expected to play, returns to practice or play
     injury        injured, surgery, rehabilitation and other injury news

   When a headline fits more than one, the more specific status wins, in the
   order above: "out for the season after surgery" is availability;
   "undergoes ankle surgery" is injury.

   The rules, all of which favour a missed story over a wrong one:
   - The headline is the outlet's, word for word. classify() reads it and
     never changes it; the kind is a label beside it, never a claim of its own.
   - Analysis is not news. A headline that reports a change is a wire item;
     one that discusses it - analysis, opinion, a preview, a question ("What
     X's injury means for the Irish", "Will X play Saturday?") - stays an
     ordinary story.
   - No player identity, no story linking, no timeline: a headline is read on
     its own.
   - The side (ours or the opponent's) is whose feed the story came from, not
     who it is about.

   Pure. No fetch, no DOM, no provider schema, no team named in the code. */

var TeamOS = TeamOS || {};

TeamOS.wire = (function () {
  "use strict";

  // Most specific first: the order a headline that fits two is decided in.
  var KINDS = ["drafted", "suspension", "coaching", "transfer", "commitment", "availability", "injury"];

  // ---- the headline rule ------------------------------------------------------

  function re(s) { return new RegExp(s, "i"); }

  // A headline that discusses a change instead of reporting one: analysis is
  // not news. A question, an explainer, a preview, a reaction, a list, a
  // roundup, a tracker. Read before any kind, so "What Toney's injury means
  // for the Irish" stays an ordinary story.
  var DISCUSSES = [
    re("\\?\\s*['\"’”]?\\s*$"),
    re("(^|[:;—–] |\\.\\s|['\"‘“])(what|why|how|who|where|which|should|could|would|can|will|is|are|does|do|did|if|with|without|after|despite|when|as)\\b"),
    re("\\?\\s"),
    re("\\b(means?|meant|impacts?|implications?|fallout|aftermath|ramifications|effect|affects?|takeaways?|observations?|thoughts|reactions?|reacts?|react|overreactions?|"
       + "grades?|graded|grading|report card|mailbag|film|breakdown|breaks down|predictions?|predicted|projects?|projected|staff picks|expert picks|picks against|odds|betting|bets?|preview|previewing|"
       + "keys? to|things to|storylines?|stock (up|down|report)|winners and losers|power rankings?|rankings?|mock|big board|podcast|show|episode|video|watch:|listen|"
       + "hot seat|candidates?|replacement|replace|options|names to|rumou?rs?|speculation|could|might|may|should|must|has to|have to|needs? to|time (for|to)|step up|steps up|"
       + "lessons|debate|bold|questions?|by the numbers|learned|notebook|quotes|transcript|explains?|explained|discusses|discussed|addresses|addressed|address|weighs in|opens? up|"
       + "details|detailing|reflects?|reveals? why|why|criticism|criticizes|chastises|survey|poll|fans want|calls? for|petition|wishlist|wish list|hope|hopes|hoping|"
       + "worry|concerns?|scare|woes|bug|plagued|problems?|issues|troubles|wave|shakeups?|dodges?|break for|silver lining|"
       + "tracker|tracking|track|recap|roundup|round-up|spotlight|superlatives|meet the|getting to know|q&a|q & a|intel|scoop|nuggets|"
       + "target|targets|trending|pushing|push for|in the mix|visits?|visiting|visitors?|hosts?|hosting|offers?|offered|finalists?|finalist|top \\d+|decision date|"
       + "sets? (a )?(commitment|decision) date|announcement nears|nearing (a )?decision|set to announce|set to commit|to announce|to commit|commit watch|flip watch|"
       + "status (update|unchanged|unclear)|updates? on|updates [^.]{0,40} status|latest|reaffirms?|upholds?|sticks? with|remains? committed|stays? committed|a look at|plans? (following|after)|media availability|locked in|shuts? down (his )?recruitment|"
       + "adding color|column|opinion|commentary|analysis|editorial|perspective|instant impact|impact|hidden|legacy|history|insiders?|obstacle|honou?rs?|award|watch list|semifinalist|nominee|of the (year|week)|player of the|all-)\\b"),
    re("(,|and) more\\s*$"),
    re("^(watch|listen|live|recap|replay|how to|grading|ranking|top \\d+)\\b"),
    re("\\b(\\d+|two|three|four|five|six|seven|eight|nine|ten) (things|takeaways|questions|observations|thoughts|storylines|reasons|names|options|candidates|decisions)\\b")
  ];

  // Not this team's college football: the NFL (former players are their own
  // item, decision 0043), other sports a feed let through. A draft pick is
  // the one NFL story that is the program's.
  var NFL = re("\\b(nfl|pro day|texans|colts|chiefs|raiders|chargers|dolphins|vikings|patriots|saints|giants|jets|steelers|seahawks|buccaneers|titans|commanders|packers|bengals|browns|ravens|bills|"
               + "in the nfl|nfl debut|practice squad|waived|waives|released by)\\b");
  var OTHER_SPORT = re("\\b(wbb|mbb|basketball|hoops|hockey|volleyball|soccer|baseball|softball|lacrosse|wrestling|swimming|golf|tennis|rowing|gymnastics|track and field|nba|wnba|mlb|nhl|women['’]s)\\b");

  // Each kind: words that report its change. Kept narrow on purpose: a
  // missed story stays in the news; a wrong one would be a false claim.
  var RULES = {
    drafted: [
      re("\\b(drafted|selected|picked|taken|goes|went)\\b[^;?!]{0,40}\\b(\\d+(st|nd|rd|th)? overall|(first|second|third|fourth|fifth|sixth|seventh|1st|2nd|3rd|4th|5th|6th|7th)[- ]round|in the (\\d{4} )?nfl draft|no\\. \\d+ (overall|pick))\\b"),
      re("\\b(drafted|selected) by the\\b"),
      re("\\b(signs?|signed|agrees? to terms|inks?)\\b[^;?!]{0,40}\\b(undrafted free agent|udfa)\\b"),
      re("\\b(undrafted free agent|udfa)\\b[^;?!]{0,30}\\b(signs?|signed|deal) with\\b")
    ],
    suspension: [
      re("\\b(suspended|suspends|reinstated|reinstates|suspension (for|of|lifted))\\b")
    ],
    coaching: [
      re("\\bfires\\b(?! (up|back|away|off|on|at|shots?)\\b)"),
      re("\\b(relieves|relieved)\\b[^;?!]{0,50}\\bof (his |her |their )?(duties|role|position)\\b"),
      re("\\b(fired|dismisses|dismissed|parts? ways with|relieved of)\\b(?! up\\b)[^;?!]{0,50}\\b(coach|coordinator|coordinators|oc|dc|hc|staff|assistant|play-?calling)\\b"),
      re("\\b(coach|coordinator|oc|dc|assistant)\\b[^;?!]{0,40}\\b(fired|dismissed|resigns|resigned|steps down|stepping down|retires|retiring|leaves|leaving|departs|out at)\\b"),
      re("\\b(hires|hired|names|named|promotes|promoted|tabs|tabbed|elevates|elevated)\\b[^;?!]{0,50}\\b(head coach|interim|coordinator|oc|dc|assistant coach|coach)\\b"),
      re("^(?!.*\\b(series|schedule|home-and-home|rivalry|game|games)\\b).*\\b(contract extension|extends? [^;?!]{0,40}contract|(coach|coordinator)[^;?!]{0,40}(signs?|agrees? to|gets?|receives?|lands?) [^;?!]{0,20}extension|(signs?|agrees? to|gets?|receives?|lands?) [^;?!]{0,20}extension[^;?!]{0,40}(coach|coordinator))\\b"),
      re("\\b(accepts?|takes) (the )?[^;?!]{0,20}(head coaching|coordinator) (job|position|role)\\b")
    ],
    transfer: [
      re("\\b(enters?|entered|entering|to enter|will enter|plans to enter|intends to enter|in) (the )?(ncaa )?(transfer )?portal\\b"),
      re("\\b(withdraws?|withdrew|pulls?[^;?!]{0,10}name) (from|out of) (the )?(transfer )?portal\\b"),
      re("\\b(transfers|transferring|transferred) (to|from)\\b"),
      re("\\b(transfer|portal) [^;?!]{0,30}\\b(commits to|signs with|picks|chooses|joins)\\b"),
      re("\\b(commits to|signs with|picks|chooses|joins|lands|land|adds)\\b[^;?!]{0,40}\\b(portal|transfer)\\b(?! (window|class|rankings?|period))")
    ],
    commitment: [
      re("\\b(commits|committed|pledges|pledged|verbally commits) (to|on the spot)\\b(?![^;?!]{0,40}\\bthrough (the )?\\d{4})"),
      re("\\b(decommits?|de-commits?|decommitted|decommitment|reopens? (his )?recruitment|backs? off (his )?(commitment|pledge))\\b"),
      re("\\b(lands?|earns?|gets?|secures?|picks? up|grabs?|nabs?|snags?|reels? in|lands)\\b[^;?!]{0,30}\\b(commitment|commit|pledge|verbal)\\b"),
      re("\\b(flips|flipped)\\b[^;:?!]{0,45}\\b(from|to|commit)\\b"),
      re("^[^:]{0,40}\\bflip\\b(?! target| watch| update)[^;:?!]{0,40}\\bfrom\\b"),
      re("\\bannounces? (his )?commitment\\b"),
      re("\\b(signs|signed|inks) (with|national letter|nli)\\b(?! (an? )?(agent|agency))")
    ],
    availability: [
      re("\\b(ruled out|will (not|n['’]t) play|won['’]t play|not expected to play|not playing|sidelined|out indefinitely|season[- ]ending)\\b"),
      re("(?<!(stand|stood|stands|singled|broke|breaks|dressed|rocks|sold|called|lashes|lashed|reached|reaches|figured|spelled|pointed|carved|played|plays|starts|freaked|zoned|left|sort|cash|wipe|wiped|tapped|taps|bow|bows|bowed|lock|locks|locked|black|blacked|walk|walks|walked)\\s)\\bout (for (the )?(season|year|game|week|weeks|saturday|remainder|rest|several|\\w+ (game|weeks|matchup|clash|contest|battle))|vs\\.?|against|with (a |an |his )?([\\w-]+ )?(injury|illness|sprain|fracture|tear|concussion))\\b"),
      re("\\b(listed|downgraded|upgraded|designated|deemed|remain|remains)\\b[^;?!]{0,30}\\b(out|questionable|doubtful|probable|available)\\b"),
      re("\\b(questionable|doubtful|probable)\\b(?! (decision|decisions|call|calls|choice|choices|offseason|coaching|play|move|moves|officiating|strategy|timeout|fourth))"),
      re("\\b(game[- ]time decisions?|gametime decisions?|day[- ]to[- ]day|week[- ]to[- ]week)\\b"),
      re("\\b(will miss|to miss|set to miss|expected to miss|likely to miss|misses|missed) (the )?(rest|remainder|season|year|game|games|week|weeks|saturday|time|\\w+ (game|weeks|matchup|clash|contest|battle|showdown|rivalry))\\b"),
      // An absence reported alongside the injury: "Set to Undergo Surgery,
      // Missing Notre Dame" is availability by the precedence (Codex, #244).
      re("\\b(surgery|injury|injured|fracture|tear|sprain|concussion)\\b[^;?!]{0,40}\\b(missing|will miss|to miss|set to miss|expected to miss|likely to miss)\\b"),
      re("\\b(removed from|off) (the |thursday['’]?s? |friday['’]?s? |wednesday['’]?s? |final |latest )?(injury|availability) report\\b"),
      re("\\b(unlikely to (play|return)|not expected to return|will not return|won['’]t return|ready to return|loses [^;?!]{0,40} for the (season|year))\\b"),
      re("\\b(expected to play|will play|cleared to (play|return|practice)|good to go|available (for|vs\\.?|against)|set to return|expected to return|nearing (a )?return|returns? to (practice|action|the lineup|play)|back at practice|back in practice|returns? from (injury|suspension)|back from injury|activated)\\b")
    ],
    injury: [
      re("\\b(undergo|undergoes|underwent|undergoing|had|has|have|needs?|will need|to have|requires?|scheduled for|set for|successful|season-ending|undergo) [^;?!]{0,30}\\bsurgery\\b"),
      re("\\bsurgery (on|to repair|for)\\b"),
      re("\\b(tore|tears|torn|ruptured|ruptures|fractured|fractures|broke|breaks|dislocated|sprained) (his |her |an? )?([\\w-]+ )?(acl|mcl|pcl|achilles|labrum|meniscus|pec|pectoral|ankle|knee|foot|leg|arm|hand|wrist|collarbone|clavicle|shoulder|elbow|thumb|finger|hip|ribs?|jaw|neck|hamstring|bone)\\b"),
      re("\\b(suffers?|suffered|sustains?|sustained) [^;?!]{0,30}\\b(injury|injuries|fracture|sprain|concussion|tear|break)\\b"),
      re("\\b(carted off|exits? [^;?!]{0,30}(with|after) [^;?!]{0,20}injury|leaves? [^;?!]{0,30}with [^;?!]{0,20}injury|loses [^;?!]{0,40} to (a |an )?([\\w-]+ )?injury|injured (on|in|during|vs\\.?|against|at)|goes down with|helped off)\\b"),
      re("\\b(medically retires|medical retirement|medical redshirt|medical hardship|retires due to injury)\\b")
    ]
  };

  // -> { kind, cue } or null. cue is the words that decided it, for auditing.
  function classify(title) {
    var t = typeof title === "string" ? title.replace(/&#0*38;|&amp;/g, "&").replace(/&#8217;|&#x2019;/g, "’").replace(/&#821[12];/g, "–").replace(/\s+/g, " ").trim() : "";
    if (!t) return null;
    if (OTHER_SPORT.test(t)) return null;
    var nfl = NFL.test(t), i;
    for (i = 0; i < DISCUSSES.length; i++) if (DISCUSSES[i].test(t)) return null;
    for (var k = 0; k < KINDS.length; k++) {
      if (nfl && KINDS[k] !== "drafted") continue;
      var rules = RULES[KINDS[k]];
      for (var r = 0; r < rules.length; r++) {
        var m = rules[r].exec(t);
        if (m) return { kind: KINDS[k], cue: m[0] };
      }
    }
    return null;
  }

  // ---- the article's identity --------------------------------------------------

  // Query parameters that say how a reader arrived, not which article it is.
  var TRACKING = /^(utm_[a-z_]*|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|igshid|ref|ref_src|ref_url|source|src|cmpid|cmp|icid|ito|sr_share|smid|cid|_hsenc|_hsmi|oly_enc_id|oly_anon_id|vero_id|wt\.mc_id|at_medium|at_campaign|guccounter|partner|via|amp)$/i;

  // A link -> the key one article keeps however it is shared, or null when it
  // is not a web address. Lower-cased host (the path keeps its case: on most
  // servers /Story/1 and /story/1 are different pages; Codex, #244), no "www.", no fragment,
  // no trailing slash, no tracking parameters; other parameters are kept,
  // sorted, because some sites tell their articles apart by them.
  function key(link) {
    var m = /^https?:\/\/([^\/?#\s]+)([^?#\s]*)(\?[^#\s]*)?(#\S*)?$/i.exec(typeof link === "string" ? link.trim() : "");
    if (!m) return null;
    var host = m[1].toLowerCase().replace(/^www\./, "").replace(/:(80|443)$/, "");
    var path = (m[2] || "/").replace(/\/+$/, "").replace(/\/amp$/i, "") || "";
    var params = (m[3] || "").slice(1).split("&").filter(function (p) {
      var name = p.split("=")[0];
      return p && !TRACKING.test(decodeSafe(name));
    }).sort();
    return host + path + (params.length ? "?" + params.join("&") : "");
  }
  function decodeSafe(s) { try { return decodeURIComponent(s); } catch (e) { return s; } }

  // ---- whose wire ---------------------------------------------------------------

  // The opponent's provider id -> the program in the registry: { id, providerId },
  // id null when Suite does not carry the program (most FCS opponents), whose
  // news is then the provider's alone. null for an id that is not one.
  function opponentOf(providerId, registry) {
    var pid = providerId == null ? "" : String(providerId);
    if (!/^[0-9]+$/.test(pid)) return null;
    var list = Array.isArray(registry) ? registry : [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t && String(t.providerId) === pid && typeof t.id === "string") return { id: t.id, providerId: pid };
    }
    return { id: null, providerId: pid };
  }

  function ms(d) { var t = d instanceof Date ? d.getTime() : typeof d === "number" ? d : Date.parse(d); return isNaN(t) ? null : t; }

  // The team's schedule (Game[]) and the time -> this game week:
  //   { gameId, opponentProviderId, from, to }   (from and to in epoch ms)
  // or null outside one. Game week runs from the previous game's final - the
  // start of the season when there is none - until the next game's kickoff.
  // A previous game counts as final once its state is "post"; Game has no
  // time it ended, so `from` is that game's kickoff, which it is already
  // past. A canceled or postponed game is no one's game week. A game under
  // way has no game week: it has kicked off.
  function gameWeek(games, now) {
    var t = ms(now == null ? Date.now() : now);
    if (t == null || !Array.isArray(games)) return null;
    var list = games.filter(function (g) { return g && ms(g.date) != null && g.status !== "canceled" && g.status !== "postponed"; })
                    .slice().sort(function (a, b) { return ms(a.date) - ms(b.date); });
    var next = null, prev = null;
    for (var i = 0; i < list.length; i++) {
      var g = list[i];
      if (g.state === "post") { prev = g; continue; }
      next = g; break;
    }
    if (!next || next.state !== "pre" || ms(next.date) <= t) return null;
    if (!next.oppProviderId) return null;
    var from = prev ? ms(prev.date) : null;
    if (from != null && from > t) return null;
    return { gameId: next.id == null ? null : String(next.id), opponentProviderId: String(next.oppProviderId), from: from, to: ms(next.date) };
  }

  // A story and its kind -> a wire item. The story is not changed: its
  // headline, link and source are the outlet's, as they came.
  function item(story, kind, side) {
    if (!story || typeof story !== "object" || KINDS.indexOf(kind) === -1) return null;
    return { story: story, kind: kind, side: side === "opponent" ? "opponent" : "team", key: key(story.link) };
  }

  return { KINDS: KINDS.slice(), classify: classify, key: key, opponentOf: opponentOf, gameWeek: gameWeek, item: item };
})();

if (typeof module !== "undefined" && module.exports) module.exports = TeamOS.wire;
