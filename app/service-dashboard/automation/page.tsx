import Link from "next/link";
import { AppShell, SectionCard } from "@/components/shell";
import { getShoppingAutomationSummary } from "@/lib/shopping-automation";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export default async function AutomationPage() {
  const summary = await getShoppingAutomationSummary();

  return (
    <AppShell
      title="Automation & Integrations"
      eyebrow="Operations"
      description="Operational follow-through for recommendation actions, shopping sync events, and backup/quality workflows."
    >
      <section className="space-y-6">
        <SectionCard title="Overview" description="What the automation layer has been doing lately.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Open lists</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{summary.openLists}</p>
            </div>
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Recent sync events</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{summary.syncEvents}</p>
            </div>
            <div className="rounded-[16px] bg-[var(--surface-soft)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Failed events</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--text)]">{summary.failedEvents}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Operational hooks" description="Where automation currently plugs into the app.">
          <ul className="space-y-2 text-sm leading-6 text-[var(--muted)]">
            <li>- recommendation add-to-plan actions now emit sync events</li>
            <li>- recommendation ignore actions now emit sync events</li>
            <li>- receipt item actions now emit sync events for merges, creates, and duplicate blocks</li>
            <li>- export and admin-quality pages remain the manual operator surfaces for backup and audit follow-through</li>
          </ul>
        </SectionCard>

        <SectionCard title="Recent automation events" description="Most recent recorded follow-through events.">
          {summary.recentEvents.length ? (
            <div className="space-y-3">
              {summary.recentEvents.map((event) => (
                <div key={event.id} className="rounded-[16px] border border-[var(--border)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{event.eventType}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Target: {event.target} · Status: {event.resultStatus}
                        {event.listName ? ` · List: ${event.listName}` : ""}
                      </p>
                      {event.resultMessage ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{event.resultMessage}</p>
                      ) : null}
                    </div>
                    <p className="text-sm text-[var(--muted)]">{formatDate(event.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-6 text-[var(--muted)]">No automation events recorded yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Navigation" description="Other operator surfaces that work with this phase.">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/service-dashboard/admin-quality"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Admin Quality
            </Link>
            <Link
              href="/service-dashboard/export"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Export & Backup
            </Link>
            <Link
              href="/service-dashboard/shopping-plan"
              className="inline-flex rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--accent)] hover:border-[var(--accent)]"
            >
              Shopping Plan
            </Link>
          </div>
        </SectionCard>
      </section>
    </AppShell>
  );
}
