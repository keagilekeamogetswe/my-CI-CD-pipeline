export default class SessionControl {
  mysql_connection;
  constructor(mysql_connection) {
    this.mysql_connection = mysql_connection;
  }
  async saveSession (db_params){
    db_params["created_at"] =  new Date(db_params["iat"]).toISOString().slice(0,19).replace("T"," ")
    db_params["expires_at"] =  new Date(db_params["exp"]).toISOString().slice(0,19).replace("T"," ")
    db_params["ip_address"] = db_params["IPv4"]
    //Now delete the fields
    delete db_params["iat"];
    delete db_params["exp"];
    delete db_params["IPv4"];

    const required_fields = ["jti", "user_id","device_info", "ip_address", "created_at", "expires_at","token_hash","fp_hash"]
    const fields = [];
    const values = [];
    const values_placeholder  =[]

    for (const [key, value] of Object.entries(db_params)) {
      if (!required_fields.includes(key))
        // Throw error when the fields are not required
        throw new Error(`Field not required: ${key}`);

      fields.push(key);
      values.push(value);
      values_placeholder.push("?");
    }
    //No rollback
    const query = `INSERT INTO user_session(${fields.join(", ")})
      VALUES(${values_placeholder.join(", ")})`;
    const [result] = await this.mysql_connection.execute(query, values);
    const {insertId} = result;
    if(insertId==undefined){
      // For reliability: Save to session background jobs
      // Note: Still needs to be implemented
    }
    return insertId!=undefined ? true: false;
  }
  async revokeSession(user_id, jti){
    const revoke_at = new Date().toISOString().substring(0,19).replace("T"," ")
    const expires_at = new Date().toISOString().substring(0,19).replace("T"," ")

    const revoke_query = "UPDATE user_session SET revoked_at = ?, expires_at =? WHERE user_id = ? AND  jti = ?"
    const [result]=await this.mysql_connection.execute(revoke_query, [revoke_at, expires_at, user_id, jti]);
    return (result.changedRows) ? true: false
  }
  async EndAllSessions(user_id){}
}