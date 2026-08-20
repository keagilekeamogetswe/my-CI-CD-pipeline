import { MysqlClient } from "../../mysql.client.js";
import PodManager from "../../pod.manager.js";
import queries from "../query/P.R.queries.js";

export const PodElection = (() => {
  // Internal Helper: Start Replica Sync
  const start_replica = async (pod_name, elected_primary) => {
    if(!elected_primary) throw new Error("elected_primary must be provided");
    try {
      // 1. Get pool execution wrapper synchronously
      const connection = MysqlClient.connection(pod_name);

      // 2. Execute SQL query (this is where the async connection happens)
      const replica_query = queries.replica;
      await connection.execute(queries.replica, [
        elected_primary+".mysql",
        process.env.MYSQL_PORT || 3306,
        process.env.MYSQL_REPLICATION_USER,
        process.env.MYSQL_REPLICATION_PASSWORD,
      ]);

      // 3. Update Pod Label ONLY AFTER DB query succeeds
      await PodManager.setToReplica(pod_name);
      console.log(`Replica role started successfully for: ${pod_name}`);
    } catch (error) {
      console.error(`Failed to initialize replica on ${pod_name}:`, error);
    }
  };

  // Internal Helper: Elect New Primary
  const start_primary = async (pod_name) => {
    try {
      // 1. Get pool execution wrapper synchronously
      const connection = MysqlClient.connection(pod_name);

      // 2. Execute SQL query (this is where the async connection happens)
      const primary_query = queries.primary;

      await connection.execute(primary_query);
      // 3. Update Pod Label ONLY AFTER DB query succeeds
      await PodManager.setToPrimary(pod_name);
      console.log(`Primary election successful on pod: ${pod_name}`);
    } catch (error) {
      console.error(`Failed to elect primary on ${pod_name}:`, error);
    }
  };

  return {
    start_primary,
    start_replica
  };
})();
