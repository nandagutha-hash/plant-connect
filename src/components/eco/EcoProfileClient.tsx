"use client";

import {
  Award,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Coins,
  History,
  Leaf,
  LocateFixed,
  MapPin,
  Medal,
  Sprout,
  TreePine,
  Upload
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { EcoProfile, Plantation, ProgressUpload } from "@/lib/types";

const milestoneOptions: ProgressUpload["milestone"][] = [
  "15-Day Growth Update",
  "30-Day Growth Update",
  "60-Day Growth Update",
  "90-Day Growth Update",
  "Mature Plant Verification"
];

const emptyPlantationForm = {
  plantName: "",
  imageUrl: "",
  plantationDate: new Date().toISOString().slice(0, 10),
  latitude: "",
  longitude: ""
};

const emptyUploadForm = {
  plantationId: "",
  milestone: "15-Day Growth Update" as ProgressUpload["milestone"],
  imageUrl: ""
};

function statusLabel(status: Plantation["status"]) {
  if (status === "completed") {
    return "365-day growth complete";
  }

  if (status === "verified") {
    return "Verified growth";
  }

  if (status === "tracking") {
    return "Progress tracking";
  }

  return "Newly registered";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function EcoProfileClient() {
  const [profile, setProfile] = useState<EcoProfile | null>(null);
  const [plantationForm, setPlantationForm] = useState(emptyPlantationForm);
  const [uploadForm, setUploadForm] = useState(emptyUploadForm);
  const [loading, setLoading] = useState(true);
  const [savingPlantation, setSavingPlantation] = useState(false);
  const [savingUpload, setSavingUpload] = useState(false);
  const [locating, setLocating] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedPlantation = useMemo(
    () => profile?.plantations.find((plantation) => plantation.id === uploadForm.plantationId),
    [profile?.plantations, uploadForm.plantationId]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/eco/profile");
        const data = (await response.json()) as { profile?: EcoProfile; error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.profile) {
          if (response.status === 401) {
            setAuthRequired(true);
          }

          setError(data.error ?? "Unable to load eco profile");
          setLoading(false);
          return;
        }

        setProfile(data.profile);
        setUploadForm((current) => ({
          ...current,
          plantationId: current.plantationId || data.profile?.plantations[0]?.id || ""
        }));
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Unable to load eco profile");
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  function onProgressPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setUploadForm((current) => ({ ...current, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  function onPlantPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPlantationForm((current) => ({ ...current, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  }

  function capturePlantationLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("GPS location is unavailable in this browser. Enter latitude and longitude manually.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPlantationForm((current) => ({
          ...current,
          latitude: String(Number(position.coords.latitude.toFixed(6))),
          longitude: String(Number(position.coords.longitude.toFixed(6)))
        }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        setError("Location permission was blocked. Enter latitude and longitude manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  async function registerPlantation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPlantation(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/eco/plantations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...plantationForm,
        latitude: Number(plantationForm.latitude),
        longitude: Number(plantationForm.longitude)
      })
    });
    const data = (await response.json()) as { profile?: EcoProfile; error?: string };

    setSavingPlantation(false);

    if (!response.ok || !data.profile) {
      if (response.status === 401) {
        setAuthRequired(true);
      }

      setError(data.error ?? "Unable to register plantation");
      return;
    }

    setProfile(data.profile);
    setUploadForm((current) => ({
      ...current,
      plantationId: data.profile?.plantations[0]?.id || current.plantationId
    }));
    setPlantationForm(emptyPlantationForm);
    setSuccess("Plantation proof submitted for admin review. Eco credits will be added after approval.");
  }

  async function uploadProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingUpload(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/eco/progress-uploads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(uploadForm)
    });
    const data = (await response.json()) as { profile?: EcoProfile; error?: string };

    setSavingUpload(false);

    if (!response.ok || !data.profile) {
      if (response.status === 401) {
        setAuthRequired(true);
      }

      setError(data.error ?? "Unable to upload progress");
      return;
    }

    setProfile(data.profile);
    setUploadForm((current) => ({ ...current, imageUrl: "" }));
    setSuccess(`${uploadForm.milestone} submitted for admin review. Eco credits will be added after approval.`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="h-60 animate-pulse rounded-[32px] bg-white shadow-sm" />
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-sm" />
            <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
        <div className="mx-auto max-w-2xl rounded-[30px] border border-canopy-900/10 bg-white p-8 text-center shadow-sm">
          <Medal className="mx-auto text-canopy-700" size={34} aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-semibold text-canopy-950">
            {authRequired ? "Sign in to track your plantation progress" : "Eco profile unavailable"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-canopy-900/62">
            {authRequired
              ? "PlantConnect only shows credits and plantation history from your authenticated account."
              : error || "We could not load profile data from the database."}
          </p>
          {authRequired ? (
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
        <div className="grid gap-8 rounded-[34px] border border-canopy-900/10 bg-white/90 p-6 shadow-sm backdrop-blur lg:grid-cols-[0.85fr_1.15fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-canopy-50 px-4 py-2 text-sm font-semibold text-canopy-700">
              <Medal size={16} aria-hidden="true" />
              {profile.level}
            </div>
            <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-6xl">
              Keep your saplings alive. Grow your impact.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-canopy-900/66">
              Track plantation proof, upload growth milestones, earn eco credits, and turn long-term care into visible
              community recognition.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] bg-canopy-950 p-5 text-white">
              <Coins className="text-sunlit" size={24} aria-hidden="true" />
              <p className="mt-5 text-4xl font-semibold">{profile.totalEcoCredits}</p>
              <p className="mt-1 text-sm text-white/66">Lifetime eco credits</p>
            </div>
            <div className="rounded-[28px] bg-canopy-50 p-5">
              <Sprout className="text-canopy-700" size={24} aria-hidden="true" />
              <p className="mt-5 text-4xl font-semibold">{profile.treesPlanted}</p>
              <p className="mt-1 text-sm text-canopy-900/58">Trees planted</p>
            </div>
            <div className="rounded-[28px] bg-[#fff7e8] p-5">
              <Award className="text-canopy-700" size={24} aria-hidden="true" />
              <p className="mt-5 text-4xl font-semibold">{profile.availableEcoCredits}</p>
              <p className="mt-1 text-sm text-canopy-900/58">Credits redeemable</p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-canopy-900/46">Level progress</p>
              <h2 className="mt-2 text-2xl font-semibold">
                {profile.levelProgress.nextLevel
                  ? `${profile.levelProgress.nextLevel} unlocks at ${profile.levelProgress.nextThreshold} credits`
                  : "Forest Hero unlocked"}
              </h2>
            </div>
            <p className="text-sm font-semibold text-canopy-700">{profile.levelProgress.percent}% complete</p>
          </div>
          <div className="mt-5 h-4 overflow-hidden rounded-full bg-canopy-50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-canopy-500 via-moss to-sunlit transition-all duration-700"
              style={{ width: `${profile.levelProgress.percent}%` }}
            />
          </div>
        </div>

        {(error || success) && (
          <div
            className={`mt-6 rounded-2xl border p-4 text-sm font-semibold ${
              error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                <TreePine size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">Register a plantation</h2>
                <p className="text-sm text-canopy-900/58">Plant registered adds 50 eco credits.</p>
              </div>
            </div>

            <form onSubmit={registerPlantation} className="mt-6 grid gap-4">
              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-canopy-900/18 bg-[#f7faf6] p-5 text-center transition hover:border-canopy-700">
                <Camera className="text-canopy-700" size={24} aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold">
                  {plantationForm.imageUrl ? "Plant photo ready" : "Upload planted sapling photo"}
                </span>
                <span className="mt-1 text-xs text-canopy-900/52">
                  This proof is stored with the plantation record.
                </span>
                <input type="file" accept="image/*" onChange={onPlantPhotoChange} className="sr-only" />
              </label>

              <label>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/46">
                  Plant name
                </span>
                <input
                  value={plantationForm.plantName}
                  onChange={(event) =>
                    setPlantationForm((current) => ({ ...current, plantName: event.target.value }))
                  }
                  placeholder="Example: Neem"
                  className="mt-2 h-12 w-full rounded-2xl border border-canopy-900/10 bg-[#f7faf6] px-4 text-sm font-medium outline-none transition focus:border-canopy-700"
                />
              </label>
              <button
                type="button"
                onClick={capturePlantationLocation}
                disabled={locating}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-canopy-900/10 bg-canopy-50 px-5 text-sm font-semibold text-canopy-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LocateFixed size={17} aria-hidden="true" />
                {locating ? "Capturing GPS..." : "Capture GPS location"}
              </button>
              <div className="grid gap-4 sm:grid-cols-3">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/46">Date</span>
                  <input
                    type="date"
                    value={plantationForm.plantationDate}
                    onChange={(event) =>
                      setPlantationForm((current) => ({ ...current, plantationDate: event.target.value }))
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-canopy-900/10 bg-[#f7faf6] px-4 text-sm font-medium outline-none transition focus:border-canopy-700"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/46">Latitude</span>
                  <input
                    value={plantationForm.latitude}
                    onChange={(event) =>
                      setPlantationForm((current) => ({ ...current, latitude: event.target.value }))
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-canopy-900/10 bg-[#f7faf6] px-4 text-sm font-medium outline-none transition focus:border-canopy-700"
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/46">Longitude</span>
                  <input
                    value={plantationForm.longitude}
                    onChange={(event) =>
                      setPlantationForm((current) => ({ ...current, longitude: event.target.value }))
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-canopy-900/10 bg-[#f7faf6] px-4 text-sm font-medium outline-none transition focus:border-canopy-700"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={savingPlantation}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:bg-canopy-900/60"
              >
                <Leaf size={17} aria-hidden="true" />
                {savingPlantation ? "Registering..." : "Register Plantation"}
              </button>
            </form>
          </section>

          <section className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                <Camera size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">Upload progress proof</h2>
                <p className="text-sm text-canopy-900/58">Milestones unlock bigger credit rewards over time.</p>
              </div>
            </div>

            <form onSubmit={uploadProgress} className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/46">
                    Plantation
                  </span>
                  <select
                    value={uploadForm.plantationId}
                    onChange={(event) => setUploadForm((current) => ({ ...current, plantationId: event.target.value }))}
                    className="mt-2 h-12 w-full rounded-2xl border border-canopy-900/10 bg-[#f7faf6] px-4 text-sm font-medium outline-none transition focus:border-canopy-700"
                  >
                    <option value="">Select plantation</option>
                    {profile.plantations.map((plantation) => (
                      <option key={plantation.id} value={plantation.id}>
                        {plantation.plantName} - {formatDate(plantation.plantationDate)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/46">
                    Milestone
                  </span>
                  <select
                    value={uploadForm.milestone}
                    onChange={(event) =>
                      setUploadForm((current) => ({
                        ...current,
                        milestone: event.target.value as ProgressUpload["milestone"]
                      }))
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-canopy-900/10 bg-[#f7faf6] px-4 text-sm font-medium outline-none transition focus:border-canopy-700"
                  >
                    {milestoneOptions.map((milestone) => (
                      <option key={milestone} value={milestone}>
                        {milestone}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-canopy-900/18 bg-[#f7faf6] p-5 text-center transition hover:border-canopy-700">
                <Upload className="text-canopy-700" size={24} aria-hidden="true" />
                <span className="mt-3 text-sm font-semibold">
                  {uploadForm.imageUrl ? "Progress photo ready" : "Upload plantation progress photo"}
                </span>
                <span className="mt-1 text-xs text-canopy-900/52">
                  {selectedPlantation ? selectedPlantation.plantName : "Choose a plantation first"}
                </span>
                <input type="file" accept="image/*" onChange={onProgressPhotoChange} className="sr-only" />
              </label>

              <button
                type="submit"
                disabled={savingUpload || !profile.plantations.length}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sunlit px-5 text-sm font-semibold text-canopy-950 shadow-glow transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={17} aria-hidden="true" />
                {savingUpload ? "Uploading..." : "Submit Progress"}
              </button>
            </form>
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <History className="text-canopy-700" size={24} aria-hidden="true" />
              <h2 className="text-2xl font-semibold">Growth history</h2>
            </div>
            <div className="mt-6 grid gap-3">
              {profile.growthHistory.length ? (
                profile.growthHistory.map((upload) => (
                  <div key={upload.id} className="grid gap-4 rounded-[24px] bg-[#f7faf6] p-4 sm:grid-cols-[88px_1fr_auto]">
                    <div className="h-20 overflow-hidden rounded-2xl bg-canopy-50">
                      <img src={upload.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className="text-base font-semibold">{upload.milestone}</p>
                      <p className="mt-1 text-sm text-canopy-900/58">
                        {upload.plantName ?? "Plantation"} updated on {formatDate(upload.uploadedAt)}
                      </p>
                    </div>
                    <div className="inline-flex h-10 items-center justify-center rounded-full bg-canopy-900 px-4 text-sm font-semibold text-white">
                      +{upload.creditsAwarded}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-[#f7faf6] p-6 text-sm text-canopy-900/62">
                  No progress uploads yet. Start with your 30 day progress photo.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BadgeCheck className="text-canopy-700" size={24} aria-hidden="true" />
              <h2 className="text-2xl font-semibold">Earned badges</h2>
            </div>
            <div className="mt-6 grid gap-3">
              {profile.earnedBadges.map((badge) => (
                <div key={badge} className="flex items-center gap-3 rounded-[22px] bg-canopy-50 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-canopy-700">
                    <Award size={18} aria-hidden="true" />
                  </span>
                  <p className="font-semibold">{badge}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-canopy-700" size={24} aria-hidden="true" />
            <h2 className="text-2xl font-semibold">Trees under care</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profile.plantations.map((plantation) => (
              <article key={plantation.id} className="rounded-[26px] border border-canopy-900/10 bg-[#f7faf6] p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{plantation.plantName}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-canopy-900/58">
                      <Clock3 size={15} aria-hidden="true" />
                      Planted {formatDate(plantation.plantationDate)}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-canopy-700">
                    {statusLabel(plantation.status)}
                  </span>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm text-canopy-900/58">
                  <MapPin size={15} aria-hidden="true" />
                  {plantation.latitude.toFixed(4)}, {plantation.longitude.toFixed(4)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
