"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Lock, CheckCircle, AlertCircle, ChevronDown, ChevronUp, RotateCcw, Power } from "lucide-react";

import { TransactionStatus } from "@/hooks/useShieldCard";
import { POLICY_PACKS } from "@/lib/contracts";
import { cn, getErrorMessage } from "@/lib/format";

export interface PackRowData {
  id:         number;
  name:       string;
  active:     boolean;
  limitsSet:  boolean;
  total:      bigint;
  approved:   bigint;
  denied:     bigint;
  pending:    bigint;
  inReview:   bigint;
  epochStart: bigint;
}

interface PolicyPackManagerProps {
  packs:            PackRowData[];
  onSetThresholds:  (packId: number, hardUsd: number, autoUsd: number, budgetUsd: number, cb: (s: TransactionStatus) => void) => Promise<unknown>;
  onSetActive:      (packId: number, active: boolean, cb: (s: TransactionStatus) => void) => Promise<unknown>;
  onResetBudget:    (packId: number, cb: (s: TransactionStatus) => void) => Promise<unknown>;
  canManage:        boolean;
  disabledReason?:  string;
}

type Phase = "idle" | "encrypting" | "awaiting_wallet" | "confirming" | "done" | "error";

function PackCard({
  pack,
  onSetThresholds,
  onSetActive,
  onResetBudget,
  canManage,
  disabledReason,
}: {
  pack: PackRowData;
  onSetThresholds: PolicyPackManagerProps["onSetThresholds"];
  onSetActive:     PolicyPackManagerProps["onSetActive"];
  onResetBudget:   PolicyPackManagerProps["onResetBudget"];
  canManage:       boolean;
  disabledReason?: string;
}) {
  const [hardUsd, setHardUsd]     = useState("");
  const [autoUsd, setAutoUsd]     = useState("");
  const [budgetUsd, setBudgetUsd] = useState("");
  const [phase, setPhase]         = useState<Phase>("idle");
  const [msg, setMsg]             = useState("");
  const [resetting, setResetting] = useState(false);
  const [toggling, setToggling]   = useState(false);

  async function handleSetThresholds(e: React.FormEvent) {
    e.preventDefault();
    if (!hardUsd || !autoUsd || !budgetUsd || phase === "encrypting" || phase === "awaiting_wallet" || phase === "confirming") return;
    setPhase("encrypting");
    setMsg("Encrypting thresholds locally...");
    try {
      await onSetThresholds(pack.id, parseFloat(hardUsd), parseFloat(autoUsd), parseFloat(budgetUsd), (status) => {
        if (status.phase === "awaiting_wallet") { setPhase("awaiting_wallet"); setMsg("Confirm encrypted thresholds tx in wallet."); }
        if (status.phase === "submitted" || status.phase === "confirming") { setPhase("confirming"); setMsg("Waiting for confirmation."); }
      });
      setPhase("done");
      setMsg("All thresholds stored encrypted on-chain");
      setHardUsd(""); setAutoUsd(""); setBudgetUsd("");
      setTimeout(() => setPhase("idle"), 4000);
    } catch (err) {
      setPhase("error");
      setMsg(getErrorMessage(err));
    }
  }

  async function handleToggleActive() {
    setToggling(true);
    try {
      await onSetActive(pack.id, !pack.active, () => {});
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  }

  async function handleResetBudget() {
    setResetting(true);
    try {
      await onResetBudget(pack.id, () => {});
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  }

  const busy = phase === "encrypting" || phase === "awaiting_wallet" || phase === "confirming";
  const staticPack = POLICY_PACKS.find((p) => p.id === pack.id);

  return (
    <div
      className="flex flex-col gap-4 rounded-xl p-5"
      style={{ background: "var(--color-raised)", border: `1px solid ${pack.active ? "var(--border-mid)" : "var(--border-dim)"}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-semibold tracking-[-0.01em] text-text">{pack.name}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{
              background: pack.active ? "rgba(77,145,112,0.10)" : "rgba(255,255,255,0.04)",
              color: pack.active ? "var(--color-approved)" : "var(--color-subtle)",
              border: pack.active ? "1px solid rgba(77,145,112,0.20)" : "1px solid var(--border-dim)",
            }}
          >
            {pack.active ? "Active" : "Inactive"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Budget reset */}
          <button
            onClick={handleResetBudget}
            disabled={!canManage || !pack.limitsSet || resetting}
            title="Reset rolling budget epoch"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-dim)", color: "var(--color-subtle)" }}
          >
            <RotateCcw className={cn("h-3 w-3", resetting ? "animate-spin" : "")} />
            Reset epoch
          </button>
          {/* Toggle active */}
          <button
            onClick={handleToggleActive}
            disabled={!canManage || toggling}
            title={pack.active ? "Deactivate pack" : "Activate pack"}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition-all duration-150 hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-dim)", color: "var(--color-subtle)" }}
          >
            <Power className="h-3 w-3" />
            {pack.active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Total", value: pack.total.toString() },
          { label: "Approved", value: pack.approved.toString(), color: "var(--color-approved)" },
          { label: "Denied", value: pack.denied.toString(), color: "var(--color-denied)" },
          { label: "Review", value: pack.inReview.toString(), color: "var(--color-pending)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-md px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-dim)" }}>
            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--color-subtle)" }}>{label}</p>
            <p className="text-[16px] font-bold" style={{ color: color ?? "var(--color-text)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Limits status */}
      <div className="flex items-center gap-1.5">
        {pack.limitsSet ? (
          <>
            <Lock className="h-3 w-3 text-approved opacity-70" />
            <span className="text-[11px] text-approved opacity-80">Encrypted thresholds set</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-pending animate-pending" />
            <span className="text-[11px] text-pending">No thresholds set</span>
          </>
        )}
      </div>

      {/* Threshold form */}
      <form onSubmit={handleSetThresholds} className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--color-subtle)" }}>
          {pack.limitsSet ? "Override thresholds" : "Set encrypted thresholds"} (USD)
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Hard limit", val: hardUsd, set: setHardUsd, placeholder: staticPack ? `$${(staticPack.hardLimitCents/100).toLocaleString()}` : "e.g. 2000" },
            { label: "Auto-approve ≤", val: autoUsd, set: setAutoUsd, placeholder: staticPack ? `$${(staticPack.autoThresholdCents/100).toLocaleString()}` : "e.g. 500" },
            { label: "Budget / epoch", val: budgetUsd, set: setBudgetUsd, placeholder: staticPack ? `$${(staticPack.budgetLimitCents/100).toLocaleString()}` : "e.g. 20000" },
          ].map(({ label, val, set, placeholder }) => (
            <div key={label}>
              <p className="text-[9px] mb-1" style={{ color: "var(--color-subtle)" }}>{label}</p>
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: "var(--color-subtle)" }}>$</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                  min="0"
                  step="0.01"
                  disabled={!canManage || busy || phase === "done"}
                  className="w-full rounded-md py-1.5 pl-5 pr-2 text-[11px] font-mono"
                  style={{ background: "var(--color-elevated)", border: "1px solid var(--border-dim)", color: "var(--color-text)", outline: "none" }}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          type="submit"
          disabled={!canManage || !hardUsd || !autoUsd || !budgetUsd || busy || phase === "done"}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-150",
            phase === "done" ? "text-approved" : "text-steel",
            !canManage || !hardUsd || !autoUsd || !budgetUsd ? "cursor-not-allowed opacity-40" : "hover:brightness-110 active:scale-95",
          )}
          style={{
            background: phase === "done" ? "var(--approved-bg)" : "rgba(110,144,178,0.10)",
            border: phase === "done" ? "1px solid rgba(77,145,112,0.25)" : "1px solid var(--steel-border)",
          }}
        >
          {phase === "encrypting" ? (
            <><span className="h-2 w-2 rounded-full bg-muted animate-pending" />Encrypting...</>
          ) : phase === "awaiting_wallet" ? (
            <><span className="h-2 w-2 rounded-full bg-muted animate-pending" />Wallet...</>
          ) : phase === "confirming" ? (
            <><span className="h-2 w-2 rounded-full bg-muted animate-pending" />Confirming...</>
          ) : phase === "done" ? (
            <><CheckCircle className="h-3 w-3" />Set</>
          ) : (
            <><Lock className="h-3 w-3" />Encrypt &amp; Set All</>
          )}
        </button>
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
    </div>
  );
}

export function PolicyPackManager({
  packs,
  onSetThresholds,
  onSetActive,
  onResetBudget,
  canManage,
  disabledReason,
}: PolicyPackManagerProps) {
  const [expanded, setExpanded] = useState(true);
  const packMap = new Map(packs.map((p) => [p.id, p]));

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
              style={{ background: "rgba(110,144,178,0.08)", border: "1px solid var(--steel-border)" }}>
              <Layers className="h-3.5 w-3.5 text-steel" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-text">Policy packs</p>
              <p className="text-[11px] text-subtle">Encrypted thresholds — hard limit, auto-approve, rolling budget</p>
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
            <div className="grid grid-cols-2 gap-5 p-5">
              {POLICY_PACKS.map((staticPack) => {
                const live = packMap.get(staticPack.id);
                const pack: PackRowData = live ?? {
                  id:         staticPack.id,
                  name:       staticPack.name,
                  active:     false,
                  limitsSet:  false,
                  total:      BigInt(0),
                  approved:   BigInt(0),
                  denied:     BigInt(0),
                  pending:    BigInt(0),
                  inReview:   BigInt(0),
                  epochStart: BigInt(0),
                };
                return (
                  <PackCard
                    key={staticPack.id}
                    pack={pack}
                    onSetThresholds={onSetThresholds}
                    onSetActive={onSetActive}
                    onResetBudget={onResetBudget}
                    canManage={canManage}
                    disabledReason={disabledReason}
                  />
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
