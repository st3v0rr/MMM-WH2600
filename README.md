# MMM-WH2600

This is a module for the [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror/).

A Module for MagicMirror² designed to integrate with a WH2600 System. Dependent on your configuration it can display several statistics.

- Temperature and humidity for all registered sensors
- Wind data
- UV index
- Rain data

## Installation
Go to your MagicMirror folder and run the following commands:
```bash
cd modules
git clone https://github.com/st3v0rr/MMM-WH2600.git
cd MMM-WH2600
npm i
```
Wait until npm has finished.

## Update
Go to your MagicMirror folder and run the following commands:
```bash
cd modules/MMM-WH2600
git pull
npm i
```

## Using the module

To use this module, add the following configuration block to the modules array in the `config/config.js` file:

### Basic config
```js
{
    module: 'MMM-WH2600',
    position: 'upper_third',
    config: {
        ipWH2600: "XX.XX.XX.XX" //IP of the WH2600 data logger
    }
}
```

### Advanced config with additional sensors registered
```js
{
    module: 'MMM-WH2600',
    position: 'upper_third',
    config: {
        ipWH2600: "XX.XX.XX.XX", //IP of the WH2600 data logger
        locationInfo: "Mystreet 1, 1234 Mylocation", //Some additional informations to the location of the WH2600
        locationMetersAboveSeaLevel: 300, //Nice to have for correct calcluation of the atmospheric pressure
        indoorSensors: [ //all your indoor temperature  sensors
          { //default
            label: "entrance", //place a useful location info
            temp: "intemp", //is the default indoor sensor
            humid: "inhumid" //is the default indoor humidity
          },
          { //optional: additional sensors
            label: "living room", //place a useful explanation e. g. "living room"
            temp: "temp1", //it's always "temp+channelnumber" up to 8
            humid: "humid1" //it's always "humid+channelnumber" up to 8
          },
        ],
        outdoorSensors: [ //all your outdoor temperature  sensors
          { //default
            label: "garden", //place a useful location info
            temp: "outtemp", //is the default indoor sensor
            humid: "outhumid" //is the default indoor humidity
          },
          { //optional: additional sensors
            label: "garage", //place a useful explanation e. g. "living room"
            temp: "temp2", //it's always "temp+channelnumber" up to 8
            humid: "humid2" //it's always "humid+channelnumber" up to 8
          },
        ]
    }
}
```


## Configuration options

| Option                            | Description
|-----------------                  |-----------
| `ipWH2600`                        | *Required* IP of the WH2600 data logger
| `locationInfo`                    | *Optional* Some additional informations to the location of the WH2600
| `locationMetersAboveSeaLevel`     | *Optional* Nice to have for correct calcluation of the atmospheric pressure
| `tempSwitchInterval`              | *Optional* Time between switching the temp sensors (default is 5 seconds)
| `indoorSensors`                   | *Optional* Show additional indoor sensors (see advanced config)
| `outdoorSensors`                  | *Optional* Show additional outdoor sensors (see advanced config)

## Samples
![alt text](https://github.com/st3v0rr/MMM-WH2600/raw/main/docs/WH2600.png "Example")

