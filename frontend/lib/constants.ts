// Status constants — mirrors ShieldCardControlPlane.sol
export const STATUS_SUBMITTED      = 0;
export const STATUS_AUTO_APPROVED  = 1;
export const STATUS_NEEDS_REVIEW   = 2;
export const STATUS_AUTO_DENIED    = 3;
export const STATUS_ADMIN_APPROVED = 4;
export const STATUS_ADMIN_DENIED   = 5;

// ── Demo actor name map ──────────────────────────────────────────────────────
// Maps seeded employee wallet addresses (lowercase) to display names.
// Employee B (Sales / auditor): 0x1D7f7354eDA779D15Ebd258aE92F82D9E1b98028
export const DEMO_NAMES: Record<string, string> = {
  "0x1d7f7354eda779d15ebd258ae92f82d9e1b98028": "Sarah Rodriguez",
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

// Employee display name: DEMO_NAMES entry or truncated address
export function getEmployeeName(address: string): string {
  return DEMO_NAMES[address.toLowerCase()] ?? address;
}

// Vendor display name: DEMO_VENDORS override or on-chain name
export function getVendorName(vendorId: number, onChainName: string): string {
  return DEMO_VENDORS[vendorId] ?? onChainName;
}

export const APP_COPY = {
  heroTitle: "Corporate Treasury. Confidential by Design.",
  heroSubtitle:
    "ShieldCard enforces spend policy on encrypted data, settles approved spend on-chain, and gives auditors exactly the access they need — nothing more.",
} as const;
