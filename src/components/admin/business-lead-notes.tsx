import { addBusinessLeadNote } from "@/app/admin/business-leads/[leadId]/actions";
import type { BusinessLeadNoteRow } from "@/lib/business-leads-queries";

// Server-rendered: notes are already sorted reverse-chronological by
// getBusinessLeadNotes, and adding one just re-submits a plain form to a
// Server Action + revalidatePath - no client JS needed, matching this
// app's default (client components only where genuinely required).
export function BusinessLeadNotes({ leadId, notes }: { leadId: string; notes: BusinessLeadNoteRow[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 p-6">
      <h2 className="font-semibold text-slate-900">Notes</h2>

      <form action={addBusinessLeadNote.bind(null, leadId)} className="mt-4">
        <label className="sr-only" htmlFor="note">
          Add a note
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          required
          placeholder="Add a note about this lead..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="mt-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Add Note
        </button>
      </form>

      <ul className="mt-6 space-y-4 border-t border-slate-100 pt-4">
        {notes.length === 0 ? (
          <li className="text-sm text-slate-500">No notes yet.</li>
        ) : (
          notes.map((note) => (
            <li key={note.id} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
              <p className="whitespace-pre-wrap text-sm text-slate-800">{note.note}</p>
              <p className="mt-1 text-xs text-slate-500">
                {note.author?.full_name || note.author?.email || "Unknown"} &middot;{" "}
                {new Date(note.created_at).toLocaleString()}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
