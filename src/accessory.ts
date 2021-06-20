import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service
} from "homebridge";

import AirConClient from "./air_con_client";

/*
 * IMPORTANT NOTICE
 *
 * One thing you need to take care of is, that you never ever ever import anything directly from the "homebridge" module (or the "hap-nodejs" module).
 * The above import block may seem like, that we do exactly that, but actually those imports are only used for types and interfaces
 * and will disappear once the code is compiled to Javascript.
 * In fact you can check that by running `npm run build` and opening the compiled Javascript file in the `dist` folder.
 * You will notice that the file does not contain a `... = require("homebridge");` statement anywhere in the code.
 *
 * The contents of the above import statement MUST ONLY be used for type annotation or accessing things like CONST ENUMS,
 * which is a special case as they get replaced by the actual value and do not remain as a reference in the compiled code.
 * Meaning normal enums are bad, const enums can be used.
 *
 * You MUST NOT import anything else which remains as a reference in the code, as this will result in
 * a `... = require("homebridge");` to be compiled into the final Javascript code.
 * This typically leads to unexpected behavior at runtime, as in many cases it won't be able to find the module
 * or will import another instance of homebridge causing collisions.
 *
 * To mitigate this the {@link API | Homebridge API} exposes the whole suite of HAP-NodeJS inside the `hap` property
 * of the api object, which can be acquired for example in the initializer function. This reference can be stored
 * like this for example and used to access all exported variables and classes from HAP-NodeJS.
 */
let hap: HAP;

/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory("AirConLircAccessory", AirConLircAccessory);
};

class AirConLircAccessory implements AccessoryPlugin {

  private readonly log: Logging;
  private readonly name: string;

  // Some default values...
  private active = false;
  private currentStatus = hap.Characteristic.TargetHeaterCoolerState.HEAT;
  private currentTemperature = 23;
  private currentSpeed = 1;
  private currentSwing = false;

  private readonly switchService: Service;
  private readonly informationService: Service;

  constructor(log: Logging, config: AccessoryConfig, api: API) {
    this.log = log;
    this.name = config.name;

    this.switchService = new hap.Service.HeaterCooler(this.name);

    // turn on and off
    this.switchService.getCharacteristic(hap.Characteristic.Active)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("Active GET: " + (this.active? "ON": "OFF"));
        callback(undefined, this.active);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        if (this.active = value as boolean) {
          //AirConClient.changeTemp(this.currentStatus, this.currentTemperature, log);
        }else {
          AirConClient.powerOff(log);
        }
        log.info("Active SET: " + (this.active ? "ON" : "OFF"));

        callback();
      });

    // whats my current mode
    this.switchService.getCharacteristic(hap.Characteristic.CurrentHeaterCoolerState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("CurrentHeaterCoolerState GET: " + (this.currentStatus + 1));
        callback(undefined, this.currentStatus + 1);
      });

    // set mode
    this.switchService.getCharacteristic(hap.Characteristic.TargetHeaterCoolerState)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("TargetHeaterCoolerState GET: " + (this.currentStatus));
        callback(undefined, (this.currentStatus));
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        log.info("TargetHeaterCoolerState SET: " + (value as number));
        this.currentStatus = value as number;
        this.setAirconSettings(value, this.currentTemperature, this.currentSpeed, this.currentSwing);
        callback();
      })
      .setProps({
        minValue: 1, //disable auto for now
      });;

    // get current temp
    this.switchService.getCharacteristic(hap.Characteristic.CurrentTemperature)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        const temperature = this.active ? this.currentTemperature : 0;
        log.info("CurrentTemperature GET: " + temperature);
        callback(undefined, temperature);
      });

    // celcius
    this.switchService.getCharacteristic(hap.Characteristic.TemperatureDisplayUnits)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("TemperatureDisplayUnits GET: " + hap.Characteristic.TemperatureDisplayUnits.CELSIUS);
        callback(undefined, hap.Characteristic.TemperatureDisplayUnits.CELSIUS);
      });

    // heating temp
    this.switchService.getCharacteristic(hap.Characteristic.HeatingThresholdTemperature)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("HeatingThresholdTemperature GET: " + this.currentTemperature);
        callback(undefined, this.currentTemperature);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        log.info("HeatingThresholdTemperature SET: " + (value as number));
        this.currentStatus = hap.Characteristic.TargetHeaterCoolerState.HEAT;
        this.currentTemperature = this.setAirconSettings(hap.Characteristic.TargetHeaterCoolerState.HEAT, value as number, this.currentSpeed, this.currentSwing);
        callback();
      })
      .setProps({
        minValue: AirConClient.MIN_HEAT_VALUE,
        maxValue: AirConClient.MAX_HEAT_VALUE,
        minStep: 1
      });;

    // cooling temp
    this.switchService.getCharacteristic(hap.Characteristic.CoolingThresholdTemperature)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("CoolingThresholdTemperature GET: " + this.currentTemperature);
        callback(undefined, this.currentTemperature);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        log.info("CoolingThresholdTemperature SET: " + (value as number));
        this.currentStatus = hap.Characteristic.TargetHeaterCoolerState.COOL;
        this.currentTemperature = this.setAirconSettings(hap.Characteristic.TargetHeaterCoolerState.COOL, value as number, this.currentSpeed, this.currentSwing);
        callback();
      })
      .setProps({
        minValue: AirConClient.MIN_COOL_VALUE,
        maxValue: AirConClient.MAX_COOL_VALUE,
        minStep: 1,
      });;

      // swing
      this.switchService.getCharacteristic(hap.Characteristic.SwingMode)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("SwingMode GET: " + this.currentSwing);
        callback(undefined, this.currentSwing);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        log.info("SwingMode SET: " + (value as number));
        this.currentSwing = (value as boolean);
        this.setAirconSettings(this.currentStatus, this.currentTemperature, this.currentSpeed, this.currentSwing);
        callback();
      })

      //speed of fan
      this.switchService.getCharacteristic(hap.Characteristic.RotationSpeed)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicGetCallback) => {
        log.info("RotationSpeed GET: " + this.currentSpeed);
        callback(undefined, this.currentSpeed);
      })
      .on(CharacteristicEventTypes.SET, (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        log.info("RotationSpeed SET: " + (value as number));
        this.currentSpeed = (value as number);
        this.setAirconSettings(this.currentStatus, this.currentTemperature, value as number, this.currentSwing);
        callback();
      })
      .setProps({
        minValue: AirConClient.MIN_SPEED_VALUE,
        maxValue: AirConClient.MAX_SPEED_VALUE,
        minStep: 1,
      });;

    // info
    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, "AirConLircAccesoryManufacturer")
      .setCharacteristic(hap.Characteristic.Model, "AirConLircAccesoryModel");

    log.info("AirConLircAccesory finished initializing!");
  }

  private setAirconSettings(mode: any, temperature: number , speed: number, swing: boolean): number {
    this.log.info("testcoolnum "+mode);
    switch (mode) {
      case hap.Characteristic.TargetHeaterCoolerState.COOL:
        this.log.info("testcoolout");
        if (temperature < AirConClient.MIN_COOL_VALUE || temperature > AirConClient.MAX_COOL_VALUE) {
          this.log.info("testcool");
          return AirConClient.changeSettings(mode, temperature, speed, swing, this.log);
        }
        break;
      case hap.Characteristic.TargetHeaterCoolerState.HEAT:
        if (temperature < AirConClient.MAX_HEAT_VALUE || temperature > AirConClient.MAX_HEAT_VALUE) {
          return AirConClient.changeSettings(mode, temperature, speed, swing, this.log);
        }
        break;
      default:
        return temperature;
    }
    return temperature;
  }

  /*
   * This method is optional to implement. It is called when HomeKit ask to identify the accessory.
   * Typical this only ever happens at the pairing process.
   */
  identify(): void {
    this.log("Identify!");
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.switchService,
    ];
  }

}
