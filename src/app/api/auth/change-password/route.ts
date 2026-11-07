import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/adminSession";
import { createSessionToken, roleHomePath } from "@/lib/auth";
import { findUserCredentialsById, updateUserPassword } from "@/lib/repository";
import { requireSameOrigin } from "@/lib/requestSecurity";
import { authErrorStatus, setSessionCookie } from "@/lib/session";
import { changePasswordPayloadSchema, getValidationMessage } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    requireSameOrigin(request);
    const currentUser = await getCurrentUser(request);
    const payload = changePasswordPayloadSchema.parse(await request.json());
    const credentials = await findUserCredentialsById(currentUser.id);

    if (!credentials) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(payload.currentPassword, credentials.passwordHash);

    if (!validPassword) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(payload.newPassword, 12);
    const user = await updateUserPassword(currentUser.id, passwordHash);
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
