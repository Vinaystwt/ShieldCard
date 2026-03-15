"use client";

import { Lock, EyeOff, Eye } from "lucide-react";

const VISIBLE = [
  { label: "Request ID", note: "Sequential on-chain counter" },
  { label: "Employee address", note: "Wallet address that submitted the request" },
  { label: "Policy pack", note: "Travel, SaaS, Vendor, or Marketing" },
  { label: "Department ID", note: "Dept context attached at submission" },
  { label: "Vendor ID", note: "Vendor reference number (0 = none)" },
  { label: "Risk bitmap", note: "Flags: vendor status, dept assignment" },
  { label: "Memo", note: "Plain-text description from employee" },
  { label: "Timestamp", note: "Block time of submission" },
  { label: "Published status", note: "Auto-Approved / In Review / Denied — after publish" },
  { label: "Settlement receipt", note: "keccak256 hash committed after finalisation" },
];

const HIDDEN = [
  { label: "Spend amount", note: "euint32 ciphertext handle — value sealed on-chain" },
  { label: "Pack hard limit", note: "Encrypted threshold — never leaves FHE storage" },
  { label: "Pack auto-threshold", note: "Encrypted boundary between auto-approve and review" },
  { label: "Rolling budget cap", note: "Encrypted per-pack epoch limit" },
  { label: "Department budget", note: "Encrypted dept accumulator — updated homomorphically" },
  { label: "FHE decision operands", note: "Intermediate ebool values discarded after eval" },
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
          Privacy boundary
        </h3>
        <span
          className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded"
          style={{
            background: "rgba(200,131,63,0.06)",
            border: "1px solid var(--copper-border-dim)",
            color: "var(--color-copper)",
          }}
        >
          ShieldCardControlPlane
        </span>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Visible */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <Eye className="w-3.5 h-3.5 text-approved opacity-70" />
            <span className="text-[11px] font-medium uppercase tracking-[0.07em] text-approved opacity-80">
              Public — visible to anyone
            </span>
          </div>
          <ul className="space-y-2.5">
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
              Sealed — FHE encrypted
            </span>
          </div>
          <ul className="space-y-2.5">
            {HIDDEN.map((item) => (
              <li key={item.label} className="flex flex-col gap-0.5">
                <span className="text-[13px] font-medium text-muted">{item.label}</span>
                <span className="text-[11px] text-subtle">{item.note}</span>
              </li>
            ))}
          </ul>

          <div
            className="mt-5 rounded-lg px-4 py-3 text-[11px] leading-relaxed"
            style={{
              background: "rgba(200,131,63,0.04)",
              border: "1px solid var(--copper-border-dim)",
              color: "var(--color-subtle)",
            }}
          >
            Policy evaluation runs entirely on ciphertext. No plaintext amount or threshold
            is accessible to the contract, validators, or observers at any point during evaluation.
          </div>
        </div>
      </div>
    </div>
  );
}
