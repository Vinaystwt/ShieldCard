"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Lock, Brain, Banknote } from "lucide-react";

const ACTS = [
  {
    icon: Lock,
    eyebrow: "Act 1",
    title: "Encrypt",
    detail: "Employee encrypts the spend amount in-browser via the Fhenix CoFHE SDK. Only ciphertext handles enter the contract.",
  },
  {
    icon: Brain,
    eyebrow: "Act 2",
    title: "Decide",
    detail: "FHE policy engine evaluates encrypted amounts against encrypted thresholds. Routes to Auto-Approved / Needs-Review / Auto-Denied without decrypting.",
  },
  {
    icon: Banknote,
    eyebrow: "Act 3",
    title: "Settle and prove",
    detail: "Approved requests move through a multi-approver vault. Testnet MockUSDC pays out. Every settlement appends to a tamper-evident hash chain.",
  },
];

export function ThreeActStrip() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      ref={ref}
      className="py-24 px-6"
      style={{ borderTop: "1px solid var(--border-dim)" }}
    >
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12 max-w-[720px]"
        >
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.08em] uppercase"
            style={{
              background: "rgba(200,131,63,0.08)",
              border: "1px solid var(--copper-border-dim)",
              color: "var(--color-copper)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-copper" />
            The thesis
          </span>
          <h2
            className="text-[34px] font-bold tracking-[-0.025em] mt-4 mb-3 leading-tight"
            style={{ color: "var(--color-text)" }}
          >
            Encrypt. Decide. Settle and prove.
          </h2>
          <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
            Confidential compute with economically secured correctness. Public accountability via verifiable audit packets — no wallet required to verify.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border-dim)", borderRadius: "10px", overflow: "hidden" }}>
          {ACTS.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
                style={{ background: "#0E0E11" }}
              >
                <div className="relative p-8">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center mb-5"
                    style={{
                      background: "rgba(200,131,63,0.08)",
                      border: "1px solid var(--copper-border-dim)",
                    }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "var(--color-copper)" }} />
                  </div>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.12em]"
                    style={{ color: "var(--color-subtle)" }}
                  >
                    {a.eyebrow}
                  </span>
                  <p
                    className="text-[18px] font-semibold tracking-[-0.015em] mt-1 mb-3"
                    style={{ color: "var(--color-text)" }}
                  >
                    {a.title}
                  </p>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    {a.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center justify-center mt-10 gap-3 text-[12px]" style={{ color: "var(--color-subtle)" }}>
          <span>FHE-encrypted compute · No real payments · Testnet MockUSDC</span>
        </div>
      </div>
    </section>
  );
}
