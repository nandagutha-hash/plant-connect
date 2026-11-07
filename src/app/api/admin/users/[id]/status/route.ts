import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, updateUserStatus } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage, userStatusPayloadSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "users.moderate");
    const { id } = await context.params;
    const payload = userStatusPayloadSchema.parse(await request.json());
    const user = await updateUserStatus(actorFromUser(actor), id, payload.status, payload.reason);

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
