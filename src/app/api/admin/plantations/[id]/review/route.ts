import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, reviewPlantationSubmission } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage, reviewPayloadSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "plantations.review");
    const { id } = await context.params;
    const payload = reviewPayloadSchema.parse(await request.json());
    const submission = await reviewPlantationSubmission(actorFromUser(actor), id, payload.status, payload.reason);

    return NextResponse.json({ submission });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
