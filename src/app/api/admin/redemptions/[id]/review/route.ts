import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, reviewRedemption } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage, redemptionReviewPayloadSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "redemptions.review");
    const { id } = await context.params;
    const payload = redemptionReviewPayloadSchema.parse(await request.json());
    const redemption = await reviewRedemption(actorFromUser(actor), id, payload.status, payload.reason);

    return NextResponse.json({ redemption });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
