"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

const STEPS = [
  {
    step: 1,
    title: "Submit a confidential request",
    route: "/employee",
    desc: "The employee encrypts the spend amount on the client using Fhenix CoFHE. The ciphertext is stored on-chain — amount is never visible to observers.",
    hint: "Connect Employee A wallet → fill amount → Submit Request.",
  },
  {
    step: 2,
    title: "Admin reviews the sealed queue",
    route: "/admin",
    desc: "The admin sees encrypted handles only. The FHE routing tier (AUTO_APPROVED / AUTO_DENIED / NEEDS_REVIEW) is computed on-chain via FHE.lte and FHE.select without revealing the amount.",
    hint: "Connect admin wallet → view queue → Publish Results to finalize.",
  },
  {
    step: 3,
    title: "Observer lens — what the chain sees",
    route: "/observer",
    desc: "Any observer can see status labels and metadata. Amount and policy thresholds remain sealed regardless of who watches.",
    hint: "Open /observer — no wallet needed. Notice amounts are never shown.",
  },
  {
    step: 4,
    title: "Auditor: scoped FHE decryption",
    route: "/auditor",
    desc: "The admin called grantAuditorAccess([0,3,5,9,11]). Only those requests can be decrypted by the auditor wallet. Try decrypting an un-granted request — it reverts.",
    hint: "Connect Employee B wallet (the auditor) → click Decrypt on a granted row. Then click a row to see the side-by-side privacy proof.",
  },
  {
    step: 5,
    title: "Treasury settlement",
    route: "/settlement",
    desc: "AUTO_APPROVED requests open as Pending in ShieldCardSettlement. n-of-m approvers approve; admin calls settle() to transfer testnet MockUSDC and append the hash-chain link.",
    hint: "Connect admin wallet on /settlement → Approve pending → Settle approved.",
  },
  {
    step: 6,
    title: "Wallet-free public verifier",
    route: "/verify",
    desc: "Anyone can verify a receipt hash by entering a request ID. The page recomputes keccak256(requestId, employee, packId, status, timestamp, contract, chainId) and compares on-chain.",
    hint: "Go to /verify → enter 0 → click Verify. Green = receipt intact.",
  },
];

export function DemoGuideOverlay() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const current = STEPS[step];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold shadow-lg transition-all hover:brightness-110 active:scale-[0.97]"
        style={{
          background: "linear-gradient(135deg, #D09040 0%, #B86B2A 100%)",
          color: "#fff",
          boxShadow: "0 4px 24px rgba(208,144,64,0.35)",
        }}
      >
        <BookOpen className="w-4 h-4" />
        Demo guide
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
              className="fixed bottom-20 right-6 z-50 w-[400px] rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid var(--border-dim)" }}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: "var(--color-copper)" }} />
                  <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
                    Demo guide
                  </span>
                </div>
                <button onClick={() => setOpen(false)} className="opacity-50 hover:opacity-80 transition-opacity">
                  <X className="w-4 h-4" style={{ color: "var(--color-muted)" }} />
                </button>
              </div>

              {/* Step dots */}
              <div className="flex items-center gap-1.5 px-5 pt-4">
                {STEPS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: i === step ? "20px" : "6px",
                      background: i === step ? "var(--color-copper)" : "var(--border-mid)",
                    }}
                  />
                ))}
                <span className="ml-auto text-[11px]" style={{ color: "var(--color-subtle)" }}>
                  {step + 1} / {STEPS.length}
                </span>
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                  className="px-5 pt-4 pb-5"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ background: "rgba(200,131,63,0.15)", color: "var(--color-copper)" }}>
                      {current.step}
                    </span>
                    <h3 className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
                      {current.title}
                    </h3>
                  </div>
                  <p className="text-[13px] leading-relaxed mb-3" style={{ color: "var(--color-muted)" }}>
                    {current.desc}
                  </p>
                  <div className="rounded-lg px-3 py-2.5 text-[12px] leading-relaxed"
                    style={{ background: "rgba(110,144,178,0.06)", border: "1px solid var(--steel-border)", color: "var(--color-steel)" }}>
                    {current.hint}
                  </div>
                  <a
                    href={current.route}
                    className="mt-3 inline-flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-70"
                    style={{ color: "var(--color-copper)" }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open {current.route}
                  </a>
                </motion.div>
              </AnimatePresence>

              {/* Footer nav */}
              <div className="flex items-center justify-between px-5 py-3"
                style={{ borderTop: "1px solid var(--border-dim)" }}>
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all disabled:opacity-30"
                  style={{ border: "1px solid var(--border-mid)", color: "var(--color-muted)" }}>
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  onClick={() => {
                    if (step === STEPS.length - 1) { setOpen(false); setStep(0); }
                    else setStep((s) => s + 1);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all hover:brightness-110"
                  style={{ background: "rgba(200,131,63,0.12)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
                  {step === STEPS.length - 1 ? "Done" : "Next"}
                  {step < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
