import { createPool } from "mysql2/promise";
import { MongoClient } from "mongodb";

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
        database: process.env.MYSQL_DATABASE,
        dateStrings: true,
        waitForConnections: true,

        // Spread conditional properties correctly
        ...(process.env.ENV !== "test"
          ? {
              connectionLimit:
                parseInt(process.env.MYSQL_MAX_POOL_SIZE, 10) || 10,
              queueLimit: parseInt(process.env.MYSQL_QUEUE_LIMIT, 10) || 0,
              ssl: false, // mysql:8 without certs → disable SSL
              allowPublicKeyRetrieval: true,
            }
          : {
              connectionLimit: 100,
              queueLimit: 100,
              ssl: false,
              allowPublicKeyRetrieval: false,
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
        (process.env.ENV !== "test" ? `&ssl=false` : `&ssl=false`);

      mongoClient = new MongoClient(mongoUri, {
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
