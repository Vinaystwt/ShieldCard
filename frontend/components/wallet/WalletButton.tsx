"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

import { cn, getErrorMessage } from "@/lib/format";

type WalletButtonProps = {
  label?: string;
  className?: string;
};

export function WalletButton({
  label = "Connect Wallet",
  className,
}: WalletButtonProps) {
  const [error, setError] = useState("");
  const { isConnected } = useAccount();
  const { connectAsync, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const injectedConnector = connectors.find((connector) => connector.id === "injected");

  async function handleClick() {
    setError("");

    if (isConnected) {
      disconnect();
      return;
    }

    if (!injectedConnector) {
      setError("No injected wallet was detected in this browser.");
      return;
    }

    try {
      await connectAsync({ connector: injectedConnector });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }

  return (
    <div className={cn("flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-[13px] font-medium transition-all duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          background: isConnected ? "rgba(255,255,255,0.05)" : "rgba(200,131,63,0.12)",
          border: isConnected
            ? "1px solid var(--border-dim)"
            : "1px solid var(--copper-border-dim)",
          color: isConnected ? "var(--color-text)" : "var(--color-copper)",
        }}
      >
        <Wallet className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
        {isConnected ? "Disconnect" : isPending ? "Open MetaMask..." : label}
      </button>
      {error && (
        <span className="max-w-[220px] text-right text-[11px]" style={{ color: "var(--color-denied)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
