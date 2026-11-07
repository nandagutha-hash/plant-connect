import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { findSessionUserById } from "@/lib/repository";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    redirect("/login");
  }

  const tokenUser = await verifySessionToken(token);

  if (!tokenUser) {
    redirect("/login");
  }

  const user = await findSessionUserById(tokenUser.id);

  if (!user || (tokenUser.sessionVersion ?? 0) !== user.sessionVersion) {
    redirect("/login");
  }

  if (user.mustChangePassword) {
    redirect("/change-password");
  }

  if (user.accountStatus !== "active" || !hasPermission(user.role, "admin.access")) {
    redirect("/discover");
  }

  return <AdminShell userRole={user.role}>{children}</AdminShell>;
}
