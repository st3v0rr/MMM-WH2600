/* MagicMirror²
 * Node Helper: MMM-WH2600
 *
 * By Stefan Nachtrab
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const WH2600 = require("./WH2600");

module.exports = NodeHelper.create({
  /* socketNotificationReceived(notification, payload)
   * This method is called when a socket notification arrives.
   *
   * argument notification string - The identifier of the noitication.
   * argument payload mixed - The payload of the notification.
   */
  socketNotificationReceived: function (notification, payload) {
    var self = this;

    if (notification === "MMM-WH2600-NOTIFICATION_CURRENTDATA_REQUESTED") {
      new WH2600(payload.config.ipWH2600).getLiveData().then((body) => {
        self.sendSocketNotification(
          "MMM-WH2600-NOTIFICATION_CURRENTDATA_RECEIVED",
          body
        );
      });
    }
  }
});
