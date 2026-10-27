"""Read the fan-facing facts out of a program's weekly game notes (text).

Two layouts are read, each section by whichever it finds: Notre Dame's
("GAME DAY AT A GLANCE", a "No. Name Pronunciation" table, "HONORS AND
AWARDS") and Ohio State's (a "FIRST AND TEN" column, a "Name  phonetic"
pronunciation guide, "PRESEASON HONORS", captains marked "(CAPTAIN)" in the
player pages; David, 2026-10-26). The reading names no team.

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
PARSER = 2
GLANCE_MAX = 6
GLANCE_WHOLE = 200

PAGE_NOISE = re.compile(r"^(?:=+ PAGE \d+ =+|\d{4} FOOTBALL GAME NOTES|Game \d+\s*\|.*)$", re.I)
POS = r"(?:QB|RB|FB|WR|TE|OL|OT|OG|C|DL|DE|DT|LB|CB|SAF|S|DB|K|P|LS|ATH)"
# a class year, with its period or without ("So" in a hand-set row)
CLASS = r"(?:(?:R-)?(?:Fr|So|Jr|Sr)\.?|5th|6th|Gr\.)"
ROSTER_ROW = re.compile(r"^(?P<no>\d{1,2}) (?P<name>.+?) (?P<pos>" + POS + r") (?P<ht>\d-\d{1,2}) (?P<wt>\d{3}) " + CLASS + r"(?: .*)?$")
# a By the Numbers figure: "15", "1,000", "99-100", ".870"
NUMBER = re.compile(r"^(?:\d[\d,]*(?:-\d[\d,]*)?|\.\d+)$")
SUFFIX = re.compile(r"\s+(?:Jr\.|Sr\.|II|III|IV)$")
# a nickname in quotes and the asterisks a roster marks letters with are not
# part of the name: "First “Nick” Last", "First Last*"
NICK = re.compile(r"\s*[“\"][^”\"]+[”\"]")
# "Sept. 20" or "No. 3" is not the end of a sentence.
ABBREV = re.compile(r"(?:\b(?:Jan|Feb|Mar|Apr|Aug|Sept|Sep|Oct|Nov|Dec|No|Nos|Jr|Sr|St|vs|Mr|Dr|Ft|Mt|U\.S)|\b[A-Z])\.$")


def _unglue(text):
    # a heading set on the last line of the column before it, with a space or
    # without: "...against the visitors.BY THE NUMBERS", "...per game. BY THE NUMBERS"
    return re.sub(r"(?m)(\S)[ \t]*(BY THE NUMBERS)[ \t]*$", r"\1\n\2", text or "")


def lines_of(text):
    out = []
    for x in _unglue(text).splitlines():
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


# A hyphen at a line's end is the word's own after one of these ("non-
# offensive", "two- time"), and the typesetter's anywhere else ("per- centage").
KEEP_HYPHEN = re.compile(r"^(?:non|self|pre|post|co|anti|multi|all|well|half|one|two|three|four|five|first|second|third|fourth|"
                         r"single|double|triple|high|low|top|career|season|game|school|program|record|year|week|ex|mid|re)$", re.I)


def _rejoin(m):
    left = m.group(1)
    return left + ("-" if KEEP_HYPHEN.match(left) or re.search(r"[\dA-Z]", left[1:]) else "") + m.group(2)


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
        name = m and NICK.sub("", m.group("name")).replace("*", "").strip()
        if m and (m.group("no"), name) not in seen:
            seen.add((m.group("no"), name))
            out.append({"no": m.group("no"), "name": name, "pos": m.group("pos")})
    return out


def pages_of(text):
    """The text page by page, by the "===== PAGE n =====" markers."""
    parts = re.split(r"(?m)^=+ PAGE \d+ =+\s*$", text or "")
    return [p for p in parts if p.strip()]


def pronounce(text, players):
    """{name: phonetic} from each "No. Name Pronunciation" table. A row is
    matched to the roster by number, then by the name it starts with (a
    suffix the table leaves off - "Christopher Burgess" for "... Jr." -
    still matches). A row whose name is not on the roster is unread."""
    by_no = {}
    for p in players:
        by_no.setdefault(p["no"], []).append(p["name"])
    out, unread, inside = {}, [], False
    guide(text, players, out, unread)
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


def guide(text, players, out, unread):
    """The other layout: a page headed "PRONUNCIATION GUIDE" whose lines are
    "First Last  phonetic". Read only on that page, and only a line that
    starts with a roster name; the phonetic is short and has no figures."""
    names = sorted({form for p in players for form in (p["name"], _bare(p["name"]))}, key=len, reverse=True)
    full = {_bare(p["name"]): p["name"] for p in players}
    full.update({p["name"]: p["name"] for p in players})
    for page in pages_of(text):
        if not re.search(r"PRONUNCIATION GUIDE", page):
            continue
        for r in lines_of(page):
            if re.match(r"^\d", r) or not re.search(r"[a-z]", r):
                continue
            hit = next((n for n in names if r.startswith(n + " ")), None)
            rest = hit and r[len(hit):].strip()
            if hit and rest and not re.search(r"\d", rest) and len(rest.split()) <= 6:
                out[full[hit]] = rest


def captains(text, players=()):
    rows = lines_of(text)
    body = _section(rows, re.compile(r"^\d{4} CAPTAINS$"), [re.compile(r"^(?![•*])")])
    out = [re.sub(r"^[•*]\s*", "", r).strip() for r in body if r[:1] in "•*"]
    if out:
        return out
    # the other layout: each captain's player page, "26 • FIRST LAST (CAPTAIN)",
    # named as the roster names him
    by_no = {}
    for p in players:
        by_no.setdefault(p["no"], []).append(p["name"])
    for r in rows:
        m = re.match(r"^(\d{1,2}) • (.+?) \(CAPTAIN\)$", r)
        if not m:
            continue
        caps = re.sub(r"[^A-Z]", "", NICK.sub("", m.group(2)).upper())
        name = next((n for n in by_no.get(m.group(1), []) if re.sub(r"[^A-Z]", "", n.upper()) == caps), None)
        if name and name not in out:
            out.append(name)
    return out


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


def preseason(text, players):
    """The other layout's honors: "PRESEASON HONORS", then "POS First Last"
    and his honors on the lines after it, comma-separated and wrapped ("All-"
    then "American"), until the next player or the next heading."""
    rows = lines_of(text)
    i = next((k for k, r in enumerate(rows) if r == "PRESEASON HONORS"), None)
    if i is None:
        return {}
    full = {_bare(p["name"]): p["name"] for p in players}
    full.update({p["name"]: p["name"] for p in players})
    head = re.compile(r"^" + POS + r" (?P<name>.+)$")
    out, cur, buf = {}, None, ""

    def flush():
        if cur and buf:
            for h in re.split(r",\s*(?![^()]*\))", buf):
                h = h.strip()
                if h and h not in out.setdefault(cur, []):
                    out[cur].append(h)
    for r in rows[i + 1:]:
        m = head.match(r)
        if m and m.group("name").strip() in full:
            flush()
            cur, buf = full[m.group("name").strip()], ""
        elif not re.search(r"[a-z]", r):
            break                                        # the next heading
        elif cur:
            buf = buf + r if buf.endswith("-") else (buf + " " + r if buf else r)
    flush()
    return out


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


# What makes a bullet the series' own: a word for meetings and a record.
SERIES_WORDS = re.compile(r"\b(?:series|meeting|met|matchups?|played|all-time record)\b", re.I)
RECORD = re.compile(r"\b\d{1,3}-\d{1,3}(?:-\d{1,2})?\b")


def first_and_ten(text, opp):
    """The other layout's front-page column, "FIRST AND TEN": the program's
    facts of the week, most of them not about the opponent. The series card
    takes only the bullets about this game's series - the opponent named,
    with a record or a meeting in it - never the program's own trivia."""
    rows = lines_of(text)
    body = _section(rows, re.compile(r"^FIRST AND TEN$", re.I), [re.compile(r"^BY THE NUMBERS$", re.I)])
    out = []
    for r in body:
        if r[:1] in "\x83•*\uf06e\uf0b7":
            out.append(r[1:].strip())
        elif out:
            out[-1] += ("" if out[-1].endswith("-") else " ") + r
    out = [re.sub(r"\s+", " ", x).strip() for x in out]
    if not opp:
        return []
    return [x for x in out if re.search(r"\b" + re.escape(opp) + r"\b", x, re.I) and RECORD.search(x) and SERIES_WORDS.search(x)]


def numbers(text):
    rows = lines_of(text)
    body = _section(rows, re.compile(r"^(?:INSIDE THE .* - )?BY THE NUMBERS$", re.I),
                    [re.compile(r"^[A-Z][A-Z &/-]{10,}$"), re.compile(r"^[A-Z][A-Z ]+:")])
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
        joined = re.sub(r"(\w+)- (\w)", _rejoin, joined)    # a word broken across a line
        s = first_sentence(joined)
        if s:
            # a space before punctuation goes, never the one before a figure (".870")
            res.append({"n": x["n"], "text": re.sub(r"\s+([,.;:])(?=\s|$)", r"\1", re.sub(r"\s+", " ", s))})
    return res


def opponent(text):
    for r in (text or "").splitlines():
        m = re.match(r"^\s*Game \d+\s*\|\s*(?:vs\.?|at)?\s*(.+?)\s*\|", r.strip(), re.I)
        if m:
            return re.sub(r"\s*\(.*\)$", "", m.group(1)).strip()     # "Wisconsin (Shamrock Series)"
    # the other layout: every page's running header, "HOME TEAM VS. OPPONENT"
    heads = {}
    for r in (text or "").splitlines():
        m = re.match(r"^\s*[A-Z][A-Z .&'’-]+ VS\. ([A-Z][A-Z .&'’()-]+?)\s*$", r)
        if m:
            heads[m.group(1)] = heads.get(m.group(1), 0) + 1
    if heads:
        best = max(heads, key=heads.get)
        return " ".join(w if len(w) <= 3 and w not in ("OLE",) else w.capitalize() for w in best.split())
    return None


def parse(text):
    players = roster(text)
    pr, unread = pronounce(text, players)
    hon, unread2 = honors(text, players)
    for name, items in preseason(text, players).items():
        for h in items:
            if h not in hon.setdefault(name, []):
                hon[name].append(h)
    game = opponent(text)
    return {
        "game": game,
        "roster": players,
        "pronounce": pr,
        "captains": captains(text, players),
        "honors": hon,
        # a short bullet whole ("...40th meeting. The series stands at
        # 25-14-0"), a long one cut to its first sentence: the fact, not the
        # anecdote
        "glance": [x if len(x) <= GLANCE_WHOLE else first_sentence(x) for x in (glance(text) or first_and_ten(text, game))][:GLANCE_MAX],
        "numbers": numbers(text),
        "unread": unread + unread2,
    }


def usable(parsed):
    """Enough read to replace last week's snapshot: a broken reading keeps it."""
    return len(parsed["roster"]) >= 40 and (parsed["pronounce"] or parsed["numbers"] or parsed["glance"])
