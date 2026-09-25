"""A team's TEAM_CONFIG, as data, for the producers.

teams/<team>.js is written for the browser (`var TEAM_CONFIG = {...}`), so it
is evaluated by Node - the one parser that reads it exactly as the browser
does - and handed over as JSON. Regular expressions in the config (series,
broadcast and Kalshi name patterns) come back as {"source", "flags"}, so a
producer that needs one can rebuild it with regex().

Where a producer reads and writes is the team's declaration too: each kind of
snapshot names its files in `snapshots` (data/<team id>/...), so no producer
or workflow holds a filename of its own (backlog C2).

    python3 tools/producers/teamconfig.py --with beatNews
        prints the id of every team that declares that snapshot, one a line -
        what the workflow loops over.
"""
import argparse
import json
import os
import re
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

_JS = ("var fs=require('fs'),vm=require('vm'),c={};"
       "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8')+';this.out=TEAM_CONFIG',c);"
       "process.stdout.write(JSON.stringify(c.out,function(k,v){"
       "return Object.prototype.toString.call(v)==='[object RegExp]'?{source:v.source,flags:v.flags}:v;}))")


def load(team):
    path = os.path.join(ROOT, "teams", team + ".js")
    out = subprocess.run(["node", "-e", _JS, path], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def teams():
    """Every configured team's id: teams/<id>.js, apart from the registry."""
    return sorted(f[:-3] for f in os.listdir(os.path.join(ROOT, "teams"))
                  if f.endswith(".js") and f != "index.js")


def snapshot(config, kind):
    """The team's declaration for one kind of snapshot, or None."""
    s = (config.get("snapshots") or {}).get(kind)
    return s if isinstance(s, dict) and s.get("file") else None


def path(rel):
    """A declared file, as a path on disk."""
    return os.path.join(ROOT, rel)


def regex(p):
    """A pattern from the config ({"source", "flags"}) as a compiled regex."""
    if not p or not p.get("source"):
        return None
    return re.compile(p["source"], re.I if "i" in (p.get("flags") or "") else 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--with", dest="kind", required=True, help="a snapshot kind, e.g. depth")
    args = ap.parse_args()
    for t in teams():
        if snapshot(load(t), args.kind):
            print(t)


if __name__ == "__main__":
    main()
