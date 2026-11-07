import { Leaf } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-canopy-900/10 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-canopy-900 text-moss">
            <Leaf size={20} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-canopy-950">PlantConnect</p>
            <p className="text-sm text-canopy-900/62">Government nursery discovery and live plant availability.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm font-medium text-canopy-900/66">
          <Link href="/discover" className="hover:text-canopy-700">
            Find distributors
          </Link>
          <Link href="/dashboard" className="hover:text-canopy-700">
            Distributor tools
          </Link>
          <Link href="/signup" className="hover:text-canopy-700">
            Register
          </Link>
        </div>
      </div>
    </footer>
  );
}
