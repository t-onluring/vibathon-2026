"use client";

import { useEffect, useRef, useState } from "react";

type PhaseStatus = "done" | "current" | "next" | "upcoming";

interface Phase {
  id: string;
  label: string;
  desc: string;
  status: PhaseStatus;
}

const PHASES: Phase[] = [
  {
    id: "0",
    label: "Phase 0: Konsolidasi",
    desc: "Inventarisasi sumber dari berbagai platform, pembersihan duplikat, dan normalisasi format data.",
    status: "done",
  },
  {
    id: "1",
    label: "Phase 1: Vibathon Scope",
    desc: "Open registry + automated health monitoring Telegram. Dashboard publik dengan reliability score. Daily cron via GitHub Actions.",
    status: "current",
  },
  {
    id: "1.5",
    label: "Phase 1.5: API Publishing",
    desc: "Formalisasi static JSON sebagai public API (/v1/sources.json). Tambah schema docs, CORS headers, versioning, dan update frequency commitment untuk aggregator.",
    status: "next",
  },
  {
    id: "2",
    label: "Phase 2: Multi-Platform",
    desc: "Extend monitoring ke Instagram, YouTube, Facebook, dan website. Unified schema lintas platform.",
    status: "upcoming",
  },
  {
    id: "3",
    label: "Phase 3: Open Contribution",
    desc: "PR-based contribution workflow dengan GitHub Issue Templates, CI schema validation, dan automated health check post-merge.",
    status: "done",
  },
  {
    id: "4",
    label: "Phase 4: Public Dataset",
    desc: "Export ke Hugging Face dataset format. Historical snapshots tersedia untuk riset NLP dan analisis konten Islam.",
    status: "upcoming",
  },
];

export function RoadmapSection() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="mb-10 rounded-2xl border border-[var(--g300)] bg-[var(--paper)] p-6">
      <p className="eyebrow mb-2">Peta Jalan</p>
      <h2 className="font-serif text-[clamp(22px,2.8vw,30px)] leading-tight text-[var(--slate)] mb-6">
        Enam fase dari konsolidasi hingga public dataset.
      </h2>

      {/* Timeline */}
      <div className="relative max-w-[680px]">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-[var(--g300)]" />

        <div className="flex flex-col">
          {PHASES.map((phase, i) => {
            const isDone = phase.status === "done";
            const isCurrent = phase.status === "current";
            const isNext = phase.status === "next";

            return (
              <div
                key={phase.id}
                className="flex gap-5 py-4 transition-all duration-500"
                style={{
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(12px)",
                  transitionDelay: `${i * 90}ms`,
                }}
              >
                {/* Node circle */}
                <div
                  className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    border: `2px solid ${
                      isCurrent ? "var(--clay)"
                      : isDone ? "var(--olive)"
                      : isNext ? "rgba(217,119,87,0.5)"
                      : "var(--g300)"
                    }`,
                    borderStyle: isNext ? "dashed" : "solid",
                    background: isCurrent ? "rgba(217,119,87,0.1)"
                      : isDone ? "rgba(120,140,93,0.1)"
                      : isNext ? "rgba(217,119,87,0.05)"
                      : "var(--paper)",
                  }}
                >
                  {isDone ? (
                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8l3.5 3.5L13 5" stroke="var(--olive)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span
                      className="font-mono font-bold"
                      style={{
                        fontSize: phase.id.length > 1 ? 10 : 13,
                        color: isCurrent ? "var(--clay)"
                          : isNext ? "var(--clay)"
                          : "var(--g500)",
                      }}
                    >
                      {phase.id}
                    </span>
                  )}
                  {/* Pulse ring for current */}
                  {isCurrent && (
                    <div
                      className="absolute inset-[-5px] rounded-full border-2 border-[var(--clay)]/30"
                      style={{ animation: "pulse 2s ease infinite" }}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pb-1 pt-1.5">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3
                      className="text-[14.5px] font-semibold"
                      style={{ color: isDone || isCurrent || isNext ? "var(--slate)" : "var(--g600)" }}
                    >
                      {phase.label}
                    </h3>
                    {isCurrent && (
                      <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] bg-[var(--clay)]/12 text-[var(--clay)]">
                        Current
                      </span>
                    )}
                    {isDone && (
                      <span className="rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] bg-[var(--olive)]/12 text-[var(--olive)]">
                        Done
                      </span>
                    )}
                    {isNext && (
                      <span className="rounded border border-dashed border-[var(--clay)]/40 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.06em] bg-[var(--clay)]/8 text-[var(--clay)]">
                        Next ↑
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--g700)]">
                    {phase.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
