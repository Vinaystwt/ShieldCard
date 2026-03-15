"use client";

import { useEffect, useRef, useState } from "react";
import { createPublicClient, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import gsap from "gsap";
import { shieldCardAddress, shieldCardAbi, settlementAddress, settlementAbi } from "@/lib/contracts";

const RPC = process.env.NEXT_PUBLIC_ARB_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

type Stats = {
  requestCount: number;
  publishedCount: number;
  settledCount: number;
  receiptsCommitted: number;
};

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevRef = useRef(0);

  useEffect(() => {
    if (!ref.current || value === 0) return;
    gsap.to({ val: prevRef.current }, {
      val: value,
      duration: 1.2,
      ease: "power2.out",
      onUpdate: function () {
        if (ref.current) {
          ref.current.textContent = Math.round(this.targets()[0].val).toString() + suffix;
        }
      },
      onComplete: () => { prevRef.current = value; },
    });
  }, [value, suffix]);

  return <span ref={ref}>{value === 0 ? "—" : value.toString() + suffix}</span>;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!shieldCardAddress) return;
    const client = createPublicClient({ chain: arbitrumSepolia, transport: http(RPC) });
    (async () => {
      try {
        const total = Number(await client.readContract({ address: shieldCardAddress, abi: shieldCardAbi, functionName: "getRequestCount" }) as bigint);
        let published = 0;
        let receiptsCommitted = 0;
        let settled = 0;
        for (let i = 0; i < Math.min(total, 30); i++) {
          try {
            const req = await client.readContract({ address: shieldCardAddress, abi: shieldCardAbi, functionName: "getRequest", args: [BigInt(i)] }) as readonly unknown[];
            if (req[8]) published++; // resultPublished
            // receiptHash is index 11 — non-zero bytes32 means receipt committed on-chain
            const receiptHash = req[11] as string;
            if (receiptHash && receiptHash !== "0x0000000000000000000000000000000000000000000000000000000000000000") receiptsCommitted++;
          } catch { /* skip */ }
        }
        if (settlementAddress) {
          for (let i = 0; i < Math.min(total, 30); i++) {
            try {
              const exists = await client.readContract({ address: settlementAddress, abi: settlementAbi, functionName: "settlementExists", args: [BigInt(i)] }) as boolean;
              if (exists) {
                const state = await client.readContract({ address: settlementAddress, abi: settlementAbi, functionName: "getSettlementState", args: [BigInt(i)] }) as number;
                if (Number(state) === 3) settled++;
              }
            } catch { /* skip */ }
          }
        }
        setStats({ requestCount: total, publishedCount: published, settledCount: settled, receiptsCommitted });
      } catch { /* skip */ }
    })();
  }, []);

  if (!stats) return null;

  const ITEMS = [
    { label: "Encrypted requests", value: stats.requestCount },
    { label: "Outcomes published", value: stats.publishedCount },
    { label: "Settlements executed", value: stats.settledCount },
    { label: "Receipts on-chain", value: stats.receiptsCommitted },
  ];

  return (
    <div className="border-y" style={{ borderColor: "var(--border-dim)", background: "rgba(255,255,255,0.01)" }}>
      <div className="mx-auto max-w-[1280px] px-6 py-4 grid grid-cols-4 gap-0">
        {ITEMS.map((item, i) => (
          <div key={item.label} className="flex flex-col items-center py-3 text-center"
            style={i < ITEMS.length - 1 ? { borderRight: "1px solid var(--border-dim)" } : {}}>
            <span className="text-[26px] font-bold tracking-[-0.025em]"
              style={{ color: "var(--color-text)" }}>
              <AnimatedNumber value={item.value} />
            </span>
            <span className="text-[11px] mt-0.5" style={{ color: "var(--color-subtle)" }}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
