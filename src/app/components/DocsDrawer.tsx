"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DocFile } from "../lib/data";

const DEFAULT_OPEN_GROUPS: Record<string, boolean> = {
  "Start Here": true,
  "Build & Operate": true,
  "Collab & Decisions": true,
  Other: false,
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function DocsDrawer({
  docs,
  isOpen,
  onClose,
}: {
  docs: DocFile[];
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activeSlug, setActiveSlug] = useState<string>(docs[0]?.slug ?? "");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(DEFAULT_OPEN_GROUPS);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => !element.hasAttribute("disabled") && element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        drawerRef.current.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const doc = docs.find((d) => d.slug === activeSlug) ?? docs[0];
  const groupedDocs = useMemo(() => groupDocs(docs), [docs]);

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(20,20,19,0.45)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="docs-drawer-title"
        aria-hidden={!isOpen}
        inert={!isOpen}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-[var(--ivory)] border-l border-[var(--g300)] shadow-2xl transition-transform duration-300"
        style={{
          width: "min(560px, 92vw)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div className="flex items-center justify-between border-b border-[var(--g300)] px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--g500)]">
              <path d="M3 2h7l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
                stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span id="docs-drawer-title" className="font-mono text-[13px] font-semibold tracking-[0.02em] text-[var(--slate)]">
              Documentation
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close documentation"
            className="flex size-8 items-center justify-center rounded-lg border border-[var(--g300)] bg-[var(--paper)] text-[var(--g500)] transition-colors hover:text-[var(--slate)] hover:border-[var(--g500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clay)]/30"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto border-b border-[var(--g300)] px-4 py-3 shrink-0 max-h-[42vh]">
          {groupedDocs.map((group) => {
            const groupOpen = openGroups[group.label] ?? false;
            return (
              <div key={group.label} className="mb-3 last:mb-0">
                <button
                  type="button"
                  onClick={() => setOpenGroups((prev) => ({ ...prev, [group.label]: !groupOpen }))}
                  className="w-full flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--g500)] mb-1.5 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clay)]/30"
                  aria-expanded={groupOpen}
                >
                  <span>{group.label}</span>
                  <span className="text-[11px]">{groupOpen ? "−" : "+"}</span>
                </button>
                {groupOpen && (
                  <div className="flex flex-wrap gap-1">
                    {group.docs.map((d) => (
                      <button
                        key={d.slug}
                        type="button"
                        onClick={() => setActiveSlug(d.slug)}
                        className={[
                          "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-[11.5px] border transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--clay)]/30",
                          activeSlug === d.slug
                            ? "border-[var(--clay)] bg-[var(--clay)]/8 text-[var(--clay)] font-semibold"
                            : "border-transparent text-[var(--g500)] hover:text-[var(--slate)]",
                        ].join(" ")}
                      >
                        {d.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-7 prose-doc">
          {doc ? (
            <MarkdownDoc content={doc.content} />
          ) : (
            <p className="text-[var(--g500)] text-[14px]">No documentation found.</p>
          )}
        </div>
      </div>
    </>
  );
}

function MarkdownDoc({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ href, children }) => (
          <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function groupDocs(docs: DocFile[]): { label: string; docs: DocFile[] }[] {
  const groups = new Map<string, DocFile[]>();
  const order = ["Start Here", "Build & Operate", "Collab & Decisions", "Other"];

  for (const doc of docs) {
    const section = getDocSection(doc.slug);
    const existing = groups.get(section) ?? [];
    existing.push(doc);
    groups.set(section, existing);
  }

  return order
    .map((label) => ({ label, docs: groups.get(label) ?? [] }))
    .filter((group) => group.docs.length > 0);
}

function getDocSection(slug: string): string {
  if (slug.startsWith("00-") || slug.startsWith("01-")) return "Start Here";
  if (["02-", "03-", "04-", "05-", "06-"].some((prefix) => slug.startsWith(prefix))) {
    return "Build & Operate";
  }
  if (slug.startsWith("07-") || slug.startsWith("08-")) return "Collab & Decisions";
  return "Other";
}
