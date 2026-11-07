"use client";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Search,
  Sprout
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Coordinates, DfoOffice } from "@/lib/types";

const locationOptions = {
  enableHighAccuracy: true,
  timeout: 8000,
  maximumAge: 1000 * 60 * 5
} as const;

type SearchForm = {
  district: string;
  mandal: string;
  village: string;
};

const emptySearch: SearchForm = {
  district: "",
  mandal: "",
  village: ""
};

function requestCurrentLocation() {
  return new Promise<Coordinates>((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject("unsupported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      locationOptions
    );
  });
}

function locationErrorMessage(error: GeolocationPositionError | "unsupported") {
  if (error === "unsupported") {
    return "Location access is not available in this browser. Search by district, mandal, or village.";
  }

  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access is blocked. You can still search by district, mandal, or village.";
    case error.POSITION_UNAVAILABLE:
      return "Current location is unavailable right now. Search manually or try again.";
    case error.TIMEOUT:
      return "Location detection timed out. Search manually or try again.";
    default:
      return "We couldn't detect your current location. Search manually or try again.";
  }
}

function mapUrl(location?: Coordinates | null, office?: DfoOffice) {
  const focus = office ?? location;

  if (!focus) {
    return null;
  }

  const anchor = location ?? focus;
  const minLat = Math.min(anchor.latitude, focus.latitude) - 0.08;
  const maxLat = Math.max(anchor.latitude, focus.latitude) + 0.08;
  const minLng = Math.min(anchor.longitude, focus.longitude) - 0.1;
  const maxLng = Math.max(anchor.longitude, focus.longitude) + 0.1;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${focus.latitude}%2C${focus.longitude}`;
}

function directionsUrl(office: DfoOffice, location?: Coordinates) {
  const destination = `${office.latitude},${office.longitude}`;
  const origin = location ? `&origin=${encodeURIComponent(`${location.latitude},${location.longitude}`)}` : "";

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${origin}`;
}

function officeDetailHref(office: DfoOffice, location?: Coordinates) {
  const query = location ? `?lat=${encodeURIComponent(location.latitude)}&lng=${encodeURIComponent(location.longitude)}` : "";
  return `/offices/${office.id}${query}`;
}

async function requestDfoOffices(input: { location?: Coordinates; search?: SearchForm; signal?: AbortSignal }) {
  const params = new URLSearchParams();

  if (input.location) {
    params.set("lat", String(input.location.latitude));
    params.set("lng", String(input.location.longitude));
  }

  if (input.search?.district.trim()) {
    params.set("district", input.search.district.trim());
  }

  if (input.search?.mandal.trim()) {
    params.set("mandal", input.search.mandal.trim());
  }

  if (input.search?.village.trim()) {
    params.set("village", input.search.village.trim());
  }

  params.set("limit", "10");

  const response = await fetch(`/api/dfo-offices?${params.toString()}`, { signal: input.signal });
  const data = (await response.json()) as { offices?: DfoOffice[]; error?: string };

  return { response, data };
}

export function DiscoveryClient() {
  const mountedRef = useRef(true);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [hasLiveLocation, setHasLiveLocation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(true);
  const [error, setError] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const [offices, setOffices] = useState<DfoOffice[]>([]);
  const [search, setSearch] = useState<SearchForm>(emptySearch);
  const [activeOfficeId, setActiveOfficeId] = useState<string>("");

  const activeOffice = useMemo(
    () => offices.find((office) => office.id === activeOfficeId) ?? offices[0],
    [activeOfficeId, offices]
  );
  const iframeUrl = mapUrl(location, activeOffice);

  const loadOffices = useCallback(async (nextLocation?: Coordinates, nextSearch: SearchForm = emptySearch) => {
    setLoading(true);
    setError("");

    try {
      const { response, data } = await requestDfoOffices({ location: nextLocation, search: nextSearch });

      if (!mountedRef.current) {
        return;
      }

      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "Unable to load forest offices");
        return;
      }

      const nextOffices = data.offices ?? [];
      setOffices(nextOffices);
      setActiveOfficeId(nextOffices[0]?.id ?? "");
    } catch {
      if (!mountedRef.current) {
        return;
      }

      setLoading(false);
      setError("Unable to load forest offices");
    }
  }, []);

  const refreshCurrentLocation = useCallback(async (nextSearch: SearchForm = emptySearch) => {
    setLocating(true);
    setLocationNotice("");

    try {
      const nextLocation = await requestCurrentLocation();

      if (!mountedRef.current) {
        return;
      }

      setLocation(nextLocation);
      setHasLiveLocation(true);
      setLocating(false);
      await loadOffices(nextLocation, nextSearch);
    } catch (locationError) {
      if (!mountedRef.current) {
        return;
      }

      setHasLiveLocation(false);
      setLocation(null);
      setLocating(false);
      setLocationNotice(
        locationErrorMessage(
          locationError === "unsupported" ? locationError : (locationError as GeolocationPositionError)
        )
      );
      await loadOffices(undefined, nextSearch);
    }
  }, [loadOffices]);

  useEffect(() => {
    mountedRef.current = true;
    void refreshCurrentLocation();

    return () => {
      mountedRef.current = false;
    };
  }, [refreshCurrentLocation]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadOffices(hasLiveLocation && location ? location : undefined, search);
  }

  return (
    <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <div>
            <h1 className="text-5xl font-semibold leading-tight text-canopy-950 md:text-6xl">
              Find Andhra Pradesh forest offices near you.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-canopy-900/68">
              PlantConnect locates nearby Forest Department offices, nurseries, and sapling distribution centers using
              your live location or a district search.
            </p>
          </div>

          <div className="rounded-[28px] border border-canopy-900/10 bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                  <LocateFixed size={22} aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-canopy-950">
                    {locating
                      ? "Detecting your location"
                      : hasLiveLocation && location
                        ? "Live location active"
                        : "Search by district or capture location"}
                  </p>
                  <p className="text-sm text-canopy-900/58">
                    {location
                      ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                      : "No GPS coordinates captured"}
                  </p>
                  {locationNotice ? <p className="mt-1 text-xs text-canopy-900/56">{locationNotice}</p> : null}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void refreshCurrentLocation(search)}
                disabled={locating}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700 disabled:cursor-not-allowed disabled:bg-canopy-900/60"
              >
                {locating ? "Locating..." : "Find Plants Near Me"}
                <Navigation size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="mt-10 grid gap-3 rounded-[28px] border border-canopy-900/10 bg-white/86 p-4 shadow-sm backdrop-blur lg:grid-cols-[1fr_1fr_1fr_auto]"
        >
          {(["district", "mandal", "village"] as const).map((field) => (
            <label key={field} className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/46">
                {field}
              </span>
              <input
                value={search[field]}
                onChange={(event) => setSearch((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={field === "district" ? "Example: NTR" : field === "mandal" ? "Example: Vijayawada" : "Example: Kondapalli"}
                className="mt-2 h-12 w-full rounded-2xl border border-canopy-900/10 bg-[#f7faf6] px-4 text-sm font-medium text-canopy-950 outline-none transition focus:border-canopy-700"
              />
            </label>
          ))}
          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-2xl bg-sunlit px-5 text-sm font-semibold text-canopy-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-white"
          >
            <Search size={16} aria-hidden="true" />
            Search
          </button>
        </form>

        <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="grid content-start gap-4">
            {error ? (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircle className="mt-0.5" size={18} aria-hidden="true" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            ) : null}

            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-52 animate-pulse rounded-[28px] bg-white shadow-sm" />
                ))
              : offices.map((office, index) => (
                  <motion.article
                    key={office.id}
                    className="group rounded-[28px] border border-canopy-900/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, delay: index * 0.04 }}
                    onMouseEnter={() => setActiveOfficeId(office.id)}
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-canopy-50 px-3 py-1 text-xs font-semibold text-canopy-700">
                            <Building2 size={14} aria-hidden="true" />
                            {office.officeType}
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={14} aria-hidden="true" />
                            Saplings available
                          </span>
                        </div>
                        <h2 className="mt-4 text-2xl font-semibold text-canopy-950">{office.officeName}</h2>
                        <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-canopy-900/62">
                          <MapPin className="mt-0.5 shrink-0 text-canopy-600" size={16} aria-hidden="true" />
                          {office.address}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-canopy-50 px-4 py-3 text-right">
                        <p className="text-2xl font-semibold text-canopy-950">
                          {office.distanceKm === undefined ? "--" : `${office.distanceKm} km`}
                        </p>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/48">away</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-[#f7faf6] p-4">
                        <p className="text-sm font-semibold text-canopy-950">{office.division}</p>
                        <p className="mt-1 text-xs text-canopy-900/56">Division</p>
                      </div>
                      <a
                        href={`tel:${office.phone}`}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f7faf6] p-4 text-sm font-semibold text-canopy-950 transition hover:bg-canopy-50"
                      >
                        <Phone size={16} aria-hidden="true" />
                        Contact
                      </a>
                      <a
                        href={directionsUrl(office, hasLiveLocation && location ? location : undefined)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-canopy-900 p-4 text-sm font-semibold text-white transition hover:bg-canopy-700"
                      >
                        <Compass size={16} aria-hidden="true" />
                        Get Directions
                      </a>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {office.availableSaplings.slice(0, 4).map((sapling) => (
                        <span key={sapling} className="rounded-full bg-canopy-50 px-3 py-1 text-xs font-semibold text-canopy-700">
                          {sapling}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={officeDetailHref(office, hasLiveLocation && location ? location : undefined)}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-canopy-800 transition group-hover:translate-x-1"
                    >
                      View Details
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </motion.article>
                ))}

            {!loading && offices.length === 0 ? (
              <div className="rounded-[28px] border border-canopy-900/10 bg-white p-8 text-center shadow-sm">
                <Sprout className="mx-auto text-canopy-600" size={36} aria-hidden="true" />
                <h2 className="mt-4 text-2xl font-semibold text-canopy-950">No forest offices found</h2>
                <p className="mt-2 text-sm leading-6 text-canopy-900/62">
                  Additional verified forest office records are being added.
                </p>
              </div>
            ) : null}
          </div>

          <div className="sticky top-28 h-fit overflow-hidden rounded-[30px] border border-canopy-900/10 bg-white p-3 shadow-panel">
            <div className="relative overflow-hidden rounded-[22px]">
              {iframeUrl ? (
                <iframe
                  title="OpenStreetMap forest office preview"
                  src={iframeUrl}
                  className="h-[620px] w-full border-0"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-[620px] flex-col items-center justify-center bg-canopy-50 px-8 text-center">
                  <MapPin className="text-canopy-600" size={34} aria-hidden="true" />
                  <h2 className="mt-4 text-2xl font-semibold text-canopy-950">Map preview unavailable</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-canopy-900/62">
                    Capture your location or search for a district to load office records from the database.
                  </p>
                </div>
              )}
              <div className="absolute left-4 top-4 rounded-2xl border border-white/40 bg-white/88 p-4 shadow-xl backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/48">Map Preview</p>
                <p className="mt-1 max-w-[260px] text-sm font-semibold text-canopy-950">
                  {activeOffice ? activeOffice.officeName : "Nearest Andhra Pradesh forest offices"}
                </p>
                <p className="mt-1 text-xs text-canopy-900/58">
                  {hasLiveLocation && location
                    ? "Live location and office route context"
                    : activeOffice
                      ? "Office location from database records"
                      : "Search results and live location will appear here"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
