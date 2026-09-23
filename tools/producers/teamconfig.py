"""A team's TEAM_CONFIG, as data, for the producers.

teams/<team>.js is written for the browser (`var TEAM_CONFIG = {...}`), so it
is evaluated by Node - the one parser that reads it exactly as the browser
does - and handed over as JSON. Regular expressions in the config (series
and broadcast patterns) come back as {}; no producer reads them.
"""
import json
import os
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))

_JS = ("var fs=require('fs'),vm=require('vm'),c={};"
       "vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8')+';this.out=TEAM_CONFIG',c);"
       "process.stdout.write(JSON.stringify(c.out))")


def load(team):
    path = os.path.join(ROOT, "teams", team + ".js")
    out = subprocess.run(["node", "-e", _JS, path], capture_output=True, text=True, check=True)
    return json.loads(out.stdout)
