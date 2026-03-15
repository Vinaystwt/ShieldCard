"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";

export function CtaStrip() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      ref={ref}
      className="py-28 px-6"
      style={{ borderTop: "1px solid var(--border-dim)" }}
    >
      <div className="mx-auto max-w-[1280px]">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl px-14 py-16 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #131119 0%, #0F0F14 50%, #0E1018 100%)",
            border: "1px solid var(--copper-border-dim)",
          }}
        >
          {/* Strong copper glow — top-right */}
          <div
            className="absolute top-0 right-0 pointer-events-none"
            style={{
              width: "380px",
              height: "380px",
              background: "radial-gradient(circle, rgba(200,131,63,0.12) 0%, transparent 65%)",
              transform: "translate(25%, -25%)",
            }}
          />
          {/* Subtle steel glow — bottom-left */}
          <div
            className="absolute bottom-0 left-0 pointer-events-none"
            style={{
              width: "240px",
              height: "240px",
              background: "radial-gradient(circle, rgba(110,144,178,0.06) 0%, transparent 65%)",
              transform: "translate(-20%, 20%)",
            }}
          />

          {/* Diagonal grid hint */}
          <div
            className="absolute inset-0 pointer-events-none fine-grid"
            style={{ opacity: 0.6 }}
          />

          <div className="relative flex items-center justify-between gap-12">
            <div className="max-w-[540px]">
              <p className="text-[11px] font-medium tracking-[0.09em] uppercase mb-4" style={{ color: "var(--color-copper)" }}>
                Live on Arbitrum Sepolia
              </p>
              <h2 className="text-[40px] font-bold tracking-[-0.025em] leading-[1.08] mb-4" style={{ color: "var(--color-text)" }}>
                See it live.<br />Nothing to trust.
              </h2>
              <p className="text-[16px] leading-relaxed" style={{ color: "var(--color-muted)" }}>
                Connect a wallet, submit an encrypted request, and privately decrypt your result.
                Real FHE evaluation — nothing simulated.
              </p>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0">
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-[13px] font-medium transition-colors duration-150 hover:text-text"
                style={{
                  color: "var(--color-muted)",
                  border: "1px solid var(--border-mid)",
                }}
              >
                Observer view — no wallet needed
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
