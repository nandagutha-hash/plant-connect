import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getCurrentUserMock = vi.hoisted(() => vi.fn());
const findUserCredentialsByIdMock = vi.hoisted(() => vi.fn());
const updateUserPasswordMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/adminSession", () => ({
  getCurrentUser: getCurrentUserMock
}));

vi.mock("@/lib/repository", () => ({
  findUserCredentialsById: findUserCredentialsByIdMock,
  updateUserPassword: updateUserPasswordMock
}));

function jsonRequest(payload: unknown) {
  return new Request("https://plantconnect.test/api/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      host: "plantconnect.test",
      origin: "https://plantconnect.test"
    },
    body: JSON.stringify(payload)
  }) as NextRequest;
}

describe("change password route", () => {
  beforeEach(() => {
    getCurrentUserMock.mockReset();
    findUserCredentialsByIdMock.mockReset();
    updateUserPasswordMock.mockReset();
    getCurrentUserMock.mockResolvedValue({
      id: "admin-1",
      name: "PlantConnect Administrator",
      email: "admin@plantconnect.in",
      role: "super_admin",
      accountStatus: "active",
      mustChangePassword: true,
      sessionVersion: 2
    });
  });

  it("requires the current password", async () => {
    const { POST } = await import("./change-password/route");

    const response = await POST(
      jsonRequest({
        newPassword: "NewPassword@2026"
      })
    );

    expect(response.status).toBe(400);
  });

  it("rejects an incorrect current password", async () => {
    findUserCredentialsByIdMock.mockResolvedValueOnce({
      id: "admin-1",
      passwordHash: await bcrypt.hash("CorrectPassword@2026", 12)
    });
    const { POST } = await import("./change-password/route");

    const response = await POST(
      jsonRequest({
        currentPassword: "WrongPassword@2026",
        newPassword: "NewPassword@2026"
      })
    );

    expect(response.status).toBe(401);
  });

  it("rotates the password, session version, and session cookie", async () => {
    findUserCredentialsByIdMock.mockResolvedValueOnce({
      id: "admin-1",
      passwordHash: await bcrypt.hash("CorrectPassword@2026", 12)
    });
    updateUserPasswordMock.mockResolvedValueOnce({
      id: "admin-1",
      name: "PlantConnect Administrator",
      email: "admin@plantconnect.in",
      role: "super_admin",
      accountStatus: "active",
      mustChangePassword: false,
      sessionVersion: 3
    });
    const { POST } = await import("./change-password/route");

    const response = await POST(
      jsonRequest({
        currentPassword: "CorrectPassword@2026",
        newPassword: "NewPassword@2026"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("plantconnect_session=");
    expect(updateUserPasswordMock).toHaveBeenCalledWith("admin-1", expect.any(String));
    expect(body).toMatchObject({
      redirectTo: "/admin",
      user: {
        id: "admin-1",
        role: "super_admin",
        mustChangePassword: false,
        sessionVersion: 3
      }
    });
  });
});
