"use client";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7faf6] px-5 py-32">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-semibold text-canopy-950">Something went wrong</h1>
        <p className="mt-4 text-base leading-7 text-canopy-900/64">
          PlantConnect could not complete this request. Try again in a moment.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-8 inline-flex rounded-full bg-canopy-900 px-5 py-3 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
