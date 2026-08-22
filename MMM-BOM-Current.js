/* MagicMirror²
 * Module: MMM-BOM-Current
 *
 * By Kieren McDonald
 * MIT Licensed.
 */

Module.register("MMM-BOM-Current", {
    defaults: {
        url: "https://reg.bom.gov.au/fwo/IDQ60901/IDQ60901.94576.json",
        updateInterval: 10 * 60 * 1000, // 10 minutes
        animationSpeed: 1000,
        units: "metric",
    },

    getStyles: function() {
        return ["weather-icons.css"];
    },

    start: function() {
        Log.info("Starting module: " + this.name);
        this.bomData = null;
        this.loaded = false;

        this.sendSocketNotification("GET_BOM_OBSERVATIONS", this.config.url);

        var self = this;
        setInterval(function() {
            self.sendSocketNotification("GET_BOM_OBSERVATIONS", self.config.url);
        }, this.config.updateInterval);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "BOM_OBSERVATIONS_RESULT") {
            this.bomData = payload;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed);
        }
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        wrapper.className = "weather-current-box";

        if (!this.loaded) {
            wrapper.innerHTML = "Loading...";
            wrapper.className += " dimmed small";
            return wrapper;
        }

        if (!this.bomData) {
            wrapper.innerHTML = "No Data";
            return wrapper;
        }

        // --- 1. Weather Icon ---
        var iconClass = "wi-day-sunny";
        var rain = parseFloat(this.bomData.rain_trace);
        
        if (!isNaN(rain) && rain > 0.2) {
            iconClass = "wi-rain";
        } else {
            var cloud = this.bomData.cloud ? this.bomData.cloud.toLowerCase() : "";
            if (cloud.includes("partly")) iconClass = "wi-day-cloudy";
            else if (cloud.includes("cloudy")) iconClass = "wi-cloudy";
            else if (cloud.includes("overcast")) iconClass = "wi-cloudy";
            else if (cloud.includes("clear") || cloud.includes("sunny")) iconClass = "wi-day-sunny";
        }

        var iconDiv = document.createElement("div");
        iconDiv.className = "weather-icon"; 
        var iconSpan = document.createElement("span");
        iconSpan.className = "wi " + iconClass;
        iconDiv.appendChild(iconSpan);
        wrapper.appendChild(iconDiv);

        // --- 2. Main Temperature ---
        var tempDiv = document.createElement("div");
        tempDiv.className = "weather-temp"; // New Class
        tempDiv.innerHTML = Math.round(this.bomData.air_temp) + "&deg;";
        wrapper.appendChild(tempDiv);

        // --- 3. Details ---
        var detailsDiv = document.createElement("div");
        detailsDiv.className = "weather-details"; // New Class
        
        var feelsLike = this.bomData.apparent_t;
        var windSpeed = this.bomData.wind_spd_kmh;
        var windDir = this.bomData.wind_dir;
        var humidity = this.bomData.rel_hum;
        
        var detailsHTML = "";

        if (feelsLike) {
            detailsHTML += "Feels " + Math.round(feelsLike) + "&deg;";
        }
        
        if (windSpeed || humidity) {
            detailsHTML += "<br>";
            if (windSpeed) {
                var windRot = 0;
                if (windDir) {
                    var dirs = {N:0, NNE:22, NE:45, ENE:67, E:90, ESE:112, SE:135, SSE:157, S:180, SSW:202, SW:225, WSW:247, W:270, WNW:292, NW:315, NNW:337};
                    if (dirs[windDir] !== undefined) windRot = dirs[windDir];
                }
                // Inline style ONLY for rotation logic, everything else is CSS
                detailsHTML += `<span class="wi wi-wind-direction" style="transform: rotate(${windRot}deg); display:inline-block;"></span> ${Math.round(windSpeed)} km/h`;
            }
            if (humidity) {
                 if (windSpeed) detailsHTML += " &nbsp;|&nbsp; "; 
                 detailsHTML += `<span class="wi wi-humidity"></span> ${humidity}%`;
            }
        }

        detailsDiv.innerHTML = detailsHTML;
        wrapper.appendChild(detailsDiv);

        return wrapper;
    }
});
