const STORAGE_KEY = "shieldcard_instance";
const SETTLEMENT_KEY = "shieldcard_settlement";
const MOCKUSDC_KEY = "shieldcard_mockusdc";

function getBrowserStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

export function getInstanceAddress(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS ?? "";
  }
  const storage = getBrowserStorage();
  return (
    storage?.getItem(STORAGE_KEY) ??
    process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS ??
    ""
  );
}

export function getSettlementAddress(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SETTLEMENT_ADDRESS ?? "";
  }
  const storage = getBrowserStorage();
  return (
    storage?.getItem(SETTLEMENT_KEY) ??
    process.env.NEXT_PUBLIC_SETTLEMENT_ADDRESS ??
    ""
  );
}

export function getMockUsdcAddress(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_MOCKUSDC_ADDRESS ?? "";
  }
  const storage = getBrowserStorage();
  return (
    storage?.getItem(MOCKUSDC_KEY) ??
    process.env.NEXT_PUBLIC_MOCKUSDC_ADDRESS ??
    ""
  );
}

export function setInstanceAddresses(core: string, settlement: string, mockUsdc: string): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, core);
  storage.setItem(SETTLEMENT_KEY, settlement);
  storage.setItem(MOCKUSDC_KEY, mockUsdc);
  if (typeof window !== "undefined") window.location.reload();
}

export function clearInstanceAddresses(): void {
  const storage = getBrowserStorage();
  if (!storage) return;
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(SETTLEMENT_KEY);
  storage.removeItem(MOCKUSDC_KEY);
}

export function isCustomInstance(): boolean {
  const storage = getBrowserStorage();
  return Boolean(storage?.getItem(STORAGE_KEY));
}
