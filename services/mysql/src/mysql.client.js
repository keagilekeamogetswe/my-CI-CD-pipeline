import { createPool } from "mysql2/promise";

const poolCache = new Map();

export const MysqlClient = {
  /**
   * Get or create a connection pool wrapper for a specific pod.
   * @param {string} podName - The name of the MySQL pod (e.g. 'mysql-0')
   * @param {string} [namespace] - Optional Kubernetes namespace override
   */
  connection: (podName, namespace = process.env.MYSQL_NAMESPACE) => {
    if (!podName) {
      throw new Error("MysqlClient: A specific pod name must be provided.");
    }

    // Construct target host (defaults to short name if no namespace given)
    const targetHost = namespace
      ? `${podName}.mysql.${namespace}.svc.cluster.local`
      : `${podName}.mysql`;

    if (!poolCache.has(targetHost)) {
      const newPool = createPool({
        host: targetHost,
        port: parseInt(process.env.MYSQL_PORT || "3306", 10),
        user: "root",
        password: process.env.MYSQL_ROOT_PASSWORD,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        multipleStatements: true, // Enables multi-query strings (semicolon separated)
      });

      // Handle unexpected idle connection drops gracefully
      newPool.on("error", (err) => {
        console.error(
          `[MysqlClient] Pool error for host [${targetHost}]:`,
          err.message,
        );
      });

      poolCache.set(targetHost, newPool);
    }

    const pool = poolCache.get(targetHost);

    return {
      /**
       * Executes a query with automatic retry handling for startup race conditions,
       * DNS lookup delays (ENOTFOUND), connection timeouts (ETIMEDOUT),
       * ECONNREFUSED, and ER_SERVER_SHUTDOWN.
       */
      execute: async (query, params = [], maxRetries = 15, delayMs = 2000) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const [results] = await pool.query(query, params);
            return results;
          } catch (error) {
            const isTransient =
              error.code === "ECONNREFUSED" ||
              error.code === "ER_SERVER_SHUTDOWN" ||
              error.code === "ENOTFOUND" ||
              error.code === "ETIMEDOUT" ||
              error.errno === -111 ||
              error.errno === 1053 ||
              error.errno === -3008;

            if (isTransient && attempt < maxRetries) {
              console.warn(
                `⚠️ [MysqlClient] Transient error on [${targetHost}] (${error.code || error.message}). Attempt ${attempt}/${maxRetries}. Retrying in ${delayMs}ms...`,
              );
              await new Promise((resolve) => setTimeout(resolve, delayMs));
              continue;
            }

            console.error(
              `[MysqlClient] Query execution failure on host [${targetHost}]:`,
              error.message,
            );
            throw error;
          }
        }
      },
    };
  },

  /**
   * Gracefully close all active connection pools concurrently.
   */
  shutdownAll: async () => {
    const shutdownPromises = Array.from(poolCache.entries()).map(
      async ([host, pool]) => {
        try {
          await pool.end();
        } catch (err) {
          console.error(
            `[MysqlClient] Error closing pool for [${host}]:`,
            err.message,
          );
        }
      },
    );

    await Promise.all(shutdownPromises);
    poolCache.clear();
  },
};
