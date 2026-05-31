import { describe, it, expect, beforeAll, afterAll } from "vitest";
import dotenv from "dotenv";
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import { UserProfile } from "../../app/user/profile.js";

dotenv.config({ path: "./tests/.env" });

describe("User profile tests (integration)", () => {
  let mysql_connection;
  let mongo_client;
  let mongo_collection;
  let userProfile;
  let user_id;

  const defaults = {
    lastseen: "contacts",
    profile_picture: "everyone",
    about: "everyone",
    online: "contacts",
  };

  beforeAll(async () => {
    const { MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASS, MYSQL_DB } =
      process.env;

    mysql_connection = await mysql.createConnection({
      host: MYSQL_HOST,
      port: MYSQL_PORT,
      user: MYSQL_USER,
      password: MYSQL_PASS,
      database: MYSQL_DB,
      ssl: false,
      allowPublicKeyRetrieval: true,
    });

    // Clean previous test data
    await mysql_connection.execute(
      "DELETE FROM user_credentials WHERE email = ?",
      ["profiles@test_db.com"],
    );

    await mysql_connection.execute("DELETE FROM user_profiles");

    // Insert test user
    const [result] = await mysql_connection.execute(
      `
    INSERT INTO user_credentials
      (username, email, password_hash)
    VALUES (?, ?, ?)
    `,
      ["profile_test_agent", "profiles@test_db.com", "dummy-hash"],
    );

    user_id = result.insertId;

    const mongo_uri =
      `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}` +
      `@localhost:${process.env.MONGO_PORT}/${process.env.MONGO_DB}` +
      `?authSource=admin`;

    mongo_client = new MongoClient(mongo_uri);
    await mongo_client.connect();

    const db = mongo_client.db(process.env.MONGO_DB);

    // Ensure collection exists
    const collections = await db.listCollections().toArray();
    const exists = collections.some((c) => c.name === "user_profiles");

    if (!exists) {
      await db.createCollection("user_profiles");
    }

    mongo_collection = db.collection("user_profiles");

    // Clean Mongo test data
    await mongo_collection.deleteMany({});

    userProfile = new UserProfile(mysql_connection, mongo_collection, defaults);
  });

  afterAll(async () => {
    await mysql_connection.execute(
      "DELETE FROM user_credentials WHERE id = ?",
      [user_id],
    );

    await mysql_connection.end();
    await mongo_client.close();
  });

  it("test the connection for mysql", async () => {
    const [rows] = await mysql_connection.execute("SELECT 1 + 1 AS result");
    expect(rows[0].result).toBe(2);
  });
  it("tests the Mongo connection", async () => {
    const collections = await mongo_client
      .db("test_db")
      .listCollections({ name: "user_profiles" })
      .toArray();

    expect(collections).toHaveLength(1);
  });

  it("should initialise user profile", async () => {
    await userProfile.initialise(
      user_id,
      "Keamogetswe",
      "K",
      "1995-01-01",
      "+27123456789",
    );

    const [rows] = await mysql_connection.execute(
      "SELECT * FROM user_profiles WHERE user_id = ?",
      [user_id],
    );
    console.log(rows);

    expect(rows[0].name).toBe("Keamogetswe");
    expect(rows[0].lastname).toBe("K");
  });

  it("should configure settings on the profile", async () => {
    await userProfile.configure(user_id, { online: "nobody" });

    const doc = await mongo_collection.findOne({ user: user_id });
    expect(doc.settings.online).toBe("nobody");
  });

  it("should reset settings to default on the profile and remove them from db records", async () => {
    // First set a non-default
    await userProfile.configure(user_id, { online: "nobody" });
    let doc = await mongo_collection.findOne({ user: user_id });
    expect(doc.settings.online).toBe("nobody");

    // Now reset to default
    await userProfile.configure(user_id, { online: "contacts" });
    doc = await mongo_collection.findOne({ user: user_id });
    expect(doc.settings.online).toBeUndefined(); // field removed
  });
});
