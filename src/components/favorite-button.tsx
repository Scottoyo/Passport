"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClasses, cardClasses } from "@/lib/ui-classes";

export function FavoriteButton({
  isSignedIn,
  isFavorited,
  toggleAction,
  passportHref,
  variant = "pill",
}: {
  isSignedIn: boolean;
  isFavorited: boolean;
  toggleAction: () => Promise<void>;
  passportHref: string;
  variant?: "pill" | "icon";
}) {
  const [showModal, setShowModal] = useState(false);

  const buttonClass =
    variant === "icon"
      ? `flex h-9 w-9 items-center justify-center rounded-full border shadow-sm ${
          isFavorited
            ? "border-red-200 bg-white text-red-500"
            : "border-border bg-white/90 text-ink-muted hover:text-red-500"
        }`
      : isFavorited
        ? buttonClasses("primary", "sm")
        : buttonClasses("outline", "sm");

  const label = variant === "icon" ? null : isFavorited ? "Favorited ★" : "Favorite";
  const icon =
    variant === "icon" ? (
      <HeartIcon filled={isFavorited} />
    ) : null;

  if (isSignedIn) {
    return (
      <form action={toggleAction}>
        <button type="submit" className={buttonClass} aria-label={isFavorited ? "Remove favorite" : "Add favorite"}>
          {icon}
          {label}
        </button>
      </form>
    );
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        aria-label={isFavorited ? "Remove favorite" : "Add favorite"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
      >
        {icon}
        {label}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className={`w-full max-w-sm p-6 shadow-xl ${cardClasses()}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-ink">Save this to your favorites</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="text-ink-muted hover:text-ink"
              >
                &times;
              </button>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Create a free profile or get a Passport to start saving your favorite businesses.
            </p>
            <div className="mt-5 space-y-2">
              <Link href={passportHref} className={`w-full ${buttonClasses("primary")}`}>
                Get a Passport
              </Link>
              <Link href="/create-profile" className={`w-full ${buttonClasses("outline")}`}>
                Create a Profile
              </Link>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`w-full ${buttonClasses("ghost")}`}
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
      className="h-4 w-4"
      aria-hidden
    >
      <path
        d="M10 17.5s-6.5-4.06-6.5-8.5A3.75 3.75 0 0 1 10 6.5 3.75 3.75 0 0 1 16.5 9c0 4.44-6.5 8.5-6.5 8.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
