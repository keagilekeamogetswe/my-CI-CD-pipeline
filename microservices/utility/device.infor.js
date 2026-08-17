class DeviceInfo {
  constructor(deviceName, fingerPrint, ipAddress) {
    this.deviceName = deviceName;
    this.fingerPrint = fingerPrint;
    this.ipAddress = ipAddress;
  }

  toObject() {
    return {
      device_name: this.deviceName,
      finger_print: this.fingerPrint,
      ip_address: this.ipAddress,
    };
  }

  toString() {
    return JSON.stringify(this.toObject());
  }

  static fromString(jsonString) {
    const data = JSON.parse(jsonString);
    return new DeviceInfo(data.device_name, data.finger_print, data.ip_address);
  }
}
