/* MagicMirror²
 * Node Helper: MMM-WH2600
 *
 * By Stefan Nachtrab
 * MIT Licensed.
 */

var NodeHelper = require("node_helper");
const EWG = require('ecowitt-gateway');

module.exports = NodeHelper.create({
  /* socketNotificationReceived(notification, payload)
   * This method is called when a socket notification arrives.
   *
   * argument notification string - The identifier of the noitication.
   * argument payload mixed - The payload of the notification.
   */
  socketNotificationReceived: function (notification, payload) {
    var self = this;
    const gw = new EWG(payload.config.ipWH2600, payload.config.portWH2600); //port default is 45000 and is optional
    if (notification === "MMM-WH2600-NOTIFICATION_CURRENTDATA_REQUESTED") {
      gw.getLiveData()
        .then(body => {
          self.sendSocketNotification(
            "MMM-WH2600-NOTIFICATION_CURRENTDATA_RECEIVED",
            body
          );
        })
        .catch(error => {
          console.error("MMM-WH2600 node_helper getLiveData failed:", error);
        });
    }
  }
});
