/* TeamOS - weather, from Open-Meteo, as the Suite's own shape.

   The Home hero shows weather as tertiary information: the kickoff forecast
   before a game, current conditions during one, and nothing when there is
   no answer (decision 0022 #3). This adapter is the only file that knows
   Open-Meteo's payload; the Suite reads Weather:

     { tempF, sky, rainPct, windMph, zone, at }
       sky   plain words ("partly cloudy"); the Suite chooses any glyph
       zone  the venue's IANA time zone, as Open-Meteo reports it - which is
             also the best answer TeamOS has for the day/night rule

   Pure: url() builds the request, the rest read a payload. */

var TeamOS = TeamOS || {};

TeamOS.weather = (function () {
  "use strict";

  var BASE = "https://api.open-meteo.com/v1/forecast";

  function url(lat, lon) {
    return BASE + "?latitude=" + lat + "&longitude=" + lon +
      "&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weather_code" +
      "&current=temperature_2m,precipitation,wind_speed_10m,weather_code" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=16";
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

  // The forecast for the hour nearest `iso`. hourly.time is naive local time
  // at the venue, so the kickoff is shifted by the venue's offset first.
  function at(d, iso) {
    var h = d && d.hourly;
    if (!h || !h.time) return null;
    var off = (d.utc_offset_seconds || 0) * 1000;
    var local = new Date(new Date(iso).getTime() + off);
    if (isNaN(local)) return null;
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

  return { url: url, at: at, current: current, sky: sky };
})();
