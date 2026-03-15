export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function truncateAddress(value?: string) {
  if (!value) return "Disconnected";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function truncateHandle(value?: string | bigint) {
  const normalized = typeof value === "bigint" ? `0x${value.toString(16)}` : value;
  if (!normalized) return "Unsealed";
  return `${normalized.slice(0, 10)}...${normalized.slice(-6)}`;
}

export function formatTimestamp(value: bigint | number) {
  const timestamp = typeof value === "bigint" ? Number(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp * 1000));
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return "Something went wrong. Please retry the action.";
}
