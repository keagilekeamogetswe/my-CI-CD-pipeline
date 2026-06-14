export default class UserProfileRepository {
  constructor(mysql_connection, mongo_connection) {
    this.mysql_connection = mysql_connection;
    this.mongo_connection = mongo_connection;
  }

  async initialise(
    user_id,
    name,
    lastname,
    dob,
    phone,
    profile_picture_input = "",
    bio = "",
  ) {
    const profile_picture_path = "profile-pictures/";
    const profile_picture =
      profile_picture_path +
      (profile_picture_input == "" || !profile_picture_input
        ? "defualt"
        : profile_picture_input);

    return await this.mysql_connection.execute(
      `
      INSERT INTO user_profiles
        (user_id, name, lastname, dob, phone, profile_picture, bio)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        name,
        lastname,
        dob,
        phone,
        profile_picture + profile_picture,
        bio,
      ],
    );
  }

  async updateProfile(profile_id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    const query = `
      UPDATE user_profiles
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    values.push(profile_id);

    return await this.mysql_connection.execute(query, values);
  }

  async configure(profile_id, updateOps, unsetOps) {
    return await this.mongo_connection.updateOne(
      { profile: profile_id },
      {
        ...(Object.keys(updateOps).length ? { $set: updateOps } : {}),
        ...(Object.keys(unsetOps).length ? { $unset: unsetOps } : {}),
      },
      { upsert: true },
    );
  }
  async getProfileConfig(profile_id) {
    const doc = await this.mongo_connection.findOne({ profile: profile_id });
    return doc ? doc.settings || {} : {};
  }
}
