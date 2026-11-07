"use client";

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Leaf,
  LogOut,
  Minus,
  Plus,
  Save,
  Sprout,
  Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { DistributorProfile, Plant, PublicUser } from "@/lib/types";

type ProfileForm = {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  hours: string;
  description: string;
};

type PlantForm = {
  commonName: string;
  botanicalName: string;
  category: string;
  quantity: string;
  imageUrl: string;
};

const emptyPlantForm: PlantForm = {
  commonName: "",
  botanicalName: "",
  category: "Native tree",
  quantity: "50",
  imageUrl: ""
};

function profileToForm(profile: DistributorProfile): ProfileForm {
  return {
    name: profile.name,
    address: profile.address,
    latitude: String(profile.latitude),
    longitude: String(profile.longitude),
    phone: profile.phone,
    email: profile.email ?? "",
    hours: profile.hours,
    description: profile.description
  };
}

export function DistributorDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<PublicUser | null>(null);
  const [profile, setProfile] = useState<DistributorProfile | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantForm, setPlantForm] = useState<PlantForm>(emptyPlantForm);
  const [loading, setLoading] = useState(true);
  const [savingPlant, setSavingPlant] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/auth/me");

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        const data = (await response.json()) as {
          user: PublicUser;
          distributor: DistributorProfile | null;
        };

        if (cancelled) {
          return;
        }

        if (data.user.role !== "distributor" || !data.user.distributorId || !data.distributor) {
          router.push("/discover");
          return;
        }

        setUser(data.user);
        setProfile(data.distributor);
        setProfileForm(profileToForm(data.distributor));

        const plantsResponse = await fetch(`/api/plants?distributorId=${data.user.distributorId}`);
        const plantsData = (await plantsResponse.json()) as { plants?: Plant[] };

        if (cancelled) {
          return;
        }

        setPlants(plantsData.plants ?? []);
        setLoading(false);
      } catch {
        if (cancelled) {
          return;
        }

        setLoading(false);
        setError("Unable to load dashboard");
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function updatePlantField(field: keyof PlantForm, value: string) {
    setPlantForm((current) => ({ ...current, [field]: value }));
  }

  function updateProfileField(field: keyof ProfileForm, value: string) {
    setProfileForm((current) => (current ? { ...current, [field]: value } : current));
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        updatePlantField("imageUrl", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  async function addPlant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPlant(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/plants", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...plantForm,
        quantity: Number(plantForm.quantity)
      })
    });
    const data = (await response.json()) as { plant?: Plant; error?: string };

    setSavingPlant(false);

    if (!response.ok || !data.plant) {
      setError(data.error ?? "Unable to add plant");
      return;
    }

    setPlants((current) => [data.plant!, ...current]);
    setPlantForm(emptyPlantForm);
    setSuccess("Plant added to live inventory");
  }

  async function updateQuantity(plant: Plant, nextQuantity: number) {
    const response = await fetch(`/api/plants/${plant.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        quantity: Math.max(0, nextQuantity)
      })
    });
    const data = (await response.json()) as { plant?: Plant; error?: string };

    if (!response.ok || !data.plant) {
      setError(data.error ?? "Unable to update quantity");
      return;
    }

    setPlants((current) => current.map((item) => (item.id === plant.id ? data.plant! : item)));
    setSuccess("Quantity updated");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profileForm) {
      return;
    }

    setSavingProfile(true);
    setError("");
    setSuccess("");

    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...profileForm,
        latitude: Number(profileForm.latitude),
        longitude: Number(profileForm.longitude)
      })
    });
    const data = (await response.json()) as { distributor?: DistributorProfile; error?: string };

    setSavingProfile(false);

    if (!response.ok || !data.distributor) {
      setError(data.error ?? "Unable to save profile");
      return;
    }

    setProfile(data.distributor);
    setProfileForm(profileToForm(data.distributor));
    setSuccess("Profile saved");
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST"
    });
    router.push("/");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="h-48 animate-pulse rounded-[32px] bg-white shadow-sm" />
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-sm" />
            <div className="h-96 animate-pulse rounded-[32px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
      <section className="mx-auto max-w-7xl">
        <div className="rounded-[32px] bg-canopy-950 p-6 text-white shadow-panel md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium text-moss">Distributor dashboard</p>
              <h1 className="mt-2 text-4xl font-semibold leading-tight md:text-5xl">{profile?.name}</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-white/68">
                Manage plant availability, public contact details, and inventory images for live discovery.
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/10 px-5 text-sm font-semibold text-white ring-1 ring-white/14 transition hover:bg-white/16"
            >
              <LogOut size={16} aria-hidden="true" />
              Log out
            </button>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-3xl font-semibold">{plants.length}</p>
              <p className="text-sm text-white/62">plant types</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-3xl font-semibold">{plants.reduce((total, plant) => total + plant.quantity, 0)}</p>
              <p className="text-sm text-white/62">saplings available</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-3xl font-semibold">{user?.name.split(" ")[0]}</p>
              <p className="text-sm text-white/62">signed-in officer</p>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5" size={18} aria-hidden="true" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-canopy-200 bg-canopy-50 p-4 text-canopy-700">
            <CheckCircle2 className="mt-0.5" size={18} aria-hidden="true" />
            <p className="text-sm font-medium">{success}</p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="grid gap-6">
            <form onSubmit={addPlant} className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                  <Sprout size={22} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-2xl font-semibold text-canopy-950">Add plant</h2>
                  <p className="text-sm text-canopy-900/58">Publish a plant type and quantity.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-canopy-950">Common name</span>
                  <input
                    required
                    value={plantForm.commonName}
                    onChange={(event) => updatePlantField("commonName", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    placeholder="Neem"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-semibold text-canopy-950">Botanical name</span>
                  <input
                    required
                    value={plantForm.botanicalName}
                    onChange={(event) => updatePlantField("botanicalName", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    placeholder="Azadirachta indica"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-canopy-950">Category</span>
                    <select
                      value={plantForm.category}
                      onChange={(event) => updatePlantField("category", event.target.value)}
                      className="h-12 rounded-2xl border border-canopy-900/12 bg-white px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    >
                      <option>Native tree</option>
                      <option>Fruit tree</option>
                      <option>Medicinal</option>
                      <option>Avenue tree</option>
                      <option>Shrub</option>
                    </select>
                  </label>
                  <label className="grid gap-2">
                    <span className="text-sm font-semibold text-canopy-950">Quantity</span>
                    <input
                      required
                      type="number"
                      min={0}
                      value={plantForm.quantity}
                      onChange={(event) => updatePlantField("quantity", event.target.value)}
                      className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    />
                  </label>
                </div>
                <label className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-canopy-900/20 bg-canopy-50 p-4">
                  <span className="flex items-center gap-2 text-sm font-semibold text-canopy-950">
                    <Upload size={16} aria-hidden="true" />
                    Upload plant image
                  </span>
                  <input type="file" accept="image/*" className="sr-only" onChange={onImageChange} />
                  <span className="text-xs leading-5 text-canopy-900/58">
                    Images are previewed immediately. In production, connect this field to object storage.
                  </span>
                </label>
                {plantForm.imageUrl ? (
                  <img
                    src={plantForm.imageUrl}
                    alt="Plant upload preview"
                    className="h-40 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-900/42">
                    <Camera size={28} aria-hidden="true" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={savingPlant}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus size={18} aria-hidden="true" />
                {savingPlant ? "Adding..." : "Add plant"}
              </button>
            </form>

            {profileForm ? (
              <form onSubmit={saveProfile} className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                    <Leaf size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-2xl font-semibold text-canopy-950">Profile</h2>
                    <p className="text-sm text-canopy-900/58">Edit public contact details.</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-4">
                  <input
                    value={profileForm.name}
                    onChange={(event) => updateProfileField("name", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    aria-label="Nursery name"
                  />
                  <input
                    value={profileForm.address}
                    onChange={(event) => updateProfileField("address", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    aria-label="Address"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input
                      type="number"
                      step="0.0001"
                      value={profileForm.latitude}
                      onChange={(event) => updateProfileField("latitude", event.target.value)}
                      className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                      aria-label="Latitude"
                    />
                    <input
                      type="number"
                      step="0.0001"
                      value={profileForm.longitude}
                      onChange={(event) => updateProfileField("longitude", event.target.value)}
                      className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                      aria-label="Longitude"
                    />
                  </div>
                  <input
                    value={profileForm.phone}
                    onChange={(event) => updateProfileField("phone", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    aria-label="Phone"
                  />
                  <input
                    value={profileForm.hours}
                    onChange={(event) => updateProfileField("hours", event.target.value)}
                    className="h-12 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    aria-label="Hours"
                  />
                  <textarea
                    value={profileForm.description}
                    onChange={(event) => updateProfileField("description", event.target.value)}
                    className="min-h-28 rounded-2xl border border-canopy-900/12 px-4 py-3 text-sm outline-none focus:border-canopy-500 focus:ring-4 focus:ring-canopy-500/10"
                    aria-label="Description"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={18} aria-hidden="true" />
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
              </form>
            ) : null}
          </div>

          <div className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-canopy-950">Live inventory</h2>
                <p className="mt-1 text-sm text-canopy-900/58">Update quantities as plants are distributed.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {plants.map((plant) => (
                <article key={plant.id} className="grid gap-4 rounded-3xl bg-[#f7faf6] p-4 md:grid-cols-[130px_1fr]">
                  {plant.imageUrl ? (
                    <img src={plant.imageUrl} alt={plant.commonName} className="h-32 w-full rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-canopy-100 text-canopy-700">
                      <Sprout size={28} aria-hidden="true" />
                    </div>
                  )}
                  <div className="flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-canopy-950">{plant.commonName}</h3>
                          <p className="mt-1 text-sm italic text-canopy-900/56">{plant.botanicalName}</p>
                        </div>
                        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold text-canopy-800 shadow-sm">
                          {plant.category}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-canopy-900/58">
                        Updated {new Date(plant.updatedAt).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(plant, plant.quantity - 10)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-canopy-900 shadow-sm transition hover:bg-canopy-100"
                          aria-label={`Decrease ${plant.commonName} quantity`}
                        >
                          <Minus size={16} aria-hidden="true" />
                        </button>
                        <span className="min-w-20 rounded-full bg-canopy-900 px-4 py-2 text-center text-sm font-semibold text-white">
                          {plant.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(plant, plant.quantity + 10)}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-canopy-900 shadow-sm transition hover:bg-canopy-100"
                          aria-label={`Increase ${plant.commonName} quantity`}
                        >
                          <Plus size={16} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}

              {plants.length === 0 ? (
                <div className="rounded-3xl bg-[#f7faf6] p-10 text-center">
                  <Sprout className="mx-auto text-canopy-600" size={36} aria-hidden="true" />
                  <h3 className="mt-4 text-2xl font-semibold text-canopy-950">No plants published yet</h3>
                  <p className="mt-2 text-sm text-canopy-900/60">Add the first plant to make your nursery discoverable.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
