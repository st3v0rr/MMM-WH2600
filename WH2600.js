const dgram = require("dgram");
const net = require("net");
const WH2600Utils = require("./WH2600Utils");

const Commands = {
  CMD_WRITE_SSID: 0x11, // send router SSID and Password to wifi module
  CMD_BROADCAST: 0x12, //looking for device inside network. Returned data size is 2 Byte

  CMD_READ_ECOWITT: 0x1e, // read setting for Ecowitt.net
  CMD_WRITE_ECOWITT: 0x1f, // write back setting for Ecowitt.net
  CMD_READ_WUNDERGROUND: 0x20, // read back setting for Wunderground
  CMD_WRITE_WUNDERGROUND: 0x21, // write back setting for Wunderground
  CMD_READ_WOW: 0x22, // read setting for WeatherObservationsWebsite
  CMD_WRITE_WOW: 0x23, // write back setting for WeatherObservationsWebsite
  CMD_READ_WEATHERCLOUD: 0x24, // read setting for Weathercloud
  CMD_WRITE_WEATHERCLOUD: 0x25, // write back setting for Weathercloud
  CMD_READ_SATION_MAC: 0x26, // read  module MAC
  CMD_WH2600_LIVEDATA: 0x27, // read current，return size is 2 Byte (only valid for WH2600 and WH2650)
  CMD_GET_SOILHUMIAD: 0x28, // read Soilmoisture Sensor calibration parameter
  CMD_SET_SOILHUMIAD: 0x29, // write back Soilmoisture Sensor calibration parameter
  CMD_READ_CUSTOMIZED: 0x2a, // read setting for Customized sever
  CMD_WRITE_CUSTOMIZED: 0x2b, // write back customized sever setting
  CMD_GET_MUlCH_OFFSET: 0x2c, // read multi channel sensor OFFSET value
  CMD_SET_MUlCH_OFFSET: 0x2d, // write back multi sensor OFFSET value
  CMD_GET_PM25_OFFSET: 0x2e, // read PM2.5OFFSET value
  CMD_SET_PM25_OFFSET: 0x2f, // write back PM2.5OFFSET value
  CMD_READ_SSSS: 0x30, // read sensor setup ( sensor frequency, wh24/wh65 sensor)
  CMD_WRITE_SSSS: 0x31, // write back sensor setup

  CMD_READ_RAINDATA: 0x34, // read rain data
  CMD_WRITE_RAINDATA: 0x35, // write back rain data
  CMD_READ_GAIN: 0x36, // read rain gain
  CMD_WRITE_GAIN: 0x37, // write back rain gain
  CMD_READ_CALIBRATION: 0x38, //  read multiple parameter offset( refer to command description below in detail)
  CMD_WRITE_CALIBRATION: 0x39, //  write back multiple parameter offset
  CMD_READ_SENSOR_ID: 0x3a, //  read Sensors ID
  CMD_WRITE_SENSOR_ID: 0x3b, // write back Sensors ID
  CMD_WRITE_SENSOR_ID_NEW: 0x3c, // write back Sensors ID New

  CMD_WRITE_REBOOT: 0x40, // system reset
  CMD_WRITE_RESET: 0x41, // system default setting reset
  CMD_WRITE_UPDATE: 0x43, // update firmware

  CMD_READ_FIRMWARE: 0x50, // read back firmware version
  CMD_READ_USR_PATH: 0x51, // read path for custom Server
  CMD_WRITE_USR_PATH: 0x52 // write path for custom Server
};
const SensorIDs = [
  "WH65",
  "WH68",
  "WH80",
  "WH40",
  "WH25",
  "WH26",
  "WH31_CH1",
  "WH31_CH2",
  "WH31_CH3",
  "WH31_CH4",
  "WH31_CH5",
  "WH31_CH6",
  "WH31_CH7",
  "WH31_CH8",
  "WH51_CH1",
  "WH51_CH2",
  "WH51_CH3",
  "WH51_CH4",
  "WH51_CH5",
  "WH51_CH6",
  "WH51_CH7",
  "WH51_CH8",
  "WH41_CH1",
  "WH41_CH2",
  "WH41_CH3",
  "WH41_CH4",
  "WH57",
  "WH55_CH1",
  "WH55_CH2",
  "WH55_CH3",
  "WH55_CH4"
];

class WH2600 {
  constructor(ipAddr) {
    this.utils = new WH2600Utils();

    const buildPacket = (command, data) => {
      var size = (data !== null ? data.length : 0) + 3;
      var body = [command, size].concat(data !== null ? data : []);
      return new Uint8Array(
        [255, 255].concat(body, [WH2600Utils.calcChecksum(body)])
      );
    };

    const checkResponse = (resp, cmd, callback) => {
      if (resp == null) {
        callback(resp, "No Response");
      } else if (resp.length < 3) {
        callback(resp, "Invalid Response");
      } else if (resp[2] !== cmd) {
        callback(resp, "Invalid Command Code Response");
      } else if (
        resp[resp.length - 1] !==
        WH2600Utils.calcChecksum(resp.slice(2, resp.length - 1))
      ) {
        callback(resp, "Invalid Checksum");
      } else {
        callback(resp, null);
      }
    };

    this.runCommand = (command, data = null) => {
      return new Promise((res, rej) => {
        const client = new net.Socket();

        client.connect(45000, ipAddr, function () {
          client.write(buildPacket(command, data));
        });

        client.on("data", function (buffer) {
          client.destroy(); // kill client after server's response as to not mix up commands

          checkResponse(buffer, command, (resData, err) => {
            err ? rej(err) : res(resData);
          });
        });

        client.on("close", function () {
        });
      });
    };
  }

  getSensors(filter = null) {
    const statusFilter =
      filter && filter.status
        ? typeof filter.status === "string"
          ? (status) => status.includes(filter.status.toLowerCase())
          : Array.isArray(filter.status)
          ? (status) => filter.status.includes(status.toLowerCase())
          : () => true
        : () => true;

    const typeFilter =
      filter && filter.type
        ? typeof filter.type === "string"
          ? (type) => type.includes(filter.type.toUpperCase())
          : Array.isArray(filter.type)
          ? (type) => filter.type.includes(type.toUpperCase())
          : () => true
        : () => true;

    return new Promise((res, rej) => {
      this.runCommand(Commands.CMD_READ_SENSOR_ID).then((buffer) => {
        if (buffer.length > 200) {
          var sensors = [];

          for (var i = 4; i < buffer[3]; i += 7) {
            var id = buffer.toString("hex", i + 1, i + 5).toUpperCase();
            var typeID = buffer[i];
            var type =
              typeID < SensorIDs.length && typeID >= 0
                ? SensorIDs[typeID]
                : `Unknown Type (${id})`;

            var status =
              id === "FFFFFFFE"
                ? "disabled"
                : id === "FFFFFFFF"
                ? "registering"
                : "active";

            if (statusFilter(status) && typeFilter(type)) {
              sensors.push({
                type: type,
                status: status,
                id:
                  status === "active"
                    ? parseInt(id, 16).toString(16).toUpperCase()
                    : null, //remove leading 0's
                signal: status === "active" ? buffer[i + 5] : null,
                battery: status === "active" ? buffer[i + 6] : null
              });
            }
          }

          if (filter === null) {
            this.sensors = sensors;
          }

          res(sensors);
        } else {
          rej("Invalid Data Length");
        }
      });
    });
  }

  getLiveData(filterActiveSensors = true) {
    return new Promise((res) => {
      this.runCommand(Commands.CMD_WH2600_LIVEDATA).then((buffer) => {
        var data = this.utils.parseLiveData(buffer);

        if (filterActiveSensors) {
          const filterSensors = (resData, sensors) => {
            if (resData.lowbatt) {
              Object.keys(resData.lowbatt).forEach((key) => {
                var ukey = key.toUpperCase();

                if (typeof resData.lowbatt[key] === "object") {
                  Object.keys(resData.lowbatt[key]).forEach((chn) => {
                    const uchn = chn.toUpperCase();
                    const usen = key.toUpperCase();

                    if (
                      sensors.filter(
                        (s) =>
                          s.type === `${usen}_${uchn}` && s.status === "active"
                      ).length < 1
                    ) {
                      delete resData.lowbatt[key][chn];
                    }
                  });

                  if (Object.keys(resData.lowbatt[key]).length < 1) {
                    delete resData.lowbatt[key];
                  }
                } else {
                  if (
                    sensors.filter(
                      (s) => s.type === ukey && s.status === "active"
                    ).length < 1
                  ) {
                    delete resData.lowbatt[key];
                  }
                }
              });
            }

            res(resData);
          };

          if (this.sensors === undefined) {
            this.getSensors().then((sensors) => {
              filterSensors(data, sensors);
            });
          } else {
            filterSensors(data, this.sensors);
          }
        } else {
          res(data);
        }
      });
    });
  }

  getRainData() {
    return new Promise((res) => {
      this.runCommand(Commands.CMD_READ_RAINDATA).then((buffer) => {
        res(this.utils.parseRainData(buffer));
      });
    });
  }
  getFirmwareVersion() {
    return new Promise((res) => {
      this.runCommand(Commands.CMD_READ_FIRMWARE).then((buffer) => {
        res(buffer.slice(5, buffer.length - 1).toString("ascii"));
      });
    });
  }

  getCustomServerInfo() {
    return new Promise((res) => {
      this.runCommand(Commands.CMD_READ_CUSTOMIZED).then((rcbuffer) => {
        var info = this.utils.parseCustomServerInfo(rcbuffer);

        this.runCommand(Commands.CMD_READ_USR_PATH).then((upbuffer) => {
          Object.assign(info, this.utils.parseUserPathInfo(upbuffer));
          res(info);
        });
      });
    });
  }

  static discover(timeout = 5000) {
    return new Promise((res) => {
      const server = dgram.createSocket("udp4");
      var ips = [];

      server.on("message", (msg, rinfo) => {
        if (!ips.includes(rinfo.address)) {
          ips.push(rinfo.address);
        }
      });

      server.bind(59387);

      setTimeout(() => {
        server.close(() => {
          res(ips);
        });
      }, timeout);
    });
  }
}

module.exports = WH2600;
