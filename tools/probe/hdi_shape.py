# Probe branch only: print the shape of the Big Ten's public availability
# JSON (base64 images elided) and every entry that names Ohio State.
import json, sys
def strip(o):
    if isinstance(o, dict): return {k: strip(v) for k, v in o.items()}
    if isinstance(o, list): return [strip(v) for v in o]
    if isinstance(o, str) and (o.startswith("data:") or len(o) > 200): return "<%d chars>" % len(o)
    return o
for name in sys.argv[1:]:
    d = strip(json.load(open(name)))
    print("=====", name, type(d).__name__, len(d))
    items = list(d.items()) if isinstance(d, dict) else list(enumerate(d))
    print("keys sample:", [k for k, _ in items[:15]])
    if items: print("FIRST:", json.dumps(items[0][1], indent=1)[:4000])
    osu = [(k, v) for k, v in items if "ohio state" in json.dumps(v).lower()]
    print("ohio state entries:", len(osu))
    for k, v in osu[:3]: print("OSU", k, json.dumps(v, indent=1)[:5000])
