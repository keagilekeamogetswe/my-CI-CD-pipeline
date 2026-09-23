import { UserProfileGRPCClient } from "../../../../../grpc-clients/user/profile.view.js";

export async function ViewProfile(req, res) {
  const user_id = req.user?.user_id;
  if (!user_id) {
    return res.status(401).json({ message: "Authentication is required" });
  }

  try {
    const response = await UserProfileGRPCClient.ViewProfile({ user_id });
    return res.status(response.success ? 200 : 404).json({
      message: response.message,
      ...(response.data ? { data: response.data } : {}),
    });
  } catch (error) {
    console.error("Failed to retrieve profile:", error);
    return res.status(502).json({ message: "Profile service is unavailable" });
  }
}
