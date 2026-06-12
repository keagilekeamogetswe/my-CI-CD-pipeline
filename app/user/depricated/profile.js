import UserProfileRepository from "./profile.repository.js";
import defaults from "../config/profile.defaults.js";
export class UserProfile {
  constructor(sqlConnection, mongoCollection) {
    this.repository = new UserProfileRepository(sqlConnection, mongoCollection);
    this.defaults = defaults;
  }

  async initialise(user_id, name, lastname, dob, phone, profile_picture, bio) {
    return await this.repository.initialise(
      user_id,
      name,
      lastname,
      dob,
      phone,
      profile_picture,
      bio,
    );
  }

  async updateProfile(profile_id, updates) {
    return await this.repository.updateProfile(profile_id, updates);
  }

  async configure(profile_id, config) {
    const updateOps = {};
    const unsetOps = {};

    for (const [key, value] of Object.entries(config)) {
      if (this.defaults[key] !== undefined && this.defaults[key] === value) {
        unsetOps[`settings.${key}`] = "";
      } else {
        updateOps[`settings.${key}`] = value;
      }
    }

    return await this.repository.configure(profile_id, updateOps, unsetOps);
  }
  async getProfileConfig(profile_id) {
    return await this.repository.getProfileConfig(profile_id);
  }
}
