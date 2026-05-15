"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { DocFile } from "../lib/data";
import { RoadmapSection } from "./RoadmapSection";

export function DocsTab({ docs }: { docs: DocFile[] }) {
  const [activeSlug, setActiveSlug] = useState(docs[0]?.slug ?? "");
  const active = docs.find((d) => d.slug === activeSlug) ?? docs[0];

  const toc = useMemo(() => extractToc(active?.content ?? ""), [active]);

  if (!active) {
    return (
      <div className="mx-auto max-w-[1180px] px-8 py-20 text-[var(--g500)]">
        Tidak ada dokumen di <code>data/docs/</code>.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-10">
      <RoadmapSection />
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_220px] gap-10">
      {/* Doc list (left) */}
      <aside className="lg:sticky lg:top-[72px] lg:self-start">
        <p className="eyebrow mb-4">Dokumen</p>
        <ul className="flex flex-col gap-1">
          {docs.map((d) => (
            <li key={d.slug}>
              <button
                type="button"
                onClick={() => setActiveSlug(d.slug)}
                className={[
                  "w-full text-left text-[13.5px] leading-snug px-3 py-2 rounded-md transition-colors",
                  d.slug === activeSlug
                    ? "bg-[var(--paper)] text-[var(--slate)] border border-[var(--g300)] shadow-sm"
                    : "text-[var(--g700)] hover:bg-[var(--g100)]",
                ].join(" ")}
              >
                <span className="font-mono text-[10px] text-[var(--g500)] block mb-0.5">
                  {d.slug}.md
                </span>
                {d.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Markdown content (center) */}
      <article className="prose-doc min-w-0">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children, ...props }) => (
              <h1 id={slugify(toText(children))} {...props}>
                {children}
              </h1>
            ),
            h2: ({ children, ...props }) => (
              <h2 id={slugify(toText(children))} {...props}>
                {children}
              </h2>
            ),
            h3: ({ children, ...props }) => (
              <h3 id={slugify(toText(children))} {...props}>
                {children}
              </h3>
            ),
            table: ({ children, ...props }) => (
              <div className="overflow-x-auto">
                <table {...props}>{children}</table>
              </div>
            ),
          }}
        >
          {active.content}
        </ReactMarkdown>
      </article>

      {/* TOC (right) */}
      <aside className="hidden lg:block lg:sticky lg:top-[72px] lg:self-start">
        <p className="eyebrow mb-4">Pada Halaman Ini</p>
        <ul className="flex flex-col gap-1.5 text-[13px]">
          {toc.map((h) => (
            <li
              key={h.id}
              className={h.level === 3 ? "pl-3" : ""}
            >
              <a
                href={`#${h.id}`}
                className="text-[var(--g500)] hover:text-[var(--clay)] transition-colors block py-0.5"
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </aside>
    </div>
    </div>
  );
}

function extractToc(md: string): { id: string; text: string; level: 2 | 3 }[] {
  const lines = md.split("\n");
  const out: { id: string; text: string; level: 2 | 3 }[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!m) continue;
    const level = m[1].length === 2 ? 2 : 3;
    const text = m[2].replace(/[`*_]/g, "").trim();
    out.push({ id: slugify(text), text, level: level as 2 | 3 });
  }
  return out;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function toText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: React.ReactNode } }).props;
    return toText(props?.children ?? "");
  }
  return "";
}
