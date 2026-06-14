import argon2 from "argon2";
import { JWTHelper } from "./../../utility/jwt";
import UserRepository from "../Repository/UserRepository";

class UserSessionService {
  mysql_connection;
  //Injection willbe usefull for tests
  constructor(mysql_connection=null){
    this.mysql_connection = mysql_connection;
  }
  async setPasswordToUserSessionStart  (jwt_token, new_password) {
    const {payload} = await JWTHelper.decode(jwt_token, process.env.JWT_SET_PASS_STATE);
    const required_fields = ["name", "lastname", "phone", "dob"];
    console.log(payload)
    for(let field of required_fields){
      if(!payload[field]) throw new Error("Invalid token payload: Missing " + field);
    }
    // Hash the new password
    const password_hash = await argon2.hash(new_password);
    const user_payload = await UserRepository.initialiseUserAccount({...payload, password_hash}, this.mysql_connection);
    user_payload.role = "user";

    return await JWTHelper.encode(user_payload, process.env.JWT_AUTH_REFRESH_TOKEN_TTL ,process.env.JWT_AUTH_REFRESH_TOKEN_SECRET, new_password)
  }
}
export default UserSessionService