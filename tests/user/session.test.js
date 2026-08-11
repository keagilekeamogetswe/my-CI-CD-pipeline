import { describe, it, expect, vi, beforeEach } from "vitest";
import { SessionRepository } from "../../microservices/user/session/repository";

describe("SessionRepository", () => {
    let mysql_connection;

    beforeEach(() => {
        mysql_connection = {
            query: vi.fn(),
            execute: vi.fn()
        };

        vi.restoreAllMocks();
    });

    const session = {
        jti: "abc123",
        user_id: 10,
        device_info: "Chrome",
        ip_address: "127.0.0.1",
        token_hash: "tokenhash",
        fp_hash: "fingerprinthash"
    };

    describe("save()", () => {

        it("should insert a session into the database", async () => {

            mysql_connection.query.mockResolvedValue([
                { insertId: 5 }
            ]);

            global.db_params = {
                iat: Date.now(),
                exp: Date.now() + 3600000
            };

            await SessionRepository.save(
                structuredClone(session),
                mysql_connection
            );

            expect(mysql_connection.query).toHaveBeenCalledTimes(1);

            const [query, values] = mysql_connection.query.mock.calls[0];

            expect(query).toContain("INSERT INTO user_session");

            expect(values).toContain(session.jti);
            expect(values).toContain(session.user_id);
        });

        it("should throw if an unexpected field is provided", async () => {

            mysql_connection.query.mockResolvedValue([
                { insertId: 1 }
            ]);

            global.db_params = {
                iat: Date.now(),
                exp: Date.now() + 3600000
            };

            await expect(
                SessionRepository.save(
                    {
                        ...session,
                        hacker_field: "bad"
                    },
                    mysql_connection
                )
            ).rejects.toThrow("Field not required: hacker_field");
        });

    });

    describe("revoke()", () => {

        it("should return true when a session is revoked", async () => {

            mysql_connection.execute.mockResolvedValue([
                {
                    changedRows: 1
                }
            ]);

            const result = await SessionRepository.revoke(
                10,
                "abc123",
                mysql_connection
            );

            expect(result).toBe(true);

            expect(mysql_connection.execute).toHaveBeenCalledOnce();
        });

        it("should return false when no session was updated", async () => {

            mysql_connection.execute.mockResolvedValue([
                {
                    changedRows: 0
                }
            ]);

            const result = await SessionRepository.revoke(
                10,
                "abc123",
                mysql_connection
            );

            expect(result).toBe(false);
        });

    });

    describe("revokeAll()", () => {

        it("should revoke all sessions for a user", async () => {

            mysql_connection.execute.mockResolvedValue([
                {
                    changedRows: 4
                }
            ]);

            const result = await SessionRepository.revokeAll(
                10,
                mysql_connection
            );

            expect(result).toBe(true);

            expect(mysql_connection.execute).toHaveBeenCalledOnce();
        });

        it("should return false when no sessions exist", async () => {

            mysql_connection.execute.mockResolvedValue([
                {
                    changedRows: 0
                }
            ]);

            const result = await SessionRepository.revokeAll(
                10,
                mysql_connection
            );

            expect(result).toBe(false);
        });

    });

});