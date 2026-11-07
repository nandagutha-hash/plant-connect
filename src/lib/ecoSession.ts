import type { NextRequest } from "next/server";
import { requireSessionUser } from "./session";
import type { EcoProfileUser } from "./types";

export async function requireEcoRequestUser(request: NextRequest): Promise<EcoProfileUser> {
  const sessionUser = await requireSessionUser(request);

  return {
    id: sessionUser.id,
    name: sessionUser.name,
    email: sessionUser.email
  };
}
