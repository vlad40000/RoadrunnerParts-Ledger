import { type BomRow, type Machine } from "./contracts";

export type LedgerState = {
  machine: Machine;
  rows: BomRow[];
  updatedAt: string;
};

const PREFIX = "roadrunner-ledger:";
const INDEX_KEY = `${PREFIX}index`;

export function saveLedger(state: LedgerState): void {
  if (typeof window === "undefined") return;
  const key = `${PREFIX}${state.machine.machine_id}`;
  window.localStorage.setItem(key, JSON.stringify(state));
  const index = listLedgerIds();
  if (!index.includes(state.machine.machine_id)) {
    window.localStorage.setItem(INDEX_KEY, JSON.stringify([state.machine.machine_id, ...index]));
  }
}

export function loadLedger(machineId: string): LedgerState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`${PREFIX}${machineId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LedgerState;
  } catch {
    return null;
  }
}

export function listLedgerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function listLedgers(): LedgerState[] {
  return listLedgerIds().flatMap((machineId) => {
    const ledger = loadLedger(machineId);
    return ledger ? [ledger] : [];
  });
}
