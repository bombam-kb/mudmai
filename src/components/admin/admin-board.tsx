"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AppearanceToggles } from "@/components/appearance-toggles";
import { BrandLockup } from "@/components/icons";
import type { AdminCheckoutDto, AdminLineLinkDto, AdminMemberDto } from "@/lib/admin/directory";

const SECRET_KEY = "jr-admin-secret";

type Tab = "members" | "billing" | "line";
type BillingFilter = "all" | "PAID" | "PENDING";
type MemberFilter = "all" | "email" | "linked" | "unlinked";
type ErrorKey = "unauthorized" | "notConfigured" | "error";

function adminHeaders(secret: string) {
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

function formatWhen(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale === "en" ? "en-GB" : "th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function AdminBoard() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [secret, setSecret] = useState("");
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<Tab>("members");
  const [query, setQuery] = useState("");
  const [billingFilter, setBillingFilter] = useState<BillingFilter>("all");
  const [memberFilter, setMemberFilter] = useState<MemberFilter>("all");
  const [checkouts, setCheckouts] = useState<AdminCheckoutDto[]>([]);
  const [links, setLinks] = useState<AdminLineLinkDto[]>([]);
  const [members, setMembers] = useState<AdminMemberDto[]>([]);
  const [paidUsers, setPaidUsers] = useState(0);
  const [pending, setPending] = useState(0);
  const [reachable, setReachable] = useState(0);
  const [error, setError] = useState<ErrorKey | "">("");
  const [menuNotice, setMenuNotice] = useState<"ok" | "fail" | "">("");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (token: string) => {
    setLoading(true);
    setError("");
    try {
      const [billingRes, lineRes, memberRes] = await Promise.all([
        fetch("/api/admin/billing", { headers: adminHeaders(token) }),
        fetch("/api/admin/line", { headers: adminHeaders(token) }),
        fetch("/api/admin/members", { headers: adminHeaders(token) }),
      ]);
      if (billingRes.status === 401 || lineRes.status === 401 || memberRes.status === 401) {
        sessionStorage.removeItem(SECRET_KEY);
        setSecret("");
        setError("unauthorized");
        return;
      }
      if (billingRes.status === 503 || lineRes.status === 503 || memberRes.status === 503) {
        setError("notConfigured");
        return;
      }
      const billingJson = (await billingRes.json()) as {
        ok?: boolean;
        paidUsers?: number;
        pending?: number;
        checkouts?: AdminCheckoutDto[];
      };
      const lineJson = (await lineRes.json()) as {
        ok?: boolean;
        reachable?: number;
        links?: AdminLineLinkDto[];
      };
      const memberJson = (await memberRes.json()) as {
        ok?: boolean;
        members?: AdminMemberDto[];
      };
      if (!billingJson.ok || !lineJson.ok || !memberJson.ok) {
        setError("error");
        return;
      }
      sessionStorage.setItem(SECRET_KEY, token);
      setCheckouts(billingJson.checkouts ?? []);
      setPaidUsers(billingJson.paidUsers ?? 0);
      setPending(billingJson.pending ?? 0);
      setLinks(lineJson.links ?? []);
      setReachable(lineJson.reachable ?? 0);
      setMembers(memberJson.members ?? []);
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(SECRET_KEY) ?? "";
    if (!stored) return;
    setSecret(stored);
    setDraft(stored);
  }, []);

  useEffect(() => {
    if (!secret) return;
    void load(secret);
  }, [secret, load]);

  function unlock(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next) return;
    setSecret(next);
  }

  function lock() {
    sessionStorage.removeItem(SECRET_KEY);
    setSecret("");
    setDraft("");
    setCheckouts([]);
    setLinks([]);
    setMembers([]);
  }

  async function markPaid(id: string) {
    if (!window.confirm(t("markPaidConfirm"))) return;
    setBusyId(id);
    setError("");
    try {
      const response = await fetch("/api/admin/billing/mark-paid", {
        method: "POST",
        headers: adminHeaders(secret),
        body: JSON.stringify({ checkoutId: id }),
      });
      const json = (await response.json()) as { ok?: boolean };
      if (!response.ok || !json.ok) throw new Error("mark");
      await load(secret);
    } catch {
      setError("error");
    } finally {
      setBusyId(null);
    }
  }

  async function unlink(row: { userId: string; email: string; lineOnly: boolean }) {
    if (!window.confirm(t(row.lineOnly ? "unlinkLineOnlyConfirm" : "unlinkConfirm", { email: row.email }))) {
      return;
    }
    setBusyId(row.userId);
    setError("");
    try {
      const response = await fetch("/api/admin/line", {
        method: "DELETE",
        headers: adminHeaders(secret),
        body: JSON.stringify({ userId: row.userId }),
      });
      const json = (await response.json()) as { ok?: boolean };
      if (!response.ok || !json.ok) throw new Error("unlink");
      await load(secret);
    } catch {
      setError("error");
    } finally {
      setBusyId(null);
    }
  }

  async function deployMenu() {
    setBusyId("rich-menu");
    setMenuNotice("");
    try {
      const response = await fetch("/api/admin/line/rich-menu?locale=" + locale, {
        method: "POST",
        headers: adminHeaders(secret),
      });
      const json = (await response.json()) as { ok?: boolean };
      setMenuNotice(response.ok && json.ok ? "ok" : "fail");
    } catch {
      setMenuNotice("fail");
    } finally {
      setBusyId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const visibleMembers = useMemo(
    () =>
      members.filter((row) => {
        if (memberFilter === "email" && row.lineOnly) return false;
        if (memberFilter === "linked" && !row.lineUserId) return false;
        if (memberFilter === "unlinked" && row.lineUserId) return false;
        if (!q) return true;
        return [row.email, row.name, row.lineUserId ?? "", row.id].some((value) =>
          value.toLowerCase().includes(q),
        );
      }),
    [members, memberFilter, q],
  );
  const visibleCheckouts = useMemo(
    () =>
      checkouts.filter((row) => {
        if (billingFilter !== "all" && row.status !== billingFilter) return false;
        if (!q) return true;
        return [row.id, row.user.email, row.user.name, row.plan].some((value) =>
          value.toLowerCase().includes(q),
        );
      }),
    [checkouts, billingFilter, q],
  );
  const visibleLinks = useMemo(
    () =>
      links.filter((row) => {
        if (!q) return true;
        return [row.email, row.name, row.lineUserId, row.userId].some((value) =>
          value.toLowerCase().includes(q),
        );
      }),
    [links, q],
  );

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/">
          <BrandLockup />
        </Link>
        <AppearanceToggles />
      </div>

      <p className="text-sm font-semibold uppercase tracking-wide text-personal">{t("eyebrow")}</p>
      <h1 className="font-display text-4xl">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>

      {!secret ? (
        <form
          onSubmit={unlock}
          className="mt-8 max-w-md rounded-3xl bg-white p-6 shadow-card ring-1 ring-slate-100"
        >
          <label className="block text-sm font-medium text-ink">
            {t("secret")}
            <input
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 outline-none ring-brand focus:ring-2"
            />
          </label>
          <p className="mt-2 text-xs text-muted">{t("secretHint")}</p>
          {error ? <p className="mt-3 text-sm text-personal">{t(error)}</p> : null}
          <button
            type="submit"
            className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
          >
            {t("unlock")}
          </button>
        </form>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Stat label={t("members")} value={members.length} />
            <Stat label={t("paidUsers")} value={paidUsers} />
            <Stat label={t("pending")} value={pending} />
            <Stat label={t("lineLinks")} value={links.length} />
            <Stat label={t("reachable")} value={reachable} />
            <button
              type="button"
              onClick={() => void load(secret)}
              disabled={loading}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-ink ring-1 ring-slate-200 disabled:opacity-50"
            >
              {loading ? t("loading") : t("refresh")}
            </button>
            <button
              type="button"
              onClick={lock}
              className="rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-muted ring-1 ring-slate-200"
            >
              {t("lock")}
            </button>
          </div>

          <div className="jr-chip-rail mt-6">
            {(
              [
                ["members", t("tabMembers")],
                ["billing", t("tabBilling")],
                ["line", t("tabLine")],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  tab === key ? "bg-brand text-white" : "bg-white text-muted ring-1 ring-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search")}
              className="ml-auto min-w-[12rem] rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-slate-200"
            />
          </div>

          {error ? <p className="mt-3 text-sm text-personal">{t(error)}</p> : null}

          {tab === "members" ? (
            <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-100">
              <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
                {(
                  [
                    ["all", t("filterAll")],
                    ["email", t("filterEmail")],
                    ["linked", t("filterLinked")],
                    ["unlinked", t("filterUnlinked")],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMemberFilter(key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      memberFilter === key
                        ? "bg-ink text-white"
                        : "bg-slate-50 text-muted ring-1 ring-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {visibleMembers.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted">{t("emptyMembers")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">{t("colUser")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colEmail")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colLine")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colReachable")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colJoined")}</th>
                        <th className="px-4 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleMembers.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink">{row.name}</p>
                            {row.lineOnly ? (
                              <p className="mt-1 text-xs font-semibold text-amber-700">{t("lineOnly")}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            {row.lineOnly ? (
                              <p className="text-muted">{t("noEmail")}</p>
                            ) : (
                              <button
                                type="button"
                                title={t("copy")}
                                onClick={() => void navigator.clipboard.writeText(row.email)}
                                className="text-ink"
                              >
                                {row.email}
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.lineUserId ? (
                              <button
                                type="button"
                                title={t("copy")}
                                onClick={() => void navigator.clipboard.writeText(row.lineUserId ?? "")}
                                className="font-mono text-xs text-ink"
                              >
                                {row.lineUserId}
                              </button>
                            ) : (
                              <span className="text-muted">{t("notLinked")}</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {row.lineUserId ? (
                              row.reachable ? (
                                <span className="font-semibold text-finance">{t("friend")}</span>
                              ) : (
                                <span className="text-muted">{t("notFriend")}</span>
                              )
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted">{formatWhen(row.createdAt, locale)}</td>
                          <td className="px-4 py-3 text-right">
                            {row.lineUserId ? (
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() =>
                                  void unlink({ userId: row.id, email: row.email, lineOnly: row.lineOnly })
                                }
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink ring-1 ring-slate-200 disabled:opacity-50"
                              >
                                {t("unlink")}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === "billing" ? (
            <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-100">
              <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
                {(
                  [
                    ["all", t("filterAll")],
                    ["PAID", t("statusPaid")],
                    ["PENDING", t("statusPending")],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setBillingFilter(key)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      billingFilter === key
                        ? "bg-ink text-white"
                        : "bg-slate-50 text-muted ring-1 ring-slate-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {visibleCheckouts.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted">{t("emptyBilling")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[52rem] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">{t("colUser")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colPlan")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colAmount")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colStatus")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colWhen")}</th>
                        <th className="px-4 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCheckouts.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink">{row.user.name}</p>
                            <p className="text-xs text-muted">{row.user.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            {row.plan === "FOUNDER" ? t("planFounder") : t("planYearly")}
                            {row.paidViaPoints ? (
                              <span className="ml-1 text-xs text-muted">{t("viaPoints")}</span>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">฿{row.amountThb}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                row.status === "PAID"
                                  ? "font-semibold text-finance"
                                  : "font-semibold text-amber-700"
                              }
                            >
                              {row.status === "PAID" ? t("statusPaid") : t("statusPending")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted">
                            {formatWhen(row.status === "PAID" ? row.updatedAt : row.createdAt, locale)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.status === "PENDING" ? (
                              <button
                                type="button"
                                disabled={busyId === row.id}
                                onClick={() => void markPaid(row.id)}
                                className="rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                {t("markPaid")}
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}

          {tab === "line" ? (
            <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-card ring-1 ring-slate-100">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
                <p className="min-w-0 flex-1 text-sm text-muted">{t("deployMenuHint")}</p>
                <button
                  type="button"
                  disabled={busyId === "rich-menu"}
                  onClick={() => void deployMenu()}
                  className="rounded-full bg-[#06C755] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {t("deployMenu")}
                </button>
              </div>
              {menuNotice ? (
                <p className="px-4 pt-3 text-sm text-muted">{t(menuNotice === "ok" ? "deployMenuOk" : "deployMenuFail")}</p>
              ) : null}
              {visibleLinks.length === 0 ? (
                <p className="px-4 py-8 text-sm text-muted">{t("emptyLine")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[56rem] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3 font-semibold">{t("colUser")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colLineId")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colReachable")}</th>
                        <th className="px-4 py-3 font-semibold">{t("colLinkedAt")}</th>
                        <th className="px-4 py-3 font-semibold" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleLinks.map((row) => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-ink">{row.name}</p>
                            <p className="text-xs text-muted">{row.email}</p>
                            {row.lineOnly ? (
                              <p className="mt-1 text-xs font-semibold text-amber-700">{t("lineOnly")}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              title={t("copy")}
                              onClick={() => void navigator.clipboard.writeText(row.lineUserId)}
                              className="font-mono text-xs text-ink"
                            >
                              {row.lineUserId}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            {row.reachable ? (
                              <span className="font-semibold text-finance">{t("friend")}</span>
                            ) : (
                              <span className="text-muted">{t("notFriend")}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted">{formatWhen(row.linkedAt, locale)}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              disabled={busyId === row.userId}
                              onClick={() => void unlink(row)}
                              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink ring-1 ring-slate-200 disabled:opacity-50"
                            >
                              {t("unlink")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-2 shadow-sm ring-1 ring-slate-100">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display text-2xl text-ink">{value}</p>
    </div>
  );
}
