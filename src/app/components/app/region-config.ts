// Region types, constants, and pure helpers shared across the dashboard.
// Tier counts live alongside status counts so the legend can show the
// confidence dimension separately from the operational one.

import type { Tier } from "../../lib/data";

export type RegionHealthTone = "healthy" | "risk" | "unknown";

export type RegionGeoPoint = {
  lat: number;
  lng: number;
};

export type RegionHealthSummary = {
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
  // Confidence-tier counts, parallel to the status counts above. Lets the
  // legend separate "status operasional" from "tier konfidensial".
  tierHigh: number;
  tierMid: number;
  tierLow: number;
  tierNoData: number;
};

export const REGION_LABELS: Record<string, string> = {
  australia: "Australia",
  nasional: "Nasional",
  "united-kingdom": "United Kingdom",
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

export const INTERNATIONAL_REGION_KEYS = new Set(["australia", "united-kingdom"]);

export const REGION_GEO_POINTS: Record<string, RegionGeoPoint> = {
  // Fallback sentinel: regions with no known coordinates render here
  unknown: { lat: -8.4095, lng: 115.1889 },
  // Aggregate
  nasional: { lat: -2.5, lng: 118.0 },
  // Jabodetabek
  jakarta: { lat: -6.2088, lng: 106.8456 },
  "jakarta-selatan": { lat: -6.2607, lng: 106.8106 },
  "jakarta-timur": { lat: -6.2253, lng: 106.9004 },
  depok: { lat: -6.4025, lng: 106.7942 },
  bekasi: { lat: -6.2349, lng: 106.9896 },
  bogor: { lat: -6.5971, lng: 106.8060 },
  cibubur: { lat: -6.3540, lng: 106.8742 },
  tangerang: { lat: -6.1783, lng: 106.6319 },
  cilegon: { lat: -6.0022, lng: 106.0536 },
  // West Java
  bandung: { lat: -6.9175, lng: 107.6191 },
  cimahi: { lat: -6.8722, lng: 107.5425 },
  kuningan: { lat: -6.9758, lng: 108.4831 },
  karawang: { lat: -6.3222, lng: 107.3325 },
  // Central Java
  magelang: { lat: -7.4712, lng: 110.2178 },
  kudus: { lat: -6.8040, lng: 110.8402 },
  solo: { lat: -7.5755, lng: 110.8243 },
  yogyakarta: { lat: -7.7956, lng: 110.3695 },
  // East Java
  jember: { lat: -8.1845, lng: 113.6700 },
  wlingi: { lat: -8.1000, lng: 112.3200 },
  surabaya: { lat: -7.2575, lng: 112.7521 },
  gresik: { lat: -7.1567, lng: 112.6555 },
  // Sumatra
  lampung: { lat: -5.4500, lng: 105.2660 },
  // Kalimantan
  balikpapan: { lat: -1.2379, lng: 116.8529 },
  // Sulawesi: normalizeRegionKey("Sulawesi Selatan") -> "sulawesi-selatan"
  "sulawesi-selatan": { lat: -5.1477, lng: 119.4327 },
  // International: shown on map but excluded from auto-fitBounds
  australia: { lat: -33.8688, lng: 151.2093 },
  "united-kingdom": { lat: 51.5074, lng: -0.1278 },
};

export const REGION_TONE_STYLES: Record<RegionHealthTone, { fill: string; stroke: string; text: string; label: string }> = {
  healthy: { fill: "var(--jade)", stroke: "#3A5E47", text: "Sehat", label: "Sehat" },
  risk: { fill: "var(--amber)", stroke: "#9A6514", text: "Perlu perhatian", label: "Perlu perhatian" },
  unknown: { fill: "var(--g300)", stroke: "var(--g500)", text: "Belum dipantau", label: "Belum dipantau" },
};

export function normalizeRegionKey(value: string | null | undefined): string {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return normalized || "unknown";
}

export function titleCaseRegion(regionKey: string): string {
  return regionKey
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown Region";
}

export function getRegionLabel(regionKey: string): string {
  return REGION_LABELS[regionKey] ?? titleCaseRegion(regionKey);
}

export function getBubbleRadius(total: number): number {
  return Math.max(5, Math.min(15, 4 + Math.sqrt(total) * 2.5));
}

export function getRegionHealthTone(summary: RegionHealthSummary): RegionHealthTone {
  if (summary.monitored === 0) return "unknown";
  if ((summary.activeRatio ?? 0) >= 0.7) return "healthy";
  return "risk";
}

export function formatRegionRatio(summary: RegionHealthSummary): string {
  return summary.activeRatio != null ? `${Math.round(summary.activeRatio * 100)}% aktif` : "n/a";
}

export function formatRegionScore(summary: RegionHealthSummary): string {
  return summary.avgScore != null ? String(Math.round(summary.avgScore * 100)) : "n/a";
}

/**
 * Empty tier-count shape, used as a base for accumulation and as a fallback
 * when no snapshots exist. Mirrors `EMPTY_BY_TIER` in `data.ts`.
 */
export const EMPTY_REGION_TIER_COUNTS = {
  tierHigh: 0,
  tierMid: 0,
  tierLow: 0,
  tierNoData: 0,
} as const;

export type RegionTierCounts = {
  tierHigh: number;
  tierMid: number;
  tierLow: number;
  tierNoData: number;
};

/** Map a `Tier` enum to its field name on `RegionHealthSummary`. */
export function tierFieldFor(tier: Tier): keyof RegionTierCounts {
  switch (tier) {
    case "high": return "tierHigh";
    case "mid": return "tierMid";
    case "low": return "tierLow";
    case "no-data": return "tierNoData";
  }
}

export function buildAllRegionSummary(summaries: RegionHealthSummary[]): RegionHealthSummary {
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  const monitored = summaries.reduce((sum, summary) => sum + summary.monitored, 0);
  const active = summaries.reduce((sum, summary) => sum + summary.active, 0);
  const stale = summaries.reduce((sum, summary) => sum + summary.stale, 0);
  const dead = summaries.reduce((sum, summary) => sum + summary.dead, 0);
  const blocked = summaries.reduce((sum, summary) => sum + summary.blocked, 0);
  const error = summaries.reduce((sum, summary) => sum + summary.error, 0);
  const unmonitored = summaries.reduce((sum, summary) => sum + summary.unmonitored, 0);
  const scoreWeight = summaries.reduce((sum, summary) => sum + (summary.avgScore ?? 0) * summary.monitored, 0);
  const tierHigh = summaries.reduce((sum, s) => sum + s.tierHigh, 0);
  const tierMid = summaries.reduce((sum, s) => sum + s.tierMid, 0);
  const tierLow = summaries.reduce((sum, s) => sum + s.tierLow, 0);
  const tierNoData = summaries.reduce((sum, s) => sum + s.tierNoData, 0);

  return {
    regionKey: "all",
    regionLabel: "Semua region",
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
    tierHigh,
    tierMid,
    tierLow,
    tierNoData,
  };
}

/**
 * Dev-time guard: call with all regionKeys visible in a render pass to surface
 * missing REGION_GEO_POINTS entries early. Returns missing keys so callers can
 * log them. Does NOT throw (map degrades gracefully via `unknown` fallback).
 *
 * Skipped for "nasional" (aggregate row, never rendered on the map) and
 * "unknown" (the fallback itself).
 */
export function warnMissingGeoPoints(regionKeys: string[]): string[] {
  const skip = new Set(["nasional", "unknown"]);
  const missing = regionKeys.filter((k) => !skip.has(k) && !(k in REGION_GEO_POINTS));
  if (missing.length > 0) {
    console.error(
      "[region-config] Missing geo points - add these to REGION_GEO_POINTS in region-config.ts:\n  " +
        missing.map((k) => JSON.stringify(k)).join(", "),
    );
  }
  return missing;
}
