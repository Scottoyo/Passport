"use client";

import { useState } from "react";
import Link from "next/link";

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
            : "border-slate-200 bg-white/90 text-slate-500 hover:text-red-500"
        }`
      : isFavorited
        ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        : "rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500";

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Save this to your favorites</h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Create a free profile or get a Passport to start saving your favorite businesses.
            </p>
            <div className="mt-5 space-y-2">
              <Link
                href={passportHref}
                className="block w-full rounded-full bg-slate-900 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-slate-700"
              >
                Get a Passport
              </Link>
              <Link
                href="/create-profile"
                className="block w-full rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:border-slate-500"
              >
                Create a Profile
              </Link>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="block w-full rounded-full px-4 py-2 text-center text-sm font-semibold text-slate-500 hover:text-slate-700"
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
