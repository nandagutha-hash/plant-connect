import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { requireSameOrigin } from "./requestSecurity";

function makeRequest(method: string, origin: string | null) {
  return new NextRequest("https://plantconnect.test/api/admin/users", {
    method,
    headers: {
      host: "plantconnect.test",
      ...(origin ? { origin } : {})
    }
  });
}

describe("same-origin request security", () => {
  it("allows safe reads without an Origin header", () => {
    expect(() => requireSameOrigin(makeRequest("GET", null))).not.toThrow();
  });

  it("allows state-changing requests from the same origin", () => {
    expect(() => requireSameOrigin(makeRequest("PATCH", "https://plantconnect.test"))).not.toThrow();
  });

  it("rejects state-changing requests without an Origin header", () => {
    expect(() => requireSameOrigin(makeRequest("POST", null))).toThrow("Same-origin request required");
  });

  it("rejects cross-origin state-changing requests", () => {
    expect(() => requireSameOrigin(makeRequest("DELETE", "https://evil.example"))).toThrow(
      "Same-origin request required"
    );
  });
});
