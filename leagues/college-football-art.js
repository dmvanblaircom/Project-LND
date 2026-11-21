/* Suite's photography: the stadiums games are played in, and teams' helmets
   (David, 2026-11-20). Data, not code: a venue or a helmet is added here, with
   its files under assets/, and no screen changes.

   Every photograph is a freely licensed one (Creative Commons or public
   domain, from Wikimedia Commons) and carries its credit, which More shows:
   { author, license, licenseUrl, url (its Commons page), changes }. The
   originals and their source records are on the assets/* branches the
   sourcing sessions pushed (tools/asset-sources/), not in the app.

     venues   by Suite's own key. `names` are every spelling the schedule uses
              for the venue (ESPN's fullName), matched case-insensitively;
              `day`/`night` the photo's two lights, each with its widths.
              `neutral` is the stand-in for a venue Suite has no photo of, and
              for neutral sites: a defocused stadium no fan could place.
     helmets  by the team's Suite id (teams/index.js). `facing` is the way the
              helmet in the photo faces ("left" or "right"); `mirror` says
              whether it may be flipped to face the other way (false when the
              helmet carries lettering or a numeral a flip would reverse).
              A team with no helmet here shows its official mark instead -
              never another team's helmet recoloured (asset guidance,
              2026-11-20). */

var TEAM_ART = (function (W) { return {
  venues: {
    "notre-dame-stadium": {
      label: "Notre Dame Stadium", names: ["Notre Dame Stadium"],
      day: { path: "assets/venues/notre-dame-stadium/day-{w}.webp", widths: W, focus: "50% 58%",
             credit: { author: "MC1 Daniel Hinton, U.S. Navy", license: "Public domain",
                       url: "https://commons.wikimedia.org/wiki/File:Fans_and_players_gather_for_a_football_game_Sept._6,_2014,_at_Notre_Dame_Stadium_in_South_Bend,_Ind_140906-D-KC128-220.jpg",
                       changes: "cropped, resized" } },
      night: { path: "assets/venues/notre-dame-stadium/night-{w}.webp", widths: W, focus: "50% 55%",
               credit: { author: "Eccekevin", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
                         url: "https://commons.wikimedia.org/wiki/File:NotreDameStadiumNight.jpg", changes: "cropped, resized" } }
    },
    "ohio-stadium": {
      label: "Ohio Stadium", names: ["Ohio Stadium"],
      // no freely licensed night photograph found yet: night games show the day one
      day: { path: "assets/venues/ohio-stadium/day-{w}.webp", widths: W, focus: "62% 55%",
             credit: { author: "Dan Keck", license: "CC0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
                       url: "https://commons.wikimedia.org/wiki/File:Ohio_Stadium_(37516165921).jpg", changes: "cropped, resized" } }
    },
    // the stand-in: blurred and darkened into the file, so no fan could place it
    neutral: {
      label: "Stadium (blurred)",
      day: { path: "assets/venues/neutral/day-{w}.webp", widths: W,
             credit: { author: "Ken Lund", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
                       url: "https://commons.wikimedia.org/wiki/File:Notre_Dame_Stadium,_University_of_Notre_Dame,_South_Bend,_Indiana_(11045855126).jpg",
                       changes: "cropped, blurred, darkened, resized" } },
      night: { path: "assets/venues/neutral/night-{w}.webp", widths: W,
               credit: { author: "Ken Lund", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
                         url: "https://commons.wikimedia.org/wiki/File:Notre_Dame_Stadium,_University_of_Notre_Dame,_South_Bend,_Indiana_(11045985644).jpg",
                         changes: "cropped, blurred, darkened, resized" } }
    }
  },
  helmets: {
    "notre-dame": {
      label: "Notre Dame",
      // the standard gold shell, unworn, in a display case: the one Commons
      // photo that qualifies (2026-11-21 search); 480 wide is all it holds
      path: "assets/helmets/notre-dame-{w}.webp", widths: [480],
      facing: "right", mirror: true,      // a plain shell, no decal: flipped to face a right-hand opponent
      credit: { author: "Ken Lund", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
                url: "https://commons.wikimedia.org/wiki/File:Notre_Dame_Memorabilia,_Joyce_Center,_University_of_Notre_Dame,_South_Bend,_Indiana_(11045747785).jpg",
                changes: "cropped, background removed, glare reduced, colour corrected, resized" }
    },
    "ohio-state": {
      label: "Ohio State",
      path: "assets/helmets/ohio-state-{w}.webp", widths: [480, 960],
      facing: "left", mirror: false,      // Buckeye leaves and a maker's name: never flipped
      credit: { author: "Erik Drost", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0",
                url: "https://commons.wikimedia.org/wiki/File:Ohio_State_Buckeyes_(50803332572).jpg",
                changes: "background removed, cropped, resized" }
    }
  }
}; })([800, 1280, 1920]);
