import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifySessionTokenMock = vi.hoisted(() => vi.fn());
const findSessionUserByIdMock = vi.hoisted(() => vi.fn());

vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");

  return {
    ...actual,
    verifySessionToken: verifySessionTokenMock
  };
});

vi.mock("./repository", () => ({
  findSessionUserById: findSessionUserByIdMock
}));

function requestWithSession() {
  return new NextRequest("https://plantconnect.test/api/admin/users", {
    headers: {
      cookie: "plantconnect_session=signed-token"
    }
  });
}

const databaseUser = {
  id: "user-1",
  name: "Nandha",
  email: "nandha@example.com",
  role: "admin",
  accountStatus: "active",
  mustChangePassword: false,
  sessionVersion: 4
};

describe("database-authoritative admin sessions", () => {
  beforeEach(() => {
    verifySessionTokenMock.mockReset();
    findSessionUserByIdMock.mockReset();
    verifySessionTokenMock.mockResolvedValue({
      id: "user-1",
      name: "Nandha",
      email: "nandha@example.com",
      role: "admin",
      sessionVersion: 4
    });
    findSessionUserByIdMock.mockResolvedValue(databaseUser);
  });

  it("uses the database role instead of trusting the JWT role", async () => {
    findSessionUserByIdMock.mockResolvedValueOnce({
      ...databaseUser,
      role: "user"
    });
    const { requirePermission } = await import("./adminSession");

    await expect(requirePermission(requestWithSession(), "users.moderate")).rejects.toThrow("Insufficient permissions");
  });

  it("rejects stale sessions after the database session version changes", async () => {
    findSessionUserByIdMock.mockResolvedValueOnce({
      ...databaseUser,
      sessionVersion: 5
    });
    const { requirePermission } = await import("./adminSession");

    await expect(requirePermission(requestWithSession(), "users.moderate")).rejects.toThrow("Session expired");
  });

  it("blocks protected actions until first-login password rotation is complete", async () => {
    findSessionUserByIdMock.mockResolvedValueOnce({
      ...databaseUser,
      mustChangePassword: true
    });
    const { requirePermission } = await import("./adminSession");

    await expect(requirePermission(requestWithSession(), "users.moderate")).rejects.toThrow(
      "Password change required"
    );
  });

  it("returns the current database user when the role has the requested permission", async () => {
    const { requirePermission } = await import("./adminSession");

    await expect(requirePermission(requestWithSession(), "users.moderate")).resolves.toMatchObject({
      id: "user-1",
      role: "admin",
      accountStatus: "active"
    });
  });
});
