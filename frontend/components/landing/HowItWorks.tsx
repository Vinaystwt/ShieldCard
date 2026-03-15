"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Shield, Cpu, Eye } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Shield,
    title: "Employee submits encrypted",
    body: "The spend amount is encrypted in the browser via CoFHE before any network call. Only the ciphertext leaves the device.",
    accent: "copper",
  },
  {
    n: "02",
    icon: Cpu,
    title: "Policy evaluates privately",
    body: "The FHE contract compares the encrypted amount against an encrypted limit. No plaintext. No leaks. The result is also encrypted.",
    accent: "steel",
  },
  {
    n: "03",
    icon: Eye,
    title: "Authorized reveal only",
    body: "The employee reveals their result via a cryptographic permit. The admin publishes the outcome to the on-chain audit trail.",
    accent: "copper",
  },
];

export function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} id="how-it-works" className="py-28 px-6" style={{ borderTop: "1px solid var(--border-dim)" }}>
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-16"
        >
          <span className="text-[11px] font-medium tracking-[0.09em] uppercase mb-4 block" style={{ color: "var(--color-subtle)" }}>
            How it works
          </span>
          <h2 className="text-[44px] font-bold tracking-[-0.025em] leading-[1.08]" style={{ color: "var(--color-text)" }}>
            Three steps.<br />Zero plaintext exposure.
          </h2>
        </motion.div>

        <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border-dim)", borderRadius: "12px", overflow: "hidden" }}>
          {steps.map((step, i) => {
            const Icon = step.icon;
            const isCopper = step.accent === "copper";
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, delay: 0.12 + i * 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="relative group transition-colors duration-200"
                style={{ background: "#0E0E11" }}
              >
                {/* Hover surface */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: "rgba(255,255,255,0.015)" }}
                />

                <div className="relative p-10">
                  {/* Step number */}
                  <div
                    className="text-[11px] font-mono font-semibold tracking-[0.10em] mb-8"
                    style={{ color: isCopper ? "var(--color-copper)" : "var(--color-steel)" }}
                  >
                    {step.n}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center mb-7"
                    style={{
                      background: isCopper ? "rgba(200,131,63,0.08)" : "rgba(110,144,178,0.08)",
                      border: `1px solid ${isCopper ? "var(--copper-border-dim)" : "var(--steel-border)"}`,
                    }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: isCopper ? "var(--color-copper)" : "var(--color-steel)" }}
                    />
                  </div>

                  <h3
                    className="text-[18px] font-semibold tracking-[-0.015em] mb-3 leading-snug"
                    style={{ color: "var(--color-text)" }}
                  >
                    {step.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    {step.body}
                  </p>

                  {/* Bottom accent line */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-px"
                    style={{
                      background: isCopper
                        ? "linear-gradient(90deg, transparent, rgba(200,131,63,0.20), transparent)"
                        : "linear-gradient(90deg, transparent, rgba(110,144,178,0.15), transparent)",
                      opacity: 0,
                    }}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
