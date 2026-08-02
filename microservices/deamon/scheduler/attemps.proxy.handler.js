import RequirementResolver from "../actions/dependency/requirement.resolver";

const AttemptsProxyHandler = {
  get(target, property) {
    return target[property];
  },
  set(target, property, value) {
    if (property !== "attempts") {
      target[property] = value;
      return true;
    }

    // Update local object
    target[property] = value;

    // Resolve MySQL connection
    const { mysql_connection } = RequirementResolver.resolve({
      mysql_connection: true,
    });

    // Persist attempts count
    const query = `UPDATE jobs
      SET attempts = ?
      WHERE id = ?;`;
    console.log(`Proxy will execute\n ${query} \n   in background`);

    // Fire and forget (no await)
    mysql_connection.execute(query, [value, target.id]);

    return true;
  },
};

export default AttemptsProxyHandler;
