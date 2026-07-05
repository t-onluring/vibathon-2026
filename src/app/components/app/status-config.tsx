import type { HealthStatus, Tier } from "../../lib/data";

// Operational status — "apakah channel hidup & dipantau?".
// Label Indonesia (disepakati 2026-07-05). Enum `HealthStatus` tak berubah.
export const STATUS_META: Record<HealthStatus, { label: string; bg: string; fg: string; dot: string; ringColor: string }> = {
  active:      { label: "Aktif",          bg: "bg-[var(--jade)]/15",   fg: "text-[var(--jade)]",   dot: "bg-[var(--jade)]",   ringColor: "#4D7C5F" },
  stale:       { label: "Kurang aktif",   bg: "bg-[var(--amber)]/15",  fg: "text-[var(--amber)]",  dot: "bg-[var(--amber)]",  ringColor: "#C4831A" },
  dead:        { label: "Tidak aktif",    bg: "bg-[var(--rust)]/12",   fg: "text-[var(--rust)]",   dot: "bg-[var(--rust)]",   ringColor: "#B84040" },
  blocked:     { label: "Terbatas",       bg: "bg-[var(--clay)]/12",   fg: "text-[var(--clay-d)]", dot: "bg-[var(--clay-d)]", ringColor: "#B85C3E" },
  error:       { label: "Gagal dicek",    bg: "bg-[var(--rust)]/10",   fg: "text-[var(--rust)]",   dot: "bg-[var(--rust)]",   ringColor: "#B84040" },
  unmonitored: { label: "Belum dipantau", bg: "bg-[var(--g100)]",      fg: "text-[var(--g500)]",   dot: "bg-[var(--g300)]",   ringColor: "#D1CFC5" },
};

// Confidence tier — "seberapa andal sumber sebagai pemberi data?".
// Sinyal bergradien, konsisten dgn `confidence_score`. Berbeda dari status:
// sebuah channel bisa `active` (operasional) tapi `low` (reach/parse lemah).
// `no-data` = tidak pernah dicek (unmonitored) — jangan dicampur dgn `low`.
export const TIER_META: Record<Tier, { label: string; bar: string; ringColor: string; threshold: string }> = {
  high:     { label: "Tinggi",      bar: "var(--olive)", ringColor: "#788C5D", threshold: "≥ 0.7" },
  mid:      { label: "Sedang",      bar: "var(--amber)", ringColor: "#C4831A", threshold: "0.4–0.69" },
  low:      { label: "Rendah",      bar: "var(--rust)",  ringColor: "#B84040", threshold: "< 0.4" },
  "no-data": { label: "Tanpa data", bar: "var(--g300)",  ringColor: "#D1CFC5", threshold: "belum dicek" },
};

export const PLATFORM_ICONS: Record<string, React.ReactNode> = {
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
