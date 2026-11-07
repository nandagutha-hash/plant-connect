import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, updateDistributorStatus } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { distributorStatusPayloadSchema, getValidationMessage } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "distributors.review");
    const { id } = await context.params;
    const payload = distributorStatusPayloadSchema.parse(await request.json());
    const distributor = await updateDistributorStatus(actorFromUser(actor), id, payload.status, payload.reason);

    return NextResponse.json({ distributor });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
