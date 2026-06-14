import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import { Database } from "../../../../../app/user/db.js";
import initialiseUserAccount from "../../../../../app/user/Repository/Logic/initialise.user.js";
import argon2 from "argon2";
import dotenv from "dotenv";

dotenv.config({ path: "./tests/.env" });


describe("UserRepository initialiseUserAccount", () => {
  let mysql_connection;
  let dial_code_id;

  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();

    // Insert a test dial_code so we can reference it
    const [dial_result] = await mysql_connection.execute(
      "INSERT INTO dial_codes(abrv, dial_code, country) VALUES (?, ?, ?)",
      ["TST", "999", "Testland"]
    );
    dial_code_id = dial_result.insertId;
  });

  afterAll(async () => {
    if (mysql_connection) {
      await mysql_connection.rollback(); // rollback all test inserts
    }
  });

  it("should insert user_credentials, phone_numbers, and user_profiles", async () => {
    const password_hash = await argon2.hash("secret123");

    const payload = {
      name: "Alice",
      lastname: "Tester",
      dob: "1990-01-01",
      phone: {
        dial_code_id,
        phone_body: "1234567890",
      },
      password_hash,
    };
    // Copy original methods
    const mysql_original_begin_trasaction_call = mysql_connection.beginTransaction;
    const mysql_original_commit_trasaction_call = mysql_connection.commit;

    //We temporarily overwite the begin, since they are called further do the callback chain
    mysql_connection.beginTransaction = vi.fn().mockResolvedValue(undefined);
    mysql_connection.commit = vi.fn().mockResolvedValue(undefined);
    //initialiseUserAccount will call commit so mocking the commit and beginTransaction we're preventing the db operation from actually commiting when commit is called.
    const { user_id, phone_id, profile_id } = await initialiseUserAccount(
      mysql_connection,
      payload
    );
    //reseting the back to originals
    mysql_connection.beginTransaction = mysql_original_begin_trasaction_call;
    mysql_connection.commit = mysql_original_commit_trasaction_call;

    expect(user_id).toBeDefined();
    expect(phone_id).toBeDefined();
    expect(profile_id).toBeDefined();

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
    expect(profile_row.name).toEqual("Alice");
    expect(profile_row.lastname).toEqual("Tester");
    expect(profile_row.user_id).toEqual(user_id);
    expect(profile_row.phone_id).toEqual(phone_id);
  });

  it("should rollback if required fields are missing", async () => {
    // Copy original methods
    const mysql_original_begin_trasaction_call = mysql_connection.beginTransaction;
    const mysql_original_commit_trasaction_call = mysql_connection.commit;
    const mysql_original_rollback_trasaction_call = mysql_connection.rollback;


    //We temporarily overwite the begin, since they are called further do the callback chain
    mysql_connection.beginTransaction = vi.fn().mockResolvedValue(undefined);
    mysql_connection.commit = vi.fn().mockResolvedValue(undefined);
    mysql_connection.rollback = vi.fn().mockResolvedValue(undefined);



    const badPayload = {
      name: "Bob",
      lastname: "Broken",
      dob: "1985-05-05",
      phone: { dial_code_id, phone_body: "5555555" },
      // missing password_hash
    };

    await expect(
      initialiseUserAccount(mysql_connection, badPayload)
    ).rejects.toThrow();
    mysql_connection.beginTransaction = mysql_original_begin_trasaction_call;
    mysql_connection.commit = mysql_original_commit_trasaction_call;
    mysql_connection.rollback = mysql_original_rollback_trasaction_call;

    // Ensure no user_credentials row was created
    const [rows] = await mysql_connection.execute(
      "SELECT * FROM user_credentials WHERE password_hash IS NULL"
    );
    expect(rows.length).toBe(0);
  });
});
