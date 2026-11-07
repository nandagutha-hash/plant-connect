import { NextResponse, type NextRequest } from "next/server";
import { listAdminDistributors } from "@/lib/adminRepository";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireRoutePermission(request, "distributors.review");
    const { searchParams } = new URL(request.url);
    const distributors = await listAdminDistributors({
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined
    });

    return NextResponse.json({ distributors });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
