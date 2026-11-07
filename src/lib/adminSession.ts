import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth";
import { hasPermission, type Permission } from "./permissions";
import { findSessionUserById } from "./repository";
import type { SessionDatabaseUser } from "./types";

export type AuthenticatedUser = SessionDatabaseUser;

export type RequirePermissionOptions = {
  allowPasswordChangeRequired?: boolean;
};

function assertActiveAccount(user: AuthenticatedUser) {
  if (user.accountStatus === "suspended") {
    throw new Error("Account suspended");
  }

  if (user.accountStatus === "banned") {
    throw new Error("Account banned");
  }

  if (user.accountStatus === "deleted") {
    throw new Error("Account deleted");
  }
}

export async function getCurrentUser(request: NextRequest): Promise<AuthenticatedUser> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    throw new Error("Unauthorized");
  }

  const tokenUser = await verifySessionToken(token);

  if (!tokenUser) {
    throw new Error("Unauthorized");
  }

  const databaseUser = await findSessionUserById(tokenUser.id);

  if (!databaseUser) {
    throw new Error("Unauthorized");
  }

  if ((tokenUser.sessionVersion ?? 0) !== databaseUser.sessionVersion) {
    throw new Error("Session expired");
  }

  assertActiveAccount(databaseUser);

  return databaseUser;
}

export async function requirePermission(
  request: NextRequest,
  permission: Permission,
  options: RequirePermissionOptions = {}
): Promise<AuthenticatedUser> {
  const user = await getCurrentUser(request);

  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    throw new Error("Password change required");
  }

  if (!hasPermission(user.role, permission)) {
    throw new Error("Insufficient permissions");
  }

  if (permission === "inventory.manage_own" && user.distributorApprovalStatus !== "approved") {
    throw new Error("Distributor approval required");
  }

  return user;
}
