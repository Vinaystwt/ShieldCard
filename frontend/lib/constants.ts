// Status constants — mirrors ShieldCardControlPlane.sol
export const STATUS_SUBMITTED      = 0;
export const STATUS_AUTO_APPROVED  = 1;
export const STATUS_NEEDS_REVIEW   = 2;
export const STATUS_AUTO_DENIED    = 3;
export const STATUS_ADMIN_APPROVED = 4;
export const STATUS_ADMIN_DENIED   = 5;

// ── Demo actor name map ──────────────────────────────────────────────────────
// Seeded employee wallet addresses (lowercase) → display names.
// Employee A (Engineering): 0x8df6Dd7B18BD693DD98228D03fEe85424C4293A4
// Employee B (Sales / auditor): 0x1D7f7354eDA779D15Ebd258aE92F82D9E1b98028
// Employee C (Operations): 0x06539560c4696cA6A3376f7EFa1dBC840D21E466
// Admin: 0x94c188F8280cA706949CC030F69e42B5544514ac
export const DEMO_NAMES: Record<string, string> = {
  "0x8df6dd7b18bd693dd98228d03fee85424c4293a4": "Alex Chen",         // Employee A · Engineering
  "0x1d7f7354eda779d15ebd258ae92f82d9e1b98028": "Sarah Rodriguez",   // Employee B · Sales · auditor
  "0x06539560c4696ca6a3376f7efa1dbc840d21e466": "Jordan Kim",        // Employee C · Operations
  "0x94c188f8280ca706949cc030f69e42b5544514ac": "Admin",             // Contract deployer / admin
};

// Override display names for seeded vendor IDs.
// On-chain names from seed are generic; these map to recognizable Web3 vendors.
export const DEMO_VENDORS: Record<number, string> = {
  1: "Alchemy",
  2: "Fireblocks",
  3: "Uniswap Labs",
  4: "ConsenSys",
  5: "Coinbase Ventures",
};

// Safe short-form address (no external import — avoids circular dep)
function _truncate(addr: string): string {
  if (!addr || addr.length < 10) return addr || "Unknown";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// Employee display name — null-safe
export function getEmployeeName(address: string | undefined | null): string {
  if (!address) return "Unknown";
  return DEMO_NAMES[address.toLowerCase()] ?? _truncate(address);
}

// Vendor display name — null-safe; call with (vendorId, onChainName)
export function getVendorName(vendorId: number | bigint | undefined | null, onChainName?: string): string {
  if (vendorId == null) return onChainName ?? "Unknown";
  const id = Number(vendorId);
  return DEMO_VENDORS[id] ?? onChainName ?? `Vendor #${id}`;
}

// Pack display name — null-safe
export function getPackName(packId: number | bigint | undefined | null): string {
  const PACK_NAMES: Record<number, string> = { 1: "Travel", 2: "SaaS", 3: "Vendor", 4: "Marketing" };
  if (packId == null) return "Unknown";
  const id = Number(packId);
  return PACK_NAMES[id] ?? `Pack #${id}`;
}

export const APP_COPY = {
  heroTitle: "Corporate Treasury. Confidential by Design.",
  heroSubtitle:
    "ShieldCard enforces spend policy on encrypted data, settles approved spend on-chain, and gives auditors exactly the access they need — nothing more.",
} as const;
