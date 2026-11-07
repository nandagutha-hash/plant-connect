import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, listAuditLogs } from "@/lib/adminRepository";
import { hasPermission } from "@/lib/permissions";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const user = await requireRoutePermission(request, "admin.access");
    const logs = await listAuditLogs(actorFromUser(user), hasPermission(user.role, "audit.read_all"));

    return NextResponse.json({ logs });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
