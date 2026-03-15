"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { WordMark } from "@/components/brand/WordMark";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useRoleRouting } from "@/hooks/useRoleRouting";
import { truncateAddress } from "@/lib/format";

const NAV_TABS = [
  { href: "/admin",      label: "Admin" },
  { href: "/employee",   label: "Employee" },
  { href: "/observer",   label: "Observer" },
  { href: "/auditor",    label: "Auditor" },
  { href: "/settlement", label: "Settlement" },
  { href: "/verify",     label: "Verify" },
];

export function TopBar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { role } = useRoleRouting();
  const [mobileOpen, setMobileOpen] = useState(false);

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

        {/* Center: role tabs (desktop) */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_TABS.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "text-text bg-raised"
                    : "text-muted hover:text-text hover:bg-raised/60"
                }`}
                style={isActive ? { border: "1px solid var(--border-dim)" } : { border: "1px solid transparent" }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: wallet + role (desktop) */}
        <div className="hidden md:flex items-center gap-3">
          {isConnected && address && (
            <div className="flex items-center gap-2">
              <RoleBadge role={role} size="sm" />
              <span
                className="text-[11px] font-mono text-subtle px-2 py-0.5 rounded"
                style={{ background: "var(--border-dim)" }}
              >
                {truncateAddress(address)}
              </span>
            </div>
          )}
          <WalletButton label="Connect" />
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

      {/* Mobile menu dropdown */}
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
              {NAV_TABS.map((tab) => {
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setMobileOpen(false)}
                    className={`px-4 py-2.5 rounded-md text-[14px] font-medium transition-all ${
                      isActive ? "text-text" : "text-muted"
                    }`}
                    style={{
                      background: isActive ? "var(--bg-raised)" : "transparent",
                      border: isActive ? "1px solid var(--border-dim)" : "1px solid transparent",
                    }}
                  >
                    {tab.label}
                  </Link>
                );
              })}
              {isConnected && address && (
                <div className="mt-2 pt-2 flex items-center gap-2" style={{ borderTop: "1px solid var(--border-dim)" }}>
                  <RoleBadge role={role} size="sm" />
                  <span className="text-[11px] font-mono" style={{ color: "var(--color-subtle)" }}>
                    {truncateAddress(address)}
                  </span>
                </div>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
