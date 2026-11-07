import type { UserRole } from "./types";

export type Permission =
  | "admin.access"
  | "admins.manage"
  | "audit.read_all"
  | "audit.read_own"
  | "credits.approve"
  | "distributors.review"
  | "inventory.manage_own"
  | "offices.manage"
  | "plantations.create"
  | "plantations.review"
  | "records.delete_permanently"
  | "redemptions.review"
  | "rewards.manage"
  | "settings.manage"
  | "users.moderate"
  | "users.read";

const citizenPermissions = ["plantations.create"] satisfies Permission[];

const distributorPermissions = [
  ...citizenPermissions,
  "inventory.manage_own"
] satisfies Permission[];

const adminPermissions = [
  "admin.access",
  "audit.read_own",
  "credits.approve",
  "distributors.review",
  "offices.manage",
  "plantations.review",
  "redemptions.review",
  "rewards.manage",
  "users.moderate",
  "users.read"
] satisfies Permission[];

const superAdminOnlyPermissions = [
  "admins.manage",
  "audit.read_all",
  "records.delete_permanently",
  "settings.manage"
] satisfies Permission[];

const rolePermissions: Record<UserRole, ReadonlySet<Permission>> = {
  user: new Set(citizenPermissions),
  distributor: new Set(distributorPermissions),
  admin: new Set(adminPermissions),
  super_admin: new Set([...adminPermissions, ...superAdminOnlyPermissions])
};

export function hasPermission(role: UserRole, permission: Permission) {
  return rolePermissions[role]?.has(permission) ?? false;
}

export function permissionsForRole(role: UserRole) {
  return [...rolePermissions[role]];
}
