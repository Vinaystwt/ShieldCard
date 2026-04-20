"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Shield, Users, Eye } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { WordMark } from "@/components/brand/WordMark";
import { RoleBadge } from "@/components/ui/RoleBadge";
import { useRoleRouting } from "@/hooks/useRoleRouting";
import { useShieldCard } from "@/hooks/useShieldCard";

const ROLE_CARDS = [
  {
    role: "Admin",
    icon: Shield,
    href: "/admin",
    description: "Manage employees, set encrypted limits, and publish results to the audit trail.",
    color: "copper",
  },
  {
    role: "Employee",
    icon: Users,
    href: "/employee",
    description: "Submit encrypted payment requests and privately reveal your results.",
    color: "steel",
  },
  {
    role: "Observer",
    icon: Eye,
    href: "/observer",
    description: "View public request metadata and ciphertext handles — no wallet needed.",
    color: "neutral",
  },
];

export default function AppGatewayPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { isConfigured } = useShieldCard();
  const { isAdmin, isEmployee, isLoading, role } = useRoleRouting();

  useEffect(() => {
    if (!isConnected || !isConfigured || isLoading) return;
    const dest = isAdmin ? "/admin" : isEmployee ? "/employee" : "/observer";
    const timer = setTimeout(() => router.replace(dest), 600);
    return () => clearTimeout(timer);
  }, [isAdmin, isConfigured, isConnected, isEmployee, isLoading, router]);

  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[520px] text-center"
        >
          <div className="mb-10 flex justify-center">
            <WordMark size="lg" />
          </div>

          <h1
            className="text-[30px] font-bold tracking-[-0.025em] mb-3"
            style={{ color: "var(--color-text)" }}
          >
            Connect to enter
          </h1>
          <p className="text-[15px] leading-relaxed mb-10 max-w-[360px] mx-auto" style={{ color: "var(--color-muted)" }}>
            Your wallet determines your role. Admins, employees, and observers see different views of the same encrypted data.
          </p>

          {/* Wallet connect */}
          <div className="mb-10 flex justify-center">
            <ConnectButton label="Connect Wallet" chainStatus="icon" showBalance={false} />
          </div>

          {/* Role detection result */}
          <AnimatePresence>
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
                className="mb-8 p-5 rounded-xl text-center"
                style={{
                  background: "#0E0E11",
                  border: "1px solid var(--border-mid)",
                }}
              >
                {isLoading ? (
                  <p className="text-[13px] animate-pending" style={{ color: "var(--color-muted)" }}>
                    Detecting role...
                  </p>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.07em]" style={{ color: "var(--color-subtle)" }}>
                      Role detected
                    </span>
                    <RoleBadge role={role} size="md" />
                    {(isAdmin || isEmployee) && (
                      <p className="text-[12px] mt-1" style={{ color: "var(--color-subtle)" }}>
                        Redirecting to your workspace...
                      </p>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Role cards */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-3 gap-4 w-full max-w-[880px] mt-4"
        >
          {ROLE_CARDS.map((card, i) => {
            const Icon = card.icon;
            const isCopper = card.color === "copper";
            const isSteel = card.color === "steel";
            return (
              <motion.div
                key={card.role}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.30 + i * 0.08 }}
              >
                <Link
                  href={card.href}
                  className="group block p-6 rounded-xl transition-all duration-200 hover:translate-y-[-2px] hover:brightness-110"
                  style={{
                    background: "#0E0E11",
                    border: isCopper
                      ? "1px solid var(--copper-border-dim)"
                      : isSteel
                      ? "1px solid var(--steel-border)"
                      : "1px solid var(--border-dim)",
                    boxShadow: isCopper
                      ? "0 0 40px rgba(200,131,63,0.04) inset"
                      : isSteel
                      ? "0 0 40px rgba(110,144,178,0.04) inset"
                      : "none",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
                    style={{
                      background: isCopper
                        ? "rgba(200,131,63,0.09)"
                        : isSteel
                        ? "rgba(110,144,178,0.09)"
                        : "rgba(255,255,255,0.04)",
                      border: isCopper
                        ? "1px solid var(--copper-border-dim)"
                        : isSteel
                        ? "1px solid var(--steel-border)"
                        : "1px solid var(--border-dim)",
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{
                        color: isCopper
                          ? "var(--color-copper)"
                          : isSteel
                          ? "var(--color-steel)"
                          : "var(--color-muted)",
                      }}
                    />
                  </div>
                  <div
                    className="text-[14px] font-semibold mb-2 tracking-[-0.01em]"
                    style={{ color: "var(--color-text)" }}
                  >
                    {card.role}
                  </div>
                  <p className="text-[12px] leading-relaxed mb-4" style={{ color: "var(--color-muted)" }}>
                    {card.description}
                  </p>
                  <div
                    className="flex items-center gap-1 text-[11px] group-hover:gap-1.5 transition-all"
                    style={{ color: "var(--color-subtle)" }}
                  >
                    Enter <ArrowRight className="w-3 h-3" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </main>
    </div>
  );
}
