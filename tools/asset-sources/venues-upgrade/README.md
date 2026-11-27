# Venue upgrade photos

Candidate replacement stadium photos for weak Home-screen venue backgrounds. Wikimedia Commons only (CC0, public domain, CC BY, CC BY-SA). Each team folder holds the downloaded photo(s) and a `SOURCES.json` with license, credit line, viewpoint and the pixel rows where the field sits.

Nothing here is wired into the app yet.

## Done

### Found

| Team | Venue | Found | Aerial | License | Note |
|---|---|---|---|---|---|
| alabama | Bryant-Denny Stadium | night | no | CC BY-SA 4.0 | Lit, empty bowl from a low corner; field in the lower half. No aerial night photo on Commons. |
| auburn | Jordan-Hare Stadium | day | yes | Public domain | High oblique aerial from the south; field centred, rows ~250-950 of 1800 (2008). |
| boise-state | Albertsons Stadium | day | no | Public domain | Elevated view from the east stands to the west stands and Stueckle Sky Center; field in the lower third. |
| louisiana-tech | Joe Aillet Stadium | day | yes | CC BY 4.0 | High oblique drone view from behind the south end zone; field centred, rows ~500-1450 of 1602. |
| san-diego-state | Snapdragon Stadium | day | yes | CC BY-SA 4.0 | Plane aerial into the empty bowl (2022); field rows ~370-640 of 1000. **Only 1400 px**, below the floor, but the only usable day view. |
| tennessee | Neyland Stadium | day | yes | CC BY 4.0 | Drone from behind the south end zone (Feb 2026); field rows ~375-1220 of 1714. Overcast winter light. |
| usc | LA Memorial Coliseum | day | yes | CC BY 4.0 | Drone over the peristyle looking down the field (Aug 2025), football lines; field rows ~640-1120 of 1680. Converted from PNG. |
| missouri | Memorial Stadium / Faurot Field | day | yes | CC BY-SA 4.0 | Drone from the north hill (2021, after the south end-zone build); field rows ~575-910 of 1418, right at the top-40% line. |
| texas-tech | Jones AT&T Stadium | day | yes | CC0 | Drone over the new south end-zone building (Nov 2024); field rows ~405-585 of 1150. 2048 px native. |
| uconn | Pratt & Whitney Stadium | day | yes | CC BY 4.0 | Drone from the south-east corner (Apr 2026), Hartford skyline; field rows ~640-1100 of 1714. |

### Nothing qualifies (closest misses in each `SOURCES.json`)

| Team | Venue | Wanted | Why not |
|---|---|---|---|
| cincinnati | Nippert Stadium | day | Post-2015 shots are panoramas or soccer layout; the good 4000 px football photo predates the renovation. |
| louisville | L&N Federal Credit Union Stadium | day | No 1600 px+ day bowl view after the 2018 north-end closure. |
| marshall | Joan C. Edwards Stadium | day | Only other day bowl view is a low stands shot dominated by fans. |
| maryland | SECU Stadium | day | Only elevated day shots are the panorama already in use and a dusk pregame panorama. |
| central-michigan | Kelly/Shorts Stadium | day | Only low lower-bowl shots with large heads in front; no aerial. |
| san-jose-state | CEFCU Stadium | day | Good bowl view is a night game; the day aerial is a tiny patch in a city view. |
| florida-atlantic | Flagler CU Stadium | day | Excellent 2026 elevated view exists but at night; day shots are soccer or low. |
| coastal-carolina | Brooks Stadium | day | Only exterior and field-level shots. |
| florida-international | Pitbull Stadium | day | Best is a 2048x680 panorama; the rest are crowd-heavy or soccer. |
| colorado-state | Canvas Stadium | day | Distorted 2018 panorama, a dusk student-section shot, and press-box facade close-ups. |
| middle-tennessee | Floyd Stadium | day | Best framing (MT vs Ga Tech) is only 1440 px at dusk; others have railings/heads. |
| nevada | Mackay Stadium | day | ~25-photo 2019 set is all field level. |
| texas-am | Kyle Field | day | The only post-rebuild bowl shot (2015 panorama) has the field in the bottom half. |
| hawaii | Ching Complex | day | Only one field photo; field in the bottom third under a big sky. |
| uab | Protective Stadium | day | Only two photos; the day one has the field in the bottom 40%. |
| northern-illinois | Huskie Stadium | day | Only one field photo (end-zone view, field in the bottom half). |
| lsu | Tiger Stadium | night | Big 2024 upper-deck set, but all after-dark frames are telephoto crops. A 2021 day drone shot exists. |
| north-carolina | Kenan Stadium | night | Only night shot is portrait with heads in front. A 2025 **day** drone aerial (CC BY 4.0, 5436 px) exists if wanted. |
| georgia | Sanford Stadium | night | 2017 night shot has the field at 56-85% and large heads; others similar. |
| duke | Wallace Wade Stadium | day | Best post-2016 view (2018 VT kickoff, clean, elevated) is dusk under lights with the field in the bottom half. |
| navy | Navy-Marine Corps Memorial Stadium | day | All recent photos are field level; the aerial is decades old. |
| oregon-state | Reser Stadium | day | Only post-2023 view has the field at 56-79% with heads in front. |
| texas-state | UFCU Stadium | day | 2016 empty view has bleachers across the foreground; 2014 panorama likely already in use. |
| utah-state | Maverik Stadium | day | 2017 view has a railing and heads across the bottom; likely already in use. |
| georgia-tech | Bobby Dodd Stadium | night | 2019 night set is low with benches/railings in front and the field at the bottom. |

## How this run worked (2026-11-27)

The run used the Project-LND environment, where `commons.wikimedia.org` is reachable. Two things to know for next time:

- Commons thumbnail URLs now point at `thumb.wikimedia.org`, which this network refuses (proxy 403), and `upload.wikimedia.org` returns HTTP 429. All images were fetched through `commons.wikimedia.org/w/thumb.php?f=<file>&w=<width>`, which works.
- The Commons API rate-limits hard (frequent 429s). The helper waited 2 s between calls and backed off up to ~60 s; nothing was skipped because of it.

Framing notes give the field's pixel rows in the saved file. "Top-40%" was checked against a 16:9 crop; where the field only touches that line (Missouri, Texas Tech) the note says so.
