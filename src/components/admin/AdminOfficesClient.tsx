"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit3,
  LocateFixed,
  ShieldCheck,
  Trash2,
  X
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { DfoOffice, DfoOfficeInput, DfoOfficeType } from "@/lib/types";

type OfficeFormState = {
  officeName: string;
  officeType: DfoOfficeType;
  district: string;
  division: string;
  mandal: string;
  village: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  verified: boolean;
  saplingDistributionAvailable: boolean;
  status: "active" | "inactive";
  operatingHours: string;
};

const officeTypes: DfoOfficeType[] = [
  "DFO Office",
  "Forest Division Office",
  "Nursery",
  "Sapling Distribution Center"
];

const emptyForm: OfficeFormState = {
  officeName: "",
  officeType: "DFO Office",
  district: "",
  division: "",
  mandal: "",
  village: "",
  address: "",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
  verified: false,
  saplingDistributionAvailable: true,
  status: "active",
  operatingHours: ""
};

function officeToForm(office: DfoOffice): OfficeFormState {
  return {
    officeName: office.officeName,
    officeType: office.officeType,
    district: office.district,
    division: office.division,
    mandal: office.mandal,
    village: office.village,
    address: office.address,
    latitude: String(office.latitude),
    longitude: String(office.longitude),
    phone: office.phone,
    email: office.email,
    verified: office.verified,
    saplingDistributionAvailable: office.saplingDistributionAvailable,
    status: office.status,
    operatingHours: office.operatingHours
  };
}

function formToPayload(form: OfficeFormState): DfoOfficeInput {
  return {
    officeName: form.officeName,
    officeType: form.officeType,
    district: form.district,
    division: form.division,
    mandal: form.mandal,
    village: form.village,
    address: form.address,
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    phone: form.phone,
    email: form.email,
    verified: form.verified,
    saplingDistributionAvailable: form.saplingDistributionAvailable,
    status: form.status,
    operatingHours: form.operatingHours,
    availableSaplings: []
  };
}

export function AdminOfficesClient() {
  const [offices, setOffices] = useState<DfoOffice[]>([]);
  const [form, setForm] = useState<OfficeFormState>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authStatus, setAuthStatus] = useState<"ok" | "login" | "forbidden" | "database">("ok");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const verifiedCount = useMemo(() => offices.filter((office) => office.verified).length, [offices]);

  async function loadOffices() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/offices");
      const data = (await response.json()) as { offices?: DfoOffice[]; error?: string };

      if (response.status === 401) {
        setAuthStatus("login");
      } else if (response.status === 403) {
        setAuthStatus("forbidden");
      } else if (response.status === 503) {
        setAuthStatus("database");
      }

      if (!response.ok || !data.offices) {
        setError(data.error ?? "Unable to load office records");
        setLoading(false);
        return;
      }

      setAuthStatus("ok");
      setOffices(data.offices);
      setLoading(false);
    } catch {
      setError("Unable to load office records");
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOffices();
  }, []);

  function updateField<K extends keyof OfficeFormState>(field: K, value: OfficeFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId("");
  }

  async function saveOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const response = await fetch(editingId ? `/api/admin/offices/${editingId}` : "/api/admin/offices", {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(formToPayload(form))
    });
    const data = (await response.json()) as { office?: DfoOffice; error?: string };

    setSaving(false);

    if (!response.ok || !data.office) {
      setError(data.error ?? "Unable to save office record");
      return;
    }

    setOffices((current) =>
      editingId ? current.map((office) => (office.id === data.office?.id ? data.office : office)) : [data.office!, ...current]
    );
    setSuccess(editingId ? "Office record updated." : "Office record created.");
    resetForm();
  }

  async function toggleVerified(office: DfoOffice) {
    setError("");
    setSuccess("");

    const response = await fetch(`/api/admin/offices/${office.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ verified: !office.verified })
    });
    const data = (await response.json()) as { office?: DfoOffice; error?: string };

    if (!response.ok || !data.office) {
      setError(data.error ?? "Unable to update verification");
      return;
    }

    setOffices((current) => current.map((item) => (item.id === office.id ? data.office! : item)));
    setSuccess(data.office.verified ? "Office verified for public discovery." : "Office removed from public discovery.");
  }

  async function removeOffice(office: DfoOffice) {
    if (!window.confirm(`Remove ${office.officeName}?`)) {
      return;
    }

    setError("");
    setSuccess("");

    const response = await fetch(`/api/admin/offices/${office.id}`, {
      method: "DELETE"
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Unable to remove office record");
      return;
    }

    setOffices((current) => current.filter((item) => item.id !== office.id));
    setSuccess("Office record removed.");
    if (editingId === office.id) {
      resetForm();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="h-56 animate-pulse rounded-[32px] bg-white shadow-sm" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-sm" />
            <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (authStatus !== "ok") {
    return (
      <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
        <div className="mx-auto max-w-2xl rounded-[30px] border border-canopy-900/10 bg-white p-8 text-center shadow-sm">
          <ShieldCheck className="mx-auto text-canopy-700" size={36} aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-semibold text-canopy-950">
            {authStatus === "login"
              ? "Admin sign in required"
              : authStatus === "database"
                ? "Database connection required"
                : "Admin access required"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-canopy-900/62">
            {authStatus === "database"
              ? "Office records are stored in PostgreSQL or Supabase. Configure DATABASE_URL to manage verified offices."
              : "Only PlantConnect administrators can create, verify, edit, or remove forest office records."}
          </p>
          {authStatus === "login" ? (
            <Link
              href="/login"
              className="mt-6 inline-flex rounded-full bg-canopy-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Log in
            </Link>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32 text-canopy-950">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[34px] bg-canopy-950 p-6 text-white shadow-panel lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-moss">Admin office records</p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">
                Manage verified forest office discovery.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/68">
                Create official records, verify them for public discovery, and keep contact and location details current.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-3xl font-semibold">{offices.length}</p>
                <p className="text-sm text-white/62">total records</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                <p className="text-3xl font-semibold">{verifiedCount}</p>
                <p className="text-sm text-white/62">verified publicly</p>
              </div>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`mt-6 flex items-start gap-3 rounded-2xl border p-4 text-sm font-semibold ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error ? <AlertCircle className="mt-0.5" size={18} aria-hidden="true" /> : <CheckCircle2 className="mt-0.5" size={18} aria-hidden="true" />}
            <p>{error || success}</p>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.78fr_1.22fr]">
          <form onSubmit={saveOffice} className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                  <Building2 size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold">{editingId ? "Edit office" : "Create office"}</h2>
                  <p className="text-sm text-canopy-900/58">Verified records appear in public discovery.</p>
                </div>
              </div>
              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-canopy-50 text-canopy-700"
                  aria-label="Cancel editing"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Office name</span>
                <input
                  required
                  value={form.officeName}
                  onChange={(event) => updateField("officeName", event.target.value)}
                  className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                />
              </label>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Office type</span>
                <select
                  value={form.officeType}
                  onChange={(event) => updateField("officeType", event.target.value as DfoOfficeType)}
                  className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                >
                  {officeTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">District</span>
                  <input
                    required
                    value={form.district}
                    onChange={(event) => updateField("district", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Village</span>
                  <input
                    value={form.village}
                    onChange={(event) => updateField("village", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Division</span>
                  <input
                    value={form.division}
                    onChange={(event) => updateField("division", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Mandal</span>
                  <input
                    value={form.mandal}
                    onChange={(event) => updateField("mandal", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Verified address</span>
                <textarea
                  required
                  value={form.address}
                  onChange={(event) => updateField("address", event.target.value)}
                  className="min-h-24 rounded-2xl border border-canopy-900/12 px-4 py-3 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Latitude</span>
                  <input
                    required
                    value={form.latitude}
                    onChange={(event) => updateField("latitude", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Longitude</span>
                  <input
                    required
                    value={form.longitude}
                    onChange={(event) => updateField("longitude", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Phone</span>
                  <input
                    required
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  />
                </label>
              </div>
              <label className="grid gap-2">
                <span className="text-sm font-semibold">Operating hours</span>
                <input
                  value={form.operatingHours}
                  onChange={(event) => updateField("operatingHours", event.target.value)}
                  className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-2 rounded-2xl bg-canopy-50 p-4 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.verified}
                    onChange={(event) => updateField("verified", event.target.checked)}
                  />
                  Verified
                </label>
                <label className="flex items-center gap-2 rounded-2xl bg-canopy-50 p-4 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={form.saplingDistributionAvailable}
                    onChange={(event) => updateField("saplingDistributionAvailable", event.target.checked)}
                  />
                  Saplings
                </label>
                <label className="grid gap-2">
                  <span className="sr-only">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => updateField("status", event.target.value as OfficeFormState["status"])}
                    className="h-full min-h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm font-semibold outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:bg-canopy-900/60"
              >
                <ShieldCheck size={17} aria-hidden="true" />
                {saving ? "Saving..." : editingId ? "Update Office" : "Create Office"}
              </button>
            </div>
          </form>

          <section className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <LocateFixed className="text-canopy-700" size={24} aria-hidden="true" />
              <h2 className="text-2xl font-semibold">Office records</h2>
            </div>

            <div className="mt-6 grid gap-4">
              {offices.length ? (
                offices.map((office) => (
                  <article key={office.id} className="rounded-[26px] border border-canopy-900/10 bg-[#f7faf6] p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-canopy-700">
                            {office.officeType}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              office.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {office.verified ? "Verified" : "Pending verification"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-xl font-semibold">{office.officeName}</h3>
                        <p className="mt-2 text-sm leading-6 text-canopy-900/62">{office.address}</p>
                        <p className="mt-2 text-sm text-canopy-900/58">
                          {office.district}
                          {office.village ? `, ${office.village}` : ""} · {office.latitude.toFixed(5)},{" "}
                          {office.longitude.toFixed(5)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleVerified(office)}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-canopy-900 px-4 text-sm font-semibold text-white"
                        >
                          <ShieldCheck size={15} aria-hidden="true" />
                          {office.verified ? "Unverify" : "Verify"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(office.id);
                            setForm(officeToForm(office));
                          }}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-canopy-900"
                        >
                          <Edit3 size={15} aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeOffice(office)}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-red-50 px-4 text-sm font-semibold text-red-700"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[26px] bg-[#f7faf6] p-8 text-center">
                  <Building2 className="mx-auto text-canopy-700" size={34} aria-hidden="true" />
                  <h3 className="mt-4 text-2xl font-semibold">No office records yet</h3>
                  <p className="mt-2 text-sm leading-6 text-canopy-900/62">
                    Add verified Forest Department offices from official records before they appear in discovery.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
