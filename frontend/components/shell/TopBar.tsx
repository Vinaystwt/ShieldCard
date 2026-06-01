"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Menu, X, ChevronDown, CheckCircle2, Circle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { WordMark } from "@/components/brand/WordMark";
import { WalletButton } from "@/components/wallet/WalletButton";
import { getInstanceAddress, isCustomInstance, clearInstanceAddresses } from "@/lib/instance";
import { truncateAddress } from "@/lib/format";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/deploy",       label: "Deploy" },
  { href: "/observer",     label: "Observer" },
  { href: "/about",        label: "About" },
];

export function TopBar() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [instanceOpen, setInstanceOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [instanceAddr, setInstanceAddr] = useState("");

  useEffect(() => {
    setIsCustom(isCustomInstance());
    setInstanceAddr(getInstanceAddress());
  }, []);

  function handleSwitchToDemo() {
    clearInstanceAddresses();
    window.location.reload();
  }

  function handleConnectCustom() {
    if (!customInput.match(/^0x[a-fA-F0-9]{40}$/)) return;
    localStorage.setItem("shieldcard_instance", customInput);
    window.location.reload();
  }

  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: "rgba(10, 10, 12, 0.92)",
        backdropFilter: "blur(16px)",
        borderBottom: "1px solid var(--border-dim)",
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 h-14 flex items-center justify-between gap-6">
        {/* Left: wordmark */}
        <WordMark size="sm" />

        {/* Center: nav links (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
                  isActive ? "text-text bg-raised" : "text-muted hover:text-text hover:bg-raised/60"
                }`}
                style={isActive ? { border: "1px solid var(--border-dim)" } : { border: "1px solid transparent" }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: instance chip + Launch App + wallet */}
        <div className="hidden md:flex items-center gap-3">
          {/* Instance indicator */}
          <div className="relative">
            <button
              onClick={() => setInstanceOpen((o) => !o)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all hover:brightness-110"
              style={{
                background: isCustom ? "rgba(110,144,178,0.08)" : "rgba(77,145,112,0.08)",
                border: `1px solid ${isCustom ? "var(--steel-border)" : "rgba(77,145,112,0.20)"}`,
                color: isCustom ? "var(--color-steel)" : "var(--color-approved)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: isCustom ? "var(--color-steel)" : "var(--color-approved)" }}
              />
              {isCustom ? truncateAddress(instanceAddr) : "Demo Instance"}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            <AnimatePresence>
              {instanceOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-64 rounded-xl p-3 z-50"
                  style={{ background: "#0E0E11", border: "1px solid var(--border-mid)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
                >
                  {isCustom && (
                    <button
                      onClick={handleSwitchToDemo}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] text-left mb-1 transition-colors hover:bg-raised"
                      style={{ color: "var(--color-approved)" }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Switch to Demo Instance
                    </button>
                  )}
                  <Link
                    href="/deploy"
                    onClick={() => setInstanceOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-[13px] mb-1 transition-colors hover:bg-raised"
                    style={{ color: "var(--color-text)" }}
                  >
                    <Circle className="w-3.5 h-3.5" />
                    Deploy New Instance
                  </Link>
                  <div className="pt-2" style={{ borderTop: "1px solid var(--border-dim)" }}>
                    <p className="text-[10px] uppercase tracking-[0.07em] mb-1.5 px-1" style={{ color: "var(--color-subtle)" }}>
                      Connect Existing Instance
                    </p>
                    <div className="flex gap-1">
                      <input
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="0x..."
                        className="flex-1 px-2.5 py-1.5 rounded-md text-[11px] font-mono outline-none"
                        style={{ background: "var(--bg-raised)", border: "1px solid var(--border-mid)", color: "var(--color-text)" }}
                      />
                      <button
                        onClick={handleConnectCustom}
                        disabled={!customInput.match(/^0x[a-fA-F0-9]{40}$/)}
                        className="px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40"
                        style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            href="/app"
            className="px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all duration-150 hover:brightness-110"
            style={{
              background: "rgba(200,131,63,0.10)",
              border: "1px solid var(--copper-border-dim)",
              color: "var(--color-copper)",
            }}
          >
            Launch App
          </Link>

          {isConnected && <WalletButton label="Connected" />}
          {!isConnected && <WalletButton label="Connect" />}
        </div>

        {/* Mobile: hamburger */}
        <div className="flex md:hidden items-center gap-3 ml-auto">
          <WalletButton label="Connect" />
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-1.5 rounded-md transition-colors"
            style={{ border: "1px solid var(--border-dim)", color: "var(--color-muted)" }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid var(--border-dim)", background: "rgba(10, 10, 12, 0.98)" }}
          >
            <nav className="px-6 py-4 flex flex-col gap-1">
              {NAV_LINKS.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-2.5 rounded-md text-[14px] font-medium transition-all ${isActive ? "text-text" : "text-muted"}`}
                    style={{
                      background: isActive ? "var(--bg-raised)" : "transparent",
                      border: isActive ? "1px solid var(--border-dim)" : "1px solid transparent",
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
              <Link
                href="/app"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-2.5 rounded-md text-[14px] font-semibold mt-1"
                style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}
              >
                Launch App
              </Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click-away for instance dropdown */}
      {instanceOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setInstanceOpen(false)} />
      )}
    </header>
  );
}
