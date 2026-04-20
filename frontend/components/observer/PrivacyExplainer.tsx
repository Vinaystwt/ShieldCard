"use client";

import { Lock, EyeOff, Eye } from "lucide-react";

const VISIBLE = [
  { label: "Request ID", note: "Sequential counter" },
  { label: "Employee address", note: "Truncated wallet address" },
  { label: "Memo", note: "Plain-text description" },
  { label: "Timestamp", note: "Block submission time" },
  { label: "Published status", note: "PENDING / APPROVED / DENIED (after admin publish)" },
];

const HIDDEN = [
  { label: "Spending amount", note: "Encrypted as euint32 ciphertext handle" },
  { label: "Request category", note: "Encrypted as euint8 ciphertext handle" },
  { label: "Employee limit", note: "Encrypted policy threshold — never leaves FHE storage" },
  { label: "Policy logic", note: "Evaluation is private: amount ≤ limit AND category = 1" },
  { label: "Raw result", note: "Encrypted until admin publishes via Threshold Network" },
];

export function PrivacyExplainer() {
  return (
    <div
      className="rounded-xl p-6"
      style={{ background: "#0E0E11", border: "1px solid var(--copper-border-dim)" }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Lock className="w-4 h-4 text-copper opacity-80" />
        <h3 className="text-[14px] font-semibold text-text tracking-[-0.01em]">
          What the chain sees
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Visible */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Eye className="w-3.5 h-3.5 text-approved opacity-70" />
            <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-approved opacity-80">
              Visible to anyone
            </span>
          </div>
          <ul className="space-y-2">
            {VISIBLE.map((item) => (
              <li key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-muted">{item.label}</span>
                <span className="text-[11px] text-subtle">{item.note}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Hidden */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <EyeOff className="w-3.5 h-3.5 text-copper opacity-70" />
            <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-copper opacity-80">
              Hidden — FHE encrypted
            </span>
          </div>
          <ul className="space-y-2">
            {HIDDEN.map((item) => (
              <li key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-muted">{item.label}</span>
                <span className="text-[11px] text-subtle">{item.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
