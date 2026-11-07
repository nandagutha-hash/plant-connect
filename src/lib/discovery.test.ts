import { describe, expect, it } from "vitest";
import { calculateDistanceKm, rankDfoOfficesByDistance, rankDistributorsByDistance } from "./discovery";
import type { DfoOffice } from "./types";

describe("calculateDistanceKm", () => {
  it("returns zero for identical coordinates", () => {
    expect(calculateDistanceKm(12.9716, 77.5946, 12.9716, 77.5946)).toBe(0);
  });

  it("calculates a realistic city-scale distance", () => {
    const distance = calculateDistanceKm(12.9716, 77.5946, 13.0827, 80.2707);

    expect(distance).toBeGreaterThan(280);
    expect(distance).toBeLessThan(310);
  });
});

describe("rankDistributorsByDistance", () => {
  it("adds distance and sorts nearest distributors first", () => {
    const result = rankDistributorsByDistance(
      [
        {
          id: "far",
          name: "Far Urban Nursery",
          address: "Remote city",
          latitude: 13.0827,
          longitude: 80.2707,
          phone: "111",
          hours: "Mon-Fri",
          description: "Distributor record",
          plantCount: 4,
          availablePlants: 80
        },
        {
          id: "near",
          name: "Nearby Forest Nursery",
          address: "Nearby city",
          latitude: 12.9763,
          longitude: 77.5929,
          phone: "222",
          hours: "Mon-Fri",
          description: "Distributor record",
          plantCount: 8,
          availablePlants: 170
        }
      ],
      { latitude: 12.9716, longitude: 77.5946 }
    );

    expect(result[0]?.id).toBe("near");
    expect(result[0]?.distanceKm).toBeLessThan(1);
    expect(result[1]?.distanceKm).toBeGreaterThan(280);
  });
});

describe("rankDfoOfficesByDistance", () => {
  const offices: DfoOffice[] = [
    {
      id: "far-active",
      officeName: "Far Forest Office",
      district: "Srikakulam",
      division: "Srikakulam Forest Division",
      mandal: "Srikakulam",
      village: "Srikakulam",
      address: "Srikakulam, Andhra Pradesh",
      latitude: 18.2949,
      longitude: 83.8938,
      phone: "111",
      email: "far@example.test",
      officeType: "DFO Office",
      verified: true,
      saplingDistributionAvailable: true,
      status: "active",
      availableSaplings: ["Neem"],
      operatingHours: "Mon-Sat"
    },
    {
      id: "near-active",
      officeName: "NTR District Forest Office",
      district: "NTR",
      division: "Vijayawada Forest Division",
      mandal: "Vijayawada Urban",
      village: "Vijayawada",
      address: "Vijayawada, Andhra Pradesh",
      latitude: 16.5062,
      longitude: 80.648,
      phone: "222",
      email: "near@example.test",
      officeType: "DFO Office",
      verified: true,
      saplingDistributionAvailable: true,
      status: "active",
      availableSaplings: ["Amla"],
      operatingHours: "Mon-Sat"
    },
    {
      id: "inactive",
      officeName: "Inactive Nursery",
      district: "NTR",
      division: "Vijayawada Forest Division",
      mandal: "Vijayawada Urban",
      village: "Vijayawada",
      address: "Vijayawada, Andhra Pradesh",
      latitude: 16.5,
      longitude: 80.64,
      phone: "333",
      email: "inactive@example.test",
      officeType: "Nursery",
      verified: false,
      saplingDistributionAvailable: true,
      status: "inactive",
      availableSaplings: ["Neem"],
      operatingHours: "Mon-Sat"
    }
  ];

  it("filters inactive offices and returns nearest active offices first", () => {
    const result = rankDfoOfficesByDistance(offices, { latitude: 16.5062, longitude: 80.648 });

    expect(result.map((office) => office.id)).toEqual(["near-active", "far-active"]);
    expect(result[0]?.distanceKm).toBe(0);
    expect(result[1]?.distanceKm).toBeGreaterThan(390);
  });

  it("respects the requested result limit", () => {
    const result = rankDfoOfficesByDistance(offices, { latitude: 16.5062, longitude: 80.648 }, 1);

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("near-active");
  });
});
