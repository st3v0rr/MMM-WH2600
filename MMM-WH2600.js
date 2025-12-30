/* global Module */

/* MagicMirror²
 * Module: MMM-WH2600
 *
 * By Stefan Nachtrab
 * MIT Licensed.
 */

Module.register("MMM-WH2600", {
  defaults: {
    updateInterval: 10000,
    ipWH2600: "", //ip of your WH2600 data logger
    locationInfo: "",
    locationMetersAboveSeaLevel: 0, //location of the weather station - important for atmospheric pressure calculation
    tempSwitchInterval: 5000,
    indoorSensors: [
      {
        label: "",
        temp: "intemp",
        humid: "inhumid",
        ventilation: true
      }
    ],
    outdoorSensors: [
      {
        label: "",
        temp: "outtemp",
        humid: "outhumid"
      }
    ]
  },

  requiresVersion: "2.1.0", // Required version of MagicMirror

  start: function () {
    var self = this;

    console.log("Starting module MMM-WH2600");

    //Flag for check if module is loaded
    this.loaded = false;
    //Initially load data
    self.getCurrentData();

    this.currentIndoorSensorIndex = 0;
    this.currentOutdoorSensorIndex = 0;
    // Schedule update timer for CurrentData.
    setInterval(function () {
      self.nextIndoorSensor();
      self.nextOutdoorSensor();
      self.getCurrentData();
      self.updateDom();
    }, this.config.tempSwitchInterval);

    this.loaded = true;
  },

  nextIndoorSensor() {
    if (this.config.indoorSensors.length > 1) {
      const nextIndex =
        (this.currentIndoorSensorIndex + 1) %
        this.config.indoorSensors.length;
      this.currentIndoorSensorIndex = this.getAvailableSensorIndex(
        this.config.indoorSensors,
        nextIndex,
        this.dataNotificationCurrentData
      );
    }

    return this.currentIndoorSensorIndex;
  },

  nextOutdoorSensor() {
    if (this.config.outdoorSensors.length > 1) {
      const nextIndex =
        (this.currentOutdoorSensorIndex + 1) %
        this.config.outdoorSensors.length;
      this.currentOutdoorSensorIndex = this.getAvailableSensorIndex(
        this.config.outdoorSensors,
        nextIndex,
        this.dataNotificationCurrentData
      );
    }
    return this.currentOutdoorSensorIndex;
  },

  toNumber(value) {
    const numberValue = parseFloat(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  },

  hasSensorData(sensor, data) {
    if (!sensor || !data) {
      return false;
    }
    const tempValue = this.toNumber(data[sensor.temp]);
    const humidValue = this.toNumber(data[sensor.humid]);
    return tempValue !== null && humidValue !== null;
  },

  getAvailableSensorIndex(sensors, startIndex, data) {
    if (!Array.isArray(sensors) || sensors.length === 0) {
      return 0;
    }
    const safeStartIndex = Math.min(
      Math.max(startIndex, 0),
      sensors.length - 1
    );
    if (!data) {
      return safeStartIndex;
    }
    for (let offset = 0; offset < sensors.length; offset++) {
      const index = (safeStartIndex + offset) % sensors.length;
      if (this.hasSensorData(sensors[index], data)) {
        return index;
      }
    }
    return safeStartIndex;
  },

  calculateRelativeAtmosphericPressure(atmosphericPressure) {
    if (this.config.locationMetersAboveSeaLevel > 1000) {
      var gainOverOneTousand =
        (this.config.locationMetersAboveSeaLevel - 1000) / 11;
      var gainUnderOneTousand = 1000 / 8;
      return (atmosphericPressure + gainOverOneTousand + gainUnderOneTousand)
        .toFixed(0)
        .replace(".", ",");
    } else {
      return (atmosphericPressure + this.config.locationMetersAboveSeaLevel / 8)
        .toFixed(0)
        .replace(".", ",");
    }
  },

  calculatePerceivedTemperature(data) {
    const T = data.outtemp;
    const rh = data.outhumid;
    const v = data.windspeed;
    const uv = data.uv;

    // Clima-Michel-Mdel
    const e = (rh / 100) * 6.105 * Math.exp((17.27 * T) / (237.7 + T));
    let at = T + 0.348 * e - 0.7 * v + 0.70 * (uv / 100) - 4.25;

    // Cold temperature correction
    if (T <= 10 && v > 1.3) {
      const vKmH = v * 3.6;
      const windChill = 13.12 + 0.6215 * T - 11.37 * Math.pow(vKmH, 0.16) + 0.3965 * T * Math.pow(vKmH, 0.16);
      at = Math.min(at, windChill);
    }

    return parseFloat(at.toFixed(1));
  },

  calculateVentilationRecommendation(data, options = {}) {
    const toNumber = (value) => {
      const numberValue = parseFloat(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    };

    const meanOfKeys = (keys, fallback) => {
      const values = keys
        .map((key) => toNumber(data[key]))
        .filter((value) => value !== null);
      if (values.length === 0) {
        return fallback;
      }
      const sum = values.reduce((total, value) => total + value, 0);
      return sum / values.length;
    };

    const indoorVentSensors = this.config.indoorSensors.filter(
      (sensor) => sensor.ventilation
    );
    if (indoorVentSensors.length === 0) {
      return null;
    }
    const indoorTempKeys = indoorVentSensors.map((sensor) => sensor.temp);
    const indoorHumidKeys = indoorVentSensors.map((sensor) => sensor.humid);
    const outdoorTempKeys = this.config.outdoorSensors.map(
      (sensor) => sensor.temp
    );
    const outdoorHumidKeys = this.config.outdoorSensors.map(
      (sensor) => sensor.humid
    );
    const fallbackIndoorTemp = toNumber(data[indoorVentSensors[0]?.temp]);
    const fallbackIndoorHumid = toNumber(data[indoorVentSensors[0]?.humid]);
    const fallbackOutdoorTemp = toNumber(
      data[this.config.outdoorSensors[0]?.temp]
    );
    const fallbackOutdoorHumid = toNumber(
      data[this.config.outdoorSensors[0]?.humid]
    );

    // Aktuellen Indoor/Outdoor-Sensor nutzen, sonst Mittelwert-Fallback.
    const indoorTemp =
      toNumber(options.indoorTemp) ??
      meanOfKeys(indoorTempKeys, fallbackIndoorTemp);
    const indoorHumid =
      toNumber(options.indoorHumid) ??
      meanOfKeys(indoorHumidKeys, fallbackIndoorHumid);
    const outdoorTemp =
      toNumber(options.outdoorTemp) ??
      meanOfKeys(outdoorTempKeys, fallbackOutdoorTemp);
    const outdoorHumid =
      toNumber(options.outdoorHumid) ??
      meanOfKeys(outdoorHumidKeys, fallbackOutdoorHumid);

    if (
      indoorTemp === null ||
      indoorHumid === null ||
      outdoorTemp === null ||
      outdoorHumid === null
    ) {
      return null;
    }

    // Absolute Feuchte in g/m3 nach Standardformel.
    const absoluteHumidity = (temperatureC, relativeHumidity) => {
      const saturationPressure =
        6.112 * Math.exp((17.67 * temperatureC) / (temperatureC + 243.5));
      return (
        (saturationPressure * (relativeHumidity / 100) * 2.1674) /
        (273.15 + temperatureC)
      );
    };

    const absoluteHumidityIn = absoluteHumidity(indoorTemp, indoorHumid);
    const absoluteHumidityOut = absoluteHumidity(outdoorTemp, outdoorHumid);
    const diff = absoluteHumidityIn - absoluteHumidityOut;

    let score = 3;
    if (diff > 4) {
      score = 5;
    } else if (diff >= 1) {
      score = 4;
    } else if (diff >= 0) {
      score = 3;
    } else if (diff >= -2) {
      score = 2;
    } else {
      score = 1;
    }

    // Komfort-Schutz: trockene Innenluft begrenzt die Empfehlung auf OK.
    if (indoorHumid < 35 && score > 3) {
      score = 3;
    }

    return {
      score,
      absoluteHumidityIn: parseFloat(absoluteHumidityIn.toFixed(1)),
      absoluteHumidityOut: parseFloat(absoluteHumidityOut.toFixed(1))
    };
  },

  degreesToCompass: function (degrees) {
    return [
      "NORTH_MIN",
      "NORTH_NORTH_EAST",
      "NORTH_EAST",
      "EAST_NORTH_EAST",
      "EAST",
      "EAST_SOUTH_EAST",
      "SOUTH_EAST",
      "SOUTH_SOUTH_EAST",
      "SOUTH",
      "SOUTH_SOUTH_WEST",
      "SOUTH_WEST",
      "WEST_SOUTH_WEST",
      "WEST",
      "WEST_NORTH_WEST",
      "NORTH_WEST",
      "NORTH_NORTH_WEST",
      "NORTH_MAX"
    ][Math.round(degrees / 11.25 / 2)];
  },

  getBeaufort(gustspeed) {
    let beaufort = 0;

    if (gustspeed < 0.3) {
      beaufort = 0;
    } else if (gustspeed < 1.6) {
      beaufort = 1;
    } else if (gustspeed < 3.4) {
      beaufort = 2;
    } else if (gustspeed < 5.5) {
      beaufort = 3;
    } else if (gustspeed < 8.0) {
      beaufort = 4;
    } else if (gustspeed < 10.8) {
      beaufort = 5;
    } else if (gustspeed < 13.9) {
      beaufort = 6;
    } else if (gustspeed < 17.2) {
      beaufort = 7;
    } else if (gustspeed < 20.8) {
      beaufort = 8;
    } else if (gustspeed < 24.5) {
      beaufort = 9;
    } else if (gustspeed < 28.5) {
      beaufort = 10;
    } else if (gustspeed < 32.7) {
      beaufort = 11;
    } else {
      beaufort = 12;
    }

    return beaufort;
  },

  uvIndexToColor: function (uvi) {
    switch (uvi) {
      case 0:
      case 1:
      case 2:
        return "green";
      case 3:
      case 4:
      case 5:
        return "gold";
      case 6:
      case 7:
        return "orange";
      case 8:
      case 9:
      case 10:
        return "red";
      default:
        return "mediumvioletred";
    }
  },

  getCurrentData: function () {
    this.sendSocketNotification(
      "MMM-WH2600-NOTIFICATION_CURRENTDATA_REQUESTED",
      {
        config: this.config
      }
    );
  },

  getHeader: function () {
    if (this.config.locationInfo.length > 0) {
      return this.translate("TITLE") + " - " + this.config.locationInfo;
    }
    return this.translate("TITLE");
  },

  getTemplate: function() {
	  return "templates/default.njk"
  },

  getTemplateData: function () {
    if (!this.loaded) {
      return {
        status: "Loading MMM-WH2600...",
        config: this.config
      };
    }

    if (this.dataNotificationCurrentData !== undefined) {
      var currentWindDir = parseFloat(this.dataNotificationCurrentData.winddir);
      var windDirFrom = 0;
      var windDirTo = 0;

      if (Number.isFinite(currentWindDir)) {
        if (typeof this.lastWindDir !== "number") {
          this.lastWindDir = currentWindDir;
        }
        windDirFrom = this.lastWindDir;
        windDirTo = currentWindDir;

        var delta = windDirTo - windDirFrom;
        if (delta > 180) {
          windDirTo -= 360;
        } else if (delta < -180) {
          windDirTo += 360;
        }

        this.lastWindDir = windDirTo;
      }

      const currentIndoorSensor =
        this.config.indoorSensors[
          this.getAvailableSensorIndex(
            this.config.indoorSensors,
            this.currentIndoorSensorIndex,
            this.dataNotificationCurrentData
          )
        ];
      this.currentIndoorSensorIndex = this.config.indoorSensors.indexOf(
        currentIndoorSensor
      );
      const currentOutdoorSensor =
        this.config.outdoorSensors[
          this.getAvailableSensorIndex(
            this.config.outdoorSensors,
            this.currentOutdoorSensorIndex,
            this.dataNotificationCurrentData
          )
        ];
      this.currentOutdoorSensorIndex = this.config.outdoorSensors.indexOf(
        currentOutdoorSensor
      );
      const currentIndoorTemp =
        this.dataNotificationCurrentData[currentIndoorSensor.temp];
      const currentIndoorHumid =
        this.dataNotificationCurrentData[currentIndoorSensor.humid];
      const currentOutdoorTemp =
        this.dataNotificationCurrentData[currentOutdoorSensor.temp];
      const currentOutdoorHumid =
        this.dataNotificationCurrentData[currentOutdoorSensor.humid];
      const ventilationEnabled = Boolean(currentIndoorSensor.ventilation);
      const ventilationRecommendation = ventilationEnabled
        ? this.calculateVentilationRecommendation(
            this.dataNotificationCurrentData,
            {
              indoorTemp: currentIndoorTemp,
              indoorHumid: currentIndoorHumid,
              outdoorTemp: currentOutdoorTemp,
              outdoorHumid: currentOutdoorHumid
            }
          )
        : null;

      return {
        config: this.config,
        data: this.dataNotificationCurrentData,
        indoorSensorLabel: this.config.indoorSensors[this.currentIndoorSensorIndex].label,
        indoorSensorTemperature: currentIndoorTemp,
        indoorSensorHumidity: currentIndoorHumid,
        outdoorSensorLabel: this.config.outdoorSensors[this.currentOutdoorSensorIndex].label,
        outdoorSensorTemperature: currentOutdoorTemp,
        outdoorSensorHumidity: currentOutdoorHumid,
        atmosphericPressure: this.calculateRelativeAtmosphericPressure(this.dataNotificationCurrentData.absbarometer),
        perceivedTemperature: this.calculatePerceivedTemperature(this.dataNotificationCurrentData),
        windDirText: this.translate(this.degreesToCompass(this.dataNotificationCurrentData.winddir)),
        windDirFrom: windDirFrom,
        windDirTo: windDirTo,
        beaufort: this.getBeaufort(this.dataNotificationCurrentData.gustspeed),
        uvIndexColor: this.uvIndexToColor(this.dataNotificationCurrentData.uvi),
        ventilationRecommendation: ventilationRecommendation,
        translations: {
          wind: this.translate("WIND"),
          uvindex: this.translate("UVINDEX"),
          rain: this.translate("RAIN")
        }
			};
		}

		return {
			status: "Loading MMM-WH2600...",
			config: this.config
		};
	},

  getScripts: function () {
    return ["WH2600.js", "WH2600Utils.js"];
  },

  getStyles: function () {
    return ["MMM-WH2600.css", "weather-icons.css", "weather-icons-wind.css"];
  },

  // Load translations files
  getTranslations: function () {
    return {
      en: "translations/en.json",
      de: "translations/de.json"
    };
  },

  // socketNotificationReceived from helper
  socketNotificationReceived: function (notification, payload) {
    if (notification === "MMM-WH2600-NOTIFICATION_CURRENTDATA_RECEIVED") {
      // set dataNotification
      this.dataNotificationCurrentData = payload;
      this.updateDom();
    }
  }
});
