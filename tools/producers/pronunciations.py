"""How to say the players' names, from any school's game notes (F4: readers
for every school's notes, batch 1; David, 2026-11-12).

    read(text, names) -> ({roster name: "phonetic"}, [line not matched])

Schools set their pronunciation guides differently, under the same heading
("PRONUNCIATION GUIDE", "PRONUNCIATIONS"). Four shapes were found in the
survey of 2026-11-12 (tools/notes_survey.py), and all are read:

    12 Dwight Bootle II ........ BOOT-uhl      a dotted line, numbered or not
    1 Jack Tchienchou: Chen-choo               a colon
    Jermiel (jer-MEEL) Atkins Jr.              in parentheses, after any part
    2 T.Y. Harding Tee-Why                     nothing between them at all

`names` is the roster the app shows (the provider's), and it is the referee:
a line counts only when its name is on that roster, matched as the app
matches (case, punctuation, curly apostrophes and a Jr./III suffix ignored).
So a coach, an opponent, a stray roster row or the wrong document can never
put a name in front of a fan, and where nothing separates name from sound,
the roster says where the name ends. Pure: text in, data out. Names no team.
"""
import re
import unicodedata

HEAD = re.compile(r"^PRONUNCIATIONS?(?: GUIDE)?$", re.I)
# a jersey number or a coach's tag, and any dots after it
LEAD = re.compile(r"^(?:\d{1,2}|HC|AC)(?=[ .])[ .]*")
DOTS = re.compile(r"\s*\.{3,}\s*")
PAREN = re.compile(r"\s*\(([^)]*)\)")
NICK = re.compile(r"\s*[“\"][^”\"]+[”\"]")
SUFFIX = re.compile(r"\s+(?:Jr\.?|Sr\.?|II|III|IV)$", re.I)
# lines read past the last entry before the guide is taken to have ended
MISSES = 10
SAID_MAX = 60


def key(name):
    """A name for finding it on the roster: as the app compares names
    (teamos/notes.js: case, punctuation and a Jr./III suffix ignored), and
    with accents and apostrophes ignored too - the notes' "Tré" and
    "La'Fortune" are the roster's "Tre" and "LaFortune". What is written out
    is always the roster's own spelling, which is what the app looks up."""
    n = unicodedata.normalize("NFKD", str(name or ""))
    n = SUFFIX.sub("", n.strip())
    return re.sub(r"[^a-z]", "", n.lower())


# a person's name: capitalised words, a particle allowed between them
NAME = re.compile(r"^[A-Z][\w'’.-]*(?: (?:[A-Z][\w'’.-]*|de|del|da|di|la|le|van|von|st\.)){1,3}$")


def _said(text):
    """A phonetic as printed, with a PDF's stray spaces mended ("KEY -len"),
    or None when it is not one: figures, a sentence, nothing."""
    s = re.sub(r"\s+", " ", str(text or "")).strip(" .:;-")
    s = re.sub(r"\s+-\s*|-\s+", "-", s)
    s = re.sub(r"(-[A-Z]) ([A-Z])\b", r"\1\2", s)       # "NICE-L Y"
    if not s or len(s) > SAID_MAX or re.search(r"\d", s) or not re.search(r"[A-Za-z]", s):
        return None
    if len(s.split()) > 6 or re.match(r"(?i)prefers\b", s):
        return None
    return s


def _entry(line, keys):
    """One line -> (roster name, phonetic), ("", None) for a line shaped like
    an entry whose name is not on the roster, or None for any other line."""
    r = LEAD.sub("", line).strip()
    if not r:
        return None
    name = said = None
    if DOTS.search(r):
        name, said = DOTS.split(r, 1)
    elif "(" in r and ")" in r:
        name, said = PAREN.sub("", r), " ".join(PAREN.findall(r))
    elif ":" in r:
        name, said = r.split(":", 1)
    shaped = False
    if name is not None:
        name = NICK.sub("", name).strip()
        hit, said = keys.get(key(name)), _said(said)
        if hit and said:
            return (hit, said)
        # an entry for someone the roster does not list - unless the roster
        # finds the name below ("Ben Noome Noom (like “Zoom”)")
        shaped = bool(said and NAME.match(name))
    # nothing between name and sound: the roster says where the name ends
    words = r.split()
    for k in range(min(5, len(words) - 1), 0, -1):
        hit = keys.get(key(" ".join(words[:k])))
        if hit:
            rest = " ".join(words[k:])
            said = _said(rest) if rest.count("(") == rest.count(")") else None
            # two players side by side (a depth chart under the guide) is
            # not one player's name and how to say it
            if said and key(said) in keys:
                said = None
            return (hit, said) if said else None
    return ("", None) if shaped else None


def _rowlike(line):
    """Whether a line is set like a guide's row, whoever it names: numbered,
    with no figures after the number."""
    m = LEAD.match(line)
    return bool(m and re.match(r"\d", line) and not re.search(r"\d", line[m.end():]))


def read(text, names):
    keys = {}
    for n in names or []:
        if key(n):
            keys.setdefault(key(n), n)
    out, unmatched, inside, misses = {}, [], False, 0
    rows = [re.sub(r"\s+", " ", x).strip() for x in (text or "").splitlines()]
    rows = [x for x in rows if x]
    i = 0
    while i < len(rows):
        line = rows[i]
        i += 1
        # a sound that runs onto the next line: "(dee-AN-juh-loh" / "STOCK-er)"
        if inside and line.count("(") > line.count(")") and i < len(rows) and ")" in rows[i] and "(" not in rows[i]:
            line += " " + rows[i]
            i += 1
        if HEAD.match(line):
            inside, misses = True, 0
            continue
        if not inside:
            continue
        e = _entry(line, keys)
        if e and e[0]:
            out.setdefault(e[0], e[1])
            misses = 0
            continue
        if e:
            unmatched.append(line[:120])
        # the guide has ended once its lines stop looking like its rows: a
        # row for someone the roster does not list is still a row
        if not (e or _rowlike(line)):
            misses += 1
            if misses > MISSES:
                inside = False
    return out, unmatched
