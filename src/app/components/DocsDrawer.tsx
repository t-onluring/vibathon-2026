"use client";

import { useEffect, useRef, useState } from "react";
import type { DocFile } from "../lib/data";

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
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const doc = docs.find((d) => d.slug === activeSlug) ?? docs[0];

  return (
    <>
      {/* Backdrop */}
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

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Documentation"
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-[var(--ivory)] border-l border-[var(--g300)] shadow-2xl transition-transform duration-300"
        style={{
          width: "min(560px, 92vw)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--g300)] px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--g500)]">
              <path d="M3 2h7l4 4v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"
                stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-mono text-[13px] font-semibold tracking-[0.02em] text-[var(--slate)]">
              Documentation
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close documentation"
            className="flex size-8 items-center justify-center rounded-lg border border-[var(--g300)] bg-[var(--paper)] text-[var(--g500)] hover:text-[var(--slate)] hover:border-[var(--g500)] transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Doc tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--g300)] px-4 py-2 shrink-0">
          {docs.map((d) => (
            <button
              key={d.slug}
              type="button"
              onClick={() => setActiveSlug(d.slug)}
              className={[
                "shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-[11.5px] border transition-all duration-150",
                activeSlug === d.slug
                  ? "border-[var(--clay)] bg-[var(--clay)]/8 text-[var(--clay)] font-semibold"
                  : "border-transparent text-[var(--g500)] hover:text-[var(--slate)]",
              ].join(" ")}
            >
              {d.title}
            </button>
          ))}
        </div>

        {/* Content */}
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
    <div className="prose-doc">
      {content.split("\n").map((line, i) => {
        if (line.startsWith("# ")) {
          return <h1 key={i}>{line.slice(2)}</h1>;
        }
        if (line.startsWith("## ")) {
          return <h2 key={i}>{line.slice(3)}</h2>;
        }
        if (line.startsWith("### ")) {
          return <h3 key={i}>{line.slice(4)}</h3>;
        }
        if (line.startsWith("- ")) {
          return <li key={i} style={{ marginLeft: "1.2em" }}>{parseInline(line.slice(2))}</li>;
        }
        if (/^\d+\. /.test(line)) {
          return <li key={i} style={{ marginLeft: "1.2em" }}>{parseInline(line.replace(/^\d+\. /, ""))}</li>;
        }
        if (line.trim() === "" || line.trim() === "---") {
          return <br key={i} />;
        }
        return <p key={i}>{parseInline(line)}</p>;
      })}
    </div>
  );
}

function parseInline(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}
