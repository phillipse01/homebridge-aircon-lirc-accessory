import * as child from 'child_process';

export default class AirConClient {
  private static readonly device = "SharpAcRaw"; // TODO: make variable

  public static MIN_COOL_VALUE = 18;
  public static MAX_COOL_VALUE = 32;
  public static MIN_HEAT_VALUE = 18;
  public static MAX_HEAT_VALUE = 32;

  public static changeTemp(mode: number, temperature: number) {
    if (mode == 1) {
      this.sendEvent(this.device, `HEAT_${temperature}_MED`);
    } else if (mode == 2) {
      this.sendEvent(this.device, `COOL_${temperature}_MED`);
    }
    return temperature;
  }

  public static powerOff() {
    this.sendEvent(this.device, `key_off`);
    return true;
  }

  private static sendEvent(device: string, command: string) {
    for (var i = 0; i < 3; i++) {
      // Send the event multiple times just in case the receiver didn't get it
      child.exec(`irsend SEND_ONCE ${device} ${command}`);
    }
  }
}
