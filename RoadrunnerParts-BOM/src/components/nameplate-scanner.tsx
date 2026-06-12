"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Upload, X } from "lucide-react";

type OcrStatus = "idle" | "loading" | "error";

export type ScannerResult = {
  brand: string;
  model: string;
  serial: string;
};

type Props = {
  onSuccess: (result: ScannerResult) => void;
};

export function NameplateScanner({ onSuccess }: Props) {
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
          body: JSON.stringify({ image: dataUrl }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as ScannerResult;
        onSuccess(data);
        setOcrStatus("idle");
      } catch (err) {
        setOcrError(err instanceof Error ? err.message : "OCR failed");
        setOcrStatus("error");
      }
    },
    [onSuccess]
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
    <div className="mb-4 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-4 transition-colors hover:bg-blue-50">
      <div className="flex flex-col items-center justify-center gap-3 text-center sm:flex-row sm:text-left">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-blue-900">Scan Nameplate</h3>
          <p className="mt-0.5 text-xs text-blue-700/80">
            Automatically extract Brand, Model, and Serial Number from a photo.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600">
              <Loader2 size={16} className="animate-spin" />
              Scanning...
            </div>
          ) : (
            <>
              {hasCamera && (
                <button
                  type="button"
                  onClick={openCamera}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 transition hover:bg-blue-50 active:scale-95"
                >
                  <Camera size={16} />
                  Camera
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-inset ring-blue-200 transition hover:bg-blue-50 active:scale-95"
              >
                <Upload size={16} />
                Upload
              </button>
            </>
          )}
        </div>
      </div>

      {ocrStatus === "error" && ocrError && (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-center text-xs font-medium text-red-600">
          {ocrError}
        </p>
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
                Point at the <span className="font-bold text-blue-600">nameplate</span>
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
