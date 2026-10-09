"""Read the fan-facing facts out of a program's weekly game notes (text).

David, 2026-10-09, from the game-notes inventory
(docs/product/game-notes-features.md): pronunciations, captains and honors,
the series card, and By the Numbers. Pure functions: the notes' text in,
data out. No network, no PDF library, no team named. official_depth.py
already downloads the notes every week; it calls parse() on the same text.

    parse(text) -> {
      "game":      "Stanford" | None        the opponent the notes are for
      "roster":    [{no, name, pos}]        the notes' own roster table
      "pronounce": {name: "BOO-bah-car TRAY-or-ree"}
      "captains":  [name]
      "honors":    {name: [honor]}          roster players only
      "glance":    [fact]                   "Game Day at a Glance" bullets
      "numbers":   [{n: "15", text: "Consecutive wins by double digits..."}]
      "unread":    [line]                   anything a section could not read
    }

Facts, not prose (inventory note 2): By the Numbers keeps each item's FIRST
SENTENCE, the fact the number counts, never the paragraph around it; the
glance bullets are the notes' own one-line facts. A line a section expected
to read and could not is reported in "unread", never silently dropped (the
availability lesson of 2026-10-07).
"""
import re

# Bumped whenever a reading changes, so last week's snapshot is read again.
PARSER = 1
GLANCE_MAX = 6
GLANCE_WHOLE = 200

PAGE_NOISE = re.compile(r"^(?:=+ PAGE \d+ =+|\d{4} FOOTBALL GAME NOTES|Game \d+\s*\|.*)$", re.I)
POS = r"(?:QB|RB|FB|WR|TE|OL|OT|OG|C|DL|DE|DT|LB|CB|S|DB|K|P|LS|ATH)"
CLASS = r"(?:Fr\.|So\.|Jr\.|Sr\.|5th|6th|Gr\.|R-Fr\.|R-So\.|R-Jr\.|R-Sr\.)"
ROSTER_ROW = re.compile(r"^(?P<no>\d{1,2}) (?P<name>.+?) (?P<pos>" + POS + r") (?P<ht>\d-\d{1,2}) (?P<wt>\d{3}) " + CLASS + r"(?: .*)?$")
NUMBER = re.compile(r"^\d[\d,]*$")
SUFFIX = re.compile(r"\s+(?:Jr\.|Sr\.|II|III|IV)$")
# "Sept. 20" or "No. 3" is not the end of a sentence.
ABBREV = re.compile(r"(?:\b(?:Jan|Feb|Mar|Apr|Aug|Sept|Sep|Oct|Nov|Dec|No|Nos|Jr|Sr|St|vs|Mr|Dr|Ft|Mt|U\.S)|\b[A-Z])\.$")


def lines_of(text):
    out = []
    for x in (text or "").splitlines():
        x = re.sub(r"\s+", " ", x).strip()
        if x and not PAGE_NOISE.match(x):
            out.append(x)
    return out


def _section(rows, start, stops):
    """Rows after the first row matching `start` up to the next matching any of `stops`."""
    i = next((k for k, r in enumerate(rows) if start.match(r)), None)
    if i is None:
        return []
    out = []
    for r in rows[i + 1:]:
        if any(s.match(r) for s in stops):
            break
        out.append(r)
    return out


def first_sentence(text):
    """The first sentence: up to the first '. ' that ends one."""
    t = re.sub(r"\s+", " ", text).strip()
    for m in re.finditer(r"[.!?](?=\s+[A-Z“\"(]|\s*$)", t):
        if ABBREV.search(t[:m.end()]):
            continue
        return t[:m.end()].strip()
    return t


def _bare(name):
    return SUFFIX.sub("", name).strip()


def roster(text):
    rows, out, seen = lines_of(text), [], set()
    for r in rows:
        m = ROSTER_ROW.match(r)
        if m and (m.group("no"), m.group("name")) not in seen:
            seen.add((m.group("no"), m.group("name")))
            out.append({"no": m.group("no"), "name": m.group("name").strip(), "pos": m.group("pos")})
    return out


def pronounce(text, players):
    """{name: phonetic} from each "No. Name Pronunciation" table. A row is
    matched to the roster by number, then by the name it starts with (a
    suffix the table leaves off - "Christopher Burgess" for "... Jr." -
    still matches). A row whose name is not on the roster is unread."""
    by_no = {}
    for p in players:
        by_no.setdefault(p["no"], []).append(p["name"])
    out, unread, inside = {}, [], False
    for r in lines_of(text):
        if r == "No. Name Pronunciation":
            inside = True
            continue
        if not inside:
            continue
        if r.startswith("No. Name") or not re.match(r"^\d{1,2} ", r):
            inside = r.startswith("No. Name Pronunciation")
            continue
        no, rest = r.split(" ", 1)
        hit = None
        for name in sorted(by_no.get(no, []), key=len, reverse=True):
            for form in (name, _bare(name)):
                if rest == form or rest.startswith(form + " "):
                    hit = (name, rest[len(form):].strip())
                    break
            if hit:
                break
        if not hit:
            unread.append(r)
        elif hit[1]:
            out[hit[0]] = hit[1]
    return out, unread


def captains(text):
    rows = lines_of(text)
    body = _section(rows, re.compile(r"^\d{4} CAPTAINS$"), [re.compile(r"^(?![•*])")])
    return [re.sub(r"^[•*]\s*", "", r).strip() for r in body if r[:1] in "•*"]


HONOR_NAME = re.compile(r"^(?P<last>[A-Z][A-Za-z'’.-]+(?: [A-Z][A-Za-z'’.-]+)?(?: Jr\.)?), (?P<first>[A-Z][A-Za-z'’.-]*) (?P<honor>.+)$")


def honors(text, players):
    """{name: [honor]} from "HONORS AND AWARDS": "Last, First Honor" starts a
    player, and each line after it is another honor of his, until the next
    "Last, First". Only names on the roster are kept (the coach is listed
    too); a "; " joins two honors on one line."""
    rows = lines_of(text)
    i = next((k for k, r in enumerate(rows) if re.match(r"^\d{4} HONORS AND AWARDS$", r)), None)
    if i is None:
        return {}, []
    names = {}
    for p in players:
        parts = _bare(p["name"]).split(" ", 1)
        if len(parts) == 2:
            names[(parts[1], parts[0])] = p["name"]
    out, cur, unread = {}, None, []
    for r in rows[i + 1:]:
        if r.startswith("NAME ") or r.startswith("No. "):
            continue
        # the next section: a heading (no lower case: "AP TOP 25") or a
        # numbered table row - an honor always has lower case and no rank
        if not re.search(r"[a-z]", r) or re.match(r"^\d", r):
            break
        m = HONOR_NAME.match(r)
        key = m and (SUFFIX.sub("", m.group("last")), m.group("first"))
        if m and key in names:
            cur = names[key]
            items = [m.group("honor")]
        elif m and not r.startswith(("Associated", "Phil Steele", "Walter Camp")) and "," in r.split(" ")[0]:
            cur = None                                   # someone not on the roster: the coach
            continue
        else:
            items = [r]
        if cur is None:
            continue
        for h in items:
            for part in h.split("; "):
                part = part.strip()
                if part and part not in out.setdefault(cur, []):
                    out[cur].append(part)
    return out, unread


def glance(text):
    rows = lines_of(text)
    body = _section(rows, re.compile(r"^GAME DAY AT A GLANCE$", re.I), [re.compile(r"^WHAT.S INSIDE$", re.I)])
    out = []
    for r in body:
        if r[:1] in "•*":
            out.append(re.sub(r"^[•*]\s*", "", r))
        elif out:
            out[-1] += " " + r
    return [re.sub(r"\s+", " ", x).strip() for x in out]


def numbers(text):
    rows = lines_of(text)
    body = _section(rows, re.compile(r"^(?:INSIDE THE .* - )?BY THE NUMBERS$", re.I),
                    [re.compile(r"^[A-Z][A-Z &/-]{10,}$")])
    out, cur = [], None
    for r in body:
        if NUMBER.match(r):
            cur = {"n": r, "lines": []}
            out.append(cur)
        elif cur is not None:
            cur["lines"].append(r)
    res = []
    for x in out:
        joined = " ".join(x["lines"])
        joined = re.sub(r"(\w)- (\w)", r"\1-\2", joined)     # "non- offensive" across a line break
        s = first_sentence(joined)
        if s:
            res.append({"n": x["n"], "text": re.sub(r"\s+([,.;:])", r"\1", re.sub(r"\s+", " ", s))})
    return res


def opponent(text):
    for r in (text or "").splitlines():
        m = re.match(r"^\s*Game \d+\s*\|\s*(?:vs\.?|at)?\s*(.+?)\s*\|", r.strip(), re.I)
        if m:
            return re.sub(r"\s*\(.*\)$", "", m.group(1)).strip()     # "Wisconsin (Shamrock Series)"
    return None


def parse(text):
    players = roster(text)
    pr, unread = pronounce(text, players)
    hon, unread2 = honors(text, players)
    return {
        "game": opponent(text),
        "roster": players,
        "pronounce": pr,
        "captains": captains(text),
        "honors": hon,
        # a short bullet whole ("...40th meeting. The series stands at
        # 25-14-0"), a long one cut to its first sentence: the fact, not the
        # anecdote
        "glance": [x if len(x) <= GLANCE_WHOLE else first_sentence(x) for x in glance(text)][:GLANCE_MAX],
        "numbers": numbers(text),
        "unread": unread + unread2,
    }


def usable(parsed):
    """Enough read to replace last week's snapshot: a broken reading keeps it."""
    return len(parsed["roster"]) >= 40 and (parsed["pronounce"] or parsed["numbers"] or parsed["glance"])
