import { createPool } from "mysql2/promise";

// Cache pools so we reuse them instead of constantly opening new sockets
const poolCache = new Map();

export const MysqlClient = {
  /**
   * Targets a specific MySQL pod instance dynamically by its name.
   * @param {string} podName - The short name of the pod (e.g., "mysql-0")
   */
  connection: (podName) => {
    if (!podName) {
      throw new Error("MysqlClient: A specific pod name must be provided.");
    }

    // 1. Resolve to the pod's exact Headless Service DNS endpoint
    // Format: pod-name.service-name.namespace.svc.cluster.local
    const targetHost = podName;

    // 2. Return an existing pool from cache or spin up a new one
    if (!poolCache.has(targetHost)) {
      const newPool = createPool({
        host: targetHost,
        port: parseInt(process.env.MYSQL_PORT || "3306", 10),
        user: "root", // Use root user to execute configuration level replication commands
        password: process.env.MYSQL_ROOT_PASSWORD,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
      });
      poolCache.set(targetHost, newPool);
    }

    const pool = poolCache.get(targetHost);

    // 3. Return the interface containing your simplified .execute method
    return {
      execute: async (query, params = []) => {
        try {
          const [results] = await pool.execute(query, params);
          return results;
        } catch (error) {
          console.error(
            `Database Execution Failure on host [${podName}]:`,
            error.message,
          );
          throw error;
        }
      },
    };
  },

  /**
   * Helper method to safely close all active pools during an application shutdown
   */
  shutdownAll: async () => {
    for (const [host, pool] of poolCache.entries()) {
      await pool.end();
      poolCache.delete(host);
    }
  },
};
