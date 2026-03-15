"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Snowflake, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Users } from "lucide-react";

import { TransactionStatus } from "@/hooks/useShieldCard";
import { cn, getErrorMessage } from "@/lib/format";

interface EmployeeManagementProps {
  onRegister:   (emp: `0x${string}`, cb: (s: TransactionStatus) => void) => Promise<unknown>;
  onFreeze:     (emp: `0x${string}`, cb: (s: TransactionStatus) => void) => Promise<unknown>;
  onUnfreeze:   (emp: `0x${string}`, cb: (s: TransactionStatus) => void) => Promise<unknown>;
  canManage:    boolean;
  disabledReason?: string;
  employeeCount?: bigint;
}

type ActionPhase = "idle" | "awaiting_wallet" | "confirming" | "done" | "error";

function ActionForm({
  label,
  placeholder,
  icon: Icon,
  color,
  colorBg,
  colorBorder,
  onSubmit,
  canManage,
  disabledReason,
}: {
  label: string;
  placeholder: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  colorBg: string;
  colorBorder: string;
  onSubmit: (addr: `0x${string}`, cb: (s: TransactionStatus) => void) => Promise<unknown>;
  canManage: boolean;
  disabledReason?: string;
}) {
  const [addr, setAddr] = useState("");
  const [phase, setPhase] = useState<ActionPhase>("idle");
  const [msg, setMsg] = useState("");

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (!addr || phase === "awaiting_wallet" || phase === "confirming") return;
    setPhase("awaiting_wallet");
    setMsg("");
    try {
      await onSubmit(addr as `0x${string}`, (status) => {
        if (status.phase === "awaiting_wallet") { setPhase("awaiting_wallet"); setMsg("Confirm tx in wallet."); }
        if (status.phase === "submitted" || status.phase === "confirming") { setPhase("confirming"); setMsg("Waiting for confirmation."); }
      });
      setPhase("done");
      setMsg(`${addr.slice(0, 6)}...${addr.slice(-4)} ${label.toLowerCase()}d`);
      setAddr("");
      setTimeout(() => setPhase("idle"), 3000);
    } catch (err) {
      setPhase("error");
      setMsg(getErrorMessage(err));
    }
  }

  const busy = phase === "awaiting_wallet" || phase === "confirming";

  return (
    <form onSubmit={handle} className="flex flex-col gap-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.07em]" style={{ color: "var(--color-subtle)" }}>{label}</p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={addr}
          onChange={(e) => setAddr(e.target.value)}
          placeholder={placeholder}
          required
          disabled={!canManage || busy || phase === "done"}
          className="flex-1 rounded-md px-3 py-1.5 text-[12px] font-mono"
          style={{ background: "var(--color-raised)", border: "1px solid var(--border-dim)", color: "var(--color-text)", outline: "none" }}
        />
        <button
          type="submit"
          disabled={!canManage || !addr || busy || phase === "done"}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-all duration-150",
            phase === "done" ? "text-approved" : color,
            !canManage || !addr ? "cursor-not-allowed opacity-40" : "hover:brightness-110 active:scale-95",
          )}
          style={{
            background: phase === "done" ? "var(--approved-bg)" : colorBg,
            border: phase === "done" ? "1px solid rgba(77,145,112,0.25)" : `1px solid ${colorBorder}`,
          }}
        >
          {busy ? (
            <span className="h-2 w-2 rounded-full bg-muted animate-pending" />
          ) : phase === "done" ? (
            <CheckCircle className="h-3 w-3" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {busy ? "..." : phase === "done" ? "Done" : label}
        </button>
      </div>
      {msg && (
        <p className={cn("text-[10px]", phase === "done" ? "text-approved" : phase === "error" ? "text-denied" : "text-muted")}>
          {phase === "error" && <AlertCircle className="mr-1 inline h-3 w-3" />}
          {msg}
        </p>
      )}
      {!canManage && disabledReason && (
        <p className="text-[10px]" style={{ color: "var(--color-subtle)" }}>{disabledReason}</p>
      )}
    </form>
  );
}

export function EmployeeManagement({
  onRegister,
  onFreeze,
  onUnfreeze,
  canManage,
  disabledReason,
  employeeCount,
}: EmployeeManagementProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-mid)" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left transition-colors"
        style={{ background: "#0E0E11", borderBottom: expanded ? "1px solid var(--border-dim)" : "none" }}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)" }}>
              <Users className="h-3.5 w-3.5 text-copper" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-text">Employee management</p>
              <p className="text-[11px] text-subtle">
                {employeeCount !== undefined ? `${employeeCount} registered · ` : ""}
                Register, freeze, or unfreeze employees
              </p>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-subtle" /> : <ChevronDown className="h-4 w-4 text-subtle" />}
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
            <div className="grid grid-cols-3 gap-5 p-5">
              <ActionForm
                label="Register"
                placeholder="0x... employee address"
                icon={UserPlus}
                color="text-copper"
                colorBg="rgba(200,131,63,0.10)"
                colorBorder="var(--copper-border-dim)"
                onSubmit={onRegister}
                canManage={canManage}
                disabledReason={disabledReason}
              />
              <ActionForm
                label="Freeze"
                placeholder="0x... address to freeze"
                icon={Snowflake}
                color="text-steel"
                colorBg="rgba(110,144,178,0.10)"
                colorBorder="var(--steel-border)"
                onSubmit={onFreeze}
                canManage={canManage}
                disabledReason={disabledReason}
              />
              <ActionForm
                label="Unfreeze"
                placeholder="0x... address to unfreeze"
                icon={CheckCircle}
                color="text-approved"
                colorBg="rgba(77,145,112,0.10)"
                colorBorder="rgba(77,145,112,0.25)"
                onSubmit={onUnfreeze}
                canManage={canManage}
                disabledReason={disabledReason}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
