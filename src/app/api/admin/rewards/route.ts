import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, createAdminReward, listAdminRewards } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage, rewardPayloadSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireRoutePermission(request, "rewards.manage");
    const rewards = await listAdminRewards();

    return NextResponse.json({ rewards });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "rewards.manage");
    const payload = rewardPayloadSchema.parse(await request.json());
    const reward = await createAdminReward(actorFromUser(actor), payload, payload.reason);

    return NextResponse.json({ reward }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
