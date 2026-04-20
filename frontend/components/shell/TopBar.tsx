"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { WordMark } from "@/components/brand/WordMark";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useRoleRouting } from "@/hooks/useRoleRouting";
import { truncateAddress } from "@/lib/format";

const NAV_TABS = [
  { href: "/admin",    label: "Admin" },
  { href: "/employee", label: "Employee" },
  { href: "/observer", label: "Observer" },
];

export function TopBar() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { role } = useRoleRouting();

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

        {/* Center: role tabs */}
        <nav className="flex items-center gap-1">
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

        {/* Right: wallet + role */}
        <div className="flex items-center gap-3">
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
          <ConnectButton
            chainStatus="none"
            showBalance={false}
            label="Connect"
            accountStatus="avatar"
          />
        </div>
      </div>
    </header>
  );
}
