import { describe, it, beforeAll, afterAll, expect } from "vitest";
import dotenv from "dotenv";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { Database } from "../../app/user/db.js";
import { rejects } from "assert";
import { response } from "express";
import { resolve } from "path";

dotenv.config({ path: "./tests/.env" });

describe.skip("gRPC Profile Service", () => {
  let grpcClient;
  let user_id;
  let profile_id;
  let mysql_connection;

  beforeAll(async () => {
    console.warn(
      "\nMAKE SURE THE GRPC SERVER IS RUNNING BEFORE RUNNING THESE TESTS. ",
    );
    console.warn("Run this command: node app/user/grpc.js\n\n");
    const packageDef = protoLoader.loadSync("./app/proto/user.proto", {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDef);
    const userProto = protoDescriptor.user;

    const serverAddress = `localhost:${process.env.GRPC_USER_PORT || 50051}`;

    // Connects to ProfileService implementation matching the Proto file
    grpcClient = new userProto.ProfileService(
      serverAddress,
      grpc.credentials.createInsecure(),
    );

    mysql_connection = await Database.getSQLConnection();
    // mysql_connection.beginTransaction();
    const [result] = await mysql_connection.execute(
      `
          INSERT INTO user_credentials (username, email, password_hash)
          VALUES (?, ?, ?)
          `,
      ["profile_test_agent", "profiles@test_db.com", "dummy-hash"],
    );

    user_id = result.insertId;
  });

  afterAll(async () => {
    // if (grpcClient) grpcClient.close();
    // Cleanup generated test entries to avoid key/email violations next run
    if (user_id && mysql_connection) {
      // await mysql_connection.rollback();
      await mysql_connection.execute(
        "DELETE FROM user_credentials WHERE id = ?",
        [user_id],
      );
    }
  });

  it("Should connect, insert base user, and initialize a profile over gRPC", async () => {
    let response;
    try {
      expect(user_id).toBeDefined();
      // await new Promise((resolve) => setTimeout(resolve, 2000));

      // payload fields mapped to the parameters handled by the server
      const payload = {
        user_id: user_id,
        name: "John",
        lastname: "snow",
        email: "profiles1@test_db.com",
        dob: "1990-01-01",
        phone: "1234567890",
        bio: "hey there",
        profile_picture: "",
      };
      console.log("GRPC Client invoking InitialiseProfile for testing...");
      // Executes via the clean, synchronous wrapper framework on the server side
      response = await new Promise((resolve, reject) => {
        grpcClient.InitialiseProfile(payload, (error, grpc_response) => {
          if (error) {
            reject(error);
          }
          profile_id = grpc_response.profile_id;
          resolve(grpc_response);
        });
      });

      // Verifies the structural result properties map cleanly
    } catch (err) {
      console.log("Error: ", err);
    }
    expect(response).toBeDefined();
    expect(response.success).toBeTruthy();
    expect(response.profile_id).toBeDefined();
    expect(response.message).toBeDefined();
  });
  it("should mofidy the configuration", async () => {
    expect(profile_id).toBeDefined();
    let set_payload = {
      profile_id: profile_id, // Using the initialised profile ID
      config_updates: {
        theme: "light",
        fontSize: "14px",
      },
    };
    let response;
    try {
      response = await new Promise((resolve, reject) => {
        grpcClient.SetConfiguration(set_payload, (error, grpc_response) => {
          if (error) {
            console.error(error);
            reject(error);
          }
          resolve(grpc_response);
        });
      });
    } catch (error) {
      console.log(error);
    }
    console.log("Test 2 Responss: ", response);
    expect(response.success).toBeTruthy();
    // let's get the config
    let get_response;
    try {
      const payload = {
        profile_id: profile_id, // Using the initialised profile ID
      };
      get_response = await new Promise((resolve, reject) => {
        grpcClient.GetProfileConfig(payload, (error, grpc_response) => {
          if (error) {
            console.error(error);
            reject(error);
          }
          resolve(grpc_response);
        });
      });
    } catch (error) {
      console.log(error);
    }
    console.log("Test 2 response 2: ", get_response);
    const { config } = get_response;
    expect(config).toMatchObject(set_payload.config_updates);
  });
  it("should reset configuration back to defaults", async () => {
    expect(profile_id).toBeDefined();
    let set_payload = {
      profile_id: profile_id, // Using the initialised profile ID
      config_updates: {
        online: "nobody",
        lastseen: "everybody",
      },
    };
    let response;
    try {
      response = await new Promise((resolve, reject) => {
        grpcClient.SetConfiguration(set_payload, (error, grpc_response) => {
          if (error) {
            console.error(error);
            reject(error);
          }
          resolve(grpc_response);
        });
      });
    } catch (error) {
      console.log(error);
    }

    expect(response.success).toBeTruthy();
    // let's get the config
    let get_response;
    try {
      const payload = {
        profile_id: profile_id, // Using the initialised profile ID
      };
      get_response = await new Promise((resolve, reject) => {
        grpcClient.GetProfileConfig(payload, (error, grpc_response) => {
          if (error) {
            console.error(error);
            reject(error);
          }
          resolve(grpc_response);
        });
      });
    } catch (error) {
      console.log(error);
    }
    console.log(
      "Test 3 response 2 -- Config snapshot after resetting(not default):  ",
      get_response.config,
    );
    const { config } = get_response;
    // Checking if they indeed updated
    expect(config.lastseen).toMatchObject(set_payload.config_updates.lastseen);
    expect(config.online).toMatchObject(set_payload.config_updates.online);
    //Resetting to defualts
    let reset_defualt_response;
    try {
      const payload = {
        profile_id,
        config_updates: {
          lastseen: "contacts",
          profile_picture: "everyone",
          about: "everyone",
          online: "contacts",
        },
      };
      reset_defualt_response = await new Promise((resolve, reject) => {
        grpcClient.SetConfiguration(payload, (error, grpc_response) => {
          if (error) {
            console.error(error);
            reject(error);
          }
          resolve(grpc_response);
        });
      });
    } catch (error) {
      console.log(error);
    }
    let get_reset_response;
    try {
      const payload = {
        profile_id: profile_id, // Using the initialised profile ID
      };
      get_reset_response = await new Promise((resolve, reject) => {
        grpcClient.GetProfileConfig(payload, (error, grpc_response) => {
          if (error) {
            console.error(error);
            reject(error);
          }
          resolve(grpc_response);
        });
      });
    } catch (error) {
      console.log(error);
    }

    const get_reset_config = get_reset_response.config;
    console.log(
      "Test 3 response 2 -- Config snapshot after resetting(default):  ",
      get_reset_config,
    );
    expect(get_reset_config.online).toBeUndefined();
    expect(get_reset_config.lastseen).toBeUndefined();
    expect(get_reset_config.about).toBeUndefined();
  });

  it("should update profile profile details", async () => {
    let response;
    const payload = {
      profile_id,
      config_updates: {
        name: "Keamogetswe",
        lastname: "Keagile",
        dob: "1990-01-01",
        phone: "1111111",
        profile_picture: "my_personal_new",
      },
    };
    try {
      expect(user_id).toBeDefined();
      // await new Promise((resolve) => setTimeout(resolve, 2000));

      // payload fields mapped to the parameters handled by the server

      // Executes via the clean, synchronous wrapper framework on the server side
      response = await new Promise((resolve, reject) => {
        grpcClient.UpdateProfile(payload, (error, grpc_response) => {
          if (error) {
            reject(error);
          }
          resolve(grpc_response);
        });
      });

      // Verifies the structural result properties map cleanly
    } catch (err) {
      console.log("Error: ", err);
    }
    console.log("Test 4 response: ", response);
    expect(response.message).toBeDefined();
    expect(response.success).toBeTruthy();
    const query = "SELECT * FROM `user_profiles` WHERE id = ?";
    const [[row]] = await mysql_connection.execute(query, [profile_id]);
    console.log("Test 4 Query: ", row);

    expect(row.name).toBe(payload.config_updates.name);
    expect(row.lastname).toBe(payload.config_updates.lastname);
    expect(row.phone).toBe(payload.config_updates.phone);
    expect(row.profile_picture).toBe(payload.config_updates.profile_picture);
  });
});
