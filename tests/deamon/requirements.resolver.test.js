import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import RequirementResolver from "../../app/deamon/actions/dependency/requirement.resolver"
import Registry from "../../app/deamon/registry";
let conn;
let requirement_key = "mysql_connection"
let requirements_resolved;
beforeEach(() => {
  conn = {
    execute: vi.fn(),
    beginTransaction: vi.fn(),
    commit: vi.fn(),
    rollback: vi.fn(),
    end: vi.fn(),
  };
   RequirementResolver.setupResolver(requirement_key, conn);
   requirements_resolved = RequirementResolver.resolve({[requirement_key]: "no value"})
});


describe("Action dependency resoltion and job execution.", () => {
  it("should have loaded requirements to resolve", async () => {
    expect(requirements_resolved[requirement_key]).toBeDefined()
    expect(requirements_resolved[requirement_key]).toMatchObject(conn)
  });
});
