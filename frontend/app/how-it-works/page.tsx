"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ArrowStep({ label, delay = 0 }: { label: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -8 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="flex items-center gap-2 text-[13px] font-mono text-muted"
    >
      <ArrowRight className="w-3.5 h-3.5 shrink-0 text-copper" />
      {label}
    </motion.div>
  );
}

const LIFECYCLE = [
  "Submitted",
  "Decided",
  "Settleable",
  "Approved",
  "Settled",
  "Verifiable",
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="mx-auto max-w-[900px] px-6 py-16">

        {/* Page headline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="mb-20 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium mb-6"
            style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
            Technical Overview
          </div>
          <h1 className="text-[42px] font-bold tracking-[-0.03em] leading-[1.1] mb-5 text-text">
            How ShieldCard Enforces<br />Confidential Policy
          </h1>
          <p className="text-[17px] leading-relaxed max-w-[540px] mx-auto text-muted">
            Three stages. One policy. No plaintext.
          </p>
        </motion.div>

        {/* Section A: Encrypted Policy Evaluation */}
        <FadeInSection>
          <div className="grid grid-cols-2 gap-12 mb-24 items-center">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.09em] mb-4 text-copper">Stage 1</div>
              <h2 className="text-[28px] font-bold tracking-[-0.025em] mb-4 text-text">
                Encrypted Policy Evaluation
              </h2>
              <p className="text-[15px] leading-relaxed mb-6 text-muted">
                When an employee submits a spend request, their browser encrypts the amount using
                Fhenix CoFHE before the transaction is signed. The plaintext never leaves their
                device.
              </p>
              <p className="text-[15px] leading-relaxed mb-6 text-muted">
                ShieldCardControlPlane evaluates the request entirely on ciphertext:{" "}
                <code className="text-[13px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.add</code> accumulates
                the running budget,{" "}
                <code className="text-[13px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.lte</code> compares
                against limits,{" "}
                <code className="text-[13px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.and</code> combines
                conditions, and{" "}
                <code className="text-[13px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.select</code> routes to
                auto-approve, review, or deny. The contract never sees a plaintext number.
              </p>
            </div>
            <div className="rounded-2xl p-6 flex flex-col gap-3"
              style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}>
              <p className="text-[10px] uppercase tracking-[0.08em] mb-2 text-subtle">Request flow</p>
              {[
                "Browser encrypts amount with CoFHE",
                "Ciphertext submitted on-chain",
                "FHE.add accumulates budget",
                "FHE.lte compares against limit",
                "FHE.select routes outcome",
                "Threshold network signs result",
                "Admin publishes signed status",
              ].map((step, i) => (
                <ArrowStep key={step} label={step} delay={i * 0.06} />
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Section B: Settlement and Audit Trail */}
        <FadeInSection delay={0.05}>
          <div className="grid grid-cols-2 gap-12 mb-24 items-center">
            <div className="rounded-2xl p-6" style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}>
              <p className="text-[10px] uppercase tracking-[0.08em] mb-5 text-subtle">Request lifecycle</p>
              <div className="flex items-center gap-0 overflow-x-auto pb-2">
                {LIFECYCLE.map((step, i) => (
                  <div key={step} className="flex items-center shrink-0">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.08 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{
                          background: i < 4 ? "rgba(200,131,63,0.10)" : "rgba(77,145,112,0.10)",
                          border: `1px solid ${i < 4 ? "var(--copper-border-dim)" : "rgba(77,145,112,0.20)"}`,
                          color: i < 4 ? "var(--color-copper)" : "var(--color-approved)",
                        }}>
                        {i + 1}
                      </div>
                      <span className="text-[9px] mt-1.5 whitespace-nowrap text-subtle">{step}</span>
                    </motion.div>
                    {i < LIFECYCLE.length - 1 && (
                      <div className="w-6 h-px mx-1 shrink-0" style={{ background: "var(--border-dim)" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.09em] mb-4 text-copper">Stage 2</div>
              <h2 className="text-[28px] font-bold tracking-[-0.025em] mb-4 text-text">
                Settlement and Audit Trail
              </h2>
              <p className="text-[15px] leading-relaxed mb-4 text-muted">
                Approved requests move to ShieldCardSettlement. High-risk or high-value requests
                require multi-approver sign-off before settlement executes. Settlement transfers
                testnet MockUSDC to the recipient.
              </p>
              <p className="text-[15px] leading-relaxed text-muted">
                Each settlement commits the previous receipt hash, forming a tamper-evident chain.
                Anyone can verify any receipt at <Link href="/verify" className="underline hover:text-text transition-colors" style={{ color: "var(--color-copper)" }}>/verify</Link> — no wallet required.
              </p>
            </div>
          </div>
        </FadeInSection>

        {/* Section C: Scoped Auditor Access */}
        <FadeInSection delay={0.05}>
          <div className="grid grid-cols-2 gap-12 mb-24 items-center">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.09em] mb-4 text-copper">Stage 3</div>
              <h2 className="text-[28px] font-bold tracking-[-0.025em] mb-4 text-text">
                Scoped Auditor Access
              </h2>
              <p className="text-[15px] leading-relaxed mb-4 text-muted">
                The admin grants an auditor FHE.allow permission on specific request ciphertexts.
                The auditor can decrypt only those requests using their own wallet permit — nothing
                outside their granted scope is accessible.
              </p>
              <p className="text-[15px] leading-relaxed text-muted">
                Budget compliance can be proven without revealing any amount. The ShieldCardBudgetAttestor
                computes a boolean comparison over encrypted budget usage and reveals only YES or NO.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Observer view */}
              <div className="rounded-xl p-4" style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}>
                <p className="text-[10px] uppercase tracking-[0.07em] mb-4 text-subtle">Observer View</p>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 mb-2.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "var(--border-mid)" }} />
                    <div className="flex-1 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                    <div className="text-[10px] font-mono text-subtle">••••••</div>
                  </div>
                ))}
              </div>
              {/* Auditor view */}
              <div className="rounded-xl p-4" style={{ background: "rgba(77,145,112,0.04)", border: "1px solid rgba(77,145,112,0.15)" }}>
                <p className="text-[10px] uppercase tracking-[0.07em] mb-4" style={{ color: "var(--color-approved)" }}>Auditor View</p>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 mb-2.5">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ background: i < 2 ? "var(--color-approved)" : "var(--border-mid)" }} />
                    <div className="flex-1 h-3 rounded" style={{ background: "rgba(255,255,255,0.05)" }} />
                    {i < 2
                      ? <div className="text-[10px] font-mono" style={{ color: "var(--color-approved)" }}>Decrypted</div>
                      : <div className="text-[10px] font-mono text-subtle">Sealed</div>
                    }
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* CTA */}
        <FadeInSection delay={0.05}>
          <div className="rounded-2xl p-10 text-center" style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}>
            <h2 className="text-[24px] font-bold tracking-[-0.025em] mb-3 text-text">
              Ready to deploy for your team?
            </h2>
            <p className="text-[15px] mb-8 text-muted">Three contracts. One-click deployment on Arbitrum Sepolia.</p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/deploy"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110"
                style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
                Deploy on Arbitrum Sepolia <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/observer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:brightness-110"
                style={{ border: "1px solid var(--border-mid)", color: "var(--color-muted)" }}>
                Explore the Live Demo
              </Link>
            </div>
          </div>
        </FadeInSection>

      </main>
    </div>
  );
}
