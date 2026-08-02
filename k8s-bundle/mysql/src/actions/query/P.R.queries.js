console.log(process.env.MYSQL_REPLICATION_USER)
const queries = {
  replica: `
    STOP REPLICA FOR CHANNEL '';
    DO SLEEP(1);
    RESET REPLICA ALL;

    CHANGE REPLICATION SOURCE TO
      SOURCE_HOST = ?,
      SOURCE_PORT = ?,
      SOURCE_USER = ?,
      SOURCE_PASSWORD = ?,
      SOURCE_SSL = 1;

    SET GLOBAL read_only = ON;
    SET GLOBAL super_read_only = ON;

    START REPLICA;
  `,

  primary: `
    STOP REPLICA FOR CHANNEL '';
    RESET REPLICA ALL;
    DO SLEEP(1);
    CREATE USER IF NOT EXISTS '${process.env.MYSQL_REPLICATION_USER}'@'%'
      IDENTIFIED BY '${process.env.MYSQL_REPLICATION_PASSWORD}';

    GRANT REPLICATION SLAVE ON *.* TO
      '${process.env.MYSQL_REPLICATION_USER}'@'%';
    RESET REPLICA ALL;

    SET GLOBAL super_read_only = OFF;
    SET GLOBAL read_only = OFF;
  `,
  slave_status: "SHOW REPLICA STATUS;"
};

export default queries;