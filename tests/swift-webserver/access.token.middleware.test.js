import { beforeEach, describe, expect, it, vi } from "vitest";
import { authMiddleware } from "../../microservices/swift-webserver/middleware/access.token.js";

describe("authMiddleware", () => {
  let response;
  let next;

  beforeEach(() => {
    response = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    next = vi.fn();
  });

  it("allows non-API routes without an access token", async () => {
    await authMiddleware({ path: "/start/", headers: {} }, response, next);

    expect(next).toHaveBeenCalledOnce();
    expect(response.status).not.toHaveBeenCalled();
    expect(response.json).not.toHaveBeenCalled();
  });

  it("still rejects protected API routes without an access token", async () => {
    await authMiddleware({ path: "/api/protected/", headers: {} }, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: "Access token not supplied",
    });
  });
});
