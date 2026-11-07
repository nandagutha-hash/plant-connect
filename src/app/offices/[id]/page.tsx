import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  Leaf,
  Mail,
  MapPin,
  Navigation,
  Phone,
  Sprout,
  Trees
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDfoOfficeById } from "@/lib/repository";
import type { Coordinates, DfoOffice } from "@/lib/types";

type OfficePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    lat?: string;
    lng?: string;
  }>;
};

function parseLocation(params?: { lat?: string; lng?: string }): Coordinates | undefined {
  if (!params?.lat || !params.lng) {
    return undefined;
  }

  const latitude = Number(params.lat);
  const longitude = Number(params.lng);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return undefined;
  }

  return { latitude, longitude };
}

function officeMapUrl(office: DfoOffice, location?: Coordinates) {
  const minLat = Math.min(location?.latitude ?? office.latitude, office.latitude) - 0.08;
  const maxLat = Math.max(location?.latitude ?? office.latitude, office.latitude) + 0.08;
  const minLng = Math.min(location?.longitude ?? office.longitude, office.longitude) - 0.1;
  const maxLng = Math.max(location?.longitude ?? office.longitude, office.longitude) + 0.1;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${office.latitude}%2C${office.longitude}`;
}

function directionsUrl(office: DfoOffice, location?: Coordinates) {
  const destination = `${office.latitude},${office.longitude}`;
  const origin = location ? `&origin=${encodeURIComponent(`${location.latitude},${location.longitude}`)}` : "";

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${origin}`;
}

export default async function OfficeDetailPage({ params, searchParams }: OfficePageProps) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const location = parseLocation(resolvedSearchParams);
  const office = await getDfoOfficeById(id, location);

  if (!office) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32 text-canopy-950">
      <section className="mx-auto max-w-7xl">
        <Link
          href="/discover"
          className="inline-flex items-center gap-2 rounded-full border border-canopy-900/10 bg-white/82 px-4 py-2 text-sm font-semibold text-canopy-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to discovery
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-canopy-50 px-4 py-2 text-sm font-semibold text-canopy-700">
              <Building2 size={16} aria-hidden="true" />
              {office.officeType}
            </div>
            <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-6xl">{office.officeName}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-canopy-900/66">
              {office.division || office.officeType} serving {office.district} district with government sapling access and local plantation
              support.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] border border-canopy-900/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-canopy-900/46">District</p>
                <p className="mt-2 text-2xl font-semibold">{office.district}</p>
              </div>
              <div className="rounded-[26px] border border-canopy-900/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-canopy-900/46">Distance</p>
                <p className="mt-2 text-2xl font-semibold">
                  {office.distanceKm === undefined ? "Search location needed" : `${office.distanceKm} km away`}
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-canopy-900/10 bg-white p-3 shadow-panel">
            <div className="relative overflow-hidden rounded-[22px]">
              <iframe
                title={`${office.officeName} map`}
                src={officeMapUrl(office, location)}
                className="h-[520px] w-full border-0"
                loading="lazy"
              />
              <div className="absolute left-4 top-4 max-w-[280px] rounded-2xl border border-white/50 bg-white/90 p-4 shadow-xl backdrop-blur-md">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-canopy-900/48">
                  Office location
                </p>
                <p className="mt-1 text-sm font-semibold">{office.address}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                <Sprout size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">Available saplings</h2>
                <p className="text-sm text-canopy-900/58">Availability is loaded from the office database record.</p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {office.availableSaplings.map((sapling) => (
                <span
                  key={sapling}
                  className="inline-flex items-center gap-2 rounded-full bg-canopy-50 px-4 py-2 text-sm font-semibold text-canopy-800"
                >
                  <Leaf size={15} aria-hidden="true" />
                  {sapling}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] bg-[#f7faf6] p-5">
                <div className="flex items-center gap-2 text-canopy-700">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <p className="text-sm font-semibold">Sapling distribution</p>
                </div>
                <p className="mt-3 text-lg font-semibold">
                  {office.saplingDistributionAvailable ? "Available now" : "Currently unavailable"}
                </p>
              </div>
              <div className="rounded-[24px] bg-[#f7faf6] p-5">
                <div className="flex items-center gap-2 text-canopy-700">
                  <Clock size={18} aria-hidden="true" />
                  <p className="text-sm font-semibold">Operating hours</p>
                </div>
                <p className="mt-3 text-lg font-semibold">{office.operatingHours}</p>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                <Trees size={22} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold">Office information</h2>
                <p className="text-sm text-canopy-900/58">Contact details and route support for a nursery visit.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="flex items-start gap-3 rounded-[24px] bg-[#f7faf6] p-5">
                <MapPin className="mt-1 shrink-0 text-canopy-700" size={20} aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-canopy-900/52">Address</p>
                  <p className="mt-1 text-base font-semibold leading-7">{office.address}</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <a
                  href={`tel:${office.phone}`}
                  className="flex items-center gap-3 rounded-[24px] bg-[#f7faf6] p-5 transition hover:-translate-y-0.5 hover:bg-canopy-50"
                >
                  <Phone className="text-canopy-700" size={20} aria-hidden="true" />
                  <span className="text-sm font-semibold">{office.phone}</span>
                </a>
                {office.email ? (
                  <a
                    href={`mailto:${office.email}`}
                    className="flex items-center gap-3 rounded-[24px] bg-[#f7faf6] p-5 transition hover:-translate-y-0.5 hover:bg-canopy-50"
                  >
                    <Mail className="text-canopy-700" size={20} aria-hidden="true" />
                    <span className="break-all text-sm font-semibold">{office.email}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 rounded-[24px] bg-[#f7faf6] p-5">
                    <Mail className="text-canopy-700" size={20} aria-hidden="true" />
                    <span className="text-sm font-semibold text-canopy-900/58">Email not listed</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={directionsUrl(office, location)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-canopy-900 px-5 text-sm font-semibold text-white transition hover:bg-canopy-700"
              >
                <Compass size={17} aria-hidden="true" />
                Get Directions
              </a>
              <Link
                href="/discover"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-sunlit px-5 text-sm font-semibold text-canopy-950 shadow-glow transition hover:bg-white"
              >
                <Navigation size={17} aria-hidden="true" />
                Find more offices
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
