"use client";

type Role = "Admin" | "Employee" | "Observer" | string;

interface RoleBadgeProps {
  role: Role;
  size?: "sm" | "md";
}

const ROLE_CONFIG: Record<string, { text: string; bg: string; border: string }> = {
  Admin: {
    text: "text-copper",
    bg: "rgba(200, 131, 63, 0.08)",
    border: "rgba(200, 131, 63, 0.22)",
  },
  Employee: {
    text: "text-steel",
    bg: "rgba(110, 144, 178, 0.08)",
    border: "rgba(110, 144, 178, 0.20)",
  },
  Observer: {
    text: "text-muted",
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.08)",
  },
};

export function RoleBadge({ role, size = "sm" }: RoleBadgeProps) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.Observer;
  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border uppercase ${cfg.text} ${
        size === "sm" ? "px-2.5 py-0.5 text-[10px] tracking-[0.08em]" : "px-3 py-1 text-[11px] tracking-[0.07em]"
      }`}
      style={{ background: cfg.bg, borderColor: cfg.border }}
    >
      {role}
    </span>
  );
}
