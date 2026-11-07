import type { PoolClient } from "pg";
import { randomUUID } from "crypto";
import { getPool } from "./db";
import { getEcoLevel } from "./ecoCredits";
import type {
  AdminActor,
  AdminOverview,
  AuditLogInput,
  DistributorModerationStatus,
  RedemptionStatus,
  ReviewStatus,
  RewardStatus,
  UserModerationStatus
} from "./adminTypes";
import type { SessionDatabaseUser, UserRole } from "./types";

type TransactionClient = Pick<PoolClient, "query" | "release">;

type QueryClient = Pick<PoolClient, "query"> | ReturnType<typeof getPool>;

type ListFilters = {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
};

const reviewStatuses = new Set<ReviewStatus>(["pending", "approved", "rejected", "flagged", "under_review"]);
const userStatuses = new Set<UserModerationStatus>(["active", "suspended", "banned", "deleted"]);
const distributorStatuses = new Set<DistributorModerationStatus>(["pending", "approved", "rejected", "suspended"]);
const rewardStatuses = new Set<RewardStatus>(["active", "inactive", "deleted"]);
const redemptionStatuses = new Set<RedemptionStatus>(["pending", "approved", "rejected"]);

function integer(value: unknown) {
  return Number(value ?? 0);
}

function requireReason(reason?: string) {
  const normalized = reason?.trim() ?? "";

  if (!normalized) {
    throw new Error("Reason is required");
  }

  return normalized;
}

function requireReviewReason(status: ReviewStatus | RedemptionStatus | DistributorModerationStatus, reason?: string) {
  if (status === "rejected" || status === "flagged" || status === "suspended") {
    return requireReason(reason);
  }

  return reason?.trim() || `Status changed to ${status}`;
}

async function syncApprovedCreditCache(client: TransactionClient, userId: string | null | undefined) {
  if (!userId) {
    return;
  }

  const result = await client.query(
    `
      SELECT COALESCE(SUM(credits), 0)::int AS total_eco_credits
      FROM eco_credits
      WHERE user_id = $1
        AND credit_status = 'approved'
    `,
    [userId]
  );
  const totalEcoCredits = integer(result.rows[0]?.total_eco_credits);

  await client.query(
    `
      UPDATE users
      SET total_eco_credits = $2,
          level = $3,
          updated_at = now()
      WHERE id = $1
    `,
    [userId, totalEcoCredits, getEcoLevel(totalEcoCredits)]
  );
}

export function actorFromUser(user: Pick<SessionDatabaseUser, "id" | "email" | "role">): AdminActor {
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
}

export async function withAdminTransaction<T>(
  work: (client: TransactionClient) => Promise<T>,
  injectedClient?: TransactionClient
): Promise<T> {
  const client = injectedClient ?? (await getPool().connect());

  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");

    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function appendAuditLog(client: TransactionClient, input: AuditLogInput) {
  const reason = input.reason.trim();

  if (!reason) {
    throw new Error("Audit reason is required");
  }

  await client.query(
    `
      INSERT INTO audit_logs (
        actor_id,
        actor_email,
        actor_role,
        target_user_id,
        target_type,
        target_id,
        action_type,
        reason,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      input.actor.id,
      input.actor.email,
      input.actor.role,
      input.targetUserId ?? null,
      input.targetType,
      input.targetId,
      input.action,
      reason,
      input.metadata ?? {}
    ]
  );
}

export async function getAdminOverview(client: QueryClient = getPool()): Promise<AdminOverview> {
  const result = await client.query(
    `
      SELECT
        (SELECT COUNT(*) FROM users WHERE COALESCE(account_status, 'active') <> 'deleted')::int AS total_users,
        (SELECT COUNT(*) FROM distributors)::int AS total_distributors,
        (SELECT COUNT(*) FROM dfo_offices WHERE deleted_at IS NULL)::int AS total_offices,
        (SELECT COUNT(*) FROM dfo_offices WHERE office_status = 'verified' AND deleted_at IS NULL)::int AS verified_offices,
        (SELECT COUNT(*) FROM dfo_offices WHERE office_status = 'pending' AND deleted_at IS NULL)::int AS pending_offices,
        (SELECT COUNT(*) FROM plantations WHERE deleted_at IS NULL)::int AS total_plantations,
        (
          (SELECT COUNT(*) FROM plantations WHERE plantation_status = 'pending' AND deleted_at IS NULL) +
          (SELECT COUNT(*) FROM progress_updates WHERE progress_status = 'pending' AND deleted_at IS NULL)
        )::int AS pending_reviews,
        (
          (SELECT COUNT(*) FROM plantations WHERE plantation_status = 'flagged' AND deleted_at IS NULL) +
          (SELECT COUNT(*) FROM progress_updates WHERE progress_status = 'flagged' AND deleted_at IS NULL)
        )::int AS flagged_reviews,
        (SELECT COALESCE(SUM(credits), 0) FROM eco_credits WHERE credit_status = 'approved')::int AS credits_issued,
        (SELECT COUNT(*) FROM redemptions WHERE redemption_status = 'approved')::int AS rewards_redeemed
    `
  );
  const row = result.rows[0] ?? {};

  return {
    totalUsers: integer(row.total_users),
    totalDistributors: integer(row.total_distributors),
    totalOffices: integer(row.total_offices),
    verifiedOffices: integer(row.verified_offices),
    pendingOffices: integer(row.pending_offices),
    totalPlantations: integer(row.total_plantations),
    pendingReviews: integer(row.pending_reviews),
    flaggedReviews: integer(row.flagged_reviews),
    creditsIssued: integer(row.credits_issued),
    rewardsRedeemed: integer(row.rewards_redeemed)
  };
}

export async function listAdminUsers(filters: ListFilters = {}, client: QueryClient = getPool()) {
  const values: unknown[] = [];
  const clauses = ["1 = 1"];

  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim()}%`);
    clauses.push(`(users.name ILIKE $${values.length} OR users.email ILIKE $${values.length})`);
  }

  if (filters.role) {
    values.push(filters.role);
    clauses.push(`users.role = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    clauses.push(`COALESCE(users.account_status, 'active') = $${values.length}`);
  }

  values.push(Math.min(Math.max(filters.limit ?? 50, 1), 100));

  const result = await client.query(
    `
      SELECT users.id,
             users.name,
             users.email,
             users.role,
             COALESCE(users.account_status, 'active') AS account_status,
             COALESCE(users.must_change_password, false) AS must_change_password,
             COALESCE(users.session_version, 0)::int AS session_version,
             users.created_at,
             users.deleted_at,
             COUNT(DISTINCT plantations.id)::int AS plantation_count,
             COUNT(DISTINCT redemptions.id)::int AS redemption_count,
             (
               SELECT COALESCE(SUM(credits), 0)::int
               FROM eco_credits
               WHERE eco_credits.user_id = users.id
                 AND eco_credits.credit_status = 'approved'
             ) AS approved_credits
      FROM users
      LEFT JOIN plantations ON plantations.user_id = users.id
      LEFT JOIN redemptions ON redemptions.user_id = users.id
      WHERE ${clauses.join(" AND ")}
      GROUP BY users.id
      ORDER BY users.created_at DESC
      LIMIT $${values.length}
    `,
    values
  );

  return result.rows;
}

export async function updateUserStatus(actor: AdminActor, targetUserId: string, status: UserModerationStatus, reason?: string) {
  if (!userStatuses.has(status)) {
    throw new Error("Invalid user status");
  }

  const normalizedReason = requireReason(reason);

  return withAdminTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE users
        SET account_status = $2,
            moderation_reason = $3,
            moderated_by = $4,
            moderated_at = now(),
            deleted_at = CASE WHEN $2 = 'deleted' THEN now() ELSE NULL END,
            session_version = COALESCE(session_version, 0) + 1,
            updated_at = now()
        WHERE id = $1
        RETURNING id, name, email, role, account_status, must_change_password, session_version, deleted_at
      `,
      [targetUserId, status, normalizedReason, actor.id]
    );
    const user = result.rows[0];

    if (!user) {
      throw new Error("User not found");
    }

    await appendAuditLog(client, {
      actor,
      targetType: "user",
      targetId: targetUserId,
      targetUserId,
      action: `user.${status}`,
      reason: normalizedReason,
      metadata: { status }
    });

    return user;
  });
}

export async function updateUserRole(actor: AdminActor, targetUserId: string, role: UserRole, reason?: string) {
  const normalizedReason = requireReason(reason);

  return withAdminTransaction(async (client) => {
    if (role !== "super_admin") {
      const current = await client.query("SELECT role FROM users WHERE id = $1 LIMIT 1", [targetUserId]);
      if (current.rows[0]?.role === "super_admin") {
        const count = await client.query(
          "SELECT COUNT(*)::int AS count FROM users WHERE role = 'super_admin' AND account_status = 'active' AND id <> $1",
          [targetUserId]
        );

        if (integer(count.rows[0]?.count) < 1) {
          throw new Error("Cannot remove the last active super admin");
        }
      }
    }

    const result = await client.query(
      `
        UPDATE users
        SET role = $2,
            moderation_reason = $3,
            moderated_by = $4,
            moderated_at = now(),
            session_version = COALESCE(session_version, 0) + 1,
            updated_at = now()
        WHERE id = $1
        RETURNING id, name, email, role, account_status, must_change_password, session_version
      `,
      [targetUserId, role, normalizedReason, actor.id]
    );
    const user = result.rows[0];

    if (!user) {
      throw new Error("User not found");
    }

    await appendAuditLog(client, {
      actor,
      targetType: "user",
      targetId: targetUserId,
      targetUserId,
      action: "user.role_update",
      reason: normalizedReason,
      metadata: { role }
    });

    return user;
  });
}

export async function listAdminDistributors(filters: ListFilters = {}, client: QueryClient = getPool()) {
  const values: unknown[] = [];
  const clauses = ["1 = 1"];

  if (filters.search?.trim()) {
    values.push(`%${filters.search.trim()}%`);
    clauses.push(`(distributors.name ILIKE $${values.length} OR distributors.address ILIKE $${values.length})`);
  }

  if (filters.status) {
    values.push(filters.status);
    clauses.push(`distributors.approval_status = $${values.length}`);
  }

  values.push(Math.min(Math.max(filters.limit ?? 50, 1), 100));

  const result = await client.query(
    `
      SELECT distributors.*,
             users.email AS user_email,
             users.name AS user_name,
             COUNT(plants.id)::int AS plant_count,
             COALESCE(SUM(plants.quantity), 0)::int AS available_plants
      FROM distributors
      LEFT JOIN users ON users.id = distributors.user_id
      LEFT JOIN plants ON plants.distributor_id = distributors.id
      WHERE ${clauses.join(" AND ")}
      GROUP BY distributors.id, users.email, users.name
      ORDER BY distributors.created_at DESC
      LIMIT $${values.length}
    `,
    values
  );

  return result.rows;
}

export async function updateDistributorStatus(
  actor: AdminActor,
  distributorId: string,
  status: DistributorModerationStatus,
  reason?: string
) {
  if (!distributorStatuses.has(status)) {
    throw new Error("Invalid distributor status");
  }

  const normalizedReason = requireReviewReason(status, reason);

  return withAdminTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE distributors
        SET approval_status = $2,
            review_reason = $3,
            reviewed_by = $4,
            reviewed_at = now(),
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [distributorId, status, normalizedReason, actor.id]
    );
    const distributor = result.rows[0];

    if (!distributor) {
      throw new Error("Distributor not found");
    }

    if (distributor.user_id) {
      await client.query("UPDATE users SET session_version = COALESCE(session_version, 0) + 1 WHERE id = $1", [
        distributor.user_id
      ]);
    }

    await appendAuditLog(client, {
      actor,
      targetType: "distributor",
      targetId: distributorId,
      targetUserId: distributor.user_id ?? null,
      action: `distributor.${status}`,
      reason: normalizedReason,
      metadata: { status }
    });

    return distributor;
  });
}

async function readDailyCreditLimit(client: QueryClient) {
  const result = await client.query(
    "SELECT setting_value FROM platform_settings WHERE setting_key = 'daily_credit_limit' LIMIT 1"
  );
  const raw = result.rows[0]?.setting_value;

  return typeof raw === "number" ? raw : Number(raw ?? 500);
}

async function approvePendingCredits(
  client: TransactionClient,
  actor: AdminActor,
  target: { userId: string | null; plantationId?: string; progressUpdateId?: string },
  reason: string
) {
  if (!target.userId) {
    return;
  }

  const selector = target.progressUpdateId
    ? "progress_update_id = $2"
    : target.plantationId
      ? "plantation_id = $2"
      : "FALSE";
  const selectorId = target.progressUpdateId ?? target.plantationId;

  const creditRows = await client.query(
    `
      SELECT id, credits
      FROM eco_credits
      WHERE user_id = $1
        AND ${selector}
        AND credit_status = 'pending'
      FOR UPDATE
    `,
    [target.userId, selectorId]
  );
  const creditsToApprove = creditRows.rows.reduce((sum, row) => sum + integer(row.credits), 0);

  if (creditsToApprove <= 0) {
    return;
  }

  const dailyLimit = await readDailyCreditLimit(client);
  const approvedToday = await client.query(
    `
      SELECT COALESCE(SUM(credits), 0)::int AS approved_today
      FROM eco_credits
      WHERE user_id = $1
        AND credit_status = 'approved'
        AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
        AND created_at < date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'
    `,
    [target.userId]
  );

  if (integer(approvedToday.rows[0]?.approved_today) + creditsToApprove > dailyLimit) {
    throw new Error("Daily credit limit exceeded");
  }

  await client.query(
    `
      UPDATE eco_credits
      SET credit_status = 'approved',
          reviewed_by = $3,
          reviewed_at = now(),
          review_reason = $4
      WHERE user_id = $1
        AND ${selector}
        AND credit_status = 'pending'
    `,
    [target.userId, selectorId, actor.id, reason]
  );

  await syncApprovedCreditCache(client, target.userId);
}

async function updateSubmissionCredits(
  client: TransactionClient,
  actor: AdminActor,
  kind: "plantation" | "progress_update",
  id: string,
  status: ReviewStatus,
  reason: string,
  row: Record<string, unknown>
) {
  const target = {
    userId: row.user_id ? String(row.user_id) : null,
    plantationId: kind === "plantation" ? id : undefined,
    progressUpdateId: kind === "progress_update" ? id : undefined
  };

  if (status === "approved") {
    await approvePendingCredits(client, actor, target, reason);
  } else if (status === "rejected") {
    const selector = kind === "plantation" ? "plantation_id = $2" : "progress_update_id = $2";
    await client.query(
      `
        UPDATE eco_credits
        SET credit_status = 'rejected',
            reviewed_by = $3,
            reviewed_at = now(),
            review_reason = $4
        WHERE user_id = $1
          AND ${selector}
          AND credit_status = 'pending'
      `,
      [target.userId, id, actor.id, reason]
    );
    await syncApprovedCreditCache(client, target.userId);
  }
}

export async function listPlantationReviews(client: QueryClient = getPool()) {
  const result = await client.query(
    `
      SELECT 'plantation' AS submission_type,
             plantations.id,
             plantations.user_id,
             users.name AS user_name,
             users.email AS user_email,
             plantations.plant_name,
             plantations.image_url,
             plantations.latitude,
             plantations.longitude,
             plantations.plantation_date AS submitted_at,
             plantations.plantation_status AS status,
             plantations.fraud_score,
             plantations.fraud_signals,
             plantations.notes,
             plantations.review_reason
      FROM plantations
      LEFT JOIN users ON users.id = plantations.user_id
      WHERE plantations.deleted_at IS NULL
      UNION ALL
      SELECT 'progress_update' AS submission_type,
             progress_updates.id,
             progress_updates.user_id,
             users.name AS user_name,
             users.email AS user_email,
             progress_updates.milestone AS plant_name,
             progress_updates.image_url,
             progress_updates.latitude,
             progress_updates.longitude,
             progress_updates.uploaded_at AS submitted_at,
             progress_updates.progress_status AS status,
             progress_updates.fraud_score,
             progress_updates.fraud_signals,
             progress_updates.notes,
             progress_updates.review_reason
      FROM progress_updates
      LEFT JOIN users ON users.id = progress_updates.user_id
      WHERE progress_updates.deleted_at IS NULL
      ORDER BY submitted_at DESC
      LIMIT 100
    `
  );

  return result.rows;
}

export async function reviewPlantationSubmission(actor: AdminActor, id: string, status: ReviewStatus, reason?: string) {
  if (!reviewStatuses.has(status)) {
    throw new Error("Invalid review status");
  }

  const normalizedReason = requireReviewReason(status, reason);

  return withAdminTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE plantations
        SET plantation_status = $2,
            reviewed_by = $3,
            reviewed_at = now(),
            review_reason = $4,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [id, status, actor.id, normalizedReason]
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("Plantation not found");
    }

    await updateSubmissionCredits(client, actor, "plantation", id, status, normalizedReason, row);
    await appendAuditLog(client, {
      actor,
      targetType: "plantation",
      targetId: id,
      targetUserId: row.user_id ?? null,
      action: `plantation.${status}`,
      reason: normalizedReason,
      metadata: { status, fraudScore: row.fraud_score, fraudSignals: row.fraud_signals }
    });

    return row;
  });
}

export async function reviewProgressSubmission(actor: AdminActor, id: string, status: ReviewStatus, reason?: string) {
  if (!reviewStatuses.has(status)) {
    throw new Error("Invalid review status");
  }

  const normalizedReason = requireReviewReason(status, reason);

  return withAdminTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE progress_updates
        SET progress_status = $2,
            reviewed_by = $3,
            reviewed_at = now(),
            review_reason = $4
        WHERE id = $1
        RETURNING *
      `,
      [id, status, actor.id, normalizedReason]
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("Progress update not found");
    }

    await updateSubmissionCredits(client, actor, "progress_update", id, status, normalizedReason, row);
    await appendAuditLog(client, {
      actor,
      targetType: "progress_update",
      targetId: id,
      targetUserId: row.user_id ?? null,
      action: `progress_update.${status}`,
      reason: normalizedReason,
      metadata: { status, fraudScore: row.fraud_score, fraudSignals: row.fraud_signals }
    });

    return row;
  });
}

export async function listAdminRewards(client: QueryClient = getPool()) {
  const result = await client.query("SELECT * FROM rewards ORDER BY created_at DESC");
  return result.rows;
}

export async function createAdminReward(
  actor: AdminActor,
  input: { rewardName: string; creditCost: number; description: string; rewardStatus?: RewardStatus },
  reason = "Reward created"
) {
  const normalizedReason = requireReason(reason);
  const rewardStatus = input.rewardStatus ?? "active";

  if (!rewardStatuses.has(rewardStatus)) {
    throw new Error("Invalid reward status");
  }

  return withAdminTransaction(async (client) => {
    const id = randomUUID();
    const result = await client.query(
      `
        INSERT INTO rewards (id, reward_name, credit_cost, description, reward_status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [id, input.rewardName, input.creditCost, input.description, rewardStatus]
    );

    await appendAuditLog(client, {
      actor,
      targetType: "reward",
      targetId: id,
      action: "reward.create",
      reason: normalizedReason,
      metadata: { rewardStatus, creditCost: input.creditCost }
    });

    return result.rows[0];
  });
}

export async function updateAdminReward(
  actor: AdminActor,
  rewardId: string,
  input: Partial<{ rewardName: string; creditCost: number; description: string; rewardStatus: RewardStatus }>,
  reason?: string
) {
  const normalizedReason = requireReason(reason);

  if (input.rewardStatus && !rewardStatuses.has(input.rewardStatus)) {
    throw new Error("Invalid reward status");
  }

  return withAdminTransaction(async (client) => {
    const current = await client.query("SELECT * FROM rewards WHERE id = $1 LIMIT 1", [rewardId]);

    if (!current.rows[0]) {
      throw new Error("Reward not found");
    }

    const next = {
      rewardName: input.rewardName ?? current.rows[0].reward_name,
      creditCost: input.creditCost ?? current.rows[0].credit_cost,
      description: input.description ?? current.rows[0].description,
      rewardStatus: input.rewardStatus ?? current.rows[0].reward_status
    };
    const result = await client.query(
      `
        UPDATE rewards
        SET reward_name = $2,
            credit_cost = $3,
            description = $4,
            reward_status = $5,
            deleted_at = CASE WHEN $5 = 'deleted' THEN now() ELSE deleted_at END,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [rewardId, next.rewardName, next.creditCost, next.description, next.rewardStatus]
    );

    await appendAuditLog(client, {
      actor,
      targetType: "reward",
      targetId: rewardId,
      action: "reward.update",
      reason: normalizedReason,
      metadata: next
    });

    return result.rows[0];
  });
}

export async function listAdminRedemptions(client: QueryClient = getPool()) {
  const result = await client.query(
    `
      SELECT redemptions.*,
             users.name AS user_name,
             users.email AS user_email,
             rewards.reward_name,
             rewards.credit_cost
      FROM redemptions
      LEFT JOIN users ON users.id = redemptions.user_id
      JOIN rewards ON rewards.id = redemptions.reward_id
      ORDER BY redemptions.redeemed_at DESC
      LIMIT 100
    `
  );

  return result.rows;
}

export async function reviewRedemption(actor: AdminActor, redemptionId: string, status: RedemptionStatus, reason?: string) {
  if (!redemptionStatuses.has(status)) {
    throw new Error("Invalid redemption status");
  }

  const normalizedReason = requireReviewReason(status, reason);

  return withAdminTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE redemptions
        SET redemption_status = $2,
            reviewed_by = $3,
            reviewed_at = now(),
            review_reason = $4
        WHERE id = $1
        RETURNING *
      `,
      [redemptionId, status, actor.id, normalizedReason]
    );
    const row = result.rows[0];

    if (!row) {
      throw new Error("Redemption not found");
    }

    await appendAuditLog(client, {
      actor,
      targetType: "redemption",
      targetId: redemptionId,
      targetUserId: row.user_id ?? null,
      action: `redemption.${status}`,
      reason: normalizedReason,
      metadata: { status }
    });

    return row;
  });
}

export async function listAuditLogs(actor: AdminActor, showAll: boolean, client: QueryClient = getPool()) {
  const result = await client.query(
    `
      SELECT *
      FROM audit_logs
      WHERE ($1::boolean = true OR actor_id = $2)
      ORDER BY created_at DESC
      LIMIT 200
    `,
    [showAll, actor.id]
  );

  return result.rows;
}

export async function listPlatformSettings(client: QueryClient = getPool()) {
  const result = await client.query("SELECT * FROM platform_settings ORDER BY setting_key ASC");
  return result.rows;
}

export async function updatePlatformSetting(actor: AdminActor, settingKey: string, settingValue: unknown, reason?: string) {
  const normalizedReason = requireReason(reason);

  return withAdminTransaction(async (client) => {
    const result = await client.query(
      `
        UPDATE platform_settings
        SET setting_value = $2,
            updated_by = $3,
            updated_at = now()
        WHERE setting_key = $1
        RETURNING *
      `,
      [settingKey, JSON.stringify(settingValue), actor.id]
    );

    if (!result.rows[0]) {
      throw new Error("Setting not found");
    }

    await appendAuditLog(client, {
      actor,
      targetType: "setting",
      targetId: settingKey,
      action: "setting.update",
      reason: normalizedReason,
      metadata: { settingKey }
    });

    return result.rows[0];
  });
}
