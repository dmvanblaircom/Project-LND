#!/usr/bin/env python3
"""The league's Kalshi markets for the season they belong to (W16).

    python3 tools/producers/markets.py [--season 2026]

Writes data/league/odds-title.json and data/league/odds-playoff.json: Kalshi's
open markets for one event each, as Kalshi answers them, stamped with the
event and the season. The events are the league's rule (LEAGUE_MARKETS in
leagues/college-football.js); the season is chosen once, for both:

  * this season, while any of its markets is open;
  * next season, once this one has none and Kalshi lists next season's;
  * neither: both files empty, and Season Outlook hides them.

Never last season's (offseason proposal, decision 5: "Next season's markets
as soon as Kalshi lists them, hidden until then; never last season's"), and
never two seasons side by side: from Dec 29, when the playoff market closes,
to the title game, the playoff file is empty rather than next season's.

An answer that cannot be had (a network failure, an error page, a rate
limit) leaves both files as they were, and the run says so; only Kalshi's
own word empties a file.
"""
import argparse
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
BASE = "https://api.elections.kalshi.com/trade-api/v2"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
OUT = {"title": "data/league/odds-title.json", "playoff": "data/league/odds-playoff.json"}

_JS = ("var fs=require('fs'),vm=require('vm'),c={};"
       "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8')+';this.out=LEAGUE_MARKETS',c);"
       "process.stdout.write(JSON.stringify(c.out))")


class Unavailable(Exception):
    """Kalshi could not be read: keep what is kept."""


def league_markets():
    path = os.path.join(ROOT, "leagues", "college-football.js")
    out = subprocess.run(["node", "-e", _JS, path], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def season_now(now):
    """The season being played, or just played: January to June is last
    season's, as the rest of the refresh counts it."""
    return now.year if now.month >= 7 else now.year - 1


def event(rule, season):
    return "%s-%02d" % (rule["series"], (season + rule["offset"]) % 100)


def fetch(url, tries=5, wait=10):
    """Kalshi's JSON, or Unavailable. A 404 is an answer: no such event."""
    last = None
    for attempt in range(1, tries + 1):
        try:
            req = urllib.request.Request(url, headers={"accept": "application/json", "user-agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return {"markets": []}
            last = "HTTP %d" % e.code
        except (urllib.error.URLError, OSError, ValueError) as e:
            last = type(e).__name__
        if attempt < tries:
            time.sleep(attempt * wait)
    raise Unavailable(last or "no answer")


def open_markets(ev, get):
    d = get("%s/markets?event_ticker=%s&limit=200&status=open" % (BASE, ev))
    if not isinstance(d, dict) or not isinstance(d.get("markets"), list):
        raise Unavailable("%s answered without a markets list" % ev)
    return d


def choose(rules, season, get):
    """-> {kind: (event, season, payload)}, every kind from one season: this
    one while any of its markets is open, else next if any of its is, else
    none (event and season None, no markets)."""
    for s in (season, season + 1):
        got = {kind: (event(rule, s), s, open_markets(event(rule, s), get)) for kind, rule in rules.items()}
        if any(d["markets"] for _, _, d in got.values()):
            return got
    return {kind: (None, None, {"markets": []}) for kind in rules}


def snapshot(kind, ev, season, payload):
    out = dict(payload)
    out.update({"kind": kind, "event": ev if payload["markets"] else None, "season": season if payload["markets"] else None})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--season", type=int, help="default: the season being played")
    a = ap.parse_args()
    season = a.season or season_now(datetime.now(timezone.utc))
    rules = {k: v for k, v in league_markets().items() if k in OUT}
    try:
        chosen = choose(rules, season, fetch)
    except Unavailable as e:
        print("::error::Kalshi could not be read (%s); the last files stand" % e)
        return 1
    for kind, (ev, s, d) in chosen.items():
        out = os.path.join(ROOT, OUT[kind])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, "w") as f:
            json.dump(snapshot(kind, ev, s, d), f)
        if d["markets"]:
            print("  %s <- %s (%d season): %d open markets" % (OUT[kind], ev, s, len(d["markets"])))
        else:
            print("  %s <- no open markets%s: Season Outlook hides it" % (OUT[kind], " in %d" % s if s else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
