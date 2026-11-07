import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { createSessionToken, roleHomePath } from "@/lib/auth";
import { findUserByEmail } from "@/lib/repository";
import { authErrorStatus, setSessionCookie } from "@/lib/session";
import { getValidationMessage, loginPayloadSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const payload = loginPayloadSchema.parse(await request.json());
    const user = await findUserByEmail(payload.email);

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(payload.password, user.passwordHash);

    if (!validPassword) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.accountStatus === "suspended" || user.accountStatus === "banned" || user.accountStatus === "deleted") {
      return NextResponse.json({ error: `Account ${user.accountStatus}` }, { status: 403 });
    }

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      distributorId: user.distributorId,
      accountStatus: user.accountStatus,
      mustChangePassword: user.mustChangePassword,
      sessionVersion: user.sessionVersion,
      distributorApprovalStatus: user.distributorApprovalStatus
    };
    const token = await createSessionToken(publicUser);
    const response = NextResponse.json({
      user: publicUser,
      redirectTo: user.mustChangePassword ? "/change-password" : roleHomePath(user.role)
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return NextResponse.json({ error: getValidationMessage(error) }, { status: authErrorStatus(error) });
  }
}
