import { describe, it, expect, vi, beforeAll} from "vitest";
import argon2 from "argon2";
import * as crypto from "node:crypto";

import { Notification } from "../../microservices/utility/notifications";
import { JWTHelper } from "../../microservices/utility/jwt";

// Mock notifications
vi.mock("../../microservices/utility/notifications", () => ({
  Notification: {
    Email: {
      send: vi.fn().mockResolvedValue(true),
    },
    SMS: {
      send: vi.fn().mockResolvedValue(true),
    },
  },
}));
// Mock randInt for predictable outcome
vi.mock("node:crypto", async () => {
  const actual = await vi.importActual("node:crypto");

  return {
    ...actual,
    randomInt: vi.fn(() => "123456789"),
  };
});
import Verification from "../../microservices/user/verification/control";

describe("Verification", () => {
  beforeAll(()=>{


  })

  it("should request verification via phone", async () => {
    const payload = {
      some_attribute: "some value",
      another_attr: "blah blah blah",
      //essentials
      phone: {
        code: "27",
        dial_code_id: 22, //some Database Record
        body: "234567890"
        }
    }
    const token  = await Verification.request(payload, "phone")
    const claims = await Verification.confirm(token, "123456789")
    expect(claims.phone).toMatchObject(payload.phone)
    expect(claims).toHaveProperty("jti")
    expect(claims).toHaveProperty("exp")
    expect(claims).toHaveProperty("iat")

  })
  it("should request verification via email", async () => {
  const payload = {
    email: "john@example.com",
  };

  const token = await Verification.request(payload, "email");
  const claims = await Verification.confirm(token, "123456789");

  expect(Notification.Email.send).toHaveBeenCalledOnce();
  expect(claims.email).toBe(payload.email);
});
it("should reject an unsupported channel", async () => {
  await expect(
    Verification.request({}, "discord")
  ).rejects.toThrow("Channel not allowed.");
});
it("should require an email address", async () => {
  await expect(
    Verification.request({}, "email")
  ).rejects.toThrow("Email address is required.");
});
it("should require a phone number", async () => {
  await expect(
    Verification.request({}, "phone")
  ).rejects.toThrow("Phone number is required.");
});
it("should reject an invalid OTP", async () => {
  const payload = {
    phone: {
      code: "27",
      body: "234567890",
    },
  };

  const token = await Verification.request(payload, "phone");

  await expect(
    Verification.confirm(token, "000000")
  ).rejects.toThrow("Invalid verification code.");
});
it("should throw when SMS delivery fails", async () => {
  Notification.SMS.send.mockResolvedValue(false);

  await expect(
    Verification.request(
      {
        phone: {
          code: "27",
          body: "234567890",
        },
      },
      "phone"
    )
  ).rejects.toThrow("Failed to send verification code.");
});
it("should throw when email delivery fails", async () => {
  Notification.Email.send.mockResolvedValue(false);

  await expect(
    Verification.request(
      {
        email: "john@example.com",
      },
      "email"
    )
  ).rejects.toThrow("Failed to send verification code.");
});
});