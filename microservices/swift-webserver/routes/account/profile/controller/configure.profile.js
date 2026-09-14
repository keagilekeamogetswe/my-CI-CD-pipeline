import { UserProfileModifierGRPCClient } from "../../../../../grpc-clients/user/profile.modifier.js";

export async function ConfigProfile(req, res) {
  const allowed_keys = ["lastseen", "profile_picture", "about", "online"];
  // Strickly change one configuration at a time
  // Should include one and only one of the allowed keys, more than one wiil result in bad request
  const body = req.body;
  if (
    Object.keys(body).length !== 1 ||
    !allowed_keys.includes(Object.keys(body)[0])
  ) {
    return res.status(400).json({ message: "Bad request" });
  }
  const primaryConfig = req.body;
  const user_id = req.user.user_id;
  const response = await UserProfileModifierGRPCClient.ModifyProfile({
    user_id: user_id,
    primaryConfig,
  });
  res.status(response.success ? 200 : 400).json({ message: response.message });
}
