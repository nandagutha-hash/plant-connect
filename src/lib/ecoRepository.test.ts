import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlantation, getEcoProfile, listRewardsForUser } from "./ecoRepository";

describe("ecoRepository production data guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not fabricate an eco profile when DATABASE_URL is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(
      getEcoProfile("user-without-database", {
        id: "user-without-database",
        name: "Real User",
        email: "real@example.com"
      })
    ).rejects.toThrow("DATABASE_URL is not configured");
  });

  it("does not fabricate rewards when DATABASE_URL is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(listRewardsForUser("user-without-database")).rejects.toThrow("DATABASE_URL is not configured");
  });

  it("does not persist plantations outside PostgreSQL", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(
      createPlantation("user-without-database", {
        plantName: "Neem",
        plantationDate: "2026-06-16",
        latitude: 16.5062,
        longitude: 80.648,
        imageUrl: "data:image/png;base64,plant-proof"
      })
    ).rejects.toThrow("DATABASE_URL is not configured");
  });
});
