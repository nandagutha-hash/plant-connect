import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, updateUserRole } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage, userRolePayloadSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "admins.manage");
    const { id } = await context.params;
    const payload = userRolePayloadSchema.parse(await request.json());
    const user = await updateUserRole(actorFromUser(actor), id, payload.role, payload.reason);

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
