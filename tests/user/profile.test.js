// Overall Table structure
// mysql> select * from  user_profiles;
// +----+------+----------+------------+------+-----------------+---------+----------+
// | id | name | lastname | dob        | bio  | profile_picture | user_id | phone_id |
// +----+------+----------+------------+------+-----------------+---------+----------+
// | 47 | John | Doe      | 2002-01-01 | NULL | NULL            |    NULL |     NULL |
// +----+------+----------+------------+------+-----------------+---------+----------+
// 1 row in set (0.04 sec)

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Database } from "../../microservices/user/db";
import { CredentialsRepository } from "../../microservices/user/credentials/repository";
import { ProfileRepository } from "../../microservices/user/profile/repository";
import profileDefaults from "../../microservices/user/config/profile.defaults.js";

describe("ProfileRepository", () => {
  let mysql_connection;

  let dial_code_id;
  let user_id;
  let phone_id;

  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();

    await mysql_connection.beginTransaction();

    // Create dial code
    const [dialResult] = await mysql_connection.execute(
      `
      INSERT INTO dial_codes (abrv, dial_code, country)
      VALUES (?, ?, ?)
      `,
      ["TST", "999", "Testland"]
    );

    dial_code_id = dialResult.insertId;

    // Create credentials
    user_id = await CredentialsRepository.create(
      "password123",
      mysql_connection
    );

    // Link phone
    phone_id = await CredentialsRepository.linkPhone(
      user_id,
      {
        dial_code_id,
        body: "123456789",
      },
      mysql_connection
    );
  });

  afterAll(async () => {
    try {
      await mysql_connection.rollback();
      await mysql_connection.close();
    } catch {}
  });

  it("should create a user profile", async () => {

    const profile = {
      name: "John",
      lastname: "Doe",
      dob: "2000-01-01", // Date of birth
      user_id,
      phone_id,
    };

    const profile_id = await ProfileRepository.create(
      profile,
      mysql_connection
    );

    const [[row]] = await mysql_connection.execute(
      `
      SELECT *
      FROM user_profiles
      WHERE id = ?
      `,
      [profile_id]
    );

    expect(row.name).toBe(profile.name);
    expect(row.lastname).toBe(profile.lastname);
    expect(row.dob).toBe(profile.dob);
    expect(row.user_id).toBe(user_id);
    expect(row.phone_id).toBe(phone_id);
  });

  it("should update profile fields", async () => {
    const updated = {
      name: "Jane",
      lastname: "Smith",
      bio: "some cool boi",
      profile_picture: "some picture uri"
    };

    const success = await ProfileRepository.change(
      user_id,
      updated,
      mysql_connection
    );

    expect(success).toBe(true);

    const [[row]] = await mysql_connection.execute(
      `
      SELECT name, lastname
      FROM user_profiles
      WHERE user_id = ?
      `,
      [user_id]
    );

    expect(row.name).toBe(updated.name);
    expect(row.lastname).toBe(updated.lastname);
  });

  it("should reject updates to protected fields", async () => {
    await expect(
      ProfileRepository.change(
        user_id,
        {
          phone_id: 999,
        },
        mysql_connection
      )
    ).rejects.toThrow(
      "Field 'phone_id' is not allowed for update"
    );
  });

  it("stores only modified setting deltas in MongoDB", async () => {
    const mongo_connection = {
      updateOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    };

    await ProfileRepository.patchConfig(
      user_id,
      {
        privacy: {
          lastseen: "nobody",
          about: profileDefaults.privacy.about,
        },
        notifications: {
          push: false,
        },
      },
      mongo_connection,
    );

    expect(mongo_connection.updateOne).toHaveBeenCalledWith(
      { user_id },
      {
        $setOnInsert: { user_id },
        $set: {
          "settings.privacy.lastseen": "nobody",
          "settings.notifications.push": false,
        },
        $unset: {
          "settings.privacy.about": "",
        },
      },
      { upsert: true },
    );
  });

  it("merges global defaults with user settings deltas", async () => {
    const mongo_connection = {
      findOne: vi.fn().mockResolvedValue({
        user_id,
        settings: {
          privacy: {
            lastseen: "nobody",
          },
          notifications: {
            push: false,
          },
        },
      }),
    };

    const merged = await ProfileRepository.getMergedConfig(
      user_id,
      mongo_connection,
    );

    expect(merged.privacy.lastseen).toBe("nobody");
    expect(merged.privacy.about).toBe(profileDefaults.privacy.about);
    expect(merged.notifications.push).toBe(false);
    expect(merged.recovery.backup.storage_limit_mb).toBe(
      profileDefaults.recovery.backup.storage_limit_mb,
    );
  });
});