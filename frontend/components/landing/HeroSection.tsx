"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import { HeroGraphic } from "./HeroGraphic";

const HEADLINE_LINES = [
  { text: "Corporate spend", accent: false },
  { text: "control.", accent: true },
  { text: "Nothing exposed.", accent: false },
];

const STATS = [
  { value: "FHE-native", label: "encryption" },
  { value: "0 plaintext", label: "on-chain" },
  { value: "permit-gated", label: "reveal" },
];

export function HeroSection() {
  return (
    <section className="relative min-h-[96vh] flex items-center overflow-hidden dot-grid">
      {/* Ambient glow — right side */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 50% 60% at 68% 44%, rgba(200,131,63,0.07) 0%, rgba(110,144,178,0.03) 55%, transparent 75%)",
        }}
      />

      {/* Subtle vignette edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 50%, transparent 60%, rgba(10,10,12,0.6) 100%)",
        }}
      />

      <div className="relative mx-auto max-w-[1280px] w-full px-6 py-24 grid grid-cols-[1fr_auto] gap-16 items-center">
        {/* Left: copy */}
        <div className="max-w-[580px]">
          {/* Eyebrow pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
            className="flex items-center gap-2 mb-10"
          >
            <span
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.07em] uppercase"
              style={{
                background: "rgba(200,131,63,0.07)",
                border: "1px solid var(--copper-border-dim)",
                color: "var(--color-copper)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-copper animate-pending" />
              FHE-native · Arbitrum Sepolia
            </span>
          </motion.div>

          {/* Headline — 3 lines with accent on "control." */}
          <div className="mb-8">
            {HEADLINE_LINES.map((line, i) => (
              <motion.h1
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18 + i * 0.13, ease: [0.16, 1, 0.3, 1] }}
                className={`block leading-[1.04] font-bold tracking-[-0.035em] ${
                  i === 2 ? "text-[62px]" : "text-[64px]"
                } ${line.accent ? "text-gradient-copper" : "text-text"}`}
              >
                {line.text}
              </motion.h1>
            ))}
          </div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.58, ease: [0, 0, 0.2, 1] }}
            className="text-[17px] leading-[1.65] mb-10 max-w-[460px]"
            style={{ color: "var(--color-muted)" }}
          >
            ShieldCard enforces payment policy on encrypted data.
            Amounts, limits, and decisions never appear in plaintext — on-chain or off.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.70, ease: [0, 0, 0.2, 1] }}
            className="flex items-center gap-4 mb-12"
          >
            <Link
              href="/app"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-md text-[14px] font-semibold text-text transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] hover:brightness-110"
              style={{
                background: "linear-gradient(135deg, #D09040 0%, #B86B2A 100%)",
                boxShadow: "0 0 32px rgba(200,131,63,0.28), 0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}
            >
              Open App
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/observer"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md text-[14px] font-medium transition-colors duration-150 hover:text-text"
              style={{
                color: "var(--color-muted)",
                border: "1px solid var(--border-mid)",
              }}
            >
              <Lock className="w-3.5 h-3.5" />
              Observer view
            </Link>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.90 }}
            className="flex items-center gap-0"
          >
            {STATS.map((stat, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && (
                  <div
                    className="w-px h-8 mx-5"
                    style={{ background: "var(--border-dim)" }}
                  />
                )}
                <div>
                  <p
                    className="text-[13px] font-semibold tracking-[-0.01em] font-mono"
                    style={{ color: "var(--color-copper)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[11px] tracking-[0.04em] uppercase" style={{ color: "var(--color-subtle)" }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right: hero graphic */}
        <motion.div
          initial={{ opacity: 0, scale: 0.90, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="w-[380px] shrink-0"
        >
          <HeroGraphic />
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, #0A0A0C)" }}
      />
    </section>
  );
}
