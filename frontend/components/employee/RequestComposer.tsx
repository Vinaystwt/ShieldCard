"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Lock, AlertCircle, CheckCircle } from "lucide-react";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/format";

interface RequestComposerProps {
  onSubmit: (input: { amount: number; category: number; memo: string }) => Promise<void>;
  isBusy: boolean;
  isEmployee: boolean;
}

type Phase = "idle" | "scrambling" | "submitting" | "done" | "error";

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
            char === "." || char === "" ? char
              : elapsed > 500 ? char
              : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
          )
          .join("")
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

export function RequestComposer({ onSubmit, isBusy, isEmployee }: RequestComposerProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<number>(1);
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
      setPhase("submitting");
      try {
        await onSubmit({ amount: parseFloat(amount), category, memo });
        setPhase("done");
        setAmount("");
        setMemo("");
        resetScramble();
        setTimeout(() => setPhase("idle"), 3000);
      } catch (err: unknown) {
        setPhase("error");
        setErrorMsg(err instanceof Error ? err.message : "Submission failed.");
        resetScramble();
      }
    });
  }

  const isScrambling = phase === "scrambling";
  const isSubmitting = phase === "submitting";
  const isDone = phase === "done";
  const isInProgress = isScrambling || isSubmitting;

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
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)" }}
        >
          <Send className="w-3.5 h-3.5 text-copper" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-text tracking-[-0.01em]">
            New encrypted request
          </h3>
          <p className="text-[11px] text-subtle">Encrypted locally before submission</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Amount */}
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-subtle mb-1.5">
            Amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle text-[14px]">$</span>
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
                isScrambling ? "text-copper tracking-wider" : "text-text"
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
                  <Lock className="w-3.5 h-3.5 text-copper opacity-70" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-subtle mb-1.5">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(parseInt(e.target.value))}
            disabled={isInProgress || isDone}
            className="w-full rounded-md px-3 py-2.5 text-[14px] text-text"
            style={{
              background: "var(--color-raised)",
              border: "1px solid var(--border-dim)",
              outline: "none",
              appearance: "none",
            }}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Memo */}
        <div>
          <label className="block text-[11px] font-medium uppercase tracking-[0.07em] text-subtle mb-1.5">
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

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={isBusy || isInProgress || isDone || !amount || !memo}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[13px] font-medium transition-all duration-200",
            isDone
              ? "text-approved"
              : isInProgress
              ? "text-muted"
              : isBusy || !amount || !memo
              ? "text-subtle opacity-50 cursor-not-allowed"
              : "text-text"
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
              <CheckCircle className="w-4 h-4" />
              Submitted successfully
            </>
          ) : isSubmitting ? (
            <>
              <span className="w-3 h-3 rounded-full bg-muted animate-pending shrink-0" />
              Submitting to Arbitrum Sepolia...
            </>
          ) : isScrambling ? (
            <>
              <Lock className="w-4 h-4" />
              Encrypting locally...
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Encrypt & Submit
            </>
          )}
        </motion.button>

        {/* Error state */}
        <AnimatePresence>
          {phase === "error" && errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2.5 rounded-md px-3.5 py-3 text-[12px] text-denied"
              style={{ background: "var(--denied-bg)", border: "1px solid rgba(147,68,68,0.20)" }}
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not registered state */}
        {!isEmployee && (
          <div
            className="rounded-md px-3.5 py-3 text-[12px] text-muted"
            style={{ background: "var(--border-dim)", border: "1px solid var(--border-dim)" }}
          >
            This wallet is not registered as an employee. Ask the admin to register your address.
          </div>
        )}
      </form>
    </motion.div>
  );
}
