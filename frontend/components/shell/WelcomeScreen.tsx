"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Rocket } from "lucide-react";

export function WelcomeScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[480px] text-center"
    >
      <div
        className="rounded-2xl p-8"
        style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)" }}>
          <Rocket className="w-6 h-6 text-copper" />
        </div>
        <h2 className="text-[22px] font-bold tracking-[-0.02em] mb-3 text-text">
          You are not registered on this instance
        </h2>
        <p className="text-[14px] leading-relaxed mb-8 text-muted">
          This is a live demo of ShieldCard running on Arbitrum Sepolia. You can explore as a
          public observer, or deploy your own confidential treasury instance.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/observer"
            className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-[14px] font-medium transition-all hover:brightness-110"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--border-mid)", color: "var(--color-text)" }}
          >
            <Eye className="w-4 h-4" />
            Explore as Observer
          </Link>
          <Link
            href="/deploy"
            className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110"
            style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}
          >
            <Rocket className="w-4 h-4" />
            Deploy Your Own Instance
          </Link>
        </div>

        <p className="text-[12px] mt-6 text-subtle">
          Already have an instance?{" "}
          <span style={{ color: "var(--color-steel)" }}>Connect it from the topbar.</span>
        </p>
      </div>
    </motion.div>
  );
}
