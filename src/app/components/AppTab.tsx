"use client";

import { useMemo, useState } from "react";
import type { HealthStatus, LatestSummary, Platform, Snapshot, Source } from "../lib/data";
import { CronPanel } from "./CronPanel";

const STATUS_META: Record<
  HealthStatus,
  { label: string; bg: string; fg: string; dot: string }
> = {
  active: { label: "active", bg: "bg-[var(--olive)]/15", fg: "text-[var(--olive)]", dot: "bg-[var(--olive)]" },
  stale: { label: "stale", bg: "bg-[var(--clay)]/15", fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay)]" },
  dead: { label: "dead", bg: "bg-[var(--g300)]/40", fg: "text-[var(--g700)]", dot: "bg-[var(--g500)]" },
  blocked: { label: "blocked", bg: "bg-[var(--clay)]/15", fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay-d)]" },
  error: { label: "error", bg: "bg-[var(--clay)]/10", fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay-d)]" },
  unmonitored: { label: "not monitored", bg: "bg-[var(--g100)]", fg: "text-[var(--g500)]", dot: "bg-[var(--g300)]" },
};

const PLATFORM_FILTERS: { key: "all" | Platform; label: string }[] = [
  { key: "all", label: "All" },
  { key: "telegram", label: "Telegram" },
  { key: "website", label: "Website" },
  { key: "instagram", label: "Instagram" },
];

export function AppTab({
  sources,
  latest,
}: {
  sources: Source[];
  latest: LatestSummary | null;
}) {
  const [filter, setFilter] = useState<"all" | Platform>("all");
  const snapshotMap = useMemo(() => {
    const map = new Map<string, Snapshot>();
    for (const s of latest?.snapshots ?? []) map.set(s.source_id, s);
    return map;
  }, [latest]);

  const rows = useMemo(() => {
    return sources
      .filter((s) => filter === "all" || s.platform === filter)
      .map((s) => ({ source: s, snapshot: snapshotMap.get(s.id) }))
      .sort((a, b) => {
        const sa = a.snapshot?.reliability_score ?? -1;
        const sb = b.snapshot?.reliability_score ?? -1;
        return sb - sa;
      });
  }, [sources, snapshotMap, filter]);

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      {/* Stats hero */}
      <section className="mb-10">
        <p className="eyebrow mb-3">Phase 1 · Telegram Health Check Live</p>
        <h2 className="font-serif text-[clamp(28px,3.6vw,40px)] leading-tight text-[var(--slate)] max-w-[22ch]">
          Sumber kajian bukan sekadar daftar — ada yang{" "}
          <em className="italic text-[var(--clay)]">aktif</em>, ada yang{" "}
          <em className="italic text-[var(--clay)]">mati 4 tahun</em>.
        </h2>
        <p className="mt-4 text-[var(--g700)] max-w-[640px]">
          {latest
            ? `Snapshot terakhir: ${formatDateTime(latest.generated_at)} WIB. Daily cron via GitHub Actions akan refresh otomatis tiap 00:01 WIB.`
            : `Belum ada snapshot. Jalankan: npm run check:telegram`}
        </p>

        {latest && (
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total" value={latest.total_sources} />
            <Stat label="Active" value={latest.by_status.active} accent="olive" />
            <Stat label="Stale + Dead" value={latest.by_status.stale + latest.by_status.dead} accent="clay" />
            <Stat label="Errors" value={latest.by_status.error} accent="g500" />
          </div>
        )}
      </section>

      {/* Cron trigger panel */}
      <CronPanel lastRunAt={latest?.generated_at ?? null} />

      {/* Filter */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <span className="eyebrow !text-[10.5px]">Filter</span>
        {PLATFORM_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={[
              "px-3 py-1.5 rounded-full text-[12.5px] font-medium border transition",
              filter === f.key
                ? "bg-[var(--slate)] text-[var(--ivory)] border-[var(--slate)]"
                : "bg-[var(--paper)] text-[var(--g700)] border-[var(--g300)] hover:border-[var(--slate)]",
            ].join(" ")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Source list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map(({ source, snapshot }) => (
          <SourceCard key={source.id} source={source} snapshot={snapshot} />
        ))}
        {rows.length === 0 && (
          <p className="text-[var(--g500)] py-10 text-center col-span-full">
            Tidak ada source untuk filter ini.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "olive" | "clay" | "g500";
}) {
  const color =
    accent === "olive"
      ? "text-[var(--olive)]"
      : accent === "clay"
        ? "text-[var(--clay-d)]"
        : accent === "g500"
          ? "text-[var(--g500)]"
          : "text-[var(--slate)]";
  return (
    <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4">
      <div className="eyebrow !text-[10px] mb-2">{label}</div>
      <div className={`font-serif text-[32px] leading-none ${color}`}>{value}</div>
    </div>
  );
}

function SourceCard({ source, snapshot }: { source: Source; snapshot?: Snapshot }) {
  const status: HealthStatus = snapshot?.status ?? "unmonitored";
  const meta = STATUS_META[status];
  const score = snapshot?.reliability_score ?? null;
  const lastPost = snapshot?.metrics?.last_post_at ?? null;
  const subs = snapshot?.metrics?.subscribers ?? null;

  return (
    <article className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 flex gap-4 hover:border-[var(--slate)] transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-mono ${meta.bg} ${meta.fg}`}
          >
            <span className={`size-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <span className="font-mono text-[10.5px] text-[var(--g500)] uppercase">
            {source.platform}
          </span>
          {source.priority === "archived" && (
            <span className="font-mono text-[10.5px] text-[var(--g500)]">archived</span>
          )}
        </div>
        <h3 className="font-serif text-[18px] text-[var(--slate)] leading-snug truncate">
          {source.name}
        </h3>
        <p className="text-[12.5px] text-[var(--g500)] mt-0.5">
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--clay)]"
          >
            {prettyUrl(source.url)}
          </a>
        </p>
        {(subs !== null || lastPost) && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--g700)]">
            {subs !== null && (
              <span>
                <span className="text-[var(--g500)]">subs:</span> {formatNum(subs)}
              </span>
            )}
            {lastPost && (
              <span>
                <span className="text-[var(--g500)]">last post:</span> {formatRelative(lastPost)}
              </span>
            )}
          </div>
        )}
        {source.notes && (
          <p className="mt-2 text-[11.5px] text-[var(--g500)] italic line-clamp-2">{source.notes}</p>
        )}
      </div>
      {score !== null && (
        <div className="flex flex-col items-end justify-start min-w-[56px]">
          <div
            className={`font-serif text-[28px] leading-none ${
              score >= 80
                ? "text-[var(--olive)]"
                : score >= 50
                  ? "text-[var(--clay)]"
                  : score > 0
                    ? "text-[var(--clay-d)]"
                    : "text-[var(--g300)]"
            }`}
          >
            {score}
          </div>
          <div className="font-mono text-[9px] text-[var(--g500)] uppercase mt-1">score</div>
        </div>
      )}
    </article>
  );
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    }).format(d);
  } catch {
    return iso;
  }
}

function formatRelative(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const hr = ms / 3_600_000;
    if (hr < 24) return `${Math.round(hr)} jam lalu`;
    const day = hr / 24;
    if (day < 30) return `${Math.round(day)} hari lalu`;
    const month = day / 30;
    if (month < 12) return `${Math.round(month)} bulan lalu`;
    return `${Math.round(month / 12)} tahun lalu`;
  } catch {
    return iso;
  }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function prettyUrl(url: string): string {
  try {
    const u = new URL(url);
    return (u.host + u.pathname).replace(/\/$/, "");
  } catch {
    return url;
  }
}
