"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses, type ButtonVariant, type ButtonSize } from "@/lib/ui-classes";

// A drop-in replacement for a plain <button type="submit"> inside a <form
// action={serverAction}>, for the many forms in this app whose action just
// throws on failure and returns void on success (no useActionState, no
// discriminated result to render). There's nothing to read a "did it
// work" signal from, but there's also nothing TO read if it silently
// failed - a throw from a plain form action replaces this component's
// whole subtree with the nearest error boundary, so this button only ever
// gets to render its "Saved" state when the submission actually
// completed. Reaching "Saved" is itself the success signal.
export function SaveButton({
  children = "Save",
  variant = "primary",
  size = "md",
}: {
  children?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const { pending } = useFormStatus();
  const [prevPending, setPrevPending] = useState(pending);
  const [justSaved, setJustSaved] = useState(false);

  // Adjusting state during render (not in an effect) when a prop/derived
  // value changes - the pattern React's own docs recommend for "did this
  // value just change" without an extra render-triggering effect.
  if (pending !== prevPending) {
    setPrevPending(pending);
    if (prevPending && !pending) setJustSaved(true);
  }

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setJustSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [justSaved]);

  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, size)}>
      {pending ? "Saving…" : justSaved ? "Saved ✓" : children}
    </button>
  );
}
