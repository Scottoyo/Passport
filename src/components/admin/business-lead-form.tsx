"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBusinessLead } from "@/app/admin/business-leads/new/actions";
import { updateBusinessLead } from "@/app/admin/business-leads/[leadId]/actions";
import type { BusinessLead, BusinessLeadDisposition, PassportArea, State } from "@/lib/types/domain";
import { buttonClasses } from "@/lib/ui-classes";

interface StateWithAreas {
  state: State;
  areas: PassportArea[];
}

const inputClass = "w-full rounded-lg border border-border px-3 py-2 text-sm";
const errorClass = "mt-1 text-xs text-error";

const DISPOSITIONS: { value: BusinessLeadDisposition; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed_won", label: "Closed Won" },
  { value: "lost", label: "Lost" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function BusinessLeadForm({
  mode,
  leadId,
  statesWithAreas,
  initialValues,
}: {
  mode: "create" | "edit";
  leadId?: string;
  statesWithAreas: StateWithAreas[];
  initialValues?: BusinessLead;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const [stateId, setStateId] = useState(initialValues?.state_id ?? "");
  const [areaId, setAreaId] = useState(initialValues?.passport_area_id ?? "");
  const [businessName, setBusinessName] = useState(initialValues?.business_name ?? "");
  const [email, setEmail] = useState(initialValues?.email ?? "");

  const areasForSelectedState = useMemo(
    () => statesWithAreas.find((s) => s.state.id === stateId)?.areas ?? [],
    [statesWithAreas, stateId]
  );

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!businessName.trim()) errors.business_name = "Business name is required.";
    if (!stateId) errors.state_id = "State is required.";
    if (!areaId) errors.passport_area_id = "Region is required.";
    if (email.trim() && !EMAIL_RE.test(email.trim())) errors.email = "Enter a valid email address.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return; // prevent duplicate submission
    setError(null);
    if (!validate()) return;

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result =
        mode === "create" ? await createBusinessLead(formData) : await updateBusinessLead(leadId!, formData);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      setDirty(false);
      if ("leadId" in result) {
        router.push(`/admin/business-leads/${result.leadId}`);
      } else {
        router.push(`/admin/business-leads/${leadId}`);
        router.refresh();
      }
    });
  }

  function handleCancel() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    router.back();
  }

  return (
    <form onSubmit={handleSubmit} onChange={markDirty} className="space-y-8">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Location</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">State</span>
            <select
              name="state_id"
              value={stateId}
              onChange={(e) => {
                setStateId(e.target.value);
                setAreaId("");
              }}
              className={inputClass}
            >
              <option value="">Select a state</option>
              {statesWithAreas.map(({ state }) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))}
            </select>
            {fieldErrors.state_id && <p className={errorClass}>{fieldErrors.state_id}</p>}
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Region / Passport Area</span>
            <select
              name="passport_area_id"
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              disabled={!stateId}
              className={`${inputClass} disabled:opacity-50`}
            >
              <option value="">Select a region</option>
              {areasForSelectedState.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
            {fieldErrors.passport_area_id && <p className={errorClass}>{fieldErrors.passport_area_id}</p>}
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Business</h2>
        <label className="mt-4 block text-sm">
          <span className="mb-1 block text-ink-muted">Business name</span>
          <input
            name="business_name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={inputClass}
          />
          {fieldErrors.business_name && <p className={errorClass}>{fieldErrors.business_name}</p>}
        </label>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Primary contact</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">First name</span>
            <input name="contact_first_name" defaultValue={initialValues?.contact_first_name ?? ""} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Last name</span>
            <input name="contact_last_name" defaultValue={initialValues?.contact_last_name ?? ""} className={inputClass} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Phone</span>
            <input
              name="phone"
              type="tel"
              placeholder="123-456-7890"
              defaultValue={initialValues?.phone ?? ""}
              className={inputClass}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-ink-muted">Email</span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            {fieldErrors.email && <p className={errorClass}>{fieldErrors.email}</p>}
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Lead status</h2>
        <label className="mt-4 block max-w-xs text-sm">
          <span className="mb-1 block text-ink-muted">Disposition</span>
          <select name="disposition" defaultValue={initialValues?.disposition ?? "lead"} className={inputClass}>
            {DISPOSITIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Contact activity</h2>
        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="emailed" defaultChecked={initialValues?.emailed ?? false} />
            Emailed
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="called" defaultChecked={initialValues?.called ?? false} />
            Called
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="visited" defaultChecked={initialValues?.visited ?? false} />
            Visited
          </label>
        </div>
      </section>

      {mode === "create" && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">Initial note (optional)</h2>
          <textarea
            name="note"
            rows={3}
            placeholder="Anything worth recording about this first contact..."
            className={`${inputClass} mt-4`}
          />
        </section>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={isPending} className={buttonClasses("primary")}>
          {isPending ? "Saving..." : mode === "create" ? "Add Lead" : "Save Changes"}
        </button>
        <button type="button" onClick={handleCancel} className={buttonClasses("outline")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
