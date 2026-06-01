"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2, Search, Link2, ShieldCheck, Receipt } from "lucide-react";
import { createPublicClient, http, encodePacked, keccak256 } from "viem";
import { arbitrumSepolia } from "viem/chains";

import { AppHeader } from "@/components/shell/AppHeader";
import {
  shieldCardAddress,
  shieldCardAbi,
  settlementAddress,
  settlementAbi,
  SETTLEMENT_STATE,
  settlementStateLabel,
  PACK_NAME,
  statusLabel,
} from "@/lib/contracts";

const RPC = process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

type CoreReq = {
  employee:        `0x${string}`;
  packId:          number;
  deptId:          number;
  vendorId:        number;
  memo:            string;
  timestamp:       bigint;
  resultPublished: boolean;
  publicStatus:    number;
  receiptHash:     `0x${string}`;
  riskBitmap:      number;
};

type SettlementVerify = {
  state: number;
  recipient: `0x${string}`;
  amount: bigint;
  settlementHash: `0x${string}`;
  prevChainHead: `0x${string}`;
  coreReceiptHash: `0x${string}`;
  computedChain: `0x${string}`;
  chainMatch: boolean;
};

type VerifyResult =
  | { ok: false; reason: string }
  | {
      ok: true;
      req: CoreReq;
      computed: `0x${string}`;
      onChain: `0x${string}`;
      match: boolean;
      settlement?: SettlementVerify;
    };

export default function VerifyPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  // Pre-fill from URL param: /verify?id=0
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id !== null && /^\d+$/.test(id)) setInput(id);
  }, []);

  async function handleVerify() {
    if (!shieldCardAddress) {
      setResult({ ok: false, reason: "Contract address not configured." });
      return;
    }
    const id = Number(input.trim());
    if (!Number.isInteger(id) || id < 0) {
      setResult({ ok: false, reason: "Enter a non-negative integer request ID." });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const client = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
      const raw = await client.readContract({
        address: shieldCardAddress,
        abi: shieldCardAbi,
        functionName: "getRequest",
        args: [BigInt(id)],
      }) as readonly unknown[];

      const req: CoreReq = {
        employee:        raw[0]  as `0x${string}`,
        packId:          Number(raw[1]),
        deptId:          Number(raw[2]),
        vendorId:        Number(raw[3]),
        memo:            raw[6]  as string,
        timestamp:       raw[7]  as bigint,
        resultPublished: raw[8]  as boolean,
        publicStatus:    Number(raw[9]),
        receiptHash:     raw[11] as `0x${string}`,
        riskBitmap:      Number(raw[12]),
      };

      if (!req.resultPublished) {
        setResult({ ok: false, reason: `Request #${id} has not been published yet — receipt is not committed.` });
        return;
      }

      // Recompute receipt hash off-chain (mirrors _finaliseRequest in core)
      const computed = keccak256(
        encodePacked(
          ["uint256", "address", "uint8", "uint8", "uint256", "address", "uint256"],
          [
            BigInt(id),
            req.employee,
            req.packId,
            req.publicStatus,
            req.timestamp,
            shieldCardAddress,
            BigInt(arbitrumSepolia.id),
          ],
        ),
      );
      const match = computed.toLowerCase() === req.receiptHash.toLowerCase();

      let settlement: SettlementVerify | undefined = undefined;

      if (settlementAddress) {
        try {
          const exists = await client.readContract({
            address: settlementAddress,
            abi: settlementAbi,
            functionName: "settlementExists",
            args: [BigInt(id)],
          }) as boolean;

          if (exists) {
            const s = await client.readContract({
              address: settlementAddress,
              abi: settlementAbi,
              functionName: "getSettlement",
              args: [BigInt(id)],
            }) as {
              recipient:       `0x${string}`;
              amount:          bigint;
              state:           number;
              approvalsCount:  number;
              highRisk:        boolean;
              createdAt:       bigint;
              settledAt:       bigint;
              settlementHash:  `0x${string}`;
              prevChainHead:   `0x${string}`;
              coreReceiptHash: `0x${string}`;
              cancelReason:    string;
            };

            const computedChain = keccak256(
              encodePacked(
                ["bytes32", "uint256", "address", "uint256", "bytes32", "uint256"],
                [
                  s.prevChainHead,
                  BigInt(id),
                  s.recipient,
                  s.amount,
                  s.coreReceiptHash,
                  BigInt(arbitrumSepolia.id),
                ],
              ),
            );
            const chainMatch = computedChain.toLowerCase() === s.settlementHash.toLowerCase();

            settlement = {
              state:           Number(s.state),
              recipient:       s.recipient,
              amount:          s.amount,
              settlementHash:  s.settlementHash,
              prevChainHead:   s.prevChainHead,
              coreReceiptHash: s.coreReceiptHash,
              computedChain,
              chainMatch,
            };
          }
        } catch {
          /* settlement read optional — fall through */
        }
      }

      setResult({ ok: true, req, computed, onChain: req.receiptHash, match, settlement });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ ok: false, reason: `Request #${input} not found or RPC error: ${msg.slice(0, 140)}` });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-base">
      <AppHeader />
      <main className="mx-auto max-w-[920px] px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: "rgba(110,144,178,0.08)",
                border: "1px solid var(--steel-border)",
              }}
            >
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--color-steel)" }} />
            </div>
            <span
              className="text-[11px] font-medium uppercase tracking-[0.09em]"
              style={{ color: "var(--color-subtle)" }}
            >
              Public verifier · no wallet required
            </span>
          </div>
          <h1
            className="text-[30px] font-bold tracking-[-0.025em] leading-snug mb-2"
            style={{ color: "var(--color-text)" }}
          >
            Verify an audit packet
          </h1>
          <p
            className="text-[14px] leading-relaxed max-w-[640px]"
            style={{ color: "var(--color-muted)" }}
          >
            Enter a request ID. The page reads the request from Arbitrum Sepolia, recomputes the
            receipt hash from public fields, and compares it to the on-chain commitment. If a
            settlement exists, the hash-chained settlement link is also verified.
          </p>
        </motion.div>

        <div
          className="rounded-xl p-6 mb-6"
          style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}
        >
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Request ID (e.g. 0)"
              inputMode="numeric"
              className="flex-1 rounded-md px-3 py-2.5 text-[14px] font-mono outline-none focus:ring-2 focus:ring-copper/40"
              style={{
                background: "#09090B",
                border: "1px solid var(--border-mid)",
                color: "var(--color-text)",
              }}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
            <button
              onClick={handleVerify}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-md text-[13px] font-semibold transition-all duration-150 hover:brightness-110 active:scale-[0.97] disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #D09040 0%, #B86B2A 100%)",
                color: "var(--color-text)",
              }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Verify
            </button>
          </div>
          <p className="text-[11px] mt-3" style={{ color: "var(--color-subtle)" }}>
            Reads from <span className="font-mono">{shieldCardAddress?.slice(0, 12) ?? "—"}…</span> ·
            Network: Arbitrum Sepolia (chainId 421614) ·{" "}
            <button
              onClick={() => { setInput("9999"); setResult(null); }}
              className="underline underline-offset-2 hover:opacity-70 transition-opacity"
              style={{ color: "var(--color-denied)" }}>
              Demo: tamper (nonexistent ID)
            </button>
          </p>
        </div>

        {result && !result.ok && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl px-5 py-4"
            style={{
              background: "var(--denied-bg)",
              border: "1px solid rgba(147,68,68,0.30)",
              color: "var(--color-denied)",
            }}
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              <span className="text-[13px]">{result.reason}</span>
            </div>
          </motion.div>
        )}

        {result && result.ok && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-5"
          >
            {/* Verdict */}
            <div
              className="rounded-xl px-5 py-4 flex items-center gap-3"
              style={{
                background: result.match ? "var(--approved-bg)" : "var(--denied-bg)",
                border: result.match
                  ? "1px solid rgba(77,145,112,0.35)"
                  : "1px solid rgba(147,68,68,0.35)",
              }}
            >
              {result.match ? (
                <CheckCircle className="w-6 h-6" style={{ color: "var(--color-approved)" }} />
              ) : (
                <XCircle className="w-6 h-6" style={{ color: "var(--color-denied)" }} />
              )}
              <div>
                <p className="text-[15px] font-semibold" style={{ color: result.match ? "var(--color-approved)" : "var(--color-denied)" }}>
                  {result.match ? "Receipt verified" : "Receipt mismatch"}
                </p>
                <p className="text-[12px]" style={{ color: "var(--color-muted)" }}>
                  {result.match
                    ? "Off-chain recompute matches the on-chain commitment."
                    : "Off-chain recompute does NOT match the on-chain commitment — data has been tampered with."}
                </p>
              </div>
            </div>

            {/* Packet detail */}
            <div
              className="rounded-xl p-5"
              style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-4 h-4 text-copper opacity-80" />
                <h3 className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
                  Audit packet
                </h3>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[12px]">
                {[
                  ["Request ID", `#${input}`],
                  ["Employee", result.req.employee],
                  ["Pack", PACK_NAME[result.req.packId] ?? `Pack #${result.req.packId}`],
                  ["Department ID", result.req.deptId.toString()],
                  ["Vendor ID", result.req.vendorId.toString()],
                  ["Memo", result.req.memo],
                  ["Timestamp", new Date(Number(result.req.timestamp) * 1000).toISOString()],
                  ["Status", statusLabel(result.req.publicStatus, false)],
                  ["Risk bitmap", `0x${result.req.riskBitmap.toString(16).padStart(4, "0")}`],
                  ["On-chain receipt", result.onChain],
                  ["Recomputed receipt", result.computed],
                ].map(([k, v]) => (
                  <div key={k} className="flex flex-col gap-0.5 py-1.5" style={{ borderTop: "1px solid var(--border-dim)" }}>
                    <dt className="text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--color-subtle)" }}>{k}</dt>
                    <dd className="font-mono break-all" style={{ color: "var(--color-muted)" }}>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Settlement chain */}
            {result.settlement && (
              <div
                className="rounded-xl p-5"
                style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="w-4 h-4 text-steel opacity-80" />
                  <h3 className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>
                    Settlement chain link
                  </h3>
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded ml-2"
                    style={{
                      background: result.settlement.chainMatch ? "var(--approved-bg)" : "var(--denied-bg)",
                      color: result.settlement.chainMatch ? "var(--color-approved)" : "var(--color-denied)",
                      border: `1px solid ${result.settlement.chainMatch ? "rgba(77,145,112,0.3)" : "rgba(147,68,68,0.3)"}`,
                    }}
                  >
                    {result.settlement.chainMatch ? "chain verified" : "chain mismatch"}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-[12px]">
                  {[
                    ["State", settlementStateLabel(result.settlement.state)],
                    ["Recipient", result.settlement.recipient],
                    ["Amount (mUSDC)", (Number(result.settlement.amount) / 1e6).toString()],
                    ["Prev chain head", result.settlement.prevChainHead],
                    ["Core receipt referenced", result.settlement.coreReceiptHash],
                    ["On-chain chain link", result.settlement.settlementHash],
                    ["Recomputed chain link", result.settlement.computedChain],
                  ].map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5 py-1.5" style={{ borderTop: "1px solid var(--border-dim)" }}>
                      <dt className="text-[10px] uppercase tracking-[0.06em]" style={{ color: "var(--color-subtle)" }}>{k}</dt>
                      <dd className="font-mono break-all" style={{ color: "var(--color-muted)" }}>{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-[11px] mt-4" style={{ color: "var(--color-subtle)" }}>
                  Testnet settlement — MockUSDC. Not real money.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
