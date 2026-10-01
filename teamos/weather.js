/* TeamOS - weather, from Open-Meteo, as the Suite's own shape.

   The Home hero shows weather as tertiary information: the kickoff forecast
   before a game, current conditions during one, and nothing when there is
   no answer (decision 0022 #3). This adapter is the only file that knows
   Open-Meteo's payload; the Suite reads Weather:

     { tempF, sky, rainPct, windMph, zone, at }
       sky   plain words ("partly cloudy"); the Suite chooses any glyph
       zone  the venue's IANA time zone, as Open-Meteo reports it - which is
             also the best answer TeamOS has for the day/night rule

   Where a game is played comes from Open-Meteo's geocoder, read here too:
   placeUrl() builds the search, place() reads it as { lat, lon }.

   Pure: url() and placeUrl() build the requests, the rest read a payload. */

var TeamOS = TeamOS || {};

TeamOS.weather = (function () {
  "use strict";

  var BASE = "https://api.open-meteo.com/v1/forecast";
  var GEO = "https://geocoding-api.open-meteo.com/v1/search";
  // The geocoder names a U.S. state in full; a Game carries its postal code.
  var STATES = {AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",CO:"Colorado",
    CT:"Connecticut",DE:"Delaware",DC:"District of Columbia",FL:"Florida",GA:"Georgia",HI:"Hawaii",
    ID:"Idaho",IL:"Illinois",IN:"Indiana",IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",
    ME:"Maine",MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",MS:"Mississippi",
    MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",NH:"New Hampshire",NJ:"New Jersey",
    NM:"New Mexico",NY:"New York",NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
    OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",SD:"South Dakota",
    TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",VA:"Virginia",WA:"Washington",
    WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming"};

  function url(lat, lon) {
    return BASE + "?latitude=" + lat + "&longitude=" + lon +
      "&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code" +
      "&current=temperature_2m,precipitation,wind_speed_10m,weather_code" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=16";
  }

  function placeUrl(q) {
    return GEO + "?name=" + encodeURIComponent(q) + "&count=5&language=en&format=json";
  }
  // The first U.S. hit, in `state` (a postal code) when one is given; null
  // when there is none.
  function place(d, state) {
    var full = state ? STATES[state] || null : null;
    var hits = (d && d.results || []).filter(function (r) {
      return r.country_code === "US" && (!full || r.admin1 === full) && n(r.latitude) != null && n(r.longitude) != null;
    });
    return hits.length ? { lat: hits[0].latitude, lon: hits[0].longitude } : null;
  }

  // WMO weather codes, in plain words.
  function sky(c) {
    if (c === 0) return "clear";
    if (c === 1) return "mostly clear";
    if (c === 2) return "partly cloudy";
    if (c === 3) return "overcast";
    if (c === 45 || c === 48) return "fog";
    if (c >= 51 && c <= 57) return "drizzle";
    if (c >= 61 && c <= 67) return "rain";
    if (c >= 71 && c <= 77) return "snow";
    if (c >= 80 && c <= 82) return "showers";
    if (c === 85 || c === 86) return "snow showers";
    if (c >= 95) return "thunderstorms";
    return "";
  }
  function n(v) { return typeof v === "number" && isFinite(v) ? v : null; }

  // "YYYY-MM-DDTHH:MM" at the venue for the instant `ms`. hourly.time is
  // naive local time there, so the venue's own zone decides it - not today's
  // UTC offset, which is an hour out for a kickoff across a DST change.
  // The offset is only the fallback for a runtime without the zone.
  function localStamp(ms, zone, off) {
    if (zone) {
      try {
        var p = {};
        new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit",
          day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
        return p.year + "-" + p.month + "-" + p.day + "T" + (p.hour === "24" ? "00" : p.hour) + ":" + p.minute;
      } catch (e) { /* an unknown zone: fall through */ }
    }
    return new Date(ms + off).toISOString().slice(0, 16);
  }

  // The forecast for the hour nearest `iso`, at the venue.
  function at(d, iso) {
    var h = d && d.hourly;
    if (!h || !h.time) return null;
    var ms = new Date(iso).getTime();
    if (isNaN(ms)) return null;
    var local = new Date(localStamp(ms, d.timezone, (d.utc_offset_seconds || 0) * 1000) + ":00Z");
    local.setUTCMinutes(Math.round(local.getUTCMinutes() / 60) * 60, 0, 0);
    var i = h.time.indexOf(local.toISOString().slice(0, 16));
    if (i < 0) return null;
    var t = n(h.temperature_2m && h.temperature_2m[i]);
    if (t == null) return null;
    return { tempF: Math.round(t), sky: sky(h.weather_code && h.weather_code[i]),
             rainPct: n(h.precipitation_probability && h.precipitation_probability[i]),
             windMph: n(h.wind_speed_10m && h.wind_speed_10m[i]) == null ? null : Math.round(h.wind_speed_10m[i]),
             zone: d.timezone || null, at: iso };
  }

  // Conditions now, at the venue.
  function current(d) {
    var c = d && d.current;
    if (!c || n(c.temperature_2m) == null) return null;
    return { tempF: Math.round(c.temperature_2m), sky: sky(c.weather_code), rainPct: null,
             windMph: n(c.wind_speed_10m) == null ? null : Math.round(c.wind_speed_10m),
             zone: d.timezone || null, at: c.time || null };
  }

  return { url: url, at: at, current: current, sky: sky, placeUrl: placeUrl, place: place };
})();
