/* Suite's photography: the stadiums games are played in (David, 2026-11-20).
   Data, not code: a venue is added here, with its files under assets/, and no
   screen changes. Teams are shown by their official marks, never helmets
   (decision 0046).

   Every photograph is a freely licensed one (Creative Commons or public
   domain, from Wikimedia Commons) and carries its credit, which More shows:
   { author, license, licenseUrl, url (its Commons page), changes }. The
   originals and their source records are on the assets/* branches the
   sourcing sessions pushed (tools/asset-sources/), not in the app.

     venues   by Suite's own key. `names` are every spelling the schedule uses
              for the venue (ESPN's fullName), matched case-insensitively;
              `day`/`night` the photo's two lights, each with its widths.
              `neutral` is the stand-in for a venue Suite has no photo of, and
              for neutral sites: a defocused stadium no fan could place. */

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
    // a dome: one photograph serves day and night
    "jma-wireless-dome": {
      label: "JMA Wireless Dome", names: ["JMA Wireless Dome", "Carrier Dome"],
      // from the stands, so the field fills the part of the stage that stays
      // clear above the text (the field-level shots showed only roof and board)
      day: { path: "assets/venues/jma-wireless-dome/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "Unknown author", license: "Public domain", licenseUrl: "https://commons.wikimedia.org/wiki/Template:PD-self",
                       url: "https://commons.wikimedia.org/wiki/File:SUMB_Pre-Game_%22Block_S%22.jpg", changes: "cropped, resized" } }
    },
    // postseason sites (2026-11-25): one photograph each, from the stands so the field shows
    "lucas-oil-stadium": {
      label: "Lucas Oil Stadium", names: ["Lucas Oil Stadium"],
      day: { path: "assets/venues/lucas-oil-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "Missvain", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0",
                       url: "https://commons.wikimedia.org/wiki/File:New_Orleans_Saints_at_Indianapolis_-_October_29_2023_-_Sarah_Stierch_02.jpg", changes: "cropped, resized" } }
    },
    "caesars-superdome": {
      label: "Caesars Superdome", names: ["Caesars Superdome", "Mercedes-Benz Superdome", "Louisiana Superdome"],
      day: { path: "assets/venues/caesars-superdome/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "elisfkc2", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
                       url: "https://commons.wikimedia.org/wiki/File:Super_Bowl_LIX_(54360870302).jpg", changes: "cropped, resized" } }
    },
    "hard-rock-stadium": {
      label: "Hard Rock Stadium", names: ["Hard Rock Stadium"],
      day: { path: "assets/venues/hard-rock-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "Elbert Hampton", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en",
                       url: "https://commons.wikimedia.org/wiki/File:Cleveland_Browns_17-39_Miami_Dolphins_(Nov_13,_2022)_-_Hard_Rock_Stadium_-_file_08.jpg", changes: "cropped, resized" } }
    },
    "att-stadium": {
      label: "AT&T Stadium", names: ["AT&T Stadium"],
      day: { path: "assets/venues/att-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "thatlostdog--", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0",
                       url: "https://commons.wikimedia.org/wiki/File:2015_Advocare_Classic_Kickoff_(Wisconsin_-_Alabama).jpg", changes: "cropped, resized" } }
    },
    "state-farm-stadium": {
      label: "State Farm Stadium", names: ["State Farm Stadium"],
      day: { path: "assets/venues/state-farm-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "Gonzo fan2007", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
                       url: "https://commons.wikimedia.org/wiki/File:Packers_vs_Cardinals_2021_regular_season_game.jpg", changes: "cropped, resized" } }
    },
    "mercedes-benz-stadium": {
      label: "Mercedes-Benz Stadium", names: ["Mercedes-Benz Stadium"],
      day: { path: "assets/venues/mercedes-benz-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "elisfkc from Orlando, FL, United States", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
                       url: "https://commons.wikimedia.org/wiki/File:Peach_Bowl_Pre-game_(38723446434).jpg", changes: "cropped, resized" } }
    },
    "allegiant-stadium": {
      label: "Allegiant Stadium", names: ["Allegiant Stadium"],
      day: { path: "assets/venues/allegiant-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
             credit: { author: "Bobak Ha'Eri", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0",
                       url: "https://commons.wikimedia.org/wiki/File:2024-0901_Vegas_Kickoff_Classic.jpg", changes: "cropped, resized" } }
    },
    neutral: {
      label: "Stadium (softened)",
      day: { path: "assets/venues/neutral/day-{w}.webp", widths: W,
             credit: { author: "Ken Lund", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
                       url: "https://commons.wikimedia.org/wiki/File:Notre_Dame_Stadium,_University_of_Notre_Dame,_South_Bend,_Indiana_(11045855126).jpg",
                       changes: "cropped, softened, darkened, resized" } },
      night: { path: "assets/venues/neutral/night-{w}.webp", widths: W,
               credit: { author: "Ken Lund", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
                         url: "https://commons.wikimedia.org/wiki/File:Notre_Dame_Stadium,_University_of_Notre_Dame,_South_Bend,_Indiana_(11045985644).jpg",
                         changes: "cropped, softened, darkened, resized" } }
    }
  }
}; })([800, 1280, 1920]);
