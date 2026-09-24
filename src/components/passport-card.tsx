"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { buttonClasses } from "@/lib/ui-classes";
import { ImageCropper } from "@/components/image-cropper";
import { PassportHolderPlaceholderIcon } from "@/components/passport-holder-placeholder-icon";
import { renderPassportCardToBlob } from "@/lib/passport-card-canvas";

export type MediaActionResult = { ok: true } | { ok: false; error: string };
type FormAction = (prevState: MediaActionResult | null, formData: FormData) => Promise<MediaActionResult>;

const INITIAL_STATE: MediaActionResult | null = null;

// A single card-shaped visual that toggles between two modes rather than
// ever showing two card previews at once: "edit" (the live DOM card - real
// Tailwind brand-* classes, which already reflect this page's resolved
// region theme via CSS custom properties the root layout sets on <body> -
// plus the upload/crop/remove controls) and "share" (the actual generated
// PNG from src/lib/passport-card-canvas.ts, which IS the file that gets
// shared/downloaded - swapped in in the same slot once generated).
export function PassportCard({
  holderFirstName,
  title,
  heroImageUrl,
  photoUrl,
  uploadAction,
  clearAction,
}: {
  holderFirstName: string;
  title: string;
  heroImageUrl: string | null;
  photoUrl: string | null;
  uploadAction: FormAction;
  clearAction: FormAction;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);
  const [shareBlob, setShareBlob] = useState<Blob | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);

  // A successful upload clears the local "not yet saved" preview right from
  // the action itself (not a useEffect reacting to the result) - the
  // parent's revalidated `photoUrl` prop takes over from here. Same pattern
  // as business media's ImageSlot.
  const [uploadState, uploadFormAction] = useActionState(async (prevState: MediaActionResult | null, formData: FormData) => {
    const result = await uploadAction(prevState, formData);
    if (result.ok) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      formRef.current?.reset();
    }
    return result;
  }, INITIAL_STATE);
  const [clearState, clearFormAction] = useActionState(clearAction, INITIAL_STATE);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (shareImageUrl) URL.revokeObjectURL(shareImageUrl);
    };
  }, [shareImageUrl]);

  function handleCropConfirm(blob: Blob) {
    const file = new File([blob], "passport-photo.png", { type: "image/png" });
    const dt = new DataTransfer();
    dt.items.add(file);
    if (fileInputRef.current) fileInputRef.current.files = dt.files;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    setCropFile(null);
    formRef.current?.requestSubmit();
  }

  function handleCropCancel() {
    setCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerateShare() {
    setIsGenerating(true);
    setShareError(null);
    try {
      const body = getComputedStyle(document.body);
      const primaryColor = body.getPropertyValue("--brand-primary").trim() || "#073451";
      const primaryDarkColor = body.getPropertyValue("--brand-primary-dark").trim() || "#05263d";
      const accentColor = body.getPropertyValue("--brand-accent").trim() || "#f04a1d";

      const blob = await renderPassportCardToBlob({
        holderFirstName,
        title,
        photoUrl,
        heroImageUrl,
        primaryColor,
        primaryDarkColor,
        accentColor,
      });

      setShareImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setShareBlob(blob);

      const file = new File([blob], "my-passport.png", { type: "image/png" });
      setCanShareFiles(Boolean(navigator.canShare?.({ files: [file] })));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Couldn't generate the image.";
      setShareError(
        message.toLowerCase().includes("security")
          ? "Couldn't generate your Passport image right now - please try again shortly."
          : message
      );
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleNativeShare() {
    if (!shareBlob) return;
    const file = new File([shareBlob], "my-passport.png", { type: "image/png" });
    try {
      await navigator.share({ files: [file], title: "My Local Perks Passport" });
    } catch {
      // Cancelled or unsupported mid-flight - Download stays available.
    }
  }

  function handleBackToEdit() {
    setShareImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setShareBlob(null);
    setShareError(null);
  }

  const displayUrl = previewUrl ?? photoUrl;

  return (
    <div>
      <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-2xl shadow-lg">
        {shareImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shareImageUrl}
            alt={`${holderFirstName}'s Local Perks Passport card`}
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            {heroImageUrl ? (
              <Image src={heroImageUrl} alt="" fill className="object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-primary-dark" />
            )}
            {/* Legibility overlay - a uniform tint plus an extra bottom-heavy
                gradient for the footer band, stronger than
                RegionHeroBanner's bottom-only scrim since this card carries
                text top-to-bottom, not just bottom CTAs over otherwise-clean
                photography. */}
            <div className="absolute inset-0 bg-brand-primary-dark/40" />
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-brand-primary-dark/90 to-transparent" />

            <div className="relative flex h-full flex-col items-center px-6 py-8 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Local Perks Passport</p>
              <div className="mt-2 h-0.5 w-10 bg-brand-accent" />

              <div className="mt-8 flex h-32 w-32 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-lg sm:h-36 sm:w-36">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface-elevated">
                  {displayUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayUrl}
                      alt={`${holderFirstName}'s Passport photo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PassportHolderPlaceholderIcon className="h-12 w-12 text-ink-muted/40" />
                  )}
                </div>
              </div>

              <h1 className="font-display mt-6 text-2xl font-bold sm:text-3xl">{title}</h1>

              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-white/70">Passport Holder</p>
              <p className="font-display text-xl font-semibold sm:text-2xl">{holderFirstName}</p>

              <div className="mt-auto pt-6 text-[11px] leading-snug text-white/80">
                <p>Nationwide savings at local restaurants, attractions &amp; shops</p>
                <p className="mt-0.5 font-medium">localperkspassport.com</p>
              </div>
            </div>
          </>
        )}
      </div>

      {shareImageUrl ? (
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            {canShareFiles && (
              <button type="button" onClick={handleNativeShare} className={buttonClasses("primary", "sm")}>
                Share
              </button>
            )}
            <a href={shareImageUrl} download="my-passport.png" className={buttonClasses("outline", "sm")}>
              Download Image
            </a>
            <button type="button" onClick={handleBackToEdit} className={buttonClasses("ghost", "sm")}>
              Edit Photo
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <form ref={formRef} action={uploadFormAction}>
              <label className={`${buttonClasses("outline", "sm")} cursor-pointer`}>
                {photoUrl ? "Replace Photo" : "Upload Photo"}
                <input
                  ref={fileInputRef}
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCropFile(file);
                  }}
                />
              </label>
            </form>
            {photoUrl && (
              <form action={clearFormAction}>
                <button type="submit" className={buttonClasses("danger", "sm")}>
                  Remove Photo
                </button>
              </form>
            )}
          </div>
          {uploadState && !uploadState.ok && <p className="mt-1 text-xs font-medium text-error">{uploadState.error}</p>}
          {clearState && !clearState.ok && <p className="mt-1 text-xs font-medium text-error">{clearState.error}</p>}

          <div className="mt-4">
            <button
              type="button"
              onClick={handleGenerateShare}
              disabled={isGenerating}
              className={buttonClasses("primary")}
            >
              {isGenerating ? "Generating…" : "Share My Passport"}
            </button>
            {shareError && <p className="mt-2 text-sm font-medium text-error">{shareError}</p>}
          </div>
        </>
      )}

      {cropFile && (
        <ImageCropper
          file={cropFile}
          aspect={1}
          outputWidth={600}
          outputHeight={600}
          shape="circle"
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
