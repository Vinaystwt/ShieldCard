"use client";

import { STATUS_APPROVED, STATUS_DENIED } from "@/lib/constants";

interface StatusBadgeProps {
  status: number;
  published?: boolean;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<number, { dot: string; text: string; label: string; bg: string }> = {
  0: {
    dot: "bg-pending",
    text: "text-pending",
    label: "Pending",
    bg: "var(--pending-bg)",
  },
  1: {
    dot: "bg-approved",
    text: "text-approved",
    label: "Approved",
    bg: "var(--approved-bg)",
  },
  2: {
    dot: "bg-denied",
    text: "text-denied",
    label: "Denied",
    bg: "var(--denied-bg)",
  },
};

export function StatusBadge({ status, published, size = "sm" }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[0];
  const isPending = status === 0 || !published;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      } ${cfg.text}`}
      style={{ background: cfg.bg }}
    >
      <span
        className={`rounded-full shrink-0 ${cfg.dot} ${isPending && published === false ? "animate-pending" : ""}`}
        style={{ width: size === "sm" ? 5 : 6, height: size === "sm" ? 5 : 6 }}
      />
      {cfg.label}
    </span>
  );
}
