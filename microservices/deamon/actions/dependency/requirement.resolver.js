import { ObjectId } from "mongodb";
import { Database } from "../../db";
import  { RabbitMQ} from "../../rabbitmq"


const RequirementResolver = (() => {
  const requirements = new Map();

  return {
    resolve: (spec_requirements) => {
      const map = Object.keys(spec_requirements).map((key) => {
        const requirement = requirements.get(key);
        if (!requirement)
          throw new Error(
            `Speifified require is no loaded. requirement not found: ${key}, `,
          );
        // requirement could be a callback or value from your resolver
        return [key, requirement];
      });
      return Object.fromEntries(map);
    },
    setupResolver: (key, value) => {
      requirements.set(key, value);
    },
  };
})();

export default RequirementResolver;
// I can always overwrite this in tests
RequirementResolver.setupResolver(
  "mysql_connection",
  await Database.getSQLConnection(),
);
     const delayed_channel = await RabbitMQ.getChannel();
        const none_delayed_channel = await RabbitMQ.getChannel(false);


    RequirementResolver.setupResolver("delayed_channel", delayed_channel);
    RequirementResolver.setupResolver(
      "none_delayed_channel",
      none_delayed_channel,
    );