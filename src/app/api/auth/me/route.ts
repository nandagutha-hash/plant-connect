import { NextResponse, type NextRequest } from "next/server";
import { getDistributorProfile } from "@/lib/repository";
import { authErrorStatus, getSessionUser } from "@/lib/session";
import { getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser(request);

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const distributor = user.distributorId ? await getDistributorProfile(user.distributorId) : null;

    return NextResponse.json({ user, distributor });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
