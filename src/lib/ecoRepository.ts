import type { PoolClient } from "pg";
import { createHash } from "crypto";
import { getPool } from "./db";
import {
  ECO_CREDIT_AWARDS,
  getAvailableEcoCredits,
  getEcoLevel,
  getLevelProgress,
  getMilestoneCredit
} from "./ecoCredits";
import { calculateFraudScore } from "./fraudDetection";
import type {
  CreatePlantationInput,
  CreateProgressUploadInput,
  EcoMilestone,
  EcoProfile,
  EcoProfileUser,
  Plantation,
  ProgressUpload,
  Redemption,
  Reward,
  RewardWithStatus
} from "./types";

type RewardsSummary = {
  rewards: RewardWithStatus[];
  totalEcoCredits: number;
  availableEcoCredits: number;
};

type ProfileTotals = {
  plantations: Plantation[];
  growthHistory: ProgressUpload[];
  totalEcoCredits: number;
  redemptions: Redemption[];
  availableEcoCredits: number;
};

type CreditAwardInput = {
  userId: string;
  credits: number;
  milestone: EcoMilestone;
  plantationId?: string;
  progressUpdateId?: string;
};

function statusForMilestone(milestone: EcoMilestone): Plantation["status"] {
  if (milestone === "Mature Plant Verification" || milestone === "365 Day Healthy Growth") {
    return "completed";
  }

  if (
    milestone === "60-Day Growth Update" ||
    milestone === "90-Day Growth Update" ||
    milestone === "90 Day Growth" ||
    milestone === "180 Day Survival"
  ) {
    return "verified";
  }

  return "tracking";
}

function proofFingerprint(proofText: string) {
  return createHash("sha256").update(proofText).digest("hex");
}

async function getNumericSetting(client: PoolClient, key: string, fallback: number) {
  const result = await client.query("SELECT setting_value FROM platform_settings WHERE setting_key = $1 LIMIT 1", [key]);
  const value = result.rows[0]?.setting_value;
  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

async function countRows(client: PoolClient, sql: string, values: unknown[]) {
  const result = await client.query(sql, values);
  return Number(result.rows[0]?.count ?? 0);
}

async function calculateSubmissionFraud(
  client: PoolClient,
  input: {
    userId: string;
    imageFingerprint: string;
    latitude: number;
    longitude: number;
  }
) {
  const gpsRadiusMeters = await getNumericSetting(client, "fraud_duplicate_gps_radius_meters", 10);
  const gpsLookbackHours = await getNumericSetting(client, "fraud_gps_lookback_hours", 24);
  const rapidWindowMinutes = await getNumericSetting(client, "fraud_rapid_window_minutes", 10);
  const duplicateImageSameUser =
    (await countRows(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT user_id, image_fingerprint FROM plantations WHERE image_fingerprint = $2
          UNION ALL
          SELECT user_id, image_fingerprint FROM progress_updates WHERE image_fingerprint = $2
        ) submissions
        WHERE submissions.user_id = $1
      `,
      [input.userId, input.imageFingerprint]
    )) > 0;
  const duplicateImageDifferentUser =
    (await countRows(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT user_id, image_fingerprint FROM plantations WHERE image_fingerprint = $2
          UNION ALL
          SELECT user_id, image_fingerprint FROM progress_updates WHERE image_fingerprint = $2
        ) submissions
        WHERE submissions.user_id IS DISTINCT FROM $1
      `,
      [input.userId, input.imageFingerprint]
    )) > 0;
  const repeatedGps =
    (await countRows(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT user_id, latitude, longitude, created_at AS submitted_at
          FROM plantations
          WHERE deleted_at IS NULL
          UNION ALL
          SELECT user_id, latitude, longitude, uploaded_at AS submitted_at
          FROM progress_updates
          WHERE deleted_at IS NULL
        ) submissions
        WHERE submissions.user_id = $1
          AND submissions.latitude IS NOT NULL
          AND submissions.longitude IS NOT NULL
          AND submissions.submitted_at >= now() - ($4::text || ' hours')::interval
          AND (
            6371000 * 2 * asin(
              sqrt(
                pow(sin(radians((submissions.latitude - $2) / 2)), 2) +
                cos(radians($2)) * cos(radians(submissions.latitude)) *
                pow(sin(radians((submissions.longitude - $3) / 2)), 2)
              )
            )
          ) <= $5
      `,
      [input.userId, input.latitude, input.longitude, gpsLookbackHours, gpsRadiusMeters]
    )) > 0;
  const rapidUploads =
    (await countRows(
      client,
      `
        SELECT COUNT(*)::int AS count
        FROM (
          SELECT user_id, created_at AS submitted_at
          FROM plantations
          WHERE deleted_at IS NULL
          UNION ALL
          SELECT user_id, uploaded_at AS submitted_at
          FROM progress_updates
          WHERE deleted_at IS NULL
        ) submissions
        WHERE submissions.user_id = $1
          AND submissions.submitted_at >= now() - ($2::text || ' minutes')::interval
      `,
      [input.userId, rapidWindowMinutes]
    )) >= 3;

  return calculateFraudScore({
    duplicateImageSameUser,
    duplicateImageDifferentUser,
    repeatedGps,
    rapidUploads
  });
}

function normalizePlantation(row: Record<string, unknown>): Plantation {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    plantName: String(row.plant_name),
    imageUrl: String(row.image_url),
    plantationDate: new Date(String(row.plantation_date)).toISOString().slice(0, 10),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: row.status as Plantation["status"]
  };
}

function normalizeProgressUpload(row: Record<string, unknown>): ProgressUpload {
  const milestone = row.milestone as ProgressUpload["milestone"];

  return {
    id: String(row.id),
    plantationId: String(row.plantation_id),
    imageUrl: String(row.image_url),
    uploadedAt: new Date(String(row.uploaded_at)).toISOString(),
    milestone,
    creditsAwarded: Number(row.credits_awarded ?? getMilestoneCredit(milestone)),
    plantName: row.plant_name ? String(row.plant_name) : undefined
  };
}

function normalizeReward(row: Record<string, unknown>): Reward {
  return {
    id: String(row.id),
    rewardName: String(row.reward_name),
    creditCost: Number(row.credit_cost),
    description: String(row.description)
  };
}

function normalizeRedemption(row: Record<string, unknown>): Redemption {
  const reward = normalizeReward(row);

  return {
    id: String(row.redemption_id ?? row.id),
    userId: String(row.user_id),
    rewardId: String(row.reward_id),
    redeemedAt: new Date(String(row.redeemed_at)).toISOString(),
    reward
  };
}

function buildEcoProfile(user: EcoProfileUser, totals: ProfileTotals): EcoProfile {
  const level = getEcoLevel(totals.totalEcoCredits);
  const earnedBadges = Array.from(
    new Set([
      level,
      ...totals.redemptions
        .map((redemption) => redemption.reward.rewardName)
        .filter((rewardName) => rewardName.toLowerCase().includes("badge"))
    ])
  );

  return {
    user,
    totalEcoCredits: totals.totalEcoCredits,
    availableEcoCredits: totals.availableEcoCredits,
    level,
    levelProgress: getLevelProgress(totals.totalEcoCredits),
    treesPlanted: totals.plantations.length,
    plantations: [...totals.plantations].sort((a, b) => Date.parse(b.plantationDate) - Date.parse(a.plantationDate)),
    growthHistory: totals.growthHistory,
    redemptions: totals.redemptions,
    earnedBadges
  };
}

async function getTotalEcoCredits(userId: string, client: PoolClient | ReturnType<typeof getPool> = getPool()) {
  const result = await client.query(
    `
      SELECT COALESCE(SUM(credits), 0)::int AS total_eco_credits
      FROM eco_credits
      WHERE user_id = $1
        AND credit_status = 'approved'
    `,
    [userId]
  );

  return Number(result.rows[0]?.total_eco_credits ?? 0);
}

async function awardDbCredits(client: PoolClient, input: CreditAwardInput) {
  await client.query(
    `
      INSERT INTO eco_credits (user_id, plantation_id, progress_update_id, milestone, credits, credit_status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
    `,
    [
      input.userId,
      input.plantationId ?? null,
      input.progressUpdateId ?? null,
      input.milestone,
      input.credits
    ]
  );
}

export async function getEcoProfile(userId: string, fallbackUser?: EcoProfileUser): Promise<EcoProfile> {
  const pool = getPool();
  const userResult = await pool.query(
    `
      SELECT id, name, email
      FROM users
      WHERE id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = userResult.rows[0];

  if (!row && !fallbackUser) {
    throw new Error("User not found");
  }

  const user = row
    ? {
        id: String(row.id),
        name: String(row.name),
        email: String(row.email)
      }
    : fallbackUser!;

  const plantationResult = await pool.query(
    `
      SELECT *
      FROM plantations
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY plantation_date DESC
    `,
    [userId]
  );
  const uploadResult = await pool.query(
    `
      SELECT progress_updates.*,
             plantations.plant_name,
             COALESCE(eco_credits.credits, 0)::int AS credits_awarded
      FROM progress_updates
      JOIN plantations ON plantations.id = progress_updates.plantation_id
      LEFT JOIN eco_credits ON eco_credits.progress_update_id = progress_updates.id
        AND eco_credits.credit_status = 'approved'
      WHERE plantations.user_id = $1
        AND progress_updates.deleted_at IS NULL
      ORDER BY progress_updates.uploaded_at DESC
    `,
    [userId]
  );
  const redemptionResult = await pool.query(
    `
      SELECT redemptions.id AS redemption_id,
             redemptions.user_id,
             redemptions.reward_id,
             redemptions.redeemed_at,
             rewards.id,
             rewards.reward_name,
             rewards.credit_cost,
             rewards.description
      FROM redemptions
      JOIN rewards ON rewards.id = redemptions.reward_id
      WHERE redemptions.user_id = $1
        AND redemptions.redemption_status IN ('pending', 'approved')
      ORDER BY redemptions.redeemed_at DESC
    `,
    [userId]
  );
  const totalEcoCredits = await getTotalEcoCredits(userId, pool);
  const redemptions = redemptionResult.rows.map(normalizeRedemption);

  return buildEcoProfile(user, {
    plantations: plantationResult.rows.map(normalizePlantation),
    growthHistory: uploadResult.rows.map(normalizeProgressUpload),
    totalEcoCredits,
    redemptions,
    availableEcoCredits: getAvailableEcoCredits(
      totalEcoCredits,
      redemptions.map((redemption) => redemption.reward.creditCost)
    )
  });
}

export async function listRewardsForUser(userId: string, fallbackUser?: EcoProfileUser): Promise<RewardsSummary> {
  const profile = await getEcoProfile(userId, fallbackUser);
  const redeemedRewardIds = new Set(profile.redemptions.map((redemption) => redemption.rewardId));
  const result = await getPool().query(
    "SELECT * FROM rewards WHERE reward_status = 'active' ORDER BY credit_cost ASC, reward_name ASC"
  );

  return {
    totalEcoCredits: profile.totalEcoCredits,
    availableEcoCredits: profile.availableEcoCredits,
    rewards: result.rows.map(normalizeReward).map((reward) => ({
      ...reward,
      redeemed: redeemedRewardIds.has(reward.id),
      affordable: profile.availableEcoCredits >= reward.creditCost
    }))
  };
}

export async function createPlantation(userId: string, input: CreatePlantationInput): Promise<Plantation> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const imageFingerprint = proofFingerprint(input.imageUrl);
    const fraud = await calculateSubmissionFraud(client, {
      userId,
      imageFingerprint,
      latitude: input.latitude,
      longitude: input.longitude
    });
    const result = await client.query(
      `
        INSERT INTO plantations (
          user_id,
          plant_name,
          image_url,
          plantation_date,
          latitude,
          longitude,
          status,
          plantation_status,
          notes,
          image_fingerprint,
          fraud_score,
          fraud_signals,
          owner_name_snapshot,
          owner_email_snapshot
        )
        SELECT $1,
               $2,
               $3,
               $4,
               $5,
               $6,
               'registered',
               'pending',
               NULLIF($7, ''),
               $8,
               $9,
               $10,
               users.name,
               users.email
        FROM users
        WHERE users.id = $1
        RETURNING *
      `,
      [
        userId,
        input.plantName,
        input.imageUrl,
        input.plantationDate,
        input.latitude,
        input.longitude,
        input.notes ?? "",
        imageFingerprint,
        fraud.score,
        fraud.signals
      ]
    );
    const plantation = normalizePlantation(result.rows[0]);

    await awardDbCredits(client, {
      userId,
      plantationId: plantation.id,
      milestone: "Initial Plantation",
      credits: ECO_CREDIT_AWARDS["Initial Plantation"]
    });
    await client.query("COMMIT");

    return plantation;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createProgressUpload(userId: string, input: CreateProgressUploadInput): Promise<ProgressUpload> {
  const creditsAwarded = getMilestoneCredit(input.milestone);

  if (!creditsAwarded) {
    throw new Error("Invalid progress milestone");
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const plantationResult = await client.query("SELECT * FROM plantations WHERE id = $1 AND user_id = $2 LIMIT 1", [
      input.plantationId,
      userId
    ]);
    const plantation = plantationResult.rows[0];

    if (!plantation) {
      throw new Error("Plantation not found");
    }

    const latitude = input.latitude ?? Number(plantation.latitude);
    const longitude = input.longitude ?? Number(plantation.longitude);
    const imageFingerprint = proofFingerprint(input.imageUrl);
    const fraud = await calculateSubmissionFraud(client, {
      userId,
      imageFingerprint,
      latitude,
      longitude
    });
    const uploadResult = await client.query(
      `
        INSERT INTO progress_updates (
          plantation_id,
          user_id,
          image_url,
          milestone,
          latitude,
          longitude,
          notes,
          image_fingerprint,
          progress_status,
          fraud_score,
          fraud_signals
        )
        VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''), $8, 'pending', $9, $10)
        RETURNING *
      `,
      [
        input.plantationId,
        userId,
        input.imageUrl,
        input.milestone,
        latitude,
        longitude,
        input.notes ?? "",
        imageFingerprint,
        fraud.score,
        fraud.signals
      ]
    );
    const progressUpdate = normalizeProgressUpload({
      ...uploadResult.rows[0],
      credits_awarded: creditsAwarded,
      plant_name: plantation.plant_name
    });

    await client.query("UPDATE plantations SET status = $2, updated_at = now() WHERE id = $1", [
      input.plantationId,
      statusForMilestone(input.milestone)
    ]);
    await awardDbCredits(client, {
      userId,
      plantationId: input.plantationId,
      progressUpdateId: progressUpdate.id,
      milestone: input.milestone,
      credits: creditsAwarded
    });
    await client.query("COMMIT");

    return progressUpdate;
  } catch (error) {
    await client.query("ROLLBACK");

    if (error instanceof Error && error.message.includes("duplicate")) {
      throw new Error("Progress milestone already recorded for this plantation");
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function redeemReward(userId: string, rewardId: string): Promise<Redemption> {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const rewardResult = await client.query(
      "SELECT * FROM rewards WHERE id = $1 AND reward_status = 'active' LIMIT 1",
      [rewardId]
    );
    const reward = rewardResult.rows[0] ? normalizeReward(rewardResult.rows[0]) : null;

    if (!reward) {
      throw new Error("Reward not found");
    }

    const duplicateResult = await client.query(
      "SELECT id FROM redemptions WHERE user_id = $1 AND reward_id = $2 LIMIT 1",
      [userId, rewardId]
    );

    if (duplicateResult.rows[0]) {
      throw new Error("Reward already redeemed");
    }

    const redeemedResult = await client.query(
      `
        SELECT COALESCE(SUM(rewards.credit_cost), 0)::int AS redeemed_credits
        FROM redemptions
        JOIN rewards ON rewards.id = redemptions.reward_id
        WHERE redemptions.user_id = $1
          AND redemptions.redemption_status IN ('pending', 'approved')
      `,
      [userId]
    );
    const totalEcoCredits = await getTotalEcoCredits(userId, client);
    const redeemedCredits = Number(redeemedResult.rows[0]?.redeemed_credits ?? 0);
    const availableCredits = Math.max(0, totalEcoCredits - redeemedCredits);

    if (availableCredits < reward.creditCost) {
      throw new Error("Not enough eco credits to redeem this reward");
    }

    const redemptionResult = await client.query(
      `
        INSERT INTO redemptions (user_id, reward_id, redemption_status, credit_cost_snapshot)
        VALUES ($1, $2, 'pending', $3)
        RETURNING id AS redemption_id, user_id, reward_id, redeemed_at
      `,
      [userId, rewardId, reward.creditCost]
    );

    await client.query("COMMIT");

    return normalizeRedemption({
      ...redemptionResult.rows[0],
      ...{
        id: reward.id,
        reward_name: reward.rewardName,
        credit_cost: reward.creditCost,
        description: reward.description
      }
    });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
