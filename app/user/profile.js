import UserProfileRepository from "./profile.repository.js";

export class UserProfile {
  constructor(sqlConnection, mongoCollection, defaults) {
    this.repository = new UserProfileRepository(sqlConnection, mongoCollection);
    this.defaults = defaults;
  }

  async initialise(user_id, name, lastname, dob, phone) {
    return await this.repository.initialise(
      user_id,
      name,
      lastname,
      dob,
      phone,
    );
  }

  async updateProfile(user_id, updates) {
    return await this.repository.updateProfile(user_id, updates);
  }

  async configure(user_id, config) {
    const updateOps = {};
    const unsetOps = {};

    for (const [key, value] of Object.entries(config)) {
      if (this.defaults[key] !== undefined && this.defaults[key] === value) {
        unsetOps[`settings.${key}`] = "";
      } else {
        updateOps[`settings.${key}`] = value;
      }
    }

    return await this.repository.configure(user_id, updateOps, unsetOps);
  }
}
