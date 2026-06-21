import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Collector from "../../../app/deamon/metrics/collector";
import argon2 from "argon2";
import { Database } from "../../../app/deamon/db";
import RequirementResolver from "../../../app/deamon/actions/dependency/requirement.resolver";

describe("Collector.useMetricsFrom", () => {
  let mysql_connection;
  beforeAll(async () => {
    mysql_connection = await Database.getSQLConnection();
    mysql_connection.beginTransaction();
    RequirementResolver.setupResolver("mysql_connection", mysql_connection);
  });
  afterAll(async () => {
    try {
      await mysql_connection.rollback();
    } catch (er) {
      console.error(er);
    }
  });

  it("should collect metrics for a successful job", async () => {
    const handler = async (bytes64 = true) => {
      // simulate delay
      // await new Promise((resolve, reject)=> setTimeout(() =>resolve(), 100));
      const password = "*************";
      const hash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: bytes64 ? 65536 : 131072, // 64 MB
        timeCost: bytes64 ? 30 : 60, // 3 iterations
        parallelism: 4, // 4 threads
      });
      const arr = [];
      for (let i = 0; i < 1e5; i++) arr.push(i * 2);
      return { success: true, intrinsic: hash };
    };

    const metrics_for_128 = await Collector.useMetricsFrom(
      "mock.hash.job",
      async () => await handler(false),
    );
    const metrics_for_64 = await Collector.useMetricsFrom(
      "hash.mock.job",
      handler,
    );
    expect(metrics_for_64.status).toBeTruthy();
    expect(metrics_for_128.status).toBeTruthy();
    expect(metrics_for_128.durationMs).toBeGreaterThan(
      metrics_for_64.durationMs,
    );
    expect(metrics_for_128.ramChangeMB).toBeGreaterThan(
      metrics_for_64.ramChangeMB,
    );
    expect(metrics_for_128.cpuTimeMs).toBeGreaterThan(metrics_for_64.cpuTimeMs);
  });
  it("should should save metrics", async () => {
    const job_type = "collector.test";
    vi.spyOn(Collector, "useMetricsFrom").mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const memoryDeltaMB = -2.3;
      return {
        durationMs: Number(2000),
        cpuTimeMs: Number(4000),
        ramChangeMB: memoryDeltaMB > 0 ? memoryDeltaMB : 0,
        status: true,
        timestamp: new Date().toISOString(),
      };
    });
    const metrics = await Collector.useMetricsFrom();
    await Collector.saveMetricsFrom(job_type, metrics);
    const [[result]] = await mysql_connection.execute(
      "SELECT * FROM job_metrics WHERE job_type = ?",
      [job_type],
    );
    console.log(result);
    expect(metrics.durationMs).toBe(result.total_duration_ms);
    expect(metrics.ramChangeMB).toBe(result.total_ram_allocated_mb);
    expect(metrics.cpuTimeMs).toBe(result.total_cpu_time_ms);
  });
});
