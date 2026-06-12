export function normalizeModel(model: string): string {
  return model.replace(/[^a-z0-9]/gi, "").trim().toUpperCase();
}

export function normalizeBrand(brand: string): string {
  return brand.trim().toLowerCase();
}

export function normalizePriceText(value: string): string {
  const text = value.trim();
  if (!text) return "";
  if (/no longer available|discontinued|nla/i.test(text)) return "NLA";
  const match = text.match(/\$\s?\d[\d,]*(?:\.\d{2})?/);
  return match ? match[0].replace(/\s+/g, "") : "";
}
