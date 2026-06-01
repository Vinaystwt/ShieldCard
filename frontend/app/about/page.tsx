"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
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

const MILESTONES = [
  {
    title: "Private Approval Engine",
    desc: "First encrypted spend approval on Arbitrum Sepolia. Employees submit amounts sealed with Fhenix CoFHE; the contract evaluates policy without seeing the value.",
  },
  {
    title: "Policy Engine",
    desc: "Four policy packs, three-tier FHE routing (auto-approve / review / deny), and rolling encrypted department budgets.",
  },
  {
    title: "Treasury Control Plane",
    desc: "Departments, vendor compliance registry, risk routing, recurring spend controls, and a multi-approver settlement vault.",
  },
  {
    title: "Complete Treasury Product",
    desc: "Scoped auditor access with per-request disclosure grants, hash-chained tamper-evident receipts, wallet-free public verification, and one-click self-deployment.",
  },
];

const TECH_BADGES = [
  { label: "Fhenix CoFHE", url: "https://fhenix.io" },
  { label: "Arbitrum Sepolia", url: "https://arbitrum.io" },
  { label: "Solidity 0.8", url: "https://soliditylang.org" },
  { label: "Next.js 14", url: "https://nextjs.org" },
  { label: "wagmi v2", url: "https://wagmi.sh" },
  { label: "viem v2", url: "https://viem.sh" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="mx-auto max-w-[860px] px-6 py-16">

        {/* Section 1: Product story */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium mb-8"
            style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
            About ShieldCard
          </div>
          <h1 className="text-[42px] font-bold tracking-[-0.03em] leading-[1.1] mb-8 text-text">
            Built for Teams That Cannot<br />Afford Leaks
          </h1>
          <div className="flex flex-col gap-5 max-w-[680px]">
            <p className="text-[17px] leading-relaxed text-muted">
              Corporate spend on a public chain is public. Competitors can see your vendor
              relationships, budget allocations, and approval patterns. ShieldCard makes spend
              policy enforceable without making it visible.
            </p>
            <p className="text-[17px] leading-relaxed text-muted">
              We built ShieldCard on Fhenix CoFHE because the problem requires stateful computation
              over encrypted data — not just hiding values, but enforcing policy rules on values
              that must remain sealed across the entire lifecycle of a request.
            </p>
          </div>
        </motion.div>

        {/* Section 2: Journey */}
        <FadeInSection>
          <div className="mb-20">
            <h2 className="text-[28px] font-bold tracking-[-0.025em] mb-10 text-text">
              From Proof of Concept to Production
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {MILESTONES.map((m, i) => (
                <motion.div
                  key={m.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="rounded-xl p-6"
                  style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold mb-4"
                    style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
                    {i + 1}
                  </div>
                  <h3 className="text-[15px] font-semibold mb-2 text-text">{m.title}</h3>
                  <p className="text-[13px] leading-relaxed text-muted">{m.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Section 3: Technology */}
        <FadeInSection delay={0.05}>
          <div className="mb-20">
            <h2 className="text-[28px] font-bold tracking-[-0.025em] mb-5 text-text">Why Fhenix CoFHE</h2>
            <p className="text-[16px] leading-relaxed mb-8 text-muted max-w-[680px]">
              CoFHE lets contracts compute over ciphertext.{" "}
              <code className="text-[14px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.add</code>,{" "}
              <code className="text-[14px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.lte</code>,{" "}
              <code className="text-[14px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.and</code>, and{" "}
              <code className="text-[14px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.06)", color: "var(--color-copper)" }}>FHE.select</code>{" "}
              run on encrypted operands. No value is decrypted until the threshold MPC network
              produces a signed result. Correctness is secured by fraud proofs and EigenLayer
              economic staking.
            </p>
            <div className="flex flex-wrap gap-2">
              {TECH_BADGES.map((b) => (
                <a key={b.label} href={b.url} target="_blank" rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-all hover:brightness-110"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-mid)", color: "var(--color-muted)" }}>
                  {b.label}
                </a>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* Section 4: Builder */}
        <FadeInSection delay={0.05}>
          <div className="mb-20 rounded-2xl p-8"
            style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}>
            <h2 className="text-[20px] font-bold tracking-[-0.02em] mb-4 text-text">Built by Vinay</h2>
            <p className="text-[15px] leading-relaxed mb-6 text-muted">
              Vinay is a builder embedded in the Indian Web3 ecosystem, co-founder of Vega
              Protocol, and host of the Buy High Sell Low podcast. ShieldCard was built during
              the Fhenix Privacy-by-Design Buildathon.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com/Vinaystwt" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-dim)", color: "var(--color-muted)" }}>
                <ExternalLink className="w-4 h-4" /> GitHub
              </a>
              <a href="https://twitter.com/vinaystwt" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all hover:brightness-110"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-dim)", color: "var(--color-muted)" }}>
                <ExternalLink className="w-4 h-4" /> @vinaystwt
              </a>
            </div>
          </div>
        </FadeInSection>

        {/* Section 5: CTA */}
        <FadeInSection delay={0.05}>
          <div className="flex items-center gap-4">
            <a href="https://github.com/Vinaystwt/ShieldCard" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-medium transition-all hover:brightness-110"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-mid)", color: "var(--color-text)" }}>
              <ExternalLink className="w-4 h-4" /> View on GitHub
            </a>
            <Link href="/deploy"
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110"
              style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
              Deploy for Your Team <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </FadeInSection>

      </main>
    </div>
  );
}
