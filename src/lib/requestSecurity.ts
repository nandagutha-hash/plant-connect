import type { NextRequest } from "next/server";

const stateChangingMethods = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function requireSameOrigin(request: NextRequest) {
  if (!stateChangingMethods.has(request.method.toUpperCase())) {
    return;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    throw new Error("Same-origin request required");
  }

  let originHost: string;

  try {
    originHost = new URL(origin).host;
  } catch {
    throw new Error("Same-origin request required");
  }

  if (originHost !== host) {
    throw new Error("Same-origin request required");
  }
}
