/* global Module */

/* Magic Mirror
 * Module: MMM-WH2600
 *
 * By Stefan Nachtrab
 * MIT Licensed.
 */

Module.register("MMM-WH2600", {
  defaults: {
    updateInterval: 8000,
    ipWH2600: "", //ip of your WH2600 data logger
    locationInfo: "",
    locationMetersAboveSeaLevel: 0, //location of the weather station - important for atmospheric pressure calculation
    tempSwitchInterval: 5000,
    indoorSensors: [
      {
        label: "",
        temp: "intemp",
        humid: "inhumid"
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
      this.currentIndoorSensorIndex++;
      if (this.currentIndoorSensorIndex === this.config.indoorSensors.length) {
        this.currentIndoorSensorIndex = 0;
      }
    }

    return this.currentIndoorSensorIndex;
  },

  nextOutdoorSensor() {
    if (this.config.outdoorSensors.length > 1) {
      this.currentOutdoorSensorIndex++;
      if (
        this.currentOutdoorSensorIndex === this.config.outdoorSensors.length
      ) {
        this.currentOutdoorSensorIndex = 0;
      }
    }
    return this.currentOutdoorSensorIndex;
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

  createDataRow: function (
    label,
    value,
    icon,
    sizeIcon,
    unit,
    sizeValue,
    color
  ) {
    var dataRow = document.createElement("div");
    dataRow.classList.add("wh2600-text-align-right");

    var dataRowIcon = document.createElement("i");
    dataRowIcon.classList.add("wi");
    dataRowIcon.classList.add(icon);
    dataRowIcon.classList.add(sizeIcon);

    var dataRowIconWrapper = document.createElement("span");
    dataRowIconWrapper.classList.add("wh2600-icon-space");
    dataRowIconWrapper.innerHTML = label + " ";
    dataRowIconWrapper.appendChild(dataRowIcon);

    var dataRowValue = document.createElement("span");
    dataRowValue.classList.add("wh2600-value-space");
    dataRowValue.innerHTML = value;
    dataRowValue.classList.add(sizeValue);
    var dataRowUnit = document.createElement("span");
    dataRowUnit.innerHTML = unit;
    dataRowUnit.classList.add(sizeIcon);
    dataRowUnit.classList.add("wh2600-unit-space");
    dataRowUnit.classList.add("wh2600-text-align-left");

    if (color) {
      dataRowIcon.style = "color:" + color;
      dataRowValue.style = "color:" + color;
      dataRowUnit.style = "color:" + color;
    }

    dataRow.appendChild(dataRowIconWrapper);
    dataRow.appendChild(dataRowValue);
    dataRow.appendChild(dataRowUnit);

    return dataRow;
  },

  createIndoorOutdoorData: function (data) {
    var wrapperIndoorOutdoorData = document.createElement("div");

    var wrapperIndoorData = document.createElement("div");
    if (this.config.indoorSensors.length > 1) {
      wrapperIndoorData.classList.add("fade-in-and-out");
    }
    var headerIndoorData = document.createElement("header");
    headerIndoorData.innerHTML =
      this.config.indoorSensors[this.currentIndoorSensorIndex].label.length > 0
        ? this.config.indoorSensors[this.currentIndoorSensorIndex].label
        : this.translate("INDOOR") + (this.currentIndoorSensorIndex + 1);
    wrapperIndoorData.appendChild(headerIndoorData);
    wrapperIndoorData.classList.add("wh2600-temp-block");
    wrapperIndoorData.appendChild(
      this.createDataRow(
        "",
        data[this.config.indoorSensors[this.currentIndoorSensorIndex].temp]
          .toFixed(1)
          .replace(".", ","),
        "wi-thermometer",
        "medium",
        "°C",
        "large"
      )
    );
    wrapperIndoorData.appendChild(
      this.createDataRow(
        "",
        data[this.config.indoorSensors[this.currentIndoorSensorIndex].humid],
        "wi-humidity",
        "small",
        "%",
        "medium"
      )
    );

    var wrapperOutdoorData = document.createElement("div");
    if (this.config.outdoorSensors.length > 1) {
      wrapperOutdoorData.classList.add("fade-in-and-out");
    }
    var headerOutdoorData = document.createElement("header");
    headerOutdoorData.innerHTML =
      this.config.outdoorSensors[this.currentOutdoorSensorIndex].label.length >
      0
        ? this.config.outdoorSensors[this.currentOutdoorSensorIndex].label
        : this.translate("OUTDOOR") + (this.currentOutdoorSensorIndex + 1);
    wrapperOutdoorData.appendChild(headerOutdoorData);
    wrapperOutdoorData.classList.add("wh2600-temp-block");
    wrapperOutdoorData.appendChild(
      this.createDataRow(
        "",
        data[this.config.outdoorSensors[this.currentOutdoorSensorIndex].temp]
          .toFixed(1)
          .replace(".", ","),
        "wi-thermometer",
        "medium",
        "°C",
        "large"
      )
    );
    wrapperOutdoorData.appendChild(
      this.createDataRow(
        "",
        data[this.config.outdoorSensors[this.currentOutdoorSensorIndex].humid],
        "wi-humidity",
        "small",
        "%",
        "medium"
      )
    );
    wrapperOutdoorData.appendChild(
      this.createDataRow(
        "",
        this.calculateRelativeAtmosphericPressure(data.absbarometer),
        "wi-barometer",
        "small",
        "hPa",
        "medium"
      )
    );

    wrapperIndoorOutdoorData.appendChild(wrapperIndoorData);
    wrapperIndoorOutdoorData.appendChild(wrapperOutdoorData);
    return wrapperIndoorOutdoorData;
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

  createWindData: function (data) {
    var wrapperWindData = document.createElement("div");

    var wrapperWindSpeedData = document.createElement("div");
    var headerWindSpeedData = document.createElement("header");
    headerWindSpeedData.innerHTML = this.translate("WIND");
    wrapperWindSpeedData.appendChild(headerWindSpeedData);
    wrapperWindSpeedData.classList.add("wh2600-temp-block");
    wrapperWindSpeedData.appendChild(
      this.createDataRow(
        "",
        (data.windspeed * 3.6).toFixed(1).replace(".", ","),
        "wi-windy",
        "medium",
        "km/h",
        "large"
      )
    );
    wrapperWindSpeedData.appendChild(
      this.createDataRow(
        "",
        (data.gustspeed * 3.6).toFixed(1).replace(".", ","),
        "wi-strong-wind",
        "small",
        "km/h",
        "medium"
      )
    );
    wrapperWindSpeedData.appendChild(
      this.createDataRow(
        "",
        (data.daymaxwind * 3.6).toFixed(1).replace(".", ","),
        "wi-day-windy",
        "small",
        "km/h",
        "medium"
      )
    );

    wrapperWindSpeedData.appendChild(
      this.createDataRow(
        "",
        data.winddir,
        "wi-wind-direction",
        "small",
        "° " + this.translate(this.degreesToCompass(data.winddir)),
        "medium"
      )
    );
    var wrapperWindDirection = document.createElement("div");
    wrapperWindDirection.classList.add("wh2600-xxlarge");
    wrapperWindDirection.classList.add("wi");
    wrapperWindDirection.classList.add("wi-direction-down");
    wrapperWindDirection.style.transform = "rotate(" + data.winddir + "deg)";

    wrapperWindSpeedData.appendChild(wrapperWindDirection);

    wrapperWindData.appendChild(wrapperWindSpeedData);
    return wrapperWindData;
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

  createUvLightRainData: function (data) {
    var wrapperUvLightRainData = document.createElement("div");

    var wrapperUvData = document.createElement("div");
    var headerUvData = document.createElement("header");
    headerUvData.innerHTML = this.translate("UVINDEX");
    wrapperUvData.appendChild(headerUvData);
    wrapperUvData.classList.add("wh2600-temp-block");

    wrapperUvData.appendChild(
      this.createDataRow(
        "",
        data.uvi,
        "wi-hot",
        "large",
        "",
        "xlarge",
        this.uvIndexToColor(data.uvi)
      )
    );

    var wrapperRainData = document.createElement("div");
    var headerRainData = document.createElement("header");
    headerRainData.innerHTML = this.translate("RAIN");
    wrapperRainData.appendChild(headerRainData);
    wrapperRainData.classList.add("wh2600-temp-block");

    wrapperRainData.appendChild(
      this.createDataRow(
        this.translate("NOW"),
        data.rainrate,
        "wi-raindrop",
        "small",
        "mm",
        "medium"
      )
    );
    wrapperRainData.appendChild(
      this.createDataRow(
        this.translate("TODAY"),
        data.rainday,
        "wi-raindrop",
        "small",
        "mm",
        "medium"
      )
    );
    wrapperRainData.appendChild(
      this.createDataRow(
        this.translate("WEEK"),
        data.rainweek,
        "wi-raindrop",
        "small",
        "mm",
        "medium"
      )
    );
    wrapperRainData.appendChild(
      this.createDataRow(
        this.translate("MONTH"),
        data.rainmonth,
        "wi-raindrop",
        "small",
        "mm",
        "medium"
      )
    );

    wrapperUvLightRainData.appendChild(wrapperUvData);
    wrapperUvLightRainData.appendChild(wrapperRainData);
    return wrapperUvLightRainData;
  },

  getDom: function () {
    // create element wrapper for show into the module
    var wrapper = document.createElement("div");
    if (this.config.ipWH2600 === "") {
      wrapper.innerHTML = "Missing configuration for MMM-WH2600.";
      return wrapper;
    }
    if (!this.loaded) {
      wrapper.innerHTML = "Loading MMM-WH2600...";
      return wrapper;
    }

    // Data from helper
    if (this.dataNotificationCurrentData) {
      var wrapperCurrentData = document.createElement("div");
      wrapperCurrentData.classList.add("wh2600-container");

      wrapperCurrentData.appendChild(
        this.createIndoorOutdoorData(this.dataNotificationCurrentData)
      );
      wrapperCurrentData.appendChild(
        this.createWindData(this.dataNotificationCurrentData)
      );
      wrapperCurrentData.appendChild(
        this.createUvLightRainData(this.dataNotificationCurrentData)
      );
      wrapper.appendChild(wrapperCurrentData);
    }
    return wrapper;
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
