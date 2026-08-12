import argon2 from "argon2";
import { CredentialsRepository } from "../../credentials/repository";

async function verifyPassword(user_id, current_password, mysql_connection) {
  const query = `
    SELECT password_hash
    FROM user_credentials
    WHERE id = ?;
  `;

  const [[credential]] = await mysql_connection.execute(query, [user_id]);

  if (!credential?.password_hash) {
    throw new Error("No password found!");
  }


  return await argon2.verify(credential.password_hash, current_password);
}

export async function resetWithCurrentPassword(
  user_id,
  current_password,
  new_password,
  mysql_connection
) {
  const verified = await verifyPassword(user_id, current_password, mysql_connection);

  if (!verified) {
    throw new Error("Invalid current password");
  }
  const new_pass_hash = await argon2.hash(new_password)
  const changed = await CredentialsRepository.changePassword(
    user_id,
    new_pass_hash,
    mysql_connection
  );

  return changed;
}