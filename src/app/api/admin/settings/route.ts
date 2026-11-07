import { NextResponse, type NextRequest } from "next/server";
import { actorFromUser, listPlatformSettings, updatePlatformSetting } from "@/lib/adminRepository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireRoutePermission } from "@/lib/session";
import { getValidationMessage, settingPayloadSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireRoutePermission(request, "settings.manage");
    const settings = await listPlatformSettings();

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const actor = await requireRoutePermission(request, "settings.manage");
    const payload = settingPayloadSchema.parse(await request.json());
    const setting = await updatePlatformSetting(actorFromUser(actor), payload.settingKey, payload.settingValue, payload.reason);

    return NextResponse.json({ setting });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
