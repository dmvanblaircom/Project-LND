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
    "rose-bowl": {
      label: "Rose Bowl", names: ["Rose Bowl", "Rose Bowl Stadium"],
      // the day source is 2048 wide: cropped to the field it holds 1280
      day: { path: "assets/venues/rose-bowl/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
             credit: { author: "Itsschneebly", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
                       url: "https://commons.wikimedia.org/wiki/File:2020_Rose_Bowl_Game.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/rose-bowl/night-{w}.webp", widths: W, focus: "50% 50%",
               credit: { author: "Spatms", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
                         url: "https://commons.wikimedia.org/wiki/File:2017_Rose_Bowl,_USC_vs_Penn_State_-_Game_Play.jpg", changes: "cropped, resized" } }
    },
    // home stadiums (2026-11-26, David: every team the same experience): from the
    // stands, cropped so the field fills the part of the stage that stays clear
    "falcon-stadium": {
      label: "Falcon Stadium", names: ["Falcon Stadium"],
      day: { path: "assets/venues/falcon-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "David Shankbone", license: "CC BY-SA 3.0", licenseUrl: "http://creativecommons.org/licenses/by-sa/3.0/", url: "https://commons.wikimedia.org/wiki/File:Air_Force_Academy_Falcon_Stadium_by_David_Shankbone.jpg", changes: "cropped, resized" } }
    },
    "infocision-stadium": {
      label: "InfoCision Stadium", names: ["InfoCision Stadium"],
      day: { path: "assets/venues/infocision-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "JEN9841", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:InfoCision_opening_day1.JPG", changes: "cropped, resized" } }
    },
    "bryant-denny-stadium": {
      label: "Bryant-Denny Stadium", names: ["Bryant-Denny Stadium"],
      day: { path: "assets/venues/bryant-denny-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "TylerDurdenXXX", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Alabama_Crimson_Tide_Game.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/bryant-denny-stadium/night-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Matthew Tosh", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", url: "https://commons.wikimedia.org/wiki/File:Bryant-Denny_10-22-11.jpg", changes: "cropped, resized" } }
    },
    "kidd-brewer-stadium": {
      label: "Kidd Brewer Stadium", names: ["Kidd Brewer Stadium"],
      day: { path: "assets/venues/kidd-brewer-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Porsche997SBS", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:KiddBrewerStadium(ViewFromSE).jpg", changes: "cropped, resized" } }
    },
    "kinnick-stadium": {
      label: "Kinnick Stadium", names: ["Kinnick Stadium"],
      day: { path: "assets/venues/kinnick-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "CrdHwk", license: "Public domain", url: "https://commons.wikimedia.org/wiki/File:Iowa_vs._Western_Michigan_2007.jpg", changes: "cropped, resized" } }
    },
    "amfirst-stadium": {
      label: "AmFirst Stadium", names: ["AmFirst Stadium"],
      day: { path: "assets/venues/amfirst-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Thomson M", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0", url: "https://commons.wikimedia.org/wiki/File:Burgess\u2013Snow_Field_at_AmFirst_Stadium_-_panoramio.jpg", changes: "cropped, resized" } }
    },
    "bridgeforth-stadium": {
      label: "Bridgeforth Stadium", names: ["Bridgeforth Stadium"],
      day: { path: "assets/venues/bridgeforth-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Datalore47", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Marching_Royal_Dukes_on_the_Field.jpg", changes: "cropped, resized" } }
    },
    "walens-family-field-at-fifth-third-stadium": {
      label: "Walens Family Field at Fifth Third Stadium", names: ["Walens Family Field at Fifth Third Stadium"],
      day: { path: "assets/venues/walens-family-field-at-fifth-third-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "BullDawg2021", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0", url: "https://commons.wikimedia.org/wiki/File:Fifth_Third_Stadium.jpg", changes: "cropped, resized" } }
    },
    "williams-stadium-va": {
      label: "Williams Stadium (VA)", names: ["Williams Stadium (VA)"],
      day: { path: "assets/venues/williams-stadium-va/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Gregory Koch", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Williams_Stadium_Field.jpg", changes: "cropped, resized" } }
    },
    "joe-aillet-stadium": {
      label: "Joe Aillet Stadium", names: ["Joe Aillet Stadium"],
      day: { path: "assets/venues/joe-aillet-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "AllisonFoley", license: "Public domain", url: "https://commons.wikimedia.org/wiki/File:Joe_Aillet_Stadium,_Louisiana_Tech_Bulldogs,_Ruston,_Louisiana.jpg", changes: "cropped, resized" } }
    },
    "our-lady-of-lourdes-stadium": {
      label: "Our Lady of Lourdes Stadium", names: ["Our Lady of Lourdes Stadium"],
      day: { path: "assets/venues/our-lady-of-lourdes-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Jcarriere (talk)", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0", url: "https://commons.wikimedia.org/wiki/File:UL_set.JPG", changes: "cropped, resized" } }
    },
    "landn-federal-credit-union-stadium": {
      label: "L&N Federal Credit Union Stadium", names: ["L&N Federal Credit Union Stadium"],
      night: { path: "assets/venues/landn-federal-credit-union-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Nolanwebb", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:CardinalStadiumUL7.jpg", changes: "cropped, resized" } }
    },
    "joan-c-edwards-stadium": {
      label: "Joan C. Edwards Stadium", names: ["Joan C. Edwards Stadium"],
      day: { path: "assets/venues/joan-c-edwards-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Davebanner12", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Panoramic_of_Joan_C._Edwards_Stadium.JPG", changes: "cropped, resized" } },
      night: { path: "assets/venues/joan-c-edwards-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Wv funnyman", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Striping_the_Joan_C._Edwards_Stadium.jpg", changes: "cropped, resized" } }
    },
    "secu-stadium": {
      label: "SECU Stadium", names: ["SECU Stadium"],
      // the day panorama curves the field away from the stage's clear band:
      // the night photograph serves day games too
      night: { path: "assets/venues/secu-stadium/night-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Crazycat8590", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:View_from_the_upper_deck_of_SECU_stadium_at_night_2023.jpg", changes: "cropped, resized" } }
    },
    "mountain-america-stadium": {
      label: "Mountain America Stadium", names: ["Mountain America Stadium"],
      day: { path: "assets/venues/mountain-america-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Beyond My Ken", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:2021_Sun_Devil_Stadium_2.jpg", changes: "cropped, resized" } }
    },
    "donald-w-reynolds-razorback-stadium": {
      label: "Donald W. Reynolds Razorback Stadium", names: ["Donald W. Reynolds Razorback Stadium"],
      day: { path: "assets/venues/donald-w-reynolds-razorback-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Brandonrush", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", url: "https://commons.wikimedia.org/wiki/File:Empty_Razorback_Stadium.jpg", changes: "cropped, resized" } }
    },
    "michie-stadium": {
      label: "Michie Stadium", names: ["Michie Stadium"],
      day: { path: "assets/venues/michie-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "United States Military Academy", license: "Public domain", url: "https://commons.wikimedia.org/wiki/File:Connecticut_Huskies_at_Army_Black_Knights_football_(November_19,_2022)_(Flickr_52515372988).jpg", changes: "cropped, resized" } }
    },
    "jordan-hare-stadium": {
      label: "Jordan-Hare Stadium", names: ["Jordan-Hare Stadium"],
      night: { path: "assets/venues/jordan-hare-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Tom Key", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Auburn,_AL,_USA_-_panoramio_-_Tom_Key_(6).jpg", changes: "cropped, resized" } }
    },
    "scheumann-stadium": {
      label: "Scheumann Stadium", names: ["Scheumann Stadium"],
      day: { path: "assets/venues/scheumann-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Temathews1", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Scheumann_Stadium_2.jpg", changes: "cropped, resized" } }
    },
    "mclane-stadium": {
      label: "McLane Stadium", names: ["McLane Stadium"],
      day: { path: "assets/venues/mclane-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Cardinalfan24", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Theline.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/mclane-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Djyueng", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:McLane_Stadium_facingsouth7.16.14.jpg", changes: "cropped, resized" } }
    },
    "albertsons-stadium": {
      label: "Albertsons Stadium", names: ["Albertsons Stadium"],
      night: { path: "assets/venues/albertsons-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Iamneven", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:BSUvsFresnoSt.jpg", changes: "cropped, resized" } }
    },
    "alumni-stadium-chestnut-hill-ma": {
      label: "Alumni Stadium (Chestnut Hill, MA)", names: ["Alumni Stadium (Chestnut Hill, MA)"],
      day: { path: "assets/venues/alumni-stadium-chestnut-hill-ma/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Quintinsoloviev", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Inside_of_Alumni_Stadium_Boston_College_2023_(Quintin_Soloviev).png", changes: "cropped, resized" } }
    },
    "broadview-stadium": {
      label: "Broadview Stadium", names: ["Broadview Stadium"],
      day: { path: "assets/venues/broadview-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Davidhar", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:UB_Stadium_2_picture.JPG", changes: "cropped, resized" } }
    },
    "lavell-edwards-stadium": {
      label: "LaVell Edwards Stadium", names: ["LaVell Edwards Stadium"],
      day: { path: "assets/venues/lavell-edwards-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Ken Lund from Reno, Nevada, USA", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", url: "https://commons.wikimedia.org/wiki/File:Texas_Offensive_Play,_BYU_Cougars_40,_University_of_Texas_Longhorns_21,_Lavell_Edwards_Stadium,_Provo,_Utah_(52)_(9697084131).jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/lavell-edwards-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Ken Lund from Reno, Nevada, USA", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0", url: "https://commons.wikimedia.org/wiki/File:BYU_Cougars_40,_University_of_Texas_Longhorns_21,_Lavell_Edwards_Stadium,_Provo,_Utah_(34)_(9697042789).jpg", changes: "cropped, resized" } }
    },
    "california-memorial-stadium": {
      label: "California Memorial Stadium", names: ["California Memorial Stadium"],
      day: { path: "assets/venues/california-memorial-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Stephen Kaus", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", url: "https://commons.wikimedia.org/wiki/File:Gameday_at_California_Memorial_Stadium.jpg", changes: "cropped, resized" } }
    },
    "kelly-shorts-stadium": {
      label: "Kelly/Shorts Stadium", names: ["Kelly/Shorts Stadium"],
      night: { path: "assets/venues/kelly-shorts-stadium/night-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "PureMichiganChip", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:KellyShorts_Night.jpg", changes: "cropped, resized" } }
    },
    "jerry-richardson-stadium": {
      label: "Jerry Richardson Stadium", names: ["Jerry Richardson Stadium"],
      day: { path: "assets/venues/jerry-richardson-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Alex G. from Charlotte, NC, USA", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", url: "https://commons.wikimedia.org/wiki/File:Jerry_Richardson_Stadium.jpg", changes: "cropped, resized" } }
    },
    "nippert-stadium": {
      label: "Nippert Stadium", names: ["Nippert Stadium"],
      day: { path: "assets/venues/nippert-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Ben Levin", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Nippert_Stadium,_September_2015.JPG", changes: "cropped, resized" } }
    },
    "memorial-stadium-clemson-sc": {
      label: "Memorial Stadium (Clemson, SC)", names: ["Memorial Stadium (Clemson, SC)"],
      day: { path: "assets/venues/memorial-stadium-clemson-sc/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Jason A G", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", url: "https://commons.wikimedia.org/wiki/File:Clemson_Memorial_Stadium,_football_game_vs._U_of_Louisville.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/memorial-stadium-clemson-sc/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Daderot", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", url: "https://commons.wikimedia.org/wiki/File:Clemson_Memorial_Stadium_-_Clemson_University_-_DSC07484.JPG", changes: "cropped, resized" } }
    },
    "brooks-stadium-sc": {
      label: "Brooks Stadium (SC)", names: ["Brooks Stadium (SC)"],
      day: { path: "assets/venues/brooks-stadium-sc/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "PCN02WPS", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:2021_Myrtle_Beach_Bowl_opening_kickoff.jpg", changes: "cropped, resized" } }
    },
    "canvas-stadium": {
      label: "Canvas Stadium", names: ["Canvas Stadium"],
      day: { path: "assets/venues/canvas-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "FarGah1", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Canvas_Stadium.jpg", changes: "cropped, resized" } }
    },
    "folsom-field": {
      label: "Folsom Field", names: ["Folsom Field"],
      day: { path: "assets/venues/folsom-field/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Thelastcanadian", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Folsom_Field_North_Endzone.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/folsom-field/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Thelastcanadian", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Folsom_Field_vs._Utah_2016.jpg", changes: "cropped, resized" } }
    },
    "delaware-stadium": {
      label: "Delaware Stadium", names: ["Delaware Stadium"],
      day: { path: "assets/venues/delaware-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Quintin Soloviev", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0", url: "https://commons.wikimedia.org/wiki/File:Aerial_view_of_Delaware_Stadium_in_2023.jpg", changes: "cropped, resized" } }
    },
    "wallace-wade-stadium": {
      label: "Wallace Wade Stadium", names: ["Wallace Wade Stadium"],
      day: { path: "assets/venues/wallace-wade-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "User:B", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Wallace_Wade_Stadium_2018_panoramic.jpg", changes: "cropped, resized" } }
    },
    "tiger-stadium-la": {
      label: "Tiger Stadium (LA)", names: ["Tiger Stadium (LA)"],
      day: { path: "assets/venues/tiger-stadium-la/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Spatms", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:LSU_Tigers_vs_Nicholls_Colonels_at_Tiger_Stadium_09-07-2024_(31).jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/tiger-stadium-la/night-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Spatms", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:LSU_vs_Army_at_Tiger_Stadium_10-21-2023_(2).jpg", changes: "cropped, resized" } }
    },
    "warren-mcguirk-alumni-stadium": {
      label: "Warren McGuirk Alumni Stadium", names: ["Warren McGuirk Alumni Stadium"],
      day: { path: "assets/venues/warren-mcguirk-alumni-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Yeahimaboss413", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0", url: "https://commons.wikimedia.org/wiki/File:Eastern_Michigan_vs._UMass_football_2026_(EMU_on_offense).jpg", changes: "cropped, resized" } }
    },
    "spartan-stadium": {
      label: "Spartan Stadium", names: ["Spartan Stadium"],
      day: { path: "assets/venues/spartan-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Tony Faiola", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", url: "https://commons.wikimedia.org/wiki/File:Michigan_State_University_-_Spartan_Stadium.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/spartan-stadium/night-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Steven Depolo from Grand Rapids, MI, USA", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", url: "https://commons.wikimedia.org/wiki/File:2015_Michigan_State_vs_Penn_State_Football_Game_East_Lansing_11-28-15_(23088941130).jpg", changes: "cropped, resized" } }
    },
    "michigan-stadium": {
      label: "Michigan Stadium", names: ["Michigan Stadium"],
      day: { path: "assets/venues/michigan-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "BenjaminSmithChef", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Western_Michigan_Broncos_at_Michigan_Wolverines_football_2026_01.jpg", changes: "cropped, resized" } }
    },
    "johnny-red-floyd-stadium": {
      label: "Johnny \"Red\" Floyd Stadium", names: ["Johnny \"Red\" Floyd Stadium"],
      day: { path: "assets/venues/johnny-red-floyd-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Chrstservt", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Murfreesboro,_TN,_USA_-_panoramio.jpg", changes: "cropped, resized" } }
    },
    "huntington-bank-stadium": {
      label: "Huntington Bank Stadium", names: ["Huntington Bank Stadium"],
      day: { path: "assets/venues/huntington-bank-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Bobak Ha'Eri", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0", url: "https://commons.wikimedia.org/wiki/File:2023-0831-NEBvsUMN.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/huntington-bank-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "GoBlue9", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Michigan_vs_Minnesota_at_Huntington_Bank_Stadium.jpg", changes: "cropped, resized" } }
    },
    "davis-wade-stadium": {
      label: "Davis Wade Stadium", names: ["Davis Wade Stadium"],
      day: { path: "assets/venues/davis-wade-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "PCN02WPS", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Davis_Wade_Stadium,_Arkansas_vs._Mississippi_State,_10-26-2024.jpg", changes: "cropped, resized" } }
    },
    "memorial-stadium": {
      label: "Memorial Stadium", names: ["Memorial Stadium"],
      day: { path: "assets/venues/memorial-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Spatms", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:LSU_Tigers_vs_Mizzou_Tigers_2023-10-07_(5).jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/memorial-stadium/night-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Burkouri", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Memorial_Stadium_Faurot_Field.jpg", changes: "cropped, resized" } }
    },
    "navy-marine-corps-memorial-stadium": {
      label: "Navy-Marine Corps Memorial Stadium", names: ["Navy-Marine Corps Memorial Stadium"],
      day: { path: "assets/venues/navy-marine-corps-memorial-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "US Department of Defense", license: "Public domain", url: "https://commons.wikimedia.org/wiki/File:2014_Military_Bowl.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/navy-marine-corps-memorial-stadium/night-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Damon J. Moritz", license: "Public domain", url: "https://commons.wikimedia.org/wiki/File:2005_Stanford-Navy_Game_at_Navy-Marine_Corps_Memorial_Stadium.jpg", changes: "cropped, resized" } }
    },
    "carter-finley-stadium": {
      label: "Carter-Finley Stadium", names: ["Carter-Finley Stadium"],
      day: { path: "assets/venues/carter-finley-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Jbrubins", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Carter-Finley_Stadium_during_NCSU_Game.JPG", changes: "cropped, resized" } }
    },
    "memorial-stadium-lincoln": {
      label: "Memorial Stadium (Lincoln", names: ["Memorial Stadium (Lincoln"],
      day: { path: "assets/venues/memorial-stadium-lincoln/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "HuskerPower", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", url: "https://commons.wikimedia.org/wiki/File:MemorialStadium_260912.jpg", changes: "cropped, resized" } }
    },
    "mackay-stadium": {
      label: "Mackay Stadium", names: ["Mackay Stadium"],
      day: { path: "assets/venues/mackay-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Lanski", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Mackay_10oct2015.jpg", changes: "cropped, resized" } }
    },
    "aggie-memorial-stadium": {
      label: "Aggie Memorial Stadium", names: ["Aggie Memorial Stadium"],
      day: { path: "assets/venues/aggie-memorial-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Quintin Soloviev", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0", url: "https://commons.wikimedia.org/wiki/File:Aggie_Memorial_Stadium_field.jpg", changes: "cropped, resized" } }
    },
    "university-stadium-nm": {
      label: "University Stadium (NM)", names: ["University Stadium (NM)"],
      day: { path: "assets/venues/university-stadium-nm/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Nrtvxc", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Stadium_During_Football_Game.jpg", changes: "cropped, resized" } }
    },
    "kenan-stadium": {
      label: "Kenan Stadium", names: ["Kenan Stadium"],
      day: { path: "assets/venues/kenan-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Yeungb", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0", url: "https://commons.wikimedia.org/wiki/File:Kenan_Memorial_Stadium.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/kenan-stadium/night-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Whitneybarker", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Kenan_Stadium_-_UNC_vs._Liberty_(cropped).JPG", changes: "cropped, resized" } }
    },
    "fargodome": {
      label: "Fargodome", names: ["Fargodome"],
      day: { path: "assets/venues/fargodome/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Bobak Ha'Eri", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0", url: "https://commons.wikimedia.org/wiki/File:2026-1017_Fargodome.JPG", changes: "cropped, resized" } }
    },
    "datcu-stadium": {
      label: "DATCU Stadium", names: ["DATCU Stadium"],
      day: { path: "assets/venues/datcu-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Michael Barera", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Southern_Methodist_vs._North_Texas_football_2018_01_(North_Texas_warming_up).jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/datcu-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Michael Barera", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Southern_Methodist_vs._North_Texas_football_2018_24_(Green_Brigade_Marching_Band).jpg", changes: "cropped, resized" } }
    },
    "huskie-stadium": {
      label: "Huskie Stadium", names: ["Huskie Stadium"],
      day: { path: "assets/venues/huskie-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Kingfish60559", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:NIU_Huskie_Stadium_76881w.jpg", changes: "cropped, resized" } }
    },
    "ryan-field": {
      label: "Ryan Field", names: ["Ryan Field"],
      day: { path: "assets/venues/ryan-field/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Candycaneman", license: "CC0", licenseUrl: "http://creativecommons.org/publicdomain/zero/1.0/deed.en", url: "https://commons.wikimedia.org/wiki/File:Ball_State_Cardinals_at_Northwestern_Wildcats_football_view_from_west_sideline_main_concourse_(2026-10-10).jpg", changes: "cropped, resized" } }
    },
    "peden-stadium": {
      label: "Peden Stadium", names: ["Peden Stadium"],
      day: { path: "assets/venues/peden-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Marching110", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:2011_DiamondOhio.JPG", changes: "cropped, resized" } },
      night: { path: "assets/venues/peden-stadium/night-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "NotJamestack", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Peden_Stadium_at_Night.jpg", changes: "cropped, resized" } }
    },
    "memorial-stadium-norman-ok": {
      label: "Memorial Stadium (Norman, OK)", names: ["Memorial Stadium (Norman, OK)"],
      day: { path: "assets/venues/memorial-stadium-norman-ok/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Spatms", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:LSU_with_the_football,_LSU_vs_Oklahoma,_2025_(1).jpg", changes: "cropped, resized" } }
    },
    "s-b-ballard-stadium": {
      label: "S.B. Ballard Stadium", names: ["S.B. Ballard Stadium"],
      day: { path: "assets/venues/s-b-ballard-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Dough4872", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Old_Dominion_Monarchs_versus_Louisiana_Ragin_Cajuns_football_game_at_SB_Ballard_Stadium_9-9-2023.jpeg", changes: "cropped, resized" } }
    },
    "vaught-hemingway-stadium": {
      label: "Vaught-Hemingway Stadium", names: ["Vaught-Hemingway Stadium"],
      day: { path: "assets/venues/vaught-hemingway-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Jaggerhornik", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Vaught_Hemingway_Stadium,_Arkansas_at_Ole_Miss_2021.jpg", changes: "cropped, resized" } }
    },
    "reser-stadium": {
      label: "Reser Stadium", names: ["Reser Stadium"],
      day: { path: "assets/venues/reser-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Thomasg86", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Reser_Stadium_viewed_from_the_South_Endzone,_September_16,_2023.jpg", changes: "cropped, resized" } }
    },
    "autzen-stadium": {
      label: "Autzen Stadium", names: ["Autzen Stadium"],
      day: { path: "assets/venues/autzen-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Another Believer", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Autzen_Stadium,_Eugene,_Oregon_-_13_(2012).JPG", changes: "cropped, resized" } },
      night: { path: "assets/venues/autzen-stadium/night-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Another Believer", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Autzen_Stadium,_Eugene,_Oregon_-_25_(2012).JPG", changes: "cropped, resized" } }
    },
    "beaver-stadium": {
      label: "Beaver Stadium", names: ["Beaver Stadium"],
      day: { path: "assets/venues/beaver-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "JohnDziak", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Penn_State_football_game_near_sunset_in_September_2015.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/beaver-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Batistaya", license: "Public domain", url: "https://commons.wikimedia.org/wiki/File:Football_court_Psu-vs-ohio-st-102707-003.jpg", changes: "cropped, resized" } }
    },
    "first-community-stadium": {
      label: "First Community Stadium", names: ["First Community Stadium"],
      day: { path: "assets/venues/first-community-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Quintin Soloviev", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0", url: "https://commons.wikimedia.org/wiki/File:Wide-angle_of_Rice_Stadium_in_Houston,_Texas_2024.jpg", changes: "cropped, resized" } }
    },
    "snapdragon-stadium": {
      label: "Snapdragon Stadium", names: ["Snapdragon Stadium"],
      night: { path: "assets/venues/snapdragon-stadium/night-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Spatms", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Snapdragon_Stadium_interior-Night_end_zone_2.jpg", changes: "cropped, resized" } }
    },
    "cefcu-stadium": {
      label: "CEFCU Stadium", names: ["CEFCU Stadium"],
      night: { path: "assets/venues/cefcu-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Arbor to SJ", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:SJSU_Marching_Band_performs_at_2015_homecoming.jpg", changes: "cropped, resized" } }
    },
    "gerald-j-ford-stadium": {
      label: "Gerald J. Ford Stadium", names: ["Gerald J. Ford Stadium"],
      day: { path: "assets/venues/gerald-j-ford-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Michael Barera", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Tulsa_vs._Southern_Methodist_football_2021_03_(Southern_Methodist_University_Mustang_Band).jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/gerald-j-ford-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "HavanaHeat", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:View_of_Gerald_J_Ford_Stadium_after_renovations,_20224.jpg", changes: "cropped, resized" } }
    },
    "williams-brice-stadium": {
      label: "Williams-Brice Stadium", names: ["Williams-Brice Stadium"],
      day: { path: "assets/venues/williams-brice-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Tom Key", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Richland_County,_SC,_USA_-_panoramio_-_Tom_Key_(2).jpg", changes: "cropped, resized" } }
    },
    "raymond-james-stadium": {
      label: "Raymond James Stadium", names: ["Raymond James Stadium"],
      day: { path: "assets/venues/raymond-james-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Bernard Gagnon", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0", url: "https://commons.wikimedia.org/wiki/File:Raymond_James_Stadium02.JPG", changes: "cropped, resized" } },
      night: { path: "assets/venues/raymond-james-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Trevorrrrvalent", license: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0", url: "https://commons.wikimedia.org/wiki/File:USF_Bulls_Miami_Hurricanes_September_2024.jpg", changes: "cropped, resized" } }
    },
    "m-m-roberts-stadium": {
      label: "M. M. Roberts Stadium", names: ["M. M. Roberts Stadium"],
      day: { path: "assets/venues/m-m-roberts-stadium/day-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Flacourtophile", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:USM_Roberts_stadium.jpg", changes: "cropped, resized" } }
    },
    "stanford-stadium": {
      label: "Stanford Stadium", names: ["Stanford Stadium"],
      day: { path: "assets/venues/stanford-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Daniel Hartwig", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", url: "https://commons.wikimedia.org/wiki/File:Stanford_vs_UCLA_football_2013.jpg", changes: "cropped, resized" } }
    },
    "amon-g-carter-stadium": {
      label: "Amon G. Carter Stadium", names: ["Amon G. Carter Stadium"],
      day: { path: "assets/venues/amon-g-carter-stadium/day-{w}.webp", widths: W, focus: "50% 50%",
        credit: { author: "Michael Barera", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Southern_Methodist_vs._Texas_Christian_football_2019_02_(opening_kickoff).jpg", changes: "cropped, resized" } }
    },
    "lincoln-financial-field": {
      label: "Lincoln Financial Field", names: ["Lincoln Financial Field"],
      day: { path: "assets/venues/lincoln-financial-field/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "JJonahJackalope", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Lincoln_Financial_Field,_Philadelphia,_2024.jpg", changes: "cropped, resized" } },
      night: { path: "assets/venues/lincoln-financial-field/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Quintin3265", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:2017-18_NFC_championship_game.jpg", changes: "cropped, resized" } }
    },
    "neyland-stadium": {
      label: "Neyland Stadium", names: ["Neyland Stadium"],
      night: { path: "assets/venues/neyland-stadium/night-{w}.webp", widths: [800, 1280], focus: "50% 50%",
        credit: { author: "Bama in ATL", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:2012_Alabama_at_Tennessee_NCAA_Football_Game.jpg", changes: "cropped, resized" } }
    },
    "kyle-field": {
      label: "Kyle Field", names: ["Kyle Field"],
      day: { path: "assets/venues/kyle-field/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Janreagan at English Wikipedia", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Kyle_Field_Panorama.jpg", changes: "cropped, resized" } }
    },
    "ufcu-stadium": {
      label: "UFCU Stadium", names: ["UFCU Stadium"],
      day: { path: "assets/venues/ufcu-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "Greenstrat", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0", url: "https://commons.wikimedia.org/wiki/File:Texas_State'_Bobcat_Stadium_Wide_View.JPG", changes: "cropped, resized" } }
    },
    "galaxy-stadium": {
      label: "Galaxy Stadium", names: ["Galaxy Stadium"],
      day: { path: "assets/venues/galaxy-stadium/day-{w}.webp", widths: [800], focus: "50% 50%",
        credit: { author: "John McStravick", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0", url: "https://commons.wikimedia.org/wiki/File:Jones_AT&T_Stadium_wide_shot.jpg", changes: "cropped, resized" } }
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
