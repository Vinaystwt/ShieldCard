"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Eye, Database, GitBranch } from "lucide-react";

const PROBLEMS = [
  {
    icon: Eye,
    title: "Competitors see your vendor relationships",
    body: "When payment to a vendor appears on-chain, the vendor address and amount are both public. Your sourcing strategy is visible to anyone watching the chain.",
  },
  {
    icon: Database,
    title: "Budget caps enforce nothing",
    body: "Any policy limit stored in plaintext contract storage can be read and gamed. There is no enforcement that isn't also disclosure.",
  },
  {
    icon: GitBranch,
    title: "Approval patterns reveal strategy",
    body: "The sequence of approvals and amounts correlates with business decisions. A competitor watching approvals can infer runway, headcount, and expansion plans.",
  },
];

export function ProblemSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-28 px-6" style={{ borderTop: "1px solid var(--border-dim)" }}>
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.55 }}
          className="mb-14 max-w-[600px]"
        >
          <span className="text-[11px] font-medium tracking-[0.09em] uppercase mb-4 block" style={{ color: "var(--color-subtle)" }}>
            The problem
          </span>
          <h2 className="text-[40px] font-bold tracking-[-0.025em] leading-[1.08]" style={{ color: "var(--color-text)" }}>
            On-chain transparency<br />cuts both ways.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed max-w-[440px]" style={{ color: "var(--color-muted)" }}>
            Blockchains are auditable by design. That&apos;s a feature — until your financial controls become public information.
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-px" style={{ background: "var(--border-dim)", borderRadius: "10px", overflow: "hidden" }}>
          {PROBLEMS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 16 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="relative p-8"
                style={{ background: "#0E0E11" }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse 60% 40% at 30% 20%, rgba(147,68,68,0.05) 0%, transparent 70%)",
                  }}
                />
                <div className="relative">
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center mb-5"
                    style={{ background: "rgba(147,68,68,0.08)", border: "1px solid rgba(147,68,68,0.18)" }}
                  >
                    <Icon className="w-4 h-4" style={{ color: "var(--color-denied)" }} />
                  </div>
                  <h3 className="text-[16px] font-semibold tracking-[-0.01em] mb-3" style={{ color: "var(--color-text)" }}>
                    {p.title}
                  </h3>
                  <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                    {p.body}
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
