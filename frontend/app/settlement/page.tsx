"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { Banknote, Link2, ExternalLink, CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";

import { AppHeader } from "@/components/shell/AppHeader";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useShieldCard } from "@/hooks/useShieldCard";
import {
  shieldCardAddress,
  settlementAddress,
  settlementAbi,
  shieldCardAbi,
  SETTLEMENT_STATE,
  settlementStateLabel,
  PACK_NAME,
  targetChain,
  getStandalonePublicClient,
} from "@/lib/contracts";
import { truncateAddress } from "@/lib/format";

const EXPLORER = "https://sepolia.arbiscan.io";

type SettlementSummary = {
  state: number;
  recipient: `0x${string}`;
  amount: bigint;
  settlementHash: `0x${string}`;
  prevChainHead: `0x${string}`;
  highRisk: boolean;
  approvalsCount: number;
};

export default function SettlementPage() {
  const { address } = useAccount();
  const wagmiPublicClient = usePublicClient({ chainId: targetChain.id });
  const publicClient = wagmiPublicClient ?? getStandalonePublicClient();
  const { data: walletClient } = useWalletClient({ chainId: targetChain.id });
  const { requestsQuery } = useShieldCard();

  const [chainHead, setChainHead] = useState<string | null>(null);
  const [byId, setById] = useState<Record<string, SettlementSummary>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApprover, setIsApprover] = useState(false);
  const [normalQuorum, setNormalQuorum] = useState(1);
  const [hasApprovedMap, setHasApprovedMap] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const loadSettlementData = useCallback(async () => {
    if (!publicClient || !settlementAddress || !requestsQuery.data) return;
    const sAddr = settlementAddress;
    const pc = publicClient;
    try {
      const head = await pc.readContract({ address: sAddr, abi: settlementAbi, functionName: "chainHead" }) as `0x${string}`;
      setChainHead(head);
      const nq = await pc.readContract({ address: sAddr, abi: settlementAbi, functionName: "normalQuorum" }) as number;
      setNormalQuorum(Number(nq));

      const result: Record<string, SettlementSummary> = {};
      const approvedState: Record<string, boolean> = {};
      await Promise.all(
        (requestsQuery.data ?? []).map(async (req) => {
          try {
            const exists = await pc.readContract({ address: sAddr, abi: settlementAbi, functionName: "settlementExists", args: [req.id] }) as boolean;
            if (!exists) return;
            const s = await pc.readContract({ address: sAddr, abi: settlementAbi, functionName: "getSettlement", args: [req.id] }) as any;
            result[req.id.toString()] = {
              state: Number(s.state),
              recipient: s.recipient,
              amount: s.amount,
              settlementHash: s.settlementHash,
              prevChainHead: s.prevChainHead,
              highRisk: s.highRisk,
              approvalsCount: Number(s.approvalsCount),
            };
            if (address && Number(s.state) === SETTLEMENT_STATE.PENDING) {
              const ha = await pc.readContract({ address: sAddr, abi: settlementAbi, functionName: "hasApproved", args: [req.id, address] }) as boolean;
              approvedState[req.id.toString()] = ha;
            }
          } catch { /* skip */ }
        }),
      );
      setById(result);
      setHasApprovedMap(approvedState);
    } catch { /* skip */ }
  }, [publicClient, requestsQuery.data, address]);

  // Load role checks
  useEffect(() => {
    if (!publicClient || !shieldCardAddress || !settlementAddress || !address) return;
    const sAddr = settlementAddress;
    const cAddr = shieldCardAddress;
    const pc = publicClient;
    (async () => {
      try {
        const adminAddr = await pc.readContract({ address: cAddr, abi: shieldCardAbi, functionName: "admin" }) as string;
        setIsAdmin((adminAddr?.toLowerCase() ?? "") === (address?.toLowerCase() ?? ""));
        const approver = await pc.readContract({ address: sAddr, abi: settlementAbi, functionName: "isApprover", args: [address] }) as boolean;
        setIsApprover(approver);
      } catch { /* skip */ }
    })();
  }, [publicClient, address]);

  useEffect(() => { loadSettlementData(); }, [loadSettlementData]);

  async function handleApprove(requestId: bigint) {
    if (!walletClient || !settlementAddress) return;
    const key = requestId.toString();
    setBusy(key + ":approve");
    setTxError(null);
    setTxSuccess(null);
    try {
      const hash = await (walletClient as any).writeContract({
        address: settlementAddress,
        abi: settlementAbi,
        functionName: "approve",
        args: [requestId],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setTxSuccess(`#${key} approved — tx ${hash.slice(0, 18)}…`);
      await loadSettlementData();
    } catch (e: any) {
      setTxError(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleSettle(requestId: bigint) {
    if (!walletClient || !settlementAddress) return;
    const key = requestId.toString();
    setBusy(key + ":settle");
    setTxError(null);
    setTxSuccess(null);
    try {
      const hash = await (walletClient as any).writeContract({
        address: settlementAddress,
        abi: settlementAbi,
        functionName: "settle",
        args: [requestId],
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setTxSuccess(`#${key} settled — tx ${hash.slice(0, 18)}… MockUSDC transferred.`);
      await loadSettlementData();
    } catch (e: any) {
      setTxError(e?.shortMessage ?? e?.message ?? "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  const totalSettled = Object.values(byId)
    .filter((s) => s.state === SETTLEMENT_STATE.SETTLED)
    .reduce((acc, s) => acc + Number(s.amount) / 1e6, 0);

  const grouped = {
    pending:  Object.entries(byId).filter(([, s]) => s.state === SETTLEMENT_STATE.PENDING),
    approved: Object.entries(byId).filter(([, s]) => s.state === SETTLEMENT_STATE.APPROVED),
    settled:  Object.entries(byId).filter(([, s]) => s.state === SETTLEMENT_STATE.SETTLED),
  };

  return (
    <ErrorBoundary name="Settlement">
    <div className="min-h-screen bg-base">
      <AppHeader />
      <main className="mx-auto max-w-[1280px] px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)" }}>
              <Banknote className="w-3.5 h-3.5" style={{ color: "var(--color-copper)" }} />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.09em]" style={{ color: "var(--color-subtle)" }}>
              Settlement · testnet MockUSDC · hash-chained
            </span>
          </div>
          <h1 className="text-[30px] font-bold tracking-[-0.025em] mb-2" style={{ color: "var(--color-text)" }}>
            Treasury settlement
          </h1>
          <p className="text-[14px] max-w-[640px]" style={{ color: "var(--color-muted)" }}>
            Approved requests open as Pending in the vault. Once n-of-m approvals are recorded, admin can settle()
            to transfer MockUSDC and append the next link in the tamper-evident chain.
          </p>
        </motion.div>

        {/* Role banner */}
        {address && (isAdmin || isApprover) && (
          <div className="rounded-md px-4 py-2.5 mb-4 flex items-center gap-2 text-[12px]"
            style={{ background: "rgba(200,131,63,0.06)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
            <ShieldRole />
            {isAdmin ? "Admin wallet connected — can approve and settle." : ""}
            {isApprover && !isAdmin ? "Approver wallet connected — can approve." : ""}
          </div>
        )}

        {txSuccess && (
          <div className="rounded-md px-4 py-2.5 mb-4 text-[12px]"
            style={{ background: "rgba(60,120,80,0.08)", border: "1px solid rgba(60,120,80,0.2)", color: "var(--color-approved)" }}>
            ✓ {txSuccess}
          </div>
        )}
        {txError && (
          <div className="rounded-md px-4 py-2.5 mb-4 flex items-start gap-2 text-[12px]"
            style={{ background: "var(--denied-bg)", border: "1px solid rgba(147,68,68,0.25)", color: "var(--color-denied)" }}>
            <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
            {txError}
          </div>
        )}

        {/* Top metrics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Settled (mUSDC)", value: totalSettled.toLocaleString(), accent: "approved" },
            { label: "Pending + Approved", value: (grouped.pending.length + grouped.approved.length).toString(), accent: "pending" },
            { label: "Chain head", value: chainHead ? `${chainHead.slice(0, 10)}…${chainHead.slice(-6)}` : "—", accent: "muted", mono: true },
          ].map((m) => (
            <div key={m.label} className="rounded-xl p-4"
              style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}>
              <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--color-subtle)" }}>{m.label}</p>
              <p className={`text-[22px] font-semibold mt-1 ${m.mono ? "font-mono text-[14px]" : ""}`}
                style={{ color: `var(--color-${m.accent})` }}>
                {m.value}
              </p>
            </div>
          ))}
        </div>

        {/* Columns */}
        <div className="grid grid-cols-3 gap-4">
          {(["pending", "approved", "settled"] as const).map((col) => {
            const items = grouped[col];
            const accent = col === "pending" ? "pending" : col === "approved" ? "copper" : "approved";
            return (
              <div key={col} className="rounded-xl p-4 min-h-[300px]"
                style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.07em]"
                    style={{ color: `var(--color-${accent})` }}>
                    {col} ({items.length})
                  </span>
                  {col === "settled"
                    ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--color-approved)" }} />
                    : <Clock className="w-3.5 h-3.5" style={{ color: `var(--color-${accent})` }} />}
                </div>
                <div className="space-y-3">
                  {items.length === 0 && (
                    <p className="text-[11px] py-6 text-center" style={{ color: "var(--color-subtle)" }}>—</p>
                  )}
                  {items.map(([id, s]) => {
                    const reqId = BigInt(id);
                    const isBusyApprove = busy === id + ":approve";
                    const isBusySettle = busy === id + ":settle";
                    const alreadyApproved = hasApprovedMap[id];
                    return (
                      <div key={id} className="rounded-md p-3 text-[12px]"
                        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-dim)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono" style={{ color: "var(--color-text)" }}>#{id}</span>
                          <span className="text-[11px]" style={{ color: "var(--color-copper)" }}>
                            {(Number(s.amount) / 1e6).toLocaleString()} mUSDC
                          </span>
                        </div>
                        <p className="font-mono text-[10px] mb-1" style={{ color: "var(--color-subtle)" }}>
                          → {truncateAddress(s.recipient)}
                        </p>
                        {s.highRisk && (
                          <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--color-denied)" }}>high-risk</p>
                        )}
                        {col === "settled" && (
                          <div className="flex items-center gap-1 text-[10px] font-mono mt-2 pt-2"
                            style={{ borderTop: "1px solid var(--border-dim)", color: "var(--color-subtle)" }}>
                            <Link2 className="w-2.5 h-2.5" />
                            link: {s.settlementHash.slice(0, 12)}…
                          </div>
                        )}
                        {/* Write actions */}
                        {col === "pending" && isApprover && (
                          <button
                            onClick={() => handleApprove(reqId)}
                            disabled={!!busy || alreadyApproved}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium transition-all disabled:opacity-40"
                            style={{ background: "rgba(110,144,178,0.08)", border: "1px solid var(--steel-border)", color: "var(--color-steel)" }}>
                            {isBusyApprove ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            {alreadyApproved ? `✓ Approved (${s.approvalsCount}/${normalQuorum})` : "Approve"}
                          </button>
                        )}
                        {col === "approved" && isAdmin && (
                          <button
                            onClick={() => handleSettle(reqId)}
                            disabled={!!busy}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium transition-all disabled:opacity-40"
                            style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
                            {isBusySettle ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            Settle → transfer mUSDC
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-3">
          {settlementAddress && (
            <a href={`${EXPLORER}/address/${settlementAddress}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: "var(--color-muted)" }}>
              <ExternalLink className="w-3 h-3" />
              Settlement contract on Arbiscan
            </a>
          )}
          <span className="text-[11px]" style={{ color: "var(--color-subtle)" }}>
            Testnet MockUSDC. Not real money.
          </span>
        </div>
      </main>
    </div>
    </ErrorBoundary>
  );
}

function ShieldRole() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L2 3v4c0 2.76 2.24 5 5 5s5-2.24 5-5V3L7 1z" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
