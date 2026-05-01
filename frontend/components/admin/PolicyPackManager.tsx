"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Lock, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

import { TransactionStatus } from "@/hooks/useShieldCard";
import { POLICY_PACKS } from "@/lib/contracts";
import { cn, getErrorMessage } from "@/lib/format";

interface PackRowData {
  id: number;
  name: string;
  active: boolean;
  limitSet: boolean;
  total: bigint;
  approved: bigint;
  denied: bigint;
  pending: bigint;
}

interface PolicyPackManagerProps {
  packs: PackRowData[];
  onSetLimit: (
    packId: number,
    amountUsd: number,
    onStatusChange: (status: TransactionStatus) => void,
  ) => Promise<void>;
  canManage: boolean;
  disabledReason?: string;
}

type LimitPhase = "idle" | "encrypting" | "awaiting_wallet" | "confirming" | "done" | "error";

function PackLimitForm({
  pack,
  onSetLimit,
  canManage,
  disabledReason,
}: {
  pack: PackRowData;
  onSetLimit: PolicyPackManagerProps["onSetLimit"];
  canManage: boolean;
  disabledReason?: string;
}) {
  const [amount, setAmount] = useState("");
  const [phase, setPhase] = useState<LimitPhase>("idle");
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || phase === "encrypting" || phase === "awaiting_wallet" || phase === "confirming")
      return;

    setPhase("encrypting");
    setMsg("Encrypting limit locally...");

    try {
      await onSetLimit(pack.id, parseFloat(amount), (status) => {
        if (status.phase === "awaiting_wallet") {
          setPhase("awaiting_wallet");
          setMsg("Confirm the encrypted limit tx in MetaMask.");
        }
        if (status.phase === "submitted" || status.phase === "confirming") {
          setPhase("confirming");
          setMsg("Submitted. Waiting for confirmation.");
        }
      });

      setPhase("done");
      setMsg("Limit stored encrypted — value hidden on-chain");
      setAmount("");
      setTimeout(() => setPhase("idle"), 3000);
    } catch (err: unknown) {
      setPhase("error");
      setMsg(getErrorMessage(err));
    }
  }

  const busy = phase === "encrypting" || phase === "awaiting_wallet" || phase === "confirming";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-subtle">
            $
          </span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={pack.limitSet ? "Override limit" : "Set limit"}
            min="0"
            step="0.01"
            required
            disabled={!canManage || busy || phase === "done"}
            className="w-full rounded-md px-3 py-1.5 pl-6 text-[12px] font-mono text-text placeholder:text-subtle"
            style={{
              background: "var(--color-raised)",
              border: "1px solid var(--border-dim)",
              outline: "none",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={!canManage || !amount || busy || phase === "done"}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-medium transition-all duration-150",
            phase === "done" ? "text-approved" : "text-text",
            !canManage || !amount ? "cursor-not-allowed opacity-40" : "hover:brightness-110 active:scale-95",
          )}
          style={{
            background: phase === "done" ? "var(--approved-bg)" : "rgba(110,144,178,0.10)",
            border:
              phase === "done"
                ? "1px solid rgba(77,145,112,0.25)"
                : "1px solid var(--steel-border)",
          }}
        >
          {phase === "encrypting" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-muted animate-pending" />
              Encrypting...
            </>
          ) : phase === "awaiting_wallet" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-muted animate-pending" />
              MetaMask...
            </>
          ) : phase === "confirming" ? (
            <>
              <span className="h-2 w-2 rounded-full bg-muted animate-pending" />
              Confirming...
            </>
          ) : phase === "done" ? (
            <>
              <CheckCircle className="h-3 w-3" />
              Set
            </>
          ) : (
            <>
              <Lock className="h-3 w-3" />
              Encrypt &amp; Set
            </>
          )}
        </button>
      </div>
      {msg && (
        <p
          className={cn(
            "text-[10px]",
            phase === "done"
              ? "text-approved"
              : phase === "error"
                ? "text-denied"
                : "text-muted",
          )}
        >
          {phase === "error" && <AlertCircle className="mr-1 inline h-3 w-3" />}
          {msg}
        </p>
      )}
      {!canManage && disabledReason && (
        <p className="text-[10px] text-subtle">{disabledReason}</p>
      )}
    </form>
  );
}

export function PolicyPackManager({
  packs,
  onSetLimit,
  canManage,
  disabledReason,
}: PolicyPackManagerProps) {
  const [expanded, setExpanded] = useState(true);

  // Build a lookup from on-chain data; fall back to static POLICY_PACKS metadata
  const packMap = new Map(packs.map((p) => [p.id, p]));

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
                background: "rgba(110,144,178,0.08)",
                border: "1px solid var(--steel-border)",
              }}
            >
              <Layers className="h-3.5 w-3.5 text-steel" />
            </div>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-text">
                Policy packs
              </p>
              <p className="text-[11px] text-subtle">
                Set encrypted spend limits per policy pack
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
              {POLICY_PACKS.map((staticPack) => {
                const live = packMap.get(staticPack.id);
                const limitSet = live?.limitSet ?? false;
                const active = live?.active ?? false;

                return (
                  <div
                    key={staticPack.id}
                    className="flex flex-col gap-3 rounded-lg p-4"
                    style={{
                      background: "var(--color-raised)",
                      border: "1px solid var(--border-dim)",
                    }}
                  >
                    {/* Pack header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-text">
                          {staticPack.name}
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{
                            background: active
                              ? "rgba(77,145,112,0.10)"
                              : "rgba(255,255,255,0.05)",
                            color: active ? "var(--color-approved)" : "var(--color-subtle)",
                            border: active
                              ? "1px solid rgba(77,145,112,0.20)"
                              : "1px solid var(--border-dim)",
                          }}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <span className="text-[10px] text-subtle">
                        Max ${(staticPack.limitCents / 100).toLocaleString()}
                      </span>
                    </div>

                    {/* Limit status */}
                    <div className="flex items-center gap-1.5">
                      {limitSet ? (
                        <>
                          <Lock className="h-3 w-3 text-approved opacity-70" />
                          <span className="text-[11px] text-approved opacity-80">
                            Encrypted limit set
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="h-2 w-2 rounded-full bg-pending animate-pending" />
                          <span className="text-[11px] text-pending">No limit set yet</span>
                        </>
                      )}
                    </div>

                    {/* Set limit form */}
                    <PackLimitForm
                      pack={
                        live ?? {
                          id: staticPack.id,
                          name: staticPack.name,
                          active: false,
                          limitSet: false,
                          total: BigInt(0),
                          approved: BigInt(0),
                          denied: BigInt(0),
                          pending: BigInt(0),
                        }
                      }
                      onSetLimit={onSetLimit}
                      canManage={canManage}
                      disabledReason={disabledReason}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
