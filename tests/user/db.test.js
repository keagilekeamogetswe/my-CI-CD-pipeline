import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Database } from "../../app/user/db.js";
import { MongoClient } from "mongodb";

describe.skip("Database Connection Integration Tests", () => {
  beforeAll(async () => {
    // 1. Connect directly to the admin database where the root user lives
    const adminUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin?authSource=admin`;
    const adminClient = new MongoClient(adminUri);

    try {
      await adminClient.connect();

      // 2. We execute the command on the 'admin' database context
      const adminDb = adminClient.db("admin");

      // 3. Dynamically give your existing admin user full rights over your target test database
      await adminDb.command({
        grantRolesToUser: process.env.MONGO_USER, // "admin"
        roles: [
          { role: "readWrite", db: process.env.MONGO_DB },
          { role: "dbAdmin", db: process.env.MONGO_DB },
        ],
      });
    } catch (error) {
      // If roles are already granted, Mongo might throw an error or handle it gracefully.
      // If it's a critical error, log it.
      if (!error.message.includes("already exists")) {
        console.error(
          "Setup Notice during MongoDB authorization:",
          error.message,
        );
      }
    } finally {
      await adminClient.close();
    }
  });

  // Clean up connections after tests finish so Vitest doesn't hang
  afterAll(async () => {
    await Database.closeConnections();
  });

  it("should successfully connect to MySQL and execute a test query", async () => {
    // Note: Added await here if getSQLConnection returns a promise asynchronously
    const pool = await Database.getSQLConnection();

    // Execute a simple connection handshake query
    const [rows] = await pool.query("SELECT 1 + 1 AS result");

    expect(pool).toBeDefined();
    expect(rows[0].result).toBe(2);
  });

  it("should successfully connect to MongoDB and write/read a document", async () => {
    const testCollectionName = "vitest_connection_test";
    const collection = await Database.getMongoConnection(testCollectionName);

    expect(collection).toBeDefined();

    // Insert a dummy payload
    const insertResult = await collection.insertOne({
      test: "vitest",
      date: new Date(),
    });
    expect(insertResult.acknowledged).toBe(true);

    // Read it back
    const foundDoc = await collection.findOne({ _id: insertResult.insertedId });
    expect(foundDoc).not.toBeNull();
    expect(foundDoc.test).toBe("vitest");
  });
});
