import { normalizeDeviceContext } from "./device.context.js";

export class DeviceInfo {
  constructor(
    deviceName,
    fingerPrint,
    ipAddress,
    userAgent = "",
    deviceIdHash = "",
  ) {
    this.deviceName = deviceName;
    this.fingerPrint = fingerPrint;
    this.ipAddress = ipAddress;
    this.userAgent = userAgent;
    this.deviceIdHash = deviceIdHash;
  }

  toObject() {
    return {
      device_name: this.deviceName,
      user_agent: this.userAgent,
      webgl_fingerprint: this.fingerPrint,
      device_id_hash: this.deviceIdHash,
      ip_address: this.ipAddress,
    };
  }

  toSessionPayload() {
    return {
      device_info: this.deviceName,
      device_name: this.deviceName,
      user_agent: this.userAgent,
      webgl_fingerprint: this.fingerPrint,
      finger_print: this.fingerPrint,
      device_id_hash: this.deviceIdHash,
      ip_address: this.ipAddress,
    };
  }

  toString() {
    return JSON.stringify(this.toObject());
  }

  static fromString(jsonString) {
    const data = normalizeDeviceContext(jsonString);
    return new DeviceInfo(
      data.device_name,
      data.webgl_fingerprint,
      data.ip_address,
      data.user_agent,
      data.device_id_hash,
    );
  }
}
