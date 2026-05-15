"use client";

import { useEffect, useRef, useState } from "react";

const LAYERS = [
  {
    id: "sources",
    num: "L0",
    label: "Sources",
    desc: "Telegram, Instagram, Facebook, WhatsApp, Website, YouTube — platform kajian yang dipantau.",
    color: "var(--clay)",
    colorRaw: "#D97757",
  },
  {
    id: "checker",
    num: "L1",
    label: "Health Checker",
    desc: "GitHub Actions cron — fetch + parse dengan 3× retry, 5s stagger, deteksi last post & subscriber count.",
    color: "var(--olive)",
    colorRaw: "#788C5D",
  },
  {
    id: "registry",
    num: "L2",
    label: "Source Registry",
    desc: "JSON-in-Git — sources.json (metadata) + latest.json (snapshot kesehatan terbaru). Open, versionable, auditable.",
    color: "#5B8FB9",
    colorRaw: "#5B8FB9",
  },
  {
    id: "api",
    num: "L3",
    label: "Static API",
    desc: "Netlify CDN — zero-auth, zero-cost, global edge. /v1/sources.json, /v1/latest.json, /v1/active.json.",
    color: "var(--clay)",
    colorRaw: "#D97757",
  },
  {
    id: "consumers",
    num: "L4",
    label: "Consumers",
    desc: "Aggregator, finder kajian, aplikasi rekomendasi, researcher NLP, dataset Hugging Face — semua consume API yang sama.",
    color: "var(--olive)",
    colorRaw: "#788C5D",
  },
];

export function ArchitectureTab() {
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <p className="eyebrow mb-2">03 · Layer 1 Infrastructure</p>
        <h2 className="font-serif text-[clamp(28px,3.4vw,40px)] leading-tight text-[var(--slate)] mb-3">
          Architecture
        </h2>
        <p className="text-[15px] text-[var(--g700)] max-w-[480px] leading-relaxed">
          Five-layer stack. Hover untuk detail tiap layer.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10 items-start">
        {/* Layer stack */}
        <div ref={ref} className="flex flex-col gap-2 max-w-[700px]">
          {LAYERS.map((layer, i) => {
            const isActive = activeLayer === layer.id;
            return (
              <div
                key={layer.id}
                onMouseEnter={() => setActiveLayer(layer.id)}
                onMouseLeave={() => setActiveLayer(null)}
                className="flex items-center gap-4 rounded-xl border px-5 py-4 cursor-default transition-all duration-250"
                style={{
                  background: isActive ? `${layer.colorRaw}10` : "var(--paper)",
                  borderColor: isActive ? `${layer.colorRaw}40` : "var(--g300)",
                  transform: isActive ? "translateX(8px) scale(1.01)" : "none",
                  opacity: visible ? 1 : 0,
                  animation: visible
                    ? `card-enter 0.5s ${i * 80}ms cubic-bezier(0.16,1,0.3,1) both`
                    : "none",
                }}
              >
                {/* Layer badge */}
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg border font-mono text-[12px] font-bold transition-all duration-250"
                  style={{
                    background: isActive ? layer.colorRaw : "var(--g100)",
                    borderColor: isActive ? layer.colorRaw : "var(--g300)",
                    color: isActive ? "#fff" : "var(--g500)",
                  }}
                >
                  {layer.num}
                </div>

                {/* Label + expandable desc */}
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[14.5px] font-semibold transition-colors duration-200"
                    style={{ color: isActive ? "var(--slate)" : "var(--slate)" }}
                  >
                    {layer.label}
                  </div>
                  <div
                    className="text-[12.5px] text-[var(--g600)] leading-relaxed overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: isActive ? "60px" : "0px",
                      opacity: isActive ? 1 : 0,
                      marginTop: isActive ? "4px" : "0px",
                    }}
                  >
                    {layer.desc}
                  </div>
                </div>

                {/* Arrow chevron */}
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className="shrink-0 transition-all duration-200"
                  style={{
                    opacity: isActive ? 0.6 : 0.15,
                    color: isActive ? layer.colorRaw : "currentColor",
                  }}
                >
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            );
          })}

          {/* Flow indicator */}
          <div className="mt-3 flex items-center gap-2 pl-1 font-mono text-[11px] text-[var(--g500)] tracking-[0.04em]">
            <svg width="12" height="14" viewBox="0 0 12 14" fill="none">
              <path d="M6 1v10M3 8l3 4 3-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Data flow: sources → checker → registry → API → consumers
          </div>
        </div>

        {/* Detail panel (desktop) */}
        <div className="hidden lg:block sticky top-[80px]">
          <div
            className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-5 transition-all duration-300"
            style={{
              opacity: activeLayer ? 1 : 0.35,
              transform: activeLayer ? "translateY(0)" : "translateY(6px)",
            }}
          >
            {activeLayer ? (
              (() => {
                const l = LAYERS.find((x) => x.id === activeLayer)!;
                return (
                  <>
                    <div className="mb-4 flex items-center gap-3">
                      <div
                        className="flex size-10 items-center justify-center rounded-lg font-mono text-[13px] font-bold text-white"
                        style={{ background: l.colorRaw }}
                      >
                        {l.num}
                      </div>
                      <div>
                        <div className="font-semibold text-[15px] text-[var(--slate)]">{l.label}</div>
                        <div className="font-mono text-[10.5px] text-[var(--g500)] mt-0.5">Layer {l.num.slice(1)}</div>
                      </div>
                    </div>
                    <p className="text-[13.5px] text-[var(--g700)] leading-relaxed mb-5">{l.desc}</p>
                    <div className="rounded-lg bg-[var(--g100)] border border-[var(--g200)] p-3">
                      <LayerDetail id={activeLayer} />
                    </div>
                  </>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mb-3 opacity-20">
                  <rect x="1" y="1" width="26" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="1" y="11" width="26" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="1" y="21" width="26" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <p className="text-[12.5px] text-[var(--g400)]">Hover salah satu layer untuk detail</p>
              </div>
            )}
          </div>

          {/* Architecture note */}
          <div className="mt-4 rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 text-[12.5px] text-[var(--g700)] leading-relaxed">
            <span className="font-semibold text-[var(--clay-d)]">Positioning:</span>{" "}
            Kita Layer 1 — bukan kompetitor existing agregator (L2/L3), tapi{" "}
            <strong>data supplier</strong> yang memungkinkan mereka dibangun.
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Per-layer detail snippets ================================

function LayerDetail({ id }: { id: string }) {
  const details: Record<string, React.ReactNode> = {
    sources: (
      <div className="space-y-1.5 font-mono text-[11px]">
        {[
          ["telegram", "Grup & channel kajian", "var(--olive)"],
          ["instagram", "Akun dakwah sunnah", "var(--clay)"],
          ["website", "Blog & portal kajian", "#5B8FB9"],
          ["youtube", "Channel video — Phase 2", "var(--g400)"],
        ].map(([p, d, c]) => (
          <div key={String(p)} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: String(c) }} />
            <span style={{ color: String(c) }}>{String(p)}</span>
            <span className="text-[var(--g500)]">·</span>
            <span className="text-[var(--g600)]">{String(d)}</span>
          </div>
        ))}
      </div>
    ),
    checker: (
      <div className="space-y-1 font-mono text-[11px] text-[var(--g600)]">
        <div>⏰ cron: <span className="text-[var(--olive)]">0 17 * * *</span> (00:01 WIB)</div>
        <div>🔁 retry: <span className="text-[var(--olive)]">3×</span> dengan 5s stagger</div>
        <div>📊 score: freshness → reliability_score</div>
        <div>🏃 runtime: <span className="text-[var(--olive)]">GitHub Actions</span></div>
      </div>
    ),
    registry: (
      <div className="space-y-1 font-mono text-[11px] text-[var(--g600)]">
        <div>📄 <span className="text-[#5B8FB9]">sources.json</span> — metadata</div>
        <div>📊 <span className="text-[#5B8FB9]">latest.json</span> — snapshots</div>
        <div>🔖 versioned via <span className="text-[#5B8FB9]">git history</span></div>
        <div>✅ validated by CI on PR</div>
      </div>
    ),
    api: (
      <div className="space-y-1 font-mono text-[11px] text-[var(--g600)]">
        <div><span className="text-[var(--clay)]">GET</span> /v1/sources.json</div>
        <div><span className="text-[var(--clay)]">GET</span> /v1/latest.json</div>
        <div><span className="text-[var(--clay)]">GET</span> /v1/active.json</div>
        <div>🌐 Netlify CDN — zero-auth</div>
      </div>
    ),
    consumers: (
      <div className="space-y-1.5 font-mono text-[11px] text-[var(--g600)]">
        <div>🏗️ Aggregator platform</div>
        <div>📱 Kajian finder apps</div>
        <div>🔬 NLP researchers</div>
        <div>📦 Hugging Face dataset — Phase 4</div>
      </div>
    ),
  };

  return details[id] ?? null;
}
