import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import GRPCUserProfileService from "../../../app/user/grpc-methods/service-profile.user.js"; // Adjust path to this service file
import { Database } from "../../../app/user/db.js";

describe.skip("GRPCUserProfileService - Direct Unit Tests", () => {
  let mysql_connection;
  let deleteTestUserIds = [];
  let deleteTestProfileIds = [];
  let initialisedProfileId; // To store the profile ID created during tests for cleanup

  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();
  });
  afterAll(async () => {
    if (deleteTestUserIds.length > 0) {
      for (const id of deleteTestUserIds) {
        const query = "DELETE FROM user_credentials WHERE id = ?";
        await mysql_connection.execute(query, [id]);
      }
    }
    if (deleteTestProfileIds.length > 0) {
      for (const id of deleteTestProfileIds) {
        const query = "DELETE FROM user_profiles WHERE id = ?";
        await mysql_connection.execute(query, [id]);
      }
    }
  });
  // 1. Testing InitialiseProfile
  it("should successfully trigger InitialiseProfile and return a string profile_id", async () => {
    // A. Setup a dummy user inside your database first to bypass constraints
    const [user] = await mysql_connection.execute(
      "INSERT INTO user_credentials (username, email, password_hash) VALUES (?, ?, ?)",
      [`unit_test_user`, "unit@test.com", "hash"],
    );
    deleteTestUserIds.push(user.insertId); // Store for cleanup
    const generatedUserId = String(user.insertId);
    initialisedProfileId = generatedUserId; // Store for cleanup

    // B. Mock the gRPC 'call' object layout
    const mockCall = {
      request: {
        user_id: generatedUserId,
        name: "Alex",
        email: "direct@test.com",
        dob: "1990-01-01",
        phone: "1234567890",
        bio: "hey there",
        profile_picture: "",
      },
    };

    // C. Create a mock callback spy to capture the output
    const mockCallback = vi.fn();
    console.log("Mock Call for InitialiseProfile: ", GRPCUserProfileService);
    // D. Directly invoke your service module method
    const result = await GRPCUserProfileService.InitialiseProfile(
      mockCall,
      mockCallback,
    );
    deleteTestUserIds.push(generatedUserId); // Store for cleanup

    // E. Assertions
    expect(mockCallback).toHaveBeenCalledTimes(1);

    // Check that the first parameter (error) is null
    const callbackArgs = mockCallback.mock.calls[0];
    expect(callbackArgs[0]).toBeNull();

    // Check the response object structure matches your protobuf requirements
    const responsePayload = callbackArgs[1];
    expect(responsePayload.success).toBe(true);
    expect(responsePayload.profile_id).toBeDefined();
    expect(typeof responsePayload.profile_id).toBe("string");
    expect(responsePayload.message).toBe("Profile initialised successfully");
  });

  // 2. Testing SetConfiguration
  it("should successfully save key-value configurations", async () => {
    const mockCall = {
      request: {
        profile_id: initialisedProfileId, // Use the initialised profile ID
        config_updates: {
          theme: "light",
          fontSize: "14px",
        },
      },
    };

    const mockCallback = vi.fn();

    await GRPCUserProfileService.SetConfiguration(mockCall, mockCallback);

    const [error, response] = mockCallback.mock.calls[0];
    expect(error).toBeNull();
    expect(response.success).toBe(true);
  });

  // 3. Testing GetProfileConfig
  it("should retrieve configuration and return a map profile", async () => {
    const mockCall = {
      request: {
        profile_id: "1",
      },
    };

    const mockCallback = vi.fn();

    await GRPCUserProfileService.GetProfileConfig(mockCall, mockCallback);

    const [error, response] = mockCallback.mock.calls[0];
    expect(error).toBeNull();
    expect(response.user_id).toBe("1");
    expect(typeof response.config).toBe("object"); // Checks that it yields a direct map/object
  });
});
