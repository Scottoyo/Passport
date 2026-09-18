"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { registerBusiness } from "@/app/register-business/actions";
import type { PassportArea, State } from "@/lib/types/domain";

interface StateWithAreas {
  state: State;
  areas: PassportArea[];
}

const inputClass = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export function RegisterBusinessForm({
  statesWithAreas,
  initialStateId,
  initialAreaId,
}: {
  statesWithAreas: StateWithAreas[];
  initialStateId: string;
  initialAreaId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ signedIn: boolean } | null>(null);
  const [selectedStateId, setSelectedStateId] = useState(initialStateId);
  const [selectedAreaId, setSelectedAreaId] = useState(initialAreaId);

  const areasForSelectedState = useMemo(
    () => statesWithAreas.find((s) => s.state.id === selectedStateId)?.areas ?? [],
    [statesWithAreas, selectedStateId]
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await registerBusiness(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess({ signedIn: Boolean(result.signedIn) });
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-slate-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-slate-900">Application submitted</h2>
        <p className="mt-2 text-slate-600">
          Your business has been submitted for review. A national, state, or
          regional admin will review it before it goes live.
        </p>
        {success.signedIn ? (
          <button
            onClick={() => router.push("/account")}
            className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Go to my account
          </button>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Check your email to confirm your account before signing in.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Account contact
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Contact first name</span>
            <input name="first_name" required className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Contact last name</span>
            <input name="last_name" required className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Work email</span>
            <input name="work_email" type="email" required className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Phone number</span>
            <input name="contact_phone" type="tel" placeholder="123-456-7890" className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Password</span>
            <input name="password" type="password" required minLength={8} className={inputClass} />
            <span className="mt-1 block text-xs text-slate-400">Must be at least 8 characters.</span>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Confirm password</span>
            <input name="confirm_password" type="password" required minLength={8} className={inputClass} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Business details
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-600">Business name</span>
            <input name="business_name" required className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Business phone</span>
            <input name="business_phone" type="tel" placeholder="123-456-7890" className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Website</span>
            <input name="website" type="url" placeholder="https://" className={inputClass} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-slate-600">Business address</span>
            <input name="address" className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">City</span>
            <input name="city" className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">State</span>
            <input name="state_code" maxLength={2} placeholder="FL" className={`${inputClass} uppercase`} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">ZIP code</span>
            <input name="zip" className={inputClass} />
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-slate-600">State (Passport)</span>
            <select
              name="prefill_state_id"
              value={selectedStateId}
              onChange={(e) => {
                setSelectedStateId(e.target.value);
                setSelectedAreaId("");
              }}
              required
              className={inputClass}
            >
              <option value="">Select a state</option>
              {statesWithAreas.map(({ state }) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-slate-600">Region</span>
            <select
              name="area_id"
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              required
              disabled={!selectedStateId}
              className={inputClass}
            >
              <option value="">Select a region</option>
              {areasForSelectedState.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <label className="flex items-start gap-2 text-sm text-slate-600">
        <input type="checkbox" required className="mt-1" />
        <span>
          I agree to the Terms of Service and Privacy Policy. I authorize
          National Passport to review this business application.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {isPending ? "Creating your account..." : "Create Business Account"}
      </button>
    </form>
  );
}
