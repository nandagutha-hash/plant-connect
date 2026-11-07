import { describe, expect, it } from "vitest";
import {
  ECO_CREDIT_AWARDS,
  getAvailableEcoCredits,
  getEcoLevel,
  getLevelProgress,
  getMilestoneCredit
} from "./ecoCredits";

describe("eco credit milestones", () => {
  it("matches the required milestone credit awards", () => {
    expect(ECO_CREDIT_AWARDS).toEqual({
      "Initial Plantation": 50,
      "15-Day Growth Update": 50,
      "30-Day Growth Update": 100,
      "60-Day Growth Update": 150,
      "90-Day Growth Update": 250,
      "Mature Plant Verification": 400
    });
  });

  it("returns zero for an unknown milestone", () => {
    expect(getMilestoneCredit("Unknown milestone")).toBe(0);
  });
});

describe("eco credit levels", () => {
  it.each([
    [0, "Seedling Explorer"],
    [100, "Seedling Explorer"],
    [101, "Green Guardian"],
    [300, "Green Guardian"],
    [301, "Tree Protector"],
    [700, "Tree Protector"],
    [701, "Eco Champion"],
    [1500, "Eco Champion"],
    [1501, "Forest Hero"]
  ])("maps %i credits to %s", (credits, level) => {
    expect(getEcoLevel(credits)).toBe(level);
  });

  it("reports progress toward the next level", () => {
    expect(getLevelProgress(425)).toEqual({
      currentLevel: "Tree Protector",
      nextLevel: "Eco Champion",
      currentThreshold: 301,
      nextThreshold: 701,
      percent: 31
    });
  });

  it("caps progress for the highest level", () => {
    expect(getLevelProgress(1900)).toEqual({
      currentLevel: "Forest Hero",
      nextLevel: null,
      currentThreshold: 1501,
      nextThreshold: null,
      percent: 100
    });
  });
});

describe("available eco credits", () => {
  it("subtracts redeemed reward costs from total earned credits", () => {
    expect(getAvailableEcoCredits(800, [100, 250])).toBe(450);
  });

  it("never returns a negative available balance", () => {
    expect(getAvailableEcoCredits(100, [500])).toBe(0);
  });
});
