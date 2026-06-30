import { describe, it, expect, vi } from "vitest";
import registry from "../../app/deamon/registry";
import JobProcessor from "../../app/deamon/processor";

describe("JobProcessor.run_job", () => {
  it("returns the timeout rejection", async () => {
    const job_in_reg = {
      handler: () => new Promise(() => {}),
      rules: {
        timeout: 10,
      },
    };

    vi.spyOn(registry, "getJob").mockReturnValue(job_in_reg);

    const job = {
      type: "timeout.test",
      payload: {},
      timeout: 1000,
    };
    const job_run_status = await JobProcessor.run_job(job);

    await expect(job_run_status).toEqual({
      success: false,
      intrinsic: expect.any(Error),
    });
    console.log("Job: ", await JobProcessor.run_job(job));
    await expect(job_run_status.intrinsic).toMatchObject({
      message: "Timeout",
    });
  });
});
