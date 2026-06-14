import { describe, it, expect, vi, beforeAll , afterAll} from "vitest";
import { Database } from "./app/user/db.js";
import initialiseUserAccount from "./app/user/Repository/Logic/initialise.user.js";
import argon2 from "argon2";
import dotenv from "dotenv";
import Verification from "./../../../app/user/services/Verification";
import UserSessionService from "../../../app/user/services/Session.js";
import { JWTHelper } from "../../../app/utility/jwt.js";


dotenv.config({ path: "./tests/.env" });


describe("User initialiseUserAccount",  () => {
  let verification;
  let current_code;
  let dial_code_id;
  let mysql_connection;
  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection()
    await mysql_connection.beginTransaction();

    const [result] = await mysql_connection.execute( "INSERT INTO dial_codes(abrv, dial_code, country) VALUES(?, ?, ?)", ["CHN", "86", "Testland"])
    dial_code_id = result.insertId;
    const SMSService = {
      send: vi.fn(async (phone) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        let code = "";
        let max_loop = 10;
        let count = 0;
        while (count < max_loop) {
          count++;
          let run = true;
          const rand_digit = Math.floor(Math.random() * 9);
          if (!code && rand_digit === 0) {
            continue;
          }
          if (code.length == 6) {
            break;
          }
          code += rand_digit;
        }
        current_code = code;
        console.log("OPT Code: ", code);
        return {
          success: true,
          otp: code,
        };
      }),
    };

    const EmailService = {};
    verification = new Verification(SMSService, EmailService);
  });
  afterAll(async () => {
    if (mysql_connection) {
      await mysql_connection.rollback(); // rollback all test inserts
    }
  });
  it("Initialise user", async()=>{
    //User input
    const name = "nameofuser";
    const lastname = "lastnameofuser";
    const phone = {
        dial_code_id,
        phone_body: "821234567",
        phone_full: "+27821234567",
      }
      const dob = "1990-01-01";

    //
    const IPv4 =  "127.0.0.1";
    const token = await verification.requestUserCreationVerificationCode(
      name,
      lastname,
      phone,
      dob,
     IPv4,
    );
    const set_pass_token = await verification.confirmUserCreationVerificationCode(token, current_code, IPv4)
    const user_password = "user private passwrod";
    const mysql_original_begin_trasaction_call = mysql_connection.beginTransaction;
    const mysql_original_commit_trasaction_call = mysql_connection.commit;

    //We temporarily overwite the begin, since they are called further do the callback chain
    mysql_connection.beginTransaction = vi.fn().mockResolvedValue(undefined);
    mysql_connection.commit = vi.fn().mockResolvedValue(undefined);

    const user_sessiont_instance=  new UserSessionService(mysql_connection);
    const [ device_info, device_fingerprint] = [ "testing mobile device", {passing_fp:{}, active_fp:{}}]
    const refresh_token = await user_sessiont_instance.setPasswordToUserSessionStart(set_pass_token, user_password, {IPv4, device_info, device_fingerprint})
    //reseting the back to originals
    mysql_connection.beginTransaction = mysql_original_begin_trasaction_call;
    mysql_connection.commit = mysql_original_commit_trasaction_call;
    expect(refresh_token).toBeDefined()
    const {payload:user_session_payload} = await JWTHelper.decode(refresh_token,process.env.JWT_AUTH_REFRESH_TOKEN_SECRET)
    expect(Object.keys(user_session_payload)).toContain("user_id")
    expect(Object.keys(user_session_payload)).toContain("profile_id")
    expect(Object.keys(user_session_payload)).toContain("phone_id")
    expect(Object.keys(user_session_payload)).toContain("IPv4")
    expect(Object.keys(user_session_payload)).toContain("jti")

    const {user_id, profile_id, phone_id } = user_session_payload
    //Testif the user is created and that the profile exists
        // Verify user_credentials has phone_id set
    const [[user_row]] = await mysql_connection.execute(
      "SELECT phone_id FROM user_credentials WHERE id = ?",
      [user_id]
    );
    expect(user_row.phone_id).toEqual(phone_id);

    // Verify user_profiles is linked correctly
    const [[profile_row]] = await mysql_connection.execute(
      "SELECT name, lastname, user_id, phone_id FROM user_profiles WHERE id = ?",
      [profile_id]
    );
    expect(profile_row.name).toEqual(name);
    expect(profile_row.lastname).toEqual(lastname);
    expect(profile_row.user_id).toEqual(user_id);
    expect(profile_row.phone_id).toEqual(phone_id);
   await new Promise(resolve => setTimeout(resolve, 500)); // wait half a second
  const [[session]] = await mysql_connection.execute("SELECT * FROM user_session WHERE user_id = ? AND jti = ? ;", [user_id, user_session_payload.jti]);
  expect(session.jti).toBe(user_session_payload.jti);
  expect(session.session_type).toBe("primary")
  expect(Date(session.created_at)).toStrictEqual(Date(user_session_payload.iat))

  })


})