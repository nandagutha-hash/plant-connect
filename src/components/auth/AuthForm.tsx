"use client";

import { ArrowRight, Building2, Leaf, Lock, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { UserRole } from "@/lib/types";

type AuthFormProps = {
  mode: "login" | "signup";
};

type AuthState = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  nurseryName: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  hours: string;
  description: string;
};

const initialState: AuthState = {
  name: "",
  email: "",
  password: "",
  role: "user",
  nurseryName: "",
  address: "",
  latitude: "12.9716",
  longitude: "77.5946",
  phone: "",
  hours: "Mon-Fri, 9:00 AM-5:00 PM",
  description: ""
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<AuthState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";

  function updateField(name: keyof AuthState, value: string) {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const payload = isSignup
      ? {
          ...form,
          latitude: Number(form.latitude),
          longitude: Number(form.longitude)
        }
      : {
          email: form.email,
          password: form.password
        };

    const response = await fetch(`/api/auth/${isSignup ? "signup" : "login"}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = (await response.json()) as { error?: string; redirectTo?: string };

    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }

    router.push(data.redirectTo ?? "/discover");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-panel lg:grid-cols-[0.9fr_1.1fr]">
        <div className="relative min-h-[360px] overflow-hidden bg-canopy-950 p-8 text-white md:p-10">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-42"
            style={{ backgroundImage: "url('/images/forest-hero.png')" }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#06140f]/90 via-[#06140f]/74 to-[#27834d]/38" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-10">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-moss">
                <Leaf size={20} aria-hidden="true" />
              </span>
              PlantConnect
            </Link>
            <div>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                {isSignup ? "Join the public greening network." : "Welcome back to PlantConnect."}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/72">
                {isSignup
                  ? "Create a user account to discover saplings, or register a distributor profile to publish live inventory."
                  : "Access discovery tools or manage distributor availability with a secure role-based session."}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className="p-6 md:p-10">
          <div>
            <h2 className="text-3xl font-semibold text-canopy-950">{isSignup ? "Create account" : "Log in"}</h2>
            <p className="mt-2 text-sm leading-6 text-canopy-900/64">
              {isSignup ? "Choose your role and add the details needed for your account." : "Use the account you created in this app."}
            </p>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4">
            {isSignup ? (
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-canopy-950">Full name</span>
                <span className="relative">
                  <UserRound className="absolute left-4 top-1/2 -translate-y-1/2 text-canopy-900/40" size={18} />
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="h-12 w-full rounded-2xl border border-canopy-900/12 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    placeholder="Asha Rao"
                  />
                </span>
              </label>
            ) : null}

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-canopy-950">Email</span>
              <span className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-canopy-900/40" size={18} />
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="h-12 w-full rounded-2xl border border-canopy-900/12 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  placeholder="you@example.com"
                />
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-semibold text-canopy-950">Password</span>
              <span className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-canopy-900/40" size={18} />
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  className="h-12 w-full rounded-2xl border border-canopy-900/12 bg-white pl-12 pr-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  placeholder="At least 8 characters"
                />
              </span>
            </label>

            {isSignup ? (
              <>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-canopy-950">Role</span>
                  <select
                    value={form.role}
                    onChange={(event) => updateField("role", event.target.value as UserRole)}
                    className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  >
                    <option value="user">User</option>
                    <option value="distributor">Distributor</option>
                  </select>
                </label>

                {form.role === "distributor" ? (
                  <div className="grid gap-4 rounded-3xl bg-canopy-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-canopy-950">
                      <Building2 size={18} aria-hidden="true" />
                      Distributor profile
                    </div>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-canopy-950">Nursery name</span>
                      <input
                        required
                        value={form.nurseryName}
                        onChange={(event) => updateField("nurseryName", event.target.value)}
                        className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                        placeholder="East Range Forest Nursery"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-canopy-950">Address</span>
                      <input
                        required
                        value={form.address}
                        onChange={(event) => updateField("address", event.target.value)}
                        className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                        placeholder="Forest Department Road"
                      />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-canopy-950">Latitude</span>
                        <input
                          required
                          type="number"
                          step="0.0001"
                          value={form.latitude}
                          onChange={(event) => updateField("latitude", event.target.value)}
                          className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-canopy-950">Longitude</span>
                        <input
                          required
                          type="number"
                          step="0.0001"
                          value={form.longitude}
                          onChange={(event) => updateField("longitude", event.target.value)}
                          className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                        />
                      </label>
                    </div>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-canopy-950">Phone</span>
                      <input
                        required
                        value={form.phone}
                        onChange={(event) => updateField("phone", event.target.value)}
                        className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                        placeholder="+91 80 0000 0000"
                      />
                    </label>
                    <label className="grid gap-2">
                      <span className="text-sm font-semibold text-canopy-950">Hours</span>
                      <input
                        value={form.hours}
                        onChange={(event) => updateField("hours", event.target.value)}
                        className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none transition focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                      />
                    </label>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : isSignup ? "Create account" : "Log in"}
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <p className="mt-6 text-center text-sm text-canopy-900/62">
            {isSignup ? "Already registered?" : "New to PlantConnect?"}{" "}
            <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-canopy-700 hover:text-canopy-900">
              {isSignup ? "Log in" : "Create an account"}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
