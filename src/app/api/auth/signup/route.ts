import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, roleHomePath } from "@/lib/auth";
import { createUser } from "@/lib/repository";
import { authErrorStatus, setSessionCookie } from "@/lib/session";
import { getValidationMessage, signupPayloadSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = signupPayloadSchema.parse(await request.json());
    const passwordHash = await bcrypt.hash(payload.password, 12);
    const user = await createUser({
      name: payload.name,
      email: payload.email,
      passwordHash,
      role: payload.role,
      distributor:
        payload.role === "distributor"
          ? {
              name: payload.nurseryName!,
              address: payload.address!,
              latitude: payload.latitude!,
              longitude: payload.longitude!,
              phone: payload.phone!,
              email: payload.email,
              hours: payload.hours,
              description: payload.description
            }
          : undefined
    });
    const token = await createSessionToken(user);
    const response = NextResponse.json({
      user,
      redirectTo: roleHomePath(user.role)
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
