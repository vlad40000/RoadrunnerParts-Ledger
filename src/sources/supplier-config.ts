export const SUPPLIER_IDS = ["sears", "fix", "reliable", "partsdr", "dlparts"] as const;

export type SupplierId = (typeof SUPPLIER_IDS)[number];

export const SUPPLIER_LABELS: Record<SupplierId, string> = {
  sears: "Sears",
  fix: "Fix",
  reliable: "Reliable",
  partsdr: "PartsDR",
  dlparts: "DLParts"
};

export function isSupplierId(value: string): value is SupplierId {
  return (SUPPLIER_IDS as readonly string[]).includes(value);
}
