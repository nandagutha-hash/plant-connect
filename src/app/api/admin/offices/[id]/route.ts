import { NextResponse, type NextRequest } from "next/server";
import { deleteDfoOffice, updateDfoOffice } from "@/lib/repository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireAdminSession } from "@/lib/session";
import { dfoOfficePatchSchema, getValidationMessage } from "@/lib/validators";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    await requireAdminSession(request);
    const { id } = await context.params;
    const payload = dfoOfficePatchSchema.parse(await request.json());
    const office = await updateDfoOffice(id, payload);

    if (!office) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }

    return NextResponse.json({ office });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    requireSameOrigin(request);
    await requireAdminSession(request);
    const { id } = await context.params;
    const deleted = await deleteDfoOffice(id);

    if (!deleted) {
      return NextResponse.json({ error: "Office not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
