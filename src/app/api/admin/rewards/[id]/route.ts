import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, updateAdminReward } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage, rewardPatchSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "rewards.manage");
    const { id } = await context.params;
    const payload = rewardPatchSchema.parse(await request.json());
    const { reason, ...updates } = payload;
    const reward = await updateAdminReward(actorFromUser(actor), id, updates, reason);

    return NextResponse.json({ reward });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "rewards.manage");
    const { id } = await context.params;
    const payload = rewardPatchSchema.pick({ reason: true }).parse(await request.json());
    const reward = await updateAdminReward(actorFromUser(actor), id, { rewardStatus: "deleted" }, payload.reason);

    return NextResponse.json({ reward });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
