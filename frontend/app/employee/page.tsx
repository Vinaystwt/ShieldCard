"use client";

export const dynamic = "force-dynamic";

import { motion } from "framer-motion";
import { Lock, RefreshCw, Snowflake, PauseCircle } from "lucide-react";
import { useChainId } from "wagmi";
import { TopBar } from "@/components/shell/TopBar";
import { RequestComposer } from "@/components/employee/RequestComposer";
import { RequestHistory } from "@/components/employee/RequestHistory";
import { SwitchNetworkButton } from "@/components/ui/SwitchNetworkButton";
import { useCofhe } from "@/hooks/useCofhe";
import { useRoleRouting } from "@/hooks/useRoleRouting";
import { useShieldCard } from "@/hooks/useShieldCard";
import { targetChain } from "@/lib/contracts";
import { getErrorMessage } from "@/lib/format";

export default function EmployeePage() {
  const { isConfigured, employeeRequestsQuery, submitRequest, roleQuery } = useShieldCard();
  const { isEmployee } = useRoleRouting();
  const { decryptStatus, encryptAmount, error, isReady } = useCofhe();
  const chainId = useChainId();
  const requests = employeeRequestsQuery.data ?? [];
  const isWrongNetwork = chainId !== targetChain.id;
  const isFrozen = roleQuery.data?.isFrozen ?? false;
  const isPaused = roleQuery.data?.isPaused ?? false;
  const canSubmit = isConfigured && isEmployee && isReady && !isWrongNetwork && !isFrozen && !isPaused;

  const submitDisabledReason = !isConfigured
    ? "Configure NEXT_PUBLIC_SHIELDCARD_ADDRESS to enable live submissions."
    : !isEmployee
      ? "This wallet must be registered as an employee before it can submit requests."
      : isWrongNetwork
        ? "Switch your wallet to Arbitrum Sepolia before submitting."
        : isFrozen
          ? "Your account is frozen. Contact your admin."
          : isPaused
            ? "Submissions are paused by admin."
            : !isReady
              ? error
                ? getErrorMessage(error)
                : "CoFHE encryption is still initializing."
              : undefined;

  async function handleSubmit(
    input: { amount: number; packId: number; memo: string },
    onStatusChange: Parameters<typeof submitRequest>[3],
  ) {
    const cents = Math.round(input.amount * 100);
    const encAmount = await encryptAmount(cents);
    await submitRequest(input.packId, encAmount, input.memo, onStatusChange);
  }

  async function handleDecrypt(requestId: bigint, encStatus: string): Promise<number> {
    const result = await decryptStatus(encStatus);
    return Number(result);
  }

  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="mx-auto max-w-[1280px] px-6 py-10">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{
                    background: "rgba(110,144,178,0.10)",
                    border: "1px solid var(--steel-border)",
                  }}
                >
                  <Lock className="w-3.5 h-3.5" style={{ color: "var(--color-steel)" }} />
                </div>
                <span
                  className="text-[11px] font-medium uppercase tracking-[0.09em]"
                  style={{ color: "var(--color-subtle)" }}
                >
                  Employee workspace
                </span>
              </div>
              <h1
                className="text-[30px] font-bold tracking-[-0.025em] leading-snug mb-2"
                style={{ color: "var(--color-text)" }}
              >
                Submit privately.<br />Reveal only to yourself.
              </h1>
              <p
                className="text-[14px] leading-relaxed max-w-[480px]"
                style={{ color: "var(--color-muted)" }}
              >
                Your amount is encrypted before it leaves this browser. Select your policy pack,
                enter the amount, and submit — the decision stays sealed until your wallet opens
                it with a permit.
              </p>
            </div>
            <button
              onClick={() => employeeRequestsQuery.refetch()}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] transition-colors"
              style={{
                border: "1px solid var(--border-dim)",
                background: "#0E0E11",
                color: "var(--color-muted)",
              }}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${employeeRequestsQuery.isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Status banners */}
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "var(--pending-bg)",
              border: "1px solid rgba(196,148,60,0.20)",
              color: "var(--color-pending)",
            }}
          >
            Contract not configured. Set{" "}
            <code className="font-mono text-[12px]">NEXT_PUBLIC_SHIELDCARD_ADDRESS</code> to
            enable live flows.
          </motion.div>
        )}

        {isConfigured && isEmployee && isFrozen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px] flex items-center gap-2.5"
            style={{
              background: "rgba(110,144,178,0.06)",
              border: "1px solid var(--steel-border)",
              color: "var(--color-steel)",
            }}
          >
            <Snowflake className="w-4 h-4 shrink-0" />
            Your account is frozen. You cannot submit new requests until your admin unfreezes you.
          </motion.div>
        )}

        {isConfigured && isPaused && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px] flex items-center gap-2.5"
            style={{
              background: "var(--pending-bg)",
              border: "1px solid rgba(196,148,60,0.20)",
              color: "var(--color-pending)",
            }}
          >
            <PauseCircle className="w-4 h-4 shrink-0" />
            Submissions are paused by your admin. Existing requests are not affected.
          </motion.div>
        )}

        {isConfigured && !isEmployee && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-mid)",
              color: "var(--color-muted)",
            }}
          >
            This wallet is not registered as an employee on this contract. Ask the admin to
            register your address.
          </motion.div>
        )}

        {isConfigured && isEmployee && isWrongNetwork && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "var(--pending-bg)",
              border: "1px solid rgba(196,148,60,0.20)",
              color: "var(--color-pending)",
            }}
          >
            Wrong network. Switch your wallet to Arbitrum Sepolia before submitting.
            <div className="mt-3">
              <SwitchNetworkButton compact />
            </div>
          </motion.div>
        )}

        {isConfigured && isEmployee && !isWrongNetwork && !isReady && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-lg px-4 py-3 text-[13px]"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--border-dim)",
              color: "var(--color-muted)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-pending animate-pending" />
              {error ? getErrorMessage(error) : "Initializing CoFHE encryption client..."}
            </span>
          </motion.div>
        )}

        {/* Main layout */}
        <div className="grid grid-cols-[2fr_3fr] gap-6 items-start">
          {/* Left: composer */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="sticky top-20 space-y-4"
          >
            <RequestComposer
              onSubmit={handleSubmit}
              isBusy={!canSubmit}
              isEmployee={isEmployee}
              disabledReason={submitDisabledReason}
            />

            {/* Encryption explainer */}
            <div
              className="rounded-xl p-5 relative overflow-hidden"
              style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}
            >
              <div
                className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(110,144,178,0.05) 0%, transparent 70%)",
                  transform: "translate(20%, -20%)",
                }}
              />
              <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--color-muted)" }}>
                How encryption works here
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-subtle)" }}>
                Amount is encrypted via Fhenix CoFHE in your browser. Only the ciphertext handle
                is submitted on-chain. The FHE contract evaluates your request against the
                encrypted pack limit — no plaintext ever appears.
              </p>
            </div>
          </motion.div>

          {/* Right: request history */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.16 }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="text-[15px] font-semibold tracking-[-0.01em]"
                style={{ color: "var(--color-text)" }}
              >
                Your requests
              </h2>
              {requests.length > 0 && (
                <span className="text-[12px]" style={{ color: "var(--color-subtle)" }}>
                  {requests.length} request{requests.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {employeeRequestsQuery.isLoading ? (
              <div className="flex items-center gap-2.5 py-10">
                <span className="w-2 h-2 rounded-full bg-steel animate-pending" />
                <span className="text-[13px]" style={{ color: "var(--color-muted)" }}>
                  Loading your requests...
                </span>
              </div>
            ) : employeeRequestsQuery.isError ? (
              <div
                className="rounded-lg px-4 py-3 text-[13px] flex items-start gap-2"
                style={{
                  background: "var(--denied-bg)",
                  border: "1px solid rgba(147,68,68,0.20)",
                  color: "var(--color-denied)",
                }}
              >
                <span>Failed to load requests. Check your RPC connection and refresh.</span>
                <button
                  onClick={() => employeeRequestsQuery.refetch()}
                  className="shrink-0 underline opacity-70 hover:opacity-100"
                >
                  Retry
                </button>
              </div>
            ) : (
              <RequestHistory
                requests={requests}
                onDecrypt={handleDecrypt}
                canReveal={isEmployee && isReady && !isWrongNetwork}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
