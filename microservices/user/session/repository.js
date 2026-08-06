import {DeamonClient} from "../../grpc-clients/deamon"

const checkSessionFields = (session_config)=>{
    const required_fields = ["jti", "user_id","device_info", "ip_address", "created_at", "expires_at","token_hash","fp_hash"]
    // Validate that all required fields are present in session_config
    Object.keys(session_config).forEach(
      (key) => {
        if(!required_fields.includes(key)) {
          throw new Error(`Field not required: ${key}`);
        }
      }
    )
    return true;
}
export const SessionRepository = (()=>{
  return{
    save: async(session_config, mysql_connection)=>{
    session_config["created_at"] =  new Date(db_params["iat"]).toISOString().slice(0,19).replace("T"," ")
    session_config["expires_at"] =  new Date(db_params["exp"]).toISOString().slice(0,19).replace("T"," ")
    checkSessionFields(session_config);

    // build the query dynamically based on the session_config object
    const fields = Object.keys(session_config).join(", ");
    const values = Object.values(session_config);
    const values_placeholder = Object.keys(session_config).map(() => "?").join(", ");

    const query = `INSERT INTO user_sessions(${fields}) VALUES (${values_placeholder})`;
    const [result] = await mysql_connection.query(query, values);
    const {insertId} = result;
    if(insertId==undefined){
      // Send as a background task to the deamon service to handle the session creation
      await DeamonClient.addJob("session.save", session_config)
    }

    },
    async revoke (user_id, jti, mysql_connection){
      const revoke_at = new Date().toISOString().substring(0,19).replace("T"," ")
      const expires_at = new Date().toISOString().substring(0,19).replace("T"," ")

      const revoke_query = "UPDATE user_session SET revoked_at = ?, expires_at =? WHERE user_id = ? AND  jti = ?"
      const [result]=await mysql_connection.execute(revoke_query, [revoke_at, expires_at, user_id, jti]);
      return (result.changedRows) ? true: false
    },
    async revokeAll(user_id, mysql_connection){
      const revoke_at = new Date().toISOString().substring(0,19).replace("T"," ")
      const expires_at = new Date().toISOString().substring(0,19).replace("T"," ")

      const revoke_query = "UPDATE user_session SET revoked_at = ?, expires_at =? WHERE user_id = ?"
      const [result]=await mysql_connection.execute(revoke_query, [revoke_at, expires_at, user_id]);
    return (result.changedRows) ? true: false
    }
  }
})()