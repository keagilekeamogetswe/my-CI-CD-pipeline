import { AccessTokenDeamon } from "./access-token.deamon";

export async function renewAccessToken(): Promise<string | number> {
  try {
    const request = await fetch("/api/access-token/", {
      method: "GET",
      credentials: "include",
    });
    const data = await request.json();
    const { access_token } = data;

    if (
      request.ok &&
      typeof access_token === "string" &&
      access_token.length > 0
    ) {
      return access_token;
    }
    return request.ok ? 500 : request.status;
  } catch (error) {
    console.error("Failed to renew access token:", error);
    return 500;
  }
}
