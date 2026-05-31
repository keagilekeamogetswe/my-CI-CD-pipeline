export default class UserProfileRepository {
  constructor(mysql_connection, mongo_connection) {
    this.mysql_connection = mysql_connection;
    this.mongo_connection = mongo_connection;
  }

  async initialise(user_id, name, lastname, dob, phone) {
    return await this.mysql_connection.execute(
      `
      INSERT INTO user_profiles
        (user_id, name, lastname, dob, phone)
      VALUES (?, ?, ?, ?, ?)
      `,
      [user_id, name, lastname, dob, phone],
    );
  }

  async updateProfile(user_id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    const query = `
      UPDATE user_profiles
      SET ${fields.join(", ")}
      WHERE user_id = ?
    `;

    values.push(user_id);

    return await this.mysql_connection.execute(query, values);
  }

  async configure(user_id, updateOps, unsetOps) {
    return await this.mongo_connection.updateOne(
      { user: user_id },
      {
        ...(Object.keys(updateOps).length ? { $set: updateOps } : {}),
        ...(Object.keys(unsetOps).length ? { $unset: unsetOps } : {}),
      },
      { upsert: true },
    );
  }
}
