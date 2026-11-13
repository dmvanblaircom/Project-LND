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
    """A name as the app compares names (teamos/notes.js)."""
    n = re.sub(r"[‘’ʼ`]", "'", str(name or ""))
    n = SUFFIX.sub("", n.strip())
    return re.sub(r"[^a-z']", "", n.lower())


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
    if name is not None:
        hit = keys.get(key(NICK.sub("", name)))
        said = _said(said)
        if not said:
            return None
        return (hit, said) if hit else ("", None)
    # nothing between name and sound: the roster says where the name ends
    words = r.split()
    for k in range(min(5, len(words) - 1), 0, -1):
        hit = keys.get(key(" ".join(words[:k])))
        if hit:
            said = _said(" ".join(words[k:]))
            return (hit, said) if said else None
    return None


def read(text, names):
    keys = {}
    for n in names or []:
        if key(n):
            keys.setdefault(key(n), n)
    out, unmatched, inside, misses = {}, [], False, 0
    for raw in (text or "").splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if not line:
            continue
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
        misses += 1
        if misses > MISSES:
            inside = False
    return out, unmatched
