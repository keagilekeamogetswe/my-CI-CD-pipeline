// database.js
import { createPool } from "mysql2/promise";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config({ path: "./app/user/.env" });

let sqlPool;
let mongoClient;

export const Database = {
  getSQLConnection: async () => {
    if (!sqlPool) {
      sqlPool = createPool({
        host: process.env.MYSQL_HOST,
        port: parseInt(process.env.MYSQL_PORT, 10),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASS,
        database: process.env.MYSQL_DB,
        waitForConnections: true,
        // The spread operator correctly handles the conditional properties
        ...(process.env.ENV !== "test"
          ? {
              connectionLimit:
                parseInt(process.env.MYSQL_MAX_POOL_SIZE, 10) || 10,
              queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT, 10) || 0,
              ssl: { rejectUnauthorized: true },
              allowPublicKeyRetrieval: true,
            }
          : {
              allowPublicKeyRetrieval: false,
              ssl: false,
            }),
      });
    }
    return await sqlPool.getConnection();
  },

  getMongoConnection: async (collection) => {
    if (!mongoClient) {
      const mongoUri =
        `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASS}` +
        `@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}` +
        `?authSource=admin` +
        (process.env.ENV !== "test" ? `&ssl=true` : `&ssl=false`);

      console.log("Mongo URI: ", mongoUri);

      mongoClient = new MongoClient(mongoUri, {
        // Enforce the pool size limit if provided as a numeric type
        maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 10,
      });
      await mongoClient.connect();
    }

    const db = mongoClient.db(process.env.MONGO_DB);
    const collections = await db.listCollections().toArray();
    if (!collections.some((c) => c.name === collection)) {
      await db.createCollection(collection);
    }
    return db.collection(collection);
  },

  closeConnections: async () => {
    if (sqlPool) await sqlPool.end();
    if (mongoClient) await mongoClient.close();
  },
};
