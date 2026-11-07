import { describe, expect, it } from "vitest";
import { calculateFraudScore, fraudRiskLabel } from "./fraudDetection";

describe("plantation fraud scoring", () => {
  it("adds the approved signal weights", () => {
    expect(calculateFraudScore({ duplicateImageSameUser: true })).toEqual({
      score: 35,
      signals: ["duplicate_image_same_user"]
    });
    expect(calculateFraudScore({ duplicateImageDifferentUser: true })).toEqual({
      score: 60,
      signals: ["duplicate_image_different_user"]
    });
    expect(calculateFraudScore({ repeatedGps: true })).toEqual({
      score: 25,
      signals: ["repeated_gps"]
    });
    expect(calculateFraudScore({ rapidUploads: true })).toEqual({
      score: 20,
      signals: ["rapid_uploads"]
    });
  });

  it("caps combined fraud scores at 100", () => {
    expect(
      calculateFraudScore({
        duplicateImageSameUser: true,
        duplicateImageDifferentUser: true,
        repeatedGps: true,
        rapidUploads: true
      }).score
    ).toBe(100);
  });

  it("labels the exact approved score ranges", () => {
    expect(fraudRiskLabel(0)).toBe("normal");
    expect(fraudRiskLabel(30)).toBe("normal");
    expect(fraudRiskLabel(31)).toBe("suspicious");
    expect(fraudRiskLabel(60)).toBe("suspicious");
    expect(fraudRiskLabel(61)).toBe("highly_suspicious");
    expect(fraudRiskLabel(100)).toBe("highly_suspicious");
  });

  it("rejects scores outside the database range", () => {
    expect(() => fraudRiskLabel(-1)).toThrow("Fraud score must be between 0 and 100");
    expect(() => fraudRiskLabel(101)).toThrow("Fraud score must be between 0 and 100");
  });
});
