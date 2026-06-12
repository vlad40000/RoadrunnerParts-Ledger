"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload, X } from "lucide-react";

type OcrField = "brand" | "model" | "serial" | "machine_id";
type OcrStatus = "idle" | "loading" | "error";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  field: OcrField;
  placeholder?: string;
};

export function ImageField({ label, value, onChange, required, field, placeholder }: Props) {
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>("idle");
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setHasCamera(
      typeof navigator !== "undefined" &&
        typeof navigator.mediaDevices?.getUserMedia === "function"
    );
  }, []);

  const runOcr = useCallback(
    async (dataUrl: string) => {
      setOcrStatus("loading");
      setOcrError(null);
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl, field }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as { value: string };
        onChange(data.value);
        setOcrStatus("idle");
      } catch (err) {
        setOcrError(err instanceof Error ? err.message : "OCR failed");
        setOcrStatus("error");
      }
    },
    [field, onChange]
  );

  // ── Upload ──────────────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = ""; // allow re-selection of same file
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        await runOcr(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    [runOcr]
  );

  // ── Camera ──────────────────────────────────────────────────────────────────

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    dialogRef.current?.close();
  }, []);

  const openCamera = useCallback(async () => {
    setCameraOpen(true);
    dialogRef.current?.showModal();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setOcrError("Camera access denied.");
      closeCamera();
    }
  }, [closeCamera]);

  const capturePhoto = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    closeCamera();
    await runOcr(dataUrl);
  }, [closeCamera, runOcr]);

  const isLoading = ocrStatus === "loading";

  return (
    <div>
      {/* Label */}
      <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-blue-600">*</span>}
      </label>

      {/* Input row */}
      <div className="relative mt-1">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Type or scan…"}
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 pr-14 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white"
        />

        {/* Action buttons — right-inset */}
        <div className="absolute inset-y-0 right-2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 size={15} className="animate-spin text-blue-500" />
          ) : (
            <>
              {hasCamera && (
                <button
                  type="button"
                  onClick={openCamera}
                  title={`Capture ${label} with camera`}
                  className="rounded p-1 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <Camera size={14} />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={`Upload image for ${label}`}
                className="rounded p-1 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
              >
                <Upload size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline error */}
      {ocrStatus === "error" && ocrError && (
        <p className="mt-1 text-xs text-red-500">{ocrError}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* Camera modal */}
      {cameraOpen && (
        <dialog
          ref={dialogRef}
          className="m-auto w-full max-w-lg rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/60"
          onClose={closeCamera}
        >
          <div className="overflow-hidden rounded-2xl bg-white">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-700">
                Point at the{" "}
                <span className="font-bold text-blue-600">{label}</span> on the
                nameplate
              </p>
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video preview */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full bg-black object-cover"
            />

            {/* Footer */}
            <div className="flex justify-center gap-3 p-4">
              <button
                type="button"
                onClick={closeCamera}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95"
              >
                <Camera size={15} />
                Capture &amp; Extract
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
