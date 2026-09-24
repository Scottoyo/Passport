"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buttonClasses } from "@/lib/ui-classes";

const VIEW_WIDTH = 320;

interface Props {
  file: File;
  aspect: number; // width / height
  outputWidth: number;
  outputHeight: number;
  shape: "circle" | "rect";
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}

// A dependency-free drag-to-pan / slider-to-zoom cropper: the image is
// rendered at (at least) "cover" scale inside a fixed viewport, dragging
// pans it, and confirming reads the currently-visible viewport rect back
// out in the image's own natural-pixel coordinates onto an offscreen
// canvas. No crop library needed for a single fixed-aspect crop like this.
export function ImageCropper({ file, aspect, outputWidth, outputHeight, shape, onCancel, onConfirm }: Props) {
  const viewHeight = VIEW_WIDTH / aspect;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const imgUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [coverScale, setCoverScale] = useState(1);
  const [zoomFactor, setZoomFactor] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(imgUrl);
  }, [imgUrl]);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function clamp(x: number, y: number, scale: number, dims: { w: number; h: number }) {
    const renderedW = dims.w * scale;
    const renderedH = dims.h * scale;
    const minX = Math.min(0, VIEW_WIDTH - renderedW);
    const minY = Math.min(0, viewHeight - renderedH);
    return { x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
  }

  function handleImageLoad() {
    const el = imgRef.current;
    if (!el) return;
    const dims = { w: el.naturalWidth, h: el.naturalHeight };
    const scale = Math.max(VIEW_WIDTH / dims.w, viewHeight / dims.h);
    setNatural(dims);
    setCoverScale(scale);
    setZoomFactor(1);
    const renderedW = dims.w * scale;
    const renderedH = dims.h * scale;
    setOffset({ x: (VIEW_WIDTH - renderedW) / 2, y: (viewHeight - renderedH) / 2 });
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, offsetX: offset.x, offsetY: offset.y };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current || !natural) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    const scale = coverScale * zoomFactor;
    setOffset(clamp(dragRef.current.offsetX + dx, dragRef.current.offsetY + dy, scale, natural));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handleZoom(next: number) {
    if (!natural) return;
    setZoomFactor(next);
    const scale = coverScale * next;
    setOffset((prev) => clamp(prev.x, prev.y, scale, natural));
  }

  function handleConfirm() {
    if (!natural || !imgRef.current) return;
    const scale = coverScale * zoomFactor;
    const sx = -offset.x / scale;
    const sy = -offset.y / scale;
    const sw = VIEW_WIDTH / scale;
    const sh = viewHeight / scale;

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/png"
    );
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="max-w-[90vw] rounded-2xl border border-border bg-surface p-5 backdrop:bg-ink/70"
      aria-label="Crop image"
    >
      <p className="mb-3 text-sm font-medium text-ink">Drag to reposition, use the slider to zoom</p>
      <div
        className={`relative touch-none overflow-hidden bg-surface-elevated ${shape === "circle" ? "rounded-full" : "rounded-xl"}`}
        style={{ width: VIEW_WIDTH, height: viewHeight }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imgUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={imgUrl}
            alt=""
            onLoad={handleImageLoad}
            draggable={false}
            className="absolute left-0 top-0 max-w-none select-none"
            style={{
              width: natural ? natural.w * coverScale * zoomFactor : undefined,
              height: natural ? natural.h * coverScale * zoomFactor : undefined,
              transform: `translate(${offset.x}px, ${offset.y}px)`,
            }}
          />
        )}
      </div>
      <input
        type="range"
        min={1}
        max={3}
        step={0.01}
        value={zoomFactor}
        onChange={(e) => handleZoom(Number(e.target.value))}
        className="mt-3 w-full"
        style={{ width: VIEW_WIDTH }}
        aria-label="Zoom"
      />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={buttonClasses("outline", "sm")}>
          Cancel
        </button>
        <button type="button" onClick={handleConfirm} className={buttonClasses("primary", "sm")}>
          Use Photo
        </button>
      </div>
    </dialog>
  );
}
