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

var TEAM_ART = {
  venues: {},
  helmets: {
    "ohio-state": {
      label: "Ohio State",
      path: "assets/helmets/ohio-state-{w}.webp", widths: [480, 960],
      facing: "left", mirror: false,      // Buckeye leaves and a maker's name: never flipped
      credit: { author: "Erik Drost", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0",
                url: "https://commons.wikimedia.org/wiki/File:Ohio_State_Buckeyes_(50803332572).jpg",
                changes: "background removed, cropped, resized" }
    }
  }
};
