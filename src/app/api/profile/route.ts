import { NextResponse, type NextRequest } from "next/server";
import { updateDistributorProfile } from "@/lib/repository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireDistributorSession } from "@/lib/session";
import { getValidationMessage, profilePayloadSchema } from "@/lib/validators";

export async function PUT(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const user = await requireDistributorSession(request);
    const payload = profilePayloadSchema.parse(await request.json());
    const distributor = await updateDistributorProfile(user.distributorId, {
      ...payload,
      email: payload.email || undefined
    });

    if (!distributor) {
      return NextResponse.json({ error: "Distributor profile not found" }, { status: 404 });
    }

    return NextResponse.json({ distributor });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
