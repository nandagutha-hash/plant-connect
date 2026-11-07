import { NextResponse, type NextRequest } from "next/server";
import { getEcoProfile, listRewardsForUser, redeemReward } from "@/lib/ecoRepository";
import { requireEcoRequestUser } from "@/lib/ecoSession";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    const user = await requireEcoRequestUser(request);
    const { id } = await context.params;
    const redemption = await redeemReward(user.id, id);
    const profile = await getEcoProfile(user.id, user);
    const rewardsSummary = await listRewardsForUser(user.id, user);

    return NextResponse.json({ redemption, profile, ...rewardsSummary }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
