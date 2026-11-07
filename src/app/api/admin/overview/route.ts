import { NextResponse, type NextRequest } from "next/server";
import { getAdminOverview } from "@/lib/adminRepository";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireRoutePermission(request, "admin.access");
    const overview = await getAdminOverview();

    return NextResponse.json({ overview });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
