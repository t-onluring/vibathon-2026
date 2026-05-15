"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Issue",
  "Pull Request",
  "CI Validate",
  "Merge",
] as const;

export function OpenContributionTab() {
  return (
    <section className="mx-auto max-w-[1180px] px-8 py-10">
      <div className="rounded-2xl border border-[var(--g300)] bg-white p-6 md:p-8 shadow-sm">
        <p className="eyebrow mb-3">Phase 3</p>
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--slate)] mb-3">
          Open Contribution (Git PR-based)
        </h2>
        <p className="text-[15px] leading-relaxed text-[var(--g700)] mb-6 max-w-3xl">
          Kontributor bisa mengusulkan source baru atau update source lewat issue template dan PR,
          lalu otomatis divalidasi oleh CI sebelum merge.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          <ContributionFlowGraphic />

          <div>
            <ol className="list-decimal pl-5 space-y-2 text-[15px] text-[var(--g700)] mb-6">
              <li>Buat issue: <code>Source Add</code> atau <code>Source Update</code>.</li>
              <li>Fork repo, edit <code>data/sources.json</code>, lalu buka PR.</li>
              <li>Jalankan validasi lokal: <code>npm run validate:sources</code>.</li>
              <li>CI menjalankan schema/duplicate check + link check warning-only.</li>
            </ol>

            <div className="rounded-xl border border-[var(--g300)] bg-[var(--paper)] p-4 text-[14px] text-[var(--g700)] space-y-1">
              <p>Detail lengkap:</p>
              <p><code>CONTRIBUTING.md</code></p>
              <p><code>docs/CONTRIBUTOR_GUIDE.md</code></p>
              <p><code>data/docs/open-contribution.md</code></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContributionFlowGraphic() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="rounded-xl border border-[var(--g300)] bg-[var(--ivory)] p-4" aria-label="Open contribution flow animation">
      <svg viewBox="0 0 520 240" className="w-full h-auto" role="img" aria-label="Issue to merge contribution flow">
        {STEPS.map((label, i) => {
          const x = 20 + i * 125;
          const isActive = i === activeStep;
          return (
            <g key={label}>
              <rect
                x={x}
                y={80}
                rx={12}
                width={110}
                height={64}
                fill={isActive ? "var(--clay)" : "var(--paper)"}
                stroke="var(--g300)"
                strokeWidth={1.5}
              />
              <text
                x={x + 55}
                y={118}
                textAnchor="middle"
                fontSize="13"
                fontWeight={600}
                fill={isActive ? "white" : "var(--slate)"}
              >
                {label}
              </text>
              {i < STEPS.length - 1 && (
                <line
                  x1={x + 110}
                  y1={112}
                  x2={x + 125}
                  y2={112}
                  stroke={i < activeStep ? "var(--olive)" : "var(--g400)"}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
