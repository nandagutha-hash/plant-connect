import { describe, expect, it, vi } from "vitest";
import { appendAuditLog, withAdminTransaction } from "./adminRepository";

function makeClient() {
  return {
    query: vi.fn(),
    release: vi.fn()
  };
}

const actor = {
  id: "admin-1",
  email: "admin@plantconnect.in",
  role: "admin"
} as const;

describe("admin repository audit transactions", () => {
  it("rolls back the full administrative mutation when audit insertion fails", async () => {
    const client = makeClient();
    client.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error("audit failed"))
      .mockResolvedValueOnce({ rows: [] });

    await expect(
      withAdminTransaction(async (transactionClient) => {
        await transactionClient.query("UPDATE users SET account_status = 'suspended' WHERE id = $1", ["user-1"]);
        await appendAuditLog(transactionClient, {
          actor,
          targetType: "user",
          targetId: "user-1",
          targetUserId: "user-1",
          action: "user.suspend",
          reason: "Fake plantation upload"
        });
      }, client)
    ).rejects.toThrow("audit failed");

    expect(client.query.mock.calls.map((call) => call[0])).toEqual([
      "BEGIN",
      "UPDATE users SET account_status = 'suspended' WHERE id = $1",
      expect.stringContaining("INSERT INTO audit_logs"),
      "ROLLBACK"
    ]);
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledTimes(1);
  });
});
