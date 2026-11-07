import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { POST as login } from "./login/route";
import { POST as signup } from "./signup/route";

function jsonRequest(path: string, payload: unknown) {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }) as NextRequest;
}

describe("auth routes production database guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns service unavailable when login cannot read from PostgreSQL", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const response = await login(
      jsonRequest("/api/auth/login", {
        email: "citizen@example.com",
        password: "password123"
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "DATABASE_URL is not configured"
    });
  });

  it("returns service unavailable when signup cannot persist to PostgreSQL", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const response = await signup(
      jsonRequest("/api/auth/signup", {
        name: "Citizen User",
        email: "citizen@example.com",
        password: "password123",
        role: "user"
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "DATABASE_URL is not configured"
    });
  });
});
