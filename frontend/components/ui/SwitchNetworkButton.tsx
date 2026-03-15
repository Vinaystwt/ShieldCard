"use client";

import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { useSwitchChain } from "wagmi";

import { targetChain } from "@/lib/contracts";
import { cn, getErrorMessage } from "@/lib/format";

type SwitchNetworkButtonProps = {
  className?: string;
  compact?: boolean;
};

export function SwitchNetworkButton({
  className,
  compact = false,
}: SwitchNetworkButtonProps) {
  const [error, setError] = useState("");
  const { switchChainAsync, isPending } = useSwitchChain();

  async function handleSwitch() {
    setError("");
    try {
      await switchChainAsync({ chainId: targetChain.id });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  return (
    <div className={cn("flex flex-col items-start gap-2", className)}>
      <button
        type="button"
        onClick={handleSwitch}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: "rgba(200,131,63,0.08)",
          border: "1px solid var(--copper-border-dim)",
          color: "var(--color-copper)",
        }}
      >
        <ArrowRightLeft className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Switching..." : `Switch to ${compact ? "Arbitrum Sepolia" : targetChain.name}`}
      </button>
      {error && (
        <p className="text-[11px]" style={{ color: "var(--color-denied)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
