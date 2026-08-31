import argon2 from "argon2"
export const CredentialsRepository = (()=>{
  const resolveDialCodeId = async (phone, mysql_connection) => {
    const normalizedDialCode = String(phone.code || "").replace(/^\+/, "");

    if (phone.dial_code_id) {
      const [existing] = await mysql_connection.execute(
        "SELECT id, dial_code FROM dial_codes WHERE id = ? LIMIT 1",
        [phone.dial_code_id],
      );

      if (
        existing.length > 0 &&
        (!normalizedDialCode || String(existing[0].dial_code) === normalizedDialCode)
      ) {
        return phone.dial_code_id;
      }
    }

    const [rows] = await mysql_connection.execute(
      "SELECT id FROM dial_codes WHERE dial_code = ? LIMIT 1",
      [normalizedDialCode],
    );

    if (rows.length === 0) {
      throw new Error("Dial code does not exist");
    }

    return rows[0].id;
  };

  return {
    create: async(password_hash, mysql_connection)=>{
      const [user_result] = await mysql_connection.execute(
        "INSERT INTO user_authentication(password_hash) VALUES (?)",
        [password_hash ?? null])
      const user_id = user_result.insertId;
      return user_id;
    },
    linkPhone: async(user_id, phone, mysql_connection)=>{
      const { body } = phone;
      const dial_code_id = await resolveDialCodeId(phone, mysql_connection);

      // Insert phone number (dial_code_id must exist in dial_codes)
      const [phone_result] = await mysql_connection.execute(
        "INSERT INTO phone_numbers(dial_code_id, body, initiated_by) VALUES (?, ?, ?)",
        [dial_code_id, body, user_id]
      );
      // Get the inserted phone_id
      const phone_id = phone_result.insertId;
      // Update user_authentication with phone_id
      await mysql_connection.execute(
        "UPDATE user_authentication SET phone_id = ? WHERE id = ?",
        [phone_id, user_id]
      );
      return phone_id;
    },
    linkEmail: async (user_id, email, mysql_connection) => {
      // Insert email into user_emails (user_id must exist in user_authentication)
      const [email_result] = await mysql_connection.execute(
        "INSERT INTO user_emails(user_id, email) VALUES (?, ?)",
        [user_id, email]
      );

      // Get the inserted email_id
      const email_id = email_result.insertId;

      return email_id;
    },

    changePassword: async(user_id, new_password_hash, mysql_connection)=>{
      const [result] = await mysql_connection.execute(
        "UPDATE user_authentication SET password_hash = ? WHERE id = ?", [new_password_hash, user_id]
      );
      return result.affectedRows > 0;
    },
    verifyPassword: async (user_id, plainPassword, mysql_connection) => {
      const query = "SELECT password_hash FROM user_authentication WHERE id = ? LIMIT 1;";
      const [rows] = await mysql_connection.execute(query, [user_id]);

      if (rows.length === 0) {
        throw new Error("User not found");
      }
      const db_hashed_pass = rows[0].password_hash;
      return await argon2.verify(db_hashed_pass, plainPassword);
    },
  }
})()