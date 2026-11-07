import { describe, expect, it } from "vitest";
import { plantPayloadSchema, signupPayloadSchema } from "./validators";

describe("plantPayloadSchema", () => {
  it("accepts a valid plant payload", () => {
    const parsed = plantPayloadSchema.parse({
      commonName: "Neem",
      botanicalName: "Azadirachta indica",
      category: "Native tree",
      quantity: 120,
      imageUrl: "https://example.com/neem.jpg"
    });

    expect(parsed.quantity).toBe(120);
  });

  it("rejects negative quantities", () => {
    expect(() =>
      plantPayloadSchema.parse({
        commonName: "Neem",
        botanicalName: "Azadirachta indica",
        category: "Native tree",
        quantity: -1
      })
    ).toThrow();
  });
});

describe("signupPayloadSchema", () => {
  it("requires distributor contact details for distributor signups", () => {
    expect(() =>
      signupPayloadSchema.parse({
        name: "Government Nursery Officer",
        email: "officer@example.com",
        password: "securepass123",
        role: "distributor"
      })
    ).toThrow();
  });
});
