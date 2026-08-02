export default async function initialiseUserAccount(mysql_connection, { name, lastname, phone, dob, password_hash }) {
  /**
   * Initialise a new user:
   * - Insert into user_credentials
   * - Insert into phone_numbers
   * - Populate user_profiles with corresponding user_id and phone_id
   */

    await mysql_connection.beginTransaction();

    try {
      // 1. Hash password and insert into user_credentials
      const [user_result] = await mysql_connection.execute(
        "INSERT INTO user_credentials(password_hash) VALUES (?)",
        [password_hash]
      );
      const user_id = user_result.insertId;

      // 2. Insert phone number (dial_code_id must exist in dial_codes)
      // For simplicity, assume dial_code_id is passed in payload
      const { dial_code_id, phone_body } = phone;
      const [phone_result] = await mysql_connection.execute(
        "INSERT INTO phone_numbers(dial_code_id, phone_body, initiated_by) VALUES (?, ?, ?)",
        [dial_code_id, phone_body, user_id]
      );
      const phone_id = phone_result.insertId;

      // 3. Update user_credentials with phone_id
      await mysql_connection.execute(
        "UPDATE user_credentials SET phone_id = ? WHERE id = ?",
        [phone_id, user_id]
      );

      // 4. Populate user_profiles
      const [profile_result] = await mysql_connection.execute(
        `INSERT INTO user_profiles(name, lastname, dob, user_id, phone_id)
         VALUES (?, ?, ?, ?, ?)`,
        [name, lastname, dob, user_id, phone_id]
      );
      const profile_id = profile_result.insertId;

      await mysql_connection.commit();

      return { user_id, phone_id, profile_id };
    } catch (err) {
      await mysql_connection.rollback();
      throw err;
    }
  }
