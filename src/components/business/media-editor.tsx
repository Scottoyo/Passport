"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/lib/ui-classes";
import { BusinessPlaceholderIcon } from "./business-placeholder-icon";
import type { BusinessMedia } from "@/lib/types/domain";

export type MediaActionResult = { ok: true } | { ok: false; error: string };
type FormAction = (prevState: MediaActionResult | null, formData: FormData) => Promise<MediaActionResult>;

const INITIAL_STATE: MediaActionResult | null = null;

function SubmitButton({ children, variant = "outline" as const }: { children: React.ReactNode; variant?: "outline" | "danger" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, "sm")}>
      {pending ? "Saving…" : children}
    </button>
  );
}

function ResultMessage({ result }: { result: MediaActionResult | null }) {
  if (!result) return null;
  if (result.ok) return <p className="mt-1 text-xs font-medium text-success">Saved.</p>;
  return <p className="mt-1 text-xs font-medium text-error">{result.error}</p>;
}

// Logo and cover share this exact shape: preview (saved image, or the
// not-yet-uploaded file the user just picked), an Upload form, and a Remove
// form - the only differences are the field name, image dimensions, and
// which bound actions get passed in.
function ImageSlot({
  label,
  hint,
  fieldName,
  currentUrl,
  shapeClassName,
  uploadAction,
  clearAction,
  onPendingChange,
}: {
  label: string;
  hint: string;
  fieldName: string;
  currentUrl: string | null;
  shapeClassName: string;
  uploadAction: FormAction;
  clearAction: FormAction;
  onPendingChange: (pending: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // A successful upload clears the local "not yet saved" preview right from
  // the action itself (not a useEffect reacting to the result) - the
  // parent's revalidated `currentUrl` prop takes over from here.
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
    onPendingChange(Boolean(previewUrl));
  }, [previewUrl, onPendingChange]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const displayUrl = previewUrl ?? currentUrl;

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{label}</p>
      <p className="mb-2 text-xs text-ink-muted">{hint}</p>
      <div className={`mb-2 overflow-hidden bg-surface-elevated ${shapeClassName}`}>
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-muted/40">
            <BusinessPlaceholderIcon className="h-8 w-8" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <form
          ref={formRef}
          action={uploadFormAction}
          onSubmit={(e) => {
            if (!formRef.current?.[fieldName]?.value) e.preventDefault();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="file"
            name={fieldName}
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (previewUrl) URL.revokeObjectURL(previewUrl);
              setPreviewUrl(file ? URL.createObjectURL(file) : null);
            }}
          />
          <SubmitButton>{currentUrl ? "Replace" : "Upload"}</SubmitButton>
        </form>
        {currentUrl && (
          <form action={clearFormAction}>
            <SubmitButton variant="danger">Remove</SubmitButton>
          </form>
        )}
      </div>
      <ResultMessage result={uploadState} />
      <ResultMessage result={clearState} />
    </div>
  );
}

function GalleryItem({
  item,
  index,
  count,
  removeAction,
  updateAltAction,
  onMove,
}: {
  item: BusinessMedia;
  index: number;
  count: number;
  removeAction: FormAction;
  updateAltAction: FormAction;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  const [removeState, removeFormAction] = useActionState(removeAction, INITIAL_STATE);
  const [altState, altFormAction] = useActionState(updateAltAction, INITIAL_STATE);

  return (
    <div className="flex gap-3 rounded-lg border border-border p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.url} alt={item.alt_text ?? ""} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      <div className="min-w-0 flex-1">
        <form
          action={altFormAction}
          onBlur={(e) => e.currentTarget.requestSubmit()}
          className="flex flex-col gap-1"
        >
          <input type="hidden" name="media_id" value={item.id} />
          <label className="text-xs text-ink-muted" htmlFor={`alt-${item.id}`}>
            Alt text
          </label>
          <input
            id={`alt-${item.id}`}
            name="alt_text"
            defaultValue={item.alt_text ?? ""}
            placeholder="Describe this image"
            className="rounded-md border border-border px-2 py-1 text-sm"
          />
        </form>
        <ResultMessage result={altState} />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className={buttonClasses("ghost", "sm")}
            aria-label="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === count - 1}
            className={buttonClasses("ghost", "sm")}
            aria-label="Move down"
          >
            ↓
          </button>
          <form action={removeFormAction}>
            <input type="hidden" name="media_id" value={item.id} />
            <SubmitButton variant="danger">Delete</SubmitButton>
          </form>
        </div>
        <ResultMessage result={removeState} />
      </div>
    </div>
  );
}

export function BusinessMediaEditor({
  logoUrl,
  coverUrl,
  media,
  uploadLogo,
  uploadCover,
  clearLogo,
  clearCover,
  addGalleryImage,
  removeGalleryImage,
  updateGalleryImageAlt,
  reorderGalleryImages,
}: {
  logoUrl: string | null;
  coverUrl: string | null;
  media: BusinessMedia[];
  uploadLogo: FormAction;
  uploadCover: FormAction;
  clearLogo: FormAction;
  clearCover: FormAction;
  addGalleryImage: FormAction;
  removeGalleryImage: FormAction;
  updateGalleryImageAlt: FormAction;
  reorderGalleryImages: (orderedMediaIds: string[]) => Promise<MediaActionResult>;
}) {
  const [galleryPreview, setGalleryPreview] = useState<string | null>(null);
  const addFormRef = useRef<HTMLFormElement>(null);
  const pendingSlots = useRef(new Set<string>());

  // A successful add clears the local "not yet saved" preview right from
  // the action itself, same reasoning as ImageSlot above.
  const [addState, addFormAction] = useActionState(async (prevState: MediaActionResult | null, formData: FormData) => {
    const result = await addGalleryImage(prevState, formData);
    if (result.ok) {
      setGalleryPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      addFormRef.current?.reset();
    }
    return result;
  }, INITIAL_STATE);

  // Optimistic, not a useState-synced-to-a-prop-via-effect: rebases on
  // `media` automatically whenever there's no pending reorder in flight, so
  // a server revalidation after a drag/drop naturally becomes the new
  // source of truth with no manual sync needed.
  const [optimisticOrder, setOptimisticOrder] = useOptimistic(media.map((m) => m.id));
  const [, startReorder] = useTransition();

  useEffect(() => {
    const hasPending = pendingSlots.current.size > 0 || Boolean(galleryPreview);
    const handler = (e: BeforeUnloadEvent) => {
      if (hasPending) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [galleryPreview]);

  const orderedMedia = optimisticOrder
    .map((id) => media.find((m) => m.id === id))
    .filter((m): m is BusinessMedia => Boolean(m));

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= optimisticOrder.length) return;
    const next = [...optimisticOrder];
    [next[index], next[target]] = [next[target], next[index]];
    startReorder(async () => {
      setOptimisticOrder(next);
      await reorderGalleryImages(next);
    });
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <ImageSlot
          label="Profile Picture / Logo"
          hint="Square image, at least 200×200px."
          fieldName="logo"
          currentUrl={logoUrl}
          shapeClassName="h-32 w-32 rounded-full"
          uploadAction={uploadLogo}
          clearAction={clearLogo}
          onPendingChange={(p) => (p ? pendingSlots.current.add("logo") : pendingSlots.current.delete("logo"))}
        />
        <ImageSlot
          label="Banner / Cover Image"
          hint="Wide landscape image, at least 1200×450px (4:3 tiles crop the center)."
          fieldName="cover"
          currentUrl={coverUrl}
          shapeClassName="h-32 w-full rounded-xl"
          uploadAction={uploadCover}
          clearAction={clearCover}
          onPendingChange={(p) => (p ? pendingSlots.current.add("cover") : pendingSlots.current.delete("cover"))}
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-ink">Media Gallery</p>
        <div className="space-y-3">
          {orderedMedia.map((item, index) => (
            <GalleryItem
              key={item.id}
              item={item}
              index={index}
              count={orderedMedia.length}
              removeAction={removeGalleryImage}
              updateAltAction={updateGalleryImageAlt}
              onMove={handleMove}
            />
          ))}
          {orderedMedia.length === 0 && <p className="text-sm text-ink-muted">No gallery images yet.</p>}
        </div>
        <form
          ref={addFormRef}
          action={addFormAction}
          onSubmit={(e) => {
            if (!addFormRef.current?.gallery?.value) e.preventDefault();
          }}
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <input
            type="file"
            name="gallery"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (galleryPreview) URL.revokeObjectURL(galleryPreview);
              setGalleryPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          <input
            type="text"
            name="alt_text"
            placeholder="Alt text (optional)"
            className="rounded-md border border-border px-2 py-1 text-sm"
          />
          <SubmitButton>Add to gallery</SubmitButton>
        </form>
        {galleryPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={galleryPreview} alt="" className="mt-2 h-20 w-20 rounded-lg object-cover" />
        )}
        <ResultMessage result={addState} />
      </div>
    </div>
  );
}
