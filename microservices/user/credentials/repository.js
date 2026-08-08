export const CredentialsRepository = (()=>{

  return {
    create: async(password_hash, mysql_connection)=>{
      const [user_result] = await mysql_connection.execute(
        "INSERT INTO user_authentication(password_hash) VALUES (?)",
        [password_hash ?? null])
      const user_id = user_result.insertId;
      return user_id;
    },
    linkPhone: async(user_id, phone, mysql_connection)=>{
      const { dial_code_id, body } = phone;

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
    changePassword: async(user_id, new_password_hash, mysql_connection)=>{
      const [result] = await mysql_connection.execute(
        "UPDATE user_authentication SET password_hash = ? WHERE id = ?", [new_password_hash, user_id]
      );
      return result.affectedRows > 0;
    }
  }
})()