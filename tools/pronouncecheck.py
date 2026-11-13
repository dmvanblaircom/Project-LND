#!/usr/bin/env python3
"""Any school's pronunciation guide, read against the roster the app shows
(tools/producers/pronunciations.py; F4 batch 1).

The fixtures are nine schools' real guides, as their notes' text came out of
the PDF on 2026-11-12 (tools/notes_survey.py --dump): four shapes, and the
PDF's own damage ("T amarion", "KEY -len"). The rosters here are a few of
each school's players, spelled as a provider would - with a decoy - because
the roster, not the notes, decides who is a player. No network.

    python3 tools/pronouncecheck.py      (exit 1 on any failure)
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "producers"))
import pronunciations as P  # noqa: E402
import official_notes as N  # noqa: E402

failures = 0


def ok(cond, what):
    global failures
    print("  %s %s" % ("ok  " if cond else "FAIL", what))
    if not cond:
        failures += 1


def fx(team):
    return open(os.path.join(HERE, "fixtures", "notes-pronounce-%s.txt" % team), encoding="utf-8").read()


def said(team, roster):
    return P.read(fx(team), roster)[0]


print("a dotted line (Arizona, Akron, Coastal Carolina)")
az = said("arizona", ["Dwight Bootle II", "Matai Tagoa’i", "Tre Smith", "Tre Spivey", "Nobody Here"])
ok(az == {"Dwight Bootle II": "BOOT-uhl", "Matai Tagoa’i": "tun-go-WAH-ee", "Tre Smith": "trey", "Tre Spivey": "trey SPY-vee"},
   "numbered, with dots on both sides; a suffix, a curly apostrophe and an accent (\"Tré\") still match, "
   "under the roster's own spelling; a coach's line "
   "(\"Brett Arce (Are-see) Safeties Coach\") is not a player's: %s" % az)
ak = said("akron", ["Jean Louis III", "Cibastian Broughton"])
ok(ak == {"Jean Louis III": "Jean LOUIE", "Cibastian Broughton": "SEBASTIAN BROUGHT-TON"}, "the whole name respelled: %s" % ak)
cc = said("coastal-carolina", ["Tamarion LaFortune", "Dominic Lee-Knicely", "Xzavier Booker"])
ok(cc == {"Tamarion LaFortune": "tuh-MAIR-ee-in Luh-FOR-tune", "Dominic Lee-Knicely": "LEE NICE-LY", "Xzavier Booker": "Ex-ay-vee-er"},
   "no number; the PDF's split letters mended in the name (\"T amarion\") and the sound (\"NICE-L Y\"); "
   "the roster row below the guide (\"35 Xzavier Booker Jr. DT 6-2 325\") changes nothing: %s" % cc)

print("a colon (Tulane)")
tu = said("tulane", ["Jack Tchienchou", "E'zaiah Shine", "Zeon Chriss-Gremillion"])
ok(tu == {"Jack Tchienchou": "Chen-choo", "E'zaiah Shine": "E-zy-uh"},
   "and a line whose name is not the roster's (\"9 Zeon Chriss GRIM-ee-on\") is left out, not guessed: %s" % tu)

print("in parentheses (Pittsburgh, Kentucky)")
pi = said("pittsburgh", ["Keylen Davis", "Akram Elnagmi", "Cataurus Hicks", "Elijah Lagg", "D'Angelo Stocker", "Netinho Olivieri"])
ok(pi == {"Keylen Davis": "KEY-len", "Akram Elnagmi": "ah-KRAHM el-NAHG-mee", "Elijah Lagg": "lag",
          "D'Angelo Stocker": "dee-AN-juh-loh STOCK-er", "Netinho Olivieri": "neh-TEEN-yo oh-liv-ee-AIR-ee"},
   "\"KEY -len\" mended; a nickname note (prefers \"Blue\") is not a pronunciation; "
   "a depth-chart line (\"17 Elijah Lagg (SR, 6-2, 235)\") is not one either; a sound that runs onto the "
   "next line is read whole, never cut off (dry run, 2026-11-13): %s" % pi)
ky = said("kentucky", ["Jermiel Atkins", "Olaus Alinen", "Ahmad Breaux"])
ok(ky == {"Jermiel Atkins": "jer-MEEL", "Olaus Alinen": "OH-louse AH-lee-nen", "Ahmad Breaux": "BROH"},
   "after the first name, the last, or both; the roster's own spelling is the key (no Jr.): %s" % ky)

print("nothing between name and sound (Troy, UMass, Virginia Tech)")
tr = said("troy", ["Marcus Goree Jr.", "Mojo Dortch", "Kristian Tate"])
ok(tr == {"Marcus Goree Jr.": "GORY", "Mojo Dortch": "Rhymes with PORCH", "Kristian Tate": "KRISH-tin"},
   "the roster says where the name ends, suffix included; the roster row further down "
   "(\"7 Kristian Tate WR 6-2 171\") does not replace it; the head coach's line (\"HC Gerad Parker ...\") "
   "is not a player's: %s" % tr)
um = said("massachusetts", ["TY Harding", "Kezion Dia-Johnson", "Da'Marion Alberic", "Ben Noome"])
ok(um == {"TY Harding": "Tee-Why", "Kezion Dia-Johnson": "Kah-ZYE-on Dee-AH Johnson", "Da'Marion Alberic": "Duh-mar-EE-ON",
          "Ben Noome": "Noom (like “Zoom”)"},
   "initials with or without periods, a hyphenated surname, a hint in parentheses after the sound: %s" % um)
vt = said("virginia-tech", ["Jason Abbey", "Randy Adirika"])
ok(vt == {"Jason Abbey": "JAY-suhn AB-ee", "Randy Adirika": "RAN-dee ad-ih-REE-kuh"}, "every word respelled: %s" % vt)

print("the roster is the referee")
ok(said("pittsburgh", ["Marcus Goree Jr.", "Mojo Dortch", "Jason Abbey"]) == {}, "another school's notes name none of our players: nothing")
ok(P.read("12 Dwight Bootle II ........ BOOT-uhl\nRyan Baer (Bear)\n", ["Dwight Bootle II", "Ryan Baer"])[0] == {},
   "outside a pronunciation guide nothing is read")
long_tail = "PRONUNCIATION GUIDE\nRyan Baer (Bear)\n" + "a line of prose\n" * (P.MISSES + 1) + "Ty Banco (BANK-oh)\n"
ok(P.read(long_tail, ["Ryan Baer", "Ty Banco"])[0] == {"Ryan Baer": "Bear"}, "the guide ends once its lines stop being entries")
out, unmatched = P.read("PRONUNCIATIONS\nRyan Baer (Bear)\nSome Coach (KOHCH)\n", ["Ryan Baer"])
ok(out == {"Ryan Baer": "Bear"} and unmatched == ["Some Coach (KOHCH)"], "an entry for someone not on the roster is counted, not shown")
ok(P.read("PRONUNCIATION GUIDE\n1 Ryan Baer Bear\n12 Ty Banco Sam Hunsaker\n", ["Ryan Baer", "Ty Banco", "Sam Hunsaker"])[0] == {"Ryan Baer": "Bear"},
   "two players on one line (a depth chart under the guide) is not a pronunciation")
ok(P.read("PRONUNCIATION GUIDE\nRyan Baer (4-3, 2-1 ACC)\nTy Banco: 6-2 215\n", ["Ryan Baer", "Ty Banco"])[0] == {}, "figures are not a pronunciation")
ok(P.key("Da’Marion Alberic Jr.") == P.key("damarion alberic") == P.key("Dá'Marion Alberic III") == "damarionalberic",
   "a name is found with case, punctuation, apostrophes, accents and a suffix ignored")
out, unmatched = P.read("PRONUNCIATION GUIDE\nRyan Baer (Bear)\n(primary contact)\nPasquale e-mail: dp@example.edu\n", ["Ryan Baer"])
ok(unmatched == [], "a line that is not a name is not counted as an entry: %s" % unmatched)

print("which document is the week's (official_notes.py)")
links = [("2026-11-09", "ours-g10"), ("2026-11-09", "theirs-g10"), ("2026-11-02", "ours-g9"), ("2025-11-10", "last-year"), ("2026-12-25", "future")]
ok(N.this_season(sorted(links, reverse=True), "2026-11-12") == [("2026-11-09", "theirs-g10"), ("2026-11-09", "ours-g10"), ("2026-11-02", "ours-g9")],
   "this season's, not dated after today, newest first")
ok(N.this_season([("2026-01-02", "bowl"), ("2025-06-30", "spring")], "2026-01-05") == [("2026-01-02", "bowl")], "in January the season is last year's")
five = {"n%d" % i: "x" for i in range(N.MIN_SAID)}
reads = []


def read(doc):
    reads.append(doc)
    return (five, []) if doc.startswith("ours") else ({"n1": "x"}, [])


season = N.this_season(sorted(links, reverse=True), "2026-11-12")
got = N.choose(season, None, set(), read)
ok(got[0] == "read" and got[3] == "ours-g10" and got[1] == ["theirs-g10"] and reads == ["theirs-g10", "ours-g10"],
   "the opponent's notes, filed under the same label, are passed over and remembered; ours are the week's")
reads.clear()
again = N.choose(season, {"sourceUrl": "ours-g10", "parser": N.SAY_PARSER}, {"theirs-g10"}, read)
ok(again == ("kept", []) and reads == [], "the next run downloads nothing: the skipped one is remembered and ours is already read")
reads.clear()
none = N.choose([("2026-11-09", "theirs-a"), ("2026-11-08", "theirs-b"), ("2026-11-07", "theirs-c"), ("2026-11-01", "ours-old")], None, set(), read)
ok(none == ("none", ["theirs-a", "theirs-b", "theirs-c"]) and len(reads) == N.TRY, "only the newest three are tried; with none ours, what there was stays")
ok(N.choose(season, {"sourceUrl": "ours-g10", "parser": "say-0"}, set(), read)[0] == "read", "a changed reading reads the same document again")
ok(N.refused("ohio-state", None, True) and "nothing was read or written" in N.refused("ohio-state", None, True),
   "a dry run of a team read whole is refused before anything is fetched or written (Codex, #258)")
ok(N.refused("ohio-state", None, False) is None and N.refused("arizona", ["pronounce"], True) is None
   and N.refused("arizona", ["pronounce"], False) is None, "the whole reading, and the pronunciation reading dry or not, go on")
ok("not a reading" in N.refused("arizona", ["numbers"], False), "a reading this producer does not have is refused")


def no_roster(doc):
    raise N.NoRoster(3)


try:
    N.choose(season, None, set(), no_roster)
    ok(False, "a roster that did not answer stops the reading")
except N.NoRoster:
    ok(True, "a roster that did not answer stops the reading: no document is judged, none remembered as skipped")
ok(N.roster_names({"athletes": [{"items": [{"displayName": "A B"}, {"fullName": "C D"}]}, {"items": [{}]}]}) == ["A B", "C D"],
   "the provider's roster, every group")

print("\n%s" % ("all passed" if not failures else "%d failed" % failures))
sys.exit(1 if failures else 0)
