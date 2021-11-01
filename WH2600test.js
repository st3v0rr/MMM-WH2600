const WH2600 = require("./WH2600");

new WH2600("192.168.0.10").getLiveData().then((body) => console.log(body));
