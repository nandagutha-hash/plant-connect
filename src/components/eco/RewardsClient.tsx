"use client";

import { Award, BadgeCheck, CheckCircle2, Coins, Gift, Lock, Medal, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { RewardWithStatus } from "@/lib/types";

type RewardsSummary = {
  rewards: RewardWithStatus[];
  totalEcoCredits: number;
  availableEcoCredits: number;
};

export function RewardsClient() {
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadRewards() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/eco/rewards");
        const data = (await response.json()) as RewardsSummary & { error?: string };

        if (cancelled) {
          return;
        }

        if (!response.ok || !data.rewards) {
          if (response.status === 401) {
            setAuthRequired(true);
          }

          setError(data.error ?? "Unable to load rewards");
          setLoading(false);
          return;
        }

        setSummary(data);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError("Unable to load rewards");
          setLoading(false);
        }
      }
    }

    void loadRewards();

    return () => {
      cancelled = true;
    };
  }, []);

  async function redeemReward(reward: RewardWithStatus) {
    setRedeemingId(reward.id);
    setError("");
    setSuccess("");

    const response = await fetch(`/api/eco/rewards/${reward.id}/redeem`, {
      method: "POST"
    });
    const data = (await response.json()) as RewardsSummary & { error?: string };

    setRedeemingId("");

    if (!response.ok || !data.rewards) {
      if (response.status === 401) {
        setAuthRequired(true);
      }

      setError(data.error ?? "Unable to redeem reward");
      return;
    }

    setSummary(data);
    setSuccess(`${reward.rewardName} redeemed and added to your profile.`);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
        <div className="mx-auto max-w-7xl">
          <div className="h-56 animate-pulse rounded-[32px] bg-white shadow-sm" />
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="h-72 animate-pulse rounded-[32px] bg-white shadow-sm" />
            <div className="h-72 animate-pulse rounded-[32px] bg-white shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-[#f7faf6] px-5 pb-20 pt-32">
        <div className="mx-auto max-w-2xl rounded-[30px] border border-canopy-900/10 bg-white p-8 text-center shadow-sm">
          <Gift className="mx-auto text-canopy-700" size={34} aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-semibold text-canopy-950">
            {authRequired ? "Sign in to redeem eco rewards" : "Rewards unavailable"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-canopy-900/62">
            {authRequired
              ? "Rewards are calculated from your authenticated credit ledger and redemption history."
              : error || "We could not load rewards from the database."}
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
        <div className="grid gap-8 rounded-[34px] border border-canopy-900/10 bg-canopy-950 p-6 text-white shadow-panel lg:grid-cols-[1fr_0.86fr] lg:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-moss">
              <Gift size={16} aria-hidden="true" />
              Eco Rewards
            </div>
            <h1 className="mt-5 text-5xl font-semibold leading-tight md:text-6xl">
              Redeem credits for badges that prove long-term care.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/66">
              Eco credits stay tied to real plantation milestones, helping citizens build visible recognition for
              keeping saplings alive.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
              <Coins className="text-sunlit" size={24} aria-hidden="true" />
              <p className="mt-5 text-4xl font-semibold">{summary.availableEcoCredits}</p>
              <p className="mt-1 text-sm text-white/62">Available to redeem</p>
            </div>
            <div className="rounded-[28px] bg-white/10 p-5 ring-1 ring-white/10">
              <Medal className="text-moss" size={24} aria-hidden="true" />
              <p className="mt-5 text-4xl font-semibold">{summary.totalEcoCredits}</p>
              <p className="mt-1 text-sm text-white/62">Lifetime credits earned</p>
            </div>
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

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {summary.rewards.map((reward) => (
            <article
              key={reward.id}
              className="group rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canopy-50 text-canopy-700">
                  {reward.redeemed ? <BadgeCheck size={25} aria-hidden="true" /> : <Award size={25} aria-hidden="true" />}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    reward.redeemed
                      ? "bg-emerald-50 text-emerald-700"
                      : reward.affordable
                        ? "bg-sunlit text-canopy-950"
                        : "bg-canopy-50 text-canopy-700"
                  }`}
                >
                  {reward.redeemed ? "Redeemed" : `${reward.creditCost} credits`}
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-semibold">{reward.rewardName}</h2>
              <p className="mt-3 min-h-16 text-sm leading-6 text-canopy-900/62">{reward.description}</p>

              <button
                type="button"
                disabled={reward.redeemed || !reward.affordable || redeemingId === reward.id}
                onClick={() => void redeemReward(reward)}
                className={`mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition ${
                  reward.redeemed
                    ? "bg-emerald-50 text-emerald-700"
                    : reward.affordable
                      ? "bg-canopy-900 text-white hover:bg-canopy-700"
                      : "bg-canopy-50 text-canopy-700"
                } disabled:cursor-not-allowed`}
              >
                {reward.redeemed ? (
                  <>
                    <CheckCircle2 size={17} aria-hidden="true" />
                    Added to profile
                  </>
                ) : reward.affordable ? (
                  <>
                    <Sparkles size={17} aria-hidden="true" />
                    {redeemingId === reward.id ? "Redeeming..." : "Redeem Reward"}
                  </>
                ) : (
                  <>
                    <Lock size={17} aria-hidden="true" />
                    Earn more credits
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
