import fs from "node:fs";
import path from "node:path";

const Notification = (() => {
  const dump = (message) => {
    if (process.env.ENV === "test" && process.env.TEST_VERIFICATION_DIFF) {
      const match = message.match(/(?<!\d)\d{6}(?!\d)/);
      if (match) {
        const filePath = process.env.TEST_VERIFICATION_DIFF;

        // Use path.dirname to get directory safely
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(filePath, match[0], {
          flag: "w",
          encoding: "utf8",
        });
      }
    }
  };

  return {
    SMS: {
      send: async (message, phone_number) => {
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
