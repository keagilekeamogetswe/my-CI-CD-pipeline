import RequirementResolver from "./dependency/requirement.resolver.js";

const SessionActions = {
  namespace: "session",

  // Job rules: define retry/backoff, severity, etc.
  rules: {
    save: {
      priority: 7,
      maxRetries: 10,
      backoff: { type: "exponential", baseDelay: 2000, maxCap: 30000 }, // 2s base, capped at 30s
      timeout: 2000,
      severity: "high",
    },
    revoke: {
      priority: 5,
      maxRetries: 10,
      backoff: { type: "exponential", baseDelay: 2000, maxCap: 30000 },
      timeout: 2000,
      severity: "high",
    },
  },
  // Requirements: declare dependencies for jobs
  requirements: {
    save: { mysql_connection: true },
    revoke: { mysql_connection: true },
  },
  // Save a new session record
  save: async (payload) => {
    // Resolve the reuirement
    const { mysql_connection } = RequirementResolver.resolve(
      SessionActions.requirements["save"],
    );
    // Build query safely
    const keys = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = keys.map(() => "?").join(", ");

    const save_query = `INSERT INTO user_session (${keys.join(", ")}) VALUES (${placeholders})`;

    const [result] = await mysql_connection.execute(save_query, values);
    return result;
  },
  // Revoke an existing session
  revoke: async (payload) => {
    const { mysql_connection } = RequirementResolver.resolve(rules[revoke]);

    const { revoked_at, expires_at, user_id, jti } = payload;
    const update_query =
      "UPDATE user_session SET revoked_at = ?, expires_at = ? WHERE user_id = ? AND jti = ?";
    const [result] = await mysql_connection.query(update_query, [
      revoked_at,
      expires_at,
      user_id,
      jti,
    ]);
    return result;
  },
};
export default SessionActions;
