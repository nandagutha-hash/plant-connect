import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7faf6] px-5 py-32">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-semibold text-canopy-950">Page not found</h1>
        <p className="mt-4 text-base leading-7 text-canopy-900/64">
          The PlantConnect page you are looking for is not available.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-canopy-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}
