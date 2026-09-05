# MMM-BOM-Current

A [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) module that displays current
weather observations for an Australian location, sourced directly from the Bureau of
Meteorology's (BOM) public JSON observations feed.

Unlike most MagicMirror weather modules, this one doesn't go through a third-party weather
API (OpenWeatherMap, Open-Meteo, etc.) — it fetches BOM's own `IDxxxxx.json` observation feed
for a specific weather station and renders temperature, "feels like", wind speed/direction,
and humidity.

## Installation

1. Navigate to your MagicMirror's `modules` folder:
   ```
   cd ~/MagicMirror/modules
   ```
2. Clone this repository:
   ```
   git clone https://github.com/kmbrimble/MMM-BOM-Current.git
   ```

No `npm install` is required — the module has no external dependencies.

## Finding your station's JSON URL

BOM publishes an observations JSON file per weather station under
`http://www.bom.gov.au/fwo/`. To find yours:

1. Go to [BOM's weather observations page](http://www.bom.gov.au/australia/observations/) and
   navigate to your state, then your nearest station.
2. Note the station ID in the URL of that station's page (e.g. `IDQ60901.94576` for
   Brisbane).
3. The JSON feed is at:
   ```
   https://reg.bom.gov.au/fwo/<ID-prefix>/<ID-prefix>.<station>.json
   ```
   e.g. `https://reg.bom.gov.au/fwo/IDQ60901/IDQ60901.94576.json`

## Configuration

Add the module to the `modules` array in `config/config.js`:

```js
{
  module: "MMM-BOM-Current",
  position: "top_right",
  config: {
    url: "https://reg.bom.gov.au/fwo/IDQ60901/IDQ60901.94576.json",
    updateInterval: 10 * 60 * 1000 // 10 minutes
  }
}
```

### Options

| Option            | Details |
|--------------------|---------|
| `url`              | *Required* — the BOM station JSON feed URL for your location. |
| `updateInterval`   | *Optional* — how often to poll BOM, in milliseconds. Default: `600000` (10 minutes). |
| `animationSpeed`   | *Optional* — DOM update animation speed, in milliseconds. Default: `1000`. |
| `units`            | *Optional* — currently informational only; BOM's feed returns metric units. Default: `"metric"`. |
| `lat`, `lon`       | *Optional* — latitude/longitude used to compute sunrise, sunset and civil twilight times shown under the observations. Default: Brisbane (`-27.5333`, `152.9333`). |

## Notes

- This module fetches BOM's feed with a browser-like `User-Agent` header, since BOM's server
  can otherwise reject requests from non-browser clients.
- BOM's public feeds are unauthenticated and rate-limit-sensitive — don't set
  `updateInterval` below a few minutes.
- Sunrise/sunset/civil twilight are computed locally (`suntimes.js`) from `lat`/`lon` — BOM's
  observation feed doesn't carry them, so no extra network request is made.
- Requires the `weather-icons` CSS (bundled with MagicMirror core) for the weather icon glyphs.

## License

MIT — see [LICENSE](LICENSE).
