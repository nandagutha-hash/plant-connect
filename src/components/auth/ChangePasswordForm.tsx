"use client";

import { ArrowRight, Leaf, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };

    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Unable to change password");
      return;
    }

    router.push(data.redirectTo ?? "/discover");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] bg-white shadow-panel lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative min-h-[360px] overflow-hidden bg-canopy-950 p-8 text-white md:p-10">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-42"
            style={{ backgroundImage: "url('/images/forest-hero.png')" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#06140f]/92 via-[#06140f]/76 to-[#27834d]/36" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-moss">
                <Leaf size={20} aria-hidden="true" />
              </span>
              PlantConnect
            </Link>
            <div>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">Secure your first login.</h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/72">
                Replace the temporary password before accessing PlantConnect administration or protected account features.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 md:p-10">
          <div>
            <h2 className="text-3xl font-semibold text-canopy-950">Change password</h2>
            <p className="mt-2 text-sm leading-6 text-canopy-900/64">
              Use at least 12 characters with uppercase, lowercase, number, and symbol.
            </p>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-canopy-950">Current password</span>
              <span className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-canopy-900/40" size={18} />
                <input
                  required
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-canopy-900/12 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  placeholder="Temporary password"
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-canopy-950">New password</span>
              <span className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-canopy-900/40" size={18} />
                <input
                  required
                  type="password"
                  minLength={12}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-canopy-900/12 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  placeholder="NewPassword@2026"
                />
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
