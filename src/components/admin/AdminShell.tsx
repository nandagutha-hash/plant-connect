"use client";

import { BarChart3, ClipboardCheck, FileText, Gift, Leaf, Settings, Shield, Store, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/types";

const adminLinks = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/distributors", label: "Distributors", icon: Store },
  { href: "/admin/offices", label: "Offices", icon: Leaf },
  { href: "/admin/plantations", label: "Verification", icon: ClipboardCheck },
  { href: "/admin/rewards", label: "Rewards", icon: Gift },
  { href: "/admin/reports", label: "Reports", icon: FileText },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Settings }
];

export function AdminShell({ children, userRole }: { children: React.ReactNode; userRole: UserRole }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32 text-canopy-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[30px] bg-canopy-950 p-5 text-white shadow-panel md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss">PlantConnect Admin</p>
              <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Secure administration console</h1>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/80 ring-1 ring-white/10">
              {userRole.replace("_", " ")}
            </div>
          </div>
          <nav className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {adminLinks.map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex min-w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active ? "bg-white text-canopy-950" : "bg-white/8 text-white/72 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </section>
        {children}
      </div>
    </div>
  );
}
