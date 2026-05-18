"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Building2, ShieldCheck, AlertTriangle, RefreshCw, FileCheck2 } from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    label: "Department budgets",
    detail: "Encrypted dept caps. FHE accumulation per period. Epoch resets.",
    accent: "steel",
  },
  {
    icon: ShieldCheck,
    label: "Vendor compliance",
    detail: "Compliant / Unchecked / Suspended / Banned status on every request.",
    accent: "copper",
  },
  {
    icon: AlertTriangle,
    label: "Risk bitmap",
    detail: "4-bit flag per request — vendor risk, dept assignment, policy tier.",
    accent: "copper",
  },
  {
    icon: RefreshCw,
    label: "Recurring intervals",
    detail: "Per-employee per-pack submission gates. Revert on violation.",
    accent: "steel",
  },
  {
    icon: FileCheck2,
    label: "Receipt evidence",
    detail: "On-chain bytes32 hash attached to approved requests post-decision.",
    accent: "steel",
  },
];

export function Wave4Strip() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section
      ref={ref}
      className="py-20 px-6"
      style={{ borderTop: "1px solid var(--border-dim)" }}
    >
      <div className="mx-auto max-w-[1280px]">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4 mb-10"
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-[0.08em] uppercase"
              style={{
                background: "rgba(200,131,63,0.08)",
                border: "1px solid var(--copper-border-dim)",
                color: "var(--color-copper)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-copper" />
              Wave 4
            </span>
          </div>
          <h2
            className="text-[20px] font-semibold tracking-[-0.015em]"
            style={{ color: "var(--color-text)" }}
          >
            ShieldCardControlPlane
          </h2>
          <div className="flex-1 h-px" style={{ background: "var(--border-dim)" }} />
          <span
            className="text-[11px] font-mono shrink-0"
            style={{ color: "var(--color-subtle)" }}
          >
            0x268F...9109 · Arbitrum Sepolia
          </span>
        </motion.div>

        {/* Feature cards */}
        <div className="grid grid-cols-5 gap-px" style={{ background: "var(--border-dim)", borderRadius: "10px", overflow: "hidden" }}>
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            const isCopper = f.accent === "copper";
            return (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: 0.08 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="relative group"
                style={{ background: "#0E0E11" }}
              >
                {/* Hover surface */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: "rgba(255,255,255,0.012)" }}
                />
                <div className="relative p-6">
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center mb-4"
                    style={{
                      background: isCopper ? "rgba(200,131,63,0.08)" : "rgba(110,144,178,0.08)",
                      border: `1px solid ${isCopper ? "var(--copper-border-dim)" : "var(--steel-border)"}`,
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{ color: isCopper ? "var(--color-copper)" : "var(--color-steel)" }}
                    />
                  </div>
                  <p
                    className="text-[13px] font-semibold tracking-[-0.01em] mb-2 leading-snug"
                    style={{ color: "var(--color-text)" }}
                  >
                    {f.label}
                  </p>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {f.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
