import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("PlantConnect permission matrix", () => {
  it("keeps user permissions limited to citizen workflows", () => {
    expect(hasPermission("user", "plantations.create")).toBe(true);
    expect(hasPermission("user", "offices.manage")).toBe(false);
    expect(hasPermission("user", "users.moderate")).toBe(false);
  });

  it("keeps distributor permissions scoped to their own nursery", () => {
    expect(hasPermission("distributor", "inventory.manage_own")).toBe(true);
    expect(hasPermission("distributor", "rewards.manage")).toBe(false);
    expect(hasPermission("distributor", "admin.access")).toBe(false);
  });

  it("allows admins to moderate operations but not govern administrators", () => {
    expect(hasPermission("admin", "admin.access")).toBe(true);
    expect(hasPermission("admin", "plantations.review")).toBe(true);
    expect(hasPermission("admin", "users.moderate")).toBe(true);
    expect(hasPermission("admin", "admins.manage")).toBe(false);
    expect(hasPermission("admin", "records.delete_permanently")).toBe(false);
  });

  it("allows super admins to perform every privileged operation", () => {
    expect(hasPermission("super_admin", "admin.access")).toBe(true);
    expect(hasPermission("super_admin", "admins.manage")).toBe(true);
    expect(hasPermission("super_admin", "settings.manage")).toBe(true);
    expect(hasPermission("super_admin", "records.delete_permanently")).toBe(true);
    expect(hasPermission("super_admin", "audit.read_all")).toBe(true);
  });
});
