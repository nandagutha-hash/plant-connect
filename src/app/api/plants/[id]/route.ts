import { NextResponse, type NextRequest } from "next/server";
import { updatePlant } from "@/lib/repository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireDistributorSession } from "@/lib/session";
import { getValidationMessage, plantPatchSchema } from "@/lib/validators";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await requireDistributorSession(request);
    const payload = plantPatchSchema.parse(await request.json());
    const { id } = await context.params;
    const plant = await updatePlant(id, user.distributorId, {
      ...payload,
      imageUrl: payload.imageUrl || undefined
    });

    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }

    return NextResponse.json({ plant });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
