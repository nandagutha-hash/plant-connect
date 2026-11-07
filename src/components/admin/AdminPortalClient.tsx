"use client";

import { AlertCircle, CheckCircle2, Loader2, Plus, RefreshCw, ShieldAlert } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Section =
  | "audit-logs"
  | "distributors"
  | "overview"
  | "plantations"
  | "reports"
  | "rewards"
  | "settings"
  | "users";

type ApiState = {
  data: Record<string, unknown> | null;
  loading: boolean;
  error: string;
  success: string;
};

const sectionConfig: Record<Section, { title: string; endpoint: string; description: string }> = {
  overview: {
    title: "Overview",
    endpoint: "/api/admin/overview",
    description: "Live platform totals from PostgreSQL."
  },
  reports: {
    title: "Reports",
    endpoint: "/api/admin/overview",
    description: "Operational report totals generated from real platform records."
  },
  users: {
    title: "Users",
    endpoint: "/api/admin/users",
    description: "Search users, review account health, and apply moderated account actions."
  },
  distributors: {
    title: "Distributors",
    endpoint: "/api/admin/distributors",
    description: "Approve, reject, suspend, or restore distributor registrations."
  },
  plantations: {
    title: "Plantation Verification",
    endpoint: "/api/admin/plantations",
    description: "Review submitted proof, pending milestones, and admin-only fraud warnings."
  },
  rewards: {
    title: "Rewards",
    endpoint: "/api/admin/rewards",
    description: "Manage reward availability and review redemption requests."
  },
  "audit-logs": {
    title: "Audit Logs",
    endpoint: "/api/admin/audit-logs",
    description: "Immutable moderation and administration actions."
  },
  settings: {
    title: "Settings",
    endpoint: "/api/admin/settings",
    description: "Super-admin security and moderation settings."
  }
};

function asArray<T = Record<string, unknown>>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function text(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  return String(value);
}

function dateText(value: unknown) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(String(value)));
}

function statusTone(status: unknown) {
  if (status === "approved" || status === "active" || status === "verified") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "flagged" || status === "suspended" || status === "banned" || status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function StatusPill({ status }: { status: unknown }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusTone(status)}`}>
      {text(status).replace("_", " ")}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-[26px] border border-dashed border-canopy-900/14 bg-white/80 p-8 text-center text-sm text-canopy-900/60">
      {label}
    </div>
  );
}

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = (await response.json()) as Record<string, unknown>;

  if (!response.ok) {
    throw new Error(text(data.error) || "Request failed");
  }

  return data;
}

export function AdminPortalClient({ section }: { section: Section }) {
  const config = sectionConfig[section];
  const [state, setState] = useState<ApiState>({ data: null, loading: true, error: "", success: "" });
  const [rewardForm, setRewardForm] = useState({
    rewardName: "",
    creditCost: "",
    description: "",
    reason: "Reward catalog update"
  });
  const overview = state.data?.overview as Record<string, unknown> | undefined;
  const rewards = asArray(state.data?.rewards);
  const redemptions = asArray(state.data?.redemptions);

  const overviewItems = useMemo<Array<[string, unknown]>>(() => {
    if (!overview) {
      return [];
    }

    return [
      ["Total users", overview.totalUsers],
      ["Distributors", overview.totalDistributors],
      ["Total offices", overview.totalOffices],
      ["Verified offices", overview.verifiedOffices],
      ["Pending offices", overview.pendingOffices],
      ["Plantations", overview.totalPlantations],
      ["Pending reviews", overview.pendingReviews],
      ["Flagged reviews", overview.flaggedReviews],
      ["Credits issued", overview.creditsIssued],
      ["Rewards redeemed", overview.rewardsRedeemed]
    ];
  }, [overview]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "", success: "" }));

    try {
      const primary = await jsonFetch(config.endpoint);

      if (section === "rewards") {
        const redemptionData = await jsonFetch("/api/admin/redemptions");
        setState({ data: { ...primary, ...redemptionData }, loading: false, error: "", success: "" });
        return;
      }

      setState({ data: primary, loading: false, error: "", success: "" });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to load admin data",
        success: ""
      });
    }
  }, [config.endpoint, section]);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(url: string, method: string, payload: Record<string, unknown>, success: string) {
    setState((current) => ({ ...current, error: "", success: "" }));

    try {
      await jsonFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      await load();
      setState((current) => ({ ...current, success }));
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Action failed",
        success: ""
      }));
    }
  }

  async function promptAction(url: string, method: string, status: string, success: string) {
    const reason = window.prompt(status === "approved" || status === "active" ? "Reason for this action" : "Reason required");

    if (!reason?.trim()) {
      return;
    }

    await action(url, method, { status, reason }, success);
  }

  async function createReward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(
      "/api/admin/rewards",
      "POST",
      {
        rewardName: rewardForm.rewardName,
        creditCost: Number(rewardForm.creditCost),
        description: rewardForm.description,
        reason: rewardForm.reason,
        rewardStatus: "active"
      },
      "Reward created."
    );
    setRewardForm({ rewardName: "", creditCost: "", description: "", reason: "Reward catalog update" });
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[30px] border border-canopy-900/10 bg-white p-6 shadow-sm md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-canopy-900/44">Administration</p>
          <h2 className="mt-2 text-3xl font-semibold text-canopy-950">{config.title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-canopy-900/62">{config.description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-canopy-900 px-4 text-sm font-semibold text-white"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {state.error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          <AlertCircle size={18} aria-hidden="true" />
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          <CheckCircle2 size={18} aria-hidden="true" />
          {state.success}
        </div>
      ) : null}

      {state.loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-[30px] bg-white text-canopy-700 shadow-sm">
          <Loader2 className="animate-spin" size={28} aria-hidden="true" />
        </div>
      ) : null}

      {!state.loading && (section === "overview" || section === "reports") ? (
        overviewItems.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {overviewItems.map(([label, value]) => (
              <div key={label} className="rounded-[26px] border border-canopy-900/10 bg-white p-5 shadow-sm">
                <p className="text-3xl font-semibold text-canopy-950">{text(value)}</p>
                <p className="mt-2 text-sm text-canopy-900/58">{label}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState label="No dashboard records are available yet." />
        )
      ) : null}

      {!state.loading && section === "users" ? (
        <DataTable
          empty="No users found."
          rows={asArray(state.data?.users)}
          columns={["Name", "Email", "Role", "Status", "Credits", "Actions"]}
          render={(row) => [
            text(row.name),
            text(row.email),
            text(row.role),
            <StatusPill key="status" status={row.account_status} />,
            text(row.approved_credits),
            <div key="actions" className="flex flex-wrap gap-2">
              {["active", "suspended", "banned", "deleted"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    void promptAction(`/api/admin/users/${row.id}/status`, "PATCH", status, `User marked ${status}.`)
                  }
                  className="rounded-full bg-canopy-50 px-3 py-1.5 text-xs font-semibold text-canopy-800"
                >
                  {status}
                </button>
              ))}
            </div>
          ]}
        />
      ) : null}

      {!state.loading && section === "distributors" ? (
        <DataTable
          empty="No distributor registrations found."
          rows={asArray(state.data?.distributors)}
          columns={["Nursery", "Contact", "Status", "Plants", "Actions"]}
          render={(row) => [
            text(row.name),
            text(row.user_email ?? row.email),
            <StatusPill key="status" status={row.approval_status} />,
            text(row.plant_count),
            <div key="actions" className="flex flex-wrap gap-2">
              {["approved", "rejected", "suspended", "pending"].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    void promptAction(
                      `/api/admin/distributors/${row.id}/status`,
                      "PATCH",
                      status,
                      `Distributor marked ${status}.`
                    )
                  }
                  className="rounded-full bg-canopy-50 px-3 py-1.5 text-xs font-semibold text-canopy-800"
                >
                  {status}
                </button>
              ))}
            </div>
          ]}
        />
      ) : null}

      {!state.loading && section === "plantations" ? (
        <DataTable
          empty="No plantation or progress submissions found."
          rows={asArray(state.data?.submissions)}
          columns={["Submission", "Citizen", "Status", "Fraud", "Submitted", "Actions"]}
          render={(row) => {
            const route =
              row.submission_type === "progress_update"
                ? `/api/admin/progress-updates/${row.id}/review`
                : `/api/admin/plantations/${row.id}/review`;

            return [
              <div key="submission">
                <p className="font-semibold">{text(row.plant_name)}</p>
                <p className="text-xs text-canopy-900/52">{text(row.submission_type)}</p>
              </div>,
              text(row.user_email ?? row.user_name),
              <StatusPill key="status" status={row.status} />,
              <div key="fraud" className="flex items-center gap-2">
                {Number(row.fraud_score ?? 0) > 30 ? <ShieldAlert size={16} className="text-red-600" /> : null}
                <span>{text(row.fraud_score)}</span>
              </div>,
              dateText(row.submitted_at),
              <div key="actions" className="flex flex-wrap gap-2">
                {["under_review", "approved", "rejected", "flagged"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void promptAction(route, "PATCH", status, `Submission marked ${status}.`)}
                    className="rounded-full bg-canopy-50 px-3 py-1.5 text-xs font-semibold text-canopy-800"
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            ];
          }}
        />
      ) : null}

      {!state.loading && section === "rewards" ? (
        <div className="grid gap-6">
          <form onSubmit={createReward} className="grid gap-4 rounded-[28px] border border-canopy-900/10 bg-white p-5 shadow-sm md:grid-cols-4">
            <input
              required
              value={rewardForm.rewardName}
              onChange={(event) => setRewardForm((current) => ({ ...current, rewardName: event.target.value }))}
              placeholder="Reward name"
              className="h-11 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none"
            />
            <input
              required
              type="number"
              min="1"
              value={rewardForm.creditCost}
              onChange={(event) => setRewardForm((current) => ({ ...current, creditCost: event.target.value }))}
              placeholder="Credit cost"
              className="h-11 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none"
            />
            <input
              required
              value={rewardForm.description}
              onChange={(event) => setRewardForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Description"
              className="h-11 rounded-2xl border border-canopy-900/12 px-4 text-sm outline-none"
            />
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-canopy-900 px-4 text-sm font-semibold text-white">
              <Plus size={16} aria-hidden="true" />
              Add reward
            </button>
          </form>
          <DataTable
            empty="No rewards configured."
            rows={rewards}
            columns={["Reward", "Cost", "Status", "Actions"]}
            render={(row) => [
              text(row.reward_name),
              text(row.credit_cost),
              <StatusPill key="status" status={row.reward_status} />,
              <div key="actions" className="flex flex-wrap gap-2">
                {["active", "inactive", "deleted"].map((rewardStatus) => (
                  <button
                    key={rewardStatus}
                    type="button"
                    onClick={() =>
                      void action(
                        `/api/admin/rewards/${row.id}`,
                        "PATCH",
                        { rewardStatus, reason: "Reward catalog status update" },
                        `Reward marked ${rewardStatus}.`
                      )
                    }
                    className="rounded-full bg-canopy-50 px-3 py-1.5 text-xs font-semibold text-canopy-800"
                  >
                    {rewardStatus}
                  </button>
                ))}
              </div>
            ]}
          />
          <DataTable
            empty="No reward redemptions found."
            rows={redemptions}
            columns={["Reward", "User", "Status", "Requested", "Actions"]}
            render={(row) => [
              text(row.reward_name),
              text(row.user_email),
              <StatusPill key="status" status={row.redemption_status} />,
              dateText(row.redeemed_at),
              <div key="actions" className="flex flex-wrap gap-2">
                {["approved", "rejected"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      void promptAction(`/api/admin/redemptions/${row.id}/review`, "PATCH", status, `Redemption ${status}.`)
                    }
                    className="rounded-full bg-canopy-50 px-3 py-1.5 text-xs font-semibold text-canopy-800"
                  >
                    {status}
                  </button>
                ))}
              </div>
            ]}
          />
        </div>
      ) : null}

      {!state.loading && section === "audit-logs" ? (
        <DataTable
          empty="No audit logs found."
          rows={asArray(state.data?.logs)}
          columns={["Action", "Actor", "Target", "Reason", "Time"]}
          render={(row) => [
            text(row.action_type),
            text(row.actor_email),
            `${text(row.target_type)} ${text(row.target_id)}`,
            text(row.reason),
            dateText(row.created_at)
          ]}
        />
      ) : null}

      {!state.loading && section === "settings" ? (
        <DataTable
          empty="No platform settings found."
          rows={asArray(state.data?.settings)}
          columns={["Setting", "Value", "Updated"]}
          render={(row) => [text(row.setting_key), text(JSON.stringify(row.setting_value)), dateText(row.updated_at)]}
        />
      ) : null}
    </section>
  );
}

function DataTable({
  columns,
  empty,
  render,
  rows
}: {
  columns: string[];
  empty: string;
  render: (row: Record<string, unknown>) => React.ReactNode[];
  rows: Record<string, unknown>[];
}) {
  if (!rows.length) {
    return <EmptyState label={empty} />;
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-canopy-900/10 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-canopy-900/10 text-left text-sm">
          <thead className="bg-canopy-50/80 text-xs uppercase tracking-[0.14em] text-canopy-900/52">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-5 py-4 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-canopy-900/8">
            {rows.map((row, index) => (
              <tr key={String(row.id ?? index)} className="align-top">
                {render(row).map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-5 py-4 text-canopy-900/78">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
