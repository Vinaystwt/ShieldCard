"use client";

interface StatusBadgeProps {
  status: number;
  published?: boolean;
  inReview?: boolean;
  size?: "sm" | "md";
}

type StatusConfig = { dot: string; text: string; label: string; bg: string; border: string };

function getConfig(status: number, published: boolean, inReview: boolean): StatusConfig {
  if (inReview) {
    return {
      dot: "bg-pending animate-pending",
      text: "text-pending",
      label: "In Review",
      bg: "var(--pending-bg)",
      border: "rgba(196,148,60,0.20)",
    };
  }
  if (!published) {
    return {
      dot: "bg-pending animate-pending",
      text: "text-pending",
      label: "Pending Publish",
      bg: "var(--pending-bg)",
      border: "rgba(196,148,60,0.20)",
    };
  }
  switch (status) {
    case 1: // AUTO_APPROVED
      return { dot: "bg-approved", text: "text-approved", label: "Auto Approved", bg: "var(--approved-bg)", border: "rgba(77,145,112,0.20)" };
    case 2: // NEEDS_REVIEW
      return { dot: "bg-pending animate-pending", text: "text-pending", label: "Needs Review", bg: "var(--pending-bg)", border: "rgba(196,148,60,0.20)" };
    case 3: // AUTO_DENIED
      return { dot: "bg-denied", text: "text-denied", label: "Auto Denied", bg: "var(--denied-bg)", border: "rgba(147,68,68,0.20)" };
    case 4: // ADMIN_APPROVED
      return { dot: "bg-approved", text: "text-approved", label: "Approved", bg: "var(--approved-bg)", border: "rgba(77,145,112,0.20)" };
    case 5: // ADMIN_DENIED
      return { dot: "bg-denied", text: "text-denied", label: "Denied", bg: "var(--denied-bg)", border: "rgba(147,68,68,0.20)" };
    default:
      return { dot: "bg-pending animate-pending", text: "text-pending", label: "Pending", bg: "var(--pending-bg)", border: "rgba(196,148,60,0.20)" };
  }
}

export function StatusBadge({ status, published = false, inReview = false, size = "sm" }: StatusBadgeProps) {
  const cfg = getConfig(status, published, inReview);
  const dotSize = size === "sm" ? 5 : 6;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs"
      } ${cfg.text}`}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
      }}
    >
      <span
        className={`rounded-full shrink-0 ${cfg.dot}`}
        style={{ width: dotSize, height: dotSize }}
      />
      {cfg.label}
    </span>
  );
}
