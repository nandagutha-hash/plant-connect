import { NextResponse, type NextRequest } from "next/server";
import { createPlantation, getEcoProfile } from "@/lib/ecoRepository";
import { requireEcoRequestUser } from "@/lib/ecoSession";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus } from "@/lib/session";
import { getValidationMessage, plantationPayloadSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const user = await requireEcoRequestUser(request);
    const payload = plantationPayloadSchema.parse(await request.json());
    const plantation = await createPlantation(user.id, payload);
    const profile = await getEcoProfile(user.id, user);

    return NextResponse.json({ plantation, profile }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
