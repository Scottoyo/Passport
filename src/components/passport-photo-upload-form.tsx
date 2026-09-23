"use client";

import { useRef } from "react";
import { buttonClasses } from "@/lib/ui-classes";

// Same shape as the business Logo/Cover upload slots
// (src/components/business/media-editor.tsx's ImageSlot): a styled label
// wrapping a hidden file input, picking a file auto-submits - no separate
// "Choose File" native control and no second submit button needed for a
// single-field form like this one.
export function PassportPhotoUploadForm({
  action,
  hasPhoto,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hasPhoto: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      <label className={`${buttonClasses("outline", "sm")} cursor-pointer`}>
        {hasPhoto ? "Replace Photo" : "Upload Photo"}
        <input
          type="file"
          name="photo"
          accept="image/*"
          required
          className="sr-only"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
    </form>
  );
}
