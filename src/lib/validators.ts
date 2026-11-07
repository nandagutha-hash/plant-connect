import { z } from "zod";

export const roleSchema = z.enum(["user", "distributor"]);
export const dfoOfficeTypeSchema = z.enum([
  "DFO Office",
  "Forest Division Office",
  "Nursery",
  "Sapling Distribution Center"
]);
export const dfoOfficeStatusSchema = z.enum(["active", "inactive"]);
export const userAccountStatusSchema = z.enum(["active", "suspended", "banned", "deleted"]);
export const adminRoleSchema = z.enum(["user", "distributor", "admin", "super_admin"]);
export const distributorApprovalStatusSchema = z.enum(["pending", "approved", "rejected", "suspended"]);
export const reviewStatusSchema = z.enum(["pending", "approved", "rejected", "flagged", "under_review"]);
export const rewardStatusSchema = z.enum(["active", "inactive", "deleted"]);
export const redemptionStatusSchema = z.enum(["pending", "approved", "rejected"]);
export const progressMilestoneSchema = z.enum([
  "15-Day Growth Update",
  "30-Day Growth Update",
  "60-Day Growth Update",
  "90-Day Growth Update",
  "Mature Plant Verification"
]);

export const signupPayloadSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters"),
    email: z.email("Enter a valid email").toLowerCase(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    role: roleSchema,
    nurseryName: z.string().trim().optional(),
    address: z.string().trim().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    phone: z.string().trim().optional(),
    hours: z.string().trim().optional(),
    description: z.string().trim().optional()
  })
  .superRefine((value, context) => {
    if (value.role !== "distributor") {
      return;
    }

    const requiredFields: Array<keyof typeof value> = ["nurseryName", "address", "latitude", "longitude", "phone"];

    for (const field of requiredFields) {
      if (value[field] === undefined || value[field] === "") {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Required for distributor accounts"
        });
      }
    }
  });

export const loginPayloadSchema = z.object({
  email: z.email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Password is required")
});

export const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a symbol");

export const changePasswordPayloadSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: strongPasswordSchema
});

export const plantPayloadSchema = z.object({
  commonName: z.string().trim().min(2, "Common name is required"),
  botanicalName: z.string().trim().min(2, "Botanical name is required"),
  category: z.string().trim().min(2, "Category is required"),
  quantity: z.coerce.number().int().min(0, "Quantity cannot be negative"),
  imageUrl: z.string().trim().optional().or(z.literal(""))
});

export const plantPatchSchema = plantPayloadSchema.partial();

export const profilePayloadSchema = z.object({
  name: z.string().trim().min(2).optional(),
  address: z.string().trim().min(4).optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  phone: z.string().trim().min(5).optional(),
  email: z.email().optional().or(z.literal("")),
  hours: z.string().trim().min(2).optional(),
  description: z.string().trim().min(2).optional()
});

export const plantationPayloadSchema = z.object({
  plantName: z.string().trim().min(2, "Plant name is required"),
  imageUrl: z.string().trim().min(8, "Plant photo is required"),
  plantationDate: z.iso.date("Enter a valid plantation date"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  notes: z.string().trim().max(800).optional().or(z.literal(""))
});

export const progressUploadPayloadSchema = z.object({
  plantationId: z.string().trim().min(1, "Plantation is required"),
  imageUrl: z.string().trim().min(8, "Progress photo is required"),
  milestone: progressMilestoneSchema,
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  notes: z.string().trim().max(800).optional().or(z.literal(""))
});

export const dfoOfficePayloadSchema = z.object({
  officeName: z.string().trim().min(2, "Office name is required"),
  officeType: dfoOfficeTypeSchema,
  district: z.string().trim().min(2, "District is required"),
  division: z.string().trim().optional().or(z.literal("")),
  mandal: z.string().trim().optional().or(z.literal("")),
  village: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().min(8, "Verified office address is required"),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  phone: z.string().trim().min(5, "Phone is required"),
  email: z.email().optional().or(z.literal("")),
  verified: z.boolean().default(false),
  saplingDistributionAvailable: z.boolean().default(true),
  status: dfoOfficeStatusSchema.default("active"),
  availableSaplings: z.array(z.string().trim().min(1)).default([]),
  operatingHours: z.string().trim().optional().or(z.literal(""))
});

export const dfoOfficePatchSchema = dfoOfficePayloadSchema.partial();

export const reasonPayloadSchema = z.object({
  reason: z.string().trim().min(2, "Reason is required")
});

export const userStatusPayloadSchema = reasonPayloadSchema.extend({
  status: userAccountStatusSchema
});

export const userRolePayloadSchema = reasonPayloadSchema.extend({
  role: adminRoleSchema
});

export const distributorStatusPayloadSchema = reasonPayloadSchema.extend({
  status: distributorApprovalStatusSchema
});

export const reviewPayloadSchema = z
  .object({
    status: reviewStatusSchema,
    reason: z.string().trim().optional()
  })
  .superRefine((value, context) => {
    if ((value.status === "rejected" || value.status === "flagged") && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Reason is required"
      });
    }
  });

export const rewardPayloadSchema = reasonPayloadSchema.extend({
  rewardName: z.string().trim().min(2, "Reward name is required"),
  creditCost: z.coerce.number().int().positive("Credit cost must be positive"),
  description: z.string().trim().min(2, "Description is required"),
  rewardStatus: rewardStatusSchema.default("active")
});

export const rewardPatchSchema = reasonPayloadSchema.extend({
  rewardName: z.string().trim().min(2).optional(),
  creditCost: z.coerce.number().int().positive().optional(),
  description: z.string().trim().min(2).optional(),
  rewardStatus: rewardStatusSchema.optional()
});

export const redemptionReviewPayloadSchema = z
  .object({
    status: redemptionStatusSchema,
    reason: z.string().trim().optional()
  })
  .superRefine((value, context) => {
    if (value.status === "rejected" && !value.reason) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Reason is required"
      });
    }
  });

export const settingPayloadSchema = reasonPayloadSchema.extend({
  settingKey: z.string().trim().min(2, "Setting key is required"),
  settingValue: z.unknown()
});

export function getValidationMessage(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Invalid request";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Invalid request";
}
