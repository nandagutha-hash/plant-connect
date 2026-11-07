import { NextResponse, type NextRequest } from "next/server";
import { getEcoProfile, listRewardsForUser } from "@/lib/ecoRepository";
import { requireEcoRequestUser } from "@/lib/ecoSession";
import { authErrorStatus } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const user = await requireEcoRequestUser(request);

    await getEcoProfile(user.id, user);

    const rewardsSummary = await listRewardsForUser(user.id, user);

    return NextResponse.json(rewardsSummary);
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
