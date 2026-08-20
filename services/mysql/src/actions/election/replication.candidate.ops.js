import { MysqlClient } from "../../mysql.client";
import queries from "../query/P.R.queries";

export const ElectionSQLOps = (() => {
  async function checkStatus(pod_name) {
  const [row] = await MysqlClient.connection(pod_name).execute(
    queries.slave_status
  );

  if(!row?.Seconds_Behind_Source)console.log(row);

  const status = row;

  return {
    lag: status?.Seconds_Behind_Source??null,
    gtid: status?.Executed_Gtid_Set ?? null,
    running: status?.Replica_SQL_Running === "Yes"
  };
}

  async function getBestCandidate(hosts) {
    const statuses = await Promise.all(
      hosts.map(async (name) => {
        const status = await checkStatus(name);
        return { name, gtid: status.gtid, lag: status.lag };
      })
    );

    // Sort by GTID completeness, then by lag as tie-breaker
    statuses.sort((a, b) => {
      const gtidDiff = compareGtidSets(a.gtid, b.gtid);
      if (gtidDiff !== 0) return gtidDiff;
      // If GTID sets are equal, prefer lower lag
      return a.lag - b.lag;
    });

    console.log("Election candidates ranked:");
    statuses.forEach(s =>
      console.log(`${s.name}: GTID=${s.gtid}, lag=${s.lag}`)
    );

    return statuses[0]; // best candidate
  }

  function parseGtidSet(gtidSet) {
    if (!gtidSet) return 0;
    const ranges = gtidSet.split(",");
    let totalTx = 0;

    for (const range of ranges) {
      const parts = range.split(":");
      if (parts.length < 2) continue;
      const txnRange = parts[1]; // e.g. "1-100"
      const [start, end] = txnRange.split("-").map(n => parseInt(n, 10));
      if (!isNaN(start) && !isNaN(end)) {
        totalTx += (end - start + 1);
      } else if (!isNaN(start)) {
        totalTx += 1; // single transaction
      }
    }
    return totalTx;
  }

  function compareGtidSets(gtidA, gtidB) {
    const totalA = parseGtidSet(gtidA);
    const totalB = parseGtidSet(gtidB);
    return totalB - totalA; // descending order
  }

  return {
    getBestCandidate
  };
})();
