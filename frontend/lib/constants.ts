export const STATUS_PENDING = 0;
export const STATUS_APPROVED = 1;
export const STATUS_DENIED = 2;

export const CATEGORY_OPTIONS = [
  { id: 1, label: "SaaS Tool" },
  { id: 2, label: "Marketing" },
  { id: 3, label: "Operations" },
  { id: 4, label: "Hardware" },
] as const;

export const APP_COPY = {
  heroTitle: "Private spend controls for teams moving money on-chain.",
  heroSubtitle:
    "ShieldCard hides spending limits, encrypts request amounts, and reveals only what each role is allowed to see.",
} as const;
