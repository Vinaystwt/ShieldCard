"use client";

import Link from "next/link";

interface WordMarkProps {
  size?: "sm" | "md" | "lg";
  href?: string;
}

export function WordMark({ size = "md", href = "/" }: WordMarkProps) {
  const configs = {
    sm: { markSize: 17, fontSize: "text-[13px]", gap: "gap-2" },
    md: { markSize: 21, fontSize: "text-[15px]", gap: "gap-2.5" },
    lg: { markSize: 26, fontSize: "text-[18px]", gap: "gap-3" },
  };
  const c = configs[size];

  return (
    <Link href={href} className={`inline-flex items-center ${c.gap} group select-none`}>
      <ShieldMark size={c.markSize} />
      <span className={`${c.fontSize} font-semibold tracking-[-0.01em]`} style={{ color: "var(--color-text)" }}>
        Shield<span style={{ color: "var(--color-copper)", fontWeight: 700 }}>Card</span>
      </span>
    </Link>
  );
}

function ShieldMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.1)}
      viewBox="0 0 22 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mark-copper" x1="11" y1="1" x2="11" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#D99550" />
          <stop offset="100%" stopColor="#B06B28" />
        </linearGradient>
      </defs>
      {/* Outer shield — copper gradient */}
      <path
        d="M11 1.5L20 5V12C20 16.8 16.2 21 11 22.5C5.8 21 2 16.8 2 12V5L11 1.5Z"
        stroke="url(#mark-copper)"
        strokeWidth="1.3"
        strokeLinejoin="round"
        fill="rgba(200,131,63,0.06)"
      />
      {/* Inner chip — steel */}
      <rect x="7.5" y="9" width="7" height="6" rx="1.2" stroke="#6E90B2" strokeWidth="0.9" fill="none" />
      {/* Chip pins — horizontal */}
      <line x1="7.5" y1="11.2" x2="5.5" y2="11.2" stroke="#6E90B2" strokeWidth="0.7" opacity="0.7" />
      <line x1="7.5" y1="12.8" x2="5.5" y2="12.8" stroke="#6E90B2" strokeWidth="0.7" opacity="0.7" />
      <line x1="14.5" y1="11.2" x2="16.5" y2="11.2" stroke="#6E90B2" strokeWidth="0.7" opacity="0.7" />
      <line x1="14.5" y1="12.8" x2="16.5" y2="12.8" stroke="#6E90B2" strokeWidth="0.7" opacity="0.7" />
      {/* Center lock dot */}
      <circle cx="11" cy="12" r="1.1" fill="#C8833F" opacity="0.95" />
    </svg>
  );
}
