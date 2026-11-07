import type { CanonicalEcoMilestone, EcoLevel, EcoMilestone, LevelProgress } from "./types";

export const ECO_CREDIT_AWARDS: Record<CanonicalEcoMilestone, number> = {
  "Initial Plantation": 50,
  "15-Day Growth Update": 50,
  "30-Day Growth Update": 100,
  "60-Day Growth Update": 150,
  "90-Day Growth Update": 250,
  "Mature Plant Verification": 400
};

const LEGACY_ECO_CREDIT_AWARDS: Partial<Record<EcoMilestone, number>> = {
  "Plant Registered": 50,
  "30 Day Progress": 100,
  "90 Day Growth": 150,
  "180 Day Survival": 300,
  "365 Day Healthy Growth": 500
};

const ECO_LEVELS: Array<{
  name: EcoLevel;
  threshold: number;
}> = [
  { name: "Seedling Explorer", threshold: 0 },
  { name: "Green Guardian", threshold: 101 },
  { name: "Tree Protector", threshold: 301 },
  { name: "Eco Champion", threshold: 701 },
  { name: "Forest Hero", threshold: 1501 }
];

export function getMilestoneCredit(milestone: string) {
  return ECO_CREDIT_AWARDS[milestone as CanonicalEcoMilestone] ?? LEGACY_ECO_CREDIT_AWARDS[milestone as EcoMilestone] ?? 0;
}

export function getEcoLevel(credits: number): EcoLevel {
  const normalizedCredits = Math.max(0, credits);

  for (let index = ECO_LEVELS.length - 1; index >= 0; index -= 1) {
    const level = ECO_LEVELS[index];

    if (normalizedCredits >= level.threshold) {
      return level.name;
    }
  }

  return "Seedling Explorer";
}

export function getLevelProgress(credits: number): LevelProgress {
  const normalizedCredits = Math.max(0, credits);
  let currentIndex = 0;

  for (let index = 0; index < ECO_LEVELS.length; index += 1) {
    if (normalizedCredits >= ECO_LEVELS[index].threshold) {
      currentIndex = index;
    }
  }
  const currentLevel = ECO_LEVELS[currentIndex] ?? ECO_LEVELS[0];
  const nextLevel = ECO_LEVELS[currentIndex + 1];

  if (!nextLevel) {
    return {
      currentLevel: currentLevel.name,
      nextLevel: null,
      currentThreshold: currentLevel.threshold,
      nextThreshold: null,
      percent: 100
    };
  }

  const range = nextLevel.threshold - currentLevel.threshold;
  const progress = normalizedCredits - currentLevel.threshold;

  return {
    currentLevel: currentLevel.name,
    nextLevel: nextLevel.name,
    currentThreshold: currentLevel.threshold,
    nextThreshold: nextLevel.threshold,
    percent: Math.min(100, Math.max(0, Math.round((progress / range) * 100)))
  };
}

export function getAvailableEcoCredits(totalEcoCredits: number, redeemedCreditCosts: number[]) {
  const redeemedCredits = redeemedCreditCosts.reduce((sum, cost) => sum + cost, 0);

  return Math.max(0, totalEcoCredits - redeemedCredits);
}
