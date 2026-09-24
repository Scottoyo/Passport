"use client";

import { useEffect, useState } from "react";
import { buttonClasses } from "@/lib/ui-classes";
import { renderPassportCardToBlob } from "@/lib/passport-card-canvas";

export function ShareMyPassportCardButton({
  holderFirstName,
  title,
  photoUrl,
  heroImageUrl,
}: {
  holderFirstName: string;
  title: string;
  photoUrl: string | null;
  heroImageUrl: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);
    try {
      const body = getComputedStyle(document.body);
      const primaryColor = body.getPropertyValue("--brand-primary").trim() || "#073451";
      const primaryDarkColor = body.getPropertyValue("--brand-primary-dark").trim() || "#05263d";
      const accentColor = body.getPropertyValue("--brand-accent").trim() || "#f04a1d";

      const newBlob = await renderPassportCardToBlob({
        holderFirstName,
        title,
        photoUrl,
        heroImageUrl,
        primaryColor,
        primaryDarkColor,
        accentColor,
      });

      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(newBlob);
      });
      setBlob(newBlob);

      const file = new File([newBlob], "my-passport.png", { type: "image/png" });
      setCanShareFiles(Boolean(navigator.canShare?.({ files: [file] })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't generate the image.";
      setError(
        message.toLowerCase().includes("security")
          ? "Couldn't generate your Passport image right now - please try again shortly."
          : message
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleShare() {
    if (!blob) return;
    const file = new File([blob], "my-passport.png", { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: "My Local Perks Passport" });
    } catch {
      // Cancelled or unsupported mid-flight - Download stays available below.
    }
  }

  return (
    <div>
      <button type="button" onClick={handleGenerate} disabled={isGenerating} className={buttonClasses("primary")}>
        {isGenerating ? "Generating…" : "Share My Passport"}
      </button>
      {error && <p className="mt-2 text-sm font-medium text-error">{error}</p>}
      {previewUrl && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium text-ink-muted">
            This is exactly what will be shared or downloaded.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt={`${holderFirstName}'s Local Perks Passport card`}
            className="w-full max-w-xs rounded-2xl border border-border"
          />
          <div className="mt-3 flex flex-wrap gap-3">
            {canShareFiles && (
              <button type="button" onClick={handleShare} className={buttonClasses("primary", "sm")}>
                Share
              </button>
            )}
            <a href={previewUrl} download="my-passport.png" className={buttonClasses("outline", "sm")}>
              Download Image
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
