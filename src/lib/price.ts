export function parsePriceValue(value: string): number {
  const normalized = value.trim().toUpperCase();
  if (!normalized || normalized === "NLA") return 0;
  const numeric = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

export function formatMoney(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function sumPrices(values: string[]): number {
  return values.reduce((sum, value) => sum + parsePriceValue(value), 0);
}
