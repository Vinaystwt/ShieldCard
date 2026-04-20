"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { STATUS_APPROVED } from "@/lib/constants";
import { cn } from "@/lib/format";

interface RevealCardProps {
  requestId: bigint;
  encStatus: string;
  memo: string;
  onDecrypt: (requestId: bigint, encStatus: string) => Promise<number>;
}

type Phase = "sealed" | "unlocking" | "revealed";

export function RevealCard({ requestId, encStatus, memo, onDecrypt }: RevealCardProps) {
  const [phase, setPhase] = useState<Phase>("sealed");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function handleReveal() {
    if (phase !== "sealed") return;
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

  const isApproved = result === STATUS_APPROVED;
  const isUnlocking = phase === "unlocking";
  const isRevealed = phase === "revealed";

  return (
    <motion.div
      layout
      className="relative rounded-xl overflow-hidden transition-all duration-300"
      style={{
        background: isRevealed
          ? isApproved
            ? "linear-gradient(135deg, #0B140F 0%, #0E0E11 100%)"
            : "linear-gradient(135deg, #140B0B 0%, #0E0E11 100%)"
          : isUnlocking
          ? "linear-gradient(135deg, #13110B 0%, #0E0E11 100%)"
          : "#0E0E11",
        border: isRevealed
          ? isApproved
            ? "1px solid rgba(77,145,112,0.32)"
            : "1px solid rgba(147,68,68,0.32)"
          : isUnlocking
          ? "1px solid var(--copper-border)"
          : "1px solid var(--border-mid)",
        boxShadow: isRevealed
          ? isApproved
            ? "0 0 50px rgba(77,145,112,0.08)"
            : "0 0 50px rgba(147,68,68,0.08)"
          : isUnlocking
          ? "0 0 40px rgba(200,131,63,0.10)"
          : "none",
      }}
    >
      {/* Ring pulse animation during unlock */}
      <AnimatePresence>
        {isUnlocking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded-lg">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-copper"
                initial={{ width: 40, height: 40, opacity: 0.6 }}
                animate={{ width: 160, height: 160, opacity: 0 }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.4,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
                style={{ borderColor: "rgba(200,131,63,0.5)" }}
              />
            ))}
          </div>
        )}
      </AnimatePresence>

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <span className="text-[11px] font-mono text-subtle">Request #{requestId.toString()}</span>
            <p className="text-[13px] text-muted mt-0.5 max-w-[200px] truncate">{memo}</p>
          </div>
          {/* Status icon */}
          <div className="shrink-0">
            {isRevealed ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
              >
                {isApproved ? (
                  <CheckCircle className="w-5 h-5 text-approved" />
                ) : (
                  <XCircle className="w-5 h-5 text-denied" />
                )}
              </motion.div>
            ) : isUnlocking ? (
              <Loader2 className="w-5 h-5 text-copper animate-spin" />
            ) : (
              <Lock className="w-4 h-4 text-subtle" />
            )}
          </div>
        </div>

        {/* Main content area */}
        <AnimatePresence mode="wait">
          {phase === "sealed" && (
            <motion.div
              key="sealed"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {/* Sealed amount display */}
              <div
                className="rounded-md px-4 py-3 mb-4 flex items-center gap-2"
                style={{ background: "var(--sealed-bg)", border: "1px solid var(--copper-border-dim)" }}
              >
                <Lock className="w-3.5 h-3.5 text-copper opacity-60 shrink-0" />
                <span className="text-[12px] font-mono text-muted">
                  Result sealed — permit required to reveal
                </span>
              </div>

              <button
                onClick={handleReveal}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium text-text transition-all duration-150 hover:brightness-110 active:scale-[0.97]"
                style={{
                  background: "rgba(200,131,63,0.08)",
                  border: "1px solid var(--copper-border-dim)",
                }}
              >
                <Unlock className="w-3.5 h-3.5 text-copper" />
                Reveal with permit
              </button>
            </motion.div>
          )}

          {phase === "unlocking" && (
            <motion.div
              key="unlocking"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center py-4 gap-3"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ border: "1px solid var(--copper-border)" }}
              >
                <Lock className="w-4 h-4 text-copper animate-pending" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-medium text-muted">
                  Requesting private decrypt...
                </p>
                <p className="text-[11px] text-subtle mt-1">
                  Sign the permit in your wallet
                </p>
              </div>
            </motion.div>
          )}

          {phase === "revealed" && result !== null && (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.05 }}
            >
              {/* Result display */}
              <div
                className="rounded-md px-4 py-5 mb-2 text-center"
                style={{
                  background: isApproved ? "var(--approved-bg)" : "var(--denied-bg)",
                  border: isApproved
                    ? "1px solid rgba(77,145,112,0.25)"
                    : "1px solid rgba(147,68,68,0.25)",
                }}
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.15 }}
                  className="flex items-center justify-center gap-3 mb-2"
                >
                  {isApproved ? (
                    <CheckCircle className="w-7 h-7 text-approved" />
                  ) : (
                    <XCircle className="w-7 h-7 text-denied" />
                  )}
                  <span
                    className={cn(
                      "text-[26px] font-bold tracking-[-0.025em]",
                      isApproved ? "text-approved" : "text-denied"
                    )}
                  >
                    {isApproved ? "Approved" : "Denied"}
                  </span>
                </motion.div>
                <p className="text-[12px] text-muted">
                  {isApproved
                    ? "Request met the private policy criteria"
                    : "Request did not meet the policy threshold"}
                </p>
              </div>
              <p className="text-[11px] text-subtle text-center">
                This result was decrypted locally using your permit. Nothing was published on-chain.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-denied mt-3 text-center"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
