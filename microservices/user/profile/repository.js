export const ProfileRepository  = (()=>{
  return{
    create: async({name, lastname, dob, user_id, phone_id }, mysql_connection)=>{
      const [profile_result] = await mysql_connection.execute(
        `INSERT INTO user_profiles(name, lastname, dob, user_id, phone_id)
         VALUES (?, ?, ?, ?, ?)`,
        [name, lastname, dob, user_id, phone_id]
      );
      const profile_id = profile_result.insertId;
      return profile_id;
    },
    change: async(user_id, updates, mysql_connection)=>{
      const allowedFields = ['name', 'lastname', "bio", "profile_picture"];
      // check if updates contain only allowed fields
      Object.keys(updates).forEach(field =>{
        if (!allowedFields.includes(field)) {
          throw new Error(`Field '${field}' is not allowed for update`);
        }
      });
      // Build the SET clause dynamically based on the updates object
      const setClause = Object.keys(updates).map(field => `${field} = ?`).join(', ');
      const values = Object.values(updates);
      values.push(user_id);

      const [result] = await mysql_connection.execute(
        `UPDATE user_profiles SET ${setClause} WHERE user_id = ?`,
        values
      );
      return result.affectedRows > 0;
    },
    patchConfig:async(user_id, config, mongo_connection)=>{
      // MONGO DB: Update user configuration in MongoDB

    }
  }
})()