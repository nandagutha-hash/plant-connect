import { NextResponse, type NextRequest } from "next/server";
import { createPlant, listPlants } from "@/lib/repository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireDistributorSession } from "@/lib/session";
import { getValidationMessage, plantPayloadSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const distributorId = searchParams.get("distributorId") ?? undefined;
  const plants = await listPlants(distributorId);

  return NextResponse.json({ plants });
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const user = await requireDistributorSession(request);
    const payload = plantPayloadSchema.parse(await request.json());
    const plant = await createPlant({
      ...payload,
      imageUrl: payload.imageUrl || undefined,
      distributorId: user.distributorId
    });

    return NextResponse.json({ plant }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
