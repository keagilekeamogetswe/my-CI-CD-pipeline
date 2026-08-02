import argon2 from "argon2";
import { Database } from "./../db.js";
import initialise from "./Logic/initialise.user.js";
import initialiseUserAccount from "./Logic/initialise.user.js";
const UserRepository=(() =>{
  const checkField = (data_obj, fields=[]) => {
    let has_missing_fields = false;
    fields.forEach(field => {
      has_missing_fields= !data_obj[field] ? true: false;
    })
  }
  return {
    // After code is confirmed
    initialiseUserAccount: async(config,mysql_connection = null)=>{
      mysql_connection = mysql_connection || await Database.getSQLConnection();
      const check_fields = ["name", "lastname", "phone", "dob", "password_hash"];
      if(checkField(config, check_fields))
        throw new Error("field check failed.");

      return await initialiseUserAccount(mysql_connection, config);
    },
  }

})()
export default UserRepository