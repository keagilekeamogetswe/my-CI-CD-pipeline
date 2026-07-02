import { describe, it, beforeAll, afterAll, expect } from "vitest";
import dotenv from "dotenv";
import { Database } from "../../app/user/db.js";
import argon2 from "argon2";

dotenv.config({ path: "./tests/.env" });

describe("Database testing: New migrated version.", () => {
  let mysql_connection;
  let countries = {};
  let user_id;

  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();
    await mysql_connection.beginTransaction();
  });

  afterAll(async () => {
    if (mysql_connection) {
      await mysql_connection.rollback();
      await mysql_connection.end();
    }
  });

  it("Should add dial codes", async () => {
    const query =
      "INSERT INTO dial_codes(abrv, dial_code, country) VALUES(?, ?, ?)";
    const entries = [
      ["ZAR", "27", "South Africa"],
      ["USA", "1", "Unites States of America"],
      ["FRC", "33", "France"],
    ];

    /**
     * PRODUCTION CONSIDERATION:
     * Replaced an uncontrolled 'forEach' wrapper loop with an explicit 'for...of' loop.
     * Array.prototype.forEach executes concurrently and does not respect 'await',
     * which causes query race conditions and premature Promise resolution hooks.
     */
    for (const entry of entries) {
      const [ABR] = entry;
      const [{ insertId }] = await mysql_connection.execute(query, entry);
      countries[ABR.toLowerCase()] = insertId;
    }

    console.log("length: ", Object.keys(countries).length);
    Object.values(countries).forEach((insertID) =>
      expect(insertID).toBeDefined(),
    );
  });

  it("Should insert user and initialise the profile", async () => {
    const password_hash = await argon2.hash("testing_password");
    const query_insert_user =
      "INSERT INTO user_credentials(password_hash) VALUES(?)";
    const [user_result] = await mysql_connection.execute(query_insert_user, [
      password_hash,
    ]);
    user_id = user_result.insertId;

    const query_insert_phone =
      "INSERT INTO phone_numbers(dial_code_id, phone_body, initiated_by) VALUES (?, ?, ?)";

    const selected_code_id =
      Object.values(countries)[
        Math.floor(Math.random() * Object.keys(countries).length)
      ];
    const phone_body = 23456789;
    expect(selected_code_id).toBeDefined();

    const [result_phone] = await mysql_connection.execute(query_insert_phone, [
      selected_code_id,
      phone_body,
      user_id,
    ]);
    const phone_id = result_phone.insertId;

    /**
     * PRODUCTION CONSIDERATION:
     * Fixed critical table-wide deadlock.
     * Appended the missing 'WHERE id = ?' filtering constraint target.
     * Executing an update query missing a filter clause forces an exclusive write-lock
     * across the entire table space, freezing uncommitted relational transaction records.
     */
    const query_update_user =
      "UPDATE user_credentials SET phone_id = ? WHERE id = ?";
    const [result_update_phone] = await mysql_connection.execute(
      query_update_user,
      [phone_id, user_id],
    );

    const rows_affected = result_update_phone.affectedRows;

    if (!rows_affected || !phone_id || !user_id) {
      console.log("operation failure: ", {
        rows_affected,
        phone_id,
        user_id,
        dial_code_id: selected_code_id,
      });
    }

    expect(user_id).toBeDefined();
    expect(phone_id).toBeDefined();
    expect(selected_code_id).toBeDefined();
    expect(rows_affected).toBeTruthy();
  });

  it("Should throw an error if the user_credential is deleted with nullified phone_id", async () => {
    const query_delete_user = "DELETE FROM user_credentials WHERE id = ?";

    const [[row]] = await mysql_connection.execute(
      "SELECT phone_id FROM user_credentials WHERE id = ?",
      [user_id],
    );

    if (!row || !row.phone_id) {
      console.log("phone_id is null: ", { phone_id: row?.phone_id, user_id });
    }

    await expect(
      mysql_connection.execute(query_delete_user, [user_id]),
    ).rejects.toThrow();
  });

  it("Should now delete the user_credential after nullifying the phone_id", async () => {
    const update_query =
      "UPDATE user_credentials SET phone_id = null WHERE id = ?";
    const delete_query = "DELETE FROM user_credentials WHERE id = ?";

    const [update_result] = await mysql_connection.execute(update_query, [
      user_id,
    ]);
    const rows_affected_update = update_result.affectedRows;
    if (!rows_affected_update) console.log("update failure: ", { user_id });
    expect(rows_affected_update).toBeTruthy();

    const [delete_result] = await mysql_connection.execute(delete_query, [
      user_id,
    ]);
    const rows_affected_delete = delete_result.affectedRows;
    if (!rows_affected_delete) console.log("delete failure: ", { user_id });
    expect(rows_affected_delete).toBeTruthy();
  });
});
