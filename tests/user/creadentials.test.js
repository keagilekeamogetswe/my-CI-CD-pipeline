import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Database } from "../../microservices/user/db";
import { CredentialsRepository } from "../../microservices/user/credentials/repository";

describe("CredentialsRepository", () => {
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
      ["TST", "999", "Testland"]
    );

    dial_code_id = result.insertId;
  });

  afterAll(async () => {
    try {
      await mysql_connection.rollback();
      await mysql_connection.close();

    } finally {

    }
  });

  it("should create credentials and link a phone number", async () => {
    const password = "password123";

    // Create credentials
    const user_id = await CredentialsRepository.create(
      password,
      mysql_connection
    );

    // Verify credentials
    const [[credentialRows]] = await mysql_connection.execute(
      `
      SELECT password_hash
      FROM user_authentication
      WHERE id = ?
      `,
      [user_id]
    );

    expect(credentialRows.password_hash).toBe(password);

    // Link phone
    const phone = {
      dial_code_id,
      body: "123456789",
    };

    const phone_id = await CredentialsRepository.linkPhone(
      user_id,
      phone,
      mysql_connection
    );

    // Verify phone
    const [[phoneRows]] = await mysql_connection.execute(
      `
      SELECT *
      FROM phone_numbers
      WHERE id = ?
      `,
      [phone_id]
    );
    console.log(phoneRows);


    expect(phoneRows.dial_code_id).toBe(dial_code_id);
    expect(phoneRows.body).toBe(phone.body);
    expect(phoneRows.initiated_by).toBe(user_id);
  });
  it("should allow null users", async()=>{
    const user_id = await CredentialsRepository.create(null, mysql_connection)
    const [[user_row]] = await mysql_connection.execute("SELECT * FROM user_authentication WHERE id = ?", [user_id])
    const [[user_view_row]] =   await mysql_connection.execute("SELECT * FROM user_credentials WHERE id = ?", [user_id])
    console.log(user_row)
    expect(user_id).toBe(user_row.id)
    expect(user_view_row?.id).toBeUndefined()
  })
});