"use client";

import { useMemo, useState } from "react";
import type { HealthHistoryPoint, HealthStatus, LatestSummary, Platform, Snapshot, Source, TopicDiscovery } from "../lib/data";
import {
  getRegionLabel,
  normalizeRegionKey,
  type RegionHealthSummary,
} from "./app/region-config";
import { formatDateTime } from "../lib/format";
import { TrendChart } from "./app/charts";
import { RegionHealthPanel } from "./app/region-panel";
import { TopicDiscoveryPanel } from "./app/topic-discovery";
import { SourceCard } from "./app/source-card";
import { ScoreExplainer } from "./app/score-explainer";
import { Stat } from "./app/stat";

type SortKey = "score" | "name" | "subs";

const STATUS_FILTER_KEYS: Array<{ key: "all" | HealthStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "stale", label: "Stale" },
  { key: "dead", label: "Dead" },
  { key: "error", label: "Error" },
  { key: "unmonitored", label: "Unmonitored" },
];

const PLATFORM_FILTER_KEYS: Array<{ key: "all" | Platform; label: string }> = [
  { key: "all", label: "All" },
  { key: "tg", label: "Telegram" },
  { key: "web", label: "Website" },
  { key: "ig", label: "Instagram" },
  { key: "yt", label: "YouTube" },
  { key: "wa", label: "WhatsApp" },
];

export function AppTab({
  sources,
  latest,
  topicDiscovery,
  healthHistory,
}: {
  sources: Source[];
  latest: LatestSummary | null;
  topicDiscovery: TopicDiscovery | null;
  healthHistory: HealthHistoryPoint[];
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | HealthStatus>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [filterOpen, setFilterOpen] = useState(false);

  const snapshotMap = useMemo(() => {
    const m = new Map<string, Snapshot>();
    for (const s of latest?.snapshots ?? []) m.set(s.source_id, s);
    return m;
  }, [latest]);

  const rows = useMemo(() =>
    sources.map((s) => ({ source: s, snapshot: snapshotMap.get(s.id) })),
    [sources, snapshotMap]
  );

  const sourceMap = useMemo(() => {
    const m = new Map<string, Source>();
    for (const source of sources) m.set(source.id, source);
    return m;
  }, [sources]);

  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const source of sources) {
      if (!source.parent_id) continue;
      counts.set(source.parent_id, (counts.get(source.parent_id) ?? 0) + 1);
    }
    return counts;
  }, [sources]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const { snapshot } of rows) {
      const st = snapshot?.status ?? "unmonitored";
      c[st] = (c[st] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const platformCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const { source } of rows) {
      c[source.platform] = (c[source.platform] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const regionSummaries = useMemo<RegionHealthSummary[]>(() => {
    const byRegion = new Map<string, RegionHealthSummary & { scoreSum: number; scoreCount: number }>();

    for (const { source, snapshot } of rows) {
      const regionKey = normalizeRegionKey(source.region);
      const existing = byRegion.get(regionKey) ?? {
        regionKey,
        regionLabel: getRegionLabel(regionKey),
        total: 0,
        monitored: 0,
        active: 0,
        stale: 0,
        dead: 0,
        blocked: 0,
        error: 0,
        unmonitored: 0,
        avgScore: null,
        activeRatio: null,
        scoreSum: 0,
        scoreCount: 0,
      };
      const status = snapshot?.status ?? "unmonitored";
      existing.total += 1;
      existing[status] += 1;
      if (status !== "unmonitored") existing.monitored += 1;
      if (typeof snapshot?.confidence_score === "number") {
        existing.scoreSum += snapshot.confidence_score;
        existing.scoreCount += 1;
      }
      byRegion.set(regionKey, existing);
    }

    return Array.from(byRegion.values())
      .map(({ scoreSum, scoreCount, ...summary }) => ({
        ...summary,
        avgScore: scoreCount > 0 ? scoreSum / scoreCount : null,
        activeRatio: summary.monitored > 0 ? summary.active / summary.monitored : null,
      }))
      .sort((a, b) => {
        if (a.regionKey === "nasional") return -1;
        if (b.regionKey === "nasional") return 1;
        return b.total - a.total
          || b.active - a.active
          || a.regionLabel.localeCompare(b.regionLabel, "id");
      });
  }, [rows]);

  const regionFilterKeys = useMemo(() => [
    { key: "all", label: "All" },
    ...regionSummaries.map((summary) => ({ key: summary.regionKey, label: summary.regionLabel })),
  ], [regionSummaries]);

  const regionCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const summary of regionSummaries) {
      c[summary.regionKey] = summary.total;
    }
    return c;
  }, [rows.length, regionSummaries]);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter(({ snapshot }) => (snapshot?.status ?? "unmonitored") === statusFilter);
    if (platformFilter !== "all") r = r.filter(({ source }) => source.platform === platformFilter);
    if (regionFilter !== "all") r = r.filter(({ source }) => normalizeRegionKey(source.region) === regionFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(({ source }) =>
        source.name.toLowerCase().includes(q)
          || source.handle?.toLowerCase().includes(q)
          || source.id.toLowerCase().includes(q)
          || source.parent_id?.toLowerCase().includes(q)
          || source.source_type?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "score") r = [...r].sort((a, b) => (b.snapshot?.confidence_score ?? -1) - (a.snapshot?.confidence_score ?? -1));
    else if (sortBy === "name") r = [...r].sort((a, b) => a.source.name.localeCompare(b.source.name));
    else if (sortBy === "subs") r = [...r].sort((a, b) => (b.snapshot?.metrics?.subscribers ?? 0) - (a.snapshot?.metrics?.subscribers ?? 0));
    return r;
  }, [rows, statusFilter, platformFilter, regionFilter, search, sortBy]);

  const aggregateHistory = healthHistory;

  const oldestDeadLabel = useMemo(() => {
    if (!latest) return "lama";
    const refTime = new Date(latest.generated_at).getTime();
    const ages = latest.snapshots
      .filter((s) => s.status === "dead" || s.status === "stale")
      .map((s) => s.metrics?.last_post_at)
      .filter((v): v is string => Boolean(v))
      .map((iso) => refTime - new Date(iso).getTime())
      .filter((ms) => isFinite(ms) && ms > 0);
    if (ages.length === 0) return "lama";
    const maxYears = Math.max(1, Math.round(Math.max(...ages) / (1000 * 60 * 60 * 24 * 365)));
    return `${maxYears} tahun`;
  }, [latest]);

  const hasActiveFilters = statusFilter !== "all" || platformFilter !== "all" || regionFilter !== "all" || search;

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      {/* Stats hero */}
      <section className="mb-10">
        <p className="eyebrow mb-3">Phase 1 · Telegram Health Check Live</p>
        <h2 className="font-display text-[clamp(28px,3.6vw,40px)] leading-tight text-[var(--slate)] max-w-[22ch]">
          Sumber kajian bukan sekadar daftar — ada yang{" "}
          <em className="italic text-[var(--clay)]">aktif</em>, ada yang{" "}
          <em className="italic text-[var(--clay)]">mati {oldestDeadLabel}</em>.
        </h2>
        <p className="mt-4 text-[var(--g700)] max-w-[640px]">
          {latest
            ? `Snapshot terakhir: ${formatDateTime(latest.generated_at)} WIB.`
            : `Belum ada snapshot. Trigger health check untuk generate data pertama kali.`}
        </p>
        {latest && (
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total" value={latest.total_sources} />
            <Stat label="Active" value={latest.by_status.active} accent="jade" />
            <Stat label="Stale + Dead" value={latest.by_status.stale + latest.by_status.dead} accent="amber" />
            <Stat label="Errors" value={latest.by_status.error} accent="g500" />
          </div>
        )}
        <ScoreExplainer />
      </section>

      {/* Dashboard section */}
      <div>

        <RegionHealthPanel
          summaries={regionSummaries}
          selectedRegion={regionFilter}
          onSelectRegion={setRegionFilter}
          hasSnapshot={Boolean(latest)}
        />

        {/* Trend chart */}
        <div className="mb-8 animate-in fade-in duration-500">
          <TrendChart data={aggregateHistory} />
        </div>

        <TopicDiscoveryPanel discovery={topicDiscovery} />

        {/* Filter + search bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[300px]">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-30">
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="text" placeholder="Search sources…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--g300)] bg-[var(--paper)] py-2.5 pl-9 pr-3 text-[13.5px] text-[var(--slate)] transition-colors focus-visible:border-[var(--clay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clay)]/20"
            />
          </div>

          {/* Mobile: Filters toggle button */}
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="sm:hidden inline-flex items-center gap-2 rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2.5 text-[13px] font-mono text-[var(--g700)] relative"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3h12M3 7h8M5 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[var(--clay)]" />
            )}
          </button>

          {/* Sort */}
          <select
            value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2.5 text-[13px] font-mono text-[var(--slate)] cursor-pointer focus-visible:border-[var(--clay)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clay)]/20"
          >
            <option value="score">Sort: Score</option>
            <option value="name">Sort: Name</option>
            <option value="subs">Sort: Subscribers</option>
          </select>
        </div>

        {/* Filter rows — always visible on ≥sm, toggleable on mobile */}
        <div className={["sm:block", filterOpen ? "block" : "hidden"].join(" ")}>
          {/* Status filter pills */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="eyebrow !text-[9.5px] min-w-[52px]">Status</span>
            {STATUS_FILTER_KEYS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setStatusFilter(key)}
                className={[
                  "px-3 py-1 rounded-full text-[11.5px] font-mono border transition-all duration-150",
                  statusFilter === key
                    ? "bg-[var(--slate)] text-[var(--ivory)] border-[var(--slate)]"
                    : "bg-transparent text-[var(--g700)] border-[var(--g300)] hover:border-[var(--g500)]",
                ].join(" ")}>
                {label}
                <span className="ml-1.5 opacity-60 text-[10px]">{statusCounts[key] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Platform filter pills */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="eyebrow !text-[9.5px] min-w-[52px]">Platform</span>
            {PLATFORM_FILTER_KEYS.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setPlatformFilter(key)}
                className={[
                  "px-3 py-1 rounded-full text-[11.5px] font-mono border transition-all duration-150",
                  platformFilter === key
                    ? "bg-[var(--slate)] text-[var(--ivory)] border-[var(--slate)]"
                    : "bg-transparent text-[var(--g700)] border-[var(--g300)] hover:border-[var(--g500)]",
                ].join(" ")}>
                {label}
                <span className="ml-1.5 opacity-60 text-[10px]">{platformCounts[key] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Region filter pills */}
          <div className="mb-6 flex items-start gap-2">
            <span className="eyebrow !text-[9.5px] min-w-[52px] pt-1">Region</span>
            <div className="flex-1 overflow-x-auto pb-1">
              <div className="flex min-w-max flex-wrap gap-2 sm:min-w-0">
                {regionFilterKeys.map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setRegionFilter(key)}
                    className={[
                      "px-3 py-1 rounded-full text-[11.5px] font-mono border transition-all duration-150 whitespace-nowrap",
                      regionFilter === key
                        ? "bg-[var(--slate)] text-[var(--ivory)] border-[var(--slate)]"
                        : "bg-transparent text-[var(--g700)] border-[var(--g300)] hover:border-[var(--g500)]",
                    ].join(" ")}>
                    {label}
                    <span className="ml-1.5 opacity-60 text-[10px]">{regionCounts[key] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-3 font-mono text-[12px] text-[var(--g500)]">
            <span>Showing {filtered.length} of {rows.length}</span>
            <button type="button" onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setRegionFilter("all"); setSearch(""); }}
              className="text-[var(--clay)] underline underline-offset-2 hover:opacity-70 transition-opacity">
              Clear filters
            </button>
          </div>
        )}

        {/* Source list */}
        <div className="flex flex-col gap-2 animate-in fade-in duration-500">
          {filtered.length > 0 ? (
            filtered.map(({ source, snapshot }, i) => (
              <SourceCard
                key={source.id}
                source={source}
                snapshot={snapshot}
                index={i}
                parentSource={source.parent_id ? sourceMap.get(source.parent_id) : undefined}
                childCount={childCounts.get(source.id) ?? 0}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--g300)] bg-[var(--g100)] p-12 text-center">
              <div className="text-3xl mb-3 opacity-30">🔍</div>
              <p className="text-[14px] text-[var(--g500)]">No sources match your filters.</p>
              <button type="button" onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setRegionFilter("all"); setSearch(""); }}
                className="mt-3 text-[12.5px] text-[var(--clay)] underline underline-offset-2">
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 text-[13px] text-[var(--g700)] leading-relaxed">
          <span className="text-base shrink-0">💡</span>
          <span>
            <strong>confidence_score</strong> saat ini diturunkan dari 3 check dasar: <strong>http_fetch</strong> (40%), <strong>content_parse</strong> (35%), dan <strong>freshness</strong> (25%).
            Ini masih baseline Phase 1.5 — belum mencerminkan kualitas ekstraksi event penuh.
          </span>
        </div>
      </div>
    </div>
  );
}
