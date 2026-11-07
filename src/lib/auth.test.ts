import { describe, expect, it } from "vitest";
import { roleHomePath } from "./auth";

describe("roleHomePath", () => {
  it("sends distributors to the distributor dashboard", () => {
    expect(roleHomePath("distributor")).toBe("/dashboard");
  });

  it("sends users to discovery", () => {
    expect(roleHomePath("user")).toBe("/discover");
  });
});
