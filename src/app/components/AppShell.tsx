"use client";

import { useState } from "react";
import { OverviewTab } from "./OverviewTab";
import { RoadmapSection } from "./RoadmapSection";
import { AppTab } from "./AppTab";
import { ArchitectureTab } from "./ArchitectureTab";
import { OpenContributionTab } from "./OpenContributionTab";
import { DocsDrawer } from "./DocsDrawer";
import { FeedbackFAB } from "./FeedbackFAB";
import type { DocFile, LatestSummary, Source } from "../lib/data";

type TabKey = "overview" | "roadmap" | "architecture" | "app" | "contribution";

export function AppShell({
  docs,
  sources,
  latest,
}: {
  docs: DocFile[];
  sources: Source[];
  latest: LatestSummary | null;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [docsOpen, setDocsOpen] = useState(false);

  return (
    <div className="flex flex-1 flex-col">
      <nav className="sticky top-0 z-30 bg-[var(--ivory)]/95 backdrop-blur border-b border-[var(--g300)]">
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="flex items-end gap-1 justify-between" role="tablist" aria-label="Main sections">
            <div className="flex items-end gap-1 overflow-x-auto">
              <TabButton id="tab-overview" controls="panel-overview" active={tab === "overview"} onClick={() => setTab("overview")}>
                <span className="font-mono text-[10.5px] text-[var(--g500)] mr-2">01</span>
                Overview
              </TabButton>
              <TabButton id="tab-roadmap" controls="panel-roadmap" active={tab === "roadmap"} onClick={() => setTab("roadmap")}>
                <span className="font-mono text-[10.5px] text-[var(--g500)] mr-2">02</span>
                Plan &amp; Roadmap
              </TabButton>
              <TabButton id="tab-architecture" controls="panel-architecture" active={tab === "architecture"} onClick={() => setTab("architecture")}>
                <span className="font-mono text-[10.5px] text-[var(--g500)] mr-2">03</span>
                Architecture
              </TabButton>
              <TabButton id="tab-app" controls="panel-app" active={tab === "app"} onClick={() => setTab("app")}>
                <span className="font-mono text-[10.5px] text-[var(--g500)] mr-2">04</span>
                Live Dashboard
                {latest && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[var(--olive)]/15 px-2 py-0.5 text-[10.5px] font-mono text-[var(--olive)]">
                    <span className="size-1.5 rounded-full bg-[var(--olive)]" />
                    live
                  </span>
                )}
              </TabButton>
              <TabButton id="tab-contribution" controls="panel-contribution" active={tab === "contribution"} onClick={() => setTab("contribution")}>
                <span className="font-mono text-[10.5px] text-[var(--g500)] mr-2">05</span>
                Contribute
              </TabButton>
            </div>

            {/* Docs button */}
            <button
              type="button"
              onClick={() => setDocsOpen(true)}
              className="mb-1 inline-flex items-center gap-2 rounded-lg border border-[var(--g300)] bg-[var(--paper)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--g700)] hover:border-[var(--clay)] hover:text-[var(--clay)] transition-colors shrink-0"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 1.5h5.5l3.5 3.5v6.5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z"
                  stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M7 1.5v4h3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3.5 7h5M3.5 9h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="hidden sm:inline">Docs</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div role="tabpanel" id="panel-overview" aria-labelledby="tab-overview" hidden={tab !== "overview"}>
          <OverviewTab sources={sources} latest={latest} onNavigate={(t) => setTab(t as TabKey)} />
        </div>
        <div role="tabpanel" id="panel-roadmap" aria-labelledby="tab-roadmap" hidden={tab !== "roadmap"}>
          <div className="mx-auto max-w-[1180px] px-8 py-10">
            <RoadmapSection />
          </div>
        </div>
        <div role="tabpanel" id="panel-architecture" aria-labelledby="tab-architecture" hidden={tab !== "architecture"}>
          <ArchitectureTab />
        </div>
        <div role="tabpanel" id="panel-app" aria-labelledby="tab-app" hidden={tab !== "app"}>
          <AppTab sources={sources} latest={latest} />
        </div>
        <div role="tabpanel" id="panel-contribution" aria-labelledby="tab-contribution" hidden={tab !== "contribution"}>
          <OpenContributionTab />
        </div>
      </main>

      <footer className="border-t border-[var(--g300)] bg-[var(--ivory)]">
        <div className="mx-auto max-w-[1180px] px-8 py-8 flex flex-col sm:flex-row gap-4 justify-between text-[13px] text-[var(--g500)]">
          <p className="font-mono">
            <span className="text-[var(--clay)]">●</span> kajian-source-list · v0.1 (vibathon-2026)
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <a
              href="https://forms.gle/e7yQcpawniKtmffc9"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--clay)] hover:opacity-70 transition-opacity"
            >
              📝 Beri Feedback
            </a>
            <span className="text-[var(--g300)]">·</span>
            <p>
              Data: <code className="text-[var(--g700)]">CC-BY-SA 4.0</code> · Code:{" "}
              <code className="text-[var(--g700)]">MIT</code>
            </p>
          </div>
        </div>
      </footer>

      <DocsDrawer docs={docs} isOpen={docsOpen} onClose={() => setDocsOpen(false)} />
      <FeedbackFAB />
    </div>
  );
}

function TabButton({
  id,
  controls,
  active,
  onClick,
  children,
}: {
  id: string;
  controls: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      id={id}
      role="tab"
      type="button"
      aria-selected={active}
      aria-controls={controls}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={[
        "relative px-4 py-3.5 text-[13.5px] font-medium transition-colors whitespace-nowrap shrink-0",
        "border-b-2 -mb-[1.5px]",
        active
          ? "border-[var(--clay)] text-[var(--slate)]"
          : "border-transparent text-[var(--g500)] hover:text-[var(--slate)]",
      ].join(" ")}
    >
      <span className="inline-flex items-center">{children}</span>
    </button>
  );
}
