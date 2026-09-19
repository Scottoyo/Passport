"use client";

import { useState } from "react";
import Link from "next/link";

export function FavoriteButton({
  isSignedIn,
  isFavorited,
  toggleAction,
  passportHref,
}: {
  isSignedIn: boolean;
  isFavorited: boolean;
  toggleAction: () => Promise<void>;
  passportHref: string;
}) {
  const [showModal, setShowModal] = useState(false);

  const buttonClass = isFavorited
    ? "rounded-full bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
    : "rounded-full border border-slate-300 px-4 py-1.5 text-sm font-semibold text-slate-700 hover:border-slate-500";

  if (isSignedIn) {
    return (
      <form action={toggleAction}>
        <button className={buttonClass}>{isFavorited ? "Favorited ★" : "Favorite"}</button>
      </form>
    );
  }

  return (
    <>
      <button type="button" className={buttonClass} onClick={() => setShowModal(true)}>
        Favorite
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
