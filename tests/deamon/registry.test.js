import { test ,expect} from "vitest";
import registry from "../../app/deamon/registry";


test("Registry loads actions", async () => {
  console.log(registry)
  const job = registry.getJob("session.save");
  expect(job.handler).toBeDefined();
  expect(job.rules.maxRetries).toBe(10);
});
