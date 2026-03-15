"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { X, Check, Eye, EyeOff } from "lucide-react";

const problems = [
  "Payment amounts visible on-chain to anyone",
  "Policy limits exposed in contract storage",
  "Approval patterns reveal business decisions",
  "Competitors can read your treasury logic",
];

const solutions = [
  "Amounts encrypted before leaving the browser",
  "Limits stored as FHE ciphertext handles",
  "Pack limits and spend amounts stay private on-chain",
  "Only authorized parties can read results",
];

export function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-28 px-6" style={{ borderTop: "1px solid var(--border-dim)" }}>
      <div className="mx-auto max-w-[1280px]">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-16 max-w-[600px]"
        >
          <span className="text-[11px] font-medium tracking-[0.09em] uppercase mb-4 block" style={{ color: "var(--color-subtle)" }}>
            The problem
          </span>
          <h2 className="text-[44px] font-bold tracking-[-0.025em] leading-[1.08]" style={{ color: "var(--color-text)" }}>
            On-chain transparency<br />cuts both ways.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed max-w-[440px]" style={{ color: "var(--color-muted)" }}>
            Blockchains are auditable by design. That&apos;s a feature — until your financial controls become public information.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border-dim)", borderRadius: "12px", overflow: "hidden" }}>
          {/* The status quo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="p-10 relative"
            style={{ background: "#0E0E11" }}
          >
            {/* Subtle denied tint */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 40% at 30% 30%, rgba(147,68,68,0.06) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(147,68,68,0.10)", border: "1px solid rgba(147,68,68,0.20)" }}
                >
                  <Eye className="w-4 h-4" style={{ color: "var(--color-denied)" }} />
                </div>
                <span className="text-[12px] font-medium tracking-[0.06em] uppercase" style={{ color: "var(--color-subtle)" }}>
                  Status quo
                </span>
              </div>
              <h3 className="text-[22px] font-bold tracking-[-0.015em] mb-8" style={{ color: "var(--color-text)" }}>
                Everything is readable
              </h3>
              <ul className="space-y-4">
                {problems.map((p, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.28 + i * 0.08 }}
                    className="flex items-start gap-3 text-[14px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <X className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-denied)" }} />
                    {p}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* ShieldCard */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="p-10 relative"
            style={{ background: "#0E0E11" }}
          >
            {/* Copper ambient */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 45% at 70% 30%, rgba(200,131,63,0.07) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)" }}
                >
                  <EyeOff className="w-4 h-4" style={{ color: "var(--color-copper)" }} />
                </div>
                <span className="text-[12px] font-medium tracking-[0.06em] uppercase" style={{ color: "var(--color-copper)" }}>
                  ShieldCard
                </span>
              </div>
              <h3 className="text-[22px] font-bold tracking-[-0.015em] mb-8" style={{ color: "var(--color-text)" }}>
                Private by design
              </h3>
              <ul className="space-y-4">
                {solutions.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: 10 }}
                    animate={inView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.34 + i * 0.08 }}
                    className="flex items-start gap-3 text-[14px]"
                    style={{ color: "var(--color-muted)" }}
                  >
                    <Check className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--color-approved)" }} />
                    {s}
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
