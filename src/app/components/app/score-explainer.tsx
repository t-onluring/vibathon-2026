"use client";

import { useState } from "react";

// Tiers reflect computeConfidenceScore() output (scripts/lib/score.ts):
// reach 25% + parse 40% + freshness 35% (tiered). Phase 2 adds extraction (+20%, rebalanced).
const SCORE_TIERS = [
  { range: "1.00", label: "Sumber aktif, post < 3 hari, semua sinyal ok", color: "text-[var(--jade)]" },
  { range: "0.93", label: "Post 3–7 hari (freshness 0.8)", color: "text-[var(--jade)]" },
  { range: "0.82", label: "Post 7–14 hari (freshness 0.5)", color: "text-[var(--amber)]" },
  { range: "0.72", label: "Post 14–30 hari (freshness 0.2)", color: "text-[var(--amber)]" },
  { range: "0.65", label: "Post > 30 hari — masih bisa diakses & dibaca, tapi stale", color: "text-[var(--rust)]" },
  { range: "0.25", label: "Hanya bisa dijangkau — parse gagal / grup tertutup / akun private", color: "text-[var(--rust)]" },
  { range: "0.00", label: "Tidak bisa dijangkau (link mati / error)", color: "text-[var(--g500)]" },
];

export function ScoreExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="text-[12px] text-[var(--g500)] hover:text-[var(--clay)] underline decoration-[var(--oat)] underline-offset-4 transition-colors">
        {open ? "▾ Sembunyikan cara hitung skor" : "▸ Bagaimana skor dihitung?"}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5 max-w-[650px]">
          <p className="eyebrow !text-[10px] mb-3">Confidence Score · Phase 2 prep</p>
          <p className="text-[12.5px] text-[var(--g700)] mb-4 leading-relaxed">
            Skor dihitung dari 3 sinyal: <strong>keterjangkauan</strong> (25%), <strong>keterbacaan</strong> (40%), dan <strong>kesegaran</strong> berjenjang (35%). Sinyal ke-4 — <strong>kualitas ekstraksi</strong> (+20%) — menyusul di Phase 2.
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
