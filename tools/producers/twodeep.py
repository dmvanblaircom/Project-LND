"""Parse an official two-deep and availability report from their PDF text.

Pure functions: text in, data out. No network, no PDF library, and no team
named anywhere - this reads a FORMAT (position, number, name, height, weight,
class), which is what makes it reusable for the next program that publishes
its depth chart the same way. official_depth.py does the fetching.

THE SHAPE, and why it changed (docs/decisions/0019):

    units[] -> { unit: "Defense",
                 slots[] -> { label: "DT", ordinal: 2,
                              levels[] -> { level: 1, players: [Gray, Brewu] },
                                          { level: 2, players: [Sevillano] } } }

  - A SLOT has identity. Notre Dame lists two DTs, two DEs, two CBs and three
    WRs, each under the same label. Keyed by label alone they merged: one
    "DT" card with six players and a false BATTLE badge pairing two
    starters who play side by side.
  - A LEVEL is first team, second team, and so on. It is a number, not a
    fixed pair, because the real chart lists three at some spots.
  - `players` IS the OR relationship. One player: the spot is his. More than
    one: they are listed "or" at that level - at first team a starting job
    still open, at second team a backup battle. Before this, OR was a flag
    on a row whose meaning depended on the row above it, so any sort or
    filter silently broke it.
  - A player listed at two slots appears at both. That is not a duplicate:
    the official chart really lists Francis Brewu second at one DT spot and
    co-first at the other.
"""
import re

ROW = re.compile(
    r"^(?:(?P<tag>or|OR|[A-Z][A-Z0-9/-]*)\s+)?"
    r"(?P<no>\d+[A-Z]?)\s+"
    r"(?P<name>.+?)\s+"
    r"(?P<ht>\d-\d+)\s+"
    r"(?P<wt>\d+)\s+"
    r"(?P<cl>Fr\.|So\.|Jr\.|Sr\.|5th|Gr\.|R-Fr\.|R-So\.|R-Jr\.|R-Sr\.)$"
)

# "NOTRE DAME DEFENSE", "OHIO STATE OFFENSE", or a bare "SPECIAL TEAMS":
# whatever the program's name, the unit is the last words.
UNIT = re.compile(r"^(?:[A-Z][A-Z .'&-]*\s)?(OFFENSE|DEFENSE|SPECIAL TEAMS)$")

LEVEL_WORDS = {1: "first team", 2: "second team", 3: "third team"}


def lines_of(text):
    return [re.sub(r"\s+", " ", x).strip() for x in (text or "").splitlines() if x.strip()]


def _level(levels, n):
    return {"level": n, "players": levels}


def parse_two_deep(text):
    """Official two-deep text -> {"title", "units"}.

    A position label starts a new SLOT (counted per label, so the second DT
    is ordinal 2). A row with no label starts the next LEVEL of the current
    slot. A row tagged "or" joins the current level."""
    rows = lines_of(text)
    title = next((x for x in rows if x.upper().startswith("DEPTH CHART")), None)
    units, unit, slot = [], None, None
    for line in rows:
        um = UNIT.match(line)
        if um:
            name = um.group(1).title()
            unit = next((u for u in units if u["unit"] == name), None)
            if unit is None:
                unit = {"unit": name, "slots": []}
                units.append(unit)
            slot = None
            continue
        if unit is None:
            continue
        m = ROW.match(line)
        if not m:
            continue
        tag = m.group("tag")
        player = {"no": m.group("no"), "name": m.group("name").strip(), "cl": m.group("cl")}
        if tag and tag.lower() != "or":
            ordinal = 1 + sum(1 for s in unit["slots"] if s["label"] == tag)
            slot = {"label": tag, "ordinal": ordinal, "levels": [_level([player], 1)]}
            unit["slots"].append(slot)
        elif tag:                                   # "or": joins the current level
            if slot is not None:
                slot["levels"][-1]["players"].append(player)
        elif slot is not None:                      # no tag: the next level down
            slot["levels"].append(_level([player], len(slot["levels"]) + 1))
    return {"title": title, "units": units}


def from_flat(groups):
    """The previous schema's flat rows -> units, losslessly.

    Old rows ran in chart order as {pos, depth, or, no, name, cl}. A slot
    began wherever the label changed or a new depth-1 row appeared that was
    not an "or"; that is exactly where the parser above starts one, so the
    conversion can be checked against a fresh parse of the same PDF."""
    units = []
    for unit_name, rows in (groups or {}).items():
        unit = {"unit": unit_name, "slots": []}
        slot = None
        for r in rows:
            player = {"no": r.get("no", ""), "name": r["name"], "cl": r.get("cl", "")}
            starts = (slot is None or r["pos"] != slot["label"] or
                      (r.get("depth") == 1 and not r.get("or")))
            if starts:
                ordinal = 1 + sum(1 for s in unit["slots"] if s["label"] == r["pos"])
                slot = {"label": r["pos"], "ordinal": ordinal, "levels": [_level([player], 1)]}
                unit["slots"].append(slot)
            elif r.get("or"):
                slot["levels"][-1]["players"].append(player)
            else:
                slot["levels"].append(_level([player], len(slot["levels"]) + 1))
        units.append(unit)
    return units


def battles(units):
    """Every level listing more than one player - a job the chart leaves open.
    Scoped to one slot, so two starters at different spots are never paired."""
    out = []
    for u in units:
        for s in u["slots"]:
            for lv in s["levels"]:
                if len(lv["players"]) > 1:
                    out.append({"unit": u["unit"], "label": s["label"], "ordinal": s["ordinal"],
                                "level": lv["level"], "names": [p["name"] for p in lv["players"]]})
    return out


def _slot_name(units, unit_name, label, ordinal):
    unit = next((u for u in units if u["unit"] == unit_name), None)
    many = unit and sum(1 for s in unit["slots"] if s["label"] == label) > 1
    return label + (" " + str(ordinal) if many else "")


def _where(units):
    """name -> {(unit, label, ordinal): level}"""
    out = {}
    for u in units:
        for s in u["slots"]:
            for lv in s["levels"]:
                for p in lv["players"]:
                    out.setdefault(p["name"], {})[(u["unit"], s["label"], s["ordinal"])] = lv["level"]
    return out


def level_word(n):
    return LEVEL_WORDS.get(n, "level %d" % n)


def diff(new_units, old_units, limit=40):
    """Week-over-week movement, per slot. Each change is structured, with a
    `text` for display, so the Suite can render it without parsing prose."""
    if not old_units:
        return []
    a, b = _where(old_units), _where(new_units)
    out = []

    def at(units, key):
        return _slot_name(units, *key)

    for name in b:
        if name not in a:
            first = sorted(b[name].items(), key=lambda kv: kv[1])[0]
            out.append({"kind": "enters", "name": name,
                        "text": "%s enters the depth chart at %s, %s" %
                                (name, at(new_units, first[0]), level_word(first[1]))})
            continue
        for key, lv in b[name].items():
            if key not in a[name]:
                out.append({"kind": "added", "name": name,
                            "text": "%s now also listed at %s, %s" %
                                    (name, at(new_units, key), level_word(lv))})
            elif lv < a[name][key]:
                out.append({"kind": "up", "name": name,
                            "text": "%s moves up to %s at %s" % (name, level_word(lv), at(new_units, key))})
            elif lv > a[name][key]:
                out.append({"kind": "down", "name": name,
                            "text": "%s drops to %s at %s" % (name, level_word(lv), at(new_units, key))})
        for key in a[name]:
            if key not in b[name]:
                out.append({"kind": "removed", "name": name,
                            "text": "%s no longer listed at %s" % (name, at(old_units, key))})
    for name in a:
        if name not in b:
            out.append({"kind": "leaves", "name": name, "text": "%s is off the depth chart" % name})
    return out[:limit]


def count_players(units):
    return sum(len(lv["players"]) for u in units for s in u["slots"] for lv in s["levels"])


# ---- availability --------------------------------------------------------

REPORT = re.compile(r"^AVAILABILITY UPDATE\s*\((?P<date>[^)]*)\)", re.I)
STATUSES = [
    (re.compile(r"^Out for the Season$", re.I), "out-season"),
    (re.compile(r"^Out for the Game$", re.I), "out-game"),
    (re.compile(r"^Doubtful(?: for the Game)?$", re.I), "doubtful"),
    (re.compile(r"^Questionable(?: for the Game)?$", re.I), "questionable"),
    (re.compile(r"^Probable(?: for the Game)?$", re.I), "probable"),
]
ITEM = re.compile(r"^[•*]\s*(?:No\.?\s*(?P<no>\d+)\s+)?(?P<pos>[A-Z][A-Z/]*)\s+(?P<body>.+)$")
# A spaced dash of any kind, or an unspaced en/em dash. A hyphen with no
# spaces is part of a name (Viliamu-Asa), never the separator.
SEPARATOR = re.compile(r"\s+[-–—]\s+|\s*[–—]\s*")
MONTHS = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6, "jul": 7,
          "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12}


def report_date(heading_date, season):
    """"SEPT. 21" in the 2026 season -> "2026-09-21". January and February
    belong to the following calendar year: the bowl games."""
    m = re.match(r"\s*([A-Za-z]+)\.?\s*(\d{1,2})", heading_date or "")
    if not m:
        return None
    month = MONTHS.get(m.group(1)[:3].lower())
    if not month:
        return None
    year = int(season) + (1 if month <= 2 else 0)
    return "%04d-%02d-%02d" % (year, month, int(m.group(2)))


def parse_availability(text, season):
    """Game-notes text -> the LAST dated availability report in it.

    The notes open with policy prose headed "AVAILABILITY UPDATES"; only a
    dated heading - "AVAILABILITY UPDATE (SEPT. 21)" - is a report, so the
    prose can never be read as players. `reported` means a report EXISTS,
    not that someone is hurt: a report listing nobody is a report that
    everyone is available, and no report at all is unknown. Those must never
    be confused (docs/decisions/0018)."""
    rows = lines_of(text)
    heads = [i for i, x in enumerate(rows) if REPORT.match(x)]
    if not heads:
        return {"reported": False, "effectiveAt": None, "heading": None, "players": []}
    start = heads[-1]
    heading = rows[start]
    out = {"reported": True,
           "effectiveAt": report_date(REPORT.match(heading).group("date"), season),
           "heading": heading, "players": []}
    status = None
    for line in rows[start + 1:]:
        if (UNIT.match(line) or line.startswith("Pos. No.") or line.upper().startswith("DEPTH CHART")
                or line.lower().startswith("pronunciation guide") or REPORT.match(line)):
            break
        hit = next((st for rx, st in STATUSES if rx.match(line)), None)
        if hit:
            status = hit
            continue
        if status is None:
            continue
        m = ITEM.match(line)
        if not m:
            continue
        parts = SEPARATOR.split(m.group("body"), maxsplit=1)
        if len(parts) != 2:
            continue
        out["players"].append({"no": m.group("no") or "", "pos": m.group("pos"),
                               "name": parts[0].strip(), "status": status,
                               "detail": parts[1].strip()})
    return out
