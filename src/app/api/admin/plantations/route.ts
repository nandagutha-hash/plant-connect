import { NextResponse, type NextRequest } from "next/server";
import { listPlantationReviews } from "@/lib/adminRepository";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireRoutePermission(request, "plantations.review");
    const submissions = await listPlantationReviews();

    return NextResponse.json({ submissions });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
