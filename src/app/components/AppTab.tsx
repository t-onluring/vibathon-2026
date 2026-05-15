"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HealthStatus, LatestSummary, Platform, Snapshot, Source } from "../lib/data";
import { CronPanel } from "./CronPanel";

// ===== Config ==================================================

type SortKey = "score" | "name" | "subs";

const STATUS_META: Record<HealthStatus, { label: string; bg: string; fg: string; dot: string; ringColor: string }> = {
  active:      { label: "Active",      bg: "bg-[var(--olive)]/15",  fg: "text-[var(--olive)]",  dot: "bg-[var(--olive)]",  ringColor: "#788C5D" },
  stale:       { label: "Stale",       bg: "bg-[var(--clay)]/15",   fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay)]",   ringColor: "#D97757" },
  dead:        { label: "Dead",        bg: "bg-[var(--g300)]/40",   fg: "text-[var(--g700)]",   dot: "bg-[var(--g500)]",   ringColor: "#A0A097" },
  blocked:     { label: "Blocked",     bg: "bg-[var(--clay)]/15",   fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay-d)]", ringColor: "#B85C3E" },
  error:       { label: "Error",       bg: "bg-[var(--clay)]/10",   fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay-d)]", ringColor: "#D97757" },
  unmonitored: { label: "Unmonitored", bg: "bg-[var(--g100)]",      fg: "text-[var(--g500)]",   dot: "bg-[var(--g300)]",   ringColor: "#D1CFC5" },
};

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  telegram: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
    </svg>
  ),
  website: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  instagram: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/>
    </svg>
  ),
};

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

function generateAggregate(rows: { status: HealthStatus; score: number | null; id: string }[]) {
  return Array.from({ length: 30 }, (_, i) => {
    const scored = rows.map((r) => {
      const h = generateHistory(r.id, r.status, r.score);
      return h[i];
    }).filter((v): v is number => v !== null);
    return {
      day: i,
      avgScore: scored.length > 0 ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : 0,
      activeCount: scored.filter((v) => v >= 60).length,
      deadCount: scored.filter((v) => v < 30).length,
    };
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

function TrendChart({ data }: { data: ReturnType<typeof generateAggregate> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(800);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setW(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const h = w < 500 ? 160 : 200;
  const pad = { t: 20, r: 16, b: 28, l: 36 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const sx = iw / (data.length - 1);
  const sy = (v: number) => pad.t + ih - (v / 100) * ih;

  let linePath = "", areaPath = "";
  data.forEach((d, i) => {
    const x = pad.l + i * sx;
    const y = sy(d.avgScore);
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
          <p className="font-mono text-[11px] text-[var(--g500)] mt-0.5 tracking-[0.02em]">Avg score · last 30 days (simulated)</p>
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
        {data.map((_, i) => {
          const step = Math.ceil(data.length / 6);
          if (i % step !== 0 && i !== data.length - 1) return null;
          const x = pad.l + i * sx;
          const label = i === data.length - 1 ? "now" : `-${data.length - 1 - i}d`;
          return <text key={i} x={x} y={h - 8} fontSize="9.5" fill="var(--g500)" textAnchor="middle"
            fontFamily="var(--font-mono-stack)">{label}</text>;
        })}
        <path d={areaPath} fill="url(#trendGrad)" />
        <path d={(() => {
          let p = "";
          data.forEach((d, i) => {
            const x = pad.l + i * sx;
            const y = pad.t + ih - (d.activeCount / 15) * ih;
            p += (i === 0 ? "M" : " L") + x + "," + y;
          });
          return p;
        })()} fill="none" stroke="var(--olive)" strokeWidth="1.5" strokeLinejoin="round" opacity="0.7" />
        <path d={(() => {
          let p = "";
          data.forEach((d, i) => {
            const x = pad.l + i * sx;
            const y = pad.t + ih - (d.deadCount / 15) * ih;
            p += (i === 0 ? "M" : " L") + x + "," + y;
          });
          return p;
        })()} fill="none" stroke="var(--g500)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.5" />
        <path d={linePath} fill="none" stroke="var(--clay)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hoverIdx != null && data[hoverIdx] && (
          <g>
            <line x1={pad.l + hoverIdx * sx} y1={pad.t} x2={pad.l + hoverIdx * sx} y2={pad.t + ih}
              stroke="var(--slate)" strokeWidth="1" strokeDasharray="2 2" opacity="0.25" />
            <circle cx={pad.l + hoverIdx * sx} cy={sy(data[hoverIdx].avgScore)}
              r="4" fill="var(--paper)" stroke="var(--clay)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hoverIdx != null && data[hoverIdx] && (
        <div className="pointer-events-none absolute top-12 z-10 rounded-md bg-[var(--slate)] px-3 py-2 shadow-md"
          style={{ left: Math.min(Math.max(pad.l + hoverIdx * sx - 55, 12), w - 115), minWidth: 110 }}>
          <div className="font-mono text-[10px] text-[var(--ivory)]/60 mb-1.5">
            {hoverIdx === data.length - 1 ? "Today" : `${data.length - 1 - hoverIdx}d ago`}
          </div>
          {[["Avg", data[hoverIdx].avgScore], ["Active", data[hoverIdx].activeCount], ["Dead", data[hoverIdx].deadCount]].map(([k, v]) => (
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
  { range: "≥ 80", label: "Last post < 7 hari", color: "text-[var(--olive)]" },
  { range: "50–79", label: "Last post 7–14 hari", color: "text-[var(--clay)]" },
  { range: "1–49", label: "Last post 14–30 hari", color: "text-[var(--clay-d)]" },
  { range: "0", label: "Last post > 30 hari atau error", color: "text-[var(--g400)]" },
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
        <div className="mt-3 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 max-w-[520px]">
          <p className="eyebrow !text-[10px] mb-3">Reliability Score · Phase 1 (MVP)</p>
          <p className="text-[12.5px] text-[var(--g700)] mb-4 leading-relaxed">
            Skor saat ini dihitung murni dari <strong>freshness</strong> — seberapa baru postingan terakhir.
          </p>
          <div className="flex flex-col gap-2">
            {SCORE_TIERS.map((t) => (
              <div key={t.range} className="flex items-center gap-3">
                <span className={`font-serif text-[22px] leading-none w-12 text-right ${t.color}`}>{t.range}</span>
                <span className="text-[12px] text-[var(--g700)]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Source card ============================================

function SourceCard({ source, snapshot, index }: { source: Source; snapshot?: Snapshot; index: number }) {
  const [hovered, setHovered] = useState(false);
  const status: HealthStatus = snapshot?.status ?? "unmonitored";
  const score = snapshot?.reliability_score ?? null;
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
            <span className={`size-1.5 rounded-full ${meta.dot} ${status === "active" ? "animate-[pulse-dot_2s_ease_infinite]" : ""}`} />
            {meta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--g500)] opacity-60 shrink-0">
            {PLATFORM_ICONS[source.platform] ?? PLATFORM_ICONS.website}
          </span>
          {source.priority === "archived" && (
            <span className="font-mono text-[10px] text-[var(--g500)] shrink-0">archived</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[var(--g500)]">
          {source.handle && (
            <span className="font-mono text-[11.5px] truncate max-w-[180px]">@{source.handle}</span>
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

function Stat({ label, value, accent }: { label: string; value: number; accent?: "olive" | "clay" | "g500" }) {
  const color = accent === "olive" ? "text-[var(--olive)]"
    : accent === "clay" ? "text-[var(--clay-d)]"
    : accent === "g500" ? "text-[var(--g500)]"
    : "text-[var(--slate)]";
  return (
    <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4">
      <div className="eyebrow !text-[10px] mb-2">{label}</div>
      <div className={`font-serif text-[32px] leading-none ${color}`}>{value}</div>
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
  { key: "telegram", label: "Telegram" },
  { key: "website", label: "Website" },
  { key: "instagram", label: "Instagram" },
];

export function AppTab({ sources, latest }: { sources: Source[]; latest: LatestSummary | null }) {
  const [statusFilter, setStatusFilter] = useState<"all" | HealthStatus>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
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

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== "all") r = r.filter(({ snapshot }) => (snapshot?.status ?? "unmonitored") === statusFilter);
    if (platformFilter !== "all") r = r.filter(({ source }) => source.platform === platformFilter);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter(({ source }) =>
        source.name.toLowerCase().includes(q) || source.handle?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "score") r = [...r].sort((a, b) => (b.snapshot?.reliability_score ?? -1) - (a.snapshot?.reliability_score ?? -1));
    else if (sortBy === "name") r = [...r].sort((a, b) => a.source.name.localeCompare(b.source.name));
    else if (sortBy === "subs") r = [...r].sort((a, b) => (b.snapshot?.metrics?.subscribers ?? 0) - (a.snapshot?.metrics?.subscribers ?? 0));
    return r;
  }, [rows, statusFilter, platformFilter, search, sortBy]);

  const aggregateHistory = useMemo(() =>
    generateAggregate(rows.map(({ source, snapshot }) => ({
      id: source.id,
      status: snapshot?.status ?? "unmonitored",
      score: snapshot?.reliability_score ?? null,
    }))),
    [rows]
  );

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

  const hasActiveFilters = statusFilter !== "all" || platformFilter !== "all" || search;

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      {/* Stats hero */}
      <section className="mb-10">
        <p className="eyebrow mb-3">Phase 1 · Telegram Health Check Live</p>
        <h2 className="font-serif text-[clamp(28px,3.6vw,40px)] leading-tight text-[var(--slate)] max-w-[22ch]">
          Sumber kajian bukan sekadar daftar — ada yang{" "}
          <em className="italic text-[var(--clay)]">aktif</em>, ada yang{" "}
          <em className="italic text-[var(--clay)]">mati {oldestDeadLabel}</em>.
        </h2>
        <p className="mt-4 text-[var(--g700)] max-w-[640px]">
          {latest
            ? `Snapshot terakhir: ${formatDateTime(latest.generated_at)} WIB. Daily cron via GitHub Actions refresh otomatis tiap 00:01 WIB.`
            : `Belum ada snapshot. Trigger health check untuk generate data pertama kali.`}
        </p>
        {latest && (
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total" value={latest.total_sources} />
            <Stat label="Active" value={latest.by_status.active} accent="olive" />
            <Stat label="Stale + Dead" value={latest.by_status.stale + latest.by_status.dead} accent="clay" />
            <Stat label="Errors" value={latest.by_status.error} accent="g500" />
          </div>
        )}
        <ScoreExplainer />
      </section>

      <CronPanel lastRunAt={latest?.generated_at ?? null} />

      {/* Dashboard section */}
      <div ref={sectionRef}>
        {/* Trend chart */}
        <div className="mb-8">
          {loading ? <SkeletonChart /> : <TrendChart data={aggregateHistory} />}
        </div>

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
          <div className="mb-6 flex flex-wrap items-center gap-2">
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
        </div>

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-3 font-mono text-[12px] text-[var(--g500)]">
            <span>Showing {filtered.length} of {rows.length}</span>
            <button type="button" onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setSearch(""); }}
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
              <SourceCard key={source.id} source={source} snapshot={snapshot} index={i} />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--g300)] bg-[var(--g100)] p-12 text-center">
              <div className="text-3xl mb-3 opacity-30">🔍</div>
              <p className="text-[14px] text-[var(--g500)]">No sources match your filters.</p>
              <button type="button" onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setSearch(""); }}
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
              Skor dihitung dari <strong>freshness</strong> (40%), <strong>consistency</strong> (25%), <strong>volume</strong> (20%),{" "}
              <strong>engagement</strong> (10%), <strong>diversity</strong> (5%).
              MVP saat ini menggunakan freshness only — metric lain butuh historical data.
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
