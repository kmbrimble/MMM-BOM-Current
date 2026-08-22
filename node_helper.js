/* MagicMirror²
 * Module: MMM-BOM-Current
 *
 * By Kieren McDonald
 * MIT Licensed.
 */

const NodeHelper = require("node_helper");
const https = require("https");

const MIN_FETCH_INTERVAL_MS = 5 * 60 * 1000; // floor beneath any configured updateInterval

module.exports = NodeHelper.create({
    start: function() {
        console.log("MMM-BOM-Current: Helper started. Waiting for frontend...");
        this.lastFetchTime = 0;
        this.lastData = null;
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_BOM_OBSERVATIONS") {
            const now = Date.now();
            if (now - this.lastFetchTime < MIN_FETCH_INTERVAL_MS) {
                console.log("MMM-BOM-Current: Below minimum interval of " + MIN_FETCH_INTERVAL_MS + "ms, serving cached data instead of re-fetching.");
                if (this.lastData) {
                    this.sendSocketNotification("BOM_OBSERVATIONS_RESULT", this.lastData);
                }
                return;
            }
            console.log("MMM-BOM-Current: Request received for URL: " + payload);
            this.getBomData(payload);
        }
    },

    getBomData: function(url) {
        const self = this;

        const options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Cache-Control": "no-cache"
            }
        };

        https.get(url, options, (res) => {
            console.log("MMM-BOM-Current: BOM Server responded with Status Code: " + res.statusCode);

            if (res.statusCode !== 200) {
                console.error("MMM-BOM-Current: Failed to connect. Status: " + res.statusCode);
                res.resume(); // Consume response to free up memory
                return;
            }

            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    
                    // Validate data structure
                    if (json.observations && json.observations.data && json.observations.data[0]) {
                        console.log("MMM-BOM-Current: Valid data received. Temp: " + json.observations.data[0].air_temp);
                        self.lastFetchTime = Date.now();
                        self.lastData = json.observations.data[0];
                        self.sendSocketNotification("BOM_OBSERVATIONS_RESULT", self.lastData);
                    } else {
                        console.error("MMM-BOM-Current: JSON structure is unexpected.", json);
                    }
                } catch (e) {
                    console.error("MMM-BOM-Current: JSON Parse Error. The server might be sending HTML instead of JSON.", e);
                }
            });

        }).on("error", (err) => {
            console.error("MMM-BOM-Current: Network Error: " + err.message);
        });
    }
});
