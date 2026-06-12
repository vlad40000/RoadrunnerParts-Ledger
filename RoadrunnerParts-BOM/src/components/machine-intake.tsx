"use client";

import type { Machine } from "@/src/lib/contracts";
import { ImageField } from "@/src/components/image-field";

type Props = {
  machine: Machine;
  onChange: (machine: Machine) => void;
  onSave: () => void;
};

export function MachineIntake({ machine, onChange, onSave }: Props) {
  function patch(key: keyof Machine, value: string) {
    onChange({ ...machine, [key]: value });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Machine intake</h2>
          <p className="text-sm text-slate-500">
            Enter fields manually, or use the <span className="font-medium text-slate-700">camera / upload</span> icons to extract from a nameplate photo.
          </p>
        </div>
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Save machine
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="machine_id" value={machine.machine_id} onChange={(value) => patch("machine_id", value)} />
        <ImageField field="brand" label="brand" value={machine.brand} onChange={(value) => patch("brand", value)} required />
        <ImageField field="model" label="model" value={machine.model} onChange={(value) => patch("model", value)} required />
        <ImageField field="serial" label="serial" value={machine.serial} onChange={(value) => patch("serial", value)} required />
      </div>
      <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Machine notes <span className="normal-case text-slate-400">optional; machine-level only</span>
        <textarea
          value={machine.notes ?? ""}
          onChange={(event) => patch("notes", event.target.value)}
          className="mt-1 h-20 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
        />
      </label>
    </section>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label} {required ? <span className="text-blue-600">*</span> : null}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}
