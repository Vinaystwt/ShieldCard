"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, CheckCircle, XCircle, Loader2, ClipboardCheck, Eye } from "lucide-react";
import {
  STATUS_AUTO_APPROVED, STATUS_NEEDS_REVIEW, STATUS_AUTO_DENIED,
  STATUS_ADMIN_APPROVED, STATUS_ADMIN_DENIED,
} from "@/lib/constants";

interface RevealCardProps {
  requestId: bigint;
  encStatus: string;
  receiptHash?: `0x${string}`;
  memo: string;
  onDecrypt: (requestId: bigint, encStatus: string) => Promise<number>;
  canReveal: boolean;
  isPublished: boolean;
  publicStatus?: number;
  inReview?: boolean;
}

type Phase = "sealed" | "unlocking" | "revealed";

function resultLabel(status: number): { label: string; sub: string; approved: boolean; review: boolean } {
  switch (status) {
    case STATUS_AUTO_APPROVED:  return { label: "Auto Approved",  sub: "FHE policy: within auto-approval threshold and budget", approved: true,  review: false };
    case STATUS_NEEDS_REVIEW:   return { label: "Needs Review",   sub: "FHE policy: above auto-threshold — pending admin decision", approved: false, review: true  };
    case STATUS_AUTO_DENIED:    return { label: "Auto Denied",    sub: "FHE policy: exceeds hard limit or budget cap", approved: false, review: false };
    case STATUS_ADMIN_APPROVED: return { label: "Approved",       sub: "Admin reviewed and approved this request", approved: true,  review: false };
    case STATUS_ADMIN_DENIED:   return { label: "Denied",         sub: "Admin reviewed and denied this request", approved: false, review: false };
    default:                    return { label: "Pending",         sub: "Result not yet available", approved: false, review: false };
  }
}

export function RevealCard({
  requestId,
  encStatus,
  receiptHash,
  memo,
  onDecrypt,
  canReveal,
  isPublished,
  publicStatus,
  inReview,
}: RevealCardProps) {
  const [phase, setPhase]   = useState<Phase>("sealed");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError]   = useState("");
  const [showReceipt, setShowReceipt] = useState(false);

  async function handleReveal() {
    if (phase !== "sealed" || !canReveal) return;
    setPhase("unlocking");
    setError("");
    try {
      const status = await onDecrypt(requestId, encStatus);
      setResult(status);
      setPhase("revealed");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Decrypt failed.");
      setPhase("sealed");
    }
  }

  const res = result !== null ? resultLabel(result) : null;
  const isUnlocking = phase === "unlocking";
  const isRevealed  = phase === "revealed";
  const hasReceipt  = isPublished && receiptHash && receiptHash !== "0x0000000000000000000000000000000000000000000000000000000000000000";

  // If inReview and not yet published, show review pending state
  const isInReview  = inReview && !isPublished;

  // Border/glow based on state
  const borderColor = isRevealed && res
    ? res.approved
      ? "rgba(77,145,112,0.32)"
      : res.review
      ? "rgba(196,148,60,0.30)"
      : "rgba(147,68,68,0.32)"
    : isInReview
    ? "rgba(196,148,60,0.25)"
    : isUnlocking
    ? "var(--copper-border)"
    : "var(--border-mid)";

  const bgGradient = isRevealed && res
    ? res.approved
      ? "linear-gradient(135deg, #0B140F 0%, #0E0E11 100%)"
      : res.review
      ? "linear-gradient(135deg, #141108 0%, #0E0E11 100%)"
      : "linear-gradient(135deg, #140B0B 0%, #0E0E11 100%)"
    : isInReview
    ? "linear-gradient(135deg, #131008 0%, #0E0E11 100%)"
    : "#0E0E11";

  return (
    <motion.div
      layout
      className="relative rounded-lg overflow-hidden"
      style={{ background: bgGradient, border: `1px solid ${borderColor}` }}
    >
      {/* Pulse during unlock */}
      <AnimatePresence>
        {isUnlocking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border"
                initial={{ width: 40, height: 40, opacity: 0.5 }}
                animate={{ width: 160, height: 160, opacity: 0 }}
                transition={{ duration: 1.2, delay: i * 0.4, repeat: Infinity, ease: "easeOut" }}
                style={{ borderColor: "rgba(200,131,63,0.4)" }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative p-4">
        <AnimatePresence mode="wait">

          {/* In-review state */}
          {isInReview && phase === "sealed" && (
            <motion.div key="in-review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2.5 py-1">
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: "var(--pending-bg)", border: "1px solid rgba(196,148,60,0.25)", color: "var(--color-pending)" }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-pending animate-pending" />
                  Awaiting admin review
                </div>
                <span className="text-[11px]" style={{ color: "var(--color-subtle)" }}>
                  Above auto-threshold — admin decision pending
                </span>
              </div>
            </motion.div>
          )}

          {/* Sealed state */}
          {!isInReview && phase === "sealed" && (
            <motion.div key="sealed" initial={{ opacity: 1 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-md px-3 py-2 flex items-center gap-2"
                  style={{ background: "var(--sealed-bg)", border: "1px solid var(--copper-border-dim)" }}>
                  <Lock className="w-3.5 h-3.5 text-copper opacity-60 shrink-0" />
                  <span className="text-[11px] font-mono text-muted">
                    {isPublished ? "Outcome sealed on-chain — permit to reveal" : "Outcome sealed — permit to reveal privately"}
                  </span>
                </div>
                <button
                  onClick={handleReveal}
                  disabled={!canReveal}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
                  style={{
                    background: canReveal ? "rgba(200,131,63,0.10)" : "rgba(255,255,255,0.04)",
                    border: canReveal ? "1px solid var(--copper-border-dim)" : "1px solid var(--border-dim)",
                    color: canReveal ? "var(--color-copper)" : "var(--color-muted)",
                  }}
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Reveal
                </button>
              </div>
            </motion.div>
          )}

          {/* Unlocking */}
          {phase === "unlocking" && (
            <motion.div key="unlocking" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              className="flex items-center justify-center gap-3 py-2">
              <Loader2 className="w-4 h-4 text-copper animate-spin" />
              <div>
                <p className="text-[12px] font-medium text-muted">Requesting private decrypt...</p>
                <p className="text-[11px] text-subtle">Sign the permit in your wallet</p>
              </div>
            </motion.div>
          )}

          {/* Revealed */}
          {phase === "revealed" && res && (
            <motion.div key="revealed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}>
              <div className="flex items-center gap-3 mb-2">
                {/* Result icon */}
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}>
                  {res.approved ? (
                    <CheckCircle className="w-5 h-5 text-approved" />
                  ) : res.review ? (
                    <ClipboardCheck className="w-5 h-5 text-pending" />
                  ) : (
                    <XCircle className="w-5 h-5 text-denied" />
                  )}
                </motion.div>
                <div>
                  <span className={`text-[15px] font-bold ${res.approved ? "text-approved" : res.review ? "text-pending" : "text-denied"}`}>
                    {res.label}
                  </span>
                  <p className="text-[11px] text-subtle mt-0.5">{res.sub}</p>
                </div>
                {/* Receipt toggle */}
                {hasReceipt && (
                  <button
                    onClick={() => setShowReceipt(!showReceipt)}
                    className="ml-auto flex items-center gap-1 text-[11px] transition-opacity hover:opacity-100 opacity-60"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <Eye className="h-3 w-3" />
                    {showReceipt ? "Hide receipt" : "Receipt"}
                  </button>
                )}
              </div>

              {/* Receipt card */}
              {hasReceipt && showReceipt && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="rounded-md p-3 mt-2"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-dim)" }}>
                  <p className="text-[10px] font-medium uppercase tracking-wider mb-2" style={{ color: "var(--color-subtle)" }}>
                    Settlement receipt
                  </p>
                  <div className="flex flex-col gap-1">
                    {[
                      { label: "Request ID",   value: `#${requestId.toString()}` },
                      { label: "Pack",         value: memo },
                      { label: "Outcome",      value: res.label },
                      { label: "Network",      value: "Arbitrum Sepolia" },
                      { label: "Receipt hash", value: `${receiptHash!.slice(0, 18)}...${receiptHash!.slice(-6)}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between gap-2">
                        <span className="text-[10px]" style={{ color: "var(--color-subtle)" }}>{label}</span>
                        <span className="text-[10px] font-mono" style={{ color: "var(--color-muted)" }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const data = { requestId: requestId.toString(), outcome: res.label, receiptHash, network: "Arbitrum Sepolia" };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `receipt-${requestId}.json`; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="mt-2 text-[10px] underline opacity-60 hover:opacity-100"
                    style={{ color: "var(--color-muted)" }}
                  >
                    Export JSON
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>

        {error && (
          <p className="text-[11px] text-denied mt-2">{error}</p>
        )}
      </div>
    </motion.div>
  );
}
