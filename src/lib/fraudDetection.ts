export type FraudSignal =
  | "duplicate_image_same_user"
  | "duplicate_image_different_user"
  | "repeated_gps"
  | "rapid_uploads";

export type FraudRiskLabel = "normal" | "suspicious" | "highly_suspicious";

export type FraudSignalInput = {
  duplicateImageSameUser?: boolean;
  duplicateImageDifferentUser?: boolean;
  repeatedGps?: boolean;
  rapidUploads?: boolean;
};

export type FraudScoreResult = {
  score: number;
  signals: FraudSignal[];
};

const signalWeights = [
  ["duplicateImageSameUser", "duplicate_image_same_user", 35],
  ["duplicateImageDifferentUser", "duplicate_image_different_user", 60],
  ["repeatedGps", "repeated_gps", 25],
  ["rapidUploads", "rapid_uploads", 20]
] as const satisfies readonly [keyof FraudSignalInput, FraudSignal, number][];

export function calculateFraudScore(input: FraudSignalInput): FraudScoreResult {
  const result = signalWeights.reduce<FraudScoreResult>(
    (current, [inputKey, signal, weight]) => {
      if (!input[inputKey]) {
        return current;
      }

      return {
        score: current.score + weight,
        signals: [...current.signals, signal]
      };
    },
    { score: 0, signals: [] }
  );

  return {
    ...result,
    score: Math.min(result.score, 100)
  };
}

export function fraudRiskLabel(score: number): FraudRiskLabel {
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new Error("Fraud score must be between 0 and 100");
  }

  if (score <= 30) {
    return "normal";
  }

  return score <= 60 ? "suspicious" : "highly_suspicious";
}
