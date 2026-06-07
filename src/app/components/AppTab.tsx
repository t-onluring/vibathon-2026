"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DivIcon, LayerGroup, Map as LeafletMap } from "leaflet";
import type { HealthHistoryPoint, HealthStatus, LatestSummary, Platform, Snapshot, Source, TopicDiscovery, TopicDiscoveryStatus } from "../lib/data";

// ===== Config ==================================================

type SortKey = "score" | "name" | "subs";

type RegionHealthTone = "healthy" | "risk" | "unknown";

type RegionGeoPoint = {
  lat: number;
  lng: number;
};

type RegionHealthSummary = {
  regionKey: string;
  regionLabel: string;
  total: number;
  monitored: number;
  active: number;
  stale: number;
  dead: number;
  blocked: number;
  error: number;
  unmonitored: number;
  avgScore: number | null;
  activeRatio: number | null;
};

const REGION_LABELS: Record<string, string> = {
  nasional: "Nasional",
  yogyakarta: "Yogyakarta",
  balikpapan: "Balikpapan",
  bandung: "Bandung",
  cimahi: "Cimahi",
  depok: "Depok",
  gresik: "Gresik",
  kuningan: "Kuningan",
  surabaya: "Surabaya",
  unknown: "Unknown Region",
};

const REGION_GEO_POINTS: Record<string, RegionGeoPoint> = {
  nasional: { lat: -2.5, lng: 118.0 },
  depok: { lat: -6.4025, lng: 106.7942 },
  bandung: { lat: -6.9175, lng: 107.6191 },
  cimahi: { lat: -6.8722, lng: 107.5425 },
  kuningan: { lat: -6.9758, lng: 108.4831 },
  yogyakarta: { lat: -7.7956, lng: 110.3695 },
  surabaya: { lat: -7.2575, lng: 112.7521 },
  gresik: { lat: -7.1567, lng: 112.6555 },
  balikpapan: { lat: -1.2379, lng: 116.8529 },
  unknown: { lat: -8.4095, lng: 115.1889 },
};

const REGION_TONE_STYLES: Record<RegionHealthTone, { fill: string; stroke: string; text: string; label: string }> = {
  healthy: { fill: "var(--jade)", stroke: "#3A5E47", text: "Healthy", label: "Healthy" },
  risk: { fill: "var(--amber)", stroke: "#9A6514", text: "Needs attention", label: "Needs attention" },
  unknown: { fill: "var(--g300)", stroke: "var(--g500)", text: "Unmonitored", label: "Unmonitored" },
};

function normalizeRegionKey(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return normalized || "unknown";
}

function titleCaseRegion(regionKey: string): string {
  return regionKey
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown Region";
}

function getRegionLabel(regionKey: string): string {
  return REGION_LABELS[regionKey] ?? titleCaseRegion(regionKey);
}

function getBubbleRadius(total: number): number {
  return Math.max(5, Math.min(15, 4 + Math.sqrt(total) * 2.5));
}

function getRegionHealthTone(summary: RegionHealthSummary): RegionHealthTone {
  if (summary.monitored === 0) return "unknown";
  if ((summary.activeRatio ?? 0) >= 0.7) return "healthy";
  return "risk";
}

function formatRegionRatio(summary: RegionHealthSummary): string {
  return summary.activeRatio != null ? `${Math.round(summary.activeRatio * 100)}% active` : "n/a";
}

function formatRegionScore(summary: RegionHealthSummary): string {
  return summary.avgScore != null ? String(Math.round(summary.avgScore * 100)) : "—";
}

const STATUS_META: Record<HealthStatus, { label: string; bg: string; fg: string; dot: string; ringColor: string }> = {
  active:      { label: "Active",      bg: "bg-[var(--jade)]/15",   fg: "text-[var(--jade)]",   dot: "bg-[var(--jade)]",   ringColor: "#4D7C5F" },
  stale:       { label: "Stale",       bg: "bg-[var(--amber)]/15",  fg: "text-[var(--amber)]",  dot: "bg-[var(--amber)]",  ringColor: "#C4831A" },
  dead:        { label: "Dead",        bg: "bg-[var(--rust)]/12",   fg: "text-[var(--rust)]",   dot: "bg-[var(--rust)]",   ringColor: "#B84040" },
  blocked:     { label: "Blocked",     bg: "bg-[var(--clay)]/12",   fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay-d)]", ringColor: "#B85C3E" },
  error:       { label: "Error",       bg: "bg-[var(--rust)]/10",   fg: "text-[var(--rust)]",   dot: "bg-[var(--rust)]",   ringColor: "#B84040" },
  unmonitored: { label: "Unmonitored", bg: "bg-[var(--g100)]",      fg: "text-[var(--g500)]",   dot: "bg-[var(--g300)]",   ringColor: "#D1CFC5" },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  tg: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
    </svg>
  ),
  web: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  ig: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/>
    </svg>
  ),
  yt: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 1.96C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58Z"/>
      <path d="m9.75 15.02 5.75-3.02-5.75-3.02v6.04Z"/>
    </svg>
  ),
  wa: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4A8.5 8.5 0 1 1 21 11.5Z"/>
      <path d="M8 12c1.5 2.5 3.5 4 6 5"/>
      <path d="M14.5 14.5 16 16"/>
    </svg>
  ),
};

function confidenceToPercent(score?: number | null): number | null {
  if (typeof score !== "number") return null;
  return Math.round(score * 100);
}

// ===== Seeded history generation ==============================

function seededRand(seed: number) {
  let s = (seed * 1664525 + 1013904223) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function generateHistory(id: string, status: HealthStatus, score: number | null): (number | null)[] {
  const rand = seededRand(hashStr(id));
  return Array.from({ length: 30 }, (_, i) => {
    if (status === "active") {
      return Math.round(Math.max(60, Math.min(100, (score ?? 85) + Math.sin(i * 0.4) * 8 + rand() * 6 - 3)));
    }
    if (status === "stale") {
      return Math.round(Math.max(20, Math.min(65, 45 + Math.sin(i * 0.3) * 10 + rand() * 12 - 6)));
    }
    if (status === "dead") {
      if (i < 10) return Math.round(Math.max(0, Math.min(100, 65 + rand() * 15 - 7)));
      if (i < 20) return Math.round(Math.max(0, 35 + rand() * 18));
      return Math.round(Math.max(0, 12 - (i - 20) * 2 + rand() * 8));
    }
    if (status === "error") return i < 26 ? Math.round(55 + rand() * 14) : null;
    return null;
  });
}

// ===== SVG Components =========================================

function ScoreRing({ score, status, size = 44 }: { score: number | null; status: HealthStatus; size?: number }) {
  const sw = 3.5;
  const r = (size - sw) / 2;
  const circ = 2 * Math.PI * r;
  const filled = score != null ? circ * (score / 100) : 0;
  const offset = circ - filled;
  const ringColor = STATUS_META[status]?.ringColor ?? "#D1CFC5";

  return (
    <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--g200)" strokeWidth={sw} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={ringColor} strokeWidth={sw}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.round(size * 0.27), fontWeight: 600,
        fontFamily: "var(--font-mono-stack)",
        color: ringColor,
      }}>
        {score != null ? score : "—"}
      </span>
    </div>
  );
}

function Sparkline({ data, width = 70, height = 26, color = "#788C5D" }: {
  data: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const valid = data.filter((d) => d != null);
  if (valid.length === 0) {
    return (
      <svg width={width} height={height} style={{ flexShrink: 0 }}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2}
          stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    );
  }
  const step = width / (data.length - 1);
  let line = "", area = "", started = false;
  data.forEach((v, i) => {
    if (v == null) { started = false; return; }
    const x = i * step;
    const y = height - (v / 100) * height;
    line += (started ? " L" : "M") + x + "," + y;
    if (!started) area += `M${x},${height} L${x},${y}`;
    else area += ` L${x},${y}`;
    started = true;
  });
  const li = data.length - 1 - [...data].reverse().findIndex((v) => v != null);
  if (li >= 0 && data[li] != null) area += ` L${li * step},${height} Z`;
  const gid = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height} style={{ flexShrink: 0, overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function TrendChart({ data }: { data: HealthHistoryPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setW(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (data.length === 0) {
    return (
      <div ref={containerRef} className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5">
        <h3 className="font-semibold text-[15px] text-[var(--slate)]">Ecosystem Health</h3>
        <p className="mt-2 font-mono text-[11px] text-[var(--g500)] tracking-[0.02em]">
          Belum ada arsip health untuk ditampilkan.
        </p>
      </div>
    );
  }

  const h = w < 500 ? 160 : 200;
  const pad = { t: 20, r: 16, b: 28, l: 36 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const sx = iw / Math.max(1, data.length - 1);
  const sy = (v: number) => pad.t + ih - (v / 100) * ih;
  const maxCount = Math.max(1, ...data.flatMap((d) => [d.active_count, d.dead_count]));
  const countY = (v: number) => pad.t + ih - (v / maxCount) * ih;

  let linePath = "", areaPath = "";
  data.forEach((d, i) => {
    const x = pad.l + i * sx;
    const y = sy(d.avg_score);
    linePath += (i === 0 ? "M" : " L") + x + "," + y;
    if (i === 0) areaPath = `M${x},${pad.t + ih} L${x},${y}`;
    else areaPath += ` L${x},${y}`;
  });
  areaPath += ` L${pad.l + (data.length - 1) * sx},${pad.t + ih} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    const idx = Math.round((x - pad.l) / sx);
    setHoverIdx(idx >= 0 && idx < data.length ? idx : null);
  };

  return (
    <div ref={containerRef} className="relative rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-[15px] text-[var(--slate)]">Ecosystem Health</h3>
          <p className="font-mono text-[11px] text-[var(--g500)] mt-0.5 tracking-[0.02em]">Avg score · health archive ({data.length} snapshots)</p>
        </div>
        <div className="flex items-center gap-4">
          <ChartLegend color="var(--clay)" label="Avg Score" />
          <ChartLegend color="var(--olive)" label="Active" />
          <ChartLegend color="var(--g500)" label="Dead" dashed />
        </div>
      </div>
      <svg
        width={w} height={h}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        style={{ display: "block", cursor: "crosshair" }}
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--clay)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--clay)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((t) => (
          <g key={t}>
            <line x1={pad.l} y1={sy(t)} x2={pad.l + iw} y2={sy(t)}
              stroke="var(--g200)" strokeWidth="1" strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={pad.l - 7} y={sy(t) + 4} fontSize="9.5" fill="var(--g500)" textAnchor="end"
              fontFamily="var(--font-mono-stack)">{t}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const step = Math.ceil(data.length / 6);
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = pad.l + i * sx;
          const label = i === data.length - 1 ? "latest" : d.date.slice(5);
          return <text key={i} x={x} y={h - 8} fontSize="9.5" fill="var(--g500)" textAnchor="middle"
            fontFamily="var(--font-mono-stack)">{label}</text>;
        })}
        <path d={areaPath} fill="url(#trendGrad)" />
        <path d={(() => {
          let p = "";
          data.forEach((d, i) => {
            const x = pad.l + i * sx;
            const y = countY(d.active_count);
            p += (i === 0 ? "M" : " L") + x + "," + y;
          });
          return p;
        })()} fill="none" stroke="var(--olive)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
        <path d={(() => {
          let p = "";
          data.forEach((d, i) => {
            const x = pad.l + i * sx;
            const y = countY(d.dead_count);
            p += (i === 0 ? "M" : " L") + x + "," + y;
          });
          return p;
        })()} fill="none" stroke="var(--g500)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
        <path d={linePath} fill="none" stroke="var(--clay)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hoverIdx != null && data[hoverIdx] && (
          <g>
            <line x1={pad.l + hoverIdx * sx} y1={pad.t} x2={pad.l + hoverIdx * sx} y2={pad.t + ih}
              stroke="var(--slate)" strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
            <circle cx={pad.l + hoverIdx * sx} cy={sy(data[hoverIdx].avg_score)}
              r="4" fill="var(--paper)" stroke="var(--clay)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hoverIdx != null && data[hoverIdx] && (
        <div className="pointer-events-none absolute top-12 z-10 rounded-md bg-[var(--slate)] px-3 py-2 shadow-md"
          style={{ left: Math.min(Math.max(pad.l + hoverIdx * sx - 55, 12), w - 115), minWidth: 110 }}>
          <div className="font-mono text-[10px] text-[var(--ivory)]/60 mb-1.5">
            {data[hoverIdx].date}
          </div>
          {[["Avg", data[hoverIdx].avg_score], ["Active", data[hoverIdx].active_count], ["Dead", data[hoverIdx].dead_count]].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-3 font-mono text-[10px]">
              <span className="text-[var(--ivory)]/70">{k}</span>
              <span className="font-semibold text-[var(--ivory)]">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChartLegend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="14" height="2"><line x1="0" y1="1" x2="14" y2="1" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "3 2" : undefined} /></svg>
      <span className="font-mono text-[10px] text-[var(--g500)] tracking-[0.02em]">{label}</span>
    </div>
  );
}

// ===== Topic discovery panel ==================================

const TOPIC_STATUS_META: Record<TopicDiscoveryStatus, { label: string; color: string }> = {
  active: { label: "Active", color: "text-[var(--olive)]" },
  stale: { label: "Stale", color: "text-[var(--clay)]" },
  dead: { label: "Dead", color: "text-[var(--clay-d)]" },
  blocked: { label: "Blocked", color: "text-[var(--clay-d)]" },
  ignored: { label: "Ignored", color: "text-[var(--g500)]" },
  error: { label: "Error", color: "text-[var(--clay-d)]" },
};

function TopicDiscoveryPanel({ discovery }: { discovery: TopicDiscovery | null }) {
  const summary = discovery?.summary;
  const ignoredCount = summary?.ignored ?? 0;
  const blockedCount = (summary?.blocked ?? 0) + (summary?.error ?? 0);
  const promotable = discovery?.topics.filter((topic) =>
    topic.mapped && !topic.ignored && topic.evaluated_status !== "blocked" && topic.evaluated_status !== "error"
  ) ?? [];
  const candidates = promotable.slice(0, 5);

  return (
    <section className="mb-8 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Track B · Topic Discovery</p>
          <h3 className="font-semibold text-[16px] text-[var(--slate)]">Sijadwal Kajian topic spike</h3>
          <p className="mt-1 max-w-[620px] text-[12.5px] leading-relaxed text-[var(--g700)]">
            Kandidat topic dipantau terpisah dari registry utama. Topic yang stabil bisa dipromosikan ke source resmi.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[10.5px]">
            <span className="rounded-full border border-[var(--g300)] px-2 py-0.5 text-[var(--clay)]">discovery layer</span>
            <span className="rounded-full border border-[var(--g300)] px-2 py-0.5 text-[var(--g500)]">data/spikes/*</span>
            <span className="rounded-full border border-[var(--g300)] px-2 py-0.5 text-[var(--olive)]">review before registry</span>
          </div>
        </div>
        {discovery && (
          <div className="font-mono text-[10.5px] text-[var(--g500)]">
            Updated {formatDateTime(discovery.generated_at)} WIB
          </div>
        )}
      </div>

      {summary ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
            <MiniStat label="Topics" value={summary.total_topics} />
            <MiniStat label="Active" value={summary.active} accent="jade" />
            <MiniStat label="Stale" value={summary.stale} accent="amber" />
            <MiniStat label="Dead" value={summary.dead} accent="rust" />
            <MiniStat label="Ignored" value={ignoredCount} accent="g500" />
            <MiniStat label="Blocked" value={blockedCount} accent="g500" />
          </div>

          {summary.total_topics === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-[var(--g300)] bg-[var(--g100)] px-4 py-3 text-[12.5px] text-[var(--g700)]">
              Belum ada topic dari artifact spike lokal. Jalankan workflow/spike Track B lalu regenerate artifact supaya panel ini terisi.
            </div>
          ) : candidates.length > 0 ? (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--g500)]">
                  Track B sample candidates
                </span>
                <span className="font-mono text-[10.5px] text-[var(--g500)]">
                  showing {candidates.length} of {promotable.length} ready
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {candidates.map((topic) => (
                  <div key={topic.topic_id} className="rounded-lg border border-[var(--g300)] bg-[var(--ivory)] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[13px] font-medium text-[var(--slate)]">{topic.topic_title}</span>
                      <span className={`shrink-0 font-mono text-[10.5px] ${TOPIC_STATUS_META[topic.evaluated_status].color}`}>
                        {TOPIC_STATUS_META[topic.evaluated_status].label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10.5px] text-[var(--g500)]">
                      {topic.mapped_region && <span className="capitalize">{topic.mapped_region}</span>}
                      {topic.mapped_source_id && <span>{topic.mapped_source_id}</span>}
                      {topic.last_post_at && <span>{formatRelative(topic.last_post_at)}</span>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-[var(--g300)] bg-[var(--ivory)] px-4 py-3">
                <div className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--g500)]">
                  Promotion workflow
                </div>
                <div className="grid gap-1.5 font-mono text-[11px] text-[var(--g600)] sm:grid-cols-3">
                  <span>1. topic-promotion-candidates.json</span>
                  <span>2. topic-promotion-review.json</span>
                  <span>3. keep 5-topic dashboard sample</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-[var(--g300)] bg-[var(--ivory)] px-4 py-3 text-[12.5px] text-[var(--g700)]">
              Belum ada candidate siap promosi. Cek blocked/error dan mapping policy sebelum memasukkan topic ke registry utama.
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--g300)] bg-[var(--g100)] px-4 py-3 text-[12.5px] text-[var(--g700)]">
          Artifact Track B belum tersedia di <code className="font-mono">data/spikes/telegram-topic-freshness-evaluated.json</code>.
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: "jade" | "amber" | "rust" | "g500" }) {
  const color = accent === "jade" ? "text-[var(--jade)]"
    : accent === "amber" ? "text-[var(--amber)]"
    : accent === "rust" ? "text-[var(--rust)]"
    : accent === "g500" ? "text-[var(--g500)]"
    : "text-[var(--slate)]";
  return (
    <div className="rounded-lg border border-[var(--g300)] bg-[var(--ivory)] px-3 py-3">
      <div className="eyebrow !text-[9.5px] mb-2">{label}</div>
      <div className={`font-display text-[26px] leading-none ${color}`}>{value}</div>
    </div>
  );
}

// ===== Region health panel ====================================

function RegionHealthPanel({
  summaries,
  selectedRegion,
  onSelectRegion,
  hasSnapshot,
}: {
  summaries: RegionHealthSummary[];
  selectedRegion: string;
  onSelectRegion: (regionKey: string) => void;
  hasSnapshot: boolean;
}) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const totalRegions = summaries.length;
  const selectedSummary = summaries.find((summary) => summary.regionKey === selectedRegion) ?? null;
  const activeSummary = selectedSummary ?? summaries.find((summary) => summary.regionKey === hoveredRegion) ?? null;
  const allSummary = useMemo(() => buildAllRegionSummary(summaries), [summaries]);
  const detailSummary = activeSummary ?? allSummary;

  return (
    <section className="mb-8 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Kota / Region Health</p>
          <h3 className="font-semibold text-[16px] text-[var(--slate)]">Peta health source kajian</h3>
          <p className="mt-1 max-w-[700px] text-[12.5px] leading-relaxed text-[var(--g700)]">
            Bubble menunjukkan jumlah source per kota/region. Warna menunjukkan kondisi health; klik/tap bubble untuk memfilter daftar source di bawah.
          </p>
        </div>
        <div className="rounded-lg border border-[var(--g300)] bg-[var(--ivory)] px-3 py-2 text-right">
          <div className="font-display text-[24px] leading-none text-[var(--slate)]">{totalRegions}</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)]">regions</div>
        </div>
      </div>

      {!hasSnapshot && summaries.length > 0 && (
        <div className="mb-4 rounded-lg border border-dashed border-[var(--g300)] bg-[var(--g100)] px-4 py-3 text-[12.5px] text-[var(--g700)]">
          Belum ada snapshot health. Region ditampilkan sebagai unmonitored.
        </div>
      )}

      {summaries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--g300)] bg-[var(--g100)] px-4 py-3 text-[12.5px] text-[var(--g700)]">
          Belum ada source untuk dirangkum.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="rounded-xl border border-[var(--g300)] bg-[var(--ivory)] p-4">
            <LeafletRegionMap
              summaries={summaries}
              selectedRegion={selectedRegion}
              onSelectRegion={onSelectRegion}
              onHoverRegion={setHoveredRegion}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[var(--g600)]">
              <div className="flex flex-wrap items-center gap-3">
                <LegendDot tone="healthy" />
                <LegendDot tone="risk" />
                <LegendDot tone="unknown" />
              </div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g500)]">
                <span>Size = jumlah source</span>
                <span className="inline-block size-3 rounded-full bg-[var(--g300)]" />
                <span className="inline-block size-5 rounded-full bg-[var(--g300)]" />
                <span className="inline-block size-7 rounded-full bg-[var(--g300)]" />
              </div>
            </div>
          </div>

          <RegionSummaryPanel
            summary={detailSummary}
            selected={Boolean(selectedSummary)}
            onClear={() => onSelectRegion("all")}
          />
        </div>
      )}
    </section>
  );
}

function buildAllRegionSummary(summaries: RegionHealthSummary[]): RegionHealthSummary {
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const monitored = summaries.reduce((sum, summary) => sum + summary.monitored, 0);
  const active = summaries.reduce((sum, summary) => sum + summary.active, 0);
  const stale = summaries.reduce((sum, summary) => sum + summary.stale, 0);
  const dead = summaries.reduce((sum, summary) => sum + summary.dead, 0);
  const blocked = summaries.reduce((sum, summary) => sum + summary.blocked, 0);
  const error = summaries.reduce((sum, summary) => sum + summary.error, 0);
  const unmonitored = summaries.reduce((sum, summary) => sum + summary.unmonitored, 0);
  const scoreWeight = summaries.reduce((sum, summary) => sum + (summary.avgScore ?? 0) * summary.monitored, 0);

  return {
    regionKey: "all",
    regionLabel: "All regions",
    total,
    monitored,
    active,
    stale,
    dead,
    blocked,
    error,
    unmonitored,
    avgScore: monitored > 0 ? scoreWeight / monitored : null,
    activeRatio: monitored > 0 ? active / monitored : null,
  };
}

function LeafletRegionMap({
  summaries,
  selectedRegion,
  onSelectRegion,
  onHoverRegion,
}: {
  summaries: RegionHealthSummary[];
  selectedRegion: string;
  onSelectRegion: (regionKey: string) => void;
  onHoverRegion: (regionKey: string | null) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tilesReady, setTilesReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    async function initMap() {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const mapContainer = containerRef.current;
      const map = L.map(mapContainer, {
        center: [-5.5, 110.5],
        zoom: 5,
        minZoom: 3,
        maxZoom: 10,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      const tileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      })
        .on("loading", () => setTilesReady(false))
        .on("load", () => setTilesReady(true))
        .addTo(map);

      markerLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      const refreshSize = () => {
        map.invalidateSize({ pan: false });
      };
      requestAnimationFrame(refreshSize);
      window.setTimeout(refreshSize, 150);
      resizeObserver = new ResizeObserver(refreshSize);
      resizeObserver.observe(mapContainer);

      setMapReady(true);
      setTilesReady(tileLayer.isLoading ? !tileLayer.isLoading() : true);
    }

    initMap();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function renderMarkers() {
      const L = await import("leaflet");
      if (cancelled || !mapReady || !mapRef.current || !markerLayerRef.current) return;

      markerLayerRef.current.clearLayers();
      const mapSummaries = summaries.filter((summary) => summary.regionKey !== "nasional");

      for (const summary of mapSummaries) {
        const point = REGION_GEO_POINTS[summary.regionKey] ?? REGION_GEO_POINTS.unknown;
        const tone = getRegionHealthTone(summary);
        const style = REGION_TONE_STYLES[tone];
        const selected = selectedRegion === summary.regionKey;
        const size = Math.max(24, getBubbleRadius(summary.total) * 2);
        const icon = createRegionDivIcon(L, summary, size, style, selected);

        const marker = L.marker([point.lat, point.lng], {
          icon,
          keyboard: true,
          zIndexOffset: selected ? 1000 : 0,
        })
          .bindTooltip(getRegionTooltipHtml(summary), {
            direction: "top",
            offset: [0, -Math.round(size / 2)],
            opacity: 0.98,
            className: "region-leaflet-tooltip",
          })
          .on("click", () => onSelectRegion(summary.regionKey))
          .on("mouseover", () => onHoverRegion(summary.regionKey))
          .on("mouseout", () => onHoverRegion(null))
          .on("focus", () => onHoverRegion(summary.regionKey))
          .on("blur", () => onHoverRegion(null));

        marker.addTo(markerLayerRef.current);
      }

      mapRef.current.invalidateSize({ pan: false });

      const selectedSummary = mapSummaries.find((summary) => summary.regionKey === selectedRegion);
      if (selectedSummary) {
        const point = REGION_GEO_POINTS[selectedSummary.regionKey] ?? REGION_GEO_POINTS.unknown;
        window.setTimeout(() => mapRef.current?.flyTo([point.lat, point.lng], 8, { duration: 0.45 }), 0);
      } else if (mapSummaries.length > 0) {
        const bounds = L.latLngBounds(mapSummaries.map((summary) => {
          const point = REGION_GEO_POINTS[summary.regionKey] ?? REGION_GEO_POINTS.unknown;
          return [point.lat, point.lng];
        }));
        window.setTimeout(() => mapRef.current?.fitBounds(bounds, { padding: [28, 28], maxZoom: 6 }), 0);
      }
    }

    renderMarkers();

    return () => {
      cancelled = true;
    };
  }, [mapReady, summaries, selectedRegion, onSelectRegion, onHoverRegion]);

  return (
    <div className="region-leaflet-shell relative isolate overflow-hidden rounded-lg border border-[var(--g300)] bg-[var(--g100)]">
      <div ref={containerRef} className="h-[280px] w-full sm:h-[340px]" aria-label="Peta Leaflet health source kajian per region Indonesia" />
      {(!mapReady || !tilesReady) && (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[var(--paper)]/80 backdrop-blur-[1px]">
          <div className="rounded-full border border-[var(--g300)] bg-[var(--ivory)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--g600)] shadow-sm">
            Loading map…
          </div>
        </div>
      )}
    </div>
  );
}

function createRegionDivIcon(
  L: typeof import("leaflet"),
  summary: RegionHealthSummary,
  size: number,
  style: { fill: string; stroke: string; text: string; label: string },
  selected: boolean,
): DivIcon {
  const aggregate = summary.regionKey === "nasional" ? '<em class="region-leaflet-aggregate">aggregate</em>' : "";
  return L.divIcon({
    className: "region-leaflet-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div class="region-leaflet-marker${selected ? " is-selected" : ""}" style="--marker-size:${size}px;--marker-fill:${style.fill};--marker-stroke:${selected ? "var(--slate)" : style.stroke};">
        <span>${summary.total}</span>
        ${aggregate}
      </div>
    `,
  });
}

function getRegionTooltipHtml(summary: RegionHealthSummary): string {
  return `
    <strong>${summary.regionLabel}</strong>
    <span>${summary.total} sources · ${summary.monitored} monitored</span>
    <span>Active ${summary.active} · Dead ${summary.dead} · Unmon ${summary.unmonitored}</span>
    <span>Score ${formatRegionScore(summary)} · ${formatRegionRatio(summary)}</span>
  `;
}

function LegendDot({ tone }: { tone: RegionHealthTone }) {
  const style = REGION_TONE_STYLES[tone];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--g600)]">
      <span className="size-2.5 rounded-full" style={{ background: style.fill, border: `1px solid ${style.stroke}` }} />
      {style.text}
    </span>
  );
}

function RegionSummaryPanel({
  summary,
  selected,
  onClear,
}: {
  summary: RegionHealthSummary;
  selected: boolean;
  onClear: () => void;
}) {
  const tone = getRegionHealthTone(summary);
  const style = REGION_TONE_STYLES[tone];

  return (
    <aside className="rounded-xl border border-[var(--g300)] bg-[var(--ivory)] p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{selected ? "Selected region" : "All regions"}</p>
          <h4 className="font-semibold text-[17px] text-[var(--slate)]">{summary.regionLabel}</h4>
          <p className="mt-1 font-mono text-[11px] text-[var(--g500)]">
            {summary.total} sources · {summary.monitored} monitored
          </p>
        </div>
        <span className="shrink-0 whitespace-nowrap rounded-full px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-white" style={{ background: style.fill }}>
          {tone === "risk" ? "Attention" : style.label}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--g500)]">Avg score</div>
          <div className="mt-1 font-display text-[26px] leading-none text-[var(--slate)]">{formatRegionScore(summary)}</div>
        </div>
        <div className="rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2">
          <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--g500)]">Active ratio</div>
          <div className="mt-1 font-display text-[26px] leading-none text-[var(--slate)]">{formatRegionRatio(summary).replace(" active", "")}</div>
        </div>
      </div>

      <div className="space-y-2 font-mono text-[11px] text-[var(--g600)]">
        <StatusCount label="Active" value={summary.active} status="active" />
        <StatusCount label="Stale" value={summary.stale} status="stale" />
        <StatusCount label="Dead" value={summary.dead} status="dead" />
        <StatusCount label="Blocked" value={summary.blocked} status="blocked" />
        <StatusCount label="Error" value={summary.error} status="error" />
        <StatusCount label="Unmonitored" value={summary.unmonitored} status="unmonitored" />
      </div>

      {selected ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-4 w-full rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[12px] font-medium text-[var(--slate)] transition-colors hover:border-[var(--g500)]"
        >
          Clear region filter
        </button>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-[var(--g300)] bg-[var(--paper)] px-3 py-2 text-[12px] leading-relaxed text-[var(--g600)]">
          Pilih bubble kota/region untuk memfilter daftar source. Detail ini tetap muncul di mobile tanpa bergantung pada hover.
        </p>
      )}
    </aside>
  );
}

function StatusCount({ label, value, status }: { label: string; value: number; status: HealthStatus }) {
  const meta = STATUS_META[status];
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5">
        <span className={`size-1.5 rounded-full ${meta.dot}`} />
        {label}
      </span>
      <span className="font-semibold text-[var(--slate)]">{value}</span>
    </div>
  );
}

// ===== Skeleton components ====================================

function SkeletonBox({ w = "100%", h = 14, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div className="skeleton-box" style={{
      width: w, height: h, borderRadius: r, flexShrink: 0,
    }} />
  );
}

function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[var(--g300)] bg-[var(--paper)] px-5 py-4">
      <SkeletonBox w={44} h={44} r={44} />
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <SkeletonBox w={120} h={14} />
          <SkeletonBox w={52} h={18} r={12} />
        </div>
        <div className="flex gap-3">
          <SkeletonBox w={80} h={11} />
          <SkeletonBox w={60} h={11} />
        </div>
      </div>
      <SkeletonBox w={64} h={22} r={4} />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5" style={{ height: 220 }}>
      <div className="flex justify-between mb-4">
        <div className="space-y-2">
          <SkeletonBox w={140} h={16} />
          <SkeletonBox w={180} h={11} />
        </div>
        <SkeletonBox w={160} h={14} />
      </div>
      <SkeletonBox w="100%" h={150} r={8} />
    </div>
  );
}

// ===== Score explainer ========================================

const SCORE_TIERS = [
  { range: "≥ 80", label: "Last post < 7 hari", color: "text-[var(--jade)]" },
  { range: "50–79", label: "Last post 7–14 hari", color: "text-[var(--amber)]" },
  { range: "1–49", label: "Last post 14–30 hari", color: "text-[var(--rust)]" },
  { range: "0", label: "Last post > 30 hari atau error", color: "text-[var(--g500)]" },
];

function ScoreExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-[var(--g500)] hover:text-[var(--clay)] underline decoration-[var(--oat)] underline-offset-4 transition-colors">
        {open ? "▾ Sembunyikan cara hitung skor" : "▸ Bagaimana skor dihitung?"}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5 max-w-[650px]">
          <p className="eyebrow !text-[10px] mb-3">Reliability Score · Phase 1 (MVP)</p>
          <p className="text-[12.5px] text-[var(--g700)] mb-4 leading-relaxed">
            Skor saat ini dihitung murni dari <strong>freshness</strong> — seberapa baru postingan terakhir.
          </p>
          <div className="grid gap-2.5">
            {SCORE_TIERS.map((t) => (
              <div key={t.range} className="grid grid-cols-[72px_1px_minmax(0,1fr)] items-center gap-4">
                <span className={`font-display text-[21px] leading-none tabular-nums text-right ${t.color}`}>{t.range}</span>
                <span className="h-6 w-px bg-[var(--g200)]" aria-hidden="true" />
                <span className="text-[12.5px] leading-5 text-[var(--g700)]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Source card ============================================

function SourceCard({
  source,
  snapshot,
  index,
  parentSource,
  childCount,
}: {
  source: Source;
  snapshot?: Snapshot;
  index: number;
  parentSource?: Source;
  childCount: number;
}) {
  const [hovered, setHovered] = useState(false);
  const status: HealthStatus = snapshot?.status ?? "unmonitored";
  const score = confidenceToPercent(snapshot?.confidence_score);
  const meta = STATUS_META[status];
  const history = useMemo(() => generateHistory(source.id, status, score), [source.id, status, score]);
  const sparkColor = meta.ringColor;
  const lastPost = snapshot?.metrics?.last_post_at ?? null;
  const subs = snapshot?.metrics?.subscribers ?? null;

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-enter flex items-center gap-4 rounded-xl border bg-[var(--paper)] px-5 py-4 no-underline transition-all duration-200"
      style={{
        borderColor: hovered ? "var(--g500)" : "var(--g300)",
        transform: hovered ? "translateY(-1px)" : "none",
        boxShadow: hovered ? "0 4px 18px rgba(0,0,0,0.07)" : "none",
        animationDelay: `${Math.min(index * 35, 280)}ms`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ScoreRing score={score} status={status} size={44} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1.5">
          <span className="font-semibold text-[15px] text-[var(--slate)] truncate max-w-[200px]">{source.name}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-mono ${meta.bg} ${meta.fg} shrink-0`}>
            <span className={`size-1.5 rounded-full ${meta.dot} ${
              status === "active" ? "animate-[pulse-active_2s_ease_infinite]" :
              status === "stale" ? "animate-[pulse-checking_1.2s_ease_infinite]" : ""
            }`} />
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--g500)] opacity-60 shrink-0">
            {PLATFORM_ICONS[source.platform] ?? PLATFORM_ICONS.web}
          </span>
          {source.priority >= 4 && (
            <span className="font-mono text-[10px] text-[var(--g500)] shrink-0">archived</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[var(--g500)]">
          {source.handle && (
            <span className="font-mono text-[11.5px] truncate max-w-[180px]">@{source.handle}</span>
          )}
          {source.source_type && (
            <span className="font-mono text-[11px]">{source.source_type}</span>
          )}
          {source.parent_id && (
            <span className="font-mono text-[11px]">
              parent: {parentSource?.id ?? source.parent_id}
            </span>
          )}
          {!source.parent_id && childCount > 0 && (
            <span className="font-mono text-[11px]">children: {childCount}</span>
          )}
          {subs != null && <span>{formatNum(subs)} subs</span>}
          {lastPost && <span>{formatRelative(lastPost)}</span>}
        </div>
      </div>
      {/* Sparkline — hidden on small screens */}
      <div className="hidden sm:block shrink-0">
        <Sparkline data={history} width={68} height={26} color={sparkColor} />
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0"
        style={{ opacity: hovered ? 0.35 : 0.12, transition: "opacity 0.2s" }}>
        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}

// ===== Stat block in hero =====================================

function Stat({ label, value, accent }: { label: string; value: number; accent?: "jade" | "amber" | "rust" | "g500" }) {
  const color = accent === "jade" ? "text-[var(--jade)]"
    : accent === "amber" ? "text-[var(--amber)]"
    : accent === "rust" ? "text-[var(--rust)]"
    : accent === "g500" ? "text-[var(--g500)]"
    : "text-[var(--slate)]";
  return (
    <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4">
      <div className="eyebrow !text-[10px] mb-2">{label}</div>
      <div className={`font-display text-[32px] leading-none ${color}`}>{value}</div>
    </div>
  );
}

// ===== Main component =========================================

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
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setTimeout(() => setLoading(false), 900); },
      { threshold: 0.05 }
    );
    if (sectionRef.current) obs.observe(sectionRef.current);
    return () => obs.disconnect();
  }, []);

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
      <div ref={sectionRef}>

        <RegionHealthPanel
          summaries={regionSummaries}
          selectedRegion={regionFilter}
          onSelectRegion={setRegionFilter}
          hasSnapshot={Boolean(latest)}
        />

        {/* Trend chart */}
        <div className="mb-8">
          {loading ? <SkeletonChart /> : <TrendChart data={aggregateHistory} />}
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
              className="w-full rounded-lg border border-[var(--g300)] bg-[var(--paper)] py-2.5 pl-9 pr-3 text-[13.5px] text-[var(--slate)] outline-none focus:border-[var(--clay)] transition-colors"
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
            className="rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3 py-2.5 text-[13px] font-mono text-[var(--slate)] outline-none cursor-pointer"
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
        <div className="flex flex-col gap-2">
          {loading ? (
            [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          ) : filtered.length > 0 ? (
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
        {!loading && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 text-[13px] text-[var(--g700)] leading-relaxed">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong>confidence_score</strong> saat ini diturunkan dari 3 check dasar: <strong>http_fetch</strong> (40%), <strong>content_parse</strong> (35%), dan <strong>freshness</strong> (25%).
              Ini masih baseline Phase 1.5 — belum mencerminkan kualitas ekstraksi event penuh.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Formatters =============================================

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta",
    }).format(new Date(iso));
  } catch { return iso; }
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
  } catch { return iso; }
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
