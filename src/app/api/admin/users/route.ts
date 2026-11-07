import { NextResponse, type NextRequest } from "next/server";
import { listAdminUsers } from "@/lib/adminRepository";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireRoutePermission(request, "users.read");
    const { searchParams } = new URL(request.url);
    const users = await listAdminUsers({
      search: searchParams.get("search") ?? undefined,
      role: searchParams.get("role") ?? undefined,
      status: searchParams.get("status") ?? undefined
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
