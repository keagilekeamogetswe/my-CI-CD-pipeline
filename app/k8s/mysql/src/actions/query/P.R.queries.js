const queries = {
  // Configure this MySQL instance as a replica
  replica: () => `
    STOP REPLICA;
    RESET REPLICA ALL;

    SET GLOBAL read_only = ON;
    SET GLOBAL super_read_only = ON;

    CHANGE REPLICATION SOURCE TO
      SOURCE_HOST = ?,
      SOURCE_PORT = ?,
      SOURCE_USER = ?,
      SOURCE_PASSWORD = ?,
      SOURCE_SSL = 1;

    START REPLICA;
  `,

  // Promote this replica to become the new primary
  primary: () => `
    STOP REPLICA;
    RESET REPLICA ALL;

    SET GLOBAL super_read_only = OFF;
    SET GLOBAL read_only = OFF;
  `,
};

export default queries;
