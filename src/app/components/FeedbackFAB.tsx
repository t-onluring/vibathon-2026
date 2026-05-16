"use client";

import { useEffect, useState } from "react";

const FORM_URL = "https://forms.gle/e7yQcpawniKtmffc9";

export function FeedbackFAB() {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 600);
    return () => clearTimeout(t);
  }, []);

  return (
    <a
      href={FORM_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed bottom-6 right-6 z-[999] flex items-center no-underline"
      style={{
        gap: 10,
        padding: hovered ? "14px 22px" : "14px 18px",
        borderRadius: 50,
        background: "var(--clay)",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        boxShadow: hovered
          ? "0 8px 32px color-mix(in srgb, var(--clay) 33%, transparent), 0 2px 8px rgba(0,0,0,0.15)"
          : "0 4px 20px color-mix(in srgb, var(--clay) 20%, transparent), 0 2px 6px rgba(0,0,0,0.1)",
        transform: mounted
          ? hovered ? "translateY(-2px) scale(1.04)" : "translateY(0) scale(1)"
          : "translateY(40px) scale(0.8)",
        opacity: mounted ? 1 : 0,
        transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <rect x="5" y="3" width="14" height="18" rx="2" stroke="white" strokeWidth="1.8" />
        <path d="M9 3V2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 10l2 2 4-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 16h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span
        style={{
          maxWidth: hovered ? 160 : 0,
          opacity: hovered ? 1 : 0,
          transition: "max-width 0.3s ease, opacity 0.25s ease",
          overflow: "hidden",
        }}
      >
        Isi Survei
      </span>
    </a>
  );
}
