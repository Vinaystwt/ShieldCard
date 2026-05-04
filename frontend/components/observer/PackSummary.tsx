"use client";

import { motion } from "framer-motion";
import { POLICY_PACKS } from "@/lib/contracts";

interface PackData {
  id: number;
  name: string;
  total: bigint;
  approved: bigint;
  denied: bigint;
  pending: bigint;
}

interface PackSummaryProps {
  packs: PackData[];
  isLoading?: boolean;
  isError?: boolean;
}

export function PackSummary({ packs, isLoading, isError }: PackSummaryProps) {
  const packMap = new Map(packs.map((p) => [p.id, p]));

  return (
    <div className="grid grid-cols-4 gap-3">
      {POLICY_PACKS.map((staticPack, i) => {
        const live = packMap.get(staticPack.id);
        const total = Number(live?.total ?? BigInt(0));
        const approved = Number(live?.approved ?? BigInt(0));
        const denied = Number(live?.denied ?? BigInt(0));
        const pending = Number(live?.pending ?? BigInt(0));
        const approvalRate = total > 0 ? Math.round((approved / total) * 100) : null;

        return (
          <motion.div
            key={staticPack.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className="rounded-lg px-4 py-4 relative overflow-hidden"
            style={{
              background: "#0E0E11",
              border: "1px solid var(--border-dim)",
            }}
          >
            {/* Corner glow */}
            <div
              className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(200,131,63,0.05) 0%, transparent 70%)",
                transform: "translate(30%, -30%)",
              }}
            />

            {/* Pack name */}
            <p className="text-[10px] font-medium uppercase tracking-[0.09em] mb-3 text-subtle">
              {staticPack.name}
            </p>

            {/* Counts */}
            {isLoading ? (
              <div className="flex items-center gap-1.5 h-8">
                <span className="h-1.5 w-1.5 rounded-full bg-copper animate-pending" />
                <span className="text-[11px] text-subtle">Loading...</span>
              </div>
            ) : isError ? (
              <div className="flex items-center gap-1.5 h-8">
                <span className="text-[11px] text-denied opacity-70">RPC error</span>
              </div>
            ) : (
              <>
                <p
                  className="text-[28px] font-bold tracking-[-0.03em] mb-1"
                  style={{ color: "var(--color-text)" }}
                >
                  {total}
                </p>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-approved">
                      {approved} approved
                    </span>
                    {approvalRate !== null && (
                      <span className="text-[10px] text-subtle">{approvalRate}%</span>
                    )}
                  </div>
                  <span className="text-[11px] text-denied">{denied} denied</span>
                  {pending > 0 && (
                    <span className="text-[11px] text-pending">{pending} pending</span>
                  )}
                </div>
              </>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
