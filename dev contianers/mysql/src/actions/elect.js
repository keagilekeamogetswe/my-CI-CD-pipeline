import { MysqlClient } from "../mysql.client.js";
import PodManager from "../pod.manager.js";
import queries from "./query/P.R.queries.js";

export const PrimaryPodElection = (() => {
  let elected_pod = null;

  return {
    _elect_pod: async (pods) => {
      let init = true;
      let deadIndexes = [];
      let primary_index = null;

      const pod_names = [...pods.keys()];

      for (let index = 0; index < pod_names.length; index++) {
        const podName = pod_names[index];
        const pod = pods.get(podName);

        if (primary_index === null && pod.role === "primary") {
          primary_index = index;
        }

        if (pod.role === undefined) {
          continue;
        } else {
          init = false;
          if (pod.dead === true) {
            deadIndexes.push(index);
          }
        }
      }

      // 3. Handle Fresh Cluster Initialization
      if (init) {
        primary_index = 0;
        const primaryName = pod_names[primary_index];
        console.log(
          `Initializing cluster. Electing ${primaryName} as primary.`,
        );

        // A. Apply Kubernetes Labeling State
        await PodManager.setToPrimary(primaryName);

        const replicaPods = pod_names.slice(1);
        if (replicaPods.length > 0) {
          await Promise.all(
            replicaPods.map((podName) => PodManager.setToReplica(podName)),
          );
        }

        // B. Run SQL Configurations via MysqlClient
        const primary_query = queries.primary();
        const replica_query = queries.replica(primaryName); // Pass primary name down
        // Configure the Primary Node (Turn off read-only parameters)
        const result =
          await MysqlClient.connection(primaryName).execute(primary_query);
        console.log("result: ", result);

        // Configure Replica Nodes individually to point to the Primary
        for (const replicaName of replicaPods) {
          await MysqlClient.connection(replicaName).execute(replica_query);
        }

        return true;
      }

      // 4. Handle Node Failovers if dead nodes are detected
      for (const dead_index of deadIndexes) {
        if (dead_index === primary_index) {
          console.warn(
            `Primary pod ${pod_names[dead_index]} is dead! Electing new leader...`,
          );

          const new_primary_index = pod_names.findIndex(
            (name, idx) => idx !== dead_index && !deadIndexes.includes(idx),
          );

          if (new_primary_index !== -1) {
            const newPrimaryName = pod_names[new_primary_index];

            // Apply new master settings to K8s
            await PodManager.setToPrimary(newPrimaryName);

            const otherHealthyPods = pod_names.filter(
              (name, idx) =>
                idx !== new_primary_index && !deadIndexes.includes(idx),
            );

            for (const pod of otherHealthyPods) {
              await PodManager.setToReplica(pod);
            }

            // Run SQL Promotion/Demotion statements dynamically
            const primary_query = queries.primary();
            const replica_query = queries.replica();

            // Promote the new leader to Read/Write
            await MysqlClient.connection(primaryName).execute(primary_query);

            // Tell all remaining running followers to drop tracking the dead node and track the new master
            for (const healthyReplicaName of otherHealthyPods) {
              await MysqlClient.connection(healthyReplicaName).execute(
                replica_query,
                [
                  newPrimaryName,
                  process.env.MYSQL_REPLICATION_USER,
                  process.env.MYSQL_REPLICATION_PASSWORD,
                ],
              );
            }
            primary_index = new_primary_index;
          } else {
            console.error(
              "Disaster! All pods appear to be dead. Cannot elect a primary.",
            );
          }
        } else {
          console.log(
            `Replica pod ${pod_names[dead_index]} is dead. Awaiting Kubernetes self-healing.`,
          );
        }
      }
    },
    get elect_pod() {
      return this._elect_pod;
    },
    set elect_pod(value) {
      this._elect_pod = value;
    },
  };
})();
