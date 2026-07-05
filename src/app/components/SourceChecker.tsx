"use client";

import { useState } from "react";
import type { Source, Snapshot, HealthStatus } from "../lib/data";

interface SourceCheckerProps {
  sources: Source[];
  snapshotById: Map<string, Snapshot>;
  onNotFound?: (handle: string) => void;
}

function normalizeHandle(input: string): { handle: string | null; isPrivate: boolean } {
  const s = input.trim();
  if (!s) return { handle: null, isPrivate: false };
  // Private channel invite link (+hash)
  if (/^https?:\/\/t\.me\/\+/.test(s) || /^@?\+/.test(s)) return { handle: null, isPrivate: true };
  const h = s
    .replace(/^https?:\/\/(www\.)?t\.me\//, "")
    .replace(/^t\.me\//, "")
    .replace(/^https?:\/\/(www\.)?youtube\.com\/(c\/|@|channel\/)?/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
    .replace(/^@/, "")
    .toLowerCase()
    .trim();
  return { handle: h || null, isPrivate: false };
}

function getHealthLabel(score: number | null | undefined, status: HealthStatus) {
  if (status === "dead" || status === "blocked") return { label: "Tidak Aktif", dot: "bg-red-500" };
  if (status === "stale") return { label: "Jarang Aktif", dot: "bg-yellow-500" };
  if (status === "error") return { label: "Error", dot: "bg-yellow-500" };
  if (status === "unmonitored") return { label: "Belum dipantau", dot: "bg-[var(--g400)]" };
  const s = score ?? 0;
  if (s >= 0.7) return { label: "Aktif", dot: "bg-[var(--olive)]" };
  if (s >= 0.4) return { label: "Cukup Aktif", dot: "bg-yellow-500" };
  return { label: "Jarang", dot: "bg-yellow-500" };
}

const PLATFORM_LABELS: Record<string, string> = {
  tg: "Telegram",
  yt: "YouTube",
  ig: "Instagram",
  web: "Website",
  wa: "WhatsApp",
};

export function SourceChecker({ sources, snapshotById, onNotFound }: SourceCheckerProps) {
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);

  const { handle, isPrivate } = normalizeHandle(query);

  const found = handle
    ? sources.find(
        (s) =>
          s.handle?.toLowerCase() === handle ||
          s.url?.toLowerCase().includes(`/${handle}`)
      )
    : undefined;

  const snapshot = found ? snapshotById.get(found.id) : undefined;

  const handleSearch = () => {
    if (!query.trim()) return;
    setSearched(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  const healthLabel = snapshot
    ? getHealthLabel(snapshot.confidence_score, snapshot.status)
    : null;

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[var(--g400)]">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M10 10l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSearched(false); }}
            onKeyDown={handleKeyDown}
            placeholder="@namachannel · t.me/... · atau nama channel"
            className="w-full rounded-lg border border-[var(--g300)] bg-[var(--paper)] py-2.5 pl-9 pr-4 text-[13.5px] text-[var(--slate)] placeholder:text-[var(--g400)] focus:border-[var(--clay)] focus:outline-none focus:ring-2 focus:ring-[var(--clay)]/20"
            aria-label="Cari channel berdasarkan handle atau URL"
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={!query.trim()}
          className="rounded-lg bg-[var(--slate)] px-4 py-2.5 text-[13px] font-medium text-[var(--ivory)] transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          Cek
        </button>
      </div>

      {/* Private invite link warning */}
      {query.trim() && isPrivate && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[var(--g300)] bg-[var(--g100)] px-4 py-3">
          <svg className="mt-0.5 shrink-0 text-[var(--g500)]" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7 4v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="7" cy="10" r="0.6" fill="currentColor" />
          </svg>
          <p className="text-[12.5px] text-[var(--g700)]">
            Link ini adalah undangan channel private — tidak bisa dicek otomatis.
            Silakan isi handle atau nama channel-nya secara manual.
          </p>
        </div>
      )}

      {/* Result: found */}
      {searched && found && (
        <div className="rounded-xl border border-[var(--olive)]/40 bg-[var(--olive)]/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13.5px] font-semibold text-[var(--slate)]">{found.name}</span>
                {found.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--olive)]/15 px-2 py-0.5 font-mono text-[10px] text-[var(--olive)]">
                    ✓ verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-mono text-[11.5px] text-[var(--g500)]">
                {PLATFORM_LABELS[found.platform] ?? found.platform}
                {found.handle ? ` · @${found.handle}` : ""}
              </p>
              {found.url && (
                <a
                  href={found.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block font-mono text-[11px] text-[var(--clay)] hover:underline truncate"
                >
                  {found.url}
                </a>
              )}
            </div>

            {/* Health badge */}
            {healthLabel && (
              <div className="shrink-0 flex items-center gap-1.5 rounded-full border border-[var(--g300)] bg-[var(--paper)] px-3 py-1">
                <span className={`size-1.5 rounded-full ${healthLabel.dot}`} />
                <span className="font-mono text-[11px] text-[var(--g700)]">{healthLabel.label}</span>
              </div>
            )}
          </div>

          {/* Metrics row */}
          {snapshot && (snapshot.metrics.subscribers != null || snapshot.metrics.last_post_age_hours != null) && (
            <div className="mt-3 flex flex-wrap gap-3 border-t border-[var(--g300)] pt-3">
              {snapshot.metrics.subscribers != null && (
                <span className="font-mono text-[11px] text-[var(--g500)]">
                  👥 {snapshot.metrics.subscribers.toLocaleString("id-ID")} subscriber
                </span>
              )}
              {snapshot.metrics.last_post_age_hours != null && (
                <span className="font-mono text-[11px] text-[var(--g500)]">
                  🕐 Post terakhir{" "}
                  {snapshot.metrics.last_post_age_hours < 24
                    ? `${Math.round(snapshot.metrics.last_post_age_hours)} jam lalu`
                    : `${Math.round(snapshot.metrics.last_post_age_hours / 24)} hari lalu`}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--olive)]/10 px-3 py-2">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="5" stroke="var(--olive)" strokeWidth="1.2" />
              <path d="M4 6.5l2 2 3-3" stroke="var(--olive)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] text-[var(--olive)] font-medium">
              Channel ini sudah terdaftar di registry.
            </span>
          </div>
        </div>
      )}

      {/* Result: not found */}
      {searched && !found && !isPrivate && query.trim() && (
        <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--clay)]/10">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="var(--clay)" strokeWidth="1.2" />
                <path d="M7 4.5v3" stroke="var(--clay)" strokeWidth="1.3" strokeLinecap="round" />
                <circle cx="7" cy="10" r="0.5" fill="var(--clay)" />
              </svg>
            </span>
            <div>
              <p className="text-[13px] font-semibold text-[var(--slate)]">
                Channel belum terdaftar
              </p>
              <p className="text-[12px] text-[var(--g500)]">
                {handle && <code className="text-[var(--clay)]">@{handle}</code>} belum ada di registry — kamu bisa mengusulkannya!
              </p>
            </div>
          </div>
          {onNotFound && handle && (
            <button
              type="button"
              onClick={() => onNotFound(handle)}
              className="mt-3 w-full rounded-lg bg-[var(--clay)] px-4 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
            >
              Usulkan channel ini →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
