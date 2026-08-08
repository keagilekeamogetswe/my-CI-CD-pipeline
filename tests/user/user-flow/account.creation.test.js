import { describe, it, expect, vi, beforeAll, afterAll} from "vitest";
import argon2 from "argon2";
import * as crypto from "node:crypto";

import { Notification } from "../../../microservices/utility/notifications";

// Mock notifications
vi.mock("../../../microservices/utility/notifications", () => ({
  Notification: {
    Email: {
      send: vi.fn().mockResolvedValue(true),
    },
    SMS: {
      send: vi.fn().mockResolvedValue(true),
    },
  },
}));
// Mock randInt for predictable outcome
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual("node:crypto");

  return {
    ...actual,
    randomInt: vi.fn(() => "123456789"),
  };
});
import {AccountCreation} from "../../../microservices/user/user-flow/account.creation"
import { Database } from "../../../microservices/user/db";
import { JWTHelper } from "../../../microservices/utility/jwt";
import { setTimeout } from "node:timers";

describe("User Creation flow tests",()=>{
    let mysql_connection;
    let dial_code_id;

    beforeAll(async () => {
      mysql_connection = await Database.getSQLConnection();

      await mysql_connection.beginTransaction();

      // Create a test dial code for phone number creation
      const [result] = await mysql_connection.execute(
        `
        INSERT INTO dial_codes (abrv, dial_code, country)
        VALUES (?, ?, ?)
        `,
        ["ZAR", "27", "South Africa"]
      );

      dial_code_id = result.insertId;
    });

    afterAll(async () => {
      try {
        await mysql_connection.rollback();
        await mysql_connection.close();

      } catch(error) {
        console.log("done")
      }
    });
  it("Creating and verifying user",async ()=>{
    console.log(AccountCreation)
    const phone = {code: "27", dial_code_id: dial_code_id , body: "123456789"}
    const device_auto_detected_info = {
      fp_hash: "device finger print hash",
      ip_address: "127.0.0.0",
      device_info: "Some device brand probably with model"
     }
    const token =  await AccountCreation.request("John", "Emori", "2003-09-20", phone, device_auto_detected_info);
    const refresh_token = await AccountCreation.confirm(token, "123456789", mysql_connection)
    const refresh_payload = await JWTHelper.decode(refresh_token, process.env.JWT_AUTH_REFRESH_TOKEN_SECRET)
    console.log(refresh_payload)
    await new Promise(resolve=>setTimeout(resolve, 300))
    const [[session_result]] = await mysql_connection.execute("SELECT * FROM user_session WHERE jti = ?", [refresh_payload.payload.jti])

    expect(session_result.ip_address).toBe(refresh_payload.payload.ip_address)
    expect(session_result.jti).toBe(refresh_payload.payload.jti)


  })

})