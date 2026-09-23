"use client";

import { useRef } from "react";
import { buttonClasses, type ButtonSize } from "@/lib/ui-classes";

// Same shape as the business Logo/Cover upload slots
// (src/components/business/media-editor.tsx's ImageSlot): a styled label
// wrapping a hidden file input, picking a file auto-submits - no separate
// "Choose File" native control and no second submit button needed for a
// single-field form like this one.
export function SingleFileUploadForm({
  action,
  fieldName,
  label,
  size = "md",
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  fieldName: string;
  label: string;
  size?: ButtonSize;
  className?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className={className}>
      <label className={`${buttonClasses("outline", size)} cursor-pointer`}>
        {label}
        <input
          type="file"
          name={fieldName}
          accept="image/*"
          required
          className="sr-only"
          onChange={() => formRef.current?.requestSubmit()}
        />
      </label>
    </form>
  );
}
