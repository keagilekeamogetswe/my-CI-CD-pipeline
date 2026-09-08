import { JWTHelper } from "../../../microservices/utility/jwt";
import { it, expect } from "vitest";
it("should sign the access token correctly", async () => {
  console.log("private: ", process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY);
  console.log("public: ", process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY);
  const access_token = await JWTHelper.sign(
    { userd_id: 0 },
    "3min",
    process.env.JWT_ACCESSS_TOKEN_PRIVATE_KEY,
  );
  console.log(access_token);
  const payload = await JWTHelper.verify(
    access_token,
    process.env.JWT_ACCESSS_TOKEN_PUBLIC_KEY,
  );
  expect(access_token).toBeDefined();
  expect(payload).toBeDefined();
});
