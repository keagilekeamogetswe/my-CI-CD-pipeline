import { UserProfileModifierGRPCClient } from "../../../../../grpc-clients/user/profile.modifier.js";

export async function GETConfigProfile(req, res) {
  const { user_id } = req.user;
  if (user_id === undefined) {
    return res.status(400).send();
  }

  const response = await UserProfileModifierGRPCClient.ModifyProfile({
    user_id: user_id,
    method: "get",
  });
  res
    .status(response.success ? 200 : 400)
    .json({ message: response.message, config: response.config });
}
