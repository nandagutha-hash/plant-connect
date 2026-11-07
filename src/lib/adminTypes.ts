import type { UserRole } from "./types";

export type AdminActor = {
  id: string;
  email: string;
  role: UserRole;
};

export type AuditTargetType =
  | "admin"
  | "dfo_office"
  | "distributor"
  | "plantation"
  | "progress_update"
  | "redemption"
  | "reward"
  | "setting"
  | "user";

export type AuditLogInput = {
  actor: AdminActor;
  targetType: AuditTargetType;
  targetId: string;
  targetUserId?: string | null;
  action: string;
  reason: string;
  metadata?: Record<string, unknown>;
};

export type UserModerationStatus = "active" | "suspended" | "banned" | "deleted";

export type DistributorModerationStatus = "pending" | "approved" | "rejected" | "suspended";

export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged" | "under_review";

export type RewardStatus = "active" | "inactive" | "deleted";

export type RedemptionStatus = "pending" | "approved" | "rejected";

export type AdminOverview = {
  totalUsers: number;
  totalDistributors: number;
  totalOffices: number;
  verifiedOffices: number;
  pendingOffices: number;
  totalPlantations: number;
  pendingReviews: number;
  flaggedReviews: number;
  creditsIssued: number;
  rewardsRedeemed: number;
};
