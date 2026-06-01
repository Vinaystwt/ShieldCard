"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, usePublicClient, useChainId, useBalance } from "wagmi";
import { CheckCircle2, Circle, ExternalLink, Lock, ReceiptText, ShieldCheck, Users, Loader2, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/shell/TopBar";
import { WalletButton } from "@/components/wallet/WalletButton";
import { SwitchNetworkButton } from "@/components/ui/SwitchNetworkButton";
import { targetChain } from "@/lib/contracts";
import { setInstanceAddresses } from "@/lib/instance";

const ARBISCAN = "https://sepolia.arbiscan.io";

type DeployStep = {
  label: string;
  status: "idle" | "pending" | "done" | "error";
  address?: string;
  txHash?: string;
};

const FEATURE_CARDS = [
  {
    icon: Lock,
    title: "Encrypted Policy Enforcement",
    body: "Spend thresholds and approval rules evaluated on ciphertext using Fhenix CoFHE. No plaintext ever hits the chain.",
  },
  {
    icon: ReceiptText,
    title: "Testnet Settlement Rail",
    body: "Approved requests settle via MockUSDC on Arbitrum Sepolia. Hash-chained receipts form a tamper-evident audit trail.",
  },
  {
    icon: ShieldCheck,
    title: "Scoped Auditor Access",
    body: "Grant per-request decryption permits to a designated auditor. Scope is enforced by the FHE ACL — not by access controls you have to remember to set.",
  },
  {
    icon: Users,
    title: "Tamper-Evident Audit Trail",
    body: "Every decision is chained to the previous receipt hash. Any tamper attempt breaks verification at /verify.",
  },
];

export default function DeployPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const { data: balance } = useBalance({ address, chainId: targetChain.id });

  const [steps, setSteps] = useState<DeployStep[]>([
    { label: "Deploy MockUSDC", status: "idle" },
    { label: "Deploy ShieldCardControlPlane", status: "idle" },
    { label: "Deploy ShieldCardSettlement", status: "idle" },
    { label: "Save instance", status: "idle" },
  ]);
  const [deployed, setDeployed] = useState<{ core: string; settlement: string; usdc: string } | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState<string | null>(null);

  const isRightNetwork = chainId === targetChain.id;
  const hasFunds = balance ? balance.value > BigInt(10_000_000_000_000_000) : false; // 0.01 ETH

  const prereqs = [
    { label: "MetaMask connected", done: isConnected },
    { label: "Arbitrum Sepolia network", done: isRightNetwork },
    { label: "Testnet ETH available (≥ 0.01 ETH)", done: hasFunds },
  ];

  const allPrereqsMet = prereqs.every((p) => p.done);

  function setStep(index: number, patch: Partial<DeployStep>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  async function handleDeploy() {
    if (!address || !publicClient || !isConnected) return;
    setDeploying(true);
    setDeployError(null);

    try {
      const { createWalletClient, custom } = await import("viem");
      const walletClient = createWalletClient({
        chain: targetChain,
        transport: custom((window as any).ethereum),
        account: address,
      });

      // Dynamically import bytecodes at deploy time
      const [mockUsdcArtifact, coreArtifact, settlementArtifact] = await Promise.all([
        import("../_artifacts/MockUSDC.json").catch(() => null),
        import("../_artifacts/ShieldCardControlPlane.json").catch(() => null),
        import("../_artifacts/ShieldCardSettlement.json").catch(() => null),
      ]);

      if (!mockUsdcArtifact || !coreArtifact || !settlementArtifact) {
        throw new Error("Contract artifacts not bundled. Run `pnpm build` first.");
      }

      // Step 1: Deploy MockUSDC
      setStep(0, { status: "pending" });
      const usdcHash = await walletClient.deployContract({
        abi: [],
        bytecode: (mockUsdcArtifact as any).bytecode,
        args: [],
        chain: targetChain,
        account: address as `0x${string}`,
      });
      setStep(0, { txHash: usdcHash });
      const usdcReceipt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
      const usdcAddr = usdcReceipt.contractAddress!;
      setStep(0, { status: "done", address: usdcAddr, txHash: usdcHash });

      // Step 2: Deploy ShieldCardControlPlane
      setStep(1, { status: "pending" });
      const coreHash = await walletClient.deployContract({
        abi: [],
        bytecode: (coreArtifact as any).bytecode,
        args: [],
        chain: targetChain,
        account: address as `0x${string}`,
      });
      setStep(1, { txHash: coreHash });
      const coreReceipt = await publicClient.waitForTransactionReceipt({ hash: coreHash });
      const coreAddr = coreReceipt.contractAddress!;
      setStep(1, { status: "done", address: coreAddr, txHash: coreHash });

      // Step 3: Deploy ShieldCardSettlement
      setStep(2, { status: "pending" });
      const settlementHash = await walletClient.deployContract({
        abi: [],
        bytecode: (settlementArtifact as any).bytecode,
        args: [coreAddr, usdcAddr],
        chain: targetChain,
        account: address as `0x${string}`,
      });
      setStep(2, { txHash: settlementHash });
      const settlementReceipt = await publicClient.waitForTransactionReceipt({ hash: settlementHash });
      const settlementAddr = settlementReceipt.contractAddress!;
      setStep(2, { status: "done", address: settlementAddr, txHash: settlementHash });

      // Step 4: Save to localStorage
      setStep(3, { status: "pending" });
      localStorage.setItem("shieldcard_instance", coreAddr);
      localStorage.setItem("shieldcard_settlement", settlementAddr);
      localStorage.setItem("shieldcard_mockusdc", usdcAddr);
      setStep(3, { status: "done" });

      setDeployed({ core: coreAddr, settlement: settlementAddr, usdc: usdcAddr });
    } catch (err: any) {
      const raw: string = err?.message ?? err?.toString() ?? "";
      let friendly = "Deployment failed. Check your wallet and try again.";
      if (/user rejected|user denied|rejected the request/i.test(raw)) {
        friendly = "Transaction rejected in wallet. Click Deploy again when ready.";
      } else if (/insufficient funds|insufficient balance/i.test(raw)) {
        friendly = "Insufficient testnet ETH. Get funds from the faucet above, then try again.";
      } else if (/network|could not fetch|timeout|disconnected/i.test(raw)) {
        friendly = "Network error. Check your connection or RPC, then try again.";
      }
      setDeployError(friendly);
      setSteps((prev) => prev.map((s) => s.status === "pending" ? { ...s, status: "error" } : s));
    } finally {
      setDeploying(false);
    }
  }

  function handleReset() {
    setDeployError(null);
    setDeploying(false);
    setSteps([
      { label: "Deploy MockUSDC", status: "idle" },
      { label: "Deploy ShieldCardControlPlane", status: "idle" },
      { label: "Deploy ShieldCardSettlement", status: "idle" },
      { label: "Save instance", status: "idle" },
    ]);
  }

  return (
    <div className="min-h-screen bg-base">
      <TopBar />
      <main className="mx-auto max-w-[900px] px-6 py-16">

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium mb-6"
            style={{ background: "rgba(200,131,63,0.08)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
            Arbitrum Sepolia · Three contracts · One click
          </div>
          <h1 className="text-[42px] font-bold tracking-[-0.03em] leading-[1.1] mb-5 text-text">
            Deploy ShieldCard<br />for Your Team
          </h1>
          <p className="text-[17px] leading-relaxed max-w-[520px] mx-auto text-muted">
            Your own confidential treasury control plane on Arbitrum Sepolia. Encrypted policy
            enforcement, scoped auditor access, and a tamper-evident settlement rail — deployed in
            under two minutes.
          </p>
        </motion.div>

        {/* Prerequisites */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl p-6 mb-8" style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}>
          <h2 className="text-[15px] font-semibold mb-5 text-text">Prerequisites</h2>
          <div className="flex flex-col gap-3">
            {prereqs.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                {p.done
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--color-approved)" }} />
                  : <Circle className="w-4 h-4 shrink-0" style={{ color: "var(--color-subtle)" }} />}
                <span className="text-[14px]" style={{ color: p.done ? "var(--color-text)" : "var(--color-muted)" }}>{p.label}</span>
                {i === 0 && !p.done && (
                  <div className="ml-auto">
                    <WalletButton label="Connect Wallet" />
                  </div>
                )}
                {i === 1 && !p.done && isConnected && (
                  <div className="ml-auto">
                    <SwitchNetworkButton compact />
                  </div>
                )}
                {i === 2 && !p.done && isConnected && isRightNetwork && (
                  <a
                    href="https://faucet.triangleplatform.com/arbitrum/sepolia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex items-center gap-1 text-[12px] transition-colors hover:brightness-110"
                    style={{ color: "var(--color-copper)" }}
                  >
                    Get testnet ETH <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Deploy section or success */}
        <AnimatePresence mode="wait">
          {!deployed ? (
            <motion.div key="deploy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="rounded-2xl p-6 mb-8" style={{ background: "#0E0E11", border: "1px solid var(--border-mid)" }}>
              <h2 className="text-[15px] font-semibold mb-5 text-text">Deploy Contracts</h2>

              {/* Steps */}
              <div className="flex flex-col gap-3 mb-6">
                {steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {step.status === "done" && <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--color-approved)" }} />}
                    {step.status === "pending" && <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: "var(--color-copper)" }} />}
                    {step.status === "error" && <Circle className="w-4 h-4 shrink-0" style={{ color: "var(--color-denied)" }} />}
                    {step.status === "idle" && <Circle className="w-4 h-4 shrink-0 opacity-30" style={{ color: "var(--color-subtle)" }} />}
                    <span className="text-[13px]" style={{ color: step.status === "idle" ? "var(--color-subtle)" : "var(--color-text)" }}>
                      {step.label}
                    </span>
                    {step.address && (
                      <a href={`${ARBISCAN}/address/${step.address}`} target="_blank" rel="noopener noreferrer"
                        className="ml-auto text-[11px] font-mono flex items-center gap-1 hover:brightness-110"
                        style={{ color: "var(--color-approved)" }}>
                        {step.address.slice(0, 8)}… <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {deployError && (
                <div className="rounded-lg px-4 py-3 mb-4 text-[13px]"
                  style={{ background: "var(--denied-bg)", border: "1px solid rgba(147,68,68,0.20)", color: "var(--color-denied)" }}>
                  <p className="mb-2">{deployError}</p>
                  <button
                    onClick={handleReset}
                    className="text-[11px] underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--color-denied)" }}
                  >
                    Reset and Try Again
                  </button>
                </div>
              )}

              <button
                onClick={handleDeploy}
                disabled={!allPrereqsMet || deploying}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "rgba(200,131,63,0.12)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}
              >
                {deploying ? <><Loader2 className="w-4 h-4 animate-spin" /> Deploying...</> : <>Deploy All Contracts <ArrowRight className="w-4 h-4" /></>}
              </button>
            </motion.div>
          ) : (
            <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6 mb-8" style={{ background: "rgba(77,145,112,0.05)", border: "1px solid rgba(77,145,112,0.20)" }}>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 className="w-6 h-6" style={{ color: "var(--color-approved)" }} />
                <div>
                  <h2 className="text-[16px] font-semibold text-text">Deployment Complete</h2>
                  <p className="text-[13px] text-muted">You are now the admin of your ShieldCard instance.</p>
                </div>
              </div>
              {[
                { label: "ShieldCardControlPlane", addr: deployed.core },
                { label: "ShieldCardSettlement", addr: deployed.settlement },
                { label: "MockUSDC", addr: deployed.usdc },
              ].map((c) => (
                <div key={c.addr} className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span className="text-[13px] text-muted">{c.label}</span>
                  <a href={`${ARBISCAN}/address/${c.addr}`} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] font-mono flex items-center gap-1 hover:brightness-110"
                    style={{ color: "var(--color-approved)" }}>
                    {c.addr.slice(0, 10)}…{c.addr.slice(-6)} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
              <div className="flex gap-3 mt-6">
                <Link href="/admin" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all hover:brightness-110"
                  style={{ background: "rgba(200,131,63,0.10)", border: "1px solid var(--copper-border-dim)", color: "var(--color-copper)" }}>
                  Go to Admin Panel
                </Link>
              </div>
              <div className="mt-4 rounded-lg px-4 py-3 text-[13px]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-dim)", color: "var(--color-muted)" }}>
                <strong className="text-text">Invite team members:</strong> Share this app&apos;s URL. Have each member connect
                their wallet, then register them from the Admin Panel → Team Management.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Teams testing section */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-2xl p-6 mb-8" style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}>
          <h2 className="text-[15px] font-semibold mb-3 text-text">Built for Real Teams</h2>
          <p className="text-[14px] leading-relaxed text-muted">
            Several Web3 teams are currently in private testing with ShieldCard, managing their
            internal treasury operations with confidential spend controls. Interested in early
            access for your team? Reach out via GitHub or Twitter.
          </p>
        </motion.div>

        {/* Feature cards */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
          <h2 className="text-[15px] font-semibold mb-5 text-text">What you get</h2>
          <div className="grid grid-cols-2 gap-4">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="rounded-xl p-5"
                  style={{ background: "#0E0E11", border: "1px solid var(--border-dim)" }}>
                  <Icon className="w-5 h-5 mb-3" style={{ color: "var(--color-copper)" }} />
                  <h3 className="text-[14px] font-semibold mb-2 text-text">{card.title}</h3>
                  <p className="text-[13px] leading-relaxed text-muted">{card.body}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

      </main>
    </div>
  );
}
