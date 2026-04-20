"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Lock, Cpu, Shield, ArrowRight } from "lucide-react";

const nodes = [
  {
    id: "browser",
    icon: Lock,
    label: "Employee Browser",
    sub: "Encrypts locally",
    color: "copper",
  },
  {
    id: "contract",
    icon: Cpu,
    label: "FHE Contract",
    sub: "Evaluates on ciphertext",
    color: "steel",
  },
  {
    id: "result",
    icon: Shield,
    label: "Authorized Party",
    sub: "Decrypts with permit",
    color: "copper",
  },
];

const properties = [
  { label: "Encrypted at rest", detail: "All sensitive values stored as FHE handles on-chain" },
  { label: "Private computation", detail: "Policy logic runs on ciphertext — never decrypted mid-eval" },
  { label: "Permit-gated reveal", detail: "Only authorized addresses can request decryption" },
  { label: "Auditable outcome", detail: "Admin publishes verified results to the on-chain trail" },
];

export function ArchitectureSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-28 px-6" style={{ borderTop: "1px solid var(--border-dim)" }}>
      <div className="mx-auto max-w-[1280px]">
        <div className="grid grid-cols-[1fr_1.15fr] gap-20 items-start">
          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55 }}
            >
              <span className="text-[11px] font-medium tracking-[0.09em] uppercase mb-4 block" style={{ color: "var(--color-subtle)" }}>
                Architecture
              </span>
              <h2 className="text-[44px] font-bold tracking-[-0.025em] leading-[1.08] mb-5" style={{ color: "var(--color-text)" }}>
                FHE in<br />production.
              </h2>
              <p className="text-[16px] leading-relaxed mb-12" style={{ color: "var(--color-muted)", maxWidth: "400px" }}>
                Powered by Fhenix CoFHE — an off-chain FHE coprocessor for EVM chains. Encrypted state
                lives on Arbitrum Sepolia. Computation happens in a confidential enclave.
              </p>
            </motion.div>

            <ul className="space-y-5">
              {properties.map((p, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={inView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.22 + i * 0.09 }}
                  className="flex items-start gap-4"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--color-copper)", marginTop: "7px" }}
                  />
                  <div>
                    <span className="text-[14px] font-semibold" style={{ color: "var(--color-text)" }}>
                      {p.label}
                    </span>
                    <span className="text-[14px] mx-2" style={{ color: "var(--color-subtle)" }}>—</span>
                    <span className="text-[14px]" style={{ color: "var(--color-muted)" }}>
                      {p.detail}
                    </span>
                  </div>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Right: horizontal flow diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-xl p-8 relative overflow-hidden"
            style={{
              background: "#0E0E11",
              border: "1px solid var(--copper-border-dim)",
              boxShadow: "0 0 80px rgba(200,131,63,0.05) inset",
            }}
          >
            {/* Background copper glow */}
            <div
              className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
              style={{
                background: "radial-gradient(circle, rgba(200,131,63,0.06) 0%, transparent 70%)",
                transform: "translate(20%, -20%)",
              }}
            />

            {/* Section label */}
            <p className="text-[11px] font-mono font-medium tracking-[0.08em] uppercase mb-8" style={{ color: "var(--color-subtle)" }}>
              Data flow
            </p>

            {/* Horizontal flow nodes */}
            <div className="flex items-center gap-0 mb-8">
              {nodes.map((node, i) => {
                const Icon = node.icon;
                const isCopper = node.color === "copper";
                return (
                  <div key={node.id} className="flex items-center flex-1">
                    {/* Node */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={inView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.45, delay: 0.35 + i * 0.14 }}
                      className="flex-1 flex flex-col items-center gap-3 px-2"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: isCopper ? "rgba(200,131,63,0.10)" : "rgba(110,144,178,0.10)",
                          border: `1px solid ${isCopper ? "var(--copper-border-dim)" : "var(--steel-border)"}`,
                        }}
                      >
                        <Icon
                          className="w-5 h-5"
                          style={{ color: isCopper ? "var(--color-copper)" : "var(--color-steel)" }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="text-[13px] font-semibold tracking-[-0.01em]" style={{ color: "var(--color-text)" }}>
                          {node.label}
                        </div>
                        <div className="text-[11px] mt-0.5" style={{ color: "var(--color-muted)" }}>
                          {node.sub}
                        </div>
                      </div>
                    </motion.div>

                    {/* Arrow + label connector */}
                    {i < nodes.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={inView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.35, delay: 0.55 + i * 0.14 }}
                        className="flex flex-col items-center gap-1.5 px-1 shrink-0"
                      >
                        <span
                          className="text-[9px] font-mono font-medium tracking-[0.06em] px-2 py-0.5 rounded"
                          style={{
                            color: "var(--color-copper)",
                            background: "rgba(200,131,63,0.07)",
                            border: "1px solid var(--copper-border-dim)",
                          }}
                        >
                          encrypted
                        </span>
                        <div className="flex items-center gap-0.5">
                          <div className="w-8 h-px" style={{ background: "var(--copper-border-dim)" }} />
                          <ArrowRight className="w-3 h-3" style={{ color: "var(--color-copper-dim)" }} />
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* FHE operations strip */}
            <div
              className="rounded-lg px-5 py-4"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid var(--border-dim)" }}
            >
              <p className="text-[10px] font-mono tracking-[0.06em] uppercase mb-2.5" style={{ color: "var(--color-subtle)" }}>
                FHE operations
              </p>
              <div className="flex items-center gap-2">
                {["FHE.lte", "FHE.eq", "FHE.and", "FHE.select"].map((op) => (
                  <span
                    key={op}
                    className="text-[11px] font-mono px-2.5 py-1 rounded"
                    style={{
                      background: "rgba(110,144,178,0.08)",
                      border: "1px solid var(--steel-border)",
                      color: "var(--color-steel)",
                    }}
                  >
                    {op}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom label */}
            <p className="mt-5 text-[11px]" style={{ color: "var(--color-subtle)" }}>
              Fhenix CoFHE · Arbitrum Sepolia
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
