"use client";

import { useEffect, useRef, useState } from "react";
import type { LatestSummary, Source } from "../lib/data";

// ===== Layer diagram =============================================

function LayerDiagram() {
  const [hoveredLayer, setHoveredLayer] = useState<number | null>(null);

  const layers = [
    {
      num: "L3",
      label: "Consumer Apps",
      sub: "Agregator, kajian finder, rekomendasi",
      color: "var(--clay)",
      bg: "rgba(217,119,87,0.08)",
    },
    {
      num: "L2",
      label: "Aggregator / Middleware",
      sub: "Platform yang mengkonsumsi API ini",
      color: "var(--olive)",
      bg: "rgba(120,140,93,0.08)",
    },
    {
      num: "L1",
      label: "Source List · kajian-source-list",
      sub: "Open registry + health monitoring (ini kita)",
      color: "var(--clay)",
      bg: "rgba(217,119,87,0.15)",
      highlight: true,
    },
    {
      num: "L0",
      label: "Source Channels",
      sub: "Telegram · Instagram · YouTube · Website",
      color: "var(--g500)",
      bg: "var(--g100)",
    },
  ];

  return (
    <div className="flex flex-col gap-1.5">
      {layers.map((layer, i) => (
        <div
          key={layer.num}
          onMouseEnter={() => setHoveredLayer(i)}
          onMouseLeave={() => setHoveredLayer(null)}
          className="relative flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-200 cursor-default"
          style={{
            background: hoveredLayer === i ? layer.bg : layer.highlight ? "rgba(217,119,87,0.08)" : "var(--paper)",
            borderColor: layer.highlight
              ? "rgba(217,119,87,0.3)"
              : hoveredLayer === i
              ? "var(--g400)"
              : "var(--g300)",
            transform: hoveredLayer === i ? "translateX(4px)" : "none",
          }}
        >
          <span
            className="shrink-0 font-mono text-[10px] font-bold w-6 text-right"
            style={{ color: layer.color }}
          >
            {layer.num}
          </span>
          <div className="flex-1 min-w-0">
            <div
              className="text-[13px] font-semibold"
              style={{ color: layer.highlight ? "var(--clay)" : "var(--slate)" }}
            >
              {layer.label}
              {layer.highlight && (
                <span className="ml-2 font-mono text-[9.5px] rounded px-1.5 py-0.5 bg-[var(--clay)]/12 text-[var(--clay)] uppercase tracking-[0.06em]">
                  ← kita
                </span>
              )}
            </div>
            <div className="text-[11.5px] text-[var(--g500)] mt-0.5">{layer.sub}</div>
          </div>
          {/* Arrow up (except last) */}
          {i < layers.length - 1 && (
            <svg
              className="absolute -bottom-[13px] left-1/2 -translate-x-1/2 z-10"
              width="12" height="12" viewBox="0 0 12 12" fill="none"
            >
              <path d="M6 1v10M2 7l4 4 4-4" stroke="var(--g300)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== API endpoint preview =====================================

function ApiPreview() {
  const [copied, setCopied] = useState<string | null>(null);

  const endpoints = [
    { method: "GET", path: "/v1/sources.json", desc: "Seluruh source registry" },
    { method: "GET", path: "/v1/latest.json", desc: "Snapshot kesehatan terbaru" },
    { method: "GET", path: "/v1/active.json", desc: "Source dengan status active" },
  ];

  const copy = (text: string) => {
    navigator.clipboard.writeText(`https://vibathon-2026.netlify.app${text}`).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] overflow-hidden">
      <div className="border-b border-[var(--g300)] bg-[var(--g100)] px-4 py-2.5 font-mono text-[10.5px] text-[var(--g500)] uppercase tracking-[0.08em]">
        Static API · Phase 1.5
      </div>
      {endpoints.map((ep) => (
        <div
          key={ep.path}
          className="flex items-center gap-3 border-b border-[var(--g200)] px-4 py-3 last:border-b-0 hover:bg-[var(--g100)] transition-colors group"
        >
          <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] bg-[var(--olive)]/12 text-[var(--olive)]">
            {ep.method}
          </span>
          <span className="flex-1 font-mono text-[12px] text-[var(--slate)]">{ep.path}</span>
          <span className="hidden sm:block text-[11.5px] text-[var(--g500)] flex-1">{ep.desc}</span>
          <button
            type="button"
            onClick={() => copy(ep.path)}
            className="opacity-0 group-hover:opacity-100 text-[11px] font-mono text-[var(--g500)] hover:text-[var(--clay)] transition-all"
          >
            {copied === ep.path ? "✓ copied" : "copy"}
          </button>
        </div>
      ))}
    </div>
  );
}

// ===== Section navigation cards =================================

function SectionCards({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const sections = [
    {
      num: "02",
      tab: "roadmap",
      title: "Plan & Roadmap",
      desc: "6 fase pengembangan dari konsolidasi hingga public dataset.",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      num: "03",
      tab: "architecture",
      title: "Architecture",
      desc: "Animasi layer-by-layer alur data dari source ke consumer.",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="2" width="14" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <rect x="1" y="10" width="14" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 6v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      num: "04",
      tab: "app",
      title: "Live Dashboard",
      desc: "Health monitoring real-time dengan score ring dan trend chart.",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 4v4l3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      num: "05",
      tab: "contribution",
      title: "Open Contribution",
      desc: "PR-based workflow dengan GitHub Issue Templates dan CI validasi.",
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 6v6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="5" cy="12" r="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 8h4a2 2 0 0 1 2 2v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {sections.map((s) => (
        <button
          key={s.tab}
          type="button"
          onClick={() => onNavigate(s.tab)}
          className="group text-left rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 hover:border-[var(--clay)] hover:shadow-sm transition-all duration-200"
        >
          <div className="flex items-center gap-2.5 mb-2">
            <span className="font-mono text-[10px] text-[var(--g500)]">{s.num}</span>
            <span className="text-[var(--g500)] group-hover:text-[var(--clay)] transition-colors">
              {s.icon}
            </span>
            <span className="font-semibold text-[13.5px] text-[var(--slate)]">{s.title}</span>
          </div>
          <p className="text-[12.5px] text-[var(--g500)] leading-relaxed">{s.desc}</p>
        </button>
      ))}
    </div>
  );
}

// ===== Main component ============================================

export function OverviewTab({
  sources,
  latest,
  onNavigate,
}: {
  sources: Source[];
  latest: LatestSummary | null;
  onNavigate: (tab: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const active = latest?.by_status.active ?? 0;
  const total = sources.length;
  const monitored = latest?.monitored ?? 0;

  return (
    <div
      ref={ref}
      className="mx-auto max-w-[1180px] px-8 py-10"
    >
      {/* Header */}
      <div
        className="mb-10 transition-all duration-700"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(12px)",
        }}
      >
        <p className="eyebrow mb-3">Vibathon 2026 · HSI IT Division</p>
        <h2 className="font-serif text-[clamp(28px,3.8vw,44px)] leading-tight text-[var(--slate)] mb-4 max-w-[26ch]">
          Open registry sumber kajian dengan{" "}
          <em className="italic text-[var(--clay)]">automated health monitoring</em>.
        </h2>
        <p className="text-[16px] text-[var(--g700)] max-w-[640px] leading-relaxed">
          Layer&nbsp;1 infrastructure — bukan kompetitor existing player, tapi{" "}
          <strong>data supplier</strong> untuk ekosistem kajian Sunnah Indonesia.
        </p>

        {/* Quick stats */}
        {latest && (
          <div className="mt-7 flex flex-wrap gap-6">
            {[
              { label: "Total Sources", value: total, color: "var(--slate)" },
              { label: "Active", value: active, color: "var(--olive)" },
              { label: "Monitored", value: monitored, color: "#5B8FB9" },
            ].map((s) => (
              <div key={s.label}>
                <span className="font-serif text-[40px] leading-none font-medium" style={{ color: s.color }}>
                  {s.value}
                </span>
                <span className="ml-2 font-mono text-[11px] text-[var(--g500)] uppercase tracking-[0.08em]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left */}
        <div>
          <p className="eyebrow mb-4">Layer Model</p>
          <p className="text-[13.5px] text-[var(--g700)] mb-5 leading-relaxed">
            Kita berada di Layer 1 — mengumpulkan dan memvalidasi sumber kajian, lalu
            menyediakan data melalui static API untuk siapapun yang mau membangun di atasnya.
          </p>
          <LayerDiagram />
        </div>

        {/* Right */}
        <div className="flex flex-col gap-8">
          <div>
            <p className="eyebrow mb-4">API Endpoints</p>
            <ApiPreview />
          </div>

          <div>
            <p className="eyebrow mb-4">Jelajahi Seksi</p>
            <SectionCards onNavigate={onNavigate} />
          </div>
        </div>
      </div>
    </div>
  );
}
