var WH2600 = require("./WH2600");
new WH2600("10.7.7.15").getLiveData().then((body) => console.log(body));
