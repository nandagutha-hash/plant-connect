import { NextResponse, type NextRequest } from "next/server";
import { getEcoProfile } from "@/lib/ecoRepository";
import { requireEcoRequestUser } from "@/lib/ecoSession";
import { authErrorStatus } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const user = await requireEcoRequestUser(request);
    const profile = await getEcoProfile(user.id, user);

    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
