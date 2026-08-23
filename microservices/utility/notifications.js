import fs from "node:fs";

const Notification = (() => {
  const dump = (message) => {
    if (process.env.ENV === "test" && process.env.TEST_VERIFICATION_DIFF) {
      // Extract first 6 consecutive digits
      const match = message.match(/\d{6}/);
      if (match) {
        fs.writeFileSync(process.env.TEST_VERIFICATION_DIFF, match[0], "utf8");
      }
    }
  };

  return {
    SMS: {
      send: async (phone_number, message) => {
        dump(message);
        return true;
      },
    },
    EMAIL: {
      send: async (email, subject, body) => {
        dump(body);
        return true;
      },
    },
  };
})();

export { Notification };
