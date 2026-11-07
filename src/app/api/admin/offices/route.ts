import { NextResponse, type NextRequest } from "next/server";
import { createDfoOffice, listAdminDfoOffices } from "@/lib/repository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, requireAdminSession } from "@/lib/session";
import { dfoOfficePayloadSchema, getValidationMessage } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession(request);
    const offices = await listAdminDfoOffices();

    return NextResponse.json({ offices });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    await requireAdminSession(request);
    const payload = dfoOfficePayloadSchema.parse(await request.json());
    const office = await createDfoOffice(payload);

    return NextResponse.json({ office }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
