"use client";

import { Lock } from "lucide-react";
import { truncateHandle } from "@/lib/format";

interface SealedValueProps {
  handle?: string | bigint;
  label?: string;
  size?: "sm" | "md";
}

export function SealedValue({ handle, label, size = "sm" }: SealedValueProps) {
  const display = label ?? truncateHandle(handle);
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-muted rounded-[3px] border ${
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"
      }`}
      style={{
        background: "var(--sealed-bg)",
        borderColor: "var(--copper-border-dim)",
      }}
    >
      <Lock className="shrink-0 text-copper opacity-60" style={{ width: size === "sm" ? 10 : 12, height: size === "sm" ? 10 : 12 }} />
      <span>{display}</span>
    </span>
  );
}
