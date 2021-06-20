import * as child from 'child_process';
import { Logging } from 'homebridge';

export default class AirConClient {
  private static readonly device = "SharpAcRaw"; // TODO: make variable

  private static loga: Logging;

  public static MIN_COOL_VALUE = 18;
  public static MAX_COOL_VALUE = 32;
  public static MIN_HEAT_VALUE = 18;
  public static MAX_HEAT_VALUE = 32;

  public static MIN_SPEED_VALUE = 0;
  public static MAX_SPEED_VALUE = 4;

  public static changeSettings(mode: number, temperature: number, speed: number, swing: boolean, logs: Logging) {
    const prestring = swing ? "key_upd_" : "key_on_";
    const poststring = swing ? "_swing" : "";
    const speedresult = speed == 1 ? "A" : speed - 1;

    if (mode == 1) {
      this.sendEvent(this.device, prestring+`heat_aTmpNorm_speed${speedresult}_${temperature}`+poststring, logs);
    } else if (mode == 2) {
      this.sendEvent(this.device, prestring+`cool_aTmpNorm_speed${speedresult}_${temperature}`+poststring, logs);
    }
    return temperature;
  }

  public static powerOff(logs :Logging) {
    this.sendEvent(this.device, `key_off`, logs);
    return true;
  }

  private static sendEvent(device: string, command: string, loga: Logging) {
    // child.exec(`irsend SEND_ONCE ${device} ${command}`);
    loga.info("Exec: " + command);
  }
}
