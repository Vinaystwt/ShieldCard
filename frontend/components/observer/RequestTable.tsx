"use client";

import { motion } from "framer-motion";
import { FileX } from "lucide-react";
import { SealedValue } from "@/components/ui/SealedValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatTimestamp, truncateAddress } from "@/lib/format";
import { PACK_NAME } from "@/lib/contracts";
import { getEmployeeName, getVendorName } from "@/lib/constants";
import type { DeptInfo, RequestView, VendorInfo } from "@/lib/contracts";
import { FileCheck2 } from "lucide-react";

interface RequestTableProps {
  requests: Array<{ id: bigint } & RequestView>;
  depts?: DeptInfo[];
  vendors?: VendorInfo[];
}

export function RequestTable({ requests, depts, vendors }: RequestTableProps) {
  const deptNameById = new Map((depts ?? []).map((d) => [d.id, d.name]));
  const vendorNameById = new Map((vendors ?? []).map((v) => [v.id, v.name]));
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FileX}
        title="No requests on-chain yet"
        body="When employees submit requests, only encrypted handles and public metadata appear here. Actual amounts remain sealed."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border-dim)" }}>
            {["#", "Employee", "Pack", "Dept", "Vendor", "Encrypted Amount", "Memo", "Time", "Risk", "Evidence", "Status"].map(
              (col) => (
                <th
                  key={col}
                  className="text-left text-[11px] font-medium uppercase tracking-[0.07em] text-subtle pb-3 pr-4 last:pr-0"
                >
                  {col}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {requests.map((req, i) => {
            const packName = PACK_NAME[req.packId] ?? `Pack #${req.packId}`;

            return (
              <motion.tr
                key={req.id.toString()}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="group"
                style={{ borderBottom: "1px solid var(--border-dim)" }}
              >
                <td className="py-3.5 pr-4">
                  <span className="font-mono text-subtle">#{req.id.toString()}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="font-mono text-muted">{getEmployeeName(req?.employee)}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      background: "rgba(110,144,178,0.08)",
                      border: "1px solid var(--steel-border)",
                      color: "var(--color-steel)",
                    }}
                  >
                    {packName}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-[12px]" style={{ color: "var(--color-subtle)" }}>
                    {req.deptId > 0 ? (deptNameById.get(req.deptId) ?? `Dept #${req.deptId}`) : "—"}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-[12px]" style={{ color: "var(--color-subtle)" }}>
                    {req.vendorId > 0 ? getVendorName(req.vendorId, vendorNameById.get(req.vendorId) ?? `Vendor #${req.vendorId}`) : "—"}
                  </span>
                </td>
                <td className="py-3.5 pr-4">
                  <SealedValue handle={req.encAmount} />
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-muted max-w-[160px] block truncate">{req.memo}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <span className="text-subtle">{formatTimestamp(req.timestamp)}</span>
                </td>
                <td className="py-3.5 pr-4">
                  <RiskBadge bitmap={req.riskBitmap} compact />
                </td>
                <td className="py-3.5 pr-4">
                  {req.evidenceSubmitted ? (
                    <span
                      className="inline-flex items-center gap-1 text-[11px]"
                      title={`Evidence hash: ${req.evidenceHash}`}
                      style={{ color: "var(--color-approved)" }}
                    >
                      <FileCheck2 className="h-3 w-3" />
                      Attached
                    </span>
                  ) : (
                    <span className="text-[11px]" style={{ color: "var(--color-subtle)" }}>—</span>
                  )}
                </td>
                <td className="py-3.5">
                  <StatusBadge status={req.publicStatus} published={req.resultPublished} inReview={req.inReview} />
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
