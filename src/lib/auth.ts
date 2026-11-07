import { SignJWT, jwtVerify } from "jose";
import type { PublicUser, UserRole } from "./types";

export const SESSION_COOKIE = "plantconnect_session";

const ISSUER = "plantconnect";
const AUDIENCE = "plantconnect-web";

export type SessionUser = PublicUser;

export function roleHomePath(role: UserRole) {
  if (role === "admin" || role === "super_admin") {
    return "/admin";
  }

  return role === "distributor" ? "/dashboard" : "/discover";
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? "plantconnect-development-secret-change-me";
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    name: user.name,
    email: user.email,
    role: user.role,
    distributorId: user.distributorId,
    sessionVersion: user.sessionVersion ?? 0
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE
    });

    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string") {
      return null;
    }

    if (
      payload.role !== "user" &&
      payload.role !== "distributor" &&
      payload.role !== "admin" &&
      payload.role !== "super_admin"
    ) {
      return null;
    }

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      distributorId: typeof payload.distributorId === "string" ? payload.distributorId : undefined,
      sessionVersion: typeof payload.sessionVersion === "number" ? payload.sessionVersion : 0
    };
  } catch {
    return null;
  }
}
