"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lock, AlertCircle, CheckCircle } from "lucide-react";

import { TransactionStatus } from "@/hooks/useShieldCard";
import { POLICY_PACKS } from "@/lib/contracts";
import { cn, getErrorMessage } from "@/lib/format";

interface RequestComposerProps {
  onSubmit: (
    input: { amount: number; packId: number; memo: string },
    onStatusChange: (status: TransactionStatus) => void,
  ) => Promise<void>;
  isBusy: boolean;
  isEmployee: boolean;
  disabledReason?: string;
}

type Phase =
  | "idle"
  | "scrambling"
  | "preparing"
  | "awaiting_wallet"
  | "submitted"
  | "confirming"
  | "done"
  | "error";

const SCRAMBLE_CHARS = "0123456789ABCDEFabcdef";

function useScramble(value: string) {
  const [scrambled, setScrambled] = useState(value);
  const frameRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function start(onDone: () => void) {
    let elapsed = 0;
    frameRef.current = setInterval(() => {
      elapsed += 60;
      setScrambled(
        value
          .split("")
          .map((char) =>
            char === "." || char === ""
              ? char
              : elapsed > 500
                ? char
                : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)],
          )
          .join(""),
      );
      if (elapsed >= 600) {
        clearInterval(frameRef.current!);
        onDone();
      }
    }, 60);
  }

  function reset() {
    setScrambled(value);
    if (frameRef.current) clearInterval(frameRef.current);
  }

  return { scrambled, start, reset };
}

export function RequestComposer({
  onSubmit,
  isBusy,
  isEmployee,
  disabledReason,
}: RequestComposerProps) {
  const [amount, setAmount] = useState("");
  const [packId, setPackId] = useState<number>(POLICY_PACKS[0].id);
  const [memo, setMemo] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { scrambled, start: startScramble, reset: resetScramble } = useScramble(amount);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || !memo || isBusy) return;

    setPhase("scrambling");
    setErrorMsg("");

    startScramble(async () => {
      try {
        setPhase("preparing");
        await onSubmit(
          { amount: parseFloat(amount), packId, memo },
          (status) => {
            if (status.phase === "preparing") setPhase("preparing");
            if (status.phase === "awaiting_wallet") setPhase("awaiting_wallet");
            if (status.phase === "submitted") setPhase("submitted");
            if (status.phase === "confirming") setPhase("confirming");
          },
        );
        setPhase("done");
        setAmount("");
        setMemo("");
        resetScramble();
        setTimeout(() => setPhase("idle"), 3000);
      } catch (err: unknown) {
        setPhase("error");
        setErrorMsg(getErrorMessage(err));
        resetScramble();
      }
    });
  }

  const isScrambling = phase === "scrambling";
  const isPreparing = phase === "preparing";
  const isAwaitingWallet = phase === "awaiting_wallet";
  const isSubmitted = phase === "submitted";
  const isConfirming = phase === "confirming";
  const isDone = phase === "done";
  const isInProgress =
    isScrambling || isPreparing || isAwaitingWallet || isSubmitted || isConfirming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-xl p-6"
      style={{
        background: "#0E0E11",
        border: "1px solid var(--border-mid)",
      }}
    >
      <div className="mb-5 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-md"
          style={{
            background: "rgba(200,131,63,0.08)",
            border: "1px solid var(--copper-border-dim)",
          }}
        >
          <Send className="h-3.5 w-3.5 text-copper" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-text">
            New encrypted request
          </h3>
          <p className="text-[11px] text-subtle">Encrypted locally before submission</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Amount */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-subtle">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-subtle">
              $
            </span>
            <motion.input
              type={isScrambling ? "text" : "number"}
              value={isScrambling ? scrambled : amount}
              onChange={(e) => !isInProgress && setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
              readOnly={isInProgress || isDone}
              className={cn(
                "w-full rounded-md px-3 py-2.5 pl-7 text-[14px] font-mono transition-all duration-200",
                isScrambling ? "tracking-wider text-copper" : "text-text",
              )}
              style={{
                background: "var(--color-raised)",
                border: isScrambling
                  ? "1px solid var(--copper-border)"
                  : "1px solid var(--border-dim)",
                outline: "none",
              }}
            />
            <AnimatePresence>
              {isScrambling && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Lock className="h-3.5 w-3.5 text-copper opacity-70" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Policy pack */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-subtle">
            Policy pack
          </label>
          <select
            value={packId}
            onChange={(e) => setPackId(parseInt(e.target.value, 10))}
            disabled={isInProgress || isDone}
            className="w-full rounded-md px-3 py-2.5 text-[14px] text-text"
            style={{
              background: "var(--color-raised)",
              border: "1px solid var(--border-dim)",
              outline: "none",
              appearance: "none",
            }}
          >
            {POLICY_PACKS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (limit ${(p.limitCents / 100).toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        {/* Memo */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.07em] text-subtle">
            Memo
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="e.g. Figma subscription renewal"
            maxLength={120}
            required
            disabled={isInProgress || isDone}
            className="w-full rounded-md px-3 py-2.5 text-[14px] text-text placeholder:text-subtle"
            style={{
              background: "var(--color-raised)",
              border: "1px solid var(--border-dim)",
              outline: "none",
            }}
          />
        </div>

        <motion.button
          type="submit"
          disabled={isBusy || isInProgress || isDone || !amount || !memo}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-[13px] font-medium transition-all duration-200",
            isDone
              ? "text-approved"
              : isInProgress
                ? "text-muted"
                : isBusy || !amount || !memo
                  ? "cursor-not-allowed text-subtle opacity-50"
                  : "text-text",
          )}
          style={{
            background: isDone
              ? "var(--approved-bg)"
              : isInProgress
                ? "rgba(255,255,255,0.04)"
                : isBusy
                  ? "rgba(255,255,255,0.03)"
                  : "linear-gradient(135deg, #C8833F 0%, #B06B30 100%)",
            border: isDone
              ? "1px solid rgba(77,145,112,0.25)"
              : "1px solid transparent",
            boxShadow:
              !isBusy && !isInProgress && !isDone && amount && memo
                ? "0 0 20px rgba(200,131,63,0.15)"
                : "none",
          }}
        >
          {isDone ? (
            <>
              <CheckCircle className="h-4 w-4" />
              Submitted successfully
            </>
          ) : isAwaitingWallet ? (
            <>
              <span className="h-3 w-3 shrink-0 rounded-full bg-muted animate-pending" />
              Open MetaMask to continue...
            </>
          ) : isSubmitted ? (
            <>
              <span className="h-3 w-3 shrink-0 rounded-full bg-muted animate-pending" />
              Transaction submitted. Waiting for confirmation...
            </>
          ) : isConfirming ? (
            <>
              <span className="h-3 w-3 shrink-0 rounded-full bg-muted animate-pending" />
              Confirming on Arbitrum Sepolia...
            </>
          ) : isPreparing ? (
            <>
              <span className="h-3 w-3 shrink-0 rounded-full bg-muted animate-pending" />
              Preparing transaction...
            </>
          ) : isScrambling ? (
            <>
              <Lock className="h-4 w-4" />
              Encrypting locally...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Encrypt &amp; Submit
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {phase === "error" && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 rounded-md px-3.5 py-3 text-[12px] text-denied"
              style={{
                background: "var(--denied-bg)",
                border: "1px solid rgba(147,68,68,0.20)",
              }}
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {!isEmployee && (
          <div
            className="rounded-md px-3.5 py-3 text-[12px] text-muted"
            style={{
              background: "var(--border-dim)",
              border: "1px solid var(--border-dim)",
            }}
          >
            This wallet is not registered as an employee. Ask the admin to register your address.
          </div>
        )}
        {isEmployee && disabledReason && !isInProgress && !isDone && (
          <div
            className="rounded-md px-3.5 py-3 text-[12px]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-dim)",
              color: "var(--color-muted)",
            }}
          >
            {disabledReason}
          </div>
        )}
      </form>
    </motion.div>
  );
}
