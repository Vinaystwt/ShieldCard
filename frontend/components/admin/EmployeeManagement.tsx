"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Lock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

import { TransactionStatus } from "@/hooks/useShieldCard";
import { cn, getErrorMessage } from "@/lib/format";

interface EmployeeManagementProps {
  onRegister: (
    employee: `0x${string}`,
    onStatusChange: (status: TransactionStatus) => void,
  ) => Promise<void>;
  onSetLimit: (
    employee: `0x${string}`,
    amountUsd: number,
    onStatusChange: (status: TransactionStatus) => void,
  ) => Promise<void>;
  canRegister: boolean;
  canSetLimit: boolean;
  registerDisabledReason?: string;
  limitDisabledReason?: string;
}

export function EmployeeManagement({
  onRegister,
  onSetLimit,
  canRegister,
  canSetLimit,
  registerDisabledReason,
  limitDisabledReason,
}: EmployeeManagementProps) {
  const [expanded, setExpanded] = useState(true);
  const [regAddress, setRegAddress] = useState("");
  const [regPhase, setRegPhase] = useState<
    "idle" | "awaiting_wallet" | "confirming" | "done" | "error"
  >("idle");
  const [regMsg, setRegMsg] = useState("");
  const [limitAddress, setLimitAddress] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [limitPhase, setLimitPhase] = useState<
    "idle" | "encrypting" | "awaiting_wallet" | "confirming" | "done" | "error"
  >("idle");
  const [limitMsg, setLimitMsg] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regAddress || regPhase === "awaiting_wallet" || regPhase === "confirming") {
      return;
    }

    setRegPhase("awaiting_wallet");
    setRegMsg("");

    try {
      await onRegister(regAddress as `0x${string}`, (status) => {
        if (status.phase === "awaiting_wallet") {
          setRegPhase("awaiting_wallet");
          setRegMsg("Approve the employee registration in MetaMask.");
        }
        if (status.phase === "submitted" || status.phase === "confirming") {
          setRegPhase("confirming");
          setRegMsg("Registration submitted. Waiting for confirmation.");
        }
      });

      setRegPhase("done");
      setRegMsg(`${regAddress.slice(0, 6)}...${regAddress.slice(-4)} registered`);
      setRegAddress("");
      setTimeout(() => setRegPhase("idle"), 3000);
    } catch (err: unknown) {
      setRegPhase("error");
      setRegMsg(getErrorMessage(err));
    }
  }

  async function handleSetLimit(e: React.FormEvent) {
    e.preventDefault();
    if (
      !limitAddress ||
      !limitAmount ||
      limitPhase === "encrypting" ||
      limitPhase === "awaiting_wallet" ||
      limitPhase === "confirming"
    ) {
      return;
    }

    setLimitPhase("encrypting");
    setLimitMsg("Encrypting limit locally...");

    try {
      await onSetLimit(
        limitAddress as `0x${string}`,
        parseFloat(limitAmount),
        (status) => {
          if (status.phase === "awaiting_wallet") {
            setLimitPhase("awaiting_wallet");
            setLimitMsg("Encryption finished. Confirm the limit update in MetaMask.");
          }
          if (status.phase === "submitted" || status.phase === "confirming") {
            setLimitPhase("confirming");
            setLimitMsg("Encrypted limit submitted. Waiting for confirmation.");
          }
        },
      );

      setLimitPhase("done");
      setLimitMsg("Limit stored encrypted — value hidden on-chain");
      setLimitAddress("");
      setLimitAmount("");
      setTimeout(() => setLimitPhase("idle"), 3000);
    } catch (err: unknown) {
      setLimitPhase("error");
      setLimitMsg(getErrorMessage(err));
    }
  }

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-mid)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left transition-colors hover:bg-raised/40"
        style={{
          background: "#0E0E11",
          borderBottom: expanded ? "1px solid var(--border-dim)" : "none",
        }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{
                background: "rgba(200,131,63,0.08)",
                border: "1px solid var(--copper-border-dim)",
              }}
            >
              <UserPlus className="h-3.5 w-3.5 text-copper" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-text">
                Employee management
              </p>
              <p className="text-[11px] text-subtle">
                Register employees and set encrypted limits
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-subtle" />
          ) : (
            <ChevronDown className="h-4 w-4 text-subtle" />
          )}
        </div>
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
            <div className="grid grid-cols-2 gap-5 p-5">
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
                  disabled={!canRegister || regPhase === "awaiting_wallet" || regPhase === "confirming"}
                  className="w-full rounded-md px-3 py-2 text-[12px] font-mono text-text placeholder:text-subtle"
                  style={{
                    background: "var(--color-raised)",
                    border: "1px solid var(--border-dim)",
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={
                    !canRegister ||
                    regPhase === "awaiting_wallet" ||
                    regPhase === "confirming" ||
                    !regAddress
                  }
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition-all duration-150",
                    regPhase === "done" ? "text-approved" : "text-text",
                    !canRegister || !regAddress
                      ? "cursor-not-allowed opacity-40"
                      : "hover:brightness-110 active:scale-95",
                  )}
                  style={{
                    background:
                      regPhase === "done"
                        ? "var(--approved-bg)"
                        : "rgba(200,131,63,0.10)",
                    border:
                      regPhase === "done"
                        ? "1px solid rgba(77,145,112,0.25)"
                        : "1px solid var(--copper-border-dim)",
                  }}
                >
                  {regPhase === "awaiting_wallet" ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-muted animate-pending" />
                      Open MetaMask...
                    </>
                  ) : regPhase === "confirming" ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-muted animate-pending" />
                      Confirming...
                    </>
                  ) : regPhase === "done" ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Registered
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Register
                    </>
                  )}
                </button>
                {(regPhase === "done" || regPhase === "error") && regMsg && (
                  <p className={cn("text-[11px]", regPhase === "done" ? "text-approved" : "text-denied")}>
                    {regPhase === "error" && <AlertCircle className="mr-1 inline h-3 w-3" />}
                    {regMsg}
                  </p>
                )}
                {(regPhase === "awaiting_wallet" || regPhase === "confirming") && regMsg && (
                  <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                    {regMsg}
                  </p>
                )}
                {!canRegister && registerDisabledReason && (
                  <p className="text-[11px]" style={{ color: "var(--color-subtle)" }}>
                    {registerDisabledReason}
                  </p>
                )}
              </form>

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
                  disabled={
                    !canSetLimit ||
                    limitPhase === "encrypting" ||
                    limitPhase === "awaiting_wallet" ||
                    limitPhase === "confirming"
                  }
                  className="w-full rounded-md px-3 py-2 text-[12px] font-mono text-text placeholder:text-subtle"
                  style={{
                    background: "var(--color-raised)",
                    border: "1px solid var(--border-dim)",
                    outline: "none",
                  }}
                />
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-subtle">
                    $
                  </span>
                  <input
                    type="number"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    placeholder="500.00"
                    min="0"
                    step="0.01"
                    required
                    disabled={
                      !canSetLimit ||
                      limitPhase === "encrypting" ||
                      limitPhase === "awaiting_wallet" ||
                      limitPhase === "confirming"
                    }
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
                  disabled={
                    !canSetLimit ||
                    limitPhase === "encrypting" ||
                    limitPhase === "awaiting_wallet" ||
                    limitPhase === "confirming" ||
                    !limitAddress ||
                    !limitAmount
                  }
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-medium transition-all duration-150",
                    limitPhase === "done" ? "text-approved" : "text-text",
                    !canSetLimit || !limitAddress || !limitAmount
                      ? "cursor-not-allowed opacity-40"
                      : "hover:brightness-110 active:scale-95",
                  )}
                  style={{
                    background:
                      limitPhase === "done"
                        ? "var(--approved-bg)"
                        : "rgba(110,144,178,0.10)",
                    border:
                      limitPhase === "done"
                        ? "1px solid rgba(77,145,112,0.25)"
                        : "1px solid var(--steel-border)",
                  }}
                >
                  {limitPhase === "encrypting" ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-muted animate-pending" />
                      Encrypting...
                    </>
                  ) : limitPhase === "awaiting_wallet" ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-muted animate-pending" />
                      Open MetaMask...
                    </>
                  ) : limitPhase === "confirming" ? (
                    <>
                      <span className="h-2.5 w-2.5 rounded-full bg-muted animate-pending" />
                      Confirming...
                    </>
                  ) : limitPhase === "done" ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      Limit set
                    </>
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5" />
                      Encrypt & Set
                    </>
                  )}
                </button>
                {(limitPhase === "done" || limitPhase === "error") && limitMsg && (
                  <p className={cn("text-[11px]", limitPhase === "done" ? "text-approved" : "text-denied")}>
                    {limitPhase === "error" && <AlertCircle className="mr-1 inline h-3 w-3" />}
                    {limitMsg}
                  </p>
                )}
                {(limitPhase === "encrypting" ||
                  limitPhase === "awaiting_wallet" ||
                  limitPhase === "confirming") &&
                  limitMsg && (
                    <p className="text-[11px]" style={{ color: "var(--color-muted)" }}>
                      {limitMsg}
                    </p>
                  )}
                {!canSetLimit && limitDisabledReason && (
                  <p className="text-[11px]" style={{ color: "var(--color-subtle)" }}>
                    {limitDisabledReason}
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
