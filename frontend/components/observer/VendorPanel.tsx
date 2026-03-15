"use client";

import { motion } from "framer-motion";
import { ShieldCheck, ShieldX, ShieldAlert, HelpCircle } from "lucide-react";
import { VENDOR_STATUS, vendorStatusLabel } from "@/lib/contracts";
import type { VendorInfo } from "@/lib/contracts";

interface VendorPanelProps {
  vendors: VendorInfo[];
  isLoading?: boolean;
}

function StatusIcon({ status }: { status: number }) {
  switch (status) {
    case VENDOR_STATUS.COMPLIANT:
      return <ShieldCheck className="w-3.5 h-3.5" style={{ color: "var(--color-approved)" }} />;
    case VENDOR_STATUS.SUSPENDED:
      return <ShieldAlert className="w-3.5 h-3.5" style={{ color: "var(--color-pending)" }} />;
    case VENDOR_STATUS.BANNED:
      return <ShieldX className="w-3.5 h-3.5" style={{ color: "var(--color-denied)" }} />;
    default:
      return <HelpCircle className="w-3.5 h-3.5" style={{ color: "var(--color-subtle)" }} />;
  }
}

function statusStyle(status: number) {
  switch (status) {
    case VENDOR_STATUS.COMPLIANT:
      return { color: "var(--color-approved)", bg: "var(--approved-bg)", border: "rgba(77,145,112,0.20)" };
    case VENDOR_STATUS.SUSPENDED:
      return { color: "var(--color-pending)", bg: "var(--pending-bg)", border: "rgba(196,148,60,0.20)" };
    case VENDOR_STATUS.BANNED:
      return { color: "var(--color-denied)", bg: "var(--denied-bg)", border: "rgba(147,68,68,0.20)" };
    default:
      return { color: "var(--color-subtle)", bg: "rgba(255,255,255,0.03)", border: "var(--border-dim)" };
  }
}

export function VendorPanel({ vendors, isLoading }: VendorPanelProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2.5 py-4">
        <span className="w-1.5 h-1.5 rounded-full bg-copper animate-pending" />
        <span className="text-[12px]" style={{ color: "var(--color-muted)" }}>
          Loading vendor registry...
        </span>
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <p className="text-[13px] py-4" style={{ color: "var(--color-subtle)" }}>
        No vendors registered.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {vendors.map((v, i) => {
        const style = statusStyle(v.status);
        return (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: i * 0.04 }}
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: style.bg, border: `1px solid ${style.border}` }}
          >
            <StatusIcon status={v.status} />
            <span className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
              {v.name}
            </span>
            <span
              className="text-[10px] font-medium ml-1"
              style={{ color: style.color }}
            >
              {vendorStatusLabel(v.status)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
