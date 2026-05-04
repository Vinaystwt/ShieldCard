// Status constants — mirrors ShieldCardPolicyEngine.sol
export const STATUS_SUBMITTED      = 0;
export const STATUS_AUTO_APPROVED  = 1;
export const STATUS_NEEDS_REVIEW   = 2;
export const STATUS_AUTO_DENIED    = 3;
export const STATUS_ADMIN_APPROVED = 4;
export const STATUS_ADMIN_DENIED   = 5;

// Legacy aliases
export const STATUS_PENDING  = 0;
export const STATUS_APPROVED = 1;
export const STATUS_DENIED   = 2;

export const APP_COPY = {
  heroTitle: "Private spend controls for teams moving money on-chain.",
  heroSubtitle:
    "ShieldCard encrypts amounts, hides policy thresholds, and reveals only what each role needs to see — powered by FHE on Arbitrum Sepolia.",
} as const;
