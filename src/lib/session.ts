import type { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, requirePermission } from "./adminSession";
import { SESSION_COOKIE } from "./auth";
import type { Permission } from "./permissions";
import type { SessionUser } from "./auth";

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  try {
    return await getCurrentUser(request);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return null;
    }

    throw error;
  }
}

export async function requireSessionUser(request: NextRequest): Promise<SessionUser> {
  const user = await getSessionUser(request);

  if (!user) {
    throw new Error("Unauthorized");
  }

  if (user.mustChangePassword) {
    throw new Error("Password change required");
  }

  return user;
}

export async function requireDistributorSession(request: NextRequest): Promise<SessionUser & { distributorId: string }> {
  const user = await requirePermission(request, "inventory.manage_own");

  if (!user.distributorId) {
    throw new Error("Distributor access required");
  }

  return { ...user, distributorId: user.distributorId };
}

export async function requireAdminSession(request: NextRequest): Promise<SessionUser> {
  return requirePermission(request, "admin.access");
}

export async function requireRoutePermission(request: NextRequest, permission: Permission): Promise<SessionUser> {
  return requirePermission(request, permission);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export function authErrorStatus(error: unknown) {
  if (!(error instanceof Error)) {
    return 400;
  }

  if (error.message === "Unauthorized") {
    return 401;
  }

  if (
    error.message === "Distributor access required" ||
    error.message === "Distributor approval required" ||
    error.message === "Admin access required" ||
    error.message === "Insufficient permissions" ||
    error.message === "Password change required" ||
    error.message === "Account suspended" ||
    error.message === "Account banned" ||
    error.message === "Account deleted" ||
    error.message === "Same-origin request required"
  ) {
    return 403;
  }

  if (error.message === "Session expired") {
    return 401;
  }

  if (error.message === "DATABASE_URL is not configured") {
    return 503;
  }

  return 400;
}
