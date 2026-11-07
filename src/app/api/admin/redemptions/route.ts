import { NextResponse, type NextRequest } from "next/server";
import { listAdminRedemptions } from "@/lib/adminRepository";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireRoutePermission(request, "redemptions.review");
    const redemptions = await listAdminRedemptions();

    return NextResponse.json({ redemptions });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
