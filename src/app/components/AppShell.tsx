"use client";

import { useState } from "react";
import { DocsTab } from "./DocsTab";
import { AppTab } from "./AppTab";
import type { DocFile, LatestSummary, Source } from "../lib/data";

type TabKey = "docs" | "app";

export function AppShell({
  docs,
  sources,
  latest,
}: {
  docs: DocFile[];
  sources: Source[];
  latest: LatestSummary | null;
}) {
  const [tab, setTab] = useState<TabKey>("docs");

  return (
    <div className="flex flex-1 flex-col">
      <nav className="sticky top-0 z-30 bg-[var(--ivory)]/95 backdrop-blur border-b border-[var(--g300)]">
        <div className="mx-auto max-w-[1180px] px-8">
          <div className="flex items-end gap-1">
            <TabButton active={tab === "docs"} onClick={() => setTab("docs")}>
              <span className="font-mono text-[10.5px] text-[var(--g500)] mr-2">01</span>
              Plan &amp; Roadmap
            </TabButton>
            <TabButton active={tab === "app"} onClick={() => setTab("app")}>
              <span className="font-mono text-[10.5px] text-[var(--g500)] mr-2">02</span>
              Live Dashboard
              {latest && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[var(--olive)]/15 px-2 py-0.5 text-[10.5px] font-mono text-[var(--olive)]">
                  <span className="size-1.5 rounded-full bg-[var(--olive)]" />
                  live
                </span>
              )}
            </TabButton>
          </div>
        </div>
      </nav>

      <main className="flex-1">
        {tab === "docs" ? <DocsTab docs={docs} /> : <AppTab sources={sources} latest={latest} />}
      </main>

      <footer className="border-t border-[var(--g300)] bg-[var(--ivory)]">
        <div className="mx-auto max-w-[1180px] px-8 py-8 flex flex-col sm:flex-row gap-4 justify-between text-[13px] text-[var(--g500)]">
          <p className="font-mono">
            <span className="text-[var(--clay)]">●</span> kajian-source-list · v0.1 (vibathon-2026)
          </p>
          <p>
            Data: <code className="text-[var(--g700)]">CC-BY-SA 4.0</code> · Code:{" "}
            <code className="text-[var(--g700)]">MIT</code>
          </p>
        </div>
      </footer>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "relative px-5 py-3.5 text-[14px] font-medium transition-colors",
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
