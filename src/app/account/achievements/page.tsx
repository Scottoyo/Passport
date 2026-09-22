import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAchievementProgress } from "@/lib/queries";

export default async function AchievementsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account/achievements");

  const achievements = await getAchievementProgress(user.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">Achievements</h1>
      <p className="mt-1 text-ink-muted">Badges you earn as you explore with your Passport.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {achievements.map((a) => {
          const pct = Math.round((a.current / a.target) * 100);
          return (
            <div key={a.key} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-ink">{a.name}</p>
                {a.unlocked && (
                  <span className="rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success">
                    Unlocked
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-ink-muted">{a.description}</p>
              <div className="mt-3 flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-surface-elevated">
                  <div className="h-1.5 rounded-full bg-brand-primary" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-ink-muted">
                  {a.current} of {a.target}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
