"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAccount, usePublicClient } from "wagmi";
import { Eye, EyeOff, Lock, ShieldCheck, Download, Loader2, SplitSquareHorizontal } from "lucide-react";

import { TopBar } from "@/components/shell/TopBar";
import { useShieldCard } from "@/hooks/useShieldCard";
import { useCofhe } from "@/hooks/useCofhe";
import {
  shieldCardAddress,
  shieldCardAbi,
  auditorAbi,
  PACK_NAME,
  statusLabel,
  targetChain,
} from "@/lib/contracts";
import { truncateAddress, truncateHandle } from "@/lib/format";

export default function AuditorPage() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { requestsQuery } = useShieldCard();
  const { decryptStatus } = useCofhe();

  const [onChainAuditor, setOnChainAuditor] = useState<string | null>(null);
  const [grantedIds, setGrantedIds] = useState<Set<string> | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proofFocusId, setProofFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (!shieldCardAddress || !publicClient) return;
    (async () => {
      try {
        const addr = await publicClient.readContract({
          address: shieldCardAddress,
          abi: [...shieldCardAbi, ...auditorAbi] as any,
          functionName: "auditor",
        }) as string;
        setOnChainAuditor(addr);
      } catch {
        setOnChainAuditor(null);
      }
    })();
  }, [publicClient]);

  useEffect(() => {
    if (!shieldCardAddress || !publicClient || !address) return;
    (async () => {
      try {
        const logs = await publicClient.getLogs({
          address: shieldCardAddress,
          event: { type: "event", name: "DisclosureGranted", inputs: [{ name: "requestId", type: "uint256", indexed: true }, { name: "auditor", type: "address", indexed: true }] },
          args: { auditor: address },
          fromBlock: BigInt(0),
          toBlock: "latest",
        });
        const ids = new Set(logs.map((l: any) => l.args.requestId?.toString() ?? ""));
        setGrantedIds(ids);
      } catch {
        setGrantedIds(null);
      }
    })();
  }, [publicClient, address]);

  const isAuditor = Boolean(
    address && onChainAuditor && address.toLowerCase() === onChainAuditor.toLowerCase(),
  );

  async function handleReveal(reqId: bigint, encStatus: string) {
    if (busy) return;
    setError(null);
    setBusy(reqId.toString());
    try {
      const value = await decryptStatus(encStatus);
      setDecrypted((p) => ({ ...p, [reqId.toString()]: Number(value) }));
    } catch (e: any) {
      setError(e?.message ?? "Decrypt failed — likely no scoped grant for this request.");
    } finally {
      setBusy(null);
    }
  }

  function downloadPacket(req: any) {
    const packet = {
      requestId:         req.id.toString(),
      contractAddress:   shieldCardAddress,
      network:           "Arbitrum Sepolia",
      chainId:           targetChain.id,
      employee:          req.employee,
      packId:            req.packId,
      packName:          PACK_NAME[req.packId],
      deptId:            req.deptId,
      vendorId:          req.vendorId,
      memo:              req.memo,
      timestamp:         req.timestamp.toString(),
      timestampISO:      new Date(Number(req.timestamp) * 1000).toISOString(),
      publicStatus:      req.publicStatus,
      statusLabel:       statusLabel(req.publicStatus, req.inReview),
      riskBitmap:        `0x${req.riskBitmap.toString(16).padStart(4, "0")}`,
      receiptHash:       req.receiptHash,
      evidenceHash:      req.evidenceHash,
      evidenceSubmitted: req.evidenceSubmitted,
      revealedStatus:    decrypted[req.id.toString()] ?? null,
      verificationNote:  "Recompute keccak256(abi.encodePacked(requestId, employee, packId, publicStatus, timestamp, contractAddress, chainId)) to verify receiptHash.",
    };
    const blob = new Blob([JSON.stringify(packet, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-packet-${req.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const allRequests = requestsQuery.data ?? [];
  const requests = grantedIds !== null
    ? allRequests.filter((r) => grantedIds.has(r.id.toString()))
    : allRequests;
  const proofReq = proofFocusId ? requests.find((r) => r.id.toString() === proofFocusId) : null;
  const proofDecrypted = proofFocusId ? decrypted[proofFocusId] : undefined;

  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="mx-auto max-w-[1280px] px-6 py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: "rgba(110,144,178,0.08)", border: "1px solid var(--steel-border)" }}>
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--color-steel)" }} />
            </div>
            <span className="text-[11px] font-medium uppercase tracking-[0.09em]" style={{ color: "var(--color-subtle)" }}>
              Auditor workspace · scoped disclosure
            </span>
          </div>
          <h1 className="text-[30px] font-bold tracking-[-0.025em] mb-2" style={{ color: "var(--color-text)" }}>
            Selective decryption proof
          </h1>
          <p className="text-[14px] max-w-[640px]" style={{ color: "var(--color-muted)" }}>
            The admin grants per-request decryption via FHE.allow. The auditor address can then reveal
            only those specific request handles — every other request stays sealed even to the auditor.
          </p>
        </motion.div>

        {/* Auditor identity banner */}
        <div className="rounded-xl p-4 mb-6 flex items-center justify-between"
          style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}>
          <div>
            <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--color-subtle)" }}>On-chain auditor</p>
            <p className="text-[13px] font-mono mt-1" style={{ color: "var(--color-muted)" }}>{onChainAuditor ?? "—"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--color-subtle)" }}>Connected wallet</p>
            <p className="text-[13px] font-mono mt-1"
              style={{ color: isAuditor ? "var(--color-approved)" : "var(--color-muted)" }}>
              {address ? truncateAddress(address) : "Not connected"}
              {address && (isAuditor ? "  ✓ AUDITOR" : "  · not the auditor")}
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md px-4 py-2.5 mb-4 text-[12px]"
            style={{ background: "var(--denied-bg)", border: "1px solid rgba(147,68,68,0.25)", color: "var(--color-denied)" }}>
            {error}
          </div>
        )}

        {/* Request table */}
        <div className="overflow-x-auto rounded-xl mb-8" style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
                {["#", "Employee", "Pack", "Status", "Sealed handle", "Revealed", "Action"].map((c) => (
                  <th key={c} className="text-left text-[11px] font-medium uppercase tracking-[0.07em] px-4 py-3"
                    style={{ color: "var(--color-subtle)" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[12px]" style={{ color: "var(--color-subtle)" }}>
                  Loading requests…
                </td></tr>
              )}
              {requests.map((req) => {
                const revealed = decrypted[req.id.toString()];
                const isBusy = busy === req.id.toString();
                const isFocus = proofFocusId === req.id.toString();
                return (
                  <tr key={req.id.toString()}
                    onClick={() => setProofFocusId(isFocus ? null : req.id.toString())}
                    style={{
                      borderBottom: "1px solid var(--border-dim)",
                      cursor: "pointer",
                      background: isFocus ? "rgba(110,144,178,0.05)" : "transparent",
                    }}>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--color-subtle)" }}>#{req.id.toString()}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: "var(--color-muted)" }}>{truncateAddress(req.employee)}</td>
                    <td className="px-4 py-3" style={{ color: "var(--color-muted)" }}>{PACK_NAME[req.packId] ?? `Pack #${req.packId}`}</td>
                    <td className="px-4 py-3" style={{ color: "var(--color-muted)" }}>{statusLabel(req.publicStatus, req.inReview)}</td>
                    <td className="px-4 py-3 font-mono text-[11px]" style={{ color: "var(--color-subtle)" }}>
                      <span className="inline-flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        {truncateHandle(req.encStatus)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {revealed !== undefined ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold"
                          style={{ color: "var(--color-approved)" }}>
                          <Eye className="w-3.5 h-3.5" />
                          tier {revealed} ({statusLabel(revealed, false)})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12px]"
                          style={{ color: "var(--color-subtle)" }}>
                          <EyeOff className="w-3.5 h-3.5" />
                          sealed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReveal(req.id, req.encStatus)}
                          disabled={!isAuditor || !!busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all disabled:opacity-40"
                          style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                          Decrypt
                        </button>
                        <button
                          onClick={() => downloadPacket(req)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-mid)", color: "var(--color-muted)" }}>
                          <Download className="w-3.5 h-3.5" />
                          Packet
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Side-by-side privacy proof panel */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: proofReq ? 1 : 0, height: proofReq ? "auto" : 0 }}
          className="mb-8 overflow-hidden">
          {proofReq && (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-mid)" }}>
              {/* Panel header */}
              <div className="flex items-center gap-2 px-4 py-3"
                style={{ background: "#0E0E11", borderBottom: "1px solid var(--border-dim)" }}>
                <SplitSquareHorizontal className="w-3.5 h-3.5" style={{ color: "var(--color-steel)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--color-steel)" }}>
                  Privacy proof — request #{proofFocusId}
                </span>
                <span className="text-[11px] ml-auto" style={{ color: "var(--color-subtle)" }}>
                  Click any row to focus
                </span>
              </div>
              {/* Split panes */}
              <div className="grid grid-cols-2">
                {/* Observer view — sealed */}
                <div className="p-5 border-r" style={{ borderColor: "var(--border-dim)", background: "rgba(0,0,0,0.3)" }}>
                  <p className="text-[10px] uppercase tracking-[0.1em] mb-3" style={{ color: "var(--color-subtle)" }}>
                    Observer view (public)
                  </p>
                  <div className="space-y-2">
                    {[
                      { label: "Request ID",  value: `#${proofFocusId}` },
                      { label: "Employee",    value: truncateAddress(proofReq.employee) },
                      { label: "Pack",        value: PACK_NAME[proofReq.packId] ?? `Pack #${proofReq.packId}` },
                      { label: "Public status", value: statusLabel(proofReq.publicStatus, proofReq.inReview) },
                      { label: "Amount",      value: "🔒 sealed" },
                      { label: "Enc. status", value: <span className="font-mono text-[10px]">{truncateHandle(proofReq.encStatus)}</span> },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between gap-4">
                        <span className="text-[11px] shrink-0" style={{ color: "var(--color-subtle)" }}>{label}</span>
                        <span className="text-[11px] text-right" style={{ color: "var(--color-muted)" }}>{value as any}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Auditor view — decryptable */}
                <div className="p-5" style={{ background: proofDecrypted !== undefined ? "rgba(60,120,80,0.04)" : "rgba(0,0,0,0.15)" }}>
                  <p className="text-[10px] uppercase tracking-[0.1em] mb-3" style={{ color: proofDecrypted !== undefined ? "var(--color-approved)" : "var(--color-subtle)" }}>
                    Auditor view {proofDecrypted !== undefined ? "(revealed)" : "(pending decrypt)"}
                  </p>
                  {proofDecrypted !== undefined ? (
                    <div className="space-y-2">
                      {[
                        { label: "Request ID",  value: `#${proofFocusId}` },
                        { label: "Employee",    value: truncateAddress(proofReq.employee) },
                        { label: "Pack",        value: PACK_NAME[proofReq.packId] ?? `Pack #${proofReq.packId}` },
                        { label: "Public status", value: statusLabel(proofReq.publicStatus, proofReq.inReview) },
                        { label: "Amount",      value: "🔒 sealed (amount not disclosed)" },
                        { label: "Dec. status", value: <span className="font-semibold" style={{ color: "var(--color-approved)" }}>tier {proofDecrypted} — {statusLabel(proofDecrypted, false)}</span> },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-4">
                          <span className="text-[11px] shrink-0" style={{ color: "var(--color-subtle)" }}>{label}</span>
                          <span className="text-[11px] text-right" style={{ color: "var(--color-muted)" }}>{value as any}</span>
                        </div>
                      ))}
                      <div className="mt-3 pt-3 text-[11px]" style={{ borderTop: "1px solid var(--border-dim)", color: "var(--color-approved)" }}>
                        ✓ ACL grant confirmed: FHE.allow(encStatus, auditor) was called by admin.
                        No other address can decrypt this handle.
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <Lock className="w-8 h-8" style={{ color: "var(--color-subtle)" }} />
                      <p className="text-[12px]" style={{ color: "var(--color-subtle)" }}>
                        {isAuditor
                          ? "Click Decrypt to reveal the encrypted status for this request."
                          : "Connect the auditor wallet to decrypt granted requests."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {/* Proof note */}
              <div className="px-5 py-3 text-[11px]" style={{ background: "#0E0E11", borderTop: "1px solid var(--border-dim)", color: "var(--color-subtle)" }}>
                ACL model: only addresses listed in FHE.allow(handle, address) can decrypt the handle. Auditor sees status only for the
                {" "}<code className="font-mono">requestIds</code> passed to{" "}
                <code className="font-mono">grantAuditorAccess()</code>. Amount remains sealed to all external parties.
              </div>
            </div>
          )}
        </motion.div>

        <div className="text-[11px] leading-relaxed" style={{ color: "var(--color-subtle)" }}>
          Privacy proof: decrypting a request that was NOT granted via{" "}
          <code className="font-mono">grantAuditorAccess(requestIds)</code> returns an error.
          Other auditors / observers / employees never see this view.
        </div>
      </main>
    </div>
  );
}
