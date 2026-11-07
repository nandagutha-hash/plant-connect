"use client";

import { ArrowRight, Award, Camera, Clock3, Leaf, MapPinned, Route, Sprout, Trees, Users } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";

const features = [
  {
    title: "Plantation Awareness",
    body: "Promoting plantation awareness and encouraging citizens to build greener communities through accessible government resources.",
    icon: Leaf
  },
  {
    title: "Find Nearby DFO Offices",
    body: "Helping users locate nearby Forest Department offices and nurseries that distribute free government saplings.",
    icon: MapPinned
  },
  {
    title: "Youth Plantation Credits",
    body: "Motivating youth participation through eco credits by uploading plantation progress and contributing to environmental growth.",
    icon: Award
  },
  {
    title: "Community Green Impact",
    body: "Building a connected eco-community where citizens, volunteers, and government distributors work together for a greener future.",
    icon: Users
  }
];

const steps = [
  {
    title: "Discover Nearby DFO Offices",
    body: "PlantConnect uses location-based discovery to help users find nearby Forest Department offices and government nurseries distributing free saplings.",
    icon: MapPinned
  },
  {
    title: "Collect Free Government Saplings",
    body: "Users can visit nearby nurseries and receive suitable saplings recommended for their region and environmental conditions.",
    icon: Sprout
  },
  {
    title: "Plant and Upload Progress",
    body: "Citizens participate in plantation activities and upload plantation progress photographs to promote environmental contribution and awareness.",
    icon: Camera
  },
  {
    title: "Earn Eco Credits & Inspire Communities",
    body: "Users receive eco credits and recognition for participation, encouraging youth involvement and building greener communities together.",
    icon: Award
  }
];

const leaves = [
  { left: "7%", top: "21%", delay: 0.2, duration: 8.5, size: 18, rotate: -18 },
  { left: "19%", top: "68%", delay: 1.1, duration: 11.2, size: 14, rotate: 24 },
  { left: "33%", top: "34%", delay: 0.7, duration: 9.8, size: 12, rotate: -34 },
  { left: "48%", top: "17%", delay: 1.8, duration: 10.7, size: 17, rotate: 12 },
  { left: "61%", top: "73%", delay: 0.4, duration: 12.4, size: 15, rotate: -8 },
  { left: "74%", top: "42%", delay: 1.4, duration: 9.4, size: 20, rotate: 36 },
  { left: "87%", top: "25%", delay: 0.9, duration: 11.8, size: 13, rotate: -22 },
  { left: "92%", top: "66%", delay: 2.2, duration: 10.1, size: 16, rotate: 18 }
];

const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4";

export function PlantConnectLanding() {
  const { scrollY } = useScroll();
  const imageY = useTransform(scrollY, [0, 700], [0, 110]);
  const contentY = useTransform(scrollY, [0, 700], [0, -34]);

  return (
    <div className="overflow-hidden bg-[#f7faf6]">
      <section className="relative flex min-h-[100svh] items-center overflow-hidden bg-canopy-950 px-5 pb-24 pt-32 text-white md:pb-32 md:pt-40">
        <motion.div className="absolute inset-0 will-change-transform" style={{ y: imageY }} aria-hidden="true">
          <video className="h-[115%] w-full object-cover" autoPlay loop muted playsInline preload="auto">
            <source src={HERO_VIDEO} type="video/mp4" />
          </video>
        </motion.div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,14,10,0.54)_0%,rgba(5,17,12,0.12)_42%,rgba(5,18,13,0.34)_100%)]" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_24%,rgba(246,199,107,0.05),transparent_34%)]"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_54%,rgba(3,14,10,0.16)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[rgba(3,14,10,0.22)] via-[rgba(3,14,10,0.04)] to-transparent" />

        {leaves.map((leaf, index) => (
          <motion.span
            key={`${leaf.left}-${leaf.top}`}
            className="leaf-particle absolute rounded-full bg-moss/55 blur-[0.2px]"
            style={{
              left: leaf.left,
              top: leaf.top,
              width: leaf.size,
              height: leaf.size * 0.52,
              borderRadius: "80% 10% 80% 10%",
              rotate: leaf.rotate
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, 0.66, 0.54, 0],
              y: [18, -30, -72],
              x: [0, index % 2 === 0 ? 20 : -18, index % 2 === 0 ? -10 : 14],
              rotate: [leaf.rotate, leaf.rotate + 16, leaf.rotate - 8]
            }}
            transition={{
              duration: leaf.duration,
              delay: leaf.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            aria-hidden="true"
          />
        ))}

        <motion.div
          className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-center"
          style={{ y: contentY }}
        >
          <div className="max-w-5xl text-center">
            <motion.h1
              className="mx-auto max-w-4xl text-5xl font-semibold leading-[0.92] tracking-normal text-white md:text-7xl lg:text-[6.3rem]"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              PlantConnect
            </motion.h1>
            <motion.p
              className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/80 md:text-[1.6rem] md:leading-9"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            >
              Find free government plants near you
            </motion.p>
            <motion.div
              className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href="/discover"
                className="inline-flex min-w-[222px] items-center justify-center gap-2 rounded-full bg-sunlit px-7 py-4 text-base font-semibold text-canopy-950 shadow-glow transition hover:-translate-y-0.5 hover:bg-white"
              >
                Find Plants Near Me
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-w-[222px] items-center justify-center rounded-full border border-white/18 bg-white/8 px-7 py-4 text-base font-semibold text-white backdrop-blur-md transition hover:bg-white/14"
              >
                Register distributor
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <h2 className="text-4xl font-semibold leading-tight text-canopy-950 md:text-5xl">
              Grow plantation awareness through public action.
            </h2>
            <p className="mt-5 text-lg leading-8 text-canopy-900/68">
              PlantConnect is designed to make plantation activity feel local, visible, and shared so more citizens can
              take part in building greener neighborhoods.
            </p>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.title}
                  className="group rounded-2xl border border-canopy-900/10 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_36px_rgba(8,26,18,0.08)]"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700 shadow-[inset_0_0_0_1px_rgba(33,77,52,0.06)] transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-canopy-100 group-hover:text-canopy-800">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <h3 className="mt-6 text-xl font-semibold text-canopy-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-canopy-900/66">{feature.body}</p>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(244,248,243,1)_100%)] px-5 py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div className="max-w-xl">
            <h2 className="text-4xl font-semibold leading-tight text-canopy-950 md:text-5xl">
              How PlantConnect Works
            </h2>
            <p className="mt-5 text-lg leading-8 text-canopy-900/68">
              Connecting citizens with free government saplings and encouraging environmental participation through
              digital awareness.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.article
                  key={step.title}
                  className="group relative overflow-hidden rounded-[28px] border border-canopy-900/8 bg-white/92 p-6 shadow-[0_16px_40px_rgba(15,37,24,0.06)] backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(15,37,24,0.1)]"
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-moss/40 to-transparent" />
                  <div
                    className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(108,158,119,0.14)_0%,rgba(108,158,119,0)_74%)] opacity-80 transition duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700 shadow-[inset_0_0_0_1px_rgba(33,77,52,0.06)] transition duration-300 group-hover:-translate-y-0.5 group-hover:bg-canopy-100 group-hover:text-canopy-800">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold tracking-[0.18em] text-canopy-900/28">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="relative mt-6">
                    <h3 className="text-[1.45rem] font-semibold leading-8 text-canopy-950">{step.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-canopy-900/66">{step.body}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 rounded-[32px] bg-canopy-950 p-6 text-white shadow-panel md:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-sunlit">
              <Route size={26} aria-hidden="true" />
            </span>
            <h2 className="mt-7 text-4xl font-semibold leading-tight md:text-5xl">Map preview built on OpenStreetMap.</h2>
            <p className="mt-5 text-lg leading-8 text-white/70">
              Lightweight map embeds help citizens orient quickly while PlantConnect displays office records and
              distances from the connected database.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/82">
                Distance from GPS
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/82">
                Database records
              </span>
              <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white/82">
                Public office contacts
              </span>
            </div>
          </div>
          <div className="overflow-hidden rounded-[26px] border border-white/12 bg-white p-3">
            <div className="map-grid relative h-[420px] rounded-2xl bg-canopy-50">
              <div className="absolute inset-8 rounded-[28px] border-2 border-dashed border-canopy-600/28" />
              <div className="absolute left-[22%] top-[24%] rounded-2xl bg-white p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <Trees className="text-canopy-600" size={22} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-canopy-950">Forest office record</p>
                    <p className="text-xs text-canopy-900/60">Distance appears after location access</p>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-[22%] right-[12%] rounded-full bg-sunlit px-4 py-2 text-sm font-semibold text-canopy-950 shadow-xl">
                Nearest verified office
              </div>
              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-canopy-950 shadow">
                <Clock3 size={16} aria-hidden="true" />
                Updated from database
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
