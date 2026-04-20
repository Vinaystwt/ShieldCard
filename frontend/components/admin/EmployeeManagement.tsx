"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Lock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/format";

interface EmployeeManagementProps {
  onRegister: (employee: `0x${string}`) => Promise<void>;
  onSetLimit: (employee: `0x${string}`, amountUsd: number) => Promise<void>;
  isBusy: boolean;
}

export function EmployeeManagement({ onRegister, onSetLimit, isBusy }: EmployeeManagementProps) {
  const [expanded, setExpanded] = useState(true);

  // Register state
  const [regAddress, setRegAddress] = useState("");
  const [regPhase, setRegPhase] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [regMsg, setRegMsg] = useState("");

  // Limit state
  const [limitAddress, setLimitAddress] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [limitPhase, setLimitPhase] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [limitMsg, setLimitMsg] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regAddress || regPhase === "busy") return;
    setRegPhase("busy");
    setRegMsg("");
    try {
      await onRegister(regAddress as `0x${string}`);
      setRegPhase("done");
      setRegMsg(`${regAddress.slice(0, 6)}...${regAddress.slice(-4)} registered`);
      setRegAddress("");
      setTimeout(() => setRegPhase("idle"), 3000);
    } catch (err: unknown) {
      setRegPhase("error");
      setRegMsg(err instanceof Error ? err.message : "Registration failed.");
    }
  }

  async function handleSetLimit(e: React.FormEvent) {
    e.preventDefault();
    if (!limitAddress || !limitAmount || limitPhase === "busy") return;
    setLimitPhase("busy");
    setLimitMsg("Encrypting limit locally...");
    try {
      await onSetLimit(limitAddress as `0x${string}`, parseFloat(limitAmount));
      setLimitPhase("done");
      setLimitMsg("Limit stored encrypted — value hidden on-chain");
      setLimitAddress("");
      setLimitAmount("");
      setTimeout(() => setLimitPhase("idle"), 3000);
    } catch (err: unknown) {
      setLimitPhase("error");
      setLimitMsg(err instanceof Error ? err.message : "Failed to set limit.");
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-mid)" }}>
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-raised/40"
        style={{ background: "#0E0E11", borderBottom: expanded ? "1px solid var(--border-dim)" : "none" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)" }}
          >
            <UserPlus className="w-3.5 h-3.5 text-copper" />
          </div>
          <div>
            <p className="text-[14px] font-semibold text-text tracking-[-0.01em]">Employee management</p>
            <p className="text-[11px] text-subtle">Register employees and set encrypted limits</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-subtle" />
        ) : (
          <ChevronDown className="w-4 h-4 text-subtle" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: "hidden", background: "#0E0E11" }}
          >
            <div className="p-5 grid grid-cols-2 gap-5">
              {/* Register employee */}
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <h4 className="text-[12px] font-medium uppercase tracking-[0.07em] text-subtle">
                  Register employee
                </h4>
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  disabled={isBusy || regPhase === "busy"}
                  className="w-full rounded-md px-3 py-2 text-[12px] font-mono text-text placeholder:text-subtle"
                  style={{
                    background: "var(--color-raised)",
                    border: "1px solid var(--border-dim)",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={isBusy || regPhase === "busy" || !regAddress}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all duration-150",
                    regPhase === "done" ? "text-approved" : "text-text",
                    (isBusy || !regAddress) ? "opacity-40 cursor-not-allowed" : "hover:brightness-110 active:scale-95"
                  )}
                  style={{
                    background: regPhase === "done" ? "var(--approved-bg)" : "rgba(200,131,63,0.10)",
                    border: regPhase === "done" ? "1px solid rgba(77,145,112,0.25)" : "1px solid var(--copper-border-dim)",
                  }}
                >
                  {regPhase === "busy" ? (
                    <><span className="w-2.5 h-2.5 rounded-full bg-muted animate-pending" />Registering...</>
                  ) : regPhase === "done" ? (
                    <><CheckCircle className="w-3.5 h-3.5" />Registered</>
                  ) : (
                    <><UserPlus className="w-3.5 h-3.5" />Register</>
                  )}
                </button>
                {(regPhase === "done" || regPhase === "error") && regMsg && (
                  <p className={cn("text-[11px]", regPhase === "done" ? "text-approved" : "text-denied")}>
                    {regPhase === "error" && <AlertCircle className="w-3 h-3 inline mr-1" />}
                    {regMsg}
                  </p>
                )}
              </form>

              {/* Set encrypted limit */}
              <form onSubmit={handleSetLimit} className="flex flex-col gap-3">
                <h4 className="text-[12px] font-medium uppercase tracking-[0.07em] text-subtle">
                  Set encrypted limit
                </h4>
                <input
                  type="text"
                  value={limitAddress}
                  onChange={(e) => setLimitAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  disabled={isBusy || limitPhase === "busy"}
                  className="w-full rounded-md px-3 py-2 text-[12px] font-mono text-text placeholder:text-subtle"
                  style={{
                    background: "var(--color-raised)",
                    border: "1px solid var(--border-dim)",
                    outline: "none",
                  }}
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle text-[12px]">$</span>
                  <input
                    type="number"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    placeholder="500.00"
                    min="0"
                    step="0.01"
                    required
                    disabled={isBusy || limitPhase === "busy"}
                    className="w-full rounded-md px-3 py-2 pl-6 text-[12px] font-mono text-text placeholder:text-subtle"
                    style={{
                      background: "var(--color-raised)",
                      border: "1px solid var(--border-dim)",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBusy || limitPhase === "busy" || !limitAddress || !limitAmount}
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[12px] font-medium transition-all duration-150",
                    limitPhase === "done" ? "text-approved" : "text-text",
                    (isBusy || !limitAddress || !limitAmount) ? "opacity-40 cursor-not-allowed" : "hover:brightness-110 active:scale-95"
                  )}
                  style={{
                    background: limitPhase === "done" ? "var(--approved-bg)" : "rgba(110,144,178,0.10)",
                    border: limitPhase === "done" ? "1px solid rgba(77,145,112,0.25)" : "1px solid var(--steel-border)",
                  }}
                >
                  {limitPhase === "busy" ? (
                    <><span className="w-2.5 h-2.5 rounded-full bg-muted animate-pending" />Encrypting...</>
                  ) : limitPhase === "done" ? (
                    <><CheckCircle className="w-3.5 h-3.5" />Limit set</>
                  ) : (
                    <><Lock className="w-3.5 h-3.5" />Encrypt & Set</>
                  )}
                </button>
                {(limitPhase === "done" || limitPhase === "error") && limitMsg && (
                  <p className={cn("text-[11px]", limitPhase === "done" ? "text-approved" : "text-denied")}>
                    {limitPhase === "error" && <AlertCircle className="w-3 h-3 inline mr-1" />}
                    {limitMsg}
                  </p>
                )}
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
