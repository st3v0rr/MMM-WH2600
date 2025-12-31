const EWG = require('ecowitt-gateway');
const gw = new EWG('192.168.x.x', 45000); //port default is 45000 and is optional

gw.getLiveData()
.then(data => {
  console.log(JSON.stringify(data));
});
