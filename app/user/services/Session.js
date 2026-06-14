import argon2 from "argon2";
import { JWTHelper } from "./../../utility/jwt";
import UserRepository from "../Repository/UserRepository";
import SessionControl from "../Repository/Logic/Session.Control";

class UserSessionService {
  mysql_connection;
  //Injection willbe usefull for tests
  constructor(mysql_connection=null){
    this.mysql_connection = mysql_connection;
  }
  async setPasswordToUserSessionStart  (jwt_token, new_password, passive_params) {
    const {IPv4, device_info, device_fingerprint} = passive_params;
    const {payload} = await JWTHelper.decode(jwt_token, process.env.JWT_SET_PASS_STATE);
    const required_fields = ["name", "lastname", "phone", "dob"];
    for(let field of required_fields){
      if(!payload[field]) throw new Error("Invalid token payload: Missing " + field);
    }
    // Hash the new password
    const password_hash = await argon2.hash(new_password);
    const user_payload = await UserRepository.initialiseUserAccount({...payload, password_hash}, this.mysql_connection);
    user_payload.role = "user";
    user_payload.IPv4 = IPv4;
    user_payload.device_info= device_info;
    user_payload.device_fingerprint = device_fingerprint
    // Prioritise getting the token to the user
    // Don't await the promise because this is a background task
    const refresh_token = await JWTHelper.encode(user_payload, process.env.JWT_AUTH_REFRESH_TOKEN_TTL ,process.env.JWT_AUTH_REFRESH_TOKEN_SECRET, new_password)
    const session_control = new SessionControl(this.mysql_connection);

    ( async(session_control, refresh_token) => {

      const {payload} = await JWTHelper.decode(refresh_token, process.env.JWT_AUTH_REFRESH_TOKEN_SECRET)
      // destucture
      const {user_id, iat, jti, exp, device_info, IPv4, device_fingerprint} = payload
      const token_hash = await argon2.hash(refresh_token);
      const fp_hash = await argon2.hash(JSON.stringify(device_fingerprint))
      const db_params = {user_id, iat, jti, exp, device_info, IPv4, fp_hash, token_hash}
      console.log("here: ", db_params)

      return await session_control.saveSession(db_params)
    })(session_control, refresh_token)
    .then((resolve) => {
      console.log(resolve? "The background task successfully ran.":"Failed to save session to user_session", "\nBackground run status: ", resolve, ", pointing if indeed there are rows affected.")
      // When resolve has no affected rows throw to call a sesssion resolver deamon
      if(!resolve)
        throw new Error("No row inserted in user_session.");
    })
    .catch(
      (err) => {console.log(err)}
    ).finally(()=>{console.log("Background task executed: ")})
    return refresh_token
  }
}
export default UserSessionService