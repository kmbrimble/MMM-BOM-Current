/* MMM-BOM-Current: sunrise/sunset/civil-twilight calculator.
 *
 * Standard almanac sun-times algorithm (Sobel/Elwell, "Almanac for
 * Computers" 1990 -- the same formula behind most open sunrise/sunset
 * calculators), public domain. No network call and no dependency: the BOM
 * feeds this module already reads don't carry sun-times data.
 *
 * The formula naturally produces a UT time that can be negative or >24 for
 * longitudes far from Greenwich (e.g. Brisbane's morning events resolve to
 * "the previous UTC day, evening"). Rather than wrapping that by hand and
 * losing the day-shift, it's added as raw hours to a UTC midnight anchor
 * and left to normal Date/epoch arithmetic -- the result is an unambiguous
 * real-world instant, and the caller's local getHours()/getDate() then show
 * the correct local wall-clock day automatically.
 */

(function (root) {
    var ZENITH_OFFICIAL = 90.833; // standard sunrise/sunset (includes atmospheric refraction)
    var ZENITH_CIVIL = 96; // civil twilight

    function toRad(deg) { return (deg * Math.PI) / 180; }
    function toDeg(rad) { return (rad * 180) / Math.PI; }

    // Day-of-year for the LOCAL calendar date the caller wants sun times
    // for ("today" as the kiosk's own clock sees it).
    function dayOfYear(date) {
        var start = Date.UTC(date.getFullYear(), 0, 1);
        var current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
        return Math.floor((current - start) / 86400000) + 1;
    }

    // Returns UT as raw (unwrapped, possibly negative or >24) fractional
    // hours from the day-N UTC midnight anchor, or null if the sun never
    // crosses this zenith on this day (polar day/night -- not a real
    // concern at Australian latitudes, but the formula can produce it and
    // silently returning garbage would be worse).
    function calcEventUtHours(lat, lon, N, zenith, isSunrise) {
        var lngHour = lon / 15;
        var t = isSunrise ? N + (6 - lngHour) / 24 : N + (18 - lngHour) / 24;

        var M = 0.9856 * t - 3.289;

        var L = M + 1.916 * Math.sin(toRad(M)) + 0.020 * Math.sin(toRad(2 * M)) + 282.634;
        L = ((L % 360) + 360) % 360;

        var RA = toDeg(Math.atan(0.91764 * Math.tan(toRad(L))));
        RA = ((RA % 360) + 360) % 360;
        var Lquadrant = Math.floor(L / 90) * 90;
        var RAquadrant = Math.floor(RA / 90) * 90;
        RA = RA + (Lquadrant - RAquadrant);
        RA = RA / 15;

        var sinDec = 0.39782 * Math.sin(toRad(L));
        var cosDec = Math.cos(Math.asin(sinDec));

        var cosH = (Math.cos(toRad(zenith)) - sinDec * Math.sin(toRad(lat))) /
            (cosDec * Math.cos(toRad(lat)));
        if (cosH > 1 || cosH < -1) return null;

        var H = isSunrise ? 360 - toDeg(Math.acos(cosH)) : toDeg(Math.acos(cosH));
        H = H / 15;

        var T = H + RA - 0.06571 * t - 6.622;

        return T - lngHour; // raw UT hours, deliberately not wrapped -- see file header
    }

    // lat/lon in decimal degrees, east/north-positive (matching this repo's
    // config.js convention). date defaults to now; only its local
    // year/month/date is used as the reference day.
    //
    // The raw UT hours this formula produces can, for longitudes far from
    // Greenwich (like Brisbane's), correspond to a UTC calendar day either
    // side of the target local day -- there's no clean single-formula fix,
    // so pick whichever of the three plausible UTC anchor days actually
    // lands back on the requested local calendar date.
    function calculateSunTimes(lat, lon, date) {
        date = date || new Date();
        var N = dayOfYear(date);
        var targetY = date.getFullYear(), targetM = date.getMonth(), targetD = date.getDate();

        function toDateObj(utHoursRaw) {
            if (utHoursRaw === null) return null;
            var utHours = ((utHoursRaw % 24) + 24) % 24;
            for (var dayOffset = -1; dayOffset <= 1; dayOffset++) {
                var candidate = new Date(Date.UTC(targetY, targetM, targetD + dayOffset) + utHours * 3600000);
                if (candidate.getFullYear() === targetY && candidate.getMonth() === targetM && candidate.getDate() === targetD) {
                    return candidate;
                }
            }
            return new Date(Date.UTC(targetY, targetM, targetD) + utHours * 3600000); // shouldn't happen for real-world longitudes
        }

        return {
            civilDawn: toDateObj(calcEventUtHours(lat, lon, N, ZENITH_CIVIL, true)),
            sunrise: toDateObj(calcEventUtHours(lat, lon, N, ZENITH_OFFICIAL, true)),
            sunset: toDateObj(calcEventUtHours(lat, lon, N, ZENITH_OFFICIAL, false)),
            civilDusk: toDateObj(calcEventUtHours(lat, lon, N, ZENITH_CIVIL, false))
        };
    }

    if (typeof module !== "undefined" && module.exports) {
        module.exports = calculateSunTimes;
    } else {
        root.calculateSunTimes = calculateSunTimes;
    }
})(typeof window !== "undefined" ? window : this);

// Self-check: `node modules/MMM-BOM-Current/suntimes.js`
if (typeof require !== "undefined" && require.main === module) {
    var assert = require("assert");
    var calculateSunTimes = module.exports;

    // Brisbane, mid-January (matches this repo's config.js default location).
    var date = new Date(2026, 0, 15, 12, 0);
    var times = calculateSunTimes(-27.5333, 152.9333, date);

    assert(times.sunrise instanceof Date, "sunrise should be a Date");
    assert(times.sunset instanceof Date, "sunset should be a Date");
    assert(times.civilDawn < times.sunrise, "civil dawn should precede sunrise");
    assert(times.sunrise < times.sunset, "sunrise should precede sunset");
    assert(times.sunset < times.civilDusk, "sunset should precede civil dusk");

    // Sanity range in UTC hours (avoids depending on the sandbox's local
    // TZ): Brisbane is UTC+10 with no DST, so mid-summer local sunrise
    // (~04:30-05:30) and sunset (~18:30-19:30) fall at UTC 18:30-19:30 and
    // 08:30-09:30 respectively.
    var sunriseUtcHour = times.sunrise.getUTCHours();
    var sunsetUtcHour = times.sunset.getUTCHours();
    assert(sunriseUtcHour >= 18 && sunriseUtcHour <= 19, "sunrise UTC hour out of expected range: " + sunriseUtcHour);
    assert(sunsetUtcHour >= 8 && sunsetUtcHour <= 9, "sunset UTC hour out of expected range: " + sunsetUtcHour);

    console.log("suntimes.js self-check passed:", JSON.stringify(times));
}
