const STORAGE_KEY = "shieldcard_instance";
const SETTLEMENT_KEY = "shieldcard_settlement";
const MOCKUSDC_KEY = "shieldcard_mockusdc";

export function getInstanceAddress(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS ?? "";
  }
  return (
    localStorage.getItem(STORAGE_KEY) ??
    process.env.NEXT_PUBLIC_SHIELDCARD_ADDRESS ??
    ""
  );
}

export function getSettlementAddress(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_SETTLEMENT_ADDRESS ?? "";
  }
  return (
    localStorage.getItem(SETTLEMENT_KEY) ??
    process.env.NEXT_PUBLIC_SETTLEMENT_ADDRESS ??
    ""
  );
}

export function getMockUsdcAddress(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_MOCKUSDC_ADDRESS ?? "";
  }
  return (
    localStorage.getItem(MOCKUSDC_KEY) ??
    process.env.NEXT_PUBLIC_MOCKUSDC_ADDRESS ??
    ""
  );
}

export function setInstanceAddresses(core: string, settlement: string, mockUsdc: string): void {
  localStorage.setItem(STORAGE_KEY, core);
  localStorage.setItem(SETTLEMENT_KEY, settlement);
  localStorage.setItem(MOCKUSDC_KEY, mockUsdc);
  window.location.reload();
}

export function clearInstanceAddresses(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SETTLEMENT_KEY);
  localStorage.removeItem(MOCKUSDC_KEY);
}

export function isCustomInstance(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(localStorage.getItem(STORAGE_KEY));
}
