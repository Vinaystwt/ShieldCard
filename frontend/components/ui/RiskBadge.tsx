"use client";

import { RISK } from "@/lib/contracts";

interface RiskBadgeProps {
  bitmap: number;
  compact?: boolean;
}

const FLAG_CONFIG: Array<{
  bit: number;
  label: string;
  color: string;
  bg: string;
  border: string;
}> = [
  { bit: RISK.VENDOR_SUSPENDED, label: "Suspended Vendor", color: "#CF6679", bg: "rgba(147,68,68,0.10)", border: "rgba(147,68,68,0.25)" },
  { bit: RISK.VENDOR_UNCHECKED, label: "Unchecked Vendor", color: "var(--color-pending)", bg: "rgba(196,148,60,0.08)", border: "rgba(196,148,60,0.20)" },
  { bit: RISK.NO_DEPT,          label: "No Dept",          color: "var(--color-subtle)",  bg: "rgba(255,255,255,0.04)", border: "var(--border-dim)" },
  { bit: RISK.NO_VENDOR,        label: "No Vendor",        color: "var(--color-subtle)",  bg: "rgba(255,255,255,0.04)", border: "var(--border-dim)" },
];

export function RiskBadge({ bitmap, compact = false }: RiskBadgeProps) {
  if (bitmap === 0) {
    return (
      <span
        className="text-[11px] font-medium"
        style={{ color: "var(--color-subtle)", opacity: 0.5 }}
      >
        —
      </span>
    );
  }

  const active = FLAG_CONFIG.filter((f) => (bitmap & f.bit) !== 0);

  return (
    <div className="flex flex-wrap gap-1">
      {active.map((f) => (
        <span
          key={f.bit}
          className="inline-block rounded-full text-[10px] font-medium leading-none"
          style={{
            padding: compact ? "2px 6px" : "3px 7px",
            background: f.bg,
            border: `1px solid ${f.border}`,
            color: f.color,
          }}
        >
          {f.label}
        </span>
      ))}
    </div>
  );
}
